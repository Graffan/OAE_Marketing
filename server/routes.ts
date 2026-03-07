import type { Express } from "express";
import http from "http";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcrypt";
import axios from "axios";
import {
  getUserByUsername,
  getUserById,
  updateLastLogin,
  getAppSettings,
  getTitles,
  getTitleById,
  createTitle,
  updateTitle,
  deleteTitle,
  getTitleByName,
  getProjects,
  getProjectsByTitle,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  getClipsByProject,
} from "./storage.js";
import { requireAuth, requireAdmin, requireOperator, requireReviewer } from "./auth.js";
import { syncProjectClips } from "./services/dropbox.js";

export async function registerRoutes(app: Express): Promise<http.Server> {

  // --- Passport configuration ---

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await getUserByUsername(username);
        if (!user) return done(null, false, { message: "Invalid credentials" });
        if (!user.isActive) return done(null, false, { message: "Account is deactivated" });
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return done(null, false, { message: "Invalid credentials" });
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await getUserById(id);
      if (!user || !user.isActive) return done(null, false);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  app.use(passport.initialize());
  app.use(passport.session());

  // --- Health check ---

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // --- Auth routes ---

  // POST /api/auth/login
  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ message: info?.message ?? "Invalid credentials" });
      }
      req.logIn(user, (err) => {
        if (err) return next(err);
        // Session fixation prevention: regenerate session ID after login
        req.session.regenerate((err) => {
          if (err) return next(err);
          (req.session as any).passport = { user: user.id };
          req.session.save(async (err) => {
            if (err) return next(err);
            // Update last login timestamp (fire and forget)
            updateLastLogin(user.id).catch(console.error);
            const { password: _, ...safeUser } = user;
            res.json(safeUser);
          });
        });
      });
    })(req, res, next);
  });

  // GET /api/auth/me
  app.get("/api/auth/me", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const user = req.user as any;
    const { password: _, ...safeUser } = user;
    res.json(safeUser);
  });

  // POST /api/auth/logout
  app.post("/api/auth/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      req.session.destroy((err) => {
        if (err) return next(err);
        res.clearCookie("sessionId");
        res.json({ message: "Logged out" });
      });
    });
  });

  // --- Settings route (public read, protected write) ---

  // GET /api/settings — public (used for branding before login)
  app.get("/api/settings", async (_req, res) => {
    try {
      const settings = await getAppSettings();
      if (!settings) return res.status(404).json({ message: "Settings not found" });
      // Never return API keys in GET /api/settings
      const {
        claudeApiKey: _c,
        openaiApiKey: _o,
        deepseekApiKey: _d,
        omdbApiKey: _omdb,
        smtpPassword: _sp,
        ...safe
      } = settings;
      res.json(safe);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ─── Titles routes ──────────────────────────────────────────────────────────

  // Helper: normalize OMDb "N/A" to null
  function cleanOmdb(v: string | undefined): string | null {
    return !v || v === "N/A" ? null : v;
  }

  // Helper: parse "142 min" → 142
  function parseRuntime(runtime: string | undefined): number | null {
    if (!runtime || runtime === "N/A") return null;
    const match = runtime.match(/(\d+)/);
    return match ? parseInt(match[1]) : null;
  }

  // GET /api/titles/omdb-search — requireOperator
  // MUST be registered BEFORE /api/titles/:id to avoid route conflict
  app.get("/api/titles/omdb-search", requireOperator, async (req, res) => {
    try {
      const q = req.query.q as string;
      if (!q) return res.status(400).json({ message: "Query parameter q is required" });

      const settings = await getAppSettings();
      const apiKey = settings?.omdbApiKey;
      if (!apiKey) return res.status(400).json({ message: "OMDb API key not configured in Admin > App Settings" });

      const response = await axios.get("https://www.omdbapi.com/", {
        params: { apikey: apiKey, t: q },
        timeout: 8000,
      });

      const data = response.data;
      if (data.Response === "False") {
        return res.status(404).json({ message: data.Error ?? "Title not found on OMDb" });
      }

      const normalized = {
        Title: cleanOmdb(data.Title),
        Year: cleanOmdb(data.Year),
        Runtime: cleanOmdb(data.Runtime),
        Genre: cleanOmdb(data.Genre),
        Director: cleanOmdb(data.Director),
        Actors: cleanOmdb(data.Actors),
        Plot: cleanOmdb(data.Plot),
        Poster: cleanOmdb(data.Poster),
        imdbRating: cleanOmdb(data.imdbRating),
        imdbID: cleanOmdb(data.imdbID),
        runtimeMinutes: parseRuntime(data.Runtime),
      };

      res.json(normalized);
    } catch (err: any) {
      if (err.response) {
        res.status(502).json({ message: "OMDb API error" });
      } else {
        res.status(500).json({ message: err.message });
      }
    }
  });

  // GET /api/titles — requireAuth
  app.get("/api/titles", requireAuth, async (_req, res) => {
    try {
      const all = await getTitles();
      res.json(all);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // POST /api/titles — requireOperator
  app.post("/api/titles", requireOperator, async (req, res) => {
    try {
      const user = req.user as any;

      const existing = await getTitleByName(req.body.titleName);
      if (existing) return res.status(409).json({ message: "A title with this name already exists" });

      let data = { ...req.body, createdById: user.id };
      if (req.body.omdbConfirmed && req.body.omdbData) {
        const omdb = req.body.omdbData;
        data = {
          ...data,
          omdbImdbId: cleanOmdb(omdb.imdbID),
          omdbPosterUrl: cleanOmdb(omdb.Poster),
          omdbImdbRating: cleanOmdb(omdb.imdbRating),
          omdbDirector: cleanOmdb(omdb.Director),
          omdbActors: cleanOmdb(omdb.Actors),
          omdbPlot: cleanOmdb(omdb.Plot),
          releaseYear: omdb.Year ? parseInt(omdb.Year) : data.releaseYear,
          runtimeMinutes: omdb.runtimeMinutes ?? data.runtimeMinutes,
          genre: cleanOmdb(omdb.Genre)?.split(",")[0]?.trim() ?? data.genre,
        };
        if (!data.synopsisShort && omdb.Plot && omdb.Plot !== "N/A") {
          data.synopsisShort = omdb.Plot;
        }
      }

      delete data.omdbConfirmed;
      delete data.omdbData;

      const title = await createTitle(data);
      res.status(201).json(title);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // GET /api/titles/:id — requireAuth
  app.get("/api/titles/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const title = await getTitleById(id);
      if (!title) return res.status(404).json({ message: "Title not found" });
      res.json(title);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // PUT /api/titles/:id — requireOperator
  app.put("/api/titles/:id", requireOperator, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existing = await getTitleById(id);
      if (!existing) return res.status(404).json({ message: "Title not found" });

      if (req.body.titleName && req.body.titleName !== existing.titleName) {
        const dup = await getTitleByName(req.body.titleName);
        if (dup) return res.status(409).json({ message: "A title with this name already exists" });
      }

      // Disallow overwriting OMDb fields via PUT
      const {
        omdbImdbId: _a,
        omdbPosterUrl: _b,
        omdbImdbRating: _c,
        omdbDirector: _d,
        omdbActors: _e,
        omdbPlot: _f,
        ...updatable
      } = req.body;

      const updated = await updateTitle(id, updatable);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // DELETE /api/titles/:id — requireAdmin
  app.delete("/api/titles/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existing = await getTitleById(id);
      if (!existing) return res.status(404).json({ message: "Title not found" });
      await deleteTitle(id);
      res.json({ message: "Title deleted" });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ─── Projects routes ────────────────────────────────────────────────────────

  // GET /api/projects — requireAuth (optional ?titleId= filter)
  app.get("/api/projects", requireAuth, async (req, res) => {
    try {
      const titleId = req.query.titleId ? parseInt(req.query.titleId as string) : null;
      const result = titleId ? await getProjectsByTitle(titleId) : await getProjects();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // GET /api/projects/:id — requireAuth
  // Must come BEFORE /api/projects/:id/sync to avoid conflict
  app.get("/api/projects/:id/clips", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const projectClips = await getClipsByProject(id);
      res.json(projectClips);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/projects/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const project = await getProjectById(id);
      if (!project) return res.status(404).json({ message: "Project not found" });
      res.json(project);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // POST /api/projects — requireOperator
  app.post("/api/projects", requireOperator, async (req, res) => {
    try {
      const user = req.user as any;
      const project = await createProject({ ...req.body, createdById: user.id });
      res.status(201).json(project);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // PUT /api/projects/:id — requireOperator
  app.put("/api/projects/:id", requireOperator, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existing = await getProjectById(id);
      if (!existing) return res.status(404).json({ message: "Project not found" });
      const updated = await updateProject(id, req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // DELETE /api/projects/:id — requireAdmin
  app.delete("/api/projects/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existing = await getProjectById(id);
      if (!existing) return res.status(404).json({ message: "Project not found" });
      await deleteProject(id);
      res.json({ message: "Project deleted" });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // POST /api/projects/:id/sync — requireOperator
  // Returns immediately; sync runs in background
  app.post("/api/projects/:id/sync", requireOperator, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const project = await getProjectById(id);
      if (!project) return res.status(404).json({ message: "Project not found" });

      if (project.syncStatus === "syncing") {
        return res.status(409).json({ message: "Sync already in progress" });
      }

      if (!project.dropboxViralClipsFolderPath) {
        return res.status(400).json({ message: "Project has no viral clips folder configured" });
      }

      // Check Dropbox credentials are configured
      if (
        !process.env.DROPBOX_APP_KEY ||
        !process.env.DROPBOX_APP_SECRET ||
        !process.env.DROPBOX_REFRESH_TOKEN
      ) {
        return res.status(400).json({ message: "Dropbox not configured. Set DROPBOX_APP_KEY, DROPBOX_APP_SECRET, DROPBOX_REFRESH_TOKEN in .env" });
      }

      // Fire and forget — sync runs async
      syncProjectClips(id).catch((err) => {
        console.error(`[Sync] Background sync failed for project ${id}:`, err.message);
      });

      res.json({ status: "started", message: "Sync started" });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  const server = http.createServer(app);
  return server;
}

// Re-export middleware for use in other route sections (plans 03–06 will add more routes to this file)
export { requireAuth, requireAdmin, requireOperator, requireReviewer };

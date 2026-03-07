import type { Express } from "express";
import http from "http";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcrypt";
import { getUserByUsername, getUserById, updateLastLogin, getAppSettings } from "./storage.js";
import { requireAuth, requireAdmin, requireOperator, requireReviewer } from "./auth.js";

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

  const server = http.createServer(app);
  return server;
}

// Re-export middleware for use in other route sections (plans 03–06 will add more routes to this file)
export { requireAuth, requireAdmin, requireOperator, requireReviewer };

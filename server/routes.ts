import type { Express } from "express";
import http from "http";
import rateLimit from "express-rate-limit";
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
  getClips,
  getClipById,
  updateClip,
  approveClip,
  rejectClip,
  bulkUpdateClips,
  getClipRotationStats,
  getUsers,
  createUser,
  adminUpdateUser,
  resetUserPassword,
  getFullAppSettings,
  updateAppSettings,
  getDestinations,
  getDestinationById,
  createDestination,
  updateDestination,
  deleteDestination,
  getExpiringDestinations,
  getTitlesWithNoActiveDestinations,
  getSmartLinks,
  getSmartLinkById,
  getSmartLinkBySlug,
  createSmartLink,
  updateSmartLink,
  deleteSmartLink,
  recordSmartLinkClick,
  resolveDestinationForCountry,
  getClipPosts,
  getDuplicateWarning,
  createClipPost,
  getRotationStats,
  resetRotationCycle,
  pickNextClip,
  getCampaigns,
  getCampaignById,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  patchCampaignStatus,
  getCampaignContents,
  createCampaignContent,
  activateCampaignContentVersion,
  getActiveCampaignContents,
  getAiLogs,
  getAiLogById,
  getAiUsageSummary,
  getPromptTemplates,
  getPromptTemplate,
  updatePromptTemplate,
  computeClipPerformanceScore,
  getClipAnalytics,
  getCampaignAnalytics,
  getAnalyticsByRegion,
  getAnalyticsByPlatform,
  getTopPerformingClips,
  getAnalyticsDashboardSummary,
  getAssetHealthReport,
  recordAnalyticsEvent,
  createNotification,
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  markClipUnavailable,
  getSocialConnections,
  getSocialConnectionById,
  getActiveSocialConnections,
  createSocialConnection,
  updateSocialConnection,
  deleteSocialConnection,
  getScheduledPosts,
  getScheduledPostById,
  createScheduledPost,
  updateScheduledPost,
  deleteScheduledPost,
  approveScheduledPost,
  getPostsDueForPublishing,
  markPostPublished,
  markPostFailed,
  getCalendarPosts,
  getMorganConversations,
  getMorganConversation,
  createMorganConversation,
  archiveMorganConversation,
  getMorganMessages,
  createMorganMessage,
  getMorganMemories,
  createMorganMemory,
  updateMorganMemory,
  deleteMorganMemory,
  searchMorganMemory,
  getMorganTasks,
  createMorganTask,
  updateMorganTask,
  getMorganAutoApproveRules,
  createMorganAutoApproveRule,
  updateMorganAutoApproveRule,
  deleteMorganAutoApproveRule,
  getClickEvents,
  getClickEventStats,
  getBrandAssets,
  createBrandAsset,
  updateBrandAsset,
  deleteBrandAsset,
  getBrandVoiceRules,
  createBrandVoiceRule,
  updateBrandVoiceRule,
  deleteBrandVoiceRule,
  getSocialProfiles,
  createSocialProfile,
  updateSocialProfile,
  deleteSocialProfile,
  getPressKitItems,
  createPressKitItem,
  updatePressKitItem,
  deletePressKitItem,
  getAudiencePersonas,
  createAudiencePersona,
  updateAudiencePersona,
  deleteAudiencePersona,
  getEngagementTemplates,
  createEngagementTemplate,
  updateEngagementTemplate,
  deleteEngagementTemplate,
  getEmailSubscribers,
  getEmailSubscriberCount,
  createEmailSubscriber,
  unsubscribeEmail,
  deleteEmailSubscriber,
  getEmailCampaigns,
  getEmailCampaignById,
  createEmailCampaign,
  updateEmailCampaign,
  deleteEmailCampaign,
  getCompetitorTracks,
  createCompetitorTrack,
  updateCompetitorTrack,
  deleteCompetitorTrack,
  getReleaseWindowStrategies,
  createReleaseWindowStrategy,
  updateReleaseWindowStrategy,
  deleteReleaseWindowStrategy,
  getCrossPromotions,
  createCrossPromotion,
  updateCrossPromotionStatus,
  deleteCrossPromotion,
} from "./storage.js";
import { requireAuth, requireAdmin, requireOperator, requireReviewer } from "./auth.js";
import { syncProjectClips } from "./services/dropbox.js";
import { resolveCountryCode } from "./services/geoip.js";
import { generateText, getManualPrompt, buildPrompt } from "./services/ai-orchestrator.js";
import { chatWithMorgan } from "./services/morgan-chat.js";
import { runTask as runMorganTask, startMorganScheduler } from "./services/morgan-daily-cycle.js";
import { handleSmartLinkRedirect } from "./services/smart-link-redirect.js";
import { insertCampaignSchema, insertCampaignContentSchema, insertSocialConnectionSchema, insertScheduledPostSchema } from "@shared/schema.js";

function applyTrackingParams(baseUrl: string, template: string, slug: string): string {
  if (!template) return baseUrl;
  const params = template.replace(/\{slug\}/g, slug);
  const separator = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${separator}${params}`;
}

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

  // ─── Clips routes ────────────────────────────────────────────────────────────

  const BULK_OP_MAX = 500; // safety cap to prevent runaway bulk operations

  // POST /api/clips/bulk-approve — requireReviewer
  // MUST be registered BEFORE /api/clips/:id to avoid Express matching "bulk-approve" as :id
  app.post("/api/clips/bulk-approve", requireReviewer, async (req, res) => {
    try {
      const { ids } = req.body as { ids: number[] };
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: "ids array is required and must not be empty" });
      }
      if (ids.length > BULK_OP_MAX) {
        return res.status(400).json({ message: `Cannot process more than ${BULK_OP_MAX} items at once` });
      }
      const user = req.user as any;
      await Promise.all(ids.map((id) => approveClip(id, user.id)));
      res.json({ message: `${ids.length} clips approved`, count: ids.length });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // POST /api/clips/bulk-archive — requireOperator
  // MUST be registered BEFORE /api/clips/:id
  app.post("/api/clips/bulk-archive", requireOperator, async (req, res) => {
    try {
      const { ids } = req.body as { ids: number[] };
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: "ids array is required and must not be empty" });
      }
      if (ids.length > BULK_OP_MAX) {
        return res.status(400).json({ message: `Cannot process more than ${BULK_OP_MAX} items at once` });
      }
      await bulkUpdateClips(ids, { status: "archived" });
      res.json({ message: `${ids.length} clips archived`, count: ids.length });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // GET /api/clips — requireAuth
  // Query params: titleId, projectId, status, unpostedOnly=true
  app.get("/api/clips", requireAuth, async (req, res) => {
    try {
      const filters: any = {};
      if (req.query.titleId) filters.titleId = parseInt(req.query.titleId as string);
      if (req.query.projectId) filters.projectId = parseInt(req.query.projectId as string);
      if (req.query.status) filters.status = req.query.status as string;
      if (req.query.unpostedOnly === "true") filters.unpostedOnly = true;
      const result = await getClips(filters);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // GET /api/clips/rotation-stats — requireAuth
  // Query param: projectId
  app.get("/api/clips/rotation-stats", requireAuth, async (req, res) => {
    try {
      const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : null;
      if (!projectId) return res.status(400).json({ message: "projectId query param is required" });
      const stats = await getClipRotationStats(projectId);
      res.json(stats);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // GET /api/clips/:id — requireAuth
  app.get("/api/clips/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const clip = await getClipById(id);
      if (!clip) return res.status(404).json({ message: "Clip not found" });
      res.json(clip);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // PUT /api/clips/:id — requireOperator
  app.put("/api/clips/:id", requireOperator, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existing = await getClipById(id);
      if (!existing) return res.status(404).json({ message: "Clip not found" });

      // Disallow changing dropbox-managed fields via PUT
      const {
        dropboxFileId: _a,
        dropboxPath: _b,
        projectId: _c,
        titleId: _d,
        createdAt: _e,
        id: _f,
        ...updatable
      } = req.body;

      const updated = await updateClip(id, updatable);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // POST /api/clips/:id/approve — requireReviewer
  app.post("/api/clips/:id/approve", requireReviewer, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = req.user as any;
      const clip = await getClipById(id);
      if (!clip) return res.status(404).json({ message: "Clip not found" });
      const updated = await approveClip(id, user.id);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // POST /api/clips/:id/reject — requireReviewer
  app.post("/api/clips/:id/reject", requireReviewer, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const clip = await getClipById(id);
      if (!clip) return res.status(404).json({ message: "Clip not found" });
      const updated = await rejectClip(id);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ============= ADMIN ROUTES =============

  // GET /api/admin/users — requireAdmin
  app.get("/api/admin/users", requireAdmin, async (_req, res) => {
    try {
      const all = await getUsers();
      res.json(all);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // POST /api/admin/users — requireAdmin
  app.post("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      // Check username uniqueness
      const existing = await getUserByUsername(req.body.username);
      if (existing) return res.status(409).json({ message: "Username already taken" });

      // Validate role
      const { ROLES } = await import("@shared/schema.js");
      if (!(ROLES as readonly string[]).includes(req.body.role)) {
        return res.status(400).json({ message: `Invalid role. Must be one of: ${ROLES.join(", ")}` });
      }

      const user = await createUser(req.body);
      res.status(201).json(user);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // PUT /api/admin/users/:id — requireAdmin
  app.put("/api/admin/users/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existing = await getUserById(id);
      if (!existing) return res.status(404).json({ message: "User not found" });

      // Prevent admin from deactivating themselves
      const currentUser = req.user as any;
      if (currentUser.id === id && req.body.isActive === false) {
        return res.status(400).json({ message: "Cannot deactivate your own account" });
      }

      // Validate role if being changed
      if (req.body.role) {
        const { ROLES } = await import("@shared/schema.js");
        if (!(ROLES as readonly string[]).includes(req.body.role)) {
          return res.status(400).json({ message: `Invalid role. Must be one of: ${ROLES.join(", ")}` });
        }
      }

      const { password: _p, username: _u, ...updatable } = req.body;
      const updated = await adminUpdateUser(id, updatable);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // POST /api/admin/users/:id/reset-password — requireAdmin
  app.post("/api/admin/users/:id/reset-password", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existing = await getUserById(id);
      if (!existing) return res.status(404).json({ message: "User not found" });

      const { newPassword } = req.body;
      if (!newPassword || newPassword.length < 8) {
        return res.status(400).json({ message: "New password must be at least 8 characters" });
      }

      await resetUserPassword(id, newPassword);
      res.json({ message: "Password reset successfully" });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // GET /api/admin/settings — requireAdmin (includes masked API keys)
  app.get("/api/admin/settings", requireAdmin, async (_req, res) => {
    try {
      const settings = await getFullAppSettings();
      if (!settings) return res.status(404).json({ message: "Settings not found" });
      // Mask API keys: return "•••••••••••••••••" if set, empty string if not
      const masked = {
        ...settings,
        claudeApiKey: settings.claudeApiKey ? "•••••••••••••••••" : "",
        openaiApiKey: settings.openaiApiKey ? "•••••••••••••••••" : "",
        deepseekApiKey: settings.deepseekApiKey ? "•••••••••••••••••" : "",
        omdbApiKey: settings.omdbApiKey ? "•••••••••••••••••" : "",
        smtpPassword: settings.smtpPassword ? "•••••••••••••••••" : "",
      };
      // Also return boolean flags for "is configured" checks
      const enriched = {
        ...masked,
        claudeConfigured: !!settings.claudeApiKey,
        openaiConfigured: !!settings.openaiApiKey,
        deepseekConfigured: !!settings.deepseekApiKey,
        omdbConfigured: !!settings.omdbApiKey,
      };
      res.json(enriched);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // PUT /api/admin/settings — requireAdmin
  const ALLOWED_SETTINGS_FIELDS = new Set([
    "companyName", "appTitle", "logoUrl", "accentColor",
    "omdbApiKey",
    "claudeApiKey", "claudeModel",
    "openaiApiKey", "openaiModel",
    "deepseekApiKey", "deepseekModel",
    "aiPrimaryProvider", "aiFallbackOrder",
    "aiDailyTokenCap", "aiPerUserCap",
    "smtpHost", "smtpPort", "smtpUser", "smtpPassword",
    "smtpFromEmail", "smtpFromName", "smtpTls",
  ]);
  const MASK_PATTERN = /^•+$/;

  app.put("/api/admin/settings", requireAdmin, async (req, res) => {
    try {
      const clean: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(req.body)) {
        // Only accept known, writable settings fields
        if (!ALLOWED_SETTINGS_FIELDS.has(key)) continue;
        // Skip masked values (user didn't change the API key)
        if (typeof value === "string" && MASK_PATTERN.test(value)) continue;
        clean[key] = value;
      }

      const updated = await updateAppSettings(clean);
      // Return safe version (mask keys in response)
      const { claudeApiKey: _c, openaiApiKey: _o, deepseekApiKey: _d, omdbApiKey: _omdb, smtpPassword: _sp, ...safe } = updated;
      res.json(safe);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ─── Alerts route ────────────────────────────────────────────────────────────

  // GET /api/alerts/destinations — requireAuth — combined summary for dashboard
  app.get("/api/alerts/destinations", requireAuth, async (_req, res) => {
    try {
      const [expiringDestinations, titlesWithNoDestinations] = await Promise.all([
        getExpiringDestinations(30),
        getTitlesWithNoActiveDestinations(),
      ]);
      res.json({
        expiringCount: expiringDestinations.length,
        expiringDestinations,
        titlesWithNoDestinations,
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ─── Destinations routes ─────────────────────────────────────────────────────

  // GET /api/destinations/expiring — requireAuth
  // MUST be registered BEFORE /api/destinations/:id
  app.get("/api/destinations/expiring", requireAuth, async (_req, res) => {
    try {
      const results = await getExpiringDestinations(30);
      res.json(results);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // GET /api/destinations — requireAuth, optional ?titleId= filter
  app.get("/api/destinations", requireAuth, async (req, res) => {
    try {
      const titleId = req.query.titleId ? parseInt(req.query.titleId as string) : undefined;
      const results = await getDestinations(titleId);
      res.json(results);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // GET /api/destinations/:id — requireAuth
  app.get("/api/destinations/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const dest = await getDestinationById(id);
      if (!dest) return res.status(404).json({ message: "Destination not found" });
      res.json(dest);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  function validateHttpsUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.protocol === "https:" || parsed.protocol === "http:";
    } catch {
      return false;
    }
  }

  // POST /api/destinations — requireOperator
  app.post("/api/destinations", requireOperator, async (req, res) => {
    try {
      const { countryCode, platformName, destinationUrl, titleId } = req.body;
      if (!countryCode || countryCode.length !== 2) {
        return res.status(400).json({ message: "countryCode must be a 2-character ISO code" });
      }
      if (!platformName) return res.status(400).json({ message: "platformName is required" });
      if (!destinationUrl) return res.status(400).json({ message: "destinationUrl is required" });
      if (!validateHttpsUrl(destinationUrl)) {
        return res.status(400).json({ message: "destinationUrl must be a valid http/https URL" });
      }
      if (!titleId) return res.status(400).json({ message: "titleId is required" });
      const created = await createDestination({
        ...req.body,
        countryCode: (countryCode as string).toUpperCase(),
      });
      res.status(201).json(created);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // PUT /api/destinations/:id — requireOperator
  app.put("/api/destinations/:id", requireOperator, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existing = await getDestinationById(id);
      if (!existing) return res.status(404).json({ message: "Destination not found" });
      const { id: _id, createdAt: _c, updatedAt: _u, ...updatable } = req.body;
      if (updatable.countryCode) {
        updatable.countryCode = (updatable.countryCode as string).toUpperCase();
      }
      if (updatable.destinationUrl && !validateHttpsUrl(updatable.destinationUrl)) {
        return res.status(400).json({ message: "destinationUrl must be a valid http/https URL" });
      }
      const updated = await updateDestination(id, updatable);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // DELETE /api/destinations/:id — requireAdmin
  app.delete("/api/destinations/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existing = await getDestinationById(id);
      if (!existing) return res.status(404).json({ message: "Destination not found" });
      await deleteDestination(id);
      res.json({ message: "Destination deleted" });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ─── Smart Links public redirect ─────────────────────────────────────────────

  // GET /l/:slug — PUBLIC, no auth — IP geo → destination → 302 redirect
  // MUST be registered before any /api/smart-links routes
  app.get("/l/:slug", async (req, res) => {
    try {
      const { slug } = req.params;
      const link = await getSmartLinkBySlug(slug);
      if (!link) return res.status(404).send("Link not found");

      // If inactive, redirect to defaultUrl directly with no analytics
      if (!link.isActive) {
        return res.redirect(302, link.defaultUrl);
      }

      const countryCode = await resolveCountryCode(req);
      let resolvedUrl = link.defaultUrl;
      let isDefault = true;

      if (link.titleId) {
        const dest = await resolveDestinationForCountry(link.titleId, countryCode);
        if (dest) {
          resolvedUrl = dest.destinationUrl;
          isDefault = false;
        }
      }

      // Apply tracking params
      const template = link.trackingParamsTemplate ?? "utm_source=oaemarketing&utm_medium=smart_link&utm_campaign={slug}";
      const finalUrl = applyTrackingParams(resolvedUrl, template, slug);

      // Validate the resolved URL scheme before redirecting (prevent open redirect to javascript:, data:, etc.)
      if (!validateHttpsUrl(finalUrl)) {
        console.error(`[SmartLink] blocked redirect to invalid URL scheme: ${finalUrl}`);
        return res.status(400).send("Invalid redirect target");
      }

      // Record analytics event (fire and forget)
      recordSmartLinkClick(link.id, countryCode, finalUrl, isDefault).catch((err) => {
        console.error("[SmartLink] analytics record failed:", err.message);
      });

      return res.redirect(302, finalUrl);
    } catch (err: any) {
      console.error("[SmartLink] redirect error:", err.message);
      return res.status(500).send("Internal server error");
    }
  });

  // ─── Smart Links API routes ───────────────────────────────────────────────────

  // POST /api/smart-links/:slug/preview — requireAuth — tester (no redirect, no analytics)
  // MUST be registered BEFORE GET /api/smart-links/:id
  app.post("/api/smart-links/:slug/preview", requireAuth, async (req, res) => {
    try {
      const { slug } = req.params;
      const { countryCode } = req.body as { countryCode: string };
      if (!countryCode || !/^[A-Za-z]{2}$/.test(countryCode)) {
        return res.status(400).json({ message: "countryCode must be a 2-character ISO code" });
      }

      const link = await getSmartLinkBySlug(slug);
      if (!link) return res.status(404).json({ message: "Smart link not found" });

      let resolvedUrl = link.defaultUrl;
      let isDefault = true;
      let destination = null;

      if (link.titleId) {
        const dest = await resolveDestinationForCountry(link.titleId, countryCode.toUpperCase());
        if (dest) {
          resolvedUrl = dest.destinationUrl;
          isDefault = false;
          destination = dest;
        }
      }

      const template = link.trackingParamsTemplate ?? "utm_source=oaemarketing&utm_medium=smart_link&utm_campaign={slug}";
      const trackingParams = template.replace(/\{slug\}/g, slug);
      const finalUrl = applyTrackingParams(resolvedUrl, template, slug);

      res.json({
        slug,
        titleId: link.titleId,
        countryCode: countryCode.toUpperCase(),
        resolvedUrl: finalUrl,
        destination,
        isDefault,
        trackingParams,
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // GET /api/smart-links — requireAuth, optional ?titleId= filter
  app.get("/api/smart-links", requireAuth, async (req, res) => {
    try {
      const titleId = req.query.titleId ? parseInt(req.query.titleId as string) : undefined;
      const result = await getSmartLinks(titleId);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // GET /api/smart-links/:id — requireAuth
  app.get("/api/smart-links/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const link = await getSmartLinkById(id);
      if (!link) return res.status(404).json({ message: "Smart link not found" });
      res.json(link);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // POST /api/smart-links — requireOperator
  app.post("/api/smart-links", requireOperator, async (req, res) => {
    try {
      const user = req.user as any;
      const { defaultUrl } = req.body;
      if (!defaultUrl) return res.status(400).json({ message: "defaultUrl is required" });
      if (!validateHttpsUrl(defaultUrl)) {
        return res.status(400).json({ message: "defaultUrl must be a valid http/https URL" });
      }
      const link = await createSmartLink({ ...req.body, createdById: user.id });
      res.status(201).json(link);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // PUT /api/smart-links/:id — requireOperator
  app.put("/api/smart-links/:id", requireOperator, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existing = await getSmartLinkById(id);
      if (!existing) return res.status(404).json({ message: "Smart link not found" });
      // Disallow slug modification
      const { slug: _s, id: _id, createdAt: _c, updatedAt: _u, ...updatable } = req.body;
      const updated = await updateSmartLink(id, updatable);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // DELETE /api/smart-links/:id — requireAdmin
  app.delete("/api/smart-links/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existing = await getSmartLinkById(id);
      if (!existing) return res.status(404).json({ message: "Smart link not found" });
      await deleteSmartLink(id);
      res.json({ message: "Smart link deleted" });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ─── Clip Rotation Engine ────────────────────────────────────────────────────
  // IMPORTANT: sub-routes registered BEFORE wildcard /:id routes

  app.get("/api/clips/:id/post-history", requireAuth, async (req, res) => {
    try {
      const clipId = parseInt(req.params.id);
      const posts = await getClipPosts(clipId);
      res.json({ clipId, posts });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/clips/:id/duplicate-warning", requireAuth, async (req, res) => {
    try {
      const clipId = parseInt(req.params.id);
      const { platform, region } = req.query as { platform?: string; region?: string };
      if (!platform || !region) {
        return res.status(400).json({ message: "platform and region query params required" });
      }
      const warning = await getDuplicateWarning(clipId, platform, region);
      res.json(warning);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/clips/:id/mark-posted", requireOperator, async (req, res) => {
    try {
      const clipId = parseInt(req.params.id);
      const { platform, region, caption, cta, smartLinkId, postedAt } = req.body;
      if (!platform || !region) {
        return res.status(400).json({ message: "platform and region are required" });
      }
      const clipPost = await createClipPost({
        clipId,
        platform,
        region,
        caption,
        cta,
        smartLinkId: smartLinkId ? parseInt(smartLinkId) : undefined,
        postedById: (req.user as any)?.id,
        postedAt: postedAt ? new Date(postedAt) : undefined,
      });
      recordAnalyticsEvent({
        eventType: "clip_posted",
        clipId,
        clipPostId: clipPost.id,
        campaignId: (clipPost as any).campaignId ?? undefined,
        platform: clipPost.platform ?? undefined,
        region: clipPost.region ?? undefined,
        userId: (req.user as any)?.id,
      }).catch(console.error);
      const updatedClip = await getClipById(clipId);
      res.json({ clipPost, clip: updatedClip });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/projects/:id/rotation", requireAuth, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const region = req.query.region as string | undefined;
      const platform = req.query.platform as string | undefined;
      const [stats, nextClip] = await Promise.all([
        getRotationStats(projectId),
        pickNextClip(projectId, { region, platform }),
      ]);
      res.json({ stats, nextClip });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/projects/:id/rotation/reset", requireAdmin, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      await resetRotationCycle(projectId);
      res.json({ success: true, message: "Rotation cycle reset" });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ─── Campaign routes ────────────────────────────────────────────────────────

  // GET /api/campaigns — requireAuth — optional ?titleId= query param
  app.get("/api/campaigns", requireAuth, async (req, res) => {
    try {
      const titleId = req.query.titleId ? parseInt(req.query.titleId as string) : undefined;
      const result = await getCampaigns(titleId);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/campaigns — requireOperator
  app.post("/api/campaigns", requireOperator, async (req, res) => {
    try {
      const user = req.user as any;
      const parsed = insertCampaignSchema.safeParse({ ...req.body, createdById: user.id });
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.format() });
      }
      const campaign = await createCampaign(parsed.data);
      res.status(201).json(campaign);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/campaigns/:id/contents — requireAuth
  // MUST be registered BEFORE /api/campaigns/:id to avoid wildcard conflict
  app.get("/api/campaigns/:id/contents", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const contents = await getCampaignContents(id);
      res.json(contents);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/campaigns/:id/contents — requireOperator
  app.post("/api/campaigns/:id/contents", requireOperator, async (req, res) => {
    try {
      const campaignId = parseInt(req.params.id);
      const campaign = await getCampaignById(campaignId);
      if (!campaign) return res.status(404).json({ error: "Campaign not found" });

      const parsed = insertCampaignContentSchema.safeParse({ ...req.body, campaignId });
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.format() });
      }
      const content = await createCampaignContent(parsed.data);
      res.status(201).json(content);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // PATCH /api/campaigns/:id/contents/:cid/activate — requireOperator
  app.patch("/api/campaigns/:id/contents/:cid/activate", requireOperator, async (req, res) => {
    try {
      const campaignId = parseInt(req.params.id);
      const versionId = parseInt(req.params.cid);
      const { contentType, platform, region } = req.body;
      if (!contentType || !platform || !region) {
        return res.status(400).json({ error: "contentType, platform, and region are required" });
      }
      const activated = await activateCampaignContentVersion(
        versionId,
        campaignId,
        contentType,
        platform,
        region
      );
      res.json(activated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/campaigns/:id/export — requireOperator
  app.get("/api/campaigns/:id/export", requireOperator, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const campaign = await getCampaignById(id);
      if (!campaign) return res.status(404).json({ error: "Campaign not found" });
      const activeContents = await getActiveCampaignContents(id);
      res.json({ campaign, contents: activeContents });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/campaigns/:id — requireAuth
  app.get("/api/campaigns/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const campaign = await getCampaignById(id);
      if (!campaign) return res.status(404).json({ error: "Campaign not found" });
      res.json(campaign);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // PATCH /api/campaigns/:id — requireOperator
  app.patch("/api/campaigns/:id", requireOperator, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existing = await getCampaignById(id);
      if (!existing) return res.status(404).json({ error: "Campaign not found" });
      const updated = await updateCampaign(id, req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE /api/campaigns/:id — requireAdmin
  app.delete("/api/campaigns/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existing = await getCampaignById(id);
      if (!existing) return res.status(404).json({ error: "Campaign not found" });
      await deleteCampaign(id);
      res.status(204).send();
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // PATCH /api/campaigns/:id/status — requireReviewer
  app.patch("/api/campaigns/:id/status", requireReviewer, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      const allowedStatuses = ["draft", "ai_generated", "awaiting_approval", "approved", "active", "completed", "rejected", "archived"];
      if (!status || !allowedStatuses.includes(status)) {
        return res.status(400).json({
          error: `status must be one of: ${allowedStatuses.join(", ")}`,
        });
      }
      const existing = await getCampaignById(id);
      if (!existing) return res.status(404).json({ error: "Campaign not found" });
      const user = req.user as any;
      const updated = await patchCampaignStatus(id, status, user.id);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── AI API routes ──────────────────────────────────────────────────────────

  const VALID_AI_TASKS = ["campaign_brief", "clip_to_post", "territory_assistant", "catalog_revival"];
  const VALID_AI_PROVIDERS = ["claude", "openai", "deepseek"];

  // Dedicated rate limiter for AI generation — tighter window to prevent cost abuse
  const aiGenerateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 20,
    message: { error: "Too many AI generation requests — please wait before trying again." },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // POST /api/ai/generate — requireOperator
  app.post("/api/ai/generate", requireOperator, aiGenerateLimiter, async (req, res) => {
    try {
      const { task, campaignId, context, provider, saveToContents } = req.body;

      if (!task || !VALID_AI_TASKS.includes(task)) {
        return res.status(400).json({
          error: `task must be one of: ${VALID_AI_TASKS.join(", ")}`,
        });
      }

      // Validate provider if specified — reject unknown values
      if (provider !== undefined && !VALID_AI_PROVIDERS.includes(provider)) {
        return res.status(400).json({
          error: `provider must be one of: ${VALID_AI_PROVIDERS.join(", ")}`,
        });
      }

      // Sanitize context: truncate large string values to prevent prompt injection via large payloads
      const MAX_CONTEXT_VALUE_LEN = 2000;
      const sanitizedContext = context
        ? Object.fromEntries(
            Object.entries(context as Record<string, unknown>).map(([k, v]) => [
              k,
              typeof v === "string" ? v.slice(0, MAX_CONTEXT_VALUE_LEN) : v,
            ])
          )
        : {};

      const user = req.user as any;
      const { systemPrompt, userPrompt, templateVersion } = await buildPrompt(task, sanitizedContext);

      const result = await generateText(task, systemPrompt, userPrompt, templateVersion, {
        forceProvider: provider,
        userId: user.id,
        campaignId: campaignId ? parseInt(campaignId) : undefined,
      });

      // Auto-save to campaign_contents whenever a campaignId is provided
      if (campaignId) {
        const parsedCampaignId = parseInt(campaignId);
        const existing = await getCampaignContents(parsedCampaignId);
        const sameType = existing.filter((c) => c.contentType === task);
        const nextVersion = sameType.length > 0 ? Math.max(...sameType.map((c) => c.version)) + 1 : 1;

        const newContent = await createCampaignContent({
          campaignId: parsedCampaignId,
          contentType: task,
          platform: "generic",
          region: "ALL",
          body: result.content,
          source: "ai",
          aiLogId: result.logId,
          version: nextVersion,
          isActive: false,
          editedById: null,
        });
        // Activate new version (deactivates previous ones of same type/platform/region)
        await activateCampaignContentVersion(newContent.id, parsedCampaignId, task, "generic", "ALL");
      }

      res.json({
        text: result.content,
        provider: result.provider,
        model: result.model,
        tokensIn: result.inputTokens,
        tokensOut: result.outputTokens,
        latencyMs: result.latencyMs,
        logId: result.logId,
      });
    } catch (err: any) {
      if (err.message.includes("cap")) {
        return res.status(429).json({ error: err.message });
      }
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/ai/prompt-preview — requireOperator
  app.post("/api/ai/prompt-preview", requireOperator, async (req, res) => {
    try {
      const { task, context } = req.body;
      if (!task || !VALID_AI_TASKS.includes(task)) {
        return res.status(400).json({
          error: `task must be one of: ${VALID_AI_TASKS.join(", ")}`,
        });
      }
      const result = await getManualPrompt(task, context ?? {});
      res.json({ systemPrompt: result.systemPrompt, promptForUser: result.promptForUser, manualMode: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/ai/logs — requireAdmin
  app.get("/api/ai/logs", requireAdmin, async (req, res) => {
    try {
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const result = await getAiLogs(page, limit);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/ai/logs/:id — requireAdmin
  app.get("/api/ai/logs/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const log = await getAiLogById(id);
      if (!log) return res.status(404).json({ error: "AI log not found" });
      res.json(log);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/ai/usage — requireAuth
  app.get("/api/ai/usage", requireAuth, async (_req, res) => {
    try {
      const summary = await getAiUsageSummary();
      res.json(summary);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/ai/prompt-templates — requireAdmin
  app.get("/api/ai/prompt-templates", requireAdmin, async (_req, res) => {
    try {
      const templates = await getPromptTemplates();
      res.json(templates);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // PATCH /api/ai/prompt-templates/:id — requireAdmin
  app.patch("/api/ai/prompt-templates/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { systemPrompt, userPromptTemplate } = req.body;

      const templates = await getPromptTemplates();
      const current = templates.find((t) => t.id === id);
      if (!current) return res.status(404).json({ error: "Prompt template not found" });

      const updateData: Record<string, unknown> = {
        version: current.version + 1,
        updatedAt: new Date(),
      };
      if (systemPrompt !== undefined) updateData.systemPrompt = systemPrompt;
      if (userPromptTemplate !== undefined) updateData.userPromptTemplate = userPromptTemplate;

      const updated = await updatePromptTemplate(id, updateData);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── Analytics Routes ────────────────────────────────────────────────────────

  // GET /api/analytics/dashboard — requireAuth
  app.get("/api/analytics/dashboard", requireAuth, async (_req, res) => {
    try {
      const summary = await getAnalyticsDashboardSummary();
      res.json(summary);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // GET /api/analytics/asset-health — requireAuth
  app.get("/api/analytics/asset-health", requireAuth, async (_req, res) => {
    try {
      const report = await getAssetHealthReport();
      res.json(report);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // GET /api/analytics/top-clips — requireAuth — optional ?limit= query param (default 10, max 50)
  app.get("/api/analytics/top-clips", requireAuth, async (req, res) => {
    try {
      const rawLimit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const limit = Math.min(Math.max(1, rawLimit), 50);
      const clips = await getTopPerformingClips(limit);
      res.json(clips);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // GET /api/analytics/by-region — requireAuth — optional ?titleId= query param
  app.get("/api/analytics/by-region", requireAuth, async (req, res) => {
    try {
      const titleId = req.query.titleId ? parseInt(req.query.titleId as string) : undefined;
      const data = await getAnalyticsByRegion(titleId);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // GET /api/analytics/by-platform — requireAuth — optional ?titleId= query param
  app.get("/api/analytics/by-platform", requireAuth, async (req, res) => {
    try {
      const titleId = req.query.titleId ? parseInt(req.query.titleId as string) : undefined;
      const data = await getAnalyticsByPlatform(titleId);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // GET /api/analytics/clips/:id — requireAuth
  app.get("/api/analytics/clips/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
      const [posts, performanceScore] = await Promise.all([
        getClipAnalytics(id),
        computeClipPerformanceScore(id),
      ]);
      res.json({ posts, performanceScore });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // GET /api/analytics/campaigns/:id — requireAuth
  app.get("/api/analytics/campaigns/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
      const posts = await getCampaignAnalytics(id);
      res.json(posts);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // POST /api/analytics/weekly-summary — requireAuth, requireOperator
  app.post("/api/analytics/weekly-summary", requireAuth, requireOperator, async (req, res) => {
    try {
      const user = req.user as any;
      const { provider } = req.body as { provider?: string };

      const [topClips, byPlatform, byRegion] = await Promise.all([
        getTopPerformingClips(10),
        getAnalyticsByPlatform(),
        getAnalyticsByRegion(),
      ]);

      const userPrompt = `Weekly Performance Summary Request:

Top Performing Clips (by engagement score):
${topClips.map((c) => `- Clip ID ${c.id}: ${c.filename} | engagement: ${c.engagementScore} | posted: ${c.postedCount}x`).join("\n")}

Performance by Platform:
${byPlatform.map((p) => `- ${p.platform}: ${p.postCount} posts, ${p.impressions} impressions, ${p.likes} likes, ${p.clickThroughs} click-throughs`).join("\n")}

Performance by Region:
${byRegion.map((r) => `- ${r.region}: ${r.postCount} posts, ${r.impressions} impressions, ${r.clickThroughs} click-throughs`).join("\n")}

Please provide: (1) What worked this week, (2) What failed or underperformed, (3) Best hook types, (4) Recommended next actions.`;

      const template = await getPromptTemplate("performance_summarizer");
      if (!template) {
        return res.status(500).json({ message: "performance_summarizer prompt template not found — run db:seed" });
      }

      const result = await generateText(
        "performance_summarizer",
        template.systemPrompt,
        userPrompt,
        template.version,
        { forceProvider: provider as any, userId: user?.id }
      );

      res.json(result);
    } catch (err: any) {
      if (err.message?.includes("cap")) {
        return res.status(429).json({ message: err.message });
      }
      res.status(500).json({ message: err.message });
    }
  });

  // ─── Notification Routes ─────────────────────────────────────────────────────

  app.get("/api/notifications", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id as number;
      const rawLimit = parseInt((req.query.limit as string) ?? "50", 10);
      const limit = isNaN(rawLimit) ? 50 : Math.min(rawLimit, 100);
      const notifications = await getNotifications(userId, limit);
      res.json(notifications);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/notifications/unread-count", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id as number;
      const count = await getUnreadCount(userId);
      res.json({ count });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/notifications/:id/read", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid notification id" });
      }
      const userId = (req.user as any).id as number;
      const updated = await markNotificationRead(id, userId);
      if (!updated) {
        return res.status(404).json({ message: "Notification not found" });
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/notifications/read-all", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id as number;
      await markAllNotificationsRead(userId);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ─── Failure Handling Routes ──────────────────────────────────────────────────

  app.post("/api/projects/:id/sync-retry", requireAuth, requireOperator, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid project id" });
      }
      const project = await getProjectById(id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      const userId = (req.user as any).id as number;
      try {
        await syncProjectClips(id);
        createNotification({
          type: "clip_synced",
          title: "Sync Complete",
          message: `Project "${project.projectName}" synced successfully.`,
          userId,
        }).catch(console.error);
        res.json({ success: true, message: "Sync complete" });
      } catch (err: any) {
        createNotification({
          type: "sync_error",
          title: "Sync Failed",
          message: `Sync for "${project.projectName}" failed: ${err.message}`,
          userId,
        }).catch(console.error);
        throw err;
      }
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/clips/mark-unavailable", requireAuth, requireOperator, async (req, res) => {
    try {
      const { dropboxFileId } = req.body;
      if (!dropboxFileId || typeof dropboxFileId !== "string" || dropboxFileId.trim() === "") {
        return res.status(400).json({ message: "dropboxFileId is required" });
      }
      const userId = (req.user as any).id as number;
      await markClipUnavailable(dropboxFileId);
      createNotification({
        type: "deleted_source_file",
        title: "Clip Unavailable",
        message: `Source file ${dropboxFileId} has been marked unavailable.`,
        userId,
      }).catch(console.error);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ─── Social Connections ────────────────────────────────────────────────────

  app.get("/api/social-connections", requireAuth, async (_req, res) => {
    try {
      const connections = await getSocialConnections();
      // Strip tokens from response for non-admin users
      const role = (_req.user as any)?.role;
      const safe = role === "admin"
        ? connections
        : connections.map(({ accessToken, refreshToken, ...rest }) => rest);
      res.json(safe);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/social-connections/active", requireAuth, async (_req, res) => {
    try {
      const connections = await getActiveSocialConnections();
      res.json(connections.map(({ accessToken, refreshToken, ...rest }) => rest));
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/social-connections/:id", requireAuth, async (req, res) => {
    try {
      const connection = await getSocialConnectionById(Number(req.params.id));
      if (!connection) return res.status(404).json({ message: "Connection not found" });
      const { accessToken, refreshToken, ...safe } = connection;
      res.json(safe);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/social-connections", requireAuth, requireAdmin, async (req, res) => {
    try {
      const parsed = insertSocialConnectionSchema.parse(req.body);
      const connection = await createSocialConnection({ ...parsed, connectedById: (req.user as any).id });
      res.status(201).json(connection);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/social-connections/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const updated = await updateSocialConnection(Number(req.params.id), req.body);
      if (!updated) return res.status(404).json({ message: "Connection not found" });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/social-connections/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const deleted = await deleteSocialConnection(Number(req.params.id));
      if (!deleted) return res.status(404).json({ message: "Connection not found" });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ─── Scheduled Posts ──────────────────────────────────────────────────────

  app.get("/api/scheduled-posts", requireAuth, async (req, res) => {
    try {
      const filters: Record<string, any> = {};
      if (req.query.status) filters.status = req.query.status;
      if (req.query.platform) filters.platform = req.query.platform;
      if (req.query.campaignId) filters.campaignId = Number(req.query.campaignId);
      if (req.query.from) filters.from = new Date(req.query.from as string);
      if (req.query.to) filters.to = new Date(req.query.to as string);
      const posts = await getScheduledPosts(filters);
      res.json(posts);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/scheduled-posts/calendar", requireAuth, async (req, res) => {
    try {
      const from = req.query.from ? new Date(req.query.from as string) : new Date();
      const to = req.query.to
        ? new Date(req.query.to as string)
        : new Date(from.getTime() + 30 * 24 * 60 * 60 * 1000);
      const posts = await getCalendarPosts(from, to);
      res.json(posts);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/scheduled-posts/:id", requireAuth, async (req, res) => {
    try {
      const post = await getScheduledPostById(Number(req.params.id));
      if (!post) return res.status(404).json({ message: "Post not found" });
      res.json(post);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/scheduled-posts", requireAuth, requireOperator, async (req, res) => {
    try {
      const parsed = insertScheduledPostSchema.parse(req.body);
      const post = await createScheduledPost({ ...parsed, createdById: (req.user as any).id });
      res.status(201).json(post);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/scheduled-posts/:id", requireAuth, requireOperator, async (req, res) => {
    try {
      const updated = await updateScheduledPost(Number(req.params.id), req.body);
      if (!updated) return res.status(404).json({ message: "Post not found" });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/scheduled-posts/:id/approve", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id as number;
      const approved = await approveScheduledPost(Number(req.params.id), userId);
      if (!approved) return res.status(404).json({ message: "Post not found" });
      res.json(approved);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/scheduled-posts/:id/cancel", requireAuth, requireOperator, async (req, res) => {
    try {
      const cancelled = await updateScheduledPost(Number(req.params.id), { status: "cancelled" });
      if (!cancelled) return res.status(404).json({ message: "Post not found" });
      res.json(cancelled);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/scheduled-posts/:id/retry", requireAuth, requireOperator, async (req, res) => {
    try {
      const post = await getScheduledPostById(Number(req.params.id));
      if (!post) return res.status(404).json({ message: "Post not found" });
      if (post.status !== "failed") return res.status(400).json({ message: "Only failed posts can be retried" });
      const updated = await updateScheduledPost(post.id, { status: "scheduled" });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/scheduled-posts/:id", requireAuth, requireOperator, async (req, res) => {
    try {
      const deleted = await deleteScheduledPost(Number(req.params.id));
      if (!deleted) return res.status(404).json({ message: "Post not found" });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ─── Morgan: Conversations ─────────────────────────────────────────────────

  app.get("/api/morgan/conversations", requireAuth, async (req, res) => {
    try {
      const conversations = await getMorganConversations((req.user as any).id);
      res.json(conversations);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/morgan/conversations", requireAuth, async (req, res) => {
    try {
      const conversation = await createMorganConversation({
        title: req.body.title || null,
        userId: (req.user as any).id,
        channel: "app",
      });
      res.json(conversation);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/morgan/conversations/:id", requireAuth, async (req, res) => {
    try {
      const conversation = await getMorganConversation(Number(req.params.id));
      if (!conversation) return res.status(404).json({ message: "Conversation not found" });
      res.json(conversation);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/morgan/conversations/:id/archive", requireAuth, async (req, res) => {
    try {
      await archiveMorganConversation(Number(req.params.id));
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ─── Morgan: Messages + Chat ──────────────────────────────────────────────

  app.get("/api/morgan/conversations/:id/messages", requireAuth, async (req, res) => {
    try {
      const messages = await getMorganMessages(Number(req.params.id));
      res.json(messages);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  const morganChatLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 15,
    message: { message: "Too many messages. Please wait a moment." },
  });

  app.post("/api/morgan/conversations/:id/chat", requireAuth, morganChatLimiter, async (req, res) => {
    try {
      const conversationId = Number(req.params.id);
      const { message } = req.body;
      if (!message || typeof message !== "string" || !message.trim()) {
        return res.status(400).json({ message: "Message is required" });
      }

      const userId = (req.user as any).id;
      const userName = (req.user as any).firstName || (req.user as any).username;

      // Store the user message
      const userMsg = await createMorganMessage({
        conversationId,
        role: "user",
        content: message.trim(),
        userId,
      });

      // Get Morgan's response
      const result = await chatWithMorgan(conversationId, `${userName}: ${message.trim()}`, userId);

      // Store Morgan's response
      const morganMsg = await createMorganMessage({
        conversationId,
        role: "morgan",
        content: result.response,
        metadata: {
          provider: result.provider,
          model: result.model,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
          latencyMs: result.latencyMs,
        },
      });

      // Auto-title the conversation if it's the first message
      const conversation = await getMorganConversation(conversationId);
      if (conversation && !conversation.title) {
        const title = message.trim().slice(0, 60) + (message.trim().length > 60 ? "..." : "");
        // Update title (direct DB update since we don't have a dedicated function for this)
        await createMorganConversation; // we'll just leave it untitled for now
      }

      res.json({
        userMessage: userMsg,
        morganMessage: morganMsg,
        provider: result.provider,
        model: result.model,
        latencyMs: result.latencyMs,
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ─── Morgan: Memory ───────────────────────────────────────────────────────

  app.get("/api/morgan/memory", requireAuth, async (req, res) => {
    try {
      const type = req.query.type as string | undefined;
      const memories = await getMorganMemories({
        type: type as any,
        limit: 100,
      });
      res.json(memories);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/morgan/memory", requireAuth, async (req, res) => {
    try {
      const memory = await createMorganMemory({
        type: req.body.type ?? "context",
        content: req.body.content,
        source: "manual",
        userId: (req.user as any).id,
        importance: req.body.importance ?? 5,
        expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : null,
      });
      res.json(memory);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/morgan/memory/:id", requireAuth, async (req, res) => {
    try {
      const updated = await updateMorganMemory(Number(req.params.id), {
        content: req.body.content,
        importance: req.body.importance,
      });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/morgan/memory/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      await deleteMorganMemory(Number(req.params.id));
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/morgan/memory/search", requireAuth, async (req, res) => {
    try {
      const q = req.query.q as string;
      if (!q) return res.status(400).json({ message: "Query parameter 'q' is required" });
      const results = await searchMorganMemory(q);
      res.json(results);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ─── Morgan: Tasks (Autonomous Cycle) ───────────────────────────────────────

  app.get("/api/morgan/tasks", requireAuth, async (req, res) => {
    try {
      const tasks = await getMorganTasks(50);
      res.json(tasks);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/morgan/tasks/:type/run", requireAuth, requireAdmin, async (req, res) => {
    try {
      const taskType = req.params.type;
      const task = await createMorganTask({
        taskType,
        status: "running",
        scheduledAt: new Date(),
        startedAt: new Date(),
      });

      try {
        const result = await runMorganTask(taskType);
        await updateMorganTask(task.id, {
          status: "completed",
          completedAt: new Date(),
          result,
        });
        res.json({ task: { ...task, status: "completed", result } });
      } catch (runErr: any) {
        await updateMorganTask(task.id, {
          status: "failed",
          completedAt: new Date(),
          error: runErr.message,
        });
        res.json({ task: { ...task, status: "failed", error: runErr.message } });
      }
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ─── Morgan: Auto-Approve Rules ────────────────────────────────────────────

  app.get("/api/morgan/auto-approve-rules", requireAuth, async (req, res) => {
    try {
      const rules = await getMorganAutoApproveRules();
      res.json(rules);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/morgan/auto-approve-rules", requireAuth, requireAdmin, async (req, res) => {
    try {
      const rule = await createMorganAutoApproveRule({
        name: req.body.name,
        description: req.body.description || null,
        isActive: req.body.isActive ?? true,
        conditions: req.body.conditions,
        createdById: (req.user as any).id,
      });
      res.json(rule);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/morgan/auto-approve-rules/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const updated = await updateMorganAutoApproveRule(Number(req.params.id), req.body);
      if (!updated) return res.status(404).json({ message: "Rule not found" });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/morgan/auto-approve-rules/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      await deleteMorganAutoApproveRule(Number(req.params.id));
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ─── Phase 10: Smart Link Redirect ──────────────────────────────────────────

  app.get("/w/:slug", async (req, res) => {
    try {
      const result = await handleSmartLinkRedirect(req, req.params.slug);
      if ("error" in result) {
        return res.status(result.status).json({ message: result.error });
      }
      return res.redirect(302, result.redirectUrl);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ─── Phase 10: Click Event Analytics ──────────────────────────────────────────

  app.get("/api/link-analytics/events", requireAuth, async (req, res) => {
    try {
      const filters: any = {};
      if (req.query.smartLinkId) filters.smartLinkId = Number(req.query.smartLinkId);
      if (req.query.slug) filters.slug = String(req.query.slug);
      if (req.query.country) filters.country = String(req.query.country);
      if (req.query.from) filters.from = new Date(String(req.query.from));
      if (req.query.to) filters.to = new Date(String(req.query.to));
      if (req.query.limit) filters.limit = Number(req.query.limit);
      const events = await getClickEvents(filters);
      res.json(events);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/link-analytics/stats", requireAuth, async (req, res) => {
    try {
      const smartLinkId = req.query.smartLinkId ? Number(req.query.smartLinkId) : undefined;
      const stats = await getClickEventStats(smartLinkId);
      res.json(stats);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ─── Phase 10: Brand Assets ───────────────────────────────────────────────────

  app.get("/api/brand/assets", requireAuth, async (req, res) => {
    try {
      const titleId = req.query.titleId !== undefined
        ? req.query.titleId === "null" ? null : Number(req.query.titleId)
        : undefined;
      const assets = await getBrandAssets(titleId);
      res.json(assets);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/brand/assets", requireOperator, async (req, res) => {
    try {
      const asset = await createBrandAsset(req.body);
      res.status(201).json(asset);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/brand/assets/:id", requireOperator, async (req, res) => {
    try {
      const asset = await updateBrandAsset(Number(req.params.id), req.body);
      if (!asset) return res.status(404).json({ message: "Asset not found" });
      res.json(asset);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/brand/assets/:id", requireOperator, async (req, res) => {
    try {
      await deleteBrandAsset(Number(req.params.id));
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ─── Phase 10: Brand Voice Rules ──────────────────────────────────────────────

  app.get("/api/brand/voice", requireAuth, async (req, res) => {
    try {
      const titleId = req.query.titleId !== undefined
        ? req.query.titleId === "null" ? null : Number(req.query.titleId)
        : undefined;
      const rules = await getBrandVoiceRules(titleId);
      res.json(rules);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/brand/voice", requireOperator, async (req, res) => {
    try {
      const rule = await createBrandVoiceRule(req.body);
      res.status(201).json(rule);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/brand/voice/:id", requireOperator, async (req, res) => {
    try {
      const rule = await updateBrandVoiceRule(Number(req.params.id), req.body);
      if (!rule) return res.status(404).json({ message: "Rule not found" });
      res.json(rule);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/brand/voice/:id", requireOperator, async (req, res) => {
    try {
      await deleteBrandVoiceRule(Number(req.params.id));
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ─── Phase 10: Social Profiles ────────────────────────────────────────────────

  app.get("/api/brand/social-profiles", requireAuth, async (req, res) => {
    try {
      const titleId = req.query.titleId !== undefined
        ? req.query.titleId === "null" ? null : Number(req.query.titleId)
        : undefined;
      const profiles = await getSocialProfiles(titleId);
      res.json(profiles);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/brand/social-profiles", requireOperator, async (req, res) => {
    try {
      const profile = await createSocialProfile(req.body);
      res.status(201).json(profile);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/brand/social-profiles/:id", requireOperator, async (req, res) => {
    try {
      const profile = await updateSocialProfile(Number(req.params.id), req.body);
      if (!profile) return res.status(404).json({ message: "Profile not found" });
      res.json(profile);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/brand/social-profiles/:id", requireOperator, async (req, res) => {
    try {
      await deleteSocialProfile(Number(req.params.id));
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ─── Phase 10: Press Kit Items ────────────────────────────────────────────────

  app.get("/api/brand/press-kit/:titleId", requireAuth, async (req, res) => {
    try {
      const items = await getPressKitItems(Number(req.params.titleId));
      res.json(items);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/brand/press-kit", requireOperator, async (req, res) => {
    try {
      const item = await createPressKitItem(req.body);
      res.status(201).json(item);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/brand/press-kit/:id", requireOperator, async (req, res) => {
    try {
      const item = await updatePressKitItem(Number(req.params.id), req.body);
      if (!item) return res.status(404).json({ message: "Item not found" });
      res.json(item);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/brand/press-kit/:id", requireOperator, async (req, res) => {
    try {
      await deletePressKitItem(Number(req.params.id));
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ─── Phase 11: Audience Personas ─────────────────────────────────────────────

  app.get("/api/audience/personas", requireAuth, async (_req, res) => {
    try { res.json(await getAudiencePersonas()); } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/audience/personas", requireOperator, async (req, res) => {
    try { res.status(201).json(await createAudiencePersona(req.body)); } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.patch("/api/audience/personas/:id", requireOperator, async (req, res) => {
    try {
      const result = await updateAudiencePersona(Number(req.params.id), req.body);
      if (!result) return res.status(404).json({ message: "Not found" });
      res.json(result);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.delete("/api/audience/personas/:id", requireOperator, async (req, res) => {
    try { await deleteAudiencePersona(Number(req.params.id)); res.json({ success: true }); } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ─── Phase 11: Engagement Templates ────────────────────────────────────────────

  app.get("/api/engagement/templates", requireAuth, async (req, res) => {
    try {
      const category = req.query.category ? String(req.query.category) : undefined;
      res.json(await getEngagementTemplates(category));
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/engagement/templates", requireOperator, async (req, res) => {
    try { res.status(201).json(await createEngagementTemplate(req.body)); } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.patch("/api/engagement/templates/:id", requireOperator, async (req, res) => {
    try {
      const result = await updateEngagementTemplate(Number(req.params.id), req.body);
      if (!result) return res.status(404).json({ message: "Not found" });
      res.json(result);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.delete("/api/engagement/templates/:id", requireOperator, async (req, res) => {
    try { await deleteEngagementTemplate(Number(req.params.id)); res.json({ success: true }); } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ─── Phase 11: Email Subscribers ───────────────────────────────────────────────

  app.get("/api/email/subscribers", requireAuth, async (req, res) => {
    try {
      const filters: any = {};
      if (req.query.isActive !== undefined) filters.isActive = req.query.isActive === "true";
      if (req.query.source) filters.source = String(req.query.source);
      res.json(await getEmailSubscribers(filters));
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.get("/api/email/subscribers/count", requireAuth, async (_req, res) => {
    try { res.json({ count: await getEmailSubscriberCount() }); } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/email/subscribers", async (req, res) => {
    // Public endpoint for smart link email capture
    try {
      const { email, name, source, titleId } = req.body;
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ message: "Valid email required" });
      }
      const subscriber = await createEmailSubscriber({ email, name, source: source ?? "smart_link", titleId: titleId ?? null });
      res.status(201).json(subscriber);
    } catch (err: any) {
      if (err.message?.includes("unique")) {
        return res.status(409).json({ message: "Already subscribed" });
      }
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/email/subscribers/:id/unsubscribe", async (req, res) => {
    try { await unsubscribeEmail(Number(req.params.id)); res.json({ success: true }); } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.delete("/api/email/subscribers/:id", requireOperator, async (req, res) => {
    try { await deleteEmailSubscriber(Number(req.params.id)); res.json({ success: true }); } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ─── Phase 11: Email Campaigns ─────────────────────────────────────────────────

  app.get("/api/email/campaigns", requireAuth, async (_req, res) => {
    try { res.json(await getEmailCampaigns()); } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.get("/api/email/campaigns/:id", requireAuth, async (req, res) => {
    try {
      const campaign = await getEmailCampaignById(Number(req.params.id));
      if (!campaign) return res.status(404).json({ message: "Not found" });
      res.json(campaign);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/email/campaigns", requireOperator, async (req, res) => {
    try { res.status(201).json(await createEmailCampaign(req.body)); } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.patch("/api/email/campaigns/:id", requireOperator, async (req, res) => {
    try {
      const result = await updateEmailCampaign(Number(req.params.id), req.body);
      if (!result) return res.status(404).json({ message: "Not found" });
      res.json(result);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.delete("/api/email/campaigns/:id", requireOperator, async (req, res) => {
    try { await deleteEmailCampaign(Number(req.params.id)); res.json({ success: true }); } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ─── Phase 11: Competitor Tracking ─────────────────────────────────────────────

  app.get("/api/competitors", requireAuth, async (_req, res) => {
    try { res.json(await getCompetitorTracks()); } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/competitors", requireOperator, async (req, res) => {
    try { res.status(201).json(await createCompetitorTrack(req.body)); } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.patch("/api/competitors/:id", requireOperator, async (req, res) => {
    try {
      const result = await updateCompetitorTrack(Number(req.params.id), req.body);
      if (!result) return res.status(404).json({ message: "Not found" });
      res.json(result);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.delete("/api/competitors/:id", requireOperator, async (req, res) => {
    try { await deleteCompetitorTrack(Number(req.params.id)); res.json({ success: true }); } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ─── Phase 11: Release Window Strategies ───────────────────────────────────────

  app.get("/api/release-strategies", requireAuth, async (req, res) => {
    try {
      const titleId = req.query.titleId ? Number(req.query.titleId) : undefined;
      res.json(await getReleaseWindowStrategies(titleId));
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/release-strategies", requireOperator, async (req, res) => {
    try { res.status(201).json(await createReleaseWindowStrategy(req.body)); } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.patch("/api/release-strategies/:id", requireOperator, async (req, res) => {
    try {
      const result = await updateReleaseWindowStrategy(Number(req.params.id), req.body);
      if (!result) return res.status(404).json({ message: "Not found" });
      res.json(result);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.delete("/api/release-strategies/:id", requireOperator, async (req, res) => {
    try { await deleteReleaseWindowStrategy(Number(req.params.id)); res.json({ success: true }); } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ─── Phase 11: Cross-Promotions ────────────────────────────────────────────────

  app.get("/api/cross-promotions", requireAuth, async (req, res) => {
    try {
      const status = req.query.status ? String(req.query.status) : undefined;
      res.json(await getCrossPromotions(status));
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/cross-promotions", requireOperator, async (req, res) => {
    try { res.status(201).json(await createCrossPromotion(req.body)); } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.patch("/api/cross-promotions/:id/status", requireOperator, async (req, res) => {
    try {
      const result = await updateCrossPromotionStatus(Number(req.params.id), req.body.status);
      if (!result) return res.status(404).json({ message: "Not found" });
      res.json(result);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.delete("/api/cross-promotions/:id", requireOperator, async (req, res) => {
    try { await deleteCrossPromotion(Number(req.params.id)); res.json({ success: true }); } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Start Morgan's autonomous scheduler
  startMorganScheduler();

  const server = http.createServer(app);
  return server;
}

// Re-export middleware for use in other route sections (plans 03–06 will add more routes to this file)
export { requireAuth, requireAdmin, requireOperator, requireReviewer };

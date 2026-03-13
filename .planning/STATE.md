---
gsd_state_version: 1.0
milestone: v1.5
milestone_name: — Morgan AI Marketing Department
current_phase: Phase 7 (Phase 6 complete)
status: building
last_updated: "2026-03-13"
progress:
  total_phases: 11
  completed_phases: 6
  total_plans: 21
  completed_plans: 21
---

# OAE_Marketing — Project State

**Last Updated:** 2026-03-13
**Current Milestone:** v1.5 — Morgan: AI Marketing Department
**Current Phase:** Phase 7 — Social Publishing + Scheduling
**Last Session:** 2026-03-13

---

## Status

**Phase 1:** Complete — Foundation, auth, titles, Dropbox sync, clip library
**Phase 2:** Complete — Destinations, smart links, alerts
**Phase 3:** Complete — Clip rotation engine (storage + routes + UI all present; was mislabeled as skipped)
**Phase 4:** Complete — Campaign builder, AI studio, prompt templates, content versioning
**Phase 5:** Complete — Analytics storage, notifications, dashboard, security hardening
**Phase 6:** Complete — Health check passed, 3 owner accounts seeded (ryan/jon/geoff), schema pushed, all pages verified via Playwright
**Phase 7:** Not started — Social publishing + scheduling (Instagram, TikTok, X, YouTube)
**Phase 8:** Not started — Morgan Core: AI marketing brain, chat interface, strategy wizard
**Phase 9:** Not started — Morgan Autonomous Mode: daily cycle, approval queue, trend monitoring
**Phase 10:** Not started — Smart link deployment (watch.otheranimal.app) + brand hub
**Phase 11:** Not started — Audience growth, engagement, cross-promotion, email/newsletter

---

## What Exists

- GitHub repo created: https://github.com/Graffan/OAE_Marketing
- Planning documents written:
  - `.planning/PROJECT_BRIEF.md` — full product document (1652 lines)
  - `.planning/PROJECT.md` — condensed project context
  - `.planning/REQUIREMENTS.md` — v1/v2/out-of-scope requirements
  - `.planning/ROADMAP.md` — 5-phase v1.0 roadmap
  - `.planning/STATE.md` — this file
  - `.planning/config.json` — GSD workflow config

---

## What's Next

v1.0 phases largely complete but Phase 3 (Clip Rotation) was skipped and needs building.
New Milestone 1.5 added (Phases 6–9):

1. **Phase 6** — Health check all existing code + build Phase 3 (clip rotation engine)
2. **Phase 7** — Social platform publishing + scheduling (Instagram, TikTok, X, YouTube APIs)
3. **Phase 8** — 360 Marketing Playbook: AI strategy wizard, "what should I post today?", content calendar auto-gen, posting cadence templates, genre-aware platform recs, weekly strategy digest
4. **Phase 9** — Deploy watch.otheranimal.app smart link service + brand asset hub

**Start:** Open session in `/Users/geoffraffan/Projects/OAE_Marketing` → `/gsd:plan-phase 6`

---

## Phase 2 Deliverables (complete)

- Regional destinations CRUD with expiry tracking (`/destinations`)
- Smart links with IP geo-resolve redirect at `/l/:slug` (`/smart-links`)
- Combined alerts endpoint `GET /api/alerts/destinations`
- `ExpiryAlerts` component (compact + full/dismissible modes)
- `DashboardPage` at `/` with 4 stat cards (Titles, Clips, Expiring Links, Smart Links)
- All sidebar nav entries wired with role gating

---

## Phase 4 Plan 02 Deliverables (complete)

- 18 storage functions across 4 subsections in server/storage.ts
- Campaign CRUD: getCampaigns (with title join), getCampaignById, createCampaign, updateCampaign, deleteCampaign, patchCampaignStatus
- Campaign content versioning: getCampaignContents, createCampaignContent, activateCampaignContentVersion (Drizzle transaction), getActiveCampaignContents
- AI log tracking: createAiLog, getAiLogs (paginated), getAiUsageSummary (daily by user), checkTokenCaps (throws on cap breach)
- Prompt template CRUD: getPromptTemplates, getPromptTemplate (active by taskName), updatePromptTemplate
- campaignContents + promptTemplates tables + insert schemas added to schema (Plan 01 partial run deviation fix)

---

## Phase 4 Plan 01 Deliverables (complete)

- ai_logs table with provider/model/task/token/latency tracking, FK to campaigns and users
- campaign_contents table for AI-generated copy per campaign with contentType/platform/region/version
- prompt_templates table with four seeded defaults: campaign_brief, clip_to_post, territory_assistant, catalog_revival
- insertAiLogSchema, insertCampaignContentSchema, insertPromptTemplateSchema Zod schemas exported
- Seed script idempotent — checks by taskName before inserting
- {{double_brace}} variable syntax established for prompt template interpolation

---

## Phase 5 Plan 02 Deliverables (complete)

- `NOTIFICATION_TYPES` const array with 7 event types exported from shared/schema.ts
- `notifications` table: userId FK (set null on delete), type, title, message, isRead (default false), metadata (json), createdAt; indexes on userId and isRead
- `insertNotificationSchema`, `Notification`, `InsertNotification` types exported
- 5 storage functions in server/storage.ts: `createNotification`, `getNotifications`, `getUnreadCount`, `markNotificationRead`, `markAllNotificationsRead`
- DB schema pushed — notifications table live in oae_marketing database

---

## Phase 5 Plan 01 Deliverables (complete)

- 10 analytics storage functions added to server/storage.ts
- Clip performance scoring: `computeClipPerformanceScore` (engagementScore + CTR + region/platform breadth)
- Repost eligibility: `isRepostEligible` (engagement threshold + days since post + pool state)
- Event recording: `recordAnalyticsEvent` inserts into analytics_events table
- Analytics views: `getClipAnalytics`, `getCampaignAnalytics` ordered by postedAt desc
- Aggregated views: `getAnalyticsByRegion`, `getAnalyticsByPlatform` with SQL SUM/COUNT and optional titleId filter
- Top clips: `getTopPerformingClips(limit)` ordered by engagementScore desc
- Dashboard summary: `getAnalyticsDashboardSummary` — activeCampaigns, titlesNeedingPromotion, rotationByProject, topClips via Promise.all
- Asset health: `getAssetHealthReport` — unsyncedProjects, titlesWithNoClips, titlesWithNoDestinations, clipsWithMissingMetadata via Promise.all

---

## Key Decisions Made

- **activateCampaignContentVersion:** Uses `db.transaction()` to prevent dual-active content — deactivate all matching (campaignId, contentType, platform, region), then activate chosen version
- **checkTokenCaps:** Throws Error with exact message strings ("Daily token cap reached", "User token cap reached") for easy catch-and-match in route handlers
- **Token daily boundary:** Uses `setUTCHours(0,0,0,0)` for consistent midnight UTC regardless of server timezone
- **Stack:** Node/Express/TS + React/Vite/Tailwind/shadcn/wouter + Postgres/Drizzle (consistent with other 360 Studio Suite apps)
- **Auth:** Passport.js session-based (same pattern as VFXTracker, ADRSessionManager)
- **AI:** Multi-provider layer (Claude primary, OpenAI + DeepSeek secondary) with `ai_orchestrator` module
- **Cloud Storage:** Dropbox API first, extensible to Google Drive
- **Smart Links:** Custom redirect service at `watch.otheranimal.app/{slug}`
- **Film Metadata:** OMDb API auto-import on title creation
- **Port:** TBD (VFXTracker=5001, ADRSessionManager=5002, next likely 5003)
- **DB:** PostgreSQL database `oae_marketing`, admin: `admin`/`oaeadmin2024`
- **computeClipPerformanceScore:** Returns 0.0 early if clip has no posts — avoids divide-by-zero and is semantically correct (no data = no score)
- **getAnalyticsDashboardSummary:** Fetches all projects then calls getRotationStats() per project — N+1 acceptable at current scale
- **getAssetHealthReport IS NULL OR:** Uses sql template literal since Drizzle's `isNull()` doesn't compose with `or()` cleanly across two columns
- **NOTIFICATION_TYPES:** const array (not enum) for lightweight union type — NotificationType derived via `(typeof NOTIFICATION_TYPES)[number]`
- **notifications userId FK:** set null on delete — notifications persist even after user deletion
- **getUnreadCount / markAllNotificationsRead:** conditions array + `and(...conditions)` pattern matches existing storage.ts style for optional userId filtering

---

## Open Questions

- [ ] What port should this run on? (5003?)
- [ ] Do we need a separate redirect microservice for `watch.otheranimal.app` or is it part of the main app?
- [ ] Dropbox — team account or personal? What's the root folder structure currently?
- [ ] Will OMDb API key be shared across Studio Suite apps or per-app?
- [ ] Hosting target: same Proxmox LXC as other apps?

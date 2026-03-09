# OAE_Marketing — Roadmap

**Project:** OAE_Marketing
**Created:** 2026-03-07
**Milestone:** v1.0 — Internal Marketing Operating System MVP

---

## Milestone 1: v1.0 — MVP

### Phase 1: Foundation
**Goal:** Core data models, auth, title catalog, Dropbox sync, clip library

**Deliverables:**
- Project scaffold (Node/Express/TS + React/Vite/Tailwind/shadcn + Postgres/Drizzle)
- Session auth with Passport.js, 5 roles (admin, marketing_operator, reviewer, executive, freelancer)
- Admin panel: user management + app settings + AI provider config
- Titles CRUD with OMDb API auto-import
- Projects CRUD with Dropbox connection + folder mapping
- Dropbox sync: index viral clips folder, store metadata in `clips` table
- Clip library UI: filter, preview, approve/reject, bulk actions
- DB schema: all 9 tables (titles, projects, assets, clips, clip_posts, campaigns, smart_links, regional_destinations, analytics_events)
- DB seed: admin user + app settings

**Verification:**
- [ ] Can create a title, auto-import from OMDb, and manually edit fields
- [ ] Can connect a Dropbox folder and sync clips into the library
- [ ] Clips appear with metadata and can be approved/rejected
- [ ] Admin can create/edit/deactivate users with correct role gating
- [ ] All 5 roles see appropriate UI elements

---

### Phase 2: Destinations & Smart Links
**Goal:** Regional watch-link management and territory-aware smart link routing

**Deliverables:**
- Regional destinations CRUD (per title, per country/region, with deal windows)
- Link state tracking: active, expiring_soon, expired
- Smart link generation: slug-based URLs (`watch.otheranimal.app/{slug}`)
- Smart link resolution endpoint: IP geolocation → regional_destinations → redirect + tracking params
- Smart link tester UI (input country → preview destination)
- Dashboard alerts for expiring/missing regional links
- Rights/restrictions fields on clips (allowed_regions, restricted_regions, embargo_date)

**Verification:**
- [ ] Can add regional destinations for a title (CA → Apple TV, US → Amazon, UK → Tubi)
- [ ] Smart link resolves correctly by region with tracking params appended
- [ ] Smart link tester shows correct resolution by country
- [ ] Dashboard shows expiring deal alerts

---

### Phase 3: Clip Rotation Engine
**Goal:** Prevent duplicate posting, track usage, enforce rotation rules

**Deliverables:**
- Clip rotation state per campaign/project (cycle tracking)
- Rotation algorithm: filter approved → remove already-posted → pick highest priority → on pool exhaustion re-rank and start new cycle
- Clip post history records (clip_posts table with full posting metadata)
- Duplicate warning UI: show last post date, last platforms, alternatives
- Operator rotation controls: no-repeat until exhausted, repeat top performers after X days, region/platform-specific reuse, manual override
- Clip rotation indicator widget (e.g., "18 of 26 clips used, 8 remaining")
- Clip states: new → awaiting_review → approved → scheduled → posted → archived

**Verification:**
- [ ] Rotation correctly blocks a clip from reuse until pool is exhausted
- [ ] Duplicate warning appears with correct last post info
- [ ] Manual override works
- [ ] Clip rotation indicator shows accurate counts

---

### Phase 4: Campaign Builder + AI Studio
**Goal:** End-to-end campaign creation with AI-assisted copy generation

**Deliverables:**
- Campaign builder workflow: title → goal → regions → clip select → AI copy → smart links → export
- Campaign states: draft, ai_generated, awaiting_approval, approved, active, completed
- Campaign templates: new title launch, trailer release, watch-now, seasonal, catalog revival
- `ai_orchestrator` module: provider abstraction layer for Claude, OpenAI, DeepSeek
- AI tasks implemented:
  - Campaign brief generator
  - Clip-to-post generator (headline, short/long caption, CTA, hashtags, platform recs, region-aware link)
  - Territory release assistant
  - Catalog revival assistant
- Automatic provider fallback (primary fail → secondary → log switch)
- Manual provider selection UI
- Non-API fallback mode (copy prompt → paste result back → label source)
- Token + cost tracking per request/user/project
- Prompt templates stored per task
- AI output audit log (provider, model, tokens, latency, response)
- Content versioning (captions, CTAs, links, campaign params)
- Post export (manual publishing in v1)

**Verification:**
- [ ] Can run full campaign builder workflow from title selection to post export
- [ ] AI generates caption, CTA, and hashtags for a selected clip
- [ ] Claude/OpenAI/DeepSeek all work as providers with correct routing
- [ ] Fallback triggers when primary provider fails
- [ ] Non-API manual paste mode saves AI output correctly
- [ ] Campaign approval workflow works end-to-end (reviewer approves/rejects)
- [ ] Token usage tracked per request and visible in admin

---

### Phase 5: Analytics + Dashboard
**Goal:** Clip and campaign performance tracking, AI-powered weekly summary

**Plans:** 4/6 plans executed

Plans:
- [ ] 05-01-PLAN.md — Analytics storage functions (scores, views, dashboard summary, asset health)
- [ ] 05-02-PLAN.md — Notification schema + storage functions
- [ ] 05-03-PLAN.md — Analytics API routes + AI weekly summary route
- [ ] 05-04-PLAN.md — Notification API routes + failure handling routes
- [ ] 05-05-PLAN.md — useAnalytics + useNotifications hooks + AnalyticsPage UI
- [ ] 05-06-PLAN.md — Rebuilt DashboardPage + NotificationBell component

**Deliverables:**
- Analytics events table population from clip_posts data
- Clip-level analytics: impressions, plays, completion rate, likes, comments, shares, saves, click-throughs, region/platform response
- Engagement score computation (weighted: likes + comments + shares + saves + view duration)
- Clip performance score (engagement + CTR + region + platform)
- Repost eligibility logic (engagement threshold + days since last post + pool exhaustion)
- Analytics views: by clip, by campaign, by region, by platform
- Performance summarizer AI task (weekly summary: what worked, what failed, best hooks, next actions)
- Full dashboard: campaigns in flight, titles needing promotion, rotation status, top clips, AI recs, asset health
- Asset health dashboard: unsynced projects, missing metadata, titles with no clips, regions missing watch links
- In-app notification system: new clips synced, approval required, link expiring, pool exhausted, strong clip detected
- Failure handling: cloud sync alerts, deleted source file detection, retry sync

**Verification:**
- [ ] Posting a clip creates analytics_events records
- [ ] Clip performance scores are computed and displayed
- [ ] Dashboard shows correct counts for all widgets
- [ ] Weekly AI summary generates from real performance data
- [ ] Asset health indicators show correct warnings
- [ ] Notifications fire for key events

---

## Milestone 2: v2.0 (Future)

- Direct social platform publishing (Instagram, TikTok, X, YouTube)
- Campaign scheduling with calendar view and timezone handling
- Provider comparison mode (side-by-side AI output comparison)
- Human feedback panel on clips
- A/B testing for hooks and CTAs
- Google Analytics integration
- PDF/CSV export for reports
- Email/press workflow module
- OAE site AI SEO page generation

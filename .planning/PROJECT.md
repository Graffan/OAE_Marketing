# OAE_Marketing — Project Context

**Status:** Pre-development
**Owner:** Other Animal Entertainment Inc. / Geoff Raffan
**Repo:** https://github.com/Graffan/OAE_Marketing
**Created:** 2026-03-07

---

## What It Is

An internal film marketing operating system for Other Animal Entertainment. A small team tool — not a SaaS product — that centralizes film assets, regional viewing links, campaign planning, social clip generation, AI-assisted copy, approval workflows, and performance reporting.

**The core loop:**
cloud clip library → AI draft → regional link → post → engagement + click tracking → refine next campaign

---

## Why It Exists

OAE is a lean independent genre film company with no dedicated marketing department. Films exist. Audiences can be reached through clips and social content. But the distribution path is fragmented by territory and platform, and there's no internal system to keep marketing output consistent and fast.

---

## Stack

- **Backend:** Node.js 20, Express, TypeScript, Passport.js (session auth)
- **Frontend:** React 18, Vite, Tailwind CSS, shadcn/ui, wouter
- **Database:** PostgreSQL + Drizzle ORM
- **AI:** Multi-provider layer — Claude (primary), OpenAI API, DeepSeek API
- **Cloud Storage:** Dropbox API (primary), extensible to Google Drive
- **Metadata:** OMDb API (auto-populate film data on title creation)
- **Smart Links:** Custom redirect service at `watch.otheranimal.app/{slug}`
- **Session Store:** connect-pg-simple

## Default Admin Credentials
- Username: `admin` / Password: `oaeadmin2024`
- Role: `admin` (seeded via `server/seed.ts`)

---

## Primary Users

1. **Marketing Operator** (Geoff or team) — creates campaigns, generates AI copy, manages clips, exports posts
2. **Executive / Producer** — read-only view of what's being pushed, which titles need attention, analytics
3. **External Freelancer** — limited access to assigned projects, can upload clips and draft posts
4. **Reviewer / Approver** — approves clips, campaigns, captions; can reject or request edits

---

## App Modules (8)

1. **Dashboard** — campaigns in flight, titles needing attention, unposted clips, expiring deals, AI recommendations
2. **Titles** — film catalog with OMDb auto-import, full metadata, assets, campaigns per title
3. **Assets / Clip Library** — Dropbox-synced clips with metadata, approval status, posting history, rotation status
4. **Destinations** — regional watch-link manager, smart link generator, territory routing rules
5. **Campaign Builder** — title → goal → regions → clip select → AI copy → smart links → export/publish
6. **AI Studio** — prompted workflows using Claude/OpenAI/DeepSeek marketing skills
7. **Analytics** — clip performance, campaign metrics, regional data, platform data
8. **Settings** — users, AI provider config, Dropbox connection, app settings

---

## Key Technical Systems

### Smart Link Routing
`watch.otheranimal.app/{slug}` → IP geolocation → `regional_destinations` table lookup → redirect to correct platform. Fallback to default_url. Tracking params appended.

### Clip Rotation Engine
1. Filter by approved + platform fit + region restrictions
2. Remove already-posted clips this cycle
3. If unused clips exist → pick highest priority
4. If pool exhausted → re-rank by engagement + recency → start new cycle
5. Operators can override

### AI Orchestration (`ai_orchestrator` module)
- Provider abstraction: routes to Claude, OpenAI, or DeepSeek
- Configurable priority + automatic fallback on failure/timeout
- Prompt templates per task type
- Token + cost tracking per request, user, project
- Response caching
- Manual fallback mode: copy structured prompt → paste result back in
- Provider comparison mode: run same prompt against multiple providers

### Dropbox Sync
- Per-project folder mapping with a designated "Viral Clips" folder
- Webhook-first sync (polling fallback every 10 min)
- Metadata indexed into `clips` table, thumbnails generated
- File states: new → approved → scheduled → posted → archived

---

## Database Tables (9)

`titles`, `projects`, `assets`, `clips`, `clip_posts`, `campaigns`, `smart_links`, `regional_destinations`, `analytics_events`

---

## AI Task Registry (Key Tasks)

- `generate_campaign_brief` → Claude first
- `generate_caption_batch` → ChatGPT or DeepSeek
- `suggest_next_clip` → Claude
- `summarize_weekly_performance` → Claude
- `rewrite_synopsis` → OpenAI first
- `generate_region_specific_cta` → ChatGPT or DeepSeek

---

## Constraints

- Small team — minimal clicks for common tasks
- Human approval required before any publishing
- No full video editing, no CRM, no ad buying, no rights management beyond light metadata
- AI must reduce work, not create extra review burden

---

## Related Projects (360 Studio Suite)

VFXTracker · OAE-Studio-Hub · ADRSessionManager · SpottingNotes-Master · Fast_Admin · Dynamic-High-Resolution-Credit-Roll

# OAE_Marketing — Project State

**Last Updated:** 2026-03-09
**Current Milestone:** v1.0
**Current Phase:** Phase 4 — Campaign Builder

---

## Status

**Phase 1:** Complete
**Phase 2:** Complete — Plans 01 (Destinations), 02 (Smart Links), 03 (Alerts + Dashboard) all done
**Phase 3:** Not started
**Phase 4:** In progress — Plan 01 (Schema + Seed) complete
**Phase 5:** Not started

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

Phase 4 Plan 01 complete. Run `/gsd:execute-phase 4` (plan 02) to build the AI orchestrator layer.

---

## Phase 2 Deliverables (complete)

- Regional destinations CRUD with expiry tracking (`/destinations`)
- Smart links with IP geo-resolve redirect at `/l/:slug` (`/smart-links`)
- Combined alerts endpoint `GET /api/alerts/destinations`
- `ExpiryAlerts` component (compact + full/dismissible modes)
- `DashboardPage` at `/` with 4 stat cards (Titles, Clips, Expiring Links, Smart Links)
- All sidebar nav entries wired with role gating

---

## Phase 4 Plan 01 Deliverables (complete)

- ai_logs table with provider/model/task/token/latency tracking, FK to campaigns and users
- campaign_contents table for AI-generated copy per campaign with contentType/platform/region/version
- prompt_templates table with four seeded defaults: campaign_brief, clip_to_post, territory_assistant, catalog_revival
- insertAiLogSchema, insertCampaignContentSchema, insertPromptTemplateSchema Zod schemas exported
- Seed script idempotent — checks by taskName before inserting
- {{double_brace}} variable syntax established for prompt template interpolation

---

## Key Decisions Made

- **Stack:** Node/Express/TS + React/Vite/Tailwind/shadcn/wouter + Postgres/Drizzle (consistent with other 360 Studio Suite apps)
- **Auth:** Passport.js session-based (same pattern as VFXTracker, ADRSessionManager)
- **AI:** Multi-provider layer (Claude primary, OpenAI + DeepSeek secondary) with `ai_orchestrator` module
- **Cloud Storage:** Dropbox API first, extensible to Google Drive
- **Smart Links:** Custom redirect service at `watch.otheranimal.app/{slug}`
- **Film Metadata:** OMDb API auto-import on title creation
- **Port:** TBD (VFXTracker=5001, ADRSessionManager=5002, next likely 5003)
- **DB:** PostgreSQL database `oae_marketing`, admin: `admin`/`oaeadmin2024`

---

## Open Questions

- [ ] What port should this run on? (5003?)
- [ ] Do we need a separate redirect microservice for `watch.otheranimal.app` or is it part of the main app?
- [ ] Dropbox — team account or personal? What's the root folder structure currently?
- [ ] Will OMDb API key be shared across Studio Suite apps or per-app?
- [ ] Hosting target: same Proxmox LXC as other apps?

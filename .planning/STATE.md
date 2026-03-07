# OAE_Marketing — Project State

**Last Updated:** 2026-03-07
**Current Milestone:** v1.0 (pre-development)
**Current Phase:** None — ready to begin Phase 1

---

## Status

**Phase 1:** Not started
**Phase 2:** Not started
**Phase 3:** Not started
**Phase 4:** Not started
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

Run `/gsd:plan-phase 1` to create a detailed Phase 1 implementation plan.

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

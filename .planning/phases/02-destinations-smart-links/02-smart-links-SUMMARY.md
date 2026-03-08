---
phase: 02-destinations-smart-links
plan: 02
subsystem: api, ui, database
tags: [drizzle, express, react-query, geoip, smart-links, analytics, ip-api]

# Dependency graph
requires:
  - phase: 02-destinations-smart-links/01
    provides: regionalDestinations CRUD, destinations storage patterns, DestinationDialog pattern

provides:
  - generateSlug, getSmartLinks, getSmartLinkById, getSmartLinkBySlug, createSmartLink, updateSmartLink, deleteSmartLink (storage)
  - resolveDestinationForCountry (geo-resolution query with date windowing)
  - recordSmartLinkClick (analyticsEvents insert)
  - server/services/geoip.ts — IP geolocation via ip-api.com with private-IP fallback
  - GET /l/:slug — public redirect with GeoIP routing
  - POST /api/smart-links/:slug/preview — country tester endpoint
  - GET/POST/PUT/DELETE /api/smart-links — full CRUD API
  - useSmartLinks, useSmartLink, useCreateSmartLink, useUpdateSmartLink, useDeleteSmartLink, usePreviewSmartLink hooks
  - SmartLinkDialog — create/edit dialog with auto-slug generation
  - SmartLinksPage — table + inline tester panel
  - /smart-links route wired in App.tsx

affects:
  - phase-3 (campaigns will reference smart links via smartLinkId FK)
  - phase-4 (analytics dashboard will read analytics_events smart_link_click rows)
  - phase-5 (any geo-routing enhancements)

# Tech tracking
tech-stack:
  added: [ip-api.com (no npm dependency, axios already present)]
  patterns:
    - GeoIP service pattern (server/services/geoip.ts)
    - Public redirect route registered before authenticated API routes
    - Preview endpoint pattern: same business logic as redirect but returns JSON + no analytics
    - Fire-and-forget analytics (recordSmartLinkClick.catch)
    - UTM template substitution with {slug} placeholder

key-files:
  created:
    - server/services/geoip.ts
    - client/src/hooks/useSmartLinks.ts
    - client/src/components/SmartLinkDialog.tsx
    - client/src/pages/SmartLinksPage.tsx
  modified:
    - server/storage.ts
    - server/routes.ts
    - shared/schema.ts
    - client/src/App.tsx

key-decisions:
  - "resolveDestinationForCountry uses raw sql`` template for IS NULL OR date comparison — avoids adding or/isNull drizzle imports, consistent with existing storage.ts style"
  - "applyTrackingParams defined at module level in routes.ts (above registerRoutes) — shared by redirect and preview endpoints"
  - "Slug is immutable after creation — updateSmartLink excludes slug from allowed fields; PUT route strips slug from req.body"
  - "Inactive smart links bypass GeoIP and analytics — redirect directly to defaultUrl"
  - "Tester panel is always visible (not a modal) — enables quick iteration across multiple country codes"

patterns-established:
  - "Service file pattern: named exports only, no default export (server/services/geoip.ts follows dropbox.ts)"
  - "Preview endpoint pattern: POST /:slug/preview registered BEFORE GET /:id to avoid Express conflicts"
  - "Copy-to-clipboard pattern: setCopiedId state + setTimeout 2000ms reset, no toast library"

requirements-completed: []

# Metrics
duration: ~45min
completed: 2026-03-07
---

# Plan 2: Smart Links Summary

**Slug-based smart links with IP geolocation routing — GeoIP service, public redirect, country tester API, React Query hooks, create/edit dialog, and SmartLinksPage with inline tester panel**

## Performance

- **Duration:** ~45 min
- **Completed:** 2026-03-07
- **Tasks:** 10 of 12 (Tasks 11-12 are verification/smoke test — not code tasks)
- **Files modified:** 7 (3 new server files, 4 new client files, 3 modified)

## Accomplishments
- Full smart link backend: storage CRUD + GeoIP service + public redirect + preview tester + analytics recording
- `/l/:slug` public redirect with IP geolocation, UTM tracking params, inactive-link bypass, and fire-and-forget analytics
- SmartLinksPage with two-panel layout: slug table with copy button + sticky tester panel (country select + Preview → result card)
- `npm run check` passes cleanly with zero TypeScript errors

## Task Commits

1. **Tasks 1-4: Storage + GeoIP** - `213d3e5` (feat)
2. **Task 5: Routes** - `cb5d564` (feat)
3. **Tasks 6-9: Client hooks, dialog, page, App.tsx** - `8513af7` (feat)

## Files Created/Modified
- `server/storage.ts` — Added smartLinks/analyticsEvents imports, sql operator, generateSlug + 7 smart link functions
- `server/services/geoip.ts` — IP geolocation service with X-Forwarded-For support, private-IP fallback, dev override
- `server/routes.ts` — applyTrackingParams helper + 7 smart link routes in correct registration order
- `shared/schema.ts` — insertSmartLinkSchema + InsertSmartLink type
- `client/src/hooks/useSmartLinks.ts` — 6 hooks including usePreviewSmartLink + PreviewResult type
- `client/src/components/SmartLinkDialog.tsx` — Create/edit dialog with Generate slug button
- `client/src/pages/SmartLinksPage.tsx` — Full page with table + tester panel
- `client/src/App.tsx` — Link2 icon import, Smart Links nav item, /smart-links route

## Decisions Made
- Used raw `sql`` template` for IS NULL OR date comparisons in `resolveDestinationForCountry` rather than importing `or`/`isNull` from drizzle-orm — consistent with existing storage.ts patterns and avoids unnecessary import changes
- `applyTrackingParams` placed at module level (above `registerRoutes`) so it's available to both the redirect and preview endpoints without duplication

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required. ip-api.com requires no API key for standard usage (up to 45 req/min free tier).

## Next Phase Readiness
- Smart links fully operational; campaigns (Phase 3) can reference smart links via the existing `smartLinkId` FK on the campaigns table
- Analytics events are being recorded — Phase 4 dashboard can query `analytics_events WHERE event_type = 'smart_link_click'`
- GeoIP fallback to US on private IPs ensures dev environment works without needing a real IP

---
*Phase: 02-destinations-smart-links*
*Completed: 2026-03-07*

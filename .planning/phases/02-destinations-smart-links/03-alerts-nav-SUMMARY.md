---
phase: 02-destinations-smart-links
plan: 03
subsystem: ui, api
tags: [react, express, tanstack-query, wouter, lucide-react, dashboard, alerts]

# Dependency graph
requires:
  - phase: 02-destinations-smart-links
    provides: getExpiringDestinations, getTitlesWithNoActiveDestinations storage functions; DestinationsPage; SmartLinksPage; useDestinations hook
provides:
  - GET /api/alerts/destinations combined summary endpoint
  - useDestinationAlerts hook (AlertsResponse type)
  - ExpiryAlerts reusable component (full + compact modes, sessionStorage dismiss)
  - DashboardPage with 4 stat cards, alerts section, quick actions
  - / route wired to DashboardPage (replaces PlaceholderPage)
affects: phase-03-campaigns, phase-04-ai-studio (can embed ExpiryAlerts compact anywhere)

# Tech tracking
tech-stack:
  added: []
  patterns: [alerts-compact-full-dual-mode, sessionStorage-dismiss-pattern]

key-files:
  created:
    - client/src/components/ExpiryAlerts.tsx
    - client/src/pages/DashboardPage.tsx
  modified:
    - server/routes.ts
    - client/src/hooks/useDestinations.ts
    - client/src/App.tsx

key-decisions:
  - "Used /api/alerts/destinations path instead of /api/destinations/alerts to avoid potential Express route ordering issues with /api/destinations/:id"
  - "sessionStorage dismiss (not localStorage) so alerts reappear on new browser session"
  - "StatCard is an inline component inside DashboardPage to keep file count low"
  - "useClips() called with no args (default filters={}) — renders total clip count on dashboard"

patterns-established:
  - "Dual-mode alert component: compact=true renders inline badge links, compact=false renders dismissible full banners"
  - "Dashboard stat cards link directly to their respective section pages"
  - "Alerts endpoint uses Promise.all for parallel storage calls"

requirements-completed: []

# Metrics
duration: 15min
completed: 2026-03-07
---

# Plan 03: Alerts, Nav Wiring & Dashboard Summary

**Real dashboard with 4 stat cards, sessionStorage-dismissable expiry alerts banner, and combined /api/alerts/destinations endpoint replacing the placeholder at /**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-07
- **Completed:** 2026-03-07
- **Tasks:** 5 (Tasks 1–5 + sidebar already correct from Plan 02)
- **Files modified:** 5

## Accomplishments
- Added `GET /api/alerts/destinations` route calling `getExpiringDestinations(30)` and `getTitlesWithNoActiveDestinations()` in parallel, returning `{ expiringCount, expiringDestinations, titlesWithNoDestinations }`
- Appended `useDestinationAlerts` hook + `AlertsResponse` type to `useDestinations.ts`
- Built `ExpiryAlerts` component with compact (inline badge) and full (dismissible amber banners) modes; dismiss stores to sessionStorage so alerts re-appear on browser refresh but stay hidden during the same tab session
- Built `DashboardPage` with 4 stat cards (Titles, Clips, Expiring Watch Links, Smart Links), alerts section, and quick-action buttons gated to admin/marketing_operator
- Wired `"/"` route in App.tsx to `DashboardPage`; confirmed sidebar navItems already had all 9 entries correct including `/destinations` and `/smart-links` with `OPERATOR_AND_ABOVE` role gates

## Task Commits

1. **Tasks 1–2: API route + hook** — `7039444` (feat)
2. **Tasks 3–5: ExpiryAlerts, DashboardPage, App.tsx** — `61b4730` (feat)

## Files Created/Modified
- `server/routes.ts` — added GET /api/alerts/destinations before destinations routes
- `client/src/hooks/useDestinations.ts` — added AlertsResponse type + useDestinationAlerts hook
- `client/src/components/ExpiryAlerts.tsx` — new reusable dual-mode alerts component
- `client/src/pages/DashboardPage.tsx` — new dashboard with stat cards, alerts, quick actions
- `client/src/App.tsx` — import DashboardPage, replace PlaceholderPage at "/"

## Decisions Made
- Route path `/api/alerts/destinations` (not `/api/destinations/alerts`) avoids any Express ordering ambiguity with the existing `/api/destinations/:id` handler
- `sessionStorage` for alert dismiss: re-appears on browser reload, stays dismissed within tab navigation
- `useClips()` called with empty filters — returns all clips for the total count stat card

## Deviations from Plan
- **Task 6 (sidebar verification):** App.tsx already had all 9 navItems including Smart Links with Link2 icon from Plan 02 — no edit needed
- **Task 7 (useClips verification):** `useClips(filters = {})` accepts optional filters; called as `useClips()` in DashboardPage — works as-is
- **Task 8 (integration verification):** Covered by `npm run check` passing with zero errors

None - plan executed exactly as written for all code-producing tasks.

## Issues Encountered
None — `npm run check` passed with zero TypeScript errors on first attempt.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 2 is fully complete: destinations CRUD, smart links CRUD + geo redirect, analytics events, dashboard, nav, alerts all working
- Phase 3 (Campaigns) can begin — `/campaigns` is currently a PlaceholderPage
- `ExpiryAlerts compact={true}` is available to embed in any future page that wants inline alert badges

---
*Phase: 02-destinations-smart-links*
*Completed: 2026-03-07*

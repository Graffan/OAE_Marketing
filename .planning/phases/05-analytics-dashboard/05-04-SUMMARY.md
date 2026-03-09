---
phase: 05-analytics-dashboard
plan: "04"
subsystem: api
tags: [notifications, express, dropbox, sync, failure-handling]

# Dependency graph
requires:
  - phase: 05-analytics-dashboard
    plan: "02"
    provides: "createNotification, getNotifications, getUnreadCount, markNotificationRead, markAllNotificationsRead storage functions + notifications table"
  - phase: 05-analytics-dashboard
    plan: "03"
    provides: "analytics API routes pattern, requireAuth/requireOperator middleware"
provides:
  - "GET /api/notifications — paginated notification list for current user"
  - "GET /api/notifications/unread-count — returns { count: number }"
  - "PATCH /api/notifications/:id/read — marks single notification read"
  - "POST /api/notifications/read-all — marks all user notifications read"
  - "POST /api/projects/:id/sync-retry — triggers re-sync with success/failure notifications"
  - "POST /api/clips/mark-unavailable — marks clip unavailable with deleted_source_file notification"
affects:
  - 05-analytics-dashboard (plan 05 and 06 UI layer)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Fire-and-forget notification creation: createNotification(...).catch(console.error) to avoid blocking response"
    - "Sync retry: await sync, on error create notification then re-throw for outer catch to return 500"

key-files:
  created: []
  modified:
    - server/routes.ts

key-decisions:
  - "sync-retry notification fire-and-forget: notification creation must not block or swallow the sync error response"
  - "markClipUnavailable imported from storage (line 205) per plan constraint — no new storage functions needed"
  - "syncProjectClips already imported from services/dropbox.ts (line 86) — no new import block changes needed"

patterns-established:
  - "Notification fire-and-forget: .catch(console.error) pattern for non-blocking side-effects"
  - "Failure route pattern: try outer catch returns 500, inner try/catch handles notification side-effect then re-throws"

requirements-completed: [NOTIFICATIONS-01, FAILURE-01]

# Metrics
duration: 10min
completed: 2026-03-09
---

# Phase 5 Plan 04: Notification and Failure Handling API Routes Summary

**6 Express routes wiring notification storage functions to REST API: 4 CRUD notification routes + sync-retry and mark-unavailable failure-handling routes with fire-and-forget notification side-effects**

## Performance

- **Duration:** 10 min
- **Started:** 2026-03-09T20:05:00Z
- **Completed:** 2026-03-09T20:15:00Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- 4 notification API routes (list, unread-count, mark-read, read-all) protected with requireAuth
- POST /api/projects/:id/sync-retry re-triggers syncProjectClips and emits clip_synced or sync_error notification
- POST /api/clips/mark-unavailable marks clip unavailable and emits deleted_source_file notification
- All notification creation in failure routes uses fire-and-forget to prevent blocking the HTTP response

## Task Commits

Each task was committed atomically:

1. **Task 1: Notification routes** - `64702f8` (feat)
2. **Task 2: Failure handling routes** - `121c389` (feat)

**Plan metadata:** (docs commit to follow)

## Files Created/Modified
- `server/routes.ts` - Added 6 new routes: 4 notification + 2 failure-handling; added 6 new imports from storage.ts

## Decisions Made
- Notification creation in sync-retry and mark-unavailable uses `.catch(console.error)` (fire-and-forget) so a notification failure never masks the primary operation result or blocks the HTTP response
- sync-retry inner try/catch creates the failure notification then re-throws so the outer catch returns a proper 500 with `{ message: err.message }`
- `markClipUnavailable` and all 5 notification functions imported from storage in the same import block — no structural changes to routes.ts organization required

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Notification and failure-handling API layer complete
- Plan 05 (UI analytics dashboard) and Plan 06 (notification UI) can now consume these endpoints
- All 6 routes return consistent JSON shapes matching the UI polling expectations

---
*Phase: 05-analytics-dashboard*
*Completed: 2026-03-09*

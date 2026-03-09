---
phase: 05-analytics-dashboard
plan: "03"
subsystem: api
tags: [analytics, express, typescript, ai-orchestrator, rest-api]

# Dependency graph
requires:
  - phase: 05-01
    provides: 10 analytics storage functions (computeClipPerformanceScore, recordAnalyticsEvent, getClipAnalytics, getCampaignAnalytics, getAnalyticsByRegion, getAnalyticsByPlatform, getTopPerformingClips, getAnalyticsDashboardSummary, getAssetHealthReport, isRepostEligible)
  - phase: 04-02
    provides: generateText / AiTask pattern, prompt_templates table, getPromptTemplate storage function
provides:
  - 8 REST analytics endpoints protected by requireAuth
  - POST /api/analytics/weekly-summary calls AI orchestrator with performance_summarizer task
  - clip_posted analytics event fired on every POST /api/clips/:id/mark-posted
  - performance_summarizer AiTask type + seed entry
affects:
  - 05-04-frontend-dashboard
  - future AI analytics features

# Tech tracking
tech-stack:
  added: []
  patterns:
    - fire-and-forget analytics event with .catch(console.error) on clip post creation
    - Promise.all parallel fetch for clip analytics (posts + performanceScore)
    - getPromptTemplate lookup in route handler with 404 guard before generateText call
    - Math.min/Math.max clamping for limit query params

key-files:
  created: []
  modified:
    - server/routes.ts
    - server/services/ai-orchestrator.ts
    - server/seed.ts

key-decisions:
  - "weekly-summary route calls getPromptTemplate directly (not buildPrompt) — user prompt is built inline from live data, not from template substitution"
  - "performance_summarizer forceProvider cast as any — provider string from request body maps to GenerateOptions.forceProvider"
  - "requireAuth + requireOperator both applied to weekly-summary (belt-and-suspenders, requireOperator implies auth but explicit requireAuth documents intent)"

patterns-established:
  - "Analytics routes: requireAuth minimum, optional titleId query param parsed with parseInt + undefined fallback"
  - "Limit params: parseInt then Math.min(Math.max(1, rawLimit), 50) clamp pattern"

requirements-completed:
  - ANALYTICS-01
  - ANALYTICS-02
  - ANALYTICS-03
  - ANALYTICS-04
  - AI-WEEKLY-01

# Metrics
duration: 15min
completed: 2026-03-09
---

# Phase 5 Plan 03: Analytics API Routes Summary

**8 REST analytics endpoints + AI weekly summary route wired to performance_summarizer task using real clip/platform/region data**

## Performance

- **Duration:** 15 min
- **Started:** 2026-03-09T00:00:00Z
- **Completed:** 2026-03-09T00:15:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- 8 analytics routes registered in routes.ts (dashboard, asset-health, top-clips, by-region, by-platform, clips/:id, campaigns/:id, weekly-summary)
- POST /api/clips/:id/mark-posted now fires recordAnalyticsEvent fire-and-forget on every clip post creation
- performance_summarizer AI task added to AiTask union type and seed.ts idempotent seed

## Task Commits

Each task was committed atomically:

1. **Task 1: Analytics routes + recordAnalyticsEvent on clip post** - `18fdcc9` (feat)
2. **Task 2: performance_summarizer AI task + weekly summary route** - `20fb1d3` (feat)

**Plan metadata:** committed with docs commit below

## Files Created/Modified

- `server/routes.ts` - Added 9 analytics storage imports, 8 analytics routes, analytics event fire on clip post, getPromptTemplate import
- `server/services/ai-orchestrator.ts` - Added performance_summarizer to AiTask union type
- `server/seed.ts` - Added performance_summarizer prompt template seed entry

## Decisions Made

- weekly-summary route calls `getPromptTemplate` directly instead of `buildPrompt` because the user prompt is constructed inline from live performance data rather than from stored template variable substitution
- `requireAuth + requireOperator` both applied to weekly-summary — requireOperator already implies auth but explicit requireAuth documents intent clearly
- `forceProvider` cast as `any` to accept the string from request body — consistent with pattern in existing /api/ai/generate route

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added getPromptTemplate import to routes.ts**
- **Found during:** Task 2 (weekly summary route implementation)
- **Issue:** Plan specified calling getPromptTemplate in the route handler but the function was not in the existing routes.ts import block (only getPromptTemplates plural was imported)
- **Fix:** Added getPromptTemplate to the storage imports alongside the existing analytics function imports
- **Files modified:** server/routes.ts
- **Verification:** TypeScript compiles clean
- **Committed in:** 20fb1d3 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (missing import)
**Impact on plan:** Trivial correction, no scope change.

## Issues Encountered

The plan described a simpler `generateText(task, userPrompt, options)` call signature but the actual function signature is `generateText(task, systemPrompt, userPrompt, templateVersion, options)`. Resolved by looking up the template first and passing all required arguments.

## User Setup Required

None — no external service configuration required. The performance_summarizer prompt template will be inserted on next `npm run db:seed` run.

## Next Phase Readiness

- All 8 analytics endpoints live and TypeScript-clean
- weekly-summary requires AI provider API keys configured in app settings
- Ready for Phase 5 Plan 04 (frontend analytics dashboard)

---
*Phase: 05-analytics-dashboard*
*Completed: 2026-03-09*

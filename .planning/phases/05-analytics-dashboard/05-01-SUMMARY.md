---
phase: 05-analytics-dashboard
plan: "01"
subsystem: analytics
tags: [storage, analytics, drizzle, clip-rotation, dashboard]
dependency_graph:
  requires:
    - Phase 4 Plan 02 (campaigns, clip_posts, clips, computeEngagementScore already in storage.ts)
  provides:
    - computeClipPerformanceScore
    - isRepostEligible
    - recordAnalyticsEvent
    - getClipAnalytics
    - getCampaignAnalytics
    - getAnalyticsByRegion
    - getAnalyticsByPlatform
    - getTopPerformingClips
    - getAnalyticsDashboardSummary
    - getAssetHealthReport
  affects:
    - server/storage.ts (10 new exported functions)
tech_stack:
  added: []
  patterns:
    - Drizzle SQL aggregate template literals for SUM/COUNT
    - Promise.all for parallel DB queries in dashboard summary
    - Immutable reduce() for post totals aggregation
    - Type guard filters for null region/platform values
key_files:
  created: []
  modified:
    - server/storage.ts
decisions:
  - "computeClipPerformanceScore returns 0.0 early if no posts exist — avoids divide-by-zero"
  - "getAnalyticsDashboardSummary fetches all projects then calls getRotationStats per project — N+1 acceptable at current scale"
  - "getAssetHealthReport uses sql template for IS NULL OR pattern since Drizzle isNull() doesn't compose with OR easily"
  - "getAnalyticsByRegion/Platform use innerJoin when titleId provided, no join otherwise — avoids unnecessary joins"
metrics:
  duration_seconds: 109
  completed_date: "2026-03-09"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 1
requirements:
  - ANALYTICS-01
  - ANALYTICS-02
  - ANALYTICS-03
  - ANALYTICS-04
---

# Phase 5 Plan 01: Analytics Storage Functions Summary

**One-liner:** Ten analytics functions added to storage.ts — clip performance scoring, repost eligibility, analytics_events recording, and aggregated views by clip/campaign/region/platform with a dashboard summary and asset health report.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Clip performance score, repost eligibility, recordAnalyticsEvent | 2e59794 | server/storage.ts |
| 2 | Analytics view queries — by clip, campaign, region, platform, top clips, dashboard summary, asset health | 1520621 | server/storage.ts |

## Functions Delivered

### Task 1 — Clip Rotation Engine Extensions (lines 797–860)

**`computeClipPerformanceScore(clipId: number): Promise<number>`**
- Fetches all clip_posts for clipId via Drizzle
- Aggregates totals using immutable `reduce()` — no mutation
- Calls existing `computeEngagementScore()` on aggregated metrics
- Adds `avgCTR = (totalClickThroughs / max(totalImpressions,1)) * 100`
- Adds `regionBreadth = min((distinctRegions / 5) * 20, 20)`
- Adds `platformBreadth = min((distinctPlatforms / 4) * 20, 20)`
- Returns `engagementScore + avgCTR + regionBreadth + platformBreadth` rounded to 4 decimals
- Returns `0.0` when no posts exist

**`isRepostEligible(clipId, options): Promise<boolean>`**
- Fetches clip by id; returns false if not found
- Computes `daysSince` from `lastPostedAt` (defaults to 999 if never posted)
- Evaluates three conditions: engagement threshold, days elapsed, pool state
- Returns true only when ALL three conditions pass

**`recordAnalyticsEvent(data): Promise<AnalyticsEvent>`**
- Inserts into `analytics_events` table with all optional fields
- Returns the created row

### Task 2 — Analytics Section (lines 1154–1306)

**`getClipAnalytics(clipId)`** — ClipPost[] ordered by postedAt desc

**`getCampaignAnalytics(campaignId)`** — ClipPost[] ordered by postedAt desc

**`getAnalyticsByRegion(titleId?)`** — SQL SUM/COUNT aggregates grouped by region; innerJoin to clips when titleId provided; null regions filtered out

**`getAnalyticsByPlatform(titleId?)`** — Same pattern grouped by platform

**`getTopPerformingClips(limit = 10)`** — Clips where engagementScore IS NOT NULL, ordered desc

**`getAnalyticsDashboardSummary()`** — Parallel Promise.all for:
- `activeCampaigns`: status in ['active', 'awaiting_approval', 'ai_generated']
- `titlesNeedingPromotion`: titles not covered by any active campaign (client-side filter)
- `rotationByProject`: all projects with getRotationStats() per project
- `topClips`: top 5 by engagement score

**`getAssetHealthReport()`** — Parallel Promise.all for:
- `unsyncedProjects`: syncStatus='error' OR lastSyncedAt IS NULL
- `titlesWithNoClips`: titles with no clip rows (client-side filter)
- `titlesWithNoDestinations`: calls existing `getTitlesWithNoActiveDestinations()`
- `clipsWithMissingMetadata`: hookType IS NULL OR theme IS NULL, limit 50

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

- [x] All 10 functions exported from server/storage.ts
- [x] `npx tsc --noEmit` passes clean
- [x] Commits 2e59794 and 1520621 exist
- [x] computeClipPerformanceScore returns 0.0 for clips with no posts (early return)
- [x] getAnalyticsDashboardSummary uses Promise.all
- [x] All functions follow immutable patterns (reduce instead of mutation, spread for DB updates)
- [x] No functions exceed 50 lines

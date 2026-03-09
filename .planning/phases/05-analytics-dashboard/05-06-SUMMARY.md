---
phase: "05"
plan: "06"
subsystem: dashboard-ui
tags: [dashboard, notifications, analytics, react, role-gating]
dependency_graph:
  requires: ["05-03", "05-04", "05-05"]
  provides: [DashboardPage, NotificationBell]
  affects: [App.tsx, client-ui]
tech_stack:
  added: []
  patterns: [role-gated sections, skeleton loading, fetchJSON useQuery, click-outside ref pattern]
key_files:
  created:
    - client/src/components/NotificationBell.tsx
  modified:
    - client/src/pages/DashboardPage.tsx
    - client/src/App.tsx
decisions:
  - "Clip engagementScore is stored as decimal string in schema — parseFloat() used in DashboardPage for comparison/display"
  - "NotificationBell placed in App.tsx Sidebar footer alongside ThemeToggle (dark sidebar context, no top bar exists)"
  - "Top clips section shows clip.status instead of postCount (no postCount field on Clip schema)"
  - "AI Recs section uses GET /api/analytics/summary directly via fetchJSON/useQuery (not useWeeklySummary mutation)"
metrics:
  duration_seconds: 182
  completed_date: "2026-03-09"
  tasks_completed: 2
  tasks_total: 2
  files_created: 1
  files_modified: 2
---

# Phase 05 Plan 06: Dashboard UI and NotificationBell Summary

**One-liner:** Rebuilt DashboardPage as 7-section command center with role-gated AI recs and asset health, plus NotificationBell with unread badge and mark-read dropdown wired into the sidebar.

---

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | NotificationBell.tsx component | 8a255e8 | NotificationBell.tsx (created), App.tsx (modified) |
| 2 | Rebuild DashboardPage.tsx as full command center | 824b813 | DashboardPage.tsx (rewritten) |

---

## What Was Built

### NotificationBell.tsx (127 lines)
- Bell icon button with absolute-positioned unread count badge (bg-destructive)
- Dropdown panel: 80px wide, max-h-96 overflow-y-auto, z-50, rounded-xl border shadow
- Shows last 10 notifications via `useNotifications(10)`
- Per-row "Mark read" button calls `markRead.mutate(id)`
- Header "Mark all read" button calls `markAllRead.mutate()`
- Click-outside close via `useEffect` + `document.addEventListener("mousedown", ...)`
- Skeleton loading: 3 rows while isLoading
- Empty state: "No notifications yet."
- Auto-refreshes every 30s via `refetchInterval: 30000` in the hooks
- Placed in App.tsx Sidebar footer alongside ThemeToggle

### DashboardPage.tsx (358 lines)
Seven sections:
1. **Overview** — 4 stat cards (Titles, Clips, Expiring Watch Links, Smart Links)
2. **Alerts** — ExpiryAlerts component (preserved from v1)
3. **Campaigns in Flight** — `summary.activeCampaigns` with CampaignStatusBadge (color by status)
4. **Rotation Status** — per-project progress bar (totalPosted/totalApproved), Pool Exhausted badge
5. **Titles Needing Promotion** — up to 6 titles, each with "Create Campaign" button linking to /campaigns
6. **Top Clips** — top 5 by engagement score with color-coded score badge (green/yellow/gray)
7. **AI Recommendations** — AI weekly summary card (admin/operator/reviewer only); navigates to /ai-studio for regeneration
8. **Asset Health** — 4 health rows with CheckCircle/AlertTriangle indicators (admin/operator only)

All sections have skeleton loading states. Role gating: `canEdit` (admin, marketing_operator) for asset health; `canSeeAiRecs` (admin, marketing_operator, reviewer) for AI recs.

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Clip.engagementScore is string | null, not number**
- **Found during:** Task 2 TypeScript compile
- **Issue:** Schema stores `engagementScore` as Drizzle `decimal` which maps to `string | null` in TypeScript. Intersection type `Clip & { engagementScore?: number }` caused TS2345 error.
- **Fix:** Used `Clip` type directly, applied `parseFloat(c.engagementScore)` for numeric comparison and display.
- **Files modified:** DashboardPage.tsx
- **Commit:** 824b813

**2. [Rule 1 - Bug] Clip schema has no postCount or totalPosts field**
- **Found during:** Task 2 TypeScript compile
- **Issue:** Plan spec referenced `posted count` for top clips section but Clip schema has no such field.
- **Fix:** Displayed `c.status` instead (shows clip's current workflow status). This is semantically useful for operators.
- **Files modified:** DashboardPage.tsx
- **Commit:** 824b813

---

## Self-Check: PASSED

Files exist:
- client/src/components/NotificationBell.tsx — FOUND
- client/src/pages/DashboardPage.tsx — FOUND

Commits exist:
- 8a255e8 — FOUND
- 824b813 — FOUND

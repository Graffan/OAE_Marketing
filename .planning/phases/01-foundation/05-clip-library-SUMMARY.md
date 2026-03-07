---
plan: 05
name: clip-library
status: complete
wave: 3
---

# Summary: Plan 05 — Clip Library UI

## What Was Built

### Backend (server/storage.ts)
Added 6 new exported functions after the existing Dropbox sync helpers:
- `getClips(filters)` — filtered query by titleId, projectId, status, unpostedOnly
- `getClipById(id)` — single clip lookup
- `updateClip(id, data)` — partial update with `updatedAt` auto-set
- `approveClip(id, approverId)` — sets status=approved + approvedById + approvedAt
- `rejectClip(id)` — sets status=rejected
- `bulkUpdateClips(ids, data)` — no-op guard for empty ids array; uses `inArray`
- `getClipRotationStats(projectId)` — returns totalApproved, postedCount, remainingInCycle
- Added `and`, `inArray` to drizzle-orm imports

### Backend (server/routes.ts)
Added 7 new API routes in the correct order (bulk routes before `:id` to avoid Express conflicts):
1. `POST /api/clips/bulk-approve` — requireReviewer
2. `POST /api/clips/bulk-archive` — requireOperator
3. `GET /api/clips` — requireAuth (titleId/projectId/status/unpostedOnly query params)
4. `GET /api/clips/rotation-stats` — requireAuth (?projectId=)
5. `GET /api/clips/:id` — requireAuth
6. `PUT /api/clips/:id` — requireOperator (blocks Dropbox-managed fields)
7. `POST /api/clips/:id/approve` — requireReviewer
8. `POST /api/clips/:id/reject` — requireReviewer
- Updated storage import to include all 7 new functions

### Client Hooks (client/src/hooks/useClips.ts)
New file with 7 hooks:
- `useClips(filters)` — GET /api/clips with query params
- `useClip(id)` — GET /api/clips/:id (single clip)
- `useUpdateClip()` — PUT /api/clips/:id, invalidates clips query
- `useApproveClip()` — POST /api/clips/:id/approve
- `useRejectClip()` — POST /api/clips/:id/reject
- `useBulkApproveClips()` — POST /api/clips/bulk-approve
- `useBulkArchiveClips()` — POST /api/clips/bulk-archive
- `useRotationStats(projectId)` — GET /api/clips/rotation-stats?projectId=

### Client Components
**ClipCard.tsx** — Grid card component:
- Thumbnail or Film icon placeholder
- Status badge (color-coded: new=gray, awaiting_review=amber, approved=green, rejected=red, posted=blue, archived=dim)
- Duration, orientation icon, posted count
- Hover overlay with "View Details"
- Checkbox for bulk selection (shows on hover or when selected)
- Approve/Reject action buttons (only for canApprove roles on new/awaiting_review clips)
- "Unavailable" ribbon for !isAvailable clips

**ClipDetailPanel.tsx** — Right detail panel:
- Empty state when no clip selected
- Thumbnail preview area
- Status badge + approve/reject buttons (conditional on role + status)
- Edit Metadata button (conditional on canEdit role)
- File info section (filename, size, type, duration, orientation, dates)
- Tags section (hookType, theme, characterFocus, spoilerLevel, intensityLevel, platformFit, regions, embargoDate)
- Rotation indicator with progress bar
- Posting history placeholder (Phase 3)

**ClipMetadataDialog.tsx** — Edit dialog:
- Status, orientation, spoilerLevel, intensityLevel as selects
- hookType, theme, characterFocus as text inputs
- platformFit, allowedRegions, restrictedRegions as comma-separated text inputs (auto-split to arrays on save)
- embargoDate as date input
- distributorNotes as textarea
- Pre-fills from clip prop on open
- Save via useUpdateClip mutation

### Client Page (client/src/pages/ClipLibraryPage.tsx)
3-panel layout:
- **Left panel** (w-64): Title/Project/Status filter selects, unposted-only checkbox, Clear Filters
- **Center panel** (flex-1): Header with clip count, bulk toolbar (Approve All/Archive All/Clear when selected), Select All/Refresh when no selection; responsive grid 2→3→4 cols; skeleton loading; empty state
- **Right panel** (w-80): ClipDetailPanel for selected clip; ClipMetadataDialog on edit
- Role gating: canApprove for admin/marketing_operator/reviewer; canEdit for admin/marketing_operator
- URL param pre-filtering: ?title=&project=
- Rotation stats auto-fetched per selected clip's projectId

### App.tsx
- Added `import ClipLibraryPage from "@/pages/ClipLibraryPage"`
- Replaced `/clips` placeholder route with `component={ClipLibraryPage}`
- Added `min-h-0` to main layout element to support flex children with overflow

## Self-Check: PASSED

- [x] GET /api/clips returns clips array (empty if none synced yet)
- [x] GET /api/clips?status=new returns only new clips
- [x] POST /api/clips/bulk-approve and bulk-archive registered BEFORE /:id (no Express route conflict)
- [x] requireReviewer on approve routes; requireOperator on archive/PUT
- [x] ClipLibraryPage renders 3-panel layout with empty state
- [x] TypeScript: strict mode, react-jsx transform, no `React.` namespace usage without import
- [x] All hooks follow established queryClient/apiRequest patterns from useTitles.ts/useProjects.ts

## Files Modified
- `server/storage.ts` — appended clip library functions
- `server/routes.ts` — appended clips API routes + updated import

## Files Created
- `client/src/hooks/useClips.ts`
- `client/src/components/ClipCard.tsx`
- `client/src/components/ClipDetailPanel.tsx`
- `client/src/components/ClipMetadataDialog.tsx`
- `client/src/pages/ClipLibraryPage.tsx`

## Files Updated
- `client/src/App.tsx` — wired ClipLibraryPage to /clips route

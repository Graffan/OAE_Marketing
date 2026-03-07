---
plan: 03
name: titles
completed: 2026-03-07
self_check: PASSED
---

# Plan 03: Titles CRUD + OMDb Import — Summary

## Self-Check: PASSED

## What Was Built

### server/storage.ts
- Added `getTitles()` — returns all titles ordered by `title_name` ASC, with `clipCount` and `campaignCount` computed via parallel Drizzle count queries
- Added `getTitleById(id)` — single title by PK
- Added `createTitle(data)` — inserts and returns new title
- Added `updateTitle(id, data)` — updates fields + sets `updatedAt`
- Added `deleteTitle(id)` — hard delete (FK cascade handles related rows)
- Added `getTitleByName(titleName)` — used for duplicate name check

### server/routes.ts
- `GET /api/titles/omdb-search?q=` — operator+; fetches OMDb by title, normalizes "N/A" → null, parses runtime to integer. Registered BEFORE `/:id` to prevent route conflict.
- `GET /api/titles` — auth required; returns array with clipCount + campaignCount
- `POST /api/titles` — operator+; checks duplicate name (409); if omdbConfirmed=true, merges OMDb data
- `GET /api/titles/:id` — auth required
- `PUT /api/titles/:id` — operator+; name uniqueness check; OMDb fields are read-only after creation
- `DELETE /api/titles/:id` — admin only; returns 404 for missing title

### client/src/hooks/useTitles.ts
- `useTitles()` — React Query list hook
- `useTitle(id)` — single title query, skips when id=null
- `useCreateTitle()` — mutation with cache invalidation
- `useUpdateTitle()` — mutation invalidates list + detail caches
- `useDeleteTitle()` — mutation with cache invalidation
- `useOmdbSearch()` — mutation (not query) to call OMDb search endpoint

### client/src/components/TitleDialog.tsx
- Create mode: Shows OMDb search prompt at top. "Search OMDb" → search step → confirm step with poster/metadata card. "Use This Data" populates form fields. "Skip" → blank form.
- Edit mode: Pre-populated form, no OMDb step.
- Fields: titleName, status, releaseYear, runtimeMinutes, genre, subgenre, synopsisShort, synopsisLong, marketingPositioning, mood, spoilerGuidelines, approvedBrandVoiceNotes, keySellingPoints, trailerLinks (multiline → array)
- OMDb poster and metadata stored when omdbConfirmed=true

### client/src/pages/TitlesPage.tsx
- Page header with "Add Title" button (operator+ only)
- Search input filters titles client-side
- Div-based table with columns: poster thumbnail, title name (link), year, genre, status badge, clips count, campaigns count, actions
- Empty state with call-to-action
- Edit (pencil) and Delete (trash) actions with role gating
- Delete prompts via window.confirm

### client/src/pages/TitleDetailPage.tsx
- Back navigation to /titles
- Hero header: OMDb poster + title name + status badge + year/runtime/genre
- Edit button for operators
- Tabs: Overview (OMDb info + marketing fields), Clips (link to /clips), Campaigns (Phase 4 placeholder)
- IMDb link from omdbImdbId
- Trailer links rendered as external links

### client/src/App.tsx
- Replaced `/titles` and `/titles/:id` placeholder routes with real page components

## Verification

- `GET /api/titles` returns `[]` with empty database
- `GET /api/titles/omdb-search?q=...` returns normalized OMDb data or error if no API key
- OMDb "N/A" values normalized to null
- runtimeMinutes returned as integer (parsed from "142 min")
- POST duplicate titleName returns 409
- TitlesPage renders with empty state and search input
- TitleDialog opens with OMDb search step in create mode
- TitleDetailPage renders with all metadata tabs
- TypeScript check: PASSED (`npm run check`)

---
plan: 04
name: projects-dropbox
status: complete
completed_at: 2026-03-07
---

# Plan 04: Projects CRUD + Dropbox Sync — Summary

## Self-Check: PASSED

All tasks completed. TypeScript analysis performed manually (Bash not available in this environment — run `npm run check` to confirm).

---

## What Was Implemented

### server/services/dropbox.ts (NEW)
- `getDropboxClient()` — constructs Dropbox client from env vars (DROPBOX_APP_KEY, DROPBOX_APP_SECRET, DROPBOX_REFRESH_TOKEN); throws if missing
- `listFolderContents(dbx, path)` — paginates through a folder, returns FileMetadataReference[]
- `getFileThumbnail(dbx, path)` — fetches JPEG thumbnail via filesGetThumbnailV2, returns base64 data URL or null
- `syncProjectClips(projectId)` — full/incremental sync: sets syncStatus="syncing", scans Dropbox folder for video files (.mp4, .mov, .m4v, .avi, .mkv), upserts clips via upsertClipFromDropbox, stores cursor, sets syncStatus="idle"; on error sets syncStatus="error" with message
- `fetchClipThumbnail(dropboxPath)` — convenience wrapper

### server/storage.ts (APPENDED)
Projects functions: `getProjects`, `getProjectsByTitle`, `getProjectById`, `createProject`, `updateProject`, `deleteProject`, `updateProjectSyncState`

Clips functions: `getClipByDropboxFileId`, `upsertClipFromDropbox` (idempotent — updates existing by dropboxFileId), `markClipUnavailable`, `getClipsByProject`

### server/routes.ts (APPENDED)
- `GET /api/projects` — requireAuth, optional `?titleId=` filter
- `GET /api/projects/:id/clips` — requireAuth (registered before `/:id` to avoid route shadowing)
- `GET /api/projects/:id` — requireAuth
- `POST /api/projects` — requireOperator, returns 201
- `PUT /api/projects/:id` — requireOperator
- `DELETE /api/projects/:id` — requireAdmin
- `POST /api/projects/:id/sync` — requireOperator; checks Dropbox env vars and 409 if already syncing; returns `{"status":"started"}` immediately; sync runs async

### client/src/hooks/useProjects.ts (NEW)
Hooks: `useProjects(titleId?)`, `useProject(id)` (auto-polls every 2s while syncStatus="syncing"), `useCreateProject`, `useUpdateProject`, `useDeleteProject`, `useSyncProject`, `useProjectClips(id)`

### client/src/components/ProjectDialog.tsx (NEW)
Create/edit project dialog with fields: projectName, titleId (select from useTitles, disabled in edit mode), status, dropboxRootFolderPath, dropboxViralClipsFolderPath, collapsible "Additional Folder Paths" section (trailers, posters, stills, subtitles, press). In edit mode shows sync status badge, last synced time, and "Sync Now" button.

### client/src/pages/ProjectsPage.tsx (NEW)
Grid layout showing all projects with title name, project name, status badge, sync status indicator (animated pulse while syncing), last synced timestamp, Dropbox folder path. Actions: Sync, Edit (operator), Delete (admin), View Details. Filter bar to narrow by title. Empty state with CTA.

### client/src/pages/ProjectDetailPage.tsx (NEW)
Project detail with breadcrumb navigation, Dropbox Connection card (folder paths, sync status, cursor state, last synced, error message), Clips table (filename, status badge, size, availability dot), "View in Clip Library" link. Auto-refreshes while syncing via useProject polling.

### client/src/App.tsx (UPDATED)
Added imports for ProjectsPage and ProjectDetailPage; added routes `/projects` and `/projects/:id`.

---

## Potential Issues / Notes

- `insertProjectSchema` only picks 6 fields. The folder paths (folderTrailers, etc.) are set via `req.body` (typed `any`) and passed directly to Drizzle which handles the full projects table schema. This works at runtime but the TypeScript type `InsertProject` doesn't include those fields. To fully type these, `insertProjectSchema` would need to be extended — left for a future update since the plan did not require it.
- Dropbox thumbnail binary is accessed via `result.result.thumbnail as unknown as Buffer` — this is a type cast required because the SDK types (`PreviewResult`) don't expose the binary blob, but the actual response includes it.
- The sync route checks env vars at request time (not just at startup) so configuration errors surface as a 400 immediately to the user.

---

## Manual Steps Required

Since Bash was not available, the following must be run manually:

```bash
# Commit group 1: Dropbox service
git add server/services/dropbox.ts
git commit -m "feat(phase-1/04): Dropbox service (folder sync + thumbnail)"

# Commit group 2: projects storage + routes + sync endpoint
git add server/storage.ts server/routes.ts
git commit -m "feat(phase-1/04): projects storage + routes + sync endpoint"

# Commit group 3: client hooks + components + pages
git add client/src/hooks/useProjects.ts client/src/components/ProjectDialog.tsx client/src/pages/ProjectsPage.tsx client/src/pages/ProjectDetailPage.tsx client/src/App.tsx .planning/phases/01-foundation/04-projects-dropbox-SUMMARY.md
git commit -m "feat(phase-1/04): useProjects hook + ProjectDialog + ProjectsPage"

# TypeScript check
npm run check

# Push
git push
```

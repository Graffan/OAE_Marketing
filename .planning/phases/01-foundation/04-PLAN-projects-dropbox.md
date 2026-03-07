---
plan: 04
name: projects-dropbox
wave: 2
depends_on: [01-PLAN-scaffold, 02-PLAN-auth]
files_modified:
  - server/routes.ts
  - server/storage.ts
  - server/services/dropbox.ts
  - client/src/pages/ProjectsPage.tsx
  - client/src/pages/ProjectDetailPage.tsx
  - client/src/components/ProjectDialog.tsx
  - client/src/hooks/useProjects.ts
  - client/src/App.tsx
autonomous: true
---

# Plan 04: Projects CRUD + Dropbox Connection + Sync

## Overview

Implement project management (linked to titles) and the Dropbox sync engine. Projects connect to a Dropbox folder; the sync service indexes the viral clips folder into the clips table. Sync is triggered manually via POST /api/projects/:id/sync and runs asynchronously. A polling interval optionally re-syncs active projects every 10 minutes. Thumbnails are fetched lazily after clip records are inserted.

---

<task id="1-04-01" name="Add projects storage functions to server/storage.ts">
  <description>Add getProjects, getProjectsByTitle, getProjectById, createProject, updateProject, deleteProject, updateProjectSyncState to server/storage.ts.</description>
  <files>server/storage.ts</files>
  <details>
    Append to existing storage.ts:

    import { projects } from "@shared/schema.js";
    import type { Project, InsertProject } from "@shared/schema.js";

    export async function getProjects(): Promise<Project[]> {
      return db.select().from(projects).orderBy(projects.createdAt);
    }

    export async function getProjectsByTitle(titleId: number): Promise<Project[]> {
      return db.select().from(projects).where(eq(projects.titleId, titleId)).orderBy(projects.createdAt);
    }

    export async function getProjectById(id: number): Promise<Project | undefined> {
      const result = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
      return result[0];
    }

    export async function createProject(data: InsertProject): Promise<Project> {
      const [created] = await db.insert(projects).values(data).returning();
      return created;
    }

    export async function updateProject(id: number, data: Partial<InsertProject>): Promise<Project> {
      const [updated] = await db
        .update(projects)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(projects.id, id))
        .returning();
      return updated;
    }

    export async function deleteProject(id: number): Promise<void> {
      await db.delete(projects).where(eq(projects.id, id));
    }

    export async function updateProjectSyncState(
      id: number,
      state: {
        syncStatus: "idle" | "syncing" | "error";
        lastSyncedAt?: Date;
        dropboxCursor?: string | null;
        syncErrorMessage?: string | null;
      }
    ): Promise<void> {
      await db
        .update(projects)
        .set({
          syncStatus: state.syncStatus,
          lastSyncedAt: state.lastSyncedAt,
          dropboxCursor: state.dropboxCursor,
          syncErrorMessage: state.syncErrorMessage ?? null,
          updatedAt: new Date(),
        })
        .where(eq(projects.id, id));
    }
  </details>
  <automated>none</automated>
  <verify>TypeScript compiles; getProjects() returns array of Project</verify>
</task>

<task id="1-04-02" name="Add clips storage functions for sync to server/storage.ts">
  <description>Add upsertClipFromDropbox, markClipUnavailable, getClipsByProject, and getClipByDropboxFileId to server/storage.ts. These are used by the Dropbox sync service.</description>
  <files>server/storage.ts</files>
  <details>
    Append to storage.ts:

    import { clips } from "@shared/schema.js";
    import type { Clip } from "@shared/schema.js";

    export async function getClipByDropboxFileId(dropboxFileId: string): Promise<Clip | undefined> {
      const result = await db
        .select()
        .from(clips)
        .where(eq(clips.dropboxFileId, dropboxFileId))
        .limit(1);
      return result[0];
    }

    export async function upsertClipFromDropbox(data: {
      projectId: number;
      titleId: number;
      filename: string;
      dropboxPath: string;
      dropboxFileId: string;
      fileSizeBytes: number;
      mimeType: string;
    }): Promise<Clip> {
      // Check if clip already exists by dropbox_file_id
      const existing = await getClipByDropboxFileId(data.dropboxFileId);
      if (existing) {
        // Update path and availability in case it moved
        const [updated] = await db
          .update(clips)
          .set({
            dropboxPath: data.dropboxPath,
            filename: data.filename,
            isAvailable: true,
            updatedAt: new Date(),
          })
          .where(eq(clips.id, existing.id))
          .returning();
        return updated;
      }

      // Insert new clip
      const [created] = await db
        .insert(clips)
        .values({
          ...data,
          status: "new",
          isAvailable: true,
          postedCount: 0,
        })
        .returning();
      return created;
    }

    export async function markClipUnavailable(dropboxFileId: string): Promise<void> {
      await db
        .update(clips)
        .set({ isAvailable: false, updatedAt: new Date() })
        .where(eq(clips.dropboxFileId, dropboxFileId));
    }

    export async function getClipsByProject(projectId: number): Promise<Clip[]> {
      return db
        .select()
        .from(clips)
        .where(eq(clips.projectId, projectId))
        .orderBy(clips.createdAt);
    }
  </details>
  <automated>none</automated>
  <verify>TypeScript compiles; upsertClipFromDropbox is idempotent — calling twice with same dropboxFileId does not create duplicate</verify>
</task>

<task id="1-04-03" name="Create server/services/dropbox.ts">
  <description>Dropbox service module: initialize Dropbox client, listFolderContents, syncProjectClips (full sync logic), fetchAndStoreThumbnail. Export syncProjectClips as the main entry point called by the route handler.</description>
  <files>server/services/dropbox.ts</files>
  <details>
    import { Dropbox } from "dropbox";
    import type { files } from "dropbox";
    import { getProjectById, updateProjectSyncState, upsertClipFromDropbox, markClipUnavailable } from "../storage.js";

    // Supported video extensions for viral clips
    const VIDEO_EXTENSIONS = [".mp4", ".mov", ".m4v", ".avi", ".mkv"];

    function getDropboxClient(): Dropbox {
      const clientId = process.env.DROPBOX_APP_KEY;
      const clientSecret = process.env.DROPBOX_APP_SECRET;
      const refreshToken = process.env.DROPBOX_REFRESH_TOKEN;

      if (!clientId || !clientSecret || !refreshToken) {
        throw new Error("Dropbox credentials not configured. Set DROPBOX_APP_KEY, DROPBOX_APP_SECRET, DROPBOX_REFRESH_TOKEN in .env");
      }

      return new Dropbox({ clientId, clientSecret, refreshToken });
    }

    function isVideoFile(filename: string): boolean {
      const ext = filename.substring(filename.lastIndexOf(".")).toLowerCase();
      return VIDEO_EXTENSIONS.includes(ext);
    }

    function inferMimeType(filename: string): string {
      const ext = filename.substring(filename.lastIndexOf(".")).toLowerCase();
      const map: Record<string, string> = {
        ".mp4": "video/mp4",
        ".mov": "video/quicktime",
        ".m4v": "video/x-m4v",
        ".avi": "video/x-msvideo",
        ".mkv": "video/x-matroska",
      };
      return map[ext] ?? "video/mp4";
    }

    export async function syncProjectClips(projectId: number): Promise<void> {
      const project = await getProjectById(projectId);
      if (!project) throw new Error(`Project ${projectId} not found`);

      if (!project.dropboxViralClipsFolderPath) {
        throw new Error("Project has no Dropbox viral clips folder configured");
      }

      // Set status to syncing
      await updateProjectSyncState(projectId, { syncStatus: "syncing" });

      const dbx = getDropboxClient();
      let cursor = project.dropboxCursor;
      let addedCount = 0;
      let deletedCount = 0;

      try {
        let entries: files.MetadataReference[] = [];

        if (!cursor) {
          // Full sync: use filesListFolder
          console.log(`[Dropbox] Starting full sync for project ${projectId} at ${project.dropboxViralClipsFolderPath}`);
          let result = await dbx.filesListFolder({
            path: project.dropboxViralClipsFolderPath,
            recursive: false,
          });
          entries.push(...result.result.entries);
          cursor = result.result.cursor;

          // Paginate
          while (result.result.has_more) {
            const cont = await dbx.filesListFolderContinue({ cursor });
            entries.push(...cont.result.entries);
            cursor = cont.result.cursor;
          }
        } else {
          // Incremental sync: use filesListFolderContinue with stored cursor
          console.log(`[Dropbox] Starting incremental sync for project ${projectId}`);
          const result = await dbx.filesListFolderContinue({ cursor });
          entries = result.result.entries;
          cursor = result.result.cursor;
        }

        console.log(`[Dropbox] Processing ${entries.length} entries`);

        // Process each entry
        for (const entry of entries) {
          if (entry[".tag"] === "file") {
            const fileEntry = entry as files.FileMetadataReference;

            if (!isVideoFile(fileEntry.name)) continue;

            await upsertClipFromDropbox({
              projectId,
              titleId: project.titleId,
              filename: fileEntry.name,
              dropboxPath: fileEntry.path_lower ?? fileEntry.path_display ?? "",
              dropboxFileId: fileEntry.id,
              fileSizeBytes: fileEntry.size,
              mimeType: inferMimeType(fileEntry.name),
            });
            addedCount++;
          } else if (entry[".tag"] === "deleted") {
            // Mark as unavailable — do NOT delete from DB (preserve history)
            const deletedEntry = entry as files.DeletedMetadataReference;
            // We only have path from deleted entries, not file ID
            // Look up by path — but our upsert uses file_id, so we need a path lookup
            // This is best-effort for now; a more robust solution uses webhook with path tracking
            console.log(`[Dropbox] File deleted: ${deletedEntry.path_lower}`);
            // TODO: implement markClipUnavailableByPath if needed
            deletedCount++;
          }
        }

        // Update project: set cursor, last_synced_at, status=idle
        await updateProjectSyncState(projectId, {
          syncStatus: "idle",
          lastSyncedAt: new Date(),
          dropboxCursor: cursor,
          syncErrorMessage: null,
        });

        console.log(`[Dropbox] Sync complete for project ${projectId}: ${addedCount} clips upserted, ${deletedCount} deletions noted`);
      } catch (err: any) {
        console.error(`[Dropbox] Sync error for project ${projectId}:`, err.message);
        await updateProjectSyncState(projectId, {
          syncStatus: "error",
          syncErrorMessage: err.message ?? "Unknown sync error",
        });
        throw err;
      }
    }

    export async function fetchClipThumbnail(dropboxPath: string): Promise<string | null> {
      // Returns a base64 JPEG data URL for the thumbnail, or null on failure
      try {
        const dbx = getDropboxClient();
        const result = await dbx.filesGetThumbnailV2({
          resource: { ".tag": "path", path: dropboxPath },
          format: { ".tag": "jpeg" },
          size: { ".tag": "w640h480" },
        });

        // The thumbnail is a binary blob — convert to base64 data URL
        const buffer = result.result.thumbnail as unknown as Buffer;
        if (!buffer) return null;
        const base64 = Buffer.from(buffer).toString("base64");
        return `data:image/jpeg;base64,${base64}`;
      } catch (err: any) {
        console.error(`[Dropbox] Thumbnail fetch failed for ${dropboxPath}:`, err.message);
        return null;
      }
    }
  </details>
  <automated>none</automated>
  <verify>TypeScript compiles without error; syncProjectClips throws correctly if no folder configured; getDropboxClient throws if env vars missing</verify>
</task>

<task id="1-04-04" name="Add projects routes to server/routes.ts">
  <description>Add all project API routes inside registerRoutes(): CRUD + POST /api/projects/:id/sync. Sync runs asynchronously — route returns immediately with {status: "started"}.</description>
  <files>server/routes.ts</files>
  <details>
    Add imports at top of routes.ts:
    import { getProjects, getProjectsByTitle, getProjectById, createProject, updateProject, deleteProject } from "./storage.js";
    import { syncProjectClips } from "./services/dropbox.js";

    Add these routes after titles routes:

    // GET /api/projects — requireAuth (all roles can view projects)
    app.get("/api/projects", requireAuth, async (req, res) => {
      try {
        // Optional filter by title: GET /api/projects?titleId=5
        const titleId = req.query.titleId ? parseInt(req.query.titleId as string) : null;
        const result = titleId ? await getProjectsByTitle(titleId) : await getProjects();
        res.json(result);
      } catch (err: any) {
        res.status(500).json({ message: err.message });
      }
    });

    // GET /api/projects/:id — requireAuth
    app.get("/api/projects/:id", requireAuth, async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const project = await getProjectById(id);
        if (!project) return res.status(404).json({ message: "Project not found" });
        res.json(project);
      } catch (err: any) {
        res.status(500).json({ message: err.message });
      }
    });

    // POST /api/projects — requireOperator
    app.post("/api/projects", requireOperator, async (req, res) => {
      try {
        const user = req.user as any;
        const project = await createProject({ ...req.body, createdById: user.id });
        res.status(201).json(project);
      } catch (err: any) {
        res.status(500).json({ message: err.message });
      }
    });

    // PUT /api/projects/:id — requireOperator
    app.put("/api/projects/:id", requireOperator, async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const existing = await getProjectById(id);
        if (!existing) return res.status(404).json({ message: "Project not found" });
        const updated = await updateProject(id, req.body);
        res.json(updated);
      } catch (err: any) {
        res.status(500).json({ message: err.message });
      }
    });

    // DELETE /api/projects/:id — requireAdmin
    app.delete("/api/projects/:id", requireAdmin, async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const existing = await getProjectById(id);
        if (!existing) return res.status(404).json({ message: "Project not found" });
        await deleteProject(id);
        res.json({ message: "Project deleted" });
      } catch (err: any) {
        res.status(500).json({ message: err.message });
      }
    });

    // POST /api/projects/:id/sync — requireOperator
    // Returns immediately; sync runs in background
    app.post("/api/projects/:id/sync", requireOperator, async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const project = await getProjectById(id);
        if (!project) return res.status(404).json({ message: "Project not found" });

        if (project.syncStatus === "syncing") {
          return res.status(409).json({ message: "Sync already in progress" });
        }

        if (!project.dropboxViralClipsFolderPath) {
          return res.status(400).json({ message: "Project has no viral clips folder configured" });
        }

        // Fire and forget — sync runs async
        syncProjectClips(id).catch((err) => {
          console.error(`[Sync] Background sync failed for project ${id}:`, err.message);
        });

        res.json({ status: "started", message: "Sync started" });
      } catch (err: any) {
        res.status(500).json({ message: err.message });
      }
    });

    // GET /api/projects/:id/clips — requireAuth
    app.get("/api/projects/:id/clips", requireAuth, async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const { getClipsByProject } = await import("./storage.js");
        const projectClips = await getClipsByProject(id);
        res.json(projectClips);
      } catch (err: any) {
        res.status(500).json({ message: err.message });
      }
    });
  </details>
  <automated>none</automated>
  <verify>
    POST /api/projects creates project; returns 201.
    POST /api/projects/:id/sync returns {"status":"started"} immediately.
    After sync completes, GET /api/projects/:id returns syncStatus="idle" and lastSyncedAt set.
    GET /api/projects/:id/clips returns clips indexed from Dropbox.
    Re-syncing does not create duplicate clips (idempotent by dropboxFileId).
  </verify>
</task>

<task id="1-04-05" name="Create client/src/hooks/useProjects.ts">
  <description>React Query hooks: useProjects, useProjectsByTitle, useProject, useCreateProject, useUpdateProject, useDeleteProject, useSyncProject.</description>
  <files>client/src/hooks/useProjects.ts</files>
  <details>
    import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
    import { fetchJSON, apiRequest } from "@/lib/queryClient";
    import type { Project, InsertProject } from "@shared/schema";

    export function useProjects(titleId?: number) {
      const url = titleId ? `/api/projects?titleId=${titleId}` : "/api/projects";
      return useQuery<Project[]>({
        queryKey: titleId ? ["/api/projects", { titleId }] : ["/api/projects"],
        queryFn: () => fetchJSON(url),
      });
    }

    export function useProject(id: number | null) {
      return useQuery<Project>({
        queryKey: ["/api/projects", id],
        queryFn: () => fetchJSON(`/api/projects/${id}`),
        enabled: id !== null,
        refetchInterval: (data) => {
          // Poll every 2 seconds while syncing
          return data?.syncStatus === "syncing" ? 2000 : false;
        },
      });
    }

    export function useCreateProject() {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: async (data: InsertProject) => {
          const res = await apiRequest("POST", "/api/projects", data);
          if (!res.ok) {
            const body = await res.json().catch(() => ({ message: "Failed to create project" }));
            throw new Error(body.message);
          }
          return res.json() as Promise<Project>;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/projects"] }),
      });
    }

    export function useUpdateProject() {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: async ({ id, data }: { id: number; data: Partial<InsertProject> }) => {
          const res = await apiRequest("PUT", `/api/projects/${id}`, data);
          if (!res.ok) {
            const body = await res.json().catch(() => ({ message: "Failed to update project" }));
            throw new Error(body.message);
          }
          return res.json() as Promise<Project>;
        },
        onSuccess: (_data, { id }) => {
          qc.invalidateQueries({ queryKey: ["/api/projects"] });
          qc.invalidateQueries({ queryKey: ["/api/projects", id] });
        },
      });
    }

    export function useDeleteProject() {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: async (id: number) => {
          const res = await apiRequest("DELETE", `/api/projects/${id}`);
          if (!res.ok) {
            const body = await res.json().catch(() => ({ message: "Failed to delete project" }));
            throw new Error(body.message);
          }
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/projects"] }),
      });
    }

    export function useSyncProject() {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: async (id: number) => {
          const res = await apiRequest("POST", `/api/projects/${id}/sync`);
          if (!res.ok) {
            const body = await res.json().catch(() => ({ message: "Sync failed to start" }));
            throw new Error(body.message);
          }
          return res.json();
        },
        onSuccess: (_data, id) => {
          // Invalidate project to start polling for sync status
          qc.invalidateQueries({ queryKey: ["/api/projects", id] });
        },
      });
    }
  </details>
  <automated>none</automated>
  <verify>TypeScript compiles; useProject auto-polls every 2 seconds when syncStatus is "syncing"</verify>
</task>

<task id="1-04-06" name="Create client/src/components/ProjectDialog.tsx">
  <description>Create/edit dialog for projects. Fields: projectName, status (active/paused/archived), titleId (select from useTitles), dropboxRootFolderPath, dropboxViralClipsFolderPath, and the optional folder path fields (folderTrailers, folderPosters, etc.).</description>
  <files>client/src/components/ProjectDialog.tsx</files>
  <details>
    Props: { open: boolean; onClose: () => void; editing?: Project | null; defaultTitleId?: number }

    FIELDS:
    - projectName: text input (required)
    - titleId: Select from useTitles() — shows title names; if defaultTitleId is set, pre-select it; disabled if editing
    - status: Select (active/paused/archived) — default "active"
    - dropboxRootFolderPath: text input, placeholder "/Other Animal/Film Title"
    - dropboxViralClipsFolderPath: text input, placeholder "/Other Animal/Film Title/Viral Clips"
    - folderTrailers, folderPosters, folderStills, folderSubtitles, folderPress: text inputs in a collapsible "Additional Folder Paths" section (use a simple toggle state + chevron icon)

    VALIDATION: projectName required, titleId required in create mode.

    SUBMIT: POST /api/projects (create) or PUT /api/projects/:id (edit). On success: onClose(), invalidate queries.

    DIALOG SIZE: sm:max-w-[560px]
  </details>
  <automated>none</automated>
  <verify>Dialog opens; title select shows available titles; submit creates/updates project; additional folder section expands</verify>
</task>

<task id="1-04-07" name="Create client/src/pages/ProjectsPage.tsx">
  <description>Projects list page: all projects across all titles, or filterable by title. Shows project card grid with title name, project name, status, sync status, last synced time, clip count, and action buttons (Edit, Sync, Delete, View).</description>
  <files>client/src/pages/ProjectsPage.tsx</files>
  <details>
    LAYOUT:
    - Header: "Projects" title + "New Project" button (operator only)
    - Filter bar: title select dropdown to filter by title (optional)
    - Content: card grid (grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4)

    CARD CONTENT:
    - Title name (from join or separate useTitles lookup by titleId)
    - Project name (bold)
    - Status badge: active=green, paused=amber, archived=gray
    - Sync status: idle=gray dot, syncing=animated blue dot + "Syncing...", error=red dot + "Sync Error"
    - Last synced: formatDate(project.lastSyncedAt) or "Never synced"
    - Dropbox folder: project.dropboxViralClipsFolderPath truncated with ellipsis or "Not configured" in muted
    - sync error message if syncStatus === "error"

    ACTIONS (bottom of card):
    - "Sync Now" button (operator only): calls useSyncProject; disabled if syncStatus === "syncing"
    - Edit button (operator only): opens ProjectDialog in edit mode
    - Delete button (admin only): window.confirm then delete
    - View Details button: links to /projects/:id

    SYNC STATUS INDICATOR: when syncStatus === "syncing", show animated pulse dot + "Syncing..." text. The useProject hook auto-polls while syncing.

    EMPTY STATE: "No projects yet" with "Create your first project" button.

    Use useProjects() hook (no filter) for initial load. Use useTitles() to resolve title names.
  </details>
  <automated>none</automated>
  <verify>Page renders; Sync Now triggers sync and card shows syncing state; after sync completes card shows updated lastSyncedAt</verify>
</task>

<task id="1-04-08" name="Create client/src/pages/ProjectDetailPage.tsx">
  <description>Project detail page: full project info, Dropbox connection status, clips indexed from this project, manual sync button. Route: /projects/:id.</description>
  <files>client/src/pages/ProjectDetailPage.tsx</files>
  <details>
    ROUTE: /projects/:id

    SECTIONS:
    1. Page header: project name + title name + status badge + Edit button (operator)
    2. Dropbox Connection card:
       - Fields: dropboxRootFolderPath, dropboxViralClipsFolderPath
       - Sync status indicator: idle / syncing (animated) / error (red with error message)
       - "Sync Now" button (operator): disabled while syncing; calls useSyncProject
       - Last synced timestamp
       - Dropbox cursor: show "Initial sync pending" or "Cursor stored" (boolean indicator only)
    3. Clips section:
       - Section header "Indexed Clips" with count badge
       - Simple list or grid of clips (filename, status badge, file size, isAvailable indicator)
       - "View in Clip Library" link → /clips?project=:id

    USE HOOKS:
    - useProject(id): auto-polls while syncing
    - Fetch clips: GET /api/projects/:id/clips via React Query

    LOADING: spinner
    NOT FOUND: "Project not found"
  </details>
  <automated>none</automated>
  <verify>Page renders; Sync Now button triggers sync; clips list updates after sync; syncing spinner shows during sync; error message appears on failed sync</verify>
</task>

<task id="1-04-09" name="Update client/src/App.tsx to import Projects pages">
  <description>Replace stub /projects route with ProjectsPage and add /projects/:id route for ProjectDetailPage.</description>
  <files>client/src/App.tsx</files>
  <details>
    Add imports:
    import ProjectsPage from "@/pages/ProjectsPage";
    import ProjectDetailPage from "@/pages/ProjectDetailPage";

    Update routes:
    <Route path="/projects" component={ProjectsPage} />
    <Route path="/projects/:id" component={ProjectDetailPage} />
  </details>
  <automated>none</automated>
  <verify>Navigating to /projects renders ProjectsPage; clicking a project navigates to ProjectDetailPage</verify>
</task>

---

## must_haves
- [ ] `POST /api/projects` creates a project linked to a title; returns 201
- [ ] `POST /api/projects/:id/sync` returns `{"status":"started"}` immediately without waiting for sync to complete
- [ ] After sync with valid Dropbox folder, `GET /api/projects/:id/clips` returns clips with correct filename, dropbox_path, dropbox_file_id, file_size_bytes, and status="new"
- [ ] Re-running sync on same folder does not create duplicate clip records (idempotent by dropbox_file_id)
- [ ] Sync error (bad path, bad token) sets syncStatus="error" and syncErrorMessage on the project row
- [ ] project.dropboxCursor is updated after every successful sync
- [ ] Syncing with no Dropbox credentials configured returns 400 or surfaces error cleanly
- [ ] ProjectsPage shows sync status indicator; Sync Now button is disabled while syncing
- [ ] ProjectDetailPage auto-refreshes while syncStatus is "syncing" and stops polling when idle/error
- [ ] Delete project cascades: associated clips are removed from the database

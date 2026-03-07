---
plan: 05
name: clip-library
wave: 3
depends_on: [01-PLAN-scaffold, 02-PLAN-auth, 03-PLAN-titles, 04-PLAN-projects-dropbox]
files_modified:
  - server/routes.ts
  - server/storage.ts
  - client/src/pages/ClipLibraryPage.tsx
  - client/src/components/ClipCard.tsx
  - client/src/components/ClipDetailPanel.tsx
  - client/src/components/ClipMetadataDialog.tsx
  - client/src/hooks/useClips.ts
  - client/src/App.tsx
autonomous: true
---

# Plan 05: Clip Library UI

## Overview

Build the full clip library: filtered list/grid view, clip approval/rejection, bulk actions, clip detail panel, inline metadata editing, and rotation usage indicator. The clip library is the core daily-use UI for marketing operators and reviewers.

---

<task id="1-05-01" name="Add clips filter + update storage functions to server/storage.ts">
  <description>Add getClips (with filter params), updateClip, bulkUpdateClips, and approveClip/rejectClip to server/storage.ts.</description>
  <files>server/storage.ts</files>
  <details>
    Append to storage.ts:

    import { and, inArray } from "drizzle-orm";

    type ClipFilters = {
      titleId?: number;
      projectId?: number;
      status?: string;
      platformFit?: string;
      isAvailable?: boolean;
      unpostedOnly?: boolean;
    };

    export async function getClips(filters: ClipFilters = {}): Promise<Clip[]> {
      const conditions = [];

      if (filters.titleId) conditions.push(eq(clips.titleId, filters.titleId));
      if (filters.projectId) conditions.push(eq(clips.projectId, filters.projectId));
      if (filters.status) conditions.push(eq(clips.status, filters.status));
      if (filters.isAvailable !== undefined) conditions.push(eq(clips.isAvailable, filters.isAvailable));
      if (filters.unpostedOnly) conditions.push(eq(clips.postedCount, 0));

      const query = db.select().from(clips);
      if (conditions.length > 0) {
        return query.where(and(...conditions)).orderBy(clips.createdAt);
      }
      return query.orderBy(clips.createdAt);
    }

    export async function getClipById(id: number): Promise<Clip | undefined> {
      const result = await db.select().from(clips).where(eq(clips.id, id)).limit(1);
      return result[0];
    }

    export async function updateClip(id: number, data: Partial<Omit<Clip, "id" | "createdAt">>): Promise<Clip> {
      const [updated] = await db
        .update(clips)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(clips.id, id))
        .returning();
      return updated;
    }

    export async function approveClip(id: number, approverId: number): Promise<Clip> {
      const [updated] = await db
        .update(clips)
        .set({
          status: "approved",
          approvedById: approverId,
          approvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(clips.id, id))
        .returning();
      return updated;
    }

    export async function rejectClip(id: number): Promise<Clip> {
      const [updated] = await db
        .update(clips)
        .set({ status: "rejected", updatedAt: new Date() })
        .where(eq(clips.id, id))
        .returning();
      return updated;
    }

    export async function bulkUpdateClips(
      ids: number[],
      data: { status?: string; isAvailable?: boolean }
    ): Promise<void> {
      if (ids.length === 0) return;
      await db
        .update(clips)
        .set({ ...data, updatedAt: new Date() })
        .where(inArray(clips.id, ids));
    }

    export async function getClipRotationStats(projectId: number): Promise<{
      totalApproved: number;
      postedCount: number;
      remainingInCycle: number;
    }> {
      const allApproved = await db
        .select()
        .from(clips)
        .where(and(eq(clips.projectId, projectId), eq(clips.status, "approved")));

      const totalApproved = allApproved.length;
      const posted = allApproved.filter((c) => c.postedCount > 0).length;
      return {
        totalApproved,
        postedCount: posted,
        remainingInCycle: totalApproved - posted,
      };
    }
  </details>
  <automated>none</automated>
  <verify>TypeScript compiles; getClips({ status: "new" }) returns only new clips; bulkUpdateClips with empty array is a no-op</verify>
</task>

<task id="1-05-02" name="Add clips routes to server/routes.ts">
  <description>Add clips API routes: GET /api/clips (with query filters), GET /api/clips/:id, PUT /api/clips/:id, POST /api/clips/:id/approve, POST /api/clips/:id/reject, POST /api/clips/bulk-approve, POST /api/clips/bulk-archive.</description>
  <files>server/routes.ts</files>
  <details>
    Add imports: getClips, getClipById, updateClip, approveClip, rejectClip, bulkUpdateClips, getClipRotationStats from "./storage.js"

    Add these routes after projects routes:

    // GET /api/clips — requireAuth
    // Query params: titleId, projectId, status, platformFit, unpostedOnly=true
    app.get("/api/clips", requireAuth, async (req, res) => {
      try {
        const filters: any = {};
        if (req.query.titleId) filters.titleId = parseInt(req.query.titleId as string);
        if (req.query.projectId) filters.projectId = parseInt(req.query.projectId as string);
        if (req.query.status) filters.status = req.query.status as string;
        if (req.query.unpostedOnly === "true") filters.unpostedOnly = true;
        // Note: isAvailable defaults to showing all clips (including unavailable for history)
        const result = await getClips(filters);
        res.json(result);
      } catch (err: any) {
        res.status(500).json({ message: err.message });
      }
    });

    // GET /api/clips/:id — requireAuth
    app.get("/api/clips/:id", requireAuth, async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const clip = await getClipById(id);
        if (!clip) return res.status(404).json({ message: "Clip not found" });
        res.json(clip);
      } catch (err: any) {
        res.status(500).json({ message: err.message });
      }
    });

    // PUT /api/clips/:id — requireOperator (metadata editing)
    app.put("/api/clips/:id", requireOperator, async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const existing = await getClipById(id);
        if (!existing) return res.status(404).json({ message: "Clip not found" });

        // Disallow changing dropbox fields via PUT
        const {
          dropboxFileId: _a,
          dropboxPath: _b,
          projectId: _c,
          titleId: _d,
          createdAt: _e,
          id: _f,
          ...updatable
        } = req.body;

        const updated = await updateClip(id, updatable);
        res.json(updated);
      } catch (err: any) {
        res.status(500).json({ message: err.message });
      }
    });

    // POST /api/clips/:id/approve — requireReviewer
    app.post("/api/clips/:id/approve", requireReviewer, async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const user = req.user as any;
        const clip = await getClipById(id);
        if (!clip) return res.status(404).json({ message: "Clip not found" });
        const updated = await approveClip(id, user.id);
        res.json(updated);
      } catch (err: any) {
        res.status(500).json({ message: err.message });
      }
    });

    // POST /api/clips/:id/reject — requireReviewer
    app.post("/api/clips/:id/reject", requireReviewer, async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const clip = await getClipById(id);
        if (!clip) return res.status(404).json({ message: "Clip not found" });
        const updated = await rejectClip(id);
        res.json(updated);
      } catch (err: any) {
        res.status(500).json({ message: err.message });
      }
    });

    // POST /api/clips/bulk-approve — requireReviewer
    // Must be defined BEFORE /api/clips/:id to avoid route conflict
    app.post("/api/clips/bulk-approve", requireReviewer, async (req, res) => {
      try {
        const { ids } = req.body as { ids: number[] };
        if (!Array.isArray(ids) || ids.length === 0) {
          return res.status(400).json({ message: "ids array is required and must not be empty" });
        }
        // Use individual approve to set approvedById
        const user = req.user as any;
        await Promise.all(ids.map((id) => approveClip(id, user.id)));
        res.json({ message: `${ids.length} clips approved`, count: ids.length });
      } catch (err: any) {
        res.status(500).json({ message: err.message });
      }
    });

    // POST /api/clips/bulk-archive — requireOperator
    app.post("/api/clips/bulk-archive", requireOperator, async (req, res) => {
      try {
        const { ids } = req.body as { ids: number[] };
        if (!Array.isArray(ids) || ids.length === 0) {
          return res.status(400).json({ message: "ids array is required and must not be empty" });
        }
        await bulkUpdateClips(ids, { status: "archived" });
        res.json({ message: `${ids.length} clips archived`, count: ids.length });
      } catch (err: any) {
        res.status(500).json({ message: err.message });
      }
    });

    // GET /api/clips/:id/rotation-stats — requireAuth
    // Returns rotation stats for the project this clip belongs to
    app.get("/api/clips/:id/rotation-stats", requireAuth, async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const clip = await getClipById(id);
        if (!clip) return res.status(404).json({ message: "Clip not found" });
        const stats = await getClipRotationStats(clip.projectId);
        res.json(stats);
      } catch (err: any) {
        res.status(500).json({ message: err.message });
      }
    });

    IMPORTANT: /api/clips/bulk-approve and /api/clips/bulk-archive must be registered BEFORE /api/clips/:id to prevent Express from matching "bulk-approve" as an :id value.
  </details>
  <automated>none</automated>
  <verify>
    GET /api/clips returns all clips.
    GET /api/clips?status=new returns only new clips.
    POST /api/clips/:id/approve sets status="approved", approvedById, approvedAt.
    POST /api/clips/bulk-approve with ids=[1,2,3] approves all three.
    POST /api/clips/bulk-archive with ids=[4,5] sets status="archived" on both.
    Reviewer can approve; executive cannot (returns 403).
  </verify>
</task>

<task id="1-05-03" name="Create client/src/hooks/useClips.ts">
  <description>React Query hooks: useClips (with filter params), useClip (single), useUpdateClip, useApproveClip, useRejectClip, useBulkApproveClips, useBulkArchiveClips.</description>
  <files>client/src/hooks/useClips.ts</files>
  <details>
    import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
    import { fetchJSON, apiRequest } from "@/lib/queryClient";
    import type { Clip } from "@shared/schema";

    type ClipFilters = {
      titleId?: number;
      projectId?: number;
      status?: string;
      unpostedOnly?: boolean;
    };

    function buildClipUrl(filters: ClipFilters): string {
      const params = new URLSearchParams();
      if (filters.titleId) params.set("titleId", String(filters.titleId));
      if (filters.projectId) params.set("projectId", String(filters.projectId));
      if (filters.status) params.set("status", filters.status);
      if (filters.unpostedOnly) params.set("unpostedOnly", "true");
      const qs = params.toString();
      return qs ? `/api/clips?${qs}` : "/api/clips";
    }

    export function useClips(filters: ClipFilters = {}) {
      return useQuery<Clip[]>({
        queryKey: ["/api/clips", filters],
        queryFn: () => fetchJSON(buildClipUrl(filters)),
      });
    }

    export function useClip(id: number | null) {
      return useQuery<Clip>({
        queryKey: ["/api/clips", id],
        queryFn: () => fetchJSON(`/api/clips/${id}`),
        enabled: id !== null,
      });
    }

    export function useUpdateClip() {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: async ({ id, data }: { id: number; data: Partial<Clip> }) => {
          const res = await apiRequest("PUT", `/api/clips/${id}`, data);
          if (!res.ok) {
            const body = await res.json().catch(() => ({ message: "Failed to update clip" }));
            throw new Error(body.message);
          }
          return res.json() as Promise<Clip>;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/clips"] }),
      });
    }

    export function useApproveClip() {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: async (id: number) => {
          const res = await apiRequest("POST", `/api/clips/${id}/approve`);
          if (!res.ok) {
            const body = await res.json().catch(() => ({ message: "Failed to approve clip" }));
            throw new Error(body.message);
          }
          return res.json() as Promise<Clip>;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/clips"] }),
      });
    }

    export function useRejectClip() {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: async (id: number) => {
          const res = await apiRequest("POST", `/api/clips/${id}/reject`);
          if (!res.ok) {
            const body = await res.json().catch(() => ({ message: "Failed to reject clip" }));
            throw new Error(body.message);
          }
          return res.json() as Promise<Clip>;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/clips"] }),
      });
    }

    export function useBulkApproveClips() {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: async (ids: number[]) => {
          const res = await apiRequest("POST", "/api/clips/bulk-approve", { ids });
          if (!res.ok) {
            const body = await res.json().catch(() => ({ message: "Bulk approve failed" }));
            throw new Error(body.message);
          }
          return res.json();
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/clips"] }),
      });
    }

    export function useBulkArchiveClips() {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: async (ids: number[]) => {
          const res = await apiRequest("POST", "/api/clips/bulk-archive", { ids });
          if (!res.ok) {
            const body = await res.json().catch(() => ({ message: "Bulk archive failed" }));
            throw new Error(body.message);
          }
          return res.json();
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/clips"] }),
      });
    }
  </details>
  <automated>none</automated>
  <verify>TypeScript compiles; all hooks are correctly typed</verify>
</task>

<task id="1-05-04" name="Create client/src/components/ClipCard.tsx">
  <description>Clip grid card component showing thumbnail (or placeholder), filename, status badge, duration, orientation icon, posted count, checkbox for bulk selection, and quick approve/reject buttons for reviewers.</description>
  <files>client/src/components/ClipCard.tsx</files>
  <details>
    Props:
    - clip: Clip
    - isSelected: boolean
    - onSelect: (id: number, selected: boolean) => void
    - onApprove: (id: number) => void
    - onReject: (id: number) => void
    - onViewDetails: (clip: Clip) => void
    - canApprove: boolean
    - isApprovePending: boolean
    - isRejectPending: boolean

    LAYOUT: relative flex flex-col, rounded-xl overflow-hidden border border-border/50 hover:border-border transition-all cursor-pointer group

    TOP SECTION (thumbnail area, aspect-video):
    - If thumbnailUrl: <img src={clip.thumbnailUrl} className="w-full h-full object-cover" />
    - If no thumbnailUrl: gray placeholder div with a Video icon centered (lucide-react Video or Film icon)
    - Overlay on hover: semi-transparent dark overlay with "View Details" text
    - Top-left: checkbox for bulk selection (appears on hover or when isSelected)
    - Top-right: status badge (absolute positioned)
    - "Unavailable" ribbon if !clip.isAvailable (red diagonal banner)

    STATUS BADGE colors:
    - new: gray — "New"
    - awaiting_review: amber — "Review"
    - approved: green — "Approved"
    - rejected: red — "Rejected"
    - posted: blue — "Posted"
    - archived: gray/muted — "Archived"

    BOTTOM SECTION (p-3 space-y-1):
    - Filename (truncated, text-sm font-medium)
    - Row: duration (formatDuration) + orientation icon (Smartphone for vertical, Monitor for horizontal, Square for square) + if postedCount > 0 show "Posted {n}x"
    - Action buttons row (if canApprove and status is "new" or "awaiting_review"):
      - Approve button: CheckCircle icon, green, ghost, small
      - Reject button: XCircle icon, red, ghost, small
      - Both disabled if isApprovePending || isRejectPending

    CLICK BEHAVIOR:
    - Clicking the card body (not buttons/checkbox) calls onViewDetails(clip)
    - Clicking checkbox calls onSelect
    - Approve/reject buttons call their handlers

    ORIENTATION ICON mapping:
    - "vertical" → Smartphone (lucide)
    - "horizontal" → Monitor (lucide)
    - "square" → Square (lucide)
    - null → nothing
  </details>
  <automated>none</automated>
  <verify>Card renders with/without thumbnail; status badges have correct colors; approve/reject buttons appear only for canApprove roles; checkbox toggles selection</verify>
</task>

<task id="1-05-05" name="Create client/src/components/ClipDetailPanel.tsx">
  <description>Right panel showing full clip detail when a clip is selected in the library. Shows metadata, posting history placeholder, approve/reject/edit buttons, and rotation indicator.</description>
  <files>client/src/components/ClipDetailPanel.tsx</files>
  <details>
    Props:
    - clip: Clip | null
    - onClose: () => void
    - canApprove: boolean
    - canEdit: boolean
    - onApprove: (id: number) => void
    - onReject: (id: number) => void
    - onEdit: (clip: Clip) => void
    - rotationStats: { totalApproved: number; postedCount: number; remainingInCycle: number } | null

    WHEN clip IS NULL: render empty state ("Select a clip to view details")

    WHEN clip IS SET:
    Layout: fixed right panel, w-80 or w-96, border-l border-border/50, overflow-y-auto, flex flex-col

    SECTIONS:
    1. Header: filename (truncated) + close button (X icon) + status badge
    2. Thumbnail preview (if thumbnailUrl): aspect-video image; else placeholder
    3. Actions row (if canApprove and clip.status in ["new","awaiting_review"]):
       - Approve button (green, full width left)
       - Reject button (destructive outline, full width right)
       Else show current status in muted text.
       If canEdit: "Edit Metadata" button (outline, full width)
    4. Metadata section (dl/dd pairs):
       - Title: resolved from titleId (pass title name via prop or lookup)
       - Project: projectId
       - File: filename, formatFileSize(fileSizeBytes), mimeType
       - Duration: formatDuration(durationSeconds)
       - Orientation: horizontal/vertical/square
       - Uploaded: formatDate(createdAt)
       - Approved by: approvedById (show "—" if null) + approvedAt
       - Last posted: formatDate(lastPostedAt) or "Never"
       - Posted count: postedCount
    5. Tags section (if any):
       - Hook type: clip.hookType
       - Theme: clip.theme
       - Character focus: clip.characterFocus
       - Spoiler level: clip.spoilerLevel
       - Intensity: clip.intensityLevel
       - Platform fit: clip.platformFit?.join(", ") or "—"
       - Allowed regions: clip.allowedRegions?.join(", ") or "All"
       - Restricted regions: clip.restrictedRegions?.join(", ") or "None"
       - Embargo date: formatDate(clip.embargoDate) or "—"
    6. Rotation indicator widget (if rotationStats):
       - "N of M clips used in cycle" (postedCount of totalApproved)
       - Progress bar: width = (postedCount / totalApproved) * 100%
       - "{remainingInCycle} remaining in this cycle"
    7. Posting history section header: "Posting History" + "— Coming in Phase 3" placeholder

    STYLING: Each section has a border-b border-border/50 separator. Use text-xs text-muted-foreground for labels, text-sm for values.
  </details>
  <automated>none</automated>
  <verify>Panel renders correctly for a selected clip; rotate indicator shows correct counts; approve/reject buttons trigger correct mutations; empty state shows when no clip selected</verify>
</task>

<task id="1-05-06" name="Create client/src/components/ClipMetadataDialog.tsx">
  <description>Dialog for editing clip metadata fields that can be set by operators (not set by Dropbox sync). Fields: hookType, theme, characterFocus, spoilerLevel, intensityLevel, platformFit, allowedRegions, restrictedRegions, embargoDate, distributorNotes, orientation.</description>
  <files>client/src/components/ClipMetadataDialog.tsx</files>
  <details>
    Props: { open: boolean; onClose: () => void; clip: Clip | null }

    FIELDS:
    - status: Select — new/awaiting_review/approved/rejected/archived (operators can manually move status)
    - orientation: Select — horizontal/vertical/square
    - hookType: text input
    - theme: text input
    - characterFocus: text input
    - spoilerLevel: Select — none/mild/moderate/heavy
    - intensityLevel: Select — low/medium/high/extreme
    - platformFit: comma-separated text input (stored as string[], split on comma before saving)
    - allowedRegions: comma-separated text input (same pattern)
    - restrictedRegions: comma-separated text input
    - embargoDate: date input (type="date")
    - distributorNotes: textarea

    SUBMIT: PUT /api/clips/:id via useUpdateClip mutation. Convert comma-separated strings to arrays before sending.
    On success: onClose(), invalidate queries.
    DIALOG SIZE: sm:max-w-[500px]

    Pre-fill all fields from clip prop on open.
  </details>
  <automated>none</automated>
  <verify>Dialog opens with correct pre-filled values; platformFit is shown as comma-separated string; save updates clip metadata; TypeScript compiles</verify>
</task>

<task id="1-05-07" name="Create client/src/pages/ClipLibraryPage.tsx">
  <description>Full clip library page with 3-panel layout: left filter panel, center grid, right detail panel. Includes bulk action toolbar, filter controls, and clip rotation indicator per project.</description>
  <files>client/src/pages/ClipLibraryPage.tsx</files>
  <details>
    LAYOUT: flex h-full overflow-hidden

    LEFT PANEL (filter panel, w-64, border-r border-border/50, p-4, overflow-y-auto):
    - Section title "Filters"
    - Title filter: Select from useTitles() — "All Titles" default
    - Project filter: Select from useProjects() filtered by selected title — "All Projects" default
    - Status filter: Select — All / New / Awaiting Review / Approved / Rejected / Posted / Archived
    - Platform fit filter: text input (searches platformFit array contains value)
    - Unposted only: Checkbox toggle
    - "Clear Filters" button (ghost, small)

    CENTER PANEL (flex-1, flex flex-col, overflow-hidden):
    Top bar:
    - Page title "Clip Library" (left)
    - Total count badge: "{n} clips"
    - Right: if selectedClips.size > 0, show bulk action toolbar:
      - "{n} selected" text
      - "Approve All" button (green, requireReviewer)
      - "Archive All" button (outline)
      - "Clear Selection" button (ghost)
    - Else: "Select clips to bulk-edit" placeholder text in muted

    Grid area (flex-1 overflow-y-auto p-4):
    - LOADING: centered spinner
    - EMPTY: "No clips match your filters" or "No clips yet — sync a project to get started"
    - Grid: grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3
    - Each cell: <ClipCard /> with all required props

    RIGHT PANEL (w-80 or w-96, hidden when no clip selected, border-l border-border/50):
    - <ClipDetailPanel /> with selected clip, rotation stats, approve/reject/edit handlers
    - When edit is triggered: open <ClipMetadataDialog />

    STATE:
    - activeFilters: { titleId, projectId, status, unpostedOnly } — passed to useClips hook
    - selectedClips: Set<number> — for bulk actions
    - selectedClipForDetail: Clip | null — for right panel
    - metadataDialogOpen: boolean
    - metadataDialogClip: Clip | null

    ROLE GATING:
    const canApprove = ["admin", "marketing_operator", "reviewer"].includes(user?.role ?? "");
    const canEdit = ["admin", "marketing_operator"].includes(user?.role ?? "");

    SELECTION LOGIC:
    - Each ClipCard checkbox controls membership in selectedClips Set
    - "Select All" (in bulk toolbar) adds all visible clip IDs to Set
    - "Clear Selection" empties Set
    - Selecting a clip for detail view: click on card body (not checkbox) sets selectedClipForDetail

    BULK APPROVE:
    - Calls useBulkApproveClips().mutate([...selectedClips])
    - On success: clear selectedClips set, show toast "N clips approved"

    BULK ARCHIVE:
    - Calls useBulkArchiveClips().mutate([...selectedClips])
    - On success: clear selectedClips set, show toast "N clips archived"

    ROTATION STATS:
    - When a clip is selected for detail, fetch rotation stats:
      GET /api/clips/:id/rotation-stats
    - Pass stats to ClipDetailPanel
    - Use a separate useQuery for this endpoint keyed by ["/api/clips", selectedClipForDetail?.id, "rotation-stats"]

    URL PARAMS:
    - Support ?project=:id and ?title=:id query params in URL for pre-filtering
    - Parse with URLSearchParams(window.location.search) on mount
  </details>
  <automated>none</automated>
  <verify>
    Filter controls update clip grid in real-time.
    Selecting clips via checkbox populates bulk toolbar.
    Bulk approve triggers API and shows success toast; clips status changes to "approved".
    Clicking a clip card (not checkbox) opens right detail panel.
    Approve/reject buttons in detail panel work and update clip status.
    "Edit Metadata" opens ClipMetadataDialog with correct pre-filled values.
    Rotation indicator shows correct stats.
    Role gating: executive sees read-only view (no approve/reject buttons).
  </verify>
</task>

<task id="1-05-08" name="Update client/src/App.tsx to import ClipLibraryPage">
  <description>Replace stub /clips route with the actual ClipLibraryPage component.</description>
  <files>client/src/App.tsx</files>
  <details>
    Add import:
    import ClipLibraryPage from "@/pages/ClipLibraryPage";

    Update route:
    <Route path="/clips" component={ClipLibraryPage} />
  </details>
  <automated>none</automated>
  <verify>Navigating to /clips renders ClipLibraryPage</verify>
</task>

---

## must_haves
- [ ] `GET /api/clips` returns all clips; `GET /api/clips?status=new` returns only new clips
- [ ] `POST /api/clips/:id/approve` sets status="approved", approvedById, approvedAt
- [ ] `POST /api/clips/:id/reject` sets status="rejected"
- [ ] `POST /api/clips/bulk-approve` with ids=[1,2,3] approves all three clips
- [ ] `POST /api/clips/bulk-archive` with ids=[4,5] archives both clips
- [ ] bulk-approve and bulk-archive routes are registered BEFORE /:id to avoid route conflicts
- [ ] reviewer role can approve/reject clips; executive cannot (403)
- [ ] ClipLibraryPage renders grid of clips with filter controls
- [ ] Filter by status updates grid without page reload
- [ ] Checkbox selection works; bulk toolbar appears when clips are selected
- [ ] Clicking a clip opens detail panel on the right
- [ ] Approve/reject from detail panel updates clip status immediately (React Query invalidation)
- [ ] Rotation indicator shows correct "N of M clips used" for the project
- [ ] Edit Metadata dialog opens with correct pre-filled values and saves successfully
- [ ] Executive/freelancer roles see clips but no approve/reject/edit controls

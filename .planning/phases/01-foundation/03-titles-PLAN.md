---
plan: 03
name: titles
wave: 2
depends_on: [01-PLAN-scaffold, 02-PLAN-auth]
files_modified:
  - server/routes.ts
  - server/storage.ts
  - client/src/pages/TitlesPage.tsx
  - client/src/pages/TitleDetailPage.tsx
  - client/src/components/TitleDialog.tsx
  - client/src/hooks/useTitles.ts
  - client/src/App.tsx
autonomous: true
---

# Plan 03: Titles CRUD + OMDb Import

## Overview

Implement the full titles feature: server routes (CRUD + OMDb search), storage functions, and client UI (list page, detail page, create/edit dialog with two-step OMDb import flow). After this plan, a user can create a title manually or search OMDb to auto-populate metadata, view all titles, and edit/delete them.

---

<task id="1-03-01" name="Add titles storage functions to server/storage.ts">
  <description>Add getTitles, getTitleById, createTitle, updateTitle, deleteTitle, and checkTitleNameExists to server/storage.ts.</description>
  <files>server/storage.ts</files>
  <details>
    Add these functions (append to existing storage.ts — do NOT remove existing functions):

    import { titles } from "@shared/schema.js";
    import { eq, ilike, desc } from "drizzle-orm";
    import type { Title, InsertTitle } from "@shared/schema.js";

    export async function getTitles(): Promise<(Title & { clipCount: number; campaignCount: number })[]> {
      // Join with clips and campaigns count via subquery or raw SQL
      // Use drizzle sql`` or separate count queries
      // Return all titles ordered by title_name ASC
      // For each title, include clipCount and campaignCount as computed columns
      // Implementation: fetch all titles, then count clips and campaigns per title
      // Use Promise.all for parallel counts or a single SQL query with left joins + count(*)

      const allTitles = await db.select().from(titles).orderBy(titles.titleName);

      // Attach counts (simple approach: parallel queries)
      const { clips, campaigns } = await import("@shared/schema.js");
      const { count, eq } = await import("drizzle-orm");

      const withCounts = await Promise.all(
        allTitles.map(async (title) => {
          const [clipResult] = await db.select({ count: count() }).from(clips).where(eq(clips.titleId, title.id));
          const [campaignResult] = await db.select({ count: count() }).from(campaigns).where(eq(campaigns.titleId, title.id));
          return {
            ...title,
            clipCount: Number(clipResult?.count ?? 0),
            campaignCount: Number(campaignResult?.count ?? 0),
          };
        })
      );
      return withCounts;
    }

    export async function getTitleById(id: number): Promise<Title | undefined> {
      const result = await db.select().from(titles).where(eq(titles.id, id)).limit(1);
      return result[0];
    }

    export async function createTitle(data: InsertTitle): Promise<Title> {
      const [created] = await db.insert(titles).values(data).returning();
      return created;
    }

    export async function updateTitle(id: number, data: Partial<InsertTitle>): Promise<Title> {
      const [updated] = await db
        .update(titles)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(titles.id, id))
        .returning();
      return updated;
    }

    export async function deleteTitle(id: number): Promise<void> {
      await db.delete(titles).where(eq(titles.id, id));
    }

    export async function getTitleByName(titleName: string): Promise<Title | undefined> {
      const result = await db
        .select()
        .from(titles)
        .where(eq(titles.titleName, titleName))
        .limit(1);
      return result[0];
    }
  </details>
  <automated>none</automated>
  <verify>TypeScript compiles; getTitles() returns array with clipCount and campaignCount fields</verify>
</task>

<task id="1-03-02" name="Add titles routes to server/routes.ts">
  <description>Add all titles API routes inside registerRoutes(), after the auth routes. Include OMDb search route.</description>
  <files>server/routes.ts</files>
  <details>
    Add these routes to registerRoutes() after the existing auth and settings routes.
    Import axios from "axios".
    Import getTitles, getTitleById, createTitle, updateTitle, deleteTitle, getTitleByName from "./storage.js".

    // Helper: normalize OMDb "N/A" to null
    function cleanOmdb(v: string | undefined): string | null {
      return !v || v === "N/A" ? null : v;
    }

    // Helper: parse "142 min" → 142
    function parseRuntime(runtime: string | undefined): number | null {
      if (!runtime || runtime === "N/A") return null;
      const match = runtime.match(/(\d+)/);
      return match ? parseInt(match[1]) : null;
    }

    // GET /api/titles — requireAuth
    app.get("/api/titles", requireAuth, async (_req, res) => {
      try {
        const all = await getTitles();
        res.json(all);
      } catch (err: any) {
        res.status(500).json({ message: err.message });
      }
    });

    // GET /api/titles/:id — requireAuth
    app.get("/api/titles/:id", requireAuth, async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const title = await getTitleById(id);
        if (!title) return res.status(404).json({ message: "Title not found" });
        res.json(title);
      } catch (err: any) {
        res.status(500).json({ message: err.message });
      }
    });

    // POST /api/titles/omdb-search — requireOperator
    // Must be defined BEFORE /api/titles/:id to avoid route conflict
    app.get("/api/titles/omdb-search", requireOperator, async (req, res) => {
      try {
        const q = req.query.q as string;
        if (!q) return res.status(400).json({ message: "Query parameter q is required" });

        const settings = await getAppSettings();
        const apiKey = settings?.omdbApiKey;
        if (!apiKey) return res.status(400).json({ message: "OMDb API key not configured in Admin > App Settings" });

        const response = await axios.get("https://www.omdbapi.com/", {
          params: { apikey: apiKey, t: q },
          timeout: 8000,
        });

        const data = response.data;
        if (data.Response === "False") {
          return res.status(404).json({ message: data.Error ?? "Title not found on OMDb" });
        }

        // Normalize N/A values
        const normalized = {
          Title: cleanOmdb(data.Title),
          Year: cleanOmdb(data.Year),
          Runtime: cleanOmdb(data.Runtime),
          Genre: cleanOmdb(data.Genre),
          Director: cleanOmdb(data.Director),
          Actors: cleanOmdb(data.Actors),
          Plot: cleanOmdb(data.Plot),
          Poster: cleanOmdb(data.Poster),
          imdbRating: cleanOmdb(data.imdbRating),
          imdbID: cleanOmdb(data.imdbID),
          runtimeMinutes: parseRuntime(data.Runtime),
        };

        res.json(normalized);
      } catch (err: any) {
        if (err.response) {
          res.status(502).json({ message: "OMDb API error" });
        } else {
          res.status(500).json({ message: err.message });
        }
      }
    });

    // POST /api/titles — requireOperator
    app.post("/api/titles", requireOperator, async (req, res) => {
      try {
        const user = req.user as any;

        // Check duplicate title name
        const existing = await getTitleByName(req.body.titleName);
        if (existing) return res.status(409).json({ message: "A title with this name already exists" });

        // If omdbData is provided and confirmed, merge it
        let data = { ...req.body, createdById: user.id };
        if (req.body.omdbConfirmed && req.body.omdbData) {
          const omdb = req.body.omdbData;
          data = {
            ...data,
            omdbImdbId: cleanOmdb(omdb.imdbID),
            omdbPosterUrl: cleanOmdb(omdb.Poster),
            omdbImdbRating: cleanOmdb(omdb.imdbRating),
            omdbDirector: cleanOmdb(omdb.Director),
            omdbActors: cleanOmdb(omdb.Actors),
            omdbPlot: cleanOmdb(omdb.Plot),
            releaseYear: omdb.Year ? parseInt(omdb.Year) : data.releaseYear,
            runtimeMinutes: omdb.runtimeMinutes ?? data.runtimeMinutes,
            genre: cleanOmdb(omdb.Genre)?.split(",")[0]?.trim() ?? data.genre,
          };
          // Seed synopsis_short from OMDb plot if not already set
          if (!data.synopsisShort && omdb.Plot && omdb.Plot !== "N/A") {
            data.synopsisShort = omdb.Plot;
          }
        }

        // Remove non-schema fields
        delete data.omdbConfirmed;
        delete data.omdbData;

        const title = await createTitle(data);
        res.status(201).json(title);
      } catch (err: any) {
        res.status(500).json({ message: err.message });
      }
    });

    // PUT /api/titles/:id — requireOperator
    app.put("/api/titles/:id", requireOperator, async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const existing = await getTitleById(id);
        if (!existing) return res.status(404).json({ message: "Title not found" });

        // Check name uniqueness if changing name
        if (req.body.titleName && req.body.titleName !== existing.titleName) {
          const dup = await getTitleByName(req.body.titleName);
          if (dup) return res.status(409).json({ message: "A title with this name already exists" });
        }

        // Disallow overwriting OMDb fields via PUT (they're set at creation)
        const { omdbImdbId: _a, omdbPosterUrl: _b, omdbImdbRating: _c, omdbDirector: _d, omdbActors: _e, omdbPlot: _f, ...updatable } = req.body;

        const updated = await updateTitle(id, updatable);
        res.json(updated);
      } catch (err: any) {
        res.status(500).json({ message: err.message });
      }
    });

    // DELETE /api/titles/:id — requireAdmin
    app.delete("/api/titles/:id", requireAdmin, async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const existing = await getTitleById(id);
        if (!existing) return res.status(404).json({ message: "Title not found" });
        await deleteTitle(id);
        res.json({ message: "Title deleted" });
      } catch (err: any) {
        res.status(500).json({ message: err.message });
      }
    });

    IMPORTANT: The GET /api/titles/omdb-search route must be registered BEFORE GET /api/titles/:id, otherwise Express will match "omdb-search" as the :id parameter.
  </details>
  <automated>none</automated>
  <verify>
    GET /api/titles returns [] when no titles exist.
    POST /api/titles/omdb-search?q=Inception returns normalized OMDb data with runtimeMinutes as number.
    POST /api/titles creates title and returns 201.
    Duplicate title name returns 409.
    DELETE /api/titles/:id returns 404 for non-existent title.
  </verify>
</task>

<task id="1-03-03" name="Create client/src/hooks/useTitles.ts">
  <description>React Query hooks for titles: useTitles (list), useTitle (single), useCreateTitle, useUpdateTitle, useDeleteTitle, useOmdbSearch.</description>
  <files>client/src/hooks/useTitles.ts</files>
  <details>
    import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
    import { fetchJSON, apiRequest } from "@/lib/queryClient";
    import type { Title, InsertTitle } from "@shared/schema";

    type TitleWithCounts = Title & { clipCount: number; campaignCount: number };

    export function useTitles() {
      return useQuery<TitleWithCounts[]>({
        queryKey: ["/api/titles"],
        queryFn: () => fetchJSON("/api/titles"),
      });
    }

    export function useTitle(id: number | null) {
      return useQuery<Title>({
        queryKey: ["/api/titles", id],
        queryFn: () => fetchJSON(`/api/titles/${id}`),
        enabled: id !== null,
      });
    }

    export function useCreateTitle() {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: async (data: InsertTitle & { omdbConfirmed?: boolean; omdbData?: Record<string, unknown> }) => {
          const res = await apiRequest("POST", "/api/titles", data);
          if (!res.ok) {
            const body = await res.json().catch(() => ({ message: "Failed to create title" }));
            throw new Error(body.message);
          }
          return res.json() as Promise<Title>;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/titles"] }),
      });
    }

    export function useUpdateTitle() {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: async ({ id, data }: { id: number; data: Partial<InsertTitle> }) => {
          const res = await apiRequest("PUT", `/api/titles/${id}`, data);
          if (!res.ok) {
            const body = await res.json().catch(() => ({ message: "Failed to update title" }));
            throw new Error(body.message);
          }
          return res.json() as Promise<Title>;
        },
        onSuccess: (_data, { id }) => {
          qc.invalidateQueries({ queryKey: ["/api/titles"] });
          qc.invalidateQueries({ queryKey: ["/api/titles", id] });
        },
      });
    }

    export function useDeleteTitle() {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: async (id: number) => {
          const res = await apiRequest("DELETE", `/api/titles/${id}`);
          if (!res.ok) {
            const body = await res.json().catch(() => ({ message: "Failed to delete title" }));
            throw new Error(body.message);
          }
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/titles"] }),
      });
    }

    type OmdbResult = {
      Title: string | null;
      Year: string | null;
      Runtime: string | null;
      Genre: string | null;
      Director: string | null;
      Actors: string | null;
      Plot: string | null;
      Poster: string | null;
      imdbRating: string | null;
      imdbID: string | null;
      runtimeMinutes: number | null;
    };

    export function useOmdbSearch() {
      return useMutation({
        mutationFn: async (query: string): Promise<OmdbResult> => {
          const res = await apiRequest("GET", `/api/titles/omdb-search?q=${encodeURIComponent(query)}`);
          if (!res.ok) {
            const body = await res.json().catch(() => ({ message: "OMDb search failed" }));
            throw new Error(body.message);
          }
          return res.json();
        },
      });
    }
  </details>
  <automated>none</automated>
  <verify>TypeScript compiles; all hooks are correctly typed</verify>
</task>

<task id="1-03-04" name="Create client/src/components/TitleDialog.tsx">
  <description>Create/edit dialog for titles. Create mode includes an optional two-step OMDb search flow: Step 1 — search OMDb; Step 2 — confirm match or skip and enter manually. Edit mode shows pre-filled form without OMDb step.</description>
  <files>client/src/components/TitleDialog.tsx</files>
  <details>
    Props: { open: boolean; onClose: () => void; editing?: Title | null }

    STATE:
    - step: "form" | "omdb-search" | "omdb-confirm" (only in create mode)
    - form: all editable title fields
    - omdbResult: OmdbResult | null
    - omdbQuery: string

    STEP FLOW (create mode only):
    1. Initial state: shows "Search OMDb" button at top of form + all manual fields
    2. On "Search OMDb" click: step = "omdb-search" — shows search input + search button
    3. On search success: step = "omdb-confirm" — shows OMDb result card (poster thumbnail, title, year, director, actors, plot) + "Use This Data" and "Skip — Enter Manually" buttons
    4. On "Use This Data": populate form fields from OMDb data, step = "form"
    5. On "Skip": step = "form", omdbResult = null

    FORM FIELDS:
    - titleName: text input (required)
    - status: Select (active/archived/upcoming)
    - releaseYear: number input
    - runtimeMinutes: number input
    - genre: text input
    - subgenre: text input
    - synopsisShort: textarea (rows=3)
    - synopsisLong: textarea (rows=5, optional — in accordion or secondary section)
    - marketingPositioning: textarea (rows=3)
    - mood: text input
    - spoilerGuidelines: textarea
    - approvedBrandVoiceNotes: textarea

    SUBMIT:
    - If omdbResult and user confirmed: include omdbConfirmed: true, omdbData: omdbResult in POST body
    - Calls createTitle mutation (create) or updateTitle mutation (edit)
    - On success: onClose(), invalidate queries

    DIALOG SIZE: sm:max-w-[600px]

    Use Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Button, Input, Label, Select, Textarea (or use a plain textarea styled with cn()) from shadcn components.

    Show mutation isPending as "Saving..." disabled state on submit button.
    Show mutation error as red text below footer.

    OMDb confirm step shows:
    - Poster image (if available) at left, max h-32
    - Title, Year, Director, Actors, Plot on right
    - "Use This Data" (primary) and "Skip" (ghost) buttons
    - "Back to search" link
  </details>
  <automated>none</automated>
  <verify>Dialog opens for create; OMDb search returns and shows confirm step; confirming populates form; manual create works; edit dialog pre-populates fields</verify>
</task>

<task id="1-03-05" name="Create client/src/pages/TitlesPage.tsx">
  <description>Titles list page: page header with "New Title" button, search input, table of titles with columns: poster thumbnail, title name, year, genre, status badge, clip count, campaign count, actions (edit, delete). Uses useTitles hook and TitleDialog.</description>
  <files>client/src/pages/TitlesPage.tsx</files>
  <details>
    import { useState } from "react";
    import { useTitles, useDeleteTitle } from "@/hooks/useTitles";
    import { useAuth } from "@/hooks/useAuth";
    import TitleDialog from "@/components/TitleDialog";
    import { Button } from "@/components/ui/button";
    import { Input } from "@/components/ui/input";
    import { Plus, Search, Pencil, Trash2, ExternalLink } from "lucide-react";
    import { cn, formatDate } from "@/lib/utils";
    import { Link } from "wouter";
    import type { Title } from "@shared/schema";

    STATE:
    - dialogOpen: boolean
    - editing: TitleWithCounts | null
    - search: string (filter client-side by titleName)

    ROLE GATING:
    const canEdit = ["admin", "marketing_operator"].includes(user?.role ?? "");

    LOADING STATE: centered spinner (h-6 w-6 animate-spin rounded-full border-2 border-primary/20 border-t-primary)

    EMPTY STATE: if no titles, show centered "No titles yet" + "Add your first title" button

    TABLE LAYOUT (div-based, no external table library):
    Header row: grid grid-cols-[40px_1fr_80px_140px_100px_80px_80px_120px]
    Columns: Poster | Title | Year | Genre | Status | Clips | Campaigns | Actions

    Each row:
    - Poster: 40x40px thumbnail using omdbPosterUrl (or placeholder icon if null)
    - Title: bold title name, link to /titles/:id
    - Year: releaseYear or "—"
    - Genre: genre or "—"
    - Status badge: active=green, archived=gray, upcoming=blue (inline span with cn)
    - Clips: clipCount number
    - Campaigns: campaignCount number
    - Actions: Edit button (pencil icon, ghost variant, only if canEdit), Delete button (trash icon, destructive ghost, only if user.role === "admin") + View link (ExternalLink icon → /titles/:id)

    DELETE CONFIRMATION: use window.confirm("Delete this title? This cannot be undone.") before calling deleteTitle mutation.

    SEARCH: filter titles array client-side by title.titleName.toLowerCase().includes(search.toLowerCase())
  </details>
  <automated>none</automated>
  <verify>Page renders with existing titles; New Title button opens dialog; edit icon opens pre-filled dialog; delete prompts and removes title; search filters visible rows</verify>
</task>

<task id="1-03-06" name="Create client/src/pages/TitleDetailPage.tsx">
  <description>Title detail page showing full metadata in read view, with edit button for operators. Tabs: Overview, Assets, Campaigns. Route: /titles/:id.</description>
  <files>client/src/pages/TitleDetailPage.tsx</files>
  <details>
    ROUTE: /titles/:id (extract id from useParams or useRoute from wouter)

    STRUCTURE:
    - Page header: OMDb poster thumbnail (large, max-h-48) + title name + status badge + year + runtime + genre
    - Edit button (top right, only for canEdit roles) opens TitleDialog in edit mode
    - Tabs: Overview | Clips (count) | Campaigns (count)

    OVERVIEW TAB:
    - OMDb section: Director, Actors, IMDb Rating, IMDb ID (with link to imdb.com), OMDb Plot
    - Marketing section: Synopsis Short, Synopsis Long, Marketing Positioning, Key Selling Points, Mood, Brand Voice Notes, Spoiler Guidelines
    - Festival/Awards section

    CLIPS TAB:
    - "Clips managed on Clip Library page" with link to /clips?title=:id
    - Show count of clips for this title

    CAMPAIGNS TAB:
    - "Coming in Phase 4" placeholder

    LOADING: spinner centered
    NOT FOUND: "Title not found" with back link

    Use useTitle(id) hook. Parse id from URL as parseInt.
  </details>
  <automated>none</automated>
  <verify>Page renders with correct title data; edit dialog opens pre-populated; OMDb data displays correctly; tabs switch content</verify>
</task>

<task id="1-03-07" name="Update client/src/App.tsx to import TitlesPage and TitleDetailPage">
  <description>Replace the stub placeholders for /titles and /titles/:id routes in App.tsx with the actual page components.</description>
  <files>client/src/App.tsx</files>
  <details>
    Add imports:
    import TitlesPage from "@/pages/TitlesPage";
    import TitleDetailPage from "@/pages/TitleDetailPage";

    Update routes:
    <Route path="/titles" component={TitlesPage} />
    <Route path="/titles/:id" component={TitleDetailPage} />

    Keep all other routes as stubs.
  </details>
  <automated>none</automated>
  <verify>Navigating to /titles renders TitlesPage; clicking a title navigates to TitleDetailPage</verify>
</task>

---

## must_haves
- [ ] `GET /api/titles` returns all titles with clipCount and campaignCount fields
- [ ] `GET /api/titles/omdb-search?q=Inception` returns normalized OMDb data with runtimeMinutes as integer (not the "142 min" string)
- [ ] OMDb fields with value "N/A" are normalized to null before returning
- [ ] `POST /api/titles` with omdbConfirmed=true merges OMDb data into the title record
- [ ] `POST /api/titles` with duplicate titleName returns 409
- [ ] `DELETE /api/titles/:id` cascade-deletes associated projects and clips (Postgres FK cascade)
- [ ] TitlesPage renders, shows search input, and filters titles client-side
- [ ] Create dialog includes OMDb search step; confirming an OMDb result populates form fields
- [ ] Skipping OMDb search creates a manual title without OMDb data
- [ ] TitleDetailPage shows OMDb poster and all metadata fields
- [ ] Role gating: reviewer/executive/freelancer cannot see Edit or Delete buttons

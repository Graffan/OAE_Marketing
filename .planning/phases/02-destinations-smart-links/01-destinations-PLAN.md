---
plan: 1
wave: 1
name: destinations
goal: Build the regional destinations backend (storage + routes) and full CRUD UI (hook, dialog, page).
estimated_tasks: 13
---

# Plan 1: Regional Destinations

## Goal
Add full CRUD for `regional_destinations` — storage functions, Express routes, a React Query hook, a create/edit dialog, and the DestinationsPage with computed status badges and expiry alerts.

## Context

### What already exists
- `regionalDestinations` table and `RegionalDestination` type in `shared/schema.ts` (line 285–311, 436)
- `db` import and Drizzle ORM patterns established in `server/storage.ts`
- `requireAuth`, `requireOperator`, `requireAdmin` middleware available from `server/auth.ts` and re-exported from `server/routes.ts`
- `fetchJSON`, `apiRequest` from `client/src/lib/queryClient.ts`
- `useTitles` hook pattern in `client/src/hooks/useTitles.ts`
- `TitleDialog` component pattern in `client/src/components/TitleDialog.tsx`
- `TitlesPage` page pattern in `client/src/pages/TitlesPage.tsx`
- App.tsx has `/destinations` route as `PlaceholderPage` — will be replaced in Plan 03

### Files to read before implementing
1. `server/storage.ts` — understand import block and Drizzle query patterns
2. `server/routes.ts` — understand route registration pattern and import block
3. `client/src/hooks/useTitles.ts` — exact hook pattern to replicate
4. `client/src/components/TitleDialog.tsx` — dialog form pattern
5. `client/src/pages/TitlesPage.tsx` — page layout pattern
6. `shared/schema.ts` lines 285–311 — exact column names for `regionalDestinations`

### Schema column reference (regionalDestinations)
`id`, `titleId`, `countryCode`, `regionName`, `platformName`, `platformType`, `destinationUrl`, `ctaLabel`, `language`, `startDate`, `endDate`, `status`, `campaignPriority`, `trackingParametersTemplate`, `createdAt`, `updatedAt`

---

## Tasks

### Task 1: Add imports to server/storage.ts
**File:** `server/storage.ts`
**Action:** edit
**Details:**
In the existing import block at the top of the file, add `regionalDestinations` to the table imports and `RegionalDestination` to the type imports. Also add `lte`, `gte`, `isNotNull`, `isNull`, `sql` to the drizzle-orm imports (alongside existing `eq`, `count`, `and`, `inArray`).

Resulting import lines (merge with existing):
```typescript
import { regionalDestinations } from "@shared/schema.js";
import type { RegionalDestination } from "@shared/schema.js";
import { eq, count, and, inArray, lte, gte, isNotNull, isNull, sql } from "drizzle-orm";
```

---

### Task 2: Add computeDestinationStatus helper to server/storage.ts
**File:** `server/storage.ts`
**Action:** append
**Details:**
Add this pure helper function after the existing Admin section, before any new destination functions. Place it under a `// ─── Regional Destinations ───` section divider.

```typescript
// ─── Regional Destinations ────────────────────────────────────────────────────

export type DestinationComputedStatus = "active" | "expiring_soon" | "expired";

export function computeDestinationStatus(dest: RegionalDestination): DestinationComputedStatus {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (dest.endDate) {
    const end = new Date(dest.endDate);
    end.setHours(0, 0, 0, 0);
    if (end < today) return "expired";
    const thirtyDaysOut = new Date(today);
    thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30);
    if (end <= thirtyDaysOut) return "expiring_soon";
  }
  return "active";
}
```

---

### Task 3: Add getDestinations to server/storage.ts
**File:** `server/storage.ts`
**Action:** append
**Details:**
```typescript
export async function getDestinations(titleId?: number): Promise<(RegionalDestination & { computedStatus: DestinationComputedStatus })[]> {
  const query = db.select().from(regionalDestinations);
  const rows = titleId
    ? await query.where(eq(regionalDestinations.titleId, titleId)).orderBy(regionalDestinations.countryCode)
    : await query.orderBy(regionalDestinations.countryCode);
  return rows.map((d) => ({ ...d, computedStatus: computeDestinationStatus(d) }));
}
```

---

### Task 4: Add getDestinationById, createDestination, updateDestination, deleteDestination to server/storage.ts
**File:** `server/storage.ts`
**Action:** append
**Details:**
```typescript
export async function getDestinationById(id: number): Promise<RegionalDestination | undefined> {
  const result = await db
    .select()
    .from(regionalDestinations)
    .where(eq(regionalDestinations.id, id))
    .limit(1);
  return result[0];
}

export async function createDestination(
  data: Omit<RegionalDestination, "id" | "createdAt" | "updatedAt">
): Promise<RegionalDestination> {
  const [created] = await db.insert(regionalDestinations).values(data).returning();
  return created;
}

export async function updateDestination(
  id: number,
  data: Partial<Omit<RegionalDestination, "id" | "createdAt" | "updatedAt">>
): Promise<RegionalDestination> {
  const [updated] = await db
    .update(regionalDestinations)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(regionalDestinations.id, id))
    .returning();
  return updated;
}

export async function deleteDestination(id: number): Promise<void> {
  await db.delete(regionalDestinations).where(eq(regionalDestinations.id, id));
}
```

---

### Task 5: Add getExpiringDestinations and getTitlesWithNoActiveDestinations to server/storage.ts
**File:** `server/storage.ts`
**Action:** append
**Details:**
```typescript
export async function getExpiringDestinations(daysAhead = 30): Promise<(RegionalDestination & { computedStatus: DestinationComputedStatus })[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const future = new Date(today);
  future.setDate(future.getDate() + daysAhead);

  const rows = await db
    .select()
    .from(regionalDestinations)
    .where(
      and(
        isNotNull(regionalDestinations.endDate),
        lte(regionalDestinations.endDate, future.toISOString().slice(0, 10)),
        gte(regionalDestinations.endDate, today.toISOString().slice(0, 10))
      )
    )
    .orderBy(regionalDestinations.endDate);

  return rows.map((d) => ({ ...d, computedStatus: computeDestinationStatus(d) }));
}

export async function getTitlesWithNoActiveDestinations(): Promise<{ id: number; titleName: string }[]> {
  // Get all title IDs that have at least one destination with status='active'
  const activeDestTitleIds = await db
    .selectDistinct({ titleId: regionalDestinations.titleId })
    .from(regionalDestinations)
    .where(eq(regionalDestinations.status, "active"));

  const activeIds = activeDestTitleIds.map((r) => r.titleId).filter((id): id is number => id !== null);

  const allTitles = await db.select({ id: titles.id, titleName: titles.titleName }).from(titles);

  return allTitles.filter((t) => !activeIds.includes(t.id));
}
```

Note: `titles` is already imported at the top of storage.ts.

---

### Task 6: Add destination routes to server/routes.ts
**File:** `server/routes.ts`
**Action:** edit
**Details:**
Add to the import block at the top (alongside existing storage imports):
```typescript
import {
  getDestinations,
  getDestinationById,
  createDestination,
  updateDestination,
  deleteDestination,
  getExpiringDestinations,
  getTitlesWithNoActiveDestinations,
} from "./storage.js";
```

Then, inside `registerRoutes(app)`, append the following routes BEFORE the `const server = http.createServer(app)` line. Register `GET /api/destinations/expiring` BEFORE `GET /api/destinations/:id` to avoid Express treating "expiring" as an `:id` param.

```typescript
  // ─── Destinations routes ─────────────────────────────────────────────────────

  // GET /api/destinations/expiring — requireAuth
  // MUST be registered BEFORE /api/destinations/:id
  app.get("/api/destinations/expiring", requireAuth, async (_req, res) => {
    try {
      const results = await getExpiringDestinations(30);
      res.json(results);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // GET /api/destinations — requireAuth, optional ?titleId= filter
  app.get("/api/destinations", requireAuth, async (req, res) => {
    try {
      const titleId = req.query.titleId ? parseInt(req.query.titleId as string) : undefined;
      const results = await getDestinations(titleId);
      res.json(results);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // GET /api/destinations/:id — requireAuth
  app.get("/api/destinations/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const dest = await getDestinationById(id);
      if (!dest) return res.status(404).json({ message: "Destination not found" });
      res.json(dest);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // POST /api/destinations — requireOperator
  app.post("/api/destinations", requireOperator, async (req, res) => {
    try {
      const { countryCode, platformName, destinationUrl, titleId } = req.body;
      if (!countryCode || countryCode.length !== 2) {
        return res.status(400).json({ message: "countryCode must be a 2-character ISO code" });
      }
      if (!platformName) return res.status(400).json({ message: "platformName is required" });
      if (!destinationUrl) return res.status(400).json({ message: "destinationUrl is required" });
      if (!titleId) return res.status(400).json({ message: "titleId is required" });
      const created = await createDestination({
        ...req.body,
        countryCode: (countryCode as string).toUpperCase(),
      });
      res.status(201).json(created);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // PUT /api/destinations/:id — requireOperator
  app.put("/api/destinations/:id", requireOperator, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existing = await getDestinationById(id);
      if (!existing) return res.status(404).json({ message: "Destination not found" });
      const { id: _id, createdAt: _c, updatedAt: _u, ...updatable } = req.body;
      if (updatable.countryCode) {
        updatable.countryCode = (updatable.countryCode as string).toUpperCase();
      }
      const updated = await updateDestination(id, updatable);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // DELETE /api/destinations/:id — requireAdmin
  app.delete("/api/destinations/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existing = await getDestinationById(id);
      if (!existing) return res.status(404).json({ message: "Destination not found" });
      await deleteDestination(id);
      res.json({ message: "Destination deleted" });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });
```

---

### Task 7: Create client/src/hooks/useDestinations.ts
**File:** `client/src/hooks/useDestinations.ts`
**Action:** create
**Details:**
```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchJSON, apiRequest } from "@/lib/queryClient";
import type { RegionalDestination } from "@shared/schema";

export type DestinationComputedStatus = "active" | "expiring_soon" | "expired";
export type DestinationWithStatus = RegionalDestination & { computedStatus: DestinationComputedStatus };

export function useDestinations(titleId?: number) {
  const url = titleId ? `/api/destinations?titleId=${titleId}` : "/api/destinations";
  return useQuery<DestinationWithStatus[]>({
    queryKey: ["/api/destinations", titleId ?? null],
    queryFn: () => fetchJSON(url),
  });
}

export function useDestination(id: number | null) {
  return useQuery<RegionalDestination>({
    queryKey: ["/api/destinations", id],
    queryFn: () => fetchJSON(`/api/destinations/${id}`),
    enabled: id !== null,
  });
}

export function useExpiringDestinations() {
  return useQuery<DestinationWithStatus[]>({
    queryKey: ["/api/destinations/expiring"],
    queryFn: () => fetchJSON("/api/destinations/expiring"),
  });
}

export function useCreateDestination() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<RegionalDestination, "id" | "createdAt" | "updatedAt">) => {
      const res = await apiRequest("POST", "/api/destinations", data);
      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: "Failed to create destination" }));
        throw new Error(body.message);
      }
      return res.json() as Promise<RegionalDestination>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/destinations"] });
      qc.invalidateQueries({ queryKey: ["/api/destinations/expiring"] });
    },
  });
}

export function useUpdateDestination() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<RegionalDestination> }) => {
      const res = await apiRequest("PUT", `/api/destinations/${id}`, data);
      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: "Failed to update destination" }));
        throw new Error(body.message);
      }
      return res.json() as Promise<RegionalDestination>;
    },
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ["/api/destinations"] });
      qc.invalidateQueries({ queryKey: ["/api/destinations", id] });
      qc.invalidateQueries({ queryKey: ["/api/destinations/expiring"] });
    },
  });
}

export function useDeleteDestination() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/destinations/${id}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: "Failed to delete destination" }));
        throw new Error(body.message);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/destinations"] });
      qc.invalidateQueries({ queryKey: ["/api/destinations/expiring"] });
    },
  });
}
```

---

### Task 8: Create client/src/components/DestinationDialog.tsx
**File:** `client/src/components/DestinationDialog.tsx`
**Action:** create
**Details:**
Follow the exact TitleDialog.tsx pattern (useState form state, useEffect reset on open, handleField updater, handleSubmit). Import shadcn/ui Dialog, Button, Input, Label, Select components. Import `useTitles` from `@/hooks/useTitles`. Import `useCreateDestination`, `useUpdateDestination` from `@/hooks/useDestinations`.

Form state interface:
```typescript
interface FormState {
  titleId: string;        // stored as string for Select, parsed to number on submit
  countryCode: string;    // auto-uppercased, max 2 chars
  regionName: string;
  platformName: string;
  platformType: string;   // "svod" | "avod" | "tvod" | "free" | "theatrical"
  destinationUrl: string;
  ctaLabel: string;
  language: string;
  startDate: string;      // YYYY-MM-DD or ""
  endDate: string;        // YYYY-MM-DD or ""
  campaignPriority: string; // stored as string, parsed to number
  status: string;         // "active" | "inactive"
  trackingParametersTemplate: string;
}
```

Default form:
```typescript
const defaultForm: FormState = {
  titleId: "",
  countryCode: "",
  regionName: "",
  platformName: "",
  platformType: "svod",
  destinationUrl: "",
  ctaLabel: "Watch Now",
  language: "en",
  startDate: "",
  endDate: "",
  campaignPriority: "0",
  status: "active",
  trackingParametersTemplate: "",
};
```

Props interface:
```typescript
interface DestinationDialogProps {
  open: boolean;
  onClose: () => void;
  editing?: RegionalDestination | null;
  defaultTitleId?: number; // pre-selects titleId when opened from a title detail page
}
```

Key behaviours:
- In edit mode (`!!editing`): `titleId` Select is disabled (read-only display of the title)
- In create mode: `titleId` Select is enabled, populated from `useTitles()`
- `countryCode` Input: `onChange` calls `handleField("countryCode", e.target.value.toUpperCase().slice(0, 2))`
- Validation in `handleSubmit`: require `countryCode` exactly 2 chars, `platformName` non-empty, `destinationUrl` non-empty, `titleId` non-empty
- On submit: build payload — parse `titleId` to `parseInt`, `campaignPriority` to `parseInt` (default 0), convert empty strings for dates to `null`
- Call `createDestination.mutateAsync(payload)` or `updateDestination.mutateAsync({ id: editing.id, data: payload })`
- Show error string below form fields on failure

Field layout (use `grid grid-cols-2 gap-4`):
- Row 1: Title (col-span-2, Select, disabled in edit)
- Row 2: Country Code (col-span-1, Input, max 2 chars), Region Name (col-span-1, Input)
- Row 3: Platform Name (col-span-1, Input), Platform Type (col-span-1, Select: svod/avod/tvod/free/theatrical)
- Row 4: Destination URL (col-span-2, Input, type="url")
- Row 5: CTA Label (col-span-1, Input), Language (col-span-1, Input placeholder "en")
- Row 6: Start Date (col-span-1, Input type="date"), End Date (col-span-1, Input type="date")
- Row 7: Campaign Priority (col-span-1, Input type="number" min=0), Status (col-span-1, Select: active/inactive)
- Row 8: Tracking Params Template (col-span-2, Input, placeholder "utm_source=oaemarketing&utm_medium=smart_link&utm_campaign={slug}")

---

### Task 9: Create client/src/pages/DestinationsPage.tsx
**File:** `client/src/pages/DestinationsPage.tsx`
**Action:** create
**Details:**
Follow TitlesPage.tsx structure: flex-col h-full, page header, toolbar, content area.

Imports needed:
- `useState` from react
- `Globe, Plus, Pencil, Trash2, ExternalLink, AlertTriangle, X` from lucide-react
- `useDestinations`, `useDeleteDestination`, `useExpiringDestinations`, `DestinationWithStatus` from `@/hooks/useDestinations`
- `useTitles` from `@/hooks/useTitles`
- `useAuth` from `@/hooks/useAuth`
- `DestinationDialog` from `@/components/DestinationDialog`
- shadcn `Button`, `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue`
- `cn` from `@/lib/utils`
- `RegionalDestination` from `@shared/schema`

State:
```typescript
const [titleFilter, setTitleFilter] = useState<number | undefined>(undefined);
const [dialogOpen, setDialogOpen] = useState(false);
const [editing, setEditing] = useState<RegionalDestination | null>(null);
const [alertDismissed, setAlertDismissed] = useState(false);
```

Role guards:
```typescript
const canEdit = ["admin", "marketing_operator"].includes(user?.role ?? "");
const isAdmin = user?.role === "admin";
```

Flag emoji helper (inline function, not imported):
```typescript
function countryFlag(code: string): string {
  if (!code || code.length !== 2) return "";
  return String.fromCodePoint(
    ...[...code.toUpperCase()].map((c) => 127397 + c.charCodeAt(0))
  );
}
```

Computed status badge component (inline):
```typescript
function ComputedStatusBadge({ status, endDate }: { status: DestinationWithStatus["computedStatus"]; endDate: string | null }) {
  if (status === "expired") {
    return <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-red-500/10 text-red-700 dark:text-red-400 ring-1 ring-red-500/20">Expired</span>;
  }
  if (status === "expiring_soon" && endDate) {
    const days = Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000);
    return <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400 ring-1 ring-amber-500/20">Expiring in {days}d</span>;
  }
  return <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-green-500/10 text-green-700 dark:text-green-400 ring-1 ring-green-500/20">Active</span>;
}
```

Manual status badge (for stored `status` column override):
```typescript
function StatusOverrideBadge({ status }: { status: string }) {
  if (status === "inactive") {
    return <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground ring-1 ring-border">Inactive</span>;
  }
  return null; // don't show badge if active — use computedStatus instead
}
```

ExpiryAlerts sub-component (inline in this file, SESSION storage for dismiss state):
```typescript
function ExpiryAlerts({ dismissed, onDismiss }: { dismissed: boolean; onDismiss: () => void }) {
  const { data: expiring } = useExpiringDestinations();
  if (dismissed || !expiring || expiring.length === 0) return null;
  return (
    <div className="mx-6 mt-4 flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
      <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
      <p className="text-sm text-amber-700 dark:text-amber-400 flex-1">
        <span className="font-semibold">{expiring.length} destination{expiring.length !== 1 ? "s" : ""}</span> expiring within 30 days
      </p>
      <button onClick={onDismiss} className="text-amber-500/60 hover:text-amber-500 transition-colors">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
```

Table columns (use CSS grid `grid-cols-[80px_1fr_1fr_200px_140px_120px_60px_100px]`):
1. Country — `{countryFlag(d.countryCode)} {d.countryCode}`
2. Platform — `{d.platformName}` + platform type badge (small gray pill)
3. Destination URL — truncated with `truncate`, external link icon that opens in new tab
4. Deal Window — `{d.startDate ?? "Open"} → {d.endDate ?? "Ongoing"}`
5. Status — if `d.status === "inactive"` show gray "Inactive" badge, otherwise show `<ComputedStatusBadge status={d.computedStatus} endDate={d.endDate} />`
6. Priority — `{d.campaignPriority ?? 0}`
7. Actions — Edit button (requireOperator), Delete button (requireAdmin)

Delete handler:
```typescript
async function handleDelete(dest: RegionalDestination) {
  if (!window.confirm(`Delete destination for ${dest.countryCode} — ${dest.platformName}? This cannot be undone.`)) return;
  try {
    await deleteDestination.mutateAsync(dest.id);
  } catch (err: any) {
    alert(err.message ?? "Failed to delete destination");
  }
}
```

Empty state: show Globe icon + "No destinations yet" or "No destinations match the selected title".

---

### Task 10: Add insert schema for regional_destinations to shared/schema.ts
**File:** `shared/schema.ts`
**Action:** append
**Details:**
After the existing `insertClipSchema` block, add:

```typescript
export const insertDestinationSchema = createInsertSchema(regionalDestinations).pick({
  titleId: true,
  countryCode: true,
  regionName: true,
  platformName: true,
  platformType: true,
  destinationUrl: true,
  ctaLabel: true,
  language: true,
  startDate: true,
  endDate: true,
  status: true,
  campaignPriority: true,
  trackingParametersTemplate: true,
}).extend({
  campaignPriority: z.number().nullable().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
});

export type InsertDestination = z.infer<typeof insertDestinationSchema>;
```

This is optional (the page uses `Omit<RegionalDestination, ...>` directly) but provides a reusable Zod schema for future validation middleware.

---

### Task 11: Wire DestinationsPage route in App.tsx
**File:** `client/src/App.tsx`
**Action:** edit
**Details:**
This task is partially covered by Plan 03 (full nav wiring), but the minimal route replacement must happen in Wave 1 so the page renders.

Add import at top of App.tsx:
```typescript
import DestinationsPage from "@/pages/DestinationsPage";
```

Replace:
```typescript
<Route path="/destinations" component={() => <PlaceholderPage title="Destinations" />} />
```
With:
```typescript
<Route path="/destinations" component={DestinationsPage} />
```

---

### Task 12: Add "theatrical" to platform type options
**File:** `client/src/components/DestinationDialog.tsx`
**Action:** create (already included in Task 8)
**Details:**
Platform type Select options: `svod`, `avod`, `tvod`, `free`, `theatrical`. Labels: "SVOD", "AVOD", "TVOD", "Free", "Theatrical". This is inline in Task 8 — no separate file action needed. Listed here as an explicit checklist item.

---

### Task 13: Verify server/auth.ts exports requireOperator
**File:** `server/auth.ts`
**Action:** read-only verification
**Details:**
The `requireOperator` middleware must exist in `server/auth.ts` and be re-exported from `server/routes.ts` (already confirmed — line 696 of routes.ts: `export { requireAuth, requireAdmin, requireOperator, requireReviewer }`). No change needed. If `requireOperator` enforces `["admin", "marketing_operator"]`, destinations routes are correctly protected. Verify this before proceeding.

---

## Self-Check Criteria

Before marking Plan 01 complete, verify:

- [ ] `GET /api/destinations` returns array with `computedStatus` field
- [ ] `GET /api/destinations?titleId=1` filters to that title's destinations
- [ ] `GET /api/destinations/expiring` returns only destinations with endDate within 30 days, ordered by endDate ASC
- [ ] `POST /api/destinations` returns 400 if `countryCode` is not 2 chars
- [ ] `PUT /api/destinations/:id` auto-uppercases `countryCode`
- [ ] `DELETE /api/destinations/:id` requires admin role
- [ ] `/destinations` page renders table with ComputedStatusBadge
- [ ] Amber alert banner appears when expiring destinations exist
- [ ] Country flag emoji renders correctly for US, GB, CA
- [ ] DestinationDialog titleId Select is disabled in edit mode
- [ ] `GET /api/destinations/expiring` resolves before `GET /api/destinations/:id` in Express (no route collision)
- [ ] `computeDestinationStatus` returns "expiring_soon" for endDate = today+15, "expired" for endDate = yesterday, "active" for endDate = null
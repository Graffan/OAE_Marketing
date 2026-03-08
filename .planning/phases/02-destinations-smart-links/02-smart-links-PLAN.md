---
plan: 2
wave: 2
name: smart-links
goal: Build smart link backend (storage, GeoIP service, redirect endpoint, tester API) and full CRUD UI with country-based resolution preview.
estimated_tasks: 12
---

# Plan 2: Smart Links

## Goal
Add slug-based smart links with IP geolocation routing — storage functions, the GeoIP service, the public redirect endpoint (`GET /l/:slug`), the tester API (`POST /api/smart-links/:slug/preview`), a React Query hook, a create/edit dialog, and the SmartLinksPage with the inline country resolution tester panel.

## Context

### What already exists after Plan 01
- `regional_destinations` CRUD fully implemented in storage + routes
- `getDestinations`, `computeDestinationStatus` in `server/storage.ts`
- `smartLinks` table and `SmartLink` type in `shared/schema.ts` (lines 210–220, 435)
- `analyticsEvents` table in `shared/schema.ts` (lines 315–335)
- `axios` already installed (used in routes.ts for OMDb calls)
- `server/services/` directory exists (contains `dropbox.ts`)
- `/smart-links` route is not yet in App.tsx — will be added in this plan
- `useDestinations` hook and `DestinationDialog` exist from Plan 01

### Files to read before implementing
1. `server/storage.ts` — existing import block and patterns (add to it)
2. `server/routes.ts` — route registration order (add before `const server = http.createServer(app)`)
3. `server/services/dropbox.ts` — service file pattern to replicate for geoip.ts
4. `client/src/hooks/useDestinations.ts` — hook pattern from Plan 01 to replicate
5. `client/src/components/DestinationDialog.tsx` — dialog pattern from Plan 01
6. `shared/schema.ts` lines 210–220 — smartLinks column names
7. `shared/schema.ts` lines 315–335 — analyticsEvents column names

### Schema column reference (smartLinks)
`id`, `slug`, `titleId`, `defaultUrl`, `trackingParamsTemplate`, `isActive`, `createdById`, `createdAt`, `updatedAt`

### Schema column reference (analyticsEvents)
`id`, `eventType`, `clipId`, `clipPostId`, `campaignId`, `smartLinkId`, `userId`, `region`, `platform`, `metadata`, `createdAt`

---

## Tasks

### Task 1: Add smartLinks and analyticsEvents imports to server/storage.ts
**File:** `server/storage.ts`
**Action:** edit
**Details:**
Extend the existing table imports line to include `smartLinks` and `analyticsEvents`:
```typescript
import { ..., smartLinks, analyticsEvents } from "@shared/schema.js";
```
Extend the type imports to include `SmartLink` and `AnalyticsEvent`:
```typescript
import type { ..., SmartLink, AnalyticsEvent } from "@shared/schema.js";
```
No new drizzle-orm operators needed beyond those added in Plan 01.

---

### Task 2: Add generateSlug and smart link storage functions to server/storage.ts
**File:** `server/storage.ts`
**Action:** append
**Details:**
Add under a `// ─── Smart Links ───` section divider:

```typescript
// ─── Smart Links ──────────────────────────────────────────────────────────────

export function generateSlug(): string {
  return Math.random().toString(36).slice(2, 10);
}

export async function getSmartLinks(titleId?: number): Promise<SmartLink[]> {
  const query = db.select().from(smartLinks);
  return titleId
    ? query.where(eq(smartLinks.titleId, titleId)).orderBy(smartLinks.createdAt)
    : query.orderBy(smartLinks.createdAt);
}

export async function getSmartLinkById(id: number): Promise<SmartLink | undefined> {
  const result = await db.select().from(smartLinks).where(eq(smartLinks.id, id)).limit(1);
  return result[0];
}

export async function getSmartLinkBySlug(slug: string): Promise<SmartLink | undefined> {
  const result = await db.select().from(smartLinks).where(eq(smartLinks.slug, slug)).limit(1);
  return result[0];
}

export async function createSmartLink(
  data: Omit<SmartLink, "id" | "createdAt" | "updatedAt"> & { slug?: string }
): Promise<SmartLink> {
  const slug = data.slug?.trim() || generateSlug();
  // Ensure slug uniqueness — retry once on collision
  const existing = await getSmartLinkBySlug(slug);
  if (existing) {
    const retrySlug = generateSlug();
    const [created] = await db.insert(smartLinks).values({ ...data, slug: retrySlug }).returning();
    return created;
  }
  const [created] = await db.insert(smartLinks).values({ ...data, slug }).returning();
  return created;
}

export async function updateSmartLink(
  id: number,
  data: Partial<Omit<SmartLink, "id" | "slug" | "createdAt" | "updatedAt">>
): Promise<SmartLink> {
  const [updated] = await db
    .update(smartLinks)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(smartLinks.id, id))
    .returning();
  return updated;
}

export async function deleteSmartLink(id: number): Promise<void> {
  await db.delete(smartLinks).where(eq(smartLinks.id, id));
}
```

Note: `slug` is intentionally excluded from `updateSmartLink` — slugs are immutable after creation.

---

### Task 3: Add recordSmartLinkClick and resolveDestinationForCountry to server/storage.ts
**File:** `server/storage.ts`
**Action:** append
**Details:**
```typescript
export async function recordSmartLinkClick(
  smartLinkId: number,
  countryCode: string,
  resolvedUrl: string,
  isDefault: boolean
): Promise<void> {
  await db.insert(analyticsEvents).values({
    eventType: "smart_link_click",
    smartLinkId,
    region: countryCode,
    metadata: { resolvedUrl, isDefault },
  });
}

export async function resolveDestinationForCountry(
  titleId: number,
  countryCode: string
): Promise<import("@shared/schema.js").RegionalDestination | undefined> {
  const today = new Date().toISOString().slice(0, 10);
  const result = await db
    .select()
    .from(regionalDestinations)
    .where(
      and(
        eq(regionalDestinations.titleId, titleId),
        eq(regionalDestinations.countryCode, countryCode.toUpperCase()),
        eq(regionalDestinations.status, "active"),
        // startDate is null OR startDate <= today
        // endDate is null OR endDate >= today
        // Drizzle: use sql`` for OR with NULL checks
        sql`(${regionalDestinations.startDate} IS NULL OR ${regionalDestinations.startDate} <= ${today})`,
        sql`(${regionalDestinations.endDate} IS NULL OR ${regionalDestinations.endDate} >= ${today})`
      )
    )
    .orderBy(sql`${regionalDestinations.campaignPriority} DESC`)
    .limit(1);
  return result[0];
}
```

Note: `sql` is already imported from drizzle-orm (added in Plan 01 Task 1). `regionalDestinations` is also already imported.

---

### Task 4: Create server/services/geoip.ts
**File:** `server/services/geoip.ts`
**Action:** create
**Details:**
Follow the `server/services/dropbox.ts` pattern — named exports only, no default export.

```typescript
import type { Request } from "express";
import axios from "axios";

const GEOIP_TIMEOUT_MS = 5000;
const PRIVATE_IP_PREFIXES = ["127.", "10.", "192.168.", "::1", "::ffff:127."];

function isPrivateIp(ip: string): boolean {
  return PRIVATE_IP_PREFIXES.some((prefix) => ip.startsWith(prefix));
}

function extractIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded).split(",")[0].trim();
    return first;
  }
  return req.ip ?? "127.0.0.1";
}

export async function resolveCountryCode(req: Request): Promise<string> {
  // Dev override: ?country=XX on the request
  const override = req.query?.country as string | undefined;
  if (override && /^[A-Za-z]{2}$/.test(override)) {
    return override.toUpperCase();
  }

  const ip = extractIp(req);

  if (isPrivateIp(ip)) {
    console.log(`[GeoIP] private IP detected (${ip}), defaulting to US`);
    return "US";
  }

  try {
    const response = await axios.get(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=countryCode,status`,
      { timeout: GEOIP_TIMEOUT_MS }
    );
    const data = response.data as { countryCode?: string; status?: string };
    if (data.status === "success" && data.countryCode) {
      console.log(`[GeoIP] resolved countryCode=${data.countryCode} for IP=${ip}`);
      return data.countryCode;
    }
    console.warn(`[GeoIP] lookup failed for IP=${ip}, status=${data.status}`);
    return "US";
  } catch (err: any) {
    console.warn(`[GeoIP] request error for IP=${ip}: ${err.message}`);
    return "US";
  }
}
```

---

### Task 5: Add UTM helper and smart link routes to server/routes.ts
**File:** `server/routes.ts`
**Action:** edit
**Details:**

**Step A — Add to the import block at top of routes.ts:**
```typescript
import {
  getSmartLinks,
  getSmartLinkById,
  getSmartLinkBySlug,
  createSmartLink,
  updateSmartLink,
  deleteSmartLink,
  recordSmartLinkClick,
  resolveDestinationForCountry,
} from "./storage.js";
import { resolveCountryCode } from "./services/geoip.js";
```

**Step B — Add UTM helper function inside `registerRoutes` (or as a module-level function above the export):**
```typescript
function applyTrackingParams(baseUrl: string, template: string, slug: string): string {
  const params = template.replace(/\{slug\}/g, slug);
  const separator = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${separator}${params}`;
}
```

**Step C — Add routes inside `registerRoutes(app)` BEFORE `const server = http.createServer(app)`.** Registration order is critical — add in this exact sequence:

```typescript
  // ─── Smart Links public redirect ─────────────────────────────────────────────

  // GET /l/:slug — PUBLIC, no auth — IP geo → destination → 302 redirect
  // MUST be registered before any /api/smart-links routes
  app.get("/l/:slug", async (req, res) => {
    try {
      const { slug } = req.params;
      const link = await getSmartLinkBySlug(slug);
      if (!link) return res.status(404).send("Link not found");

      // If inactive, redirect to defaultUrl directly with no analytics
      if (!link.isActive) {
        return res.redirect(302, link.defaultUrl);
      }

      const countryCode = await resolveCountryCode(req);
      let resolvedUrl = link.defaultUrl;
      let isDefault = true;
      let matchedDestination = undefined;

      if (link.titleId) {
        const dest = await resolveDestinationForCountry(link.titleId, countryCode);
        if (dest) {
          resolvedUrl = dest.destinationUrl;
          isDefault = false;
          matchedDestination = dest;
        }
      }

      // Apply tracking params
      const template = link.trackingParamsTemplate ?? "utm_source=oaemarketing&utm_medium=smart_link&utm_campaign={slug}";
      const finalUrl = applyTrackingParams(resolvedUrl, template, slug);

      // Record analytics event (fire and forget)
      recordSmartLinkClick(link.id, countryCode, finalUrl, isDefault).catch((err) => {
        console.error("[SmartLink] analytics record failed:", err.message);
      });

      return res.redirect(302, finalUrl);
    } catch (err: any) {
      console.error("[SmartLink] redirect error:", err.message);
      return res.status(500).send("Internal server error");
    }
  });

  // ─── Smart Links API routes ───────────────────────────────────────────────────

  // POST /api/smart-links/:slug/preview — requireAuth — tester (no redirect, no analytics)
  // MUST be registered BEFORE GET /api/smart-links/:id
  app.post("/api/smart-links/:slug/preview", requireAuth, async (req, res) => {
    try {
      const { slug } = req.params;
      const { countryCode } = req.body as { countryCode: string };
      if (!countryCode || !/^[A-Za-z]{2}$/.test(countryCode)) {
        return res.status(400).json({ message: "countryCode must be a 2-character ISO code" });
      }

      const link = await getSmartLinkBySlug(slug);
      if (!link) return res.status(404).json({ message: "Smart link not found" });

      let resolvedUrl = link.defaultUrl;
      let isDefault = true;
      let destination = null;

      if (link.titleId) {
        const dest = await resolveDestinationForCountry(link.titleId, countryCode.toUpperCase());
        if (dest) {
          resolvedUrl = dest.destinationUrl;
          isDefault = false;
          destination = dest;
        }
      }

      const template = link.trackingParamsTemplate ?? "utm_source=oaemarketing&utm_medium=smart_link&utm_campaign={slug}";
      const trackingParams = template.replace(/\{slug\}/g, slug);
      const finalUrl = applyTrackingParams(resolvedUrl, template, slug);

      res.json({
        slug,
        titleId: link.titleId,
        countryCode: countryCode.toUpperCase(),
        resolvedUrl: finalUrl,
        destination,
        isDefault,
        trackingParams,
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // GET /api/smart-links — requireAuth, optional ?titleId= filter
  app.get("/api/smart-links", requireAuth, async (req, res) => {
    try {
      const titleId = req.query.titleId ? parseInt(req.query.titleId as string) : undefined;
      const result = await getSmartLinks(titleId);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // GET /api/smart-links/:id — requireAuth
  app.get("/api/smart-links/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const link = await getSmartLinkById(id);
      if (!link) return res.status(404).json({ message: "Smart link not found" });
      res.json(link);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // POST /api/smart-links — requireOperator
  app.post("/api/smart-links", requireOperator, async (req, res) => {
    try {
      const user = req.user as any;
      const { defaultUrl } = req.body;
      if (!defaultUrl) return res.status(400).json({ message: "defaultUrl is required" });
      const link = await createSmartLink({ ...req.body, createdById: user.id });
      res.status(201).json(link);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // PUT /api/smart-links/:id — requireOperator
  app.put("/api/smart-links/:id", requireOperator, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existing = await getSmartLinkById(id);
      if (!existing) return res.status(404).json({ message: "Smart link not found" });
      // Disallow slug modification
      const { slug: _s, id: _id, createdAt: _c, updatedAt: _u, ...updatable } = req.body;
      const updated = await updateSmartLink(id, updatable);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // DELETE /api/smart-links/:id — requireAdmin
  app.delete("/api/smart-links/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existing = await getSmartLinkById(id);
      if (!existing) return res.status(404).json({ message: "Smart link not found" });
      await deleteSmartLink(id);
      res.json({ message: "Smart link deleted" });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });
```

---

### Task 6: Create client/src/hooks/useSmartLinks.ts
**File:** `client/src/hooks/useSmartLinks.ts`
**Action:** create
**Details:**
```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchJSON, apiRequest } from "@/lib/queryClient";
import type { SmartLink, RegionalDestination } from "@shared/schema";

export function useSmartLinks(titleId?: number) {
  const url = titleId ? `/api/smart-links?titleId=${titleId}` : "/api/smart-links";
  return useQuery<SmartLink[]>({
    queryKey: ["/api/smart-links", titleId ?? null],
    queryFn: () => fetchJSON(url),
  });
}

export function useSmartLink(id: number | null) {
  return useQuery<SmartLink>({
    queryKey: ["/api/smart-links", id],
    queryFn: () => fetchJSON(`/api/smart-links/${id}`),
    enabled: id !== null,
  });
}

export type PreviewResult = {
  slug: string;
  titleId: number | null;
  countryCode: string;
  resolvedUrl: string;
  destination: RegionalDestination | null;
  isDefault: boolean;
  trackingParams: string;
};

export function usePreviewSmartLink() {
  return useMutation({
    mutationFn: async ({ slug, countryCode }: { slug: string; countryCode: string }): Promise<PreviewResult> => {
      const res = await apiRequest("POST", `/api/smart-links/${slug}/preview`, { countryCode });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: "Preview failed" }));
        throw new Error(body.message);
      }
      return res.json();
    },
  });
}

export function useCreateSmartLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<SmartLink, "id" | "createdAt" | "updatedAt"> & { slug?: string }) => {
      const res = await apiRequest("POST", "/api/smart-links", data);
      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: "Failed to create smart link" }));
        throw new Error(body.message);
      }
      return res.json() as Promise<SmartLink>;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/smart-links"] }),
  });
}

export function useUpdateSmartLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<SmartLink> }) => {
      const res = await apiRequest("PUT", `/api/smart-links/${id}`, data);
      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: "Failed to update smart link" }));
        throw new Error(body.message);
      }
      return res.json() as Promise<SmartLink>;
    },
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ["/api/smart-links"] });
      qc.invalidateQueries({ queryKey: ["/api/smart-links", id] });
    },
  });
}

export function useDeleteSmartLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/smart-links/${id}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: "Failed to delete smart link" }));
        throw new Error(body.message);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/smart-links"] }),
  });
}
```

---

### Task 7: Create client/src/components/SmartLinkDialog.tsx
**File:** `client/src/components/SmartLinkDialog.tsx`
**Action:** create
**Details:**
Follow DestinationDialog.tsx pattern. Import `useTitles`, `useCreateSmartLink`, `useUpdateSmartLink`.

Form state interface:
```typescript
interface FormState {
  titleId: string;
  slug: string;
  defaultUrl: string;
  trackingParamsTemplate: string;
  isActive: boolean;
}
```

Default form:
```typescript
const defaultForm: FormState = {
  titleId: "",
  slug: "",
  defaultUrl: "",
  trackingParamsTemplate: "utm_source=oaemarketing&utm_medium=smart_link&utm_campaign={slug}",
  isActive: true,
};
```

Props:
```typescript
interface SmartLinkDialogProps {
  open: boolean;
  onClose: () => void;
  editing?: SmartLink | null;
}
```

Key behaviours:
- `slug` field: in create mode, show editable Input with a "Generate" button next to it. Clicking "Generate" sets `form.slug` to a client-side generated value: `Math.random().toString(36).slice(2, 10)`. Shows placeholder `"Auto-generated if blank"`.
- In edit mode: `slug` field is read-only (`disabled`). Show as static text in a muted box.
- `isActive` field: render as a `<label>` with an `<input type="checkbox">` (or shadcn Checkbox). Not a Select.
- `titleId` Select: enabled in create, disabled in edit.
- Validation: `defaultUrl` required, non-empty.
- On submit: parse `titleId` to `parseInt` or `null` if empty, send `slug` field value (may be empty — server generates if empty).

Field layout:
- Row 1: Title (col-span-2, Select)
- Row 2: Slug (col-span-1 with Generate button inline), isActive checkbox (col-span-1, right-aligned label)
- Row 3: Default URL (col-span-2, Input type="url", required)
- Row 4: Tracking Params Template (col-span-2, Input, placeholder shows default template)
- Note in UI: small `<p className="text-xs text-muted-foreground">Use {slug} as a placeholder — it will be replaced with the actual slug at redirect time.</p>`

---

### Task 8: Create client/src/pages/SmartLinksPage.tsx
**File:** `client/src/pages/SmartLinksPage.tsx`
**Action:** create
**Details:**
Two-panel layout: left = table (flex-1), right = tester panel (w-80 border-l, sticky).

Imports:
- `useState` from react
- `Link2, Plus, Copy, Pencil, Trash2, FlaskConical, Check` from lucide-react
- `useSmartLinks`, `useDeleteSmartLink`, `usePreviewSmartLink`, `PreviewResult` from `@/hooks/useSmartLinks`
- `useTitles` from `@/hooks/useTitles`
- `useAuth` from `@/hooks/useAuth`
- `SmartLinkDialog` from `@/components/SmartLinkDialog`
- shadcn `Button`, `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue`, `Input`
- `cn` from `@/lib/utils`
- `SmartLink` from `@shared/schema`

State:
```typescript
const [dialogOpen, setDialogOpen] = useState(false);
const [editing, setEditing] = useState<SmartLink | null>(null);
const [copiedId, setCopiedId] = useState<number | null>(null);
const [testerSlug, setTesterSlug] = useState<string | null>(null);
const [testerCountry, setTesterCountry] = useState("US");
const [testerResult, setTesterResult] = useState<PreviewResult | null>(null);
const [testerError, setTesterError] = useState<string | null>(null);
```

Copy-to-clipboard handler:
```typescript
async function handleCopy(link: SmartLink) {
  const url = `${window.location.origin}/l/${link.slug}`;
  await navigator.clipboard.writeText(url);
  setCopiedId(link.id);
  setTimeout(() => setCopiedId(null), 2000);
}
```

Tester panel handler:
```typescript
async function handlePreview() {
  if (!testerSlug) return;
  setTesterError(null);
  try {
    const result = await previewLink.mutateAsync({ slug: testerSlug, countryCode: testerCountry });
    setTesterResult(result);
  } catch (err: any) {
    setTesterError(err.message ?? "Preview failed");
    setTesterResult(null);
  }
}
```

Table columns (grid `grid-cols-[160px_1fr_1fr_80px_120px_120px]`):
1. Slug — `<code className="font-mono text-xs">{link.slug}</code>` + Copy button (check icon after copy)
2. Title — title name (look up from `useTitles` by `link.titleId`)
3. Default URL — truncated, `title` attribute with full URL
4. Active — green "Active" badge or gray "Inactive" badge based on `link.isActive`
5. Created — `link.createdAt` formatted as `MMM D, YYYY`
6. Actions — Test button (sets `testerSlug = link.slug`, scrolls tester panel into view), Edit button (canEdit), Delete button (isAdmin)

Tester panel (right side, always visible on desktop):
```
Title: "Link Tester"
Slug selector: show currently selected slug or "— select a link to test —" placeholder
Country input: Select with common options + manual text input option
  Common options: US, GB, CA, AU, DE, FR, JP, BR, MX, IN, ES, KR
  Manual: text input below the select showing "Or type a 2-letter code:"
"Preview" button → calls handlePreview
Result card (shown after successful preview):
  - "Resolved URL:" (monospace, truncated)
  - "Country:" {testerCountry}
  - "Matched Platform:" {testerResult.destination?.platformName ?? "No match (using default)"}
  - "Using Default:" badge if isDefault
  - "Copy resolved URL" button
Error: red text if testerError
```

Delete handler:
```typescript
async function handleDelete(link: SmartLink) {
  if (!window.confirm(`Delete smart link "/${link.slug}"? This cannot be undone.`)) return;
  try {
    await deleteLink.mutateAsync(link.id);
    if (testerSlug === link.slug) setTesterSlug(null);
  } catch (err: any) {
    alert(err.message ?? "Failed to delete");
  }
}
```

---

### Task 9: Add Smart Links route to App.tsx
**File:** `client/src/App.tsx`
**Action:** edit
**Details:**
Add import:
```typescript
import SmartLinksPage from "@/pages/SmartLinksPage";
```

Add route inside the authenticated Switch (after `/destinations` route):
```typescript
<Route path="/smart-links" component={SmartLinksPage} />
```

Also add "Smart Links" nav item to the `navItems` array in the `Sidebar` function. Insert it after the Destinations entry. Requires `Link2` icon (add to lucide-react import at top of App.tsx):
```typescript
{ href: "/smart-links", label: "Smart Links", icon: Link2, roles: OPERATOR_AND_ABOVE },
```

Note: Full nav wiring (active state, icon) is finalized in Plan 03. This task just ensures the route resolves.

---

### Task 10: Add insertSmartLinkSchema to shared/schema.ts
**File:** `shared/schema.ts`
**Action:** append
**Details:**
After the `insertDestinationSchema` added in Plan 01 (or after `insertClipSchema` if Plan 01 Task 10 was skipped):

```typescript
export const insertSmartLinkSchema = createInsertSchema(smartLinks).pick({
  slug: true,
  titleId: true,
  defaultUrl: true,
  trackingParamsTemplate: true,
  isActive: true,
  createdById: true,
}).extend({
  slug: z.string().min(1).max(20).optional(),
  titleId: z.number().nullable().optional(),
});

export type InsertSmartLink = z.infer<typeof insertSmartLinkSchema>;
```

---

### Task 11: Verify route registration order in server/routes.ts
**File:** `server/routes.ts`
**Action:** read-only verification
**Details:**
After implementing Task 5, confirm the following Express route registration order is correct:

1. `GET /l/:slug` — public redirect (must be first)
2. `POST /api/smart-links/:slug/preview` — tester (before `:id` route)
3. `GET /api/smart-links` — list
4. `GET /api/smart-links/:id` — single
5. `POST /api/smart-links` — create
6. `PUT /api/smart-links/:id` — update
7. `DELETE /api/smart-links/:id` — delete

If `POST /api/smart-links/:slug/preview` were registered after `GET /api/smart-links/:id`, Express would not confuse them (different methods), but maintaining this order is a safety measure.

Also verify destination routes from Plan 01 remain: `GET /api/destinations/expiring` before `GET /api/destinations/:id`.

---

### Task 12: Manual smoke test checklist
**File:** N/A
**Action:** verification
**Details:**
Run in dev (`npm run dev` with port 5003):

```bash
# Create a smart link via UI, note the slug (e.g. "abc12345")

# Test public redirect (US default — dev server is private IP)
curl -I http://localhost:5003/l/abc12345
# Expect: HTTP/1.1 302 Found + Location header

# Test country override
curl -I "http://localhost:5003/l/abc12345?country=GB"
# Expect: 302 to GB destination if exists, otherwise defaultUrl

# Test preview endpoint
curl -X POST http://localhost:5003/api/smart-links/abc12345/preview \
  -H "Content-Type: application/json" \
  -b "sessionId=..." \
  -d '{"countryCode":"CA"}'
# Expect: JSON with resolvedUrl, destination, isDefault

# Test inactive link
# Set link isActive=false, then:
curl -I http://localhost:5003/l/abc12345
# Expect: 302 to defaultUrl (no analytics)
```

---

## Self-Check Criteria

Before marking Plan 02 complete, verify:

- [ ] `GET /l/:slug` returns 302 with `Location` header
- [ ] `GET /l/:slug?country=GB` resolves UK destination if one exists for the title
- [ ] `GET /l/:slug` for inactive link redirects to `defaultUrl` without recording analytics
- [ ] `GET /l/:slug` for unknown slug returns 404
- [ ] `POST /api/smart-links/:slug/preview` returns JSON with `resolvedUrl`, `isDefault`, `destination`
- [ ] `POST /api/smart-links` auto-generates slug when field is blank
- [ ] `PUT /api/smart-links/:id` does not allow slug to be changed
- [ ] `analyticsEvents` row is inserted with `eventType="smart_link_click"` on each redirect
- [ ] GeoIP falls back to "US" for private/localhost IPs
- [ ] SmartLinksPage tester panel shows resolution result after "Preview"
- [ ] Copy button copies `{origin}/l/{slug}` to clipboard and shows check icon briefly
- [ ] SmartLinkDialog slug field is read-only in edit mode
- [ ] `/smart-links` route renders SmartLinksPage
- [ ] `trackingParamsTemplate` with `{slug}` placeholder is correctly replaced at redirect time
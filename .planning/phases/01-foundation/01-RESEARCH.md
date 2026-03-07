# Phase 1 Research: Foundation

**Phase:** 1 — Foundation
**Goal:** Core data models, auth, title catalog, Dropbox sync, clip library
**Research Date:** 2026-03-07

---

## Stack Patterns (from VFXTracker)

### File Structure to Replicate

```
oae-marketing/
  shared/
    schema.ts              # All Drizzle table definitions + Zod insert schemas + TS types
  server/
    db.ts                  # Pool + Drizzle instance (shared by ORM, session store, raw queries)
    index.ts               # Express bootstrap: helmet, rate limiters, session, passport.init, vite/static
    routes.ts              # All route handlers + passport config + auth/role middleware
    storage.ts             # All DB functions (pure async, no Express types)
    seed.ts                # Admin user + app settings seed (idempotent)
    vite.ts                # Vite dev middleware / static serve helper
  client/
    index.html
    src/
      App.tsx              # Sidebar, ThemeToggle, Layout, AuthGuard, Switch/Route tree
      main.tsx             # ReactDOM.createRoot, QueryClientProvider, ThemeProvider
      index.css            # Tailwind directives + CSS variable overrides
      hooks/
        useAuth.ts         # React Query over /api/auth/me, login/logout mutations
        useSettings.ts     # React Query over /api/settings, injects CSS vars on change
      lib/
        queryClient.ts     # QueryClient, fetchJSON<T>, apiRequest helpers
        utils.ts           # cn(), formatDate() etc
      components/
        ui/                # shadcn/ui primitives (button, input, dialog, select, tabs, card, badge...)
      pages/
        LoginPage.tsx
        AdminPage.tsx
        ...
  drizzle.config.ts        # Points to shared/schema.ts, dialect postgresql
  vite.config.ts           # @/ alias → client/src, @shared/ alias → shared/
  tsconfig.json            # Includes client/src, shared, server; paths for @/ and @shared/
  package.json             # type: module, ESM scripts
  .env.example
```

### Key Scaffold Decisions Confirmed in VFXTracker

- **Monorepo (single package.json):** Server and client coexist. No workspaces — just path aliases.
- **`type: "module"` in package.json:** All files use ESM. Server entry uses `tsx` to run TS directly.
- **`@shared/*` alias:** Shared schema types used on both server (via tsx) and client (via Vite alias). No compilation step needed during dev.
- **Server entry (`server/index.ts`):** Bootstraps in order: env check → helmet → rate limiters → json middleware → session → request logger → `registerRoutes(app)` → error handler → Vite dev or static serve → `server.listen`.
- **`registerRoutes` returns `http.Server`:** The server is created inside `registerRoutes` (`createServer(app)`) and returned so `server.listen` can be called in index.ts. Vite dev server also needs the raw http.Server for HMR websocket upgrade.
- **Passport bootstrapped inside `registerRoutes`:** `passport.use(new LocalStrategy(...))`, `passport.serializeUser`, `passport.deserializeUser`, `app.use(passport.initialize())`, `app.use(passport.session())` all live in routes.ts.
- **Single `db.ts`:** Exports both `pool` (pg Pool) and `db` (Drizzle). The pool is reused for `connect-pg-simple` session store.
- **Session:** `connect-pg-simple` with `createTableIfMissing: true`. Cookie: httpOnly, 8-hour maxAge, sameSite configurable via env. Session ID regenerated after login to prevent session fixation.
- **Build:** `vite build` (client) + `esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist`

### Dev Script Pattern

```json
"dev": "NODE_ENV=development tsx --env-file=.env server/index.ts",
"build": "vite build && esbuild server/index.ts ...",
"start": "NODE_ENV=production node dist/index.js",
"db:push": "drizzle-kit push --config=drizzle.config.ts",
"db:seed": "tsx --env-file=.env server/seed.ts"
```

### Required .env Variables

```
DATABASE_URL=postgresql://admin:oaeadmin2024@localhost:5432/oae_marketing
SESSION_SECRET=<openssl rand -hex 32>
SESSION_COOKIE_SECURE=false
SESSION_COOKIE_SAMESITE=lax
TRUST_PROXY=1
NODE_ENV=development
PORT=5003
OMDB_API_KEY=<key>
DROPBOX_APP_KEY=<key>
DROPBOX_APP_SECRET=<key>
DROPBOX_REFRESH_TOKEN=<token>
```

---

## Drizzle Schema Design

### Pattern from VFXTracker

- Each table: `pgTable("snake_case_name", { ... })` with trailing `(t) => [index(...), unique(...)]` as second arg.
- Primary keys: `serial("id").primaryKey()`
- Foreign keys: `.references(() => otherTable.id, { onDelete: "cascade" | "set null" })`
- Timestamps: `timestamp("created_at").defaultNow()` and `timestamp("updated_at").defaultNow()`
- JSON columns: `json("field_name").$type<TypeName>()` for arrays/objects
- Insert schemas: `createInsertSchema(table).pick({ ... }).extend({ ... })` — extend to override nullable optionals with `z.string().nullable().optional()`
- Types exported at bottom: `export type Foo = typeof foos.$inferSelect`

### The 9 Tables for OAE_Marketing

**1. users**
```
id, username (unique), email (unique), password, first_name, last_name,
role (admin|marketing_operator|reviewer|executive|freelancer), is_active,
created_at, updated_at
```
Role values differ from VFXTracker — define as const array for TS narrowing.

**2. app_settings** (singleton, id=1)
```
id, company_name, app_title, logo_url, accent_color,
omdb_api_key,
claude_api_key, claude_model, openai_api_key, openai_model,
deepseek_api_key, deepseek_model,
ai_primary_provider, ai_fallback_order (json string[]),
ai_daily_token_cap, ai_per_user_cap,
smtp_host, smtp_port, smtp_user, smtp_password, smtp_from_email, smtp_from_name, smtp_tls,
updated_at
```
Note: AI provider config lives here, not in a separate table — avoids joins for simple reads.

**3. titles**
```
id, title_name (unique), status (active|archived|upcoming),
release_year, runtime_minutes, genre, subgenre,
synopsis_short, synopsis_long, marketing_positioning, key_selling_points (text),
mood, trailer_links (json string[]), awards_festivals (text),
spoiler_guidelines, approved_brand_voice_notes,
omdb_imdb_id, omdb_poster_url, omdb_imdb_rating, omdb_director, omdb_actors, omdb_plot,
created_by_id → users, created_at, updated_at
```

**4. projects** (marketing projects, one per title+campaign-period)
```
id, title_id → titles (cascade), project_name, status (active|paused|archived),
dropbox_account_id, dropbox_root_folder_path, dropbox_viral_clips_folder_path,
dropbox_cursor (text — for list_folder/continue pagination state),
last_synced_at, sync_status (idle|syncing|error), sync_error_message,
folder_trailers, folder_posters, folder_stills, folder_subtitles, folder_press (each text, optional),
created_by_id → users, created_at, updated_at
```
`dropbox_cursor` stored here enables incremental sync with `list_folder/continue`.

**5. assets** (general non-clip assets: trailers, posters, stills, subtitles, press)
```
id, project_id → projects (cascade), title_id → titles,
asset_type (trailer|poster|still|subtitle|press|other),
filename, dropbox_path, dropbox_file_id, file_size_bytes, mime_type,
thumbnail_url, preview_url, is_available (bool — false if deleted from Dropbox),
created_at, updated_at
```

**6. clips** (viral clip library — the core of Phase 1)
```
id, project_id → projects (cascade), title_id → titles,
filename, dropbox_path, dropbox_file_id, file_size_bytes, mime_type,
duration_seconds (decimal), orientation (horizontal|vertical|square),
thumbnail_url, preview_url,
status (new|awaiting_review|approved|rejected|scheduled|posted|archived),
hook_type, theme, character_focus, spoiler_level (none|mild|moderate|heavy),
intensity_level (low|medium|high|extreme), platform_fit (json string[]),
allowed_regions (json string[]), restricted_regions (json string[]),
embargo_date (date),
posted_count (int default 0), engagement_score (decimal),
last_posted_at (timestamp), approved_by_id → users, approved_at,
is_available (bool — false if deleted from Dropbox),
distributor_notes,
created_at, updated_at
```

**7. clip_posts** (used in Phase 3 rotation, but schema defined in Phase 1)
```
id, clip_id → clips (cascade), campaign_id → campaigns (set null),
platform, region, posted_at, posted_by_id → users,
caption_used (text), cta_used, smart_link_id → smart_links (set null),
impressions, plays, completion_rate, likes, comments, shares, saves, click_throughs,
engagement_score_at_post (decimal), notes,
created_at
```

**8. campaigns** (Phase 4 primarily, but referenced by clips/posts so define schema now)
```
id, title_id → titles (cascade), project_id → projects (cascade),
campaign_name, goal (awareness|engagement|trailer|watch_now),
status (draft|ai_generated|awaiting_approval|approved|scheduled|active|completed),
template_type, target_regions (json string[]),
clip_ids (json int[]),
smart_link_id → smart_links (set null),
brief_text, ai_provider_used, ai_model_used, ai_tokens_used,
created_by_id → users, approved_by_id → users, approved_at,
created_at, updated_at
```

**9. analytics_events** (Phase 5 primarily, but schema upfront)
```
id, event_type (clip_view|clip_post|link_click|campaign_start|...),
clip_id → clips (set null), clip_post_id → clip_posts (set null),
campaign_id → campaigns (set null), smart_link_id → smart_links (set null),
user_id → users (set null),
region, platform, metadata (json),
created_at
```

Additionally needed (Phase 2 forward but define schema now):
**smart_links**, **regional_destinations** — define minimal schema to avoid migration pain.

**smart_links:**
```
id, slug (unique), title_id → titles, default_url,
tracking_params_template (text), is_active, created_by_id → users, created_at, updated_at
```

**regional_destinations:**
```
id, title_id → titles (cascade), country_code, region_name, platform_name,
platform_type (svod|avod|tvod|theatrical|other), destination_url,
cta_label, language, start_date, end_date,
status (active|expiring_soon|expired|missing), campaign_priority (int),
tracking_parameters_template, created_at, updated_at
```

### Insert Schema Pattern

```typescript
export const insertClipSchema = createInsertSchema(clips).pick({
  projectId: true, titleId: true, filename: true, dropboxPath: true,
  // ... other fields
}).extend({
  durationSeconds: z.string().nullable().optional(),
  platformFit: z.array(z.string()).nullable().optional(),
  embargoDate: z.string().nullable().optional(),
});

export type Clip = typeof clips.$inferSelect;
export type InsertClip = z.infer<typeof insertClipSchema>;
```

---

## OMDb Integration

### API Endpoint

```
GET http://www.omdbapi.com/?apikey={key}&t={title}&y={year}
GET http://www.omdbapi.com/?apikey={key}&i={imdbId}
```

### Response Fields to Map

| OMDb Field | titles table column |
|------------|---------------------|
| `Title` | `title_name` (confirm/override) |
| `Year` | `release_year` |
| `Runtime` | `runtime_minutes` (parse "142 min" → 142) |
| `Genre` | `genre` (first value) |
| `Director` | `omdb_director` |
| `Actors` | `omdb_actors` |
| `Plot` | `omdb_plot`, seed `synopsis_short` |
| `Poster` | `omdb_poster_url` |
| `imdbRating` | `omdb_imdb_rating` |
| `imdbID` | `omdb_imdb_id` |

### Integration Flow (Two-Step)

1. **Search step:** POST `/api/titles/omdb-search?q={name}` — call OMDb, return raw result for user to confirm. Do NOT save yet.
2. **Confirm step:** POST `/api/titles` with `{ ...manualFields, omdbConfirmed: true, omdbData: {...} }` — server merges OMDb data with user-provided fields, creates title record.

This avoids polluting the DB with unconfirmed imports.

### OMDb API Key Storage

Store in `app_settings.omdb_api_key`. Fetch from DB in the route handler. Admin sets it once in the Admin panel. This is consistent with how VFXTracker stores SMTP credentials in app_settings.

### Runtime Parsing

```typescript
function parseRuntime(runtime: string): number | null {
  const match = runtime?.match(/(\d+)/);
  return match ? parseInt(match[1]) : null;
}
```

### Rate Limit / Error Handling

OMDb free tier: 1,000 requests/day. On `Response: "False"` or `Error: "Movie not found!"`, return a structured error to the client. Wrap in try/catch, log errors, never throw to client.

---

## Dropbox SDK Integration

### Authentication Approach

**Use App Folder + Long-Lived Refresh Token (not OAuth per-user):**
- OAE_Marketing is a single-tenant internal tool. One Dropbox account (the company account) owns the folder.
- Generate a refresh token once via OAuth2 PKCE flow in the browser, store in `.env` as `DROPBOX_REFRESH_TOKEN`.
- The `dropbox` npm package handles token refresh automatically with `refreshAccessToken()`.
- Store `DROPBOX_APP_KEY`, `DROPBOX_APP_SECRET`, `DROPBOX_REFRESH_TOKEN` in `.env` / `app_settings`.

**If per-project OAuth is needed later (multi-account):** Store `access_token` + `refresh_token` per project row in the DB, refresh on demand.

### NPM Package

```
npm install dropbox
```

```typescript
import { Dropbox } from "dropbox";

const dbx = new Dropbox({
  clientId: process.env.DROPBOX_APP_KEY,
  clientSecret: process.env.DROPBOX_APP_SECRET,
  refreshToken: process.env.DROPBOX_REFRESH_TOKEN,
});
```

### Folder Listing (Initial Sync)

```typescript
// Initial list — gets first page
const result = await dbx.filesListFolder({ path: project.dropboxViralClipsFolderPath, recursive: false });
const entries = result.result.entries;
let cursor = result.result.cursor;

// Paginate
while (result.result.has_more) {
  const cont = await dbx.filesListFolderContinue({ cursor });
  entries.push(...cont.result.entries);
  cursor = cont.result.cursor;
}

// Store cursor in projects table for incremental sync
await db.update(projects).set({ dropboxCursor: cursor }).where(eq(projects.id, projectId));
```

### Incremental Sync (Polling Fallback)

```typescript
// Use stored cursor for "what changed since last sync"
const result = await dbx.filesListFolderContinue({ cursor: project.dropboxCursor });
// Process added/modified/deleted entries
// Update cursor
```

### Thumbnail Generation

```typescript
const thumbResult = await dbx.filesGetThumbnailV2({
  resource: { ".tag": "path", path: entry.path_lower },
  format: { ".tag": "jpeg" },
  size: { ".tag": "w640h480" },
});
// thumbResult.result.thumbnail is a Buffer — store as base64 data URL or upload to local /uploads/
```

### Webhook vs Polling

- **Webhook-first (recommended):** Dropbox sends POST to `/api/dropbox/webhook` when a watched folder changes. Endpoint verifies `X-Dropbox-Signature` header (HMAC-SHA256 of body using app secret). Triggers incremental sync using stored cursor.
- **Polling fallback:** Run a `setInterval` (10 min) or `cron` that calls `filesListFolderContinue` for all active projects. Simpler to implement in Phase 1 — add webhook in Phase 2 polish.
- **Phase 1 recommendation:** Implement polling loop + manual "Sync Now" button. Webhook can be added later.

### Entry Processing

For each `FileMetadataReference` entry from Dropbox:
- Filter by mime type or extension to identify video files (`.mp4`, `.mov`, `.m4v`)
- Check if `clips` record with matching `dropbox_file_id` already exists (avoid duplicates)
- Insert new clip with `status: "new"`, populate `filename`, `dropbox_path`, `dropbox_file_id`, `file_size_bytes`
- Schedule thumbnail fetch (async after insert)
- For deleted entries (`.tag === "deleted"`): set `is_available = false` on matching clip

### Sync State Machine

```
project.sync_status: idle → syncing → idle | error
project.last_synced_at: updated on completion
project.sync_error_message: populated on error, cleared on success
```

Run sync in background — POST `/api/projects/:id/sync` returns `{ status: "started" }` immediately, sync runs async.

---

## Auth & Roles

### Passport.js Local Strategy (exact VFXTracker pattern)

```typescript
// In registerRoutes():
passport.use(new LocalStrategy(async (username, password, done) => {
  const user = await getUserByUsername(username);
  if (!user) return done(null, false, { message: "Invalid credentials" });
  if (!user.isActive) return done(null, false, { message: "Account is deactivated" });
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return done(null, false, { message: "Invalid credentials" });
  return done(null, user);
}));

passport.serializeUser((user: any, done) => done(null, user.id));
passport.deserializeUser(async (id: number, done) => {
  const user = await getUserById(id);
  if (!user || !user.isActive) return done(null, false);
  done(null, user);
});

app.use(passport.initialize());
app.use(passport.session());
```

### Login Route (session fixation prevention)

```typescript
app.post("/api/auth/login", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) return next(err);
    if (!user) return res.status(401).json({ message: info?.message ?? "Invalid credentials" });
    req.logIn(user, (err) => {
      if (err) return next(err);
      req.session.regenerate((err) => {
        if (err) return next(err);
        (req.session as any).passport = { user: user.id };
        req.session.save((err) => {
          if (err) return next(err);
          const { password: _, ...safeUser } = user;
          res.json(safeUser);
        });
      });
    });
  })(req, res, next);
});
```

### Role Definitions for OAE_Marketing

```typescript
export const ROLES = ["admin", "marketing_operator", "reviewer", "executive", "freelancer"] as const;
export type UserRole = (typeof ROLES)[number];

// Role capabilities:
// admin           → full access + admin panel + all settings
// marketing_operator → create/edit titles, projects, clips, campaigns; no admin panel
// reviewer        → approve/reject clips and campaigns; no create/edit
// executive       → read-only access; view analytics, campaigns, dashboard
// freelancer      → assigned clips only (subset of clip library)
```

### Middleware Functions (routes.ts)

```typescript
function requireAuth(req, res, next) { ... }  // 401 if not logged in

function requireAdmin(req, res, next) { ... }  // 403 unless admin

function requireOperator(req, res, next) {      // admin or marketing_operator
  if (!["admin", "marketing_operator"].includes(user?.role)) return 403;
}

function requireReviewer(req, res, next) {      // admin, marketing_operator, reviewer
  if (!["admin", "marketing_operator", "reviewer"].includes(user?.role)) return 403;
}
```

### GET /api/auth/me Route

Returns `{ id, username, email, firstName, lastName, role, isActive }` without password field. Returns 401 if not authenticated. This is polled by `useAuth` hook on every page load (staleTime: 5 minutes).

---

## UI Patterns

### Page Structure (from ProjectListPage.tsx)

```tsx
// Standard page layout
<div className="flex flex-col h-full">
  {/* Page header */}
  <div className="flex items-center justify-between px-8 py-6 border-b border-border/50">
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
    </div>
    <Button onClick={...}><Plus className="h-4 w-4" /> New {Thing}</Button>
  </div>
  {/* Content */}
  <div className="flex-1 overflow-auto p-8">...</div>
</div>
```

### Loading State Pattern

```tsx
if (isLoading) return (
  <div className="flex h-full items-center justify-center">
    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
  </div>
);
```

### Create/Edit Dialog Pattern

```tsx
<Dialog open={open} onOpenChange={(v) => !v && onClose()}>
  <DialogContent className="sm:max-w-[480px]">
    <DialogHeader>
      <DialogTitle>{editing ? "Edit" : "Create"} {Thing}</DialogTitle>
    </DialogHeader>
    <div className="space-y-4 py-2">
      <div className="space-y-1.5">
        <Label htmlFor="field">Field Label</Label>
        <Input id="field" value={form.field} onChange={(e) => setForm({ ...form, field: e.target.value })} />
      </div>
      {/* Select */}
      <div className="space-y-1.5">
        <Label>Role</Label>
        <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Admin</SelectItem>
            ...
          </SelectContent>
        </Select>
      </div>
    </div>
    <DialogFooter>
      <Button variant="outline" onClick={onClose}>Cancel</Button>
      <Button onClick={handleSubmit} disabled={mutation.isPending}>
        {mutation.isPending ? "Saving..." : "Save"}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Data Table (VFXTracker uses custom tables, not TanStack Table)

```tsx
{/* Simple div-based table — no external table library */}
<div className="border border-border/50 rounded-xl overflow-hidden">
  {/* Header */}
  <div className="grid grid-cols-[...] px-4 py-2.5 bg-muted/30 border-b border-border/50 text-xs font-medium text-muted-foreground uppercase tracking-wide">
    <span>Name</span>
    <span>Status</span>
    <span>Actions</span>
  </div>
  {/* Rows */}
  {items.map((item) => (
    <div key={item.id} className="grid grid-cols-[...] px-4 py-3 border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
      ...
    </div>
  ))}
</div>
```

### Badge / Status Pattern (from AdminPage.tsx)

```tsx
// Custom badge-like spans, not the shadcn Badge component for status
<span className={cn(
  "inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full",
  role === "admin" ? "bg-violet-500/10 text-violet-400 border border-violet-500/20" : "..."
)}>
  <Icon className="h-3 w-3" />
  {label}
</span>
```

### Tabs (Admin panel pattern)

```tsx
<Tabs defaultValue="users">
  <TabsList className="border-b border-border/50 rounded-none bg-transparent w-full justify-start gap-1 h-auto px-8">
    <TabsTrigger value="users" className="...">Users</TabsTrigger>
    <TabsTrigger value="settings" className="...">Settings</TabsTrigger>
  </TabsList>
  <TabsContent value="users" className="p-8">...</TabsContent>
  <TabsContent value="settings" className="p-8">...</TabsContent>
</Tabs>
```

### React Query Data Fetching

```tsx
// Read
const { data: titles = [], isLoading } = useQuery<Title[]>({
  queryKey: ["/api/titles"],
  queryFn: () => fetchJSON("/api/titles"),
});

// Write
const createMutation = useMutation({
  mutationFn: (data: InsertTitle) => apiRequest("POST", "/api/titles", data).then(r => r.json()),
  onSuccess: () => {
    qc.invalidateQueries({ queryKey: ["/api/titles"] });
    setOpen(false);
  },
});
```

### Role-Gated UI (inline, no separate hook needed)

```tsx
const { user } = useAuth();
const canEdit = ["admin", "marketing_operator"].includes(user?.role ?? "");
const canApprove = ["admin", "marketing_operator", "reviewer"].includes(user?.role ?? "");

// In JSX:
{canEdit && <Button onClick={handleEdit}>Edit</Button>}
{canApprove && <Button onClick={handleApprove}>Approve</Button>}
```

### Clip Library Specific UI

For the clip library grid (unlike VFXTracker's row-based shot list), use a CSS grid card layout:
```tsx
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
  {clips.map((clip) => <ClipCard key={clip.id} clip={clip} />)}
</div>
```

Each `ClipCard` shows: thumbnail (or placeholder), filename, status badge, duration, orientation icon, approve/reject buttons.

Bulk actions toolbar: conditionally shown when `selectedClips.length > 0`. Use `useState<Set<number>>` for selected IDs.

---

## Key Pitfalls

### 1. `type: "module"` + CommonJS packages

pg, bcrypt, and connect-pg-simple are CJS packages. VFXTracker handles this:
- `server/db.ts` uses `import pkg from "pg"; const { Pool } = pkg;` — explicit default import destructuring.
- `bcrypt` types installed separately: `@types/bcrypt`.
- `connect-pg-simple` works fine with `import connectPgSimple from "connect-pg-simple"`.

### 2. Drizzle decimal → string

Drizzle returns `decimal` columns as strings (not numbers) from PostgreSQL. When doing math (e.g., engagement scores), parse with `parseFloat()`. Use `z.string().nullable()` in insert schemas for decimal fields. This is why VFXTracker's shot schema uses `.extend({ estimatedHours: z.string().nullable().optional() })`.

### 3. Session regeneration after login

Always call `req.session.regenerate()` after `req.logIn()` and manually re-set `(req.session as any).passport = { user: user.id }` before `req.session.save()`. Passport does NOT do this automatically. Skipping this allows session fixation attacks.

### 4. Dropbox cursor storage

The `dropbox_cursor` in the projects table is critical for incremental sync. If it's lost or corrupted, a full re-sync is required. On initial project creation, cursor is null — first sync does a full `filesListFolder`, stores cursor. Subsequent syncs use `filesListFolderContinue` with stored cursor.

### 5. Dropbox thumbnail API is separate from list

`filesListFolder` entries include metadata but NOT thumbnails. A separate `filesGetThumbnailV2` (or `filesGetThumbnailBatch`) call is needed per file. In Phase 1, fetch thumbnails lazily or in a post-sync background job — do NOT block the sync on thumbnail fetches.

### 6. OMDb returns "N/A" for missing fields

All OMDb fields can be the string `"N/A"` instead of null. Normalize: `const clean = (v: string) => (v === "N/A" || !v) ? null : v`. Apply to all OMDb response fields before saving.

### 7. Dropbox path case sensitivity

Dropbox paths are case-insensitive but the API normalizes them to lowercase in `path_lower`. Always use `path_lower` for storage and lookups, not `path_display`.

### 8. Clip vs Asset distinction

The schema separates `clips` (viral short-form video clips, subject to rotation engine) from `assets` (trailers, posters, stills — general reference materials). Both sync from Dropbox but are indexed into different tables from different configured folders. Phase 1 only syncs the viral clips folder into `clips`; full asset library is Phase 2.

### 9. `app_settings` singleton

VFXTracker uses `id: 1` hard-coded for the single app settings row. Use the same pattern. Seed inserts with explicit `id: 1`. Routes always use `getAppSettings()` → `db.select().from(appSettings).where(eq(appSettings.id, 1)).limit(1)`.

### 10. Environment-specific CSP for Vite HMR

In development, Vite's HMR requires `'unsafe-inline'` and `'unsafe-eval'` in CSP `scriptSrc`, and `ws:` in `connectSrc`. In production, these must be removed. VFXTracker already has this `isDev` conditional — replicate exactly.

### 11. Port conflicts in the 360 Studio Suite

VFXTracker uses 5001, ADRSessionManager uses 5002. Use 5003 for OAE_Marketing. Set `PORT=5003` in `.env`.

---

## Validation Architecture

### Deliverable 1: Project Scaffold

- `npm run dev` starts without errors on port 5003
- `GET /` returns 200 (serves React app)
- `GET /api/auth/me` returns 401 (not logged in)
- TypeScript check passes: `npm run check`

### Deliverable 2: Session Auth + 5 Roles

- `POST /api/auth/login` with `admin/oaeadmin2024` returns user object with `role: "admin"`, sets session cookie
- `GET /api/auth/me` after login returns user (session persists)
- `POST /api/auth/logout` clears session; subsequent `/api/auth/me` returns 401
- Login with wrong password returns 401 with `"Invalid credentials"`
- Deactivated user login returns 401 with `"Account is deactivated"`
- Session persists across server restart (stored in `session` table in Postgres)
- Create users with each of the 5 roles; verify `requireAdmin` returns 403 for non-admin roles
- `requireOperator` allows admin and marketing_operator, blocks reviewer/executive/freelancer

### Deliverable 3: Admin Panel

- Admin can create a user → appears in `GET /api/admin/users`
- Admin can edit user role → subsequent login has new role
- Admin can deactivate user → login returns 401
- Admin can reset password → old password stops working
- Admin can save app settings (company name, accent color, OMDb key) → `GET /api/settings` reflects changes
- AI provider keys can be saved and retrieved (store encrypted or at minimum not returned in API responses)
- Non-admin accessing `/admin` in UI sees redirect or 403 error

### Deliverable 4: Titles CRUD + OMDb

- `POST /api/titles/omdb-search?q=Inception` returns raw OMDb data including poster URL and imdb rating
- OMDb result with `"N/A"` fields is normalized to null before returning
- `POST /api/titles` with confirmed OMDb data creates title with `omdb_imdb_id`, `omdb_poster_url`, `release_year`, `runtime_minutes` populated
- `GET /api/titles` returns all titles with associated counts (clips count, campaigns count)
- `PUT /api/titles/:id` updates user-editable fields without overwriting OMDb fields
- `DELETE /api/titles/:id` removes title (cascade deletes projects, clips)
- Title with `title_name` already taken returns 409

### Deliverable 5: Projects CRUD + Dropbox Connection

- `POST /api/projects` creates a project linked to a title
- `PUT /api/projects/:id` can update `dropbox_root_folder_path`, `dropbox_viral_clips_folder_path`
- `GET /api/projects/:id` returns project with `sync_status`, `last_synced_at`, `dropbox_cursor`
- Saving an invalid Dropbox path (one that doesn't exist) results in sync error stored in `sync_error_message`

### Deliverable 6: Dropbox Sync

- `POST /api/projects/:id/sync` triggers sync and returns `{ status: "started" }`
- After sync completes, `GET /api/projects/:id/clips` returns clips indexed from Dropbox folder
- Each clip has correct `filename`, `dropbox_path`, `dropbox_file_id`, `file_size_bytes`, `status: "new"`
- Re-running sync with no changes does not create duplicate clips (idempotent by `dropbox_file_id`)
- A file deleted from Dropbox and re-synced marks the clip `is_available: false`, not deleted from DB
- `project.dropbox_cursor` is updated after sync completes
- Sync error (bad token, invalid path) sets `sync_status: "error"` and `sync_error_message`

### Deliverable 7: Clip Library UI

- Clip library page shows grid of clips with thumbnails (or placeholder), filename, status badge
- Filter by status (new/awaiting_review/approved/rejected) works
- Filter by title works (if multiple projects exist)
- Individual clip can be approved: status changes to `approved`, `approved_by_id` and `approved_at` set
- Individual clip can be rejected: status changes to `rejected`
- Bulk select works (checkbox per clip + select all)
- Bulk approve updates all selected clips
- Bulk archive updates all selected clips
- Clip detail view shows all metadata fields
- Clip metadata (hook_type, theme, platform_fit) can be edited inline or in a dialog
- Role gating: reviewer can approve/reject but not edit metadata; executive sees read-only view

### Deliverable 8: DB Schema (all 9 tables)

- `npm run db:push` applies all 9+ tables without errors
- Verify in psql: `\dt` shows `users, app_settings, titles, projects, assets, clips, clip_posts, campaigns, smart_links, regional_destinations, analytics_events`
- Foreign key constraints are correct: inserting a clip with nonexistent `project_id` returns constraint error
- Cascade deletes work: deleting a project removes its clips

### Deliverable 9: DB Seed

- `npm run db:seed` on empty DB creates admin user and app settings row
- `npm run db:seed` run twice does not error (idempotent)
- Admin can log in with `admin / oaeadmin2024`
- `GET /api/settings` returns `{ companyName: "Other Animal", appTitle: "OAE Marketing", accentColor: "#..." }`

---

## RESEARCH COMPLETE

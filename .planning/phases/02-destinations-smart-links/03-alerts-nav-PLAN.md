---
plan: 3
wave: 3
name: alerts-nav
goal: Wire sidebar navigation for Destinations and Smart Links, build the reusable ExpiryAlerts component, and replace the Dashboard placeholder with a real stat-card dashboard.
estimated_tasks: 8
---

# Plan 3: Alerts, Nav Wiring & Dashboard

## Goal
Complete Phase 2 by wiring the sidebar nav (Destinations + Smart Links active states), adding a combined `/api/destinations/alerts` endpoint, building the standalone `ExpiryAlerts` component using sessionStorage for dismissal, and replacing the `/` Dashboard placeholder with a real grid of stat cards and alerts.

## Context

### What already exists after Plans 01 and 02
- `DestinationsPage` at `/destinations` (Plan 01)
- `SmartLinksPage` at `/smart-links` (Plan 02)
- `useDestinations`, `useExpiringDestinations` hooks (Plan 01)
- `useSmartLinks` hook (Plan 02)
- `useTitles` hook (Phase 1)
- `useClips` hook (Phase 1 — verify exists at `client/src/hooks/useClips.ts`)
- Sidebar in App.tsx already has `/destinations` nav entry with `Globe` icon and `OPERATOR_AND_ABOVE` role filter
- Plan 02 Task 9 added `Link2` import and Smart Links nav item to sidebar
- `/` route currently renders `<PlaceholderPage title="Dashboard" />`
- `getTitlesWithNoActiveDestinations` storage function exists (Plan 01 Task 5)

### Files to read before implementing
1. `client/src/App.tsx` — current sidebar navItems array and route Switch
2. `client/src/hooks/useClips.ts` — verify hook API shape
3. `client/src/hooks/useDestinations.ts` — verify `useExpiringDestinations` shape
4. `server/routes.ts` — add alerts endpoint before `const server = http.createServer(app)`

### Key constraint
The sidebar active-state logic already works via:
```typescript
const active = href === "/" ? location === "/" : location.startsWith(href);
```
No change needed to this logic — it will auto-activate `/destinations` and `/smart-links` entries as soon as those route entries exist in navItems.

---

## Tasks

### Task 1: Add GET /api/destinations/alerts endpoint to server/routes.ts
**File:** `server/routes.ts`
**Action:** edit
**Details:**
Add `getTitlesWithNoActiveDestinations` to the storage import block (alongside existing destination imports from Plan 01).

Then add this route inside `registerRoutes(app)` BEFORE the existing `GET /api/destinations/expiring` route (so it resolves before `:id`). Actually — since `alerts` is a different literal segment from `expiring`, both can coexist without conflict, but register `alerts` first for clarity:

```typescript
  // GET /api/destinations/alerts — requireAuth
  // MUST be registered BEFORE /api/destinations/:id
  app.get("/api/destinations/alerts", requireAuth, async (_req, res) => {
    try {
      const [expiringDestinations, titlesWithNoDestinations] = await Promise.all([
        getExpiringDestinations(30),
        getTitlesWithNoActiveDestinations(),
      ]);
      res.json({
        expiringCount: expiringDestinations.length,
        expiringDestinations,
        titlesWithNoDestinations,
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });
```

Registration order after this change for destination-related routes:
1. `GET /api/destinations/alerts`
2. `GET /api/destinations/expiring`
3. `GET /api/destinations`
4. `GET /api/destinations/:id`
5. `POST /api/destinations`
6. `PUT /api/destinations/:id`
7. `DELETE /api/destinations/:id`

---

### Task 2: Add useDestinationAlerts hook to useDestinations.ts
**File:** `client/src/hooks/useDestinations.ts`
**Action:** edit
**Details:**
Append to the existing file:

```typescript
export type AlertsResponse = {
  expiringCount: number;
  expiringDestinations: DestinationWithStatus[];
  titlesWithNoDestinations: { id: number; titleName: string }[];
};

export function useDestinationAlerts() {
  return useQuery<AlertsResponse>({
    queryKey: ["/api/destinations/alerts"],
    queryFn: () => fetchJSON("/api/destinations/alerts"),
    staleTime: 1000 * 60 * 2, // 2-minute cache — alerts don't change often
  });
}
```

---

### Task 3: Create client/src/components/ExpiryAlerts.tsx
**File:** `client/src/components/ExpiryAlerts.tsx`
**Action:** create
**Details:**
Standalone reusable component. Uses sessionStorage to track dismissed state so alerts re-appear on browser refresh but stay dismissed within a session tab.

```typescript
import { useState, useEffect } from "react";
import { Link } from "wouter";
import { AlertTriangle, X, MapPin } from "lucide-react";
import { useDestinationAlerts } from "@/hooks/useDestinations";
import { cn } from "@/lib/utils";

interface ExpiryAlertsProps {
  compact?: boolean; // true = inline badge counts for dashboard widget
}

const SESSION_KEY = "oae_alerts_dismissed";

export default function ExpiryAlerts({ compact = false }: ExpiryAlertsProps) {
  const { data: alerts, isLoading } = useDestinationAlerts();
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(SESSION_KEY) === "true";
    } catch {
      return false;
    }
  });

  function handleDismiss() {
    setDismissed(true);
    try {
      sessionStorage.setItem(SESSION_KEY, "true");
    } catch {
      // sessionStorage unavailable — dismiss in memory only
    }
  }

  if (isLoading || !alerts) return null;

  const hasExpiring = alerts.expiringCount > 0;
  const hasMissing = alerts.titlesWithNoDestinations.length > 0;

  if (!hasExpiring && !hasMissing) return null;

  // Compact mode: small inline badge row for dashboard
  if (compact) {
    return (
      <div className="flex items-center gap-3 flex-wrap">
        {hasExpiring && (
          <Link href="/destinations" className="inline-flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 hover:underline">
            <AlertTriangle className="h-3.5 w-3.5" />
            {alerts.expiringCount} expiring soon
          </Link>
        )}
        {hasMissing && (
          <Link href="/destinations" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:underline">
            <MapPin className="h-3.5 w-3.5" />
            {alerts.titlesWithNoDestinations.length} titles without watch links
          </Link>
        )}
      </div>
    );
  }

  // Full mode: dismissible cards
  if (dismissed) return null;

  return (
    <div className="space-y-2">
      {hasExpiring && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
              {alerts.expiringCount} destination{alerts.expiringCount !== 1 ? "s" : ""} expiring within 30 days
            </p>
            <Link href="/destinations" className="text-xs text-amber-600 dark:text-amber-400/70 hover:underline">
              View expiring destinations
            </Link>
          </div>
          <button
            onClick={handleDismiss}
            className="text-amber-400/50 hover:text-amber-400 transition-colors flex-shrink-0"
            aria-label="Dismiss alert"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {hasMissing && (
        <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
          <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">
              {alerts.titlesWithNoDestinations.length} title{alerts.titlesWithNoDestinations.length !== 1 ? "s" : ""} have no active watch links configured
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {alerts.titlesWithNoDestinations.slice(0, 3).map(t => t.titleName).join(", ")}
              {alerts.titlesWithNoDestinations.length > 3 ? ` and ${alerts.titlesWithNoDestinations.length - 3} more` : ""}
            </p>
            <Link href="/destinations" className="text-xs text-muted-foreground hover:underline">
              Configure destinations
            </Link>
          </div>
          <button
            onClick={handleDismiss}
            className="text-muted-foreground/40 hover:text-muted-foreground transition-colors flex-shrink-0"
            aria-label="Dismiss alert"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
```

---

### Task 4: Create client/src/pages/DashboardPage.tsx
**File:** `client/src/pages/DashboardPage.tsx`
**Action:** create
**Details:**
Replaces the `<PlaceholderPage title="Dashboard" />` at `/`. Simple stat-card grid with alerts section below.

Imports:
- `Link` from wouter
- `Film, Video, Globe, Link2, Plus, ArrowRight` from lucide-react
- `useTitles` from `@/hooks/useTitles`
- `useClips` from `@/hooks/useClips` (verify the hook exists and its signature; if it accepts no args and returns all clips, use it directly)
- `useSmartLinks` from `@/hooks/useSmartLinks`
- `useDestinationAlerts` from `@/hooks/useDestinations`
- `ExpiryAlerts` from `@/components/ExpiryAlerts`
- `useAuth` from `@/hooks/useAuth`
- `cn` from `@/lib/utils`

Stat card component (inline):
```typescript
function StatCard({
  label,
  value,
  icon: Icon,
  href,
  loading,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  href?: string;
  loading?: boolean;
}) {
  const content = (
    <div className={cn(
      "rounded-xl border border-border bg-card p-5 flex items-center gap-4 transition-colors",
      href && "hover:bg-muted/30 cursor-pointer"
    )}>
      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-2xl font-semibold tracking-tight">
          {loading ? <span className="inline-block h-6 w-12 animate-pulse rounded bg-muted" /> : value}
        </p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
      {href && <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
    </div>
  );
  if (href) return <Link href={href}>{content}</Link>;
  return content;
}
```

Dashboard layout:
```typescript
export default function DashboardPage() {
  const { user } = useAuth();
  const { data: titles, isLoading: titlesLoading } = useTitles();
  const { data: clips, isLoading: clipsLoading } = useClips(); // adjust if hook signature differs
  const { data: smartLinks, isLoading: linksLoading } = useSmartLinks();
  const { data: alerts } = useDestinationAlerts();

  const canEdit = ["admin", "marketing_operator"].includes(user?.role ?? "");

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-5 border-b border-border">
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Overview of your marketing assets</p>
      </div>

      <div className="flex-1 overflow-auto px-6 py-6 space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Titles"
            value={titles?.length ?? 0}
            icon={Film}
            href="/titles"
            loading={titlesLoading}
          />
          <StatCard
            label="Clips"
            value={clips?.length ?? 0}
            icon={Video}
            href="/clips"
            loading={clipsLoading}
          />
          <StatCard
            label="Expiring Watch Links"
            value={alerts?.expiringCount ?? 0}
            icon={Globe}
            href="/destinations"
          />
          <StatCard
            label="Smart Links"
            value={smartLinks?.length ?? 0}
            icon={Link2}
            href="/smart-links"
            loading={linksLoading}
          />
        </div>

        {/* Alerts section */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Alerts</h2>
          <ExpiryAlerts compact={false} />
        </div>

        {/* Quick actions */}
        {canEdit && (
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Quick Actions</h2>
            <div className="flex flex-wrap gap-3">
              <Link href="/destinations">
                <button className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted/50 transition-colors">
                  <Plus className="h-4 w-4" />
                  Add Destination
                </button>
              </Link>
              <Link href="/smart-links">
                <button className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted/50 transition-colors">
                  <Plus className="h-4 w-4" />
                  New Smart Link
                </button>
              </Link>
              <Link href="/clips">
                <button className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted/50 transition-colors">
                  <Video className="h-4 w-4" />
                  Clip Library
                </button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

### Task 5: Replace Dashboard placeholder in App.tsx
**File:** `client/src/App.tsx`
**Action:** edit
**Details:**
Add import:
```typescript
import DashboardPage from "@/pages/DashboardPage";
```

Replace:
```typescript
<Route path="/" component={() => <PlaceholderPage title="Dashboard" />} />
```
With:
```typescript
<Route path="/" component={DashboardPage} />
```

---

### Task 6: Confirm sidebar nav items in App.tsx
**File:** `client/src/App.tsx`
**Action:** edit (verify and update if Plan 02 Task 9 was not fully applied)
**Details:**
The `navItems` array in the `Sidebar` function must contain the following entries (in order). Verify each exists with the correct `href`, `label`, `icon`, and `roles`:

```typescript
const navItems = [
  { href: "/",             label: "Dashboard",    icon: LayoutDashboard, roles: null },
  { href: "/titles",       label: "Titles",       icon: Film,            roles: NOT_FREELANCER },
  { href: "/clips",        label: "Clip Library", icon: Video,           roles: NOT_EXECUTIVE },
  { href: "/campaigns",    label: "Campaigns",    icon: Megaphone,       roles: REVIEWER_AND_ABOVE },
  { href: "/destinations", label: "Destinations", icon: Globe,           roles: OPERATOR_AND_ABOVE },
  { href: "/smart-links",  label: "Smart Links",  icon: Link2,           roles: OPERATOR_AND_ABOVE },
  { href: "/ai-studio",    label: "AI Studio",    icon: Sparkles,        roles: OPERATOR_AND_ABOVE },
  { href: "/analytics",    label: "Analytics",    icon: BarChart3,       roles: null },
  { href: "/admin",        label: "Admin",        icon: Settings,        roles: ADMIN_ONLY },
];
```

Also ensure `Link2` is imported from lucide-react at the top of App.tsx (alongside existing lucide imports).

---

### Task 7: Verify useClips hook signature
**File:** `client/src/hooks/useClips.ts`
**Action:** read-only verification
**Details:**
Read `client/src/hooks/useClips.ts` to confirm the hook export name and whether it accepts a filters argument. If it exports `useClips(filters?)` and returns `{ data: Clip[] }`, use `useClips()` in DashboardPage. If the hook signature differs (e.g. requires a required argument), adjust DashboardPage to call it correctly or substitute a `useQuery` call directly to `/api/clips`.

Note: The "Clips" stat card value will show total clips, no filter needed.

---

### Task 8: Final integration verification
**File:** N/A
**Action:** verification
**Details:**
After completing Tasks 1–7, verify the following manually:

Navigation:
- [ ] Sidebar shows "Destinations" (Globe icon) and "Smart Links" (Link2 icon) for admin/marketing_operator
- [ ] Sidebar does NOT show either for reviewer/executive/freelancer
- [ ] Active sidebar pill animates correctly when navigating between `/destinations` and `/smart-links`
- [ ] Dashboard stat card for "Expiring Watch Links" shows correct count from `/api/destinations/alerts`

Alerts:
- [ ] `GET /api/destinations/alerts` returns `{ expiringCount, expiringDestinations, titlesWithNoDestinations }`
- [ ] ExpiryAlerts component in full mode shows amber banner when expiring > 0
- [ ] ExpiryAlerts dismiss button hides both banners, and they stay hidden after client-side navigation (sessionStorage persists)
- [ ] ExpiryAlerts in compact mode shows inline link badges
- [ ] After browser refresh, alerts reappear (sessionStorage is session-scoped, not localStorage)

Dashboard:
- [ ] `/` renders DashboardPage (not PlaceholderPage)
- [ ] All 4 stat cards show correct counts
- [ ] Stat cards link to correct pages on click
- [ ] Quick Actions section visible to admin and marketing_operator, hidden to others
- [ ] Dashboard renders without errors when all counts are 0

---

## Self-Check Criteria

Before marking Plan 03 complete, verify:

- [ ] `GET /api/destinations/alerts` returns correct shape and is registered before `GET /api/destinations/:id`
- [ ] `useDestinationAlerts` hook correctly maps to `/api/destinations/alerts` query key
- [ ] `ExpiryAlerts` compact mode renders inline badge links, not dismissible cards
- [ ] `ExpiryAlerts` full mode dismiss button sets `sessionStorage` and hides component without page reload
- [ ] `DashboardPage` replaces PlaceholderPage at `/` route
- [ ] Dashboard loads 4 stat cards without TypeScript errors
- [ ] Sidebar navItems contains both `/destinations` and `/smart-links` with correct role gates
- [ ] `Link2` icon is properly imported in App.tsx from lucide-react
- [ ] Phase 2 is complete: destinations, smart links, redirect, geo resolution, analytics events, dashboard, nav all working
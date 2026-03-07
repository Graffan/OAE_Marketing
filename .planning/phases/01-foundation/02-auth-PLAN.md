---
plan: 02
name: auth
wave: 1
depends_on: [01-PLAN-scaffold]
files_modified:
  - server/auth.ts
  - server/routes.ts
  - server/storage.ts
  - client/src/App.tsx
  - client/src/hooks/useAuth.ts
  - client/src/hooks/useSettings.ts
  - client/src/pages/LoginPage.tsx
  - client/src/components/ui/button.tsx
  - client/src/components/ui/input.tsx
  - client/src/components/ui/label.tsx
  - client/src/components/ui/card.tsx
autonomous: true
---

# Plan 02: Auth System

## Overview

Implement Passport.js LocalStrategy session auth, role middleware, auth API routes, storage functions, useAuth hook, LoginPage, and the full App.tsx with sidebar + route tree + auth guard. After this plan, all 5 roles can log in, session persists across page reloads, and unauthenticated users are redirected to /login.

---

<task id="1-02-01" name="Create server/auth.ts">
  <description>Passport.js LocalStrategy configuration plus role middleware functions. This file is imported by server/routes.ts.</description>
  <files>server/auth.ts</files>
  <details>
    This file exports nothing — it is a setup module called for its side effects. Import and call configureAuth(app) from registerRoutes.

    Actually, following VFXTracker pattern, all Passport config lives inside registerRoutes() in routes.ts. Do NOT create a separate auth.ts — instead, implement everything directly in routes.ts. Skip this file.

    CORRECTION: Create server/auth.ts as a file that exports the middleware functions only:

    import type { Request, Response, NextFunction } from "express";

    export function requireAuth(req: Request, res: Response, next: NextFunction) {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      next();
    }

    export function requireAdmin(req: Request, res: Response, next: NextFunction) {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const user = req.user as any;
      if (user?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      next();
    }

    export function requireOperator(req: Request, res: Response, next: NextFunction) {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const user = req.user as any;
      if (!["admin", "marketing_operator"].includes(user?.role)) {
        return res.status(403).json({ message: "Operator access required" });
      }
      next();
    }

    export function requireReviewer(req: Request, res: Response, next: NextFunction) {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const user = req.user as any;
      if (!["admin", "marketing_operator", "reviewer"].includes(user?.role)) {
        return res.status(403).json({ message: "Reviewer access required" });
      }
      next();
    }
  </details>
  <automated>none</automated>
  <verify>TypeScript compiles without error</verify>
</task>

<task id="1-02-02" name="Implement server/storage.ts auth functions">
  <description>Add getUserByUsername, getUserById, and updateLastLogin to server/storage.ts. These are pure async functions with no Express types.</description>
  <files>server/storage.ts</files>
  <details>
    import { db } from "./db.js";
    import { users } from "@shared/schema.js";
    import { eq } from "drizzle-orm";
    import type { User } from "@shared/schema.js";

    export async function getUserByUsername(username: string): Promise<User | undefined> {
      const result = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);
      return result[0];
    }

    export async function getUserById(id: number): Promise<User | undefined> {
      const result = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      return result[0];
    }

    export async function updateLastLogin(userId: number): Promise<void> {
      await db
        .update(users)
        .set({ lastLoginAt: new Date(), updatedAt: new Date() })
        .where(eq(users.id, userId));
    }

    export async function getAppSettings() {
      const { appSettings } = await import("@shared/schema.js");
      const result = await db.select().from(appSettings).where(eq(appSettings.id, 1)).limit(1);
      return result[0] ?? null;
    }
  </details>
  <automated>none</automated>
  <verify>TypeScript compiles; getUserByUsername("admin") returns the seeded admin user</verify>
</task>

<task id="1-02-03" name="Implement server/routes.ts — full auth system">
  <description>Replace the stub routes.ts with full Passport.js setup, auth routes, and settings route. Keep the health check. Passport config goes inside registerRoutes(). Include session fixation prevention on login.</description>
  <files>server/routes.ts</files>
  <details>
    Full content of server/routes.ts:

    import type { Express } from "express";
    import http from "http";
    import passport from "passport";
    import { Strategy as LocalStrategy } from "passport-local";
    import bcrypt from "bcrypt";
    import { getUserByUsername, getUserById, updateLastLogin, getAppSettings } from "./storage.js";
    import { requireAuth, requireAdmin, requireOperator, requireReviewer } from "./auth.js";

    export async function registerRoutes(app: Express): Promise<http.Server> {

      // --- Passport configuration ---

      passport.use(
        new LocalStrategy(async (username, password, done) => {
          try {
            const user = await getUserByUsername(username);
            if (!user) return done(null, false, { message: "Invalid credentials" });
            if (!user.isActive) return done(null, false, { message: "Account is deactivated" });
            const valid = await bcrypt.compare(password, user.password);
            if (!valid) return done(null, false, { message: "Invalid credentials" });
            return done(null, user);
          } catch (err) {
            return done(err);
          }
        })
      );

      passport.serializeUser((user: any, done) => {
        done(null, user.id);
      });

      passport.deserializeUser(async (id: number, done) => {
        try {
          const user = await getUserById(id);
          if (!user || !user.isActive) return done(null, false);
          done(null, user);
        } catch (err) {
          done(err);
        }
      });

      app.use(passport.initialize());
      app.use(passport.session());

      // --- Health check ---

      app.get("/api/health", (_req, res) => {
        res.json({ status: "ok" });
      });

      // --- Auth routes ---

      // POST /api/auth/login
      app.post("/api/auth/login", (req, res, next) => {
        passport.authenticate("local", (err: any, user: any, info: any) => {
          if (err) return next(err);
          if (!user) {
            return res.status(401).json({ message: info?.message ?? "Invalid credentials" });
          }
          req.logIn(user, (err) => {
            if (err) return next(err);
            // Session fixation prevention: regenerate session ID after login
            req.session.regenerate((err) => {
              if (err) return next(err);
              (req.session as any).passport = { user: user.id };
              req.session.save(async (err) => {
                if (err) return next(err);
                // Update last login timestamp (fire and forget)
                updateLastLogin(user.id).catch(console.error);
                const { password: _, ...safeUser } = user;
                res.json(safeUser);
              });
            });
          });
        })(req, res, next);
      });

      // GET /api/auth/me
      app.get("/api/auth/me", (req, res) => {
        if (!req.isAuthenticated()) {
          return res.status(401).json({ message: "Not authenticated" });
        }
        const user = req.user as any;
        const { password: _, ...safeUser } = user;
        res.json(safeUser);
      });

      // POST /api/auth/logout
      app.post("/api/auth/logout", (req, res, next) => {
        req.logout((err) => {
          if (err) return next(err);
          req.session.destroy((err) => {
            if (err) return next(err);
            res.clearCookie("connect.sid");
            res.json({ message: "Logged out" });
          });
        });
      });

      // --- Settings route (public read, protected write) ---

      // GET /api/settings — public (used for branding before login)
      app.get("/api/settings", async (_req, res) => {
        try {
          const settings = await getAppSettings();
          if (!settings) return res.status(404).json({ message: "Settings not found" });
          // Never return API keys in GET /api/settings
          const {
            claudeApiKey: _c,
            openaiApiKey: _o,
            deepseekApiKey: _d,
            omdbApiKey: _omdb,
            smtpPassword: _sp,
            ...safe
          } = settings;
          res.json(safe);
        } catch (err: any) {
          res.status(500).json({ message: err.message });
        }
      });

      const server = http.createServer(app);
      return server;
    }

    // Re-export middleware for use in other route sections (plans 03–06 will add more routes to this file)
    export { requireAuth, requireAdmin, requireOperator, requireReviewer };
  </details>
  <automated>none</automated>
  <verify>
    POST /api/auth/login with {"username":"admin","password":"oaeadmin2024"} returns user object without password field and sets Set-Cookie header.
    GET /api/auth/me with session cookie returns the user.
    POST /api/auth/logout destroys session; subsequent GET /api/auth/me returns 401.
    POST /api/auth/login with wrong password returns 401 {"message":"Invalid credentials"}.
  </verify>
</task>

<task id="1-02-04" name="Create client/src/hooks/useAuth.ts">
  <description>React Query hook for auth state: useAuth returns {user, isLoading, isAuthenticated}, plus login and logout mutations.</description>
  <files>client/src/hooks/useAuth.ts</files>
  <details>
    import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
    import { fetchJSON, apiRequest } from "@/lib/queryClient";
    import type { User } from "@shared/schema";

    type SafeUser = Omit<User, "password">;

    export function useAuth() {
      const qc = useQueryClient();

      const { data: user, isLoading } = useQuery<SafeUser | null>({
        queryKey: ["/api/auth/me"],
        queryFn: async () => {
          try {
            return await fetchJSON<SafeUser>("/api/auth/me");
          } catch {
            return null;
          }
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
        retry: false,
      });

      const loginMutation = useMutation({
        mutationFn: async (credentials: { username: string; password: string }) => {
          const res = await apiRequest("POST", "/api/auth/login", credentials);
          if (!res.ok) {
            const body = await res.json().catch(() => ({ message: "Login failed" }));
            throw new Error(body.message ?? "Login failed");
          }
          return res.json() as Promise<SafeUser>;
        },
        onSuccess: (user) => {
          qc.setQueryData(["/api/auth/me"], user);
        },
      });

      const logoutMutation = useMutation({
        mutationFn: async () => {
          await apiRequest("POST", "/api/auth/logout");
        },
        onSuccess: () => {
          qc.setQueryData(["/api/auth/me"], null);
          qc.clear();
        },
      });

      return {
        user: user ?? null,
        isLoading,
        isAuthenticated: !!user,
        login: loginMutation.mutateAsync,
        loginError: loginMutation.error,
        isLoggingIn: loginMutation.isPending,
        logout: logoutMutation.mutateAsync,
      };
    }
  </details>
  <automated>none</automated>
  <verify>TypeScript compiles without error; hook returns correct shape</verify>
</task>

<task id="1-02-05" name="Create client/src/hooks/useSettings.ts">
  <description>React Query hook for app_settings. Fetches /api/settings and injects --accent-color CSS variable into document root on change.</description>
  <files>client/src/hooks/useSettings.ts</files>
  <details>
    import { useQuery } from "@tanstack/react-query";
    import { useEffect } from "react";
    import { fetchJSON } from "@/lib/queryClient";
    import type { AppSettings } from "@shared/schema";

    type PublicSettings = Omit<AppSettings, "claudeApiKey" | "openaiApiKey" | "deepseekApiKey" | "omdbApiKey" | "smtpPassword">;

    export function useSettings() {
      const { data: settings, isLoading } = useQuery<PublicSettings | null>({
        queryKey: ["/api/settings"],
        queryFn: () => fetchJSON<PublicSettings>("/api/settings"),
        staleTime: 1000 * 60 * 10, // 10 minutes
        retry: false,
      });

      useEffect(() => {
        if (settings?.accentColor) {
          document.documentElement.style.setProperty("--accent-color", settings.accentColor);
        }
      }, [settings?.accentColor]);

      return { settings, isLoading };
    }
  </details>
  <automated>none</automated>
  <verify>TypeScript compiles; accent color CSS var updates on settings load</verify>
</task>

<task id="1-02-06" name="Create shadcn/ui primitive components">
  <description>Install and create the minimum shadcn/ui components needed for LoginPage and App layout: Button, Input, Label, Card. These live in client/src/components/ui/. Use the standard shadcn file contents — do not use the CLI, write the files directly.</description>
  <files>
    client/src/components/ui/button.tsx
    client/src/components/ui/input.tsx
    client/src/components/ui/label.tsx
    client/src/components/ui/card.tsx
    client/src/components/ui/badge.tsx
    client/src/components/ui/dialog.tsx
    client/src/components/ui/select.tsx
    client/src/components/ui/tabs.tsx
    client/src/components/ui/separator.tsx
    client/src/components/ui/dropdown-menu.tsx
    client/src/components/ui/tooltip.tsx
    client/src/components/ui/toast.tsx
    client/src/components/ui/toaster.tsx
    client/src/components/ui/use-toast.ts
  </files>
  <details>
    Write each file using the standard shadcn/ui component source. These use class-variance-authority (cva), clsx, tailwind-merge, and the Radix UI primitives listed in package.json.

    button.tsx: uses cva with variants default/destructive/outline/secondary/ghost/link and sizes default/sm/lg/icon. Accepts asChild via Radix Slot.

    input.tsx: simple input with className forwarding, standard shadcn styling.

    label.tsx: Radix Label primitive with peer-disabled styles.

    card.tsx: Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter components.

    badge.tsx: cva-based badge with variants default/secondary/destructive/outline.

    dialog.tsx: full Dialog, DialogTrigger, DialogPortal, DialogOverlay, DialogClose, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription from @radix-ui/react-dialog.

    select.tsx: Select, SelectGroup, SelectValue, SelectTrigger, SelectContent, SelectLabel, SelectItem, SelectSeparator from @radix-ui/react-select.

    tabs.tsx: Tabs, TabsList, TabsTrigger, TabsContent from @radix-ui/react-tabs.

    separator.tsx: Separator from @radix-ui/react-separator.

    dropdown-menu.tsx: full DropdownMenu set from @radix-ui/react-dropdown-menu.

    tooltip.tsx: TooltipProvider, Tooltip, TooltipTrigger, TooltipContent from @radix-ui/react-tooltip.

    use-toast.ts: standard shadcn useToast hook implementation with reducer pattern.
    toast.tsx: Toast, ToastProvider, ToastViewport, ToastTitle, ToastDescription, ToastClose, ToastAction from @radix-ui/react-toast.
    toaster.tsx: Toaster component that renders toasts from useToast().

    All components must import { cn } from "@/lib/utils".
    All files use "use client" is NOT needed — this is not Next.js. Do not add "use client" directives.
  </details>
  <automated>none</automated>
  <verify>TypeScript compiles without error for all component files; no missing module errors</verify>
</task>

<task id="1-02-07" name="Create client/src/pages/LoginPage.tsx">
  <description>Login form page: username + password inputs, submit button, error display, redirects to / on success. Uses useAuth().login mutation.</description>
  <files>client/src/pages/LoginPage.tsx</files>
  <details>
    import { useState } from "react";
    import { useAuth } from "@/hooks/useAuth";
    import { Button } from "@/components/ui/button";
    import { Input } from "@/components/ui/input";
    import { Label } from "@/components/ui/label";
    import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
    import { useLocation } from "wouter";
    import { useSettings } from "@/hooks/useSettings";

    export default function LoginPage() {
      const { login, isLoggingIn } = useAuth();
      const { settings } = useSettings();
      const [, setLocation] = useLocation();
      const [username, setUsername] = useState("");
      const [password, setPassword] = useState("");
      const [error, setError] = useState<string | null>(null);

      async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        try {
          await login({ username, password });
          setLocation("/");
        } catch (err: any) {
          setError(err.message ?? "Login failed");
        }
      }

      return (
        <div className="flex h-screen items-center justify-center bg-background px-4">
          <div className="w-full max-w-sm space-y-6">
            {/* Branding header */}
            <div className="text-center space-y-1">
              {settings?.logoUrl && (
                <img src={settings.logoUrl} alt="Logo" className="h-10 mx-auto mb-2 object-contain" />
              )}
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {settings?.appTitle ?? "OAE Marketing"}
              </h1>
              <p className="text-sm text-muted-foreground">Sign in to continue</p>
            </div>

            <Card className="border border-border/50 shadow-sm">
              <CardContent className="pt-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      type="text"
                      autoComplete="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      disabled={isLoggingIn}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoggingIn}
                      required
                    />
                  </div>
                  {error && (
                    <p className="text-sm text-destructive">{error}</p>
                  )}
                  <Button type="submit" className="w-full" disabled={isLoggingIn}>
                    {isLoggingIn ? "Signing in..." : "Sign in"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }
  </details>
  <automated>none</automated>
  <verify>Login form renders; submitting with admin/oaeadmin2024 redirects to /; wrong credentials shows error message</verify>
</task>

<task id="1-02-08" name="Create full client/src/App.tsx">
  <description>Replace stub App.tsx with full app: wouter routing, auth guard, sidebar with nav links role-gated, ThemeToggle, useSettings injection, Toaster. Unauthenticated users redirect to /login.</description>
  <files>client/src/App.tsx</files>
  <details>
    Structure:
    - Import useAuth, useSettings, useTheme (from next-themes), Link/Route/Switch from wouter
    - Import all page components (stub them as lazy imports or inline placeholders for pages not yet created)
    - Import icons from lucide-react: Film, FolderOpen, Library, BarChart2, Settings, LogOut, Sun, Moon, Monitor, ChevronRight, Menu

    AUTH GUARD: If isLoading, render centered spinner. If !isAuthenticated, render LoginPage (or redirect to /login). If authenticated, render the main layout.

    MAIN LAYOUT: flex h-screen overflow-hidden

    SIDEBAR (left, w-56, fixed):
    - App logo/name from settings (useSettings)
    - Nav links: Dashboard (/), Titles (/titles), Projects (/projects), Clip Library (/clips), Campaigns (/campaigns — disabled/hidden in Phase 1), Admin (/admin — only visible if user.role === "admin")
    - Bottom section: ThemeToggle (cycle: light → dark → system), user info (username + role badge), Logout button

    NAV LINKS using wouter Link, highlight active route.
    - Dashboard: / — all roles
    - Titles: /titles — all roles
    - Projects: /projects — all roles
    - Clip Library: /clips — all roles
    - Admin: /admin — admin only

    THEME TOGGLE: button that cycles light → dark → system using next-themes setTheme. Icon changes: Sun (light), Moon (dark), Monitor (system).

    ROLE BADGE inline in sidebar:
    - admin → violet
    - marketing_operator → blue
    - reviewer → amber
    - executive → green
    - freelancer → gray

    MAIN CONTENT: flex-1 overflow-auto

    ROUTES (using wouter Switch/Route):
    - / → DashboardPage (stub: "Dashboard — coming soon")
    - /titles → TitlesPage (stub placeholder, implemented in plan 03)
    - /projects → ProjectsPage (stub placeholder, implemented in plan 04)
    - /clips → ClipLibraryPage (stub placeholder, implemented in plan 05)
    - /admin → AdminPage (stub placeholder, implemented in plan 06) — wrapped in role guard: if user.role !== "admin", render <Redirect to="/" />
    - default → <div>404 — Page not found</div>

    For stub pages not yet created, inline a placeholder:
    function PageStub({ name }: { name: string }) {
      return (
        <div className="flex h-full items-center justify-center">
          <p className="text-muted-foreground">{name} — coming soon</p>
        </div>
      );
    }

    Plans 03–06 will create the actual page files; App.tsx will be updated then to import them properly.

    TOASTER: render <Toaster /> at the end of the layout so toast notifications work globally.

    Full sidebar nav item pattern:
    function NavItem({ href, icon: Icon, label, active }: { href: string; icon: any; label: string; active: boolean }) {
      return (
        <Link href={href}>
          <a className={cn(
            "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
            active
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}>
            <Icon className="h-4 w-4 flex-shrink-0" />
            {label}
          </a>
        </Link>
      );
    }
  </details>
  <automated>none</automated>
  <verify>
    Unauthenticated: / shows login page (redirects to /login or renders LoginPage inline).
    Authenticated as admin: sidebar shows all nav items including Admin.
    Authenticated as marketing_operator: Admin nav item is not shown.
    Theme toggle cycles correctly.
    Logout button calls logout() and returns to login.
  </verify>
</task>

---

## must_haves
- [ ] `POST /api/auth/login` with admin/oaeadmin2024 returns 200 with user object (no password field) and sets session cookie
- [ ] `GET /api/auth/me` with valid session cookie returns user object; without cookie returns 401
- [ ] `POST /api/auth/logout` destroys session; subsequent `GET /api/auth/me` returns 401
- [ ] Login with wrong password returns 401 `{"message":"Invalid credentials"}`
- [ ] Login with deactivated user returns 401 `{"message":"Account is deactivated"}`
- [ ] Session survives server restart (stored in Postgres session table)
- [ ] Unauthenticated browser request to / shows login form, not the main app
- [ ] After login, sidebar renders with correct role-gated nav items
- [ ] requireAdmin middleware returns 403 for non-admin authenticated users
- [ ] requireOperator allows admin and marketing_operator, blocks reviewer/executive/freelancer
- [ ] requireReviewer allows admin/marketing_operator/reviewer, blocks executive/freelancer
- [ ] ThemeToggle cycles light/dark/system correctly
- [ ] `npm run check` still passes after all auth files are added

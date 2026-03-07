---
plan: 06
name: admin
wave: 3
depends_on: [01-PLAN-scaffold, 02-PLAN-auth]
files_modified:
  - server/routes.ts
  - server/storage.ts
  - client/src/pages/AdminPage.tsx
  - client/src/hooks/useSettings.ts
  - client/src/App.tsx
autonomous: true
---

# Plan 06: Admin Panel

## Overview

Implement the full admin panel: user management (create, edit role, deactivate/reactivate, reset password), app settings (company name, accent color, logo, OMDb key), and AI provider configuration (Claude, OpenAI, DeepSeek API keys, model selection, primary provider, fallback order). Non-admin users are redirected to / from the /admin route. The useSettings hook injects --accent-color at runtime.

---

<task id="1-06-01" name="Add admin + settings storage functions to server/storage.ts">
  <description>Add getUsers, createUser, updateUser (role, isActive), resetUserPassword, getFullAppSettings, updateAppSettings to server/storage.ts.</description>
  <files>server/storage.ts</files>
  <details>
    Append to storage.ts:

    import bcrypt from "bcrypt";
    import type { InsertUser } from "@shared/schema.js";

    export async function getUsers(): Promise<Omit<User, "password">[]> {
      const all = await db
        .select({
          id: users.id,
          username: users.username,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          isActive: users.isActive,
          lastLoginAt: users.lastLoginAt,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        })
        .from(users)
        .orderBy(users.username);
      return all;
    }

    export async function createUser(data: InsertUser): Promise<Omit<User, "password">> {
      const hashed = await bcrypt.hash(data.password, 12);
      const [created] = await db
        .insert(users)
        .values({ ...data, password: hashed })
        .returning({
          id: users.id,
          username: users.username,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          isActive: users.isActive,
          lastLoginAt: users.lastLoginAt,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        });
      return created;
    }

    export async function adminUpdateUser(
      id: number,
      data: { role?: string; isActive?: boolean; firstName?: string; lastName?: string; email?: string }
    ): Promise<Omit<User, "password">> {
      const [updated] = await db
        .update(users)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(users.id, id))
        .returning({
          id: users.id,
          username: users.username,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          isActive: users.isActive,
          lastLoginAt: users.lastLoginAt,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        });
      return updated;
    }

    export async function resetUserPassword(id: number, newPassword: string): Promise<void> {
      const hashed = await bcrypt.hash(newPassword, 12);
      await db
        .update(users)
        .set({ password: hashed, updatedAt: new Date() })
        .where(eq(users.id, id));
    }

    export async function getFullAppSettings() {
      // Returns full settings including API keys — for admin use only
      const result = await db.select().from(appSettings).where(eq(appSettings.id, 1)).limit(1);
      return result[0] ?? null;
    }

    export async function updateAppSettings(data: Partial<Omit<AppSettings, "id" | "updatedAt">>): Promise<AppSettings> {
      const [updated] = await db
        .update(appSettings)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(appSettings.id, 1))
        .returning();
      return updated;
    }

    Note: Import appSettings and AppSettings from @shared/schema.js at the top of storage.ts if not already imported.
  </details>
  <automated>none</automated>
  <verify>TypeScript compiles; getUsers() returns all users without password field; createUser hashes password with bcrypt factor 12</verify>
</task>

<task id="1-06-02" name="Add admin + settings routes to server/routes.ts">
  <description>Add all admin API routes (requireAdmin middleware) and settings write route (requireAdmin). API keys are never returned in GET /api/settings (public), but ARE returned in GET /api/admin/settings for admin panel use.</description>
  <files>server/routes.ts</files>
  <details>
    Add imports: getUsers, createUser, adminUpdateUser, resetUserPassword, getFullAppSettings, updateAppSettings from "./storage.js"

    Add these routes after clips routes:

    // ============= ADMIN ROUTES =============

    // GET /api/admin/users — requireAdmin
    app.get("/api/admin/users", requireAdmin, async (_req, res) => {
      try {
        const all = await getUsers();
        res.json(all);
      } catch (err: any) {
        res.status(500).json({ message: err.message });
      }
    });

    // POST /api/admin/users — requireAdmin
    app.post("/api/admin/users", requireAdmin, async (req, res) => {
      try {
        // Check username uniqueness
        const existing = await getUserByUsername(req.body.username);
        if (existing) return res.status(409).json({ message: "Username already taken" });

        // Validate role
        const { ROLES } = await import("@shared/schema.js");
        if (!ROLES.includes(req.body.role)) {
          return res.status(400).json({ message: `Invalid role. Must be one of: ${ROLES.join(", ")}` });
        }

        const user = await createUser(req.body);
        res.status(201).json(user);
      } catch (err: any) {
        res.status(500).json({ message: err.message });
      }
    });

    // PUT /api/admin/users/:id — requireAdmin
    app.put("/api/admin/users/:id", requireAdmin, async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const existing = await getUserById(id);
        if (!existing) return res.status(404).json({ message: "User not found" });

        // Prevent admin from deactivating themselves
        const currentUser = req.user as any;
        if (currentUser.id === id && req.body.isActive === false) {
          return res.status(400).json({ message: "Cannot deactivate your own account" });
        }

        // Validate role if being changed
        if (req.body.role) {
          const { ROLES } = await import("@shared/schema.js");
          if (!ROLES.includes(req.body.role)) {
            return res.status(400).json({ message: `Invalid role. Must be one of: ${ROLES.join(", ")}` });
          }
        }

        const { password: _p, username: _u, ...updatable } = req.body;
        const updated = await adminUpdateUser(id, updatable);
        res.json(updated);
      } catch (err: any) {
        res.status(500).json({ message: err.message });
      }
    });

    // POST /api/admin/users/:id/reset-password — requireAdmin
    app.post("/api/admin/users/:id/reset-password", requireAdmin, async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const existing = await getUserById(id);
        if (!existing) return res.status(404).json({ message: "User not found" });

        const { newPassword } = req.body;
        if (!newPassword || newPassword.length < 8) {
          return res.status(400).json({ message: "New password must be at least 8 characters" });
        }

        await resetUserPassword(id, newPassword);
        res.json({ message: "Password reset successfully" });
      } catch (err: any) {
        res.status(500).json({ message: err.message });
      }
    });

    // GET /api/admin/settings — requireAdmin (includes API keys)
    app.get("/api/admin/settings", requireAdmin, async (_req, res) => {
      try {
        const settings = await getFullAppSettings();
        if (!settings) return res.status(404).json({ message: "Settings not found" });
        // Mask API keys: return "*****" if set, empty string if not
        const masked = {
          ...settings,
          claudeApiKey: settings.claudeApiKey ? "•••••••••••••••••" : "",
          openaiApiKey: settings.openaiApiKey ? "•••••••••••••••••" : "",
          deepseekApiKey: settings.deepseekApiKey ? "•••••••••••••••••" : "",
          omdbApiKey: settings.omdbApiKey ? "•••••••••••••••••" : "",
          smtpPassword: settings.smtpPassword ? "•••••••••••••••••" : "",
        };
        // Also return boolean flags for "is configured" checks
        const enriched = {
          ...masked,
          claudeConfigured: !!settings.claudeApiKey,
          openaiConfigured: !!settings.openaiApiKey,
          deepseekConfigured: !!settings.deepseekApiKey,
          omdbConfigured: !!settings.omdbApiKey,
        };
        res.json(enriched);
      } catch (err: any) {
        res.status(500).json({ message: err.message });
      }
    });

    // PUT /api/admin/settings — requireAdmin
    app.put("/api/admin/settings", requireAdmin, async (req, res) => {
      try {
        // If a masked value is sent (starts with "•"), skip updating that field
        const MASK_PATTERN = /^•+$/;
        const clean: any = {};
        for (const [key, value] of Object.entries(req.body)) {
          if (typeof value === "string" && MASK_PATTERN.test(value)) {
            // Skip — user didn't change this API key
            continue;
          }
          clean[key] = value;
        }

        // Remove read-only fields
        delete clean.id;
        delete clean.updatedAt;
        delete clean.claudeConfigured;
        delete clean.openaiConfigured;
        delete clean.deepseekConfigured;
        delete clean.omdbConfigured;

        const updated = await updateAppSettings(clean);
        // Return safe version (mask keys in response)
        const { claudeApiKey: _c, openaiApiKey: _o, deepseekApiKey: _d, omdbApiKey: _omdb, smtpPassword: _sp, ...safe } = updated;
        res.json(safe);
      } catch (err: any) {
        res.status(500).json({ message: err.message });
      }
    });
  </details>
  <automated>none</automated>
  <verify>
    GET /api/admin/users returns all users without password field.
    POST /api/admin/users creates user with hashed password; duplicate username returns 409.
    PUT /api/admin/users/:id updates role and isActive; cannot deactivate self.
    POST /api/admin/users/:id/reset-password changes password; old password stops working on next login.
    GET /api/admin/settings returns masked API key fields.
    PUT /api/admin/settings with masked value does NOT overwrite existing API key.
    All admin routes return 403 for non-admin authenticated users.
  </verify>
</task>

<task id="1-06-03" name="Create client/src/pages/AdminPage.tsx">
  <description>Full admin panel with three tabs: Users, App Settings, AI Providers. Non-admin users see a redirect to /. Guard implemented inline using useAuth.</description>
  <files>client/src/pages/AdminPage.tsx</files>
  <details>
    import { useState } from "react";
    import { useAuth } from "@/hooks/useAuth";
    import { Redirect } from "wouter";
    import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
    import { Button } from "@/components/ui/button";
    import { Input } from "@/components/ui/input";
    import { Label } from "@/components/ui/label";
    import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
    import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
    import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
    import { fetchJSON, apiRequest } from "@/lib/queryClient";
    import { cn, formatDate } from "@/lib/utils";
    import { Plus, Pencil, KeyRound, Power } from "lucide-react";
    import { ROLES } from "@shared/schema";

    // === GUARD ===
    export default function AdminPage() {
      const { user } = useAuth();
      if (user && user.role !== "admin") return <Redirect to="/" />;

      return (
        <div className="flex flex-col h-full">
          <div className="px-8 py-6 border-b border-border/50">
            <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Manage users, settings, and integrations</p>
          </div>
          <Tabs defaultValue="users" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="border-b border-border/50 rounded-none bg-transparent w-full justify-start gap-1 h-auto px-8 py-0">
              <TabsTrigger value="users" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 px-4">
                Users
              </TabsTrigger>
              <TabsTrigger value="settings" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 px-4">
                App Settings
              </TabsTrigger>
              <TabsTrigger value="ai" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 px-4">
                AI Providers
              </TabsTrigger>
            </TabsList>
            <TabsContent value="users" className="flex-1 overflow-auto p-8">
              <UsersTab />
            </TabsContent>
            <TabsContent value="settings" className="flex-1 overflow-auto p-8">
              <AppSettingsTab />
            </TabsContent>
            <TabsContent value="ai" className="flex-1 overflow-auto p-8">
              <AIProvidersTab />
            </TabsContent>
          </Tabs>
        </div>
      );
    }

    // === USERS TAB ===
    function UsersTab() {
      const qc = useQueryClient();
      const [createOpen, setCreateOpen] = useState(false);
      const [editingUser, setEditingUser] = useState<any | null>(null);
      const [resetTarget, setResetTarget] = useState<any | null>(null);

      const { data: users = [], isLoading } = useQuery({
        queryKey: ["/api/admin/users"],
        queryFn: () => fetchJSON("/api/admin/users"),
      });

      const createMutation = useMutation({
        mutationFn: async (data: any) => {
          const res = await apiRequest("POST", "/api/admin/users", data);
          if (!res.ok) { const b = await res.json(); throw new Error(b.message); }
          return res.json();
        },
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/users"] }); setCreateOpen(false); },
      });

      const updateMutation = useMutation({
        mutationFn: async ({ id, data }: any) => {
          const res = await apiRequest("PUT", `/api/admin/users/${id}`, data);
          if (!res.ok) { const b = await res.json(); throw new Error(b.message); }
          return res.json();
        },
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/users"] }); setEditingUser(null); },
      });

      const resetPasswordMutation = useMutation({
        mutationFn: async ({ id, newPassword }: any) => {
          const res = await apiRequest("POST", `/api/admin/users/${id}/reset-password`, { newPassword });
          if (!res.ok) { const b = await res.json(); throw new Error(b.message); }
          return res.json();
        },
        onSuccess: () => { setResetTarget(null); },
      });

      ROLE_BADGE function (inline):
      const ROLE_STYLES: Record<string, string> = {
        admin: "bg-violet-500/10 text-violet-400 border border-violet-500/20",
        marketing_operator: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
        reviewer: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
        executive: "bg-green-500/10 text-green-400 border border-green-500/20",
        freelancer: "bg-gray-500/10 text-gray-400 border border-gray-500/20",
      };

      RENDER:
      - Loading spinner while isLoading
      - Header row: "Users ({count})" + "New User" button (Plus icon)
      - Table (div-based):
        - Header: grid-cols-[1fr_1fr_140px_100px_120px_140px] — Username | Name | Role | Status | Last Login | Actions
        - Rows: one per user
          - Username: bold text-sm
          - Name: firstName + lastName or "—"
          - Role: colored badge using ROLE_STYLES
          - Status: "Active" green badge or "Inactive" gray badge (based on isActive)
          - Last Login: formatDate(lastLoginAt) or "Never"
          - Actions: Edit (Pencil icon), Reset Password (KeyRound icon), Deactivate/Activate (Power icon)
            - Deactivate: PUT { isActive: false }
            - Activate: PUT { isActive: true }
            - All actions: confirm with window.confirm for destructive ones

      DIALOGS:
      A. Create User Dialog (open=createOpen):
         - username (required), email (required), password (required, min 8), firstName, lastName, role (Select from ROLES), isActive (default true)
         - Submit calls createMutation
      B. Edit User Dialog (open=!!editingUser):
         - Pre-fill firstName, lastName, email, role, isActive from editingUser
         - Submit calls updateMutation({ id: editingUser.id, data: form })
         - Note: username is NOT editable
      C. Reset Password Dialog (open=!!resetTarget):
         - newPassword input (min 8)
         - Confirm button calls resetPasswordMutation

      All dialogs: size sm:max-w-[440px], show mutation error below footer.
    }

    // === APP SETTINGS TAB ===
    function AppSettingsTab() {
      const qc = useQueryClient();
      const [form, setForm] = useState<any>(null);
      const [saved, setSaved] = useState(false);

      const { data: settings, isLoading } = useQuery({
        queryKey: ["/api/admin/settings"],
        queryFn: () => fetchJSON("/api/admin/settings"),
      });

      // Pre-fill form when settings load
      useEffect (from react):
      import { useEffect } from "react";
      useEffect(() => {
        if (settings && !form) {
          setForm({
            companyName: settings.companyName ?? "",
            appTitle: settings.appTitle ?? "",
            logoUrl: settings.logoUrl ?? "",
            accentColor: settings.accentColor ?? "#6366f1",
          });
        }
      }, [settings]);

      const saveMutation = useMutation({
        mutationFn: async (data: any) => {
          const res = await apiRequest("PUT", "/api/admin/settings", data);
          if (!res.ok) { const b = await res.json(); throw new Error(b.message); }
          return res.json();
        },
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: ["/api/settings"] });
          qc.invalidateQueries({ queryKey: ["/api/admin/settings"] });
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        },
      });

      RENDER:
      - Loading spinner if isLoading or !form
      - Form (max-w-xl):
        - Section: "Branding"
          - companyName: Input
          - appTitle: Input
          - logoUrl: Input (URL)
          - accentColor: Input type="color" + text input side-by-side (sync both ways)
            - Color preview swatch (small div with background style)
        - Save button: "Save Branding" — calls saveMutation({ companyName, appTitle, logoUrl, accentColor })
        - Shows "Saved!" text briefly after success
    }

    // === AI PROVIDERS TAB ===
    function AIProvidersTab() {
      const qc = useQueryClient();
      const [form, setForm] = useState<any>(null);

      const { data: settings, isLoading } = useQuery({
        queryKey: ["/api/admin/settings"],
        queryFn: () => fetchJSON("/api/admin/settings"),
      });

      useEffect(() => {
        if (settings && !form) {
          setForm({
            claudeApiKey: "",  // Never pre-fill API keys (show placeholder)
            claudeModel: settings.claudeModel ?? "claude-opus-4-5",
            openaiApiKey: "",
            openaiModel: settings.openaiModel ?? "gpt-4o",
            deepseekApiKey: "",
            deepseekModel: settings.deepseekModel ?? "deepseek-chat",
            aiPrimaryProvider: settings.aiPrimaryProvider ?? "claude",
            omdbApiKey: "",
          });
        }
      }, [settings]);

      const saveMutation = useMutation({
        mutationFn: async (data: any) => {
          // Only send fields that the user filled in (non-empty)
          const toSend: any = {};
          if (data.claudeApiKey) toSend.claudeApiKey = data.claudeApiKey;
          if (data.claudeModel) toSend.claudeModel = data.claudeModel;
          if (data.openaiApiKey) toSend.openaiApiKey = data.openaiApiKey;
          if (data.openaiModel) toSend.openaiModel = data.openaiModel;
          if (data.deepseekApiKey) toSend.deepseekApiKey = data.deepseekApiKey;
          if (data.deepseekModel) toSend.deepseekModel = data.deepseekModel;
          if (data.aiPrimaryProvider) toSend.aiPrimaryProvider = data.aiPrimaryProvider;
          if (data.omdbApiKey) toSend.omdbApiKey = data.omdbApiKey;
          const res = await apiRequest("PUT", "/api/admin/settings", toSend);
          if (!res.ok) { const b = await res.json(); throw new Error(b.message); }
          return res.json();
        },
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: ["/api/admin/settings"] });
          // Reset form keys to empty
          setForm((f: any) => ({ ...f, claudeApiKey: "", openaiApiKey: "", deepseekApiKey: "", omdbApiKey: "" }));
        },
      });

      RENDER (max-w-xl, space-y-8):
      Section: "Claude (Primary)" — show claudeConfigured status badge (green "Configured" or gray "Not Set")
        - API Key: password input, placeholder "Enter new key to update..."
        - Model: text input, default "claude-opus-4-5"
      Section: "OpenAI" — show openaiConfigured status badge
        - API Key: password input
        - Model: text input, default "gpt-4o"
      Section: "DeepSeek" — show deepseekConfigured status badge
        - API Key: password input
        - Model: text input, default "deepseek-chat"
      Section: "Primary Provider"
        - Select: claude / openai / deepseek (maps to aiPrimaryProvider)
      Section: "OMDb API" — show omdbConfigured status badge
        - API Key: password input
        - "Used for automatic film metadata import when creating titles"
      Save button: "Save API Configuration"

      CONFIGURED STATUS BADGE: inline span
        - configured: "bg-green-500/10 text-green-400 border border-green-500/20" → "Configured"
        - not configured: "bg-gray-500/10 text-gray-400 border border-gray-500/20" → "Not Set"

      Note: API key inputs use type="password" so keys are never visible. Leaving blank = no change.
    }
  </details>
  <automated>none</automated>
  <verify>
    /admin redirects non-admin to /.
    Users tab shows all users with correct role badges and active/inactive status.
    Create user form: submitting with valid data creates user; duplicate username shows error.
    Deactivate user: subsequent login returns 401.
    Reset password: old password stops working.
    App Settings tab: saving updates companyName, appTitle, accentColor in DB; GET /api/settings reflects changes.
    Accent color change updates --accent-color CSS var via useSettings hook (observed in sidebar accent).
    AI Providers tab: entering a Claude API key and saving stores it; claudeConfigured badge turns green.
    Leaving API key input blank does NOT overwrite existing key.
    OMDb API key can be set; typing a title search in TitlesPage uses the saved key.
  </verify>
</task>

<task id="1-06-04" name="Update client/src/App.tsx to import AdminPage">
  <description>Replace stub /admin route with the actual AdminPage component.</description>
  <files>client/src/App.tsx</files>
  <details>
    Add import:
    import AdminPage from "@/pages/AdminPage";

    Update route:
    <Route path="/admin" component={AdminPage} />

    Note: The route no longer needs an inline role guard in App.tsx because AdminPage.tsx handles the redirect internally. However, the sidebar nav link for Admin should still only appear when user.role === "admin".
  </details>
  <automated>none</automated>
  <verify>Navigating to /admin as admin renders AdminPage; navigating as non-admin redirects to /</verify>
</task>

---

## must_haves
- [ ] `GET /api/admin/users` returns all users without password fields; requires admin role
- [ ] `POST /api/admin/users` creates user with bcrypt-hashed password; duplicate username returns 409
- [ ] `PUT /api/admin/users/:id` can deactivate a user; deactivated user login returns 401
- [ ] Admin cannot deactivate their own account (returns 400)
- [ ] `POST /api/admin/users/:id/reset-password` changes password; old password stops working
- [ ] `GET /api/admin/settings` returns masked API keys (shows "•••••••••••••••••" if set); includes claudeConfigured, openaiConfigured, deepseekConfigured, omdbConfigured booleans
- [ ] `PUT /api/admin/settings` with masked key value ("•••" pattern) does NOT overwrite the stored key
- [ ] `PUT /api/admin/settings` with a real new key value updates it in the DB
- [ ] `GET /api/settings` (public) never exposes API keys
- [ ] All admin routes return 403 for non-admin authenticated users
- [ ] AdminPage redirects non-admin users to / client-side
- [ ] Users tab: create, edit role, deactivate/activate, reset password all work end-to-end
- [ ] App Settings tab: saving companyName + accentColor updates DB; useSettings hook reflects new accentColor and injects CSS var
- [ ] AI Providers tab: setting OMDb key allows OMDb search to work in TitlesPage
- [ ] `npm run check` still passes after all admin files are added

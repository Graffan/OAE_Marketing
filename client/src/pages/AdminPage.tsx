import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Redirect } from "wouter";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchJSON, apiRequest } from "@/lib/queryClient";
import { cn, formatDate } from "@/lib/utils";
import { Plus, Pencil, KeyRound, Power, ChevronDown, ChevronUp } from "lucide-react";
import { ROLES } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useAiUsage, useAiLogs, usePromptTemplates, useUpdatePromptTemplate } from "@/hooks/useAiStudio";
import { useSettings } from "@/hooks/useSettings";
import TokenUsageBar from "@/components/ai/TokenUsageBar";
import {
  useSocialConnections,
  useCreateSocialConnection,
  useUpdateSocialConnection,
  useDeleteSocialConnection,
} from "@/hooks/useSocialConnections";
import { Instagram, Twitter, Youtube, Music2, Trash2, ToggleLeft, ToggleRight, Globe2 } from "lucide-react";

// ─── Guard ────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const { user } = useAuth();
  if (user && user.role !== "admin") return <Redirect to="/" />;

  return (
    <div className="flex flex-col h-full">
      <div className="px-8 py-6 border-b border-border/50">
        <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage users, settings, and integrations
        </p>
      </div>
      <Tabs defaultValue="users" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="border-b border-border/50 rounded-none bg-transparent w-full justify-start gap-1 h-auto px-8 py-0">
          <TabsTrigger
            value="users"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 px-4"
          >
            Users
          </TabsTrigger>
          <TabsTrigger
            value="settings"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 px-4"
          >
            App Settings
          </TabsTrigger>
          <TabsTrigger
            value="ai"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 px-4"
          >
            AI Providers
          </TabsTrigger>
          <TabsTrigger
            value="ai-logs"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 px-4"
          >
            AI Logs
          </TabsTrigger>
          <TabsTrigger
            value="prompt-templates"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 px-4"
          >
            Prompt Templates
          </TabsTrigger>
          <TabsTrigger
            value="email"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 px-4"
          >
            Email
          </TabsTrigger>
          <TabsTrigger
            value="social"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 px-4"
          >
            Social Connections
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
        <TabsContent value="ai-logs" className="flex-1 overflow-auto p-8">
          <AiLogsTab />
        </TabsContent>
        <TabsContent value="prompt-templates" className="flex-1 overflow-auto p-8">
          <PromptTemplatesTab />
        </TabsContent>
        <TabsContent value="email" className="flex-1 overflow-auto p-8">
          <EmailSettingsTab />
        </TabsContent>
        <TabsContent value="social" className="flex-1 overflow-auto p-8">
          <SocialConnectionsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Role badge styles ────────────────────────────────────────────────────────

const ROLE_STYLES: Record<string, string> = {
  admin: "bg-violet-500/10 text-violet-400 border border-violet-500/20",
  marketing_operator: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  reviewer: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  executive: "bg-green-500/10 text-green-400 border border-green-500/20",
  freelancer: "bg-gray-500/10 text-gray-400 border border-gray-500/20",
};

// ─── Users Tab ────────────────────────────────────────────────────────────────

function UsersTab() {
  const qc = useQueryClient();
  const { user: currentUser } = useAuth();
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
      if (!res.ok) {
        const b = await res.json();
        throw new Error(b.message);
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setCreateOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: any) => {
      const res = await apiRequest("PUT", `/api/admin/users/${id}`, data);
      if (!res.ok) {
        const b = await res.json();
        throw new Error(b.message);
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setEditingUser(null);
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ id, newPassword }: any) => {
      const res = await apiRequest("POST", `/api/admin/users/${id}/reset-password`, {
        newPassword,
      });
      if (!res.ok) {
        const b = await res.json();
        throw new Error(b.message);
      }
      return res.json();
    },
    onSuccess: () => {
      setResetTarget(null);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">
          Users{" "}
          <span className="text-sm text-muted-foreground font-normal">
            ({(users as any[]).length})
          </span>
        </h2>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          New User
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[1fr_1fr_140px_100px_140px_140px] gap-4 px-4 py-2.5 bg-muted/40 text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border">
          <span>Username</span>
          <span>Name</span>
          <span>Role</span>
          <span>Status</span>
          <span>Last Login</span>
          <span>Actions</span>
        </div>
        {(users as any[]).length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No users found
          </div>
        ) : (
          (users as any[]).map((u: any) => (
            <div
              key={u.id}
              className="grid grid-cols-[1fr_1fr_140px_100px_140px_140px] gap-4 px-4 py-3 border-b border-border last:border-0 items-center hover:bg-muted/20 transition-colors"
            >
              <span className="text-sm font-semibold">{u.username}</span>
              <span className="text-sm text-muted-foreground">
                {u.firstName || u.lastName
                  ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim()
                  : "—"}
              </span>
              <span
                className={cn(
                  "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium w-fit",
                  ROLE_STYLES[u.role] ?? "bg-gray-500/10 text-gray-400"
                )}
              >
                {u.role.replace("_", " ")}
              </span>
              <span>
                {u.isActive ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-500/10 text-gray-400 border border-gray-500/20">
                    Inactive
                  </span>
                )}
              </span>
              <span className="text-sm text-muted-foreground">
                {u.lastLoginAt ? formatDate(u.lastLoginAt) : "Never"}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setEditingUser(u)}
                  className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                  title="Edit user"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setResetTarget(u)}
                  className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                  title="Reset password"
                >
                  <KeyRound className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => {
                    if (currentUser?.id === u.id) {
                      alert("You cannot deactivate your own account.");
                      return;
                    }
                    const action = u.isActive ? "deactivate" : "activate";
                    if (window.confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} user "${u.username}"?`)) {
                      updateMutation.mutate({ id: u.id, data: { isActive: !u.isActive } });
                    }
                  }}
                  className={cn(
                    "p-1.5 rounded-md hover:bg-muted transition-colors",
                    u.isActive
                      ? "text-muted-foreground hover:text-destructive"
                      : "text-muted-foreground hover:text-green-400"
                  )}
                  title={u.isActive ? "Deactivate user" : "Activate user"}
                >
                  <Power className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create User Dialog */}
      <CreateUserDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={(data) => createMutation.mutate(data)}
        isPending={createMutation.isPending}
        error={createMutation.error?.message}
      />

      {/* Edit User Dialog */}
      {editingUser && (
        <EditUserDialog
          open={!!editingUser}
          onOpenChange={(o) => !o && setEditingUser(null)}
          user={editingUser}
          onSubmit={(data) => updateMutation.mutate({ id: editingUser.id, data })}
          isPending={updateMutation.isPending}
          error={updateMutation.error?.message}
          isSelf={currentUser?.id === editingUser.id}
        />
      )}

      {/* Reset Password Dialog */}
      {resetTarget && (
        <ResetPasswordDialog
          open={!!resetTarget}
          onOpenChange={(o) => !o && setResetTarget(null)}
          username={resetTarget.username}
          onSubmit={(newPassword) =>
            resetPasswordMutation.mutate({ id: resetTarget.id, newPassword })
          }
          isPending={resetPasswordMutation.isPending}
          error={resetPasswordMutation.error?.message}
        />
      )}
    </div>
  );
}

// ─── Create User Dialog ───────────────────────────────────────────────────────

function CreateUserDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  error,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSubmit: (data: any) => void;
  isPending: boolean;
  error?: string;
}) {
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    role: "marketing_operator",
  });
  const [localError, setLocalError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocalError("");
    if (form.password.length < 8) {
      setLocalError("Password must be at least 8 characters.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setLocalError("Passwords do not match.");
      return;
    }
    const { confirmPassword: _, ...data } = form;
    onSubmit(data);
  }

  function field(name: keyof typeof form) {
    return {
      value: form[name],
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((f) => ({ ...f, [name]: e.target.value })),
    };
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>New User</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cu-firstname">First Name</Label>
              <Input id="cu-firstname" {...field("firstName")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cu-lastname">Last Name</Label>
              <Input id="cu-lastname" {...field("lastName")} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cu-username">Username *</Label>
            <Input id="cu-username" required {...field("username")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cu-email">Email *</Label>
            <Input id="cu-email" type="email" required {...field("email")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cu-role">Role *</Label>
            <Select
              value={form.role}
              onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}
            >
              <SelectTrigger id="cu-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r.replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cu-password">Password *</Label>
            <Input
              id="cu-password"
              type="password"
              required
              minLength={8}
              {...field("password")}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cu-confirm">Confirm Password *</Label>
            <Input
              id="cu-confirm"
              type="password"
              required
              {...field("confirmPassword")}
            />
          </div>
          {(localError || error) && (
            <p className="text-sm text-destructive">{localError || error}</p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creating..." : "Create User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit User Dialog ─────────────────────────────────────────────────────────

function EditUserDialog({
  open,
  onOpenChange,
  user,
  onSubmit,
  isPending,
  error,
  isSelf,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  user: any;
  onSubmit: (data: any) => void;
  isPending: boolean;
  error?: string;
  isSelf: boolean;
}) {
  const [form, setForm] = useState({
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    email: user.email ?? "",
    role: user.role ?? "marketing_operator",
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit(form);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Edit User: {user.username}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="eu-firstname">First Name</Label>
              <Input
                id="eu-firstname"
                value={form.firstName}
                onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="eu-lastname">Last Name</Label>
              <Input
                id="eu-lastname"
                value={form.lastName}
                onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="eu-email">Email *</Label>
            <Input
              id="eu-email"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="eu-role">Role *</Label>
            <Select
              value={form.role}
              onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}
              disabled={isSelf}
            >
              <SelectTrigger id="eu-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r.replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isSelf && (
              <p className="text-xs text-muted-foreground">
                You cannot change your own role.
              </p>
            )}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Reset Password Dialog ────────────────────────────────────────────────────

function ResetPasswordDialog({
  open,
  onOpenChange,
  username,
  onSubmit,
  isPending,
  error,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  username: string;
  onSubmit: (newPassword: string) => void;
  isPending: boolean;
  error?: string;
}) {
  const [newPassword, setNewPassword] = useState("");
  const [localError, setLocalError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocalError("");
    if (newPassword.length < 8) {
      setLocalError("Password must be at least 8 characters.");
      return;
    }
    onSubmit(newPassword);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Reset Password: {username}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="rp-password">New Password</Label>
            <Input
              id="rp-password"
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 8 characters"
            />
          </div>
          {(localError || error) && (
            <p className="text-sm text-destructive">{localError || error}</p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Resetting..." : "Reset Password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── App Settings Tab ─────────────────────────────────────────────────────────

function AppSettingsTab() {
  const qc = useQueryClient();
  const [form, setForm] = useState<any>(null);
  const [saved, setSaved] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["/api/admin/settings"],
    queryFn: () => fetchJSON("/api/admin/settings"),
  });

  useEffect(() => {
    if (settings && !form) {
      setForm({
        companyName: (settings as any).companyName ?? "",
        appTitle: (settings as any).appTitle ?? "",
        logoUrl: (settings as any).logoUrl ?? "",
        accentColor: (settings as any).accentColor ?? "#6366f1",
      });
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PUT", "/api/admin/settings", data);
      if (!res.ok) {
        const b = await res.json();
        throw new Error(b.message);
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/settings"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  if (isLoading || !form) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h2 className="text-lg font-medium mb-4">Branding</h2>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="as-company">Company Name</Label>
            <Input
              id="as-company"
              value={form.companyName}
              onChange={(e) => setForm((f: any) => ({ ...f, companyName: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="as-title">App Title</Label>
            <Input
              id="as-title"
              value={form.appTitle}
              onChange={(e) => setForm((f: any) => ({ ...f, appTitle: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="as-logo">Logo URL</Label>
            <Input
              id="as-logo"
              type="url"
              value={form.logoUrl}
              onChange={(e) => setForm((f: any) => ({ ...f, logoUrl: e.target.value }))}
              placeholder="https://..."
            />
          </div>
          <div className="space-y-1.5">
            <Label>Accent Color</Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.accentColor}
                onChange={(e) => setForm((f: any) => ({ ...f, accentColor: e.target.value }))}
                className="h-9 w-12 cursor-pointer rounded border border-border bg-transparent p-0.5"
              />
              <Input
                value={form.accentColor}
                onChange={(e) => setForm((f: any) => ({ ...f, accentColor: e.target.value }))}
                className="w-32 font-mono text-sm"
                placeholder="#6366f1"
              />
              <div
                className="h-9 w-9 rounded-lg border border-border flex-shrink-0"
                style={{ backgroundColor: form.accentColor }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button
          onClick={() =>
            saveMutation.mutate({
              companyName: form.companyName,
              appTitle: form.appTitle,
              logoUrl: form.logoUrl,
              accentColor: form.accentColor,
            })
          }
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? "Saving..." : "Save Branding"}
        </Button>
        {saved && (
          <span className="text-sm text-green-400 font-medium">Saved!</span>
        )}
        {saveMutation.error && (
          <span className="text-sm text-destructive">{saveMutation.error.message}</span>
        )}
      </div>
    </div>
  );
}

// ─── AI Providers Tab ─────────────────────────────────────────────────────────

function AIProvidersTab() {
  const qc = useQueryClient();
  const [form, setForm] = useState<any>(null);
  const [saved, setSaved] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["/api/admin/settings"],
    queryFn: () => fetchJSON("/api/admin/settings"),
  });

  useEffect(() => {
    if (settings && !form) {
      const s = settings as any;
      setForm({
        claudeApiKey: "",
        claudeModel: s.claudeModel ?? "claude-opus-4-5",
        openaiApiKey: "",
        openaiModel: s.openaiModel ?? "gpt-4o",
        deepseekApiKey: "",
        deepseekModel: s.deepseekModel ?? "deepseek-chat",
        aiPrimaryProvider: s.aiPrimaryProvider ?? "claude",
        aiFallbackOrder: (s.aiFallbackOrder ?? ["openai", "deepseek"]) as string[],
        aiDailyTokenCap: s.aiDailyTokenCap ?? 100000,
        aiPerUserCap: s.aiPerUserCap ?? 10000,
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
      if (data.aiFallbackOrder) toSend.aiFallbackOrder = data.aiFallbackOrder;
      if (data.aiDailyTokenCap !== undefined) toSend.aiDailyTokenCap = Number(data.aiDailyTokenCap);
      if (data.aiPerUserCap !== undefined) toSend.aiPerUserCap = Number(data.aiPerUserCap);
      if (data.omdbApiKey) toSend.omdbApiKey = data.omdbApiKey;
      const res = await apiRequest("PUT", "/api/admin/settings", toSend);
      if (!res.ok) {
        const b = await res.json();
        throw new Error(b.message);
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      // Reset API key inputs
      setForm((f: any) => ({
        ...f,
        claudeApiKey: "",
        openaiApiKey: "",
        deepseekApiKey: "",
        omdbApiKey: "",
      }));
    },
  });

  if (isLoading || !form) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
      </div>
    );
  }

  const s = settings as any;

  function ConfiguredBadge({ configured }: { configured: boolean }) {
    return (
      <span
        className={cn(
          "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
          configured
            ? "bg-green-500/10 text-green-400 border border-green-500/20"
            : "bg-gray-500/10 text-gray-400 border border-gray-500/20"
        )}
      >
        {configured ? "Configured" : "Not Set"}
      </span>
    );
  }

  return (
    <div className="max-w-xl space-y-8">
      {/* Claude */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Claude</h3>
          <ConfiguredBadge configured={s?.claudeConfigured ?? false} />
        </div>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="ai-claude-key">API Key</Label>
            <Input
              id="ai-claude-key"
              type="password"
              value={form.claudeApiKey}
              onChange={(e) => setForm((f: any) => ({ ...f, claudeApiKey: e.target.value }))}
              placeholder="Enter new key to update..."
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ai-claude-model">Model</Label>
            <Input
              id="ai-claude-model"
              value={form.claudeModel}
              onChange={(e) => setForm((f: any) => ({ ...f, claudeModel: e.target.value }))}
              placeholder="claude-opus-4-5"
            />
          </div>
        </div>
      </div>

      {/* OpenAI */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">OpenAI</h3>
          <ConfiguredBadge configured={s?.openaiConfigured ?? false} />
        </div>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="ai-openai-key">API Key</Label>
            <Input
              id="ai-openai-key"
              type="password"
              value={form.openaiApiKey}
              onChange={(e) => setForm((f: any) => ({ ...f, openaiApiKey: e.target.value }))}
              placeholder="Enter new key to update..."
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ai-openai-model">Model</Label>
            <Input
              id="ai-openai-model"
              value={form.openaiModel}
              onChange={(e) => setForm((f: any) => ({ ...f, openaiModel: e.target.value }))}
              placeholder="gpt-4o"
            />
          </div>
        </div>
      </div>

      {/* DeepSeek */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">DeepSeek</h3>
          <ConfiguredBadge configured={s?.deepseekConfigured ?? false} />
        </div>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="ai-deepseek-key">API Key</Label>
            <Input
              id="ai-deepseek-key"
              type="password"
              value={form.deepseekApiKey}
              onChange={(e) => setForm((f: any) => ({ ...f, deepseekApiKey: e.target.value }))}
              placeholder="Enter new key to update..."
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ai-deepseek-model">Model</Label>
            <Input
              id="ai-deepseek-model"
              value={form.deepseekModel}
              onChange={(e) => setForm((f: any) => ({ ...f, deepseekModel: e.target.value }))}
              placeholder="deepseek-chat"
            />
          </div>
        </div>
      </div>

      {/* Primary Provider */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Primary Provider</h3>
        <div className="space-y-1.5">
          <Label htmlFor="ai-primary">Default Provider</Label>
          <Select
            value={form.aiPrimaryProvider}
            onValueChange={(v) => setForm((f: any) => ({ ...f, aiPrimaryProvider: v }))}
          >
            <SelectTrigger id="ai-primary" className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="claude">Claude</SelectItem>
              <SelectItem value="openai">OpenAI</SelectItem>
              <SelectItem value="deepseek">DeepSeek</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Fallback Order */}
      {form && (
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold">Fallback Order</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Providers tried in order when the primary fails. Drag or use arrows to reorder.
            </p>
          </div>
          <div className="space-y-1.5">
            {(form.aiFallbackOrder as string[]).map((p: string, i: number) => (
              <div key={p} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
                <span className="text-sm capitalize flex-1 px-3 py-1.5 border rounded-md bg-muted/30">{p}</span>
                <button
                  type="button"
                  disabled={i === 0}
                  className="p-1 rounded hover:bg-muted disabled:opacity-30"
                  onClick={() => {
                    const arr = [...form.aiFallbackOrder];
                    [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
                    setForm((f: any) => ({ ...f, aiFallbackOrder: arr }));
                  }}
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={i === (form.aiFallbackOrder as string[]).length - 1}
                  className="p-1 rounded hover:bg-muted disabled:opacity-30"
                  onClick={() => {
                    const arr = [...form.aiFallbackOrder];
                    [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
                    setForm((f: any) => ({ ...f, aiFallbackOrder: arr }));
                  }}
                >
                  ↓
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Token Caps */}
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold">Token Caps</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Limits AI token usage to control costs. Set 0 to disable.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="ai-daily-cap">Daily Cap (all users)</Label>
            <Input
              id="ai-daily-cap"
              type="number"
              min={0}
              step={10000}
              value={form?.aiDailyTokenCap ?? 100000}
              onChange={(e) => setForm((f: any) => ({ ...f, aiDailyTokenCap: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ai-user-cap">Per-User Cap (daily)</Label>
            <Input
              id="ai-user-cap"
              type="number"
              min={0}
              step={1000}
              value={form?.aiPerUserCap ?? 10000}
              onChange={(e) => setForm((f: any) => ({ ...f, aiPerUserCap: e.target.value }))}
            />
          </div>
        </div>
      </div>

      {/* OMDb */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">OMDb API</h3>
          <ConfiguredBadge configured={s?.omdbConfigured ?? false} />
        </div>
        <p className="text-xs text-muted-foreground">
          Used for automatic film metadata import when creating titles.
        </p>
        <div className="space-y-1.5">
          <Label htmlFor="ai-omdb-key">API Key</Label>
          <Input
            id="ai-omdb-key"
            type="password"
            value={form.omdbApiKey}
            onChange={(e) => setForm((f: any) => ({ ...f, omdbApiKey: e.target.value }))}
            placeholder="Enter new key to update..."
            autoComplete="new-password"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button
          onClick={() => saveMutation.mutate(form)}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? "Saving..." : "Save API Configuration"}
        </Button>
        {saved && (
          <span className="text-sm text-green-400 font-medium">Saved!</span>
        )}
        {saveMutation.error && (
          <span className="text-sm text-destructive">{saveMutation.error.message}</span>
        )}
      </div>
    </div>
  );
}

// ─── AiLogsTab ────────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, string> = {
  success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  error: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  manual_paste: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
};

function AiLogsTab() {
  const { settings } = useSettings();
  const { data: usage } = useAiUsage();
  const [page, setPage] = useState(1);
  const { data } = useAiLogs(page);
  const [expandedLog, setExpandedLog] = useState<number | null>(null);

  const logs = data?.logs ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 50);

  return (
    <div className="space-y-8 max-w-5xl">
      {usage && settings && (
        <div className="space-y-3">
          <h2 className="text-base font-semibold">Token Usage Today</h2>
          <TokenUsageBar
            dailyTotal={usage.dailyTotal}
            dailyCap={settings.aiDailyTokenCap ?? 100000}
          />
          {usage.userTotals.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-4">User ID</th>
                  <th className="pb-2 pr-4">Tokens Today</th>
                  <th className="pb-2 pr-4">Cap</th>
                  <th className="pb-2">% Used</th>
                </tr>
              </thead>
              <tbody>
                {usage.userTotals.map((u) => {
                  const cap = settings.aiPerUserCap ?? 10000;
                  const pct = cap > 0 ? Math.round((u.total / cap) * 100) : 0;
                  return (
                    <tr key={String(u.userId)} className="border-b last:border-0">
                      <td className="py-2 pr-4">{u.userId ?? "—"}</td>
                      <td className="py-2 pr-4">{u.total.toLocaleString()}</td>
                      <td className="py-2 pr-4">{cap.toLocaleString()}</td>
                      <td className="py-2">{pct}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      <div className="space-y-3">
        <h2 className="text-base font-semibold">AI Audit Log</h2>
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-muted/50">
              <tr className="text-left text-muted-foreground">
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">Provider</th>
                <th className="px-3 py-2">Model</th>
                <th className="px-3 py-2">Task</th>
                <th className="px-3 py-2">In</th>
                <th className="px-3 py-2">Out</th>
                <th className="px-3 py-2">ms</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">User</th>
                <th className="px-3 py-2">Campaign</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <>
                  <tr
                    key={log.id}
                    className="border-t cursor-pointer hover:bg-muted/30"
                    onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                  >
                    <td className="px-3 py-2 whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                    <td className="px-3 py-2">{log.provider}</td>
                    <td className="px-3 py-2 max-w-[120px] truncate">{log.model}</td>
                    <td className="px-3 py-2">{log.task}</td>
                    <td className="px-3 py-2">{log.tokensIn}</td>
                    <td className="px-3 py-2">{log.tokensOut}</td>
                    <td className="px-3 py-2">{log.latencyMs}</td>
                    <td className="px-3 py-2">
                      <Badge className={cn("text-[10px]", STATUS_BADGE[log.status] ?? "")}>{log.status}</Badge>
                    </td>
                    <td className="px-3 py-2">{log.userId ?? "—"}</td>
                    <td className="px-3 py-2">{log.campaignId ?? "—"}</td>
                  </tr>
                  {expandedLog === log.id && (
                    <tr key={`${log.id}-detail`} className="bg-muted/20">
                      <td colSpan={10} className="px-3 py-3">
                        <div className="space-y-2">
                          <div>
                            <p className="text-[10px] font-medium text-muted-foreground mb-1">PROMPT</p>
                            <pre className="text-xs whitespace-pre-wrap break-all font-mono bg-background rounded p-2 max-h-40 overflow-y-auto">{log.promptText ?? "—"}</pre>
                          </div>
                          <div>
                            <p className="text-[10px] font-medium text-muted-foreground mb-1">RESPONSE</p>
                            <pre className="text-xs whitespace-pre-wrap break-all font-mono bg-background rounded p-2 max-h-40 overflow-y-auto">{log.responseText ?? "—"}</pre>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
              {logs.length === 0 && (
                <tr><td colSpan={10} className="px-3 py-6 text-center text-muted-foreground">No logs yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center gap-3 text-sm">
            <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</Button>
            <span className="text-muted-foreground">Page {page} of {totalPages}</span>
            <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── PromptTemplatesTab ───────────────────────────────────────────────────────

function PromptTemplatesTab() {
  const { data: templates = [] } = usePromptTemplates();
  const updateTemplate = useUpdatePromptTemplate();
  const [expandedTpl, setExpandedTpl] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<Record<number, { systemPrompt: string; userPromptTemplate: string }>>({});
  const [savedId, setSavedId] = useState<number | null>(null);

  function getDraft(id: number, field: "systemPrompt" | "userPromptTemplate", fallback: string) {
    return drafts[id]?.[field] ?? fallback;
  }

  function setDraft(id: number, field: "systemPrompt" | "userPromptTemplate", value: string, t: { systemPrompt: string | null; userPromptTemplate: string | null }) {
    setDrafts((prev) => ({
      ...prev,
      [id]: {
        systemPrompt: prev[id]?.systemPrompt ?? t.systemPrompt ?? "",
        userPromptTemplate: prev[id]?.userPromptTemplate ?? t.userPromptTemplate ?? "",
        [field]: value,
      },
    }));
  }

  function handleSave(t: { id: number; version: number }) {
    const d = drafts[t.id];
    if (!d) return;
    updateTemplate.mutate(
      { id: t.id, data: { systemPrompt: d.systemPrompt, userPromptTemplate: d.userPromptTemplate } },
      { onSuccess: () => { setSavedId(t.id); setTimeout(() => setSavedId(null), 2000); } }
    );
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="rounded-lg border text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 px-4 py-2">
        Editing templates affects all future generations. Previous outputs are logged.
      </div>
      {templates.map((t) => {
        const isOpen = expandedTpl === t.id;
        return (
          <div key={t.id} className="border rounded-lg overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/30 transition-colors"
              onClick={() => setExpandedTpl(isOpen ? null : t.id)}
            >
              <div className="flex items-center gap-3">
                <span className="font-medium text-sm">{t.taskName}</span>
                <Badge variant="outline" className="text-[10px]">v{t.version}</Badge>
                <Badge variant="outline" className="text-[10px]">{t.provider}</Badge>
                {t.isActive && <Badge className="text-[10px] bg-emerald-600">active</Badge>}
              </div>
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {isOpen && (
              <div className="border-t px-4 py-4 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">System Prompt</label>
                  <Textarea
                    value={getDraft(t.id, "systemPrompt", t.systemPrompt ?? "")}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDraft(t.id, "systemPrompt", e.target.value, t)}
                    className="font-mono text-xs min-h-[80px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">User Prompt Template</label>
                  <Textarea
                    value={getDraft(t.id, "userPromptTemplate", t.userPromptTemplate ?? "")}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDraft(t.id, "userPromptTemplate", e.target.value, t)}
                    className="font-mono text-xs min-h-[120px]"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Button size="sm" disabled={!drafts[t.id] || updateTemplate.isPending} onClick={() => handleSave(t)}>
                    Save — v{t.version} → v{t.version + 1}
                  </Button>
                  {savedId === t.id && <span className="text-xs text-emerald-600">Saved!</span>}
                </div>
              </div>
            )}
          </div>
        );
      })}
      {templates.length === 0 && (
        <p className="text-sm text-muted-foreground py-6 text-center">No prompt templates seeded yet.</p>
      )}
    </div>
  );
}

// ─── Email Settings Tab ────────────────────────────────────────────────────────

function EmailSettingsTab() {
  const qc = useQueryClient();
  const [form, setForm] = useState<any>(null);
  const [saved, setSaved] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["/api/admin/settings"],
    queryFn: () => fetchJSON("/api/admin/settings"),
  });

  useEffect(() => {
    if (settings && !form) {
      const s = settings as any;
      setForm({
        smtpHost: s.smtpHost ?? "",
        smtpPort: s.smtpPort ?? 587,
        smtpUser: s.smtpUser ?? "",
        smtpPassword: "",
        smtpFromEmail: s.smtpFromEmail ?? "",
        smtpFromName: s.smtpFromName ?? "",
        smtpTls: s.smtpTls ?? true,
      });
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const toSend: any = {
        smtpHost: data.smtpHost,
        smtpPort: Number(data.smtpPort),
        smtpUser: data.smtpUser,
        smtpFromEmail: data.smtpFromEmail,
        smtpFromName: data.smtpFromName,
        smtpTls: data.smtpTls,
      };
      // Only send password if user typed a new one
      if (data.smtpPassword) toSend.smtpPassword = data.smtpPassword;
      const res = await apiRequest("PUT", "/api/admin/settings", toSend);
      if (!res.ok) {
        const b = await res.json();
        throw new Error(b.message ?? "Save failed");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      setSaved(true);
      setForm((f: any) => ({ ...f, smtpPassword: "" }));
      setTimeout(() => setSaved(false), 2000);
    },
  });

  if (isLoading || !form) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
      </div>
    );
  }

  const s = settings as any;
  const smtpConfigured = !!(s?.smtpHost && s?.smtpUser);

  return (
    <div className="max-w-xl space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-base font-semibold">Email / SMTP</h2>
          <span
            className={cn(
              "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
              smtpConfigured
                ? "bg-green-500/10 text-green-400 border border-green-500/20"
                : "bg-gray-500/10 text-gray-400 border border-gray-500/20"
            )}
          >
            {smtpConfigured ? "Configured" : "Not Set"}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Used for system notifications. Leave blank to disable email sending.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="smtp-host">SMTP Host</Label>
          <Input
            id="smtp-host"
            value={form.smtpHost}
            onChange={(e) => setForm((f: any) => ({ ...f, smtpHost: e.target.value }))}
            placeholder="smtp.example.com"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="smtp-port">Port</Label>
          <Input
            id="smtp-port"
            type="number"
            value={form.smtpPort}
            onChange={(e) => setForm((f: any) => ({ ...f, smtpPort: e.target.value }))}
            placeholder="587"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="smtp-user">SMTP Username</Label>
        <Input
          id="smtp-user"
          value={form.smtpUser}
          onChange={(e) => setForm((f: any) => ({ ...f, smtpUser: e.target.value }))}
          placeholder="user@example.com"
          autoComplete="username"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="smtp-password">
          SMTP Password
          {s?.smtpHost && (
            <span className="text-xs text-muted-foreground ml-2">(leave blank to keep current)</span>
          )}
        </Label>
        <Input
          id="smtp-password"
          type="password"
          value={form.smtpPassword}
          onChange={(e) => setForm((f: any) => ({ ...f, smtpPassword: e.target.value }))}
          placeholder="Enter new password to update..."
          autoComplete="new-password"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="smtp-from-email">From Email</Label>
          <Input
            id="smtp-from-email"
            type="email"
            value={form.smtpFromEmail}
            onChange={(e) => setForm((f: any) => ({ ...f, smtpFromEmail: e.target.value }))}
            placeholder="noreply@otheranimal.app"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="smtp-from-name">From Name</Label>
          <Input
            id="smtp-from-name"
            value={form.smtpFromName}
            onChange={(e) => setForm((f: any) => ({ ...f, smtpFromName: e.target.value }))}
            placeholder="OAE Marketing"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <input
          id="smtp-tls"
          type="checkbox"
          checked={form.smtpTls}
          onChange={(e) => setForm((f: any) => ({ ...f, smtpTls: e.target.checked }))}
          className="h-4 w-4 rounded border-border"
        />
        <Label htmlFor="smtp-tls" className="cursor-pointer">Use TLS / STARTTLS</Label>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button
          onClick={() => saveMutation.mutate(form)}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? "Saving..." : "Save Email Settings"}
        </Button>
        {saved && <span className="text-sm text-green-400 font-medium">Saved!</span>}
        {saveMutation.error && (
          <span className="text-sm text-destructive">{(saveMutation.error as Error).message}</span>
        )}
      </div>
    </div>
  );
}

// ─── Social Connections Tab ─────────────────────────────────────────────────

const SOCIAL_PLATFORM_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  instagram: { label: "Instagram", icon: Instagram, color: "text-pink-500" },
  tiktok: { label: "TikTok", icon: Music2, color: "text-cyan-500" },
  twitter: { label: "X / Twitter", icon: Twitter, color: "text-sky-500" },
  youtube: { label: "YouTube", icon: Youtube, color: "text-red-500" },
};

function SocialConnectionsTab() {
  const { data: connections = [], isLoading } = useSocialConnections();
  const createConnection = useCreateSocialConnection();
  const updateConnection = useUpdateSocialConnection();
  const deleteConnection = useDeleteSocialConnection();
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    platform: "instagram",
    accountName: "",
    accountId: "",
    accessToken: "",
    refreshToken: "",
    profileUrl: "",
  });

  function handleAdd() {
    createConnection.mutate(
      {
        platform: addForm.platform,
        accountName: addForm.accountName,
        accountId: addForm.accountId || null,
        accessToken: addForm.accessToken || null,
        refreshToken: addForm.refreshToken || null,
        profileUrl: addForm.profileUrl || null,
        isActive: true,
      },
      {
        onSuccess: () => {
          setAddOpen(false);
          setAddForm({ platform: "instagram", accountName: "", accountId: "", accessToken: "", refreshToken: "", profileUrl: "" });
        },
      }
    );
  }

  function toggleActive(conn: any) {
    updateConnection.mutate({ id: conn.id, isActive: !conn.isActive });
  }

  const allConnections = connections as any[];

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Social Connections</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Connect your social media accounts for publishing
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Account
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : allConnections.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border/50 rounded-xl">
          <Globe2 className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No social accounts connected</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Add your Instagram, TikTok, X, or YouTube accounts to start publishing
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {allConnections.map((conn: any) => {
            const meta = SOCIAL_PLATFORM_META[conn.platform];
            const Icon = meta?.icon ?? Globe2;
            return (
              <div
                key={conn.id}
                className="flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-card"
              >
                <Icon className={`h-5 w-5 flex-shrink-0 ${meta?.color ?? "text-muted-foreground"}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{conn.accountName}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {meta?.label ?? conn.platform}
                    </Badge>
                    {!conn.isActive && (
                      <Badge className="text-[10px] bg-muted text-muted-foreground">
                        Disabled
                      </Badge>
                    )}
                  </div>
                  {conn.profileUrl && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{conn.profileUrl}</p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    onClick={() => toggleActive(conn)}
                    title={conn.isActive ? "Disable" : "Enable"}
                  >
                    {conn.isActive ? (
                      <ToggleRight className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                    onClick={() => deleteConnection.mutate(conn.id)}
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Connection Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Add Social Connection</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Platform</Label>
              <Select
                value={addForm.platform}
                onValueChange={(v) => setAddForm({ ...addForm, platform: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SOCIAL_PLATFORM_META).map(([key, m]) => (
                    <SelectItem key={key} value={key}>
                      <span className="flex items-center gap-2">
                        <m.icon className={`h-3.5 w-3.5 ${m.color}`} />
                        {m.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Account Name</Label>
              <Input
                value={addForm.accountName}
                onChange={(e) => setAddForm({ ...addForm, accountName: e.target.value })}
                placeholder="@otheranimal"
              />
            </div>
            <div className="space-y-2">
              <Label>Account ID <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input
                value={addForm.accountId}
                onChange={(e) => setAddForm({ ...addForm, accountId: e.target.value })}
                placeholder="Platform-specific account ID"
              />
            </div>
            <div className="space-y-2">
              <Label>Access Token <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input
                type="password"
                value={addForm.accessToken}
                onChange={(e) => setAddForm({ ...addForm, accessToken: e.target.value })}
                placeholder="OAuth access token"
              />
            </div>
            <div className="space-y-2">
              <Label>Refresh Token <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input
                type="password"
                value={addForm.refreshToken}
                onChange={(e) => setAddForm({ ...addForm, refreshToken: e.target.value })}
                placeholder="OAuth refresh token"
              />
            </div>
            <div className="space-y-2">
              <Label>Profile URL <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input
                value={addForm.profileUrl}
                onChange={(e) => setAddForm({ ...addForm, profileUrl: e.target.value })}
                placeholder="https://instagram.com/otheranimal"
              />
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button
              onClick={handleAdd}
              disabled={!addForm.accountName.trim() || createConnection.isPending}
            >
              {createConnection.isPending ? "Adding..." : "Add Connection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

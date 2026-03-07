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
import { Plus, Pencil, KeyRound, Power } from "lucide-react";
import { ROLES } from "@shared/schema";

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
      setForm({
        claudeApiKey: "",
        claudeModel: (settings as any).claudeModel ?? "claude-opus-4-5",
        openaiApiKey: "",
        openaiModel: (settings as any).openaiModel ?? "gpt-4o",
        deepseekApiKey: "",
        deepseekModel: (settings as any).deepseekModel ?? "deepseek-chat",
        aiPrimaryProvider: (settings as any).aiPrimaryProvider ?? "claude",
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

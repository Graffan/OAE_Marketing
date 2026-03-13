import { useState } from "react";
import {
  Mail,
  Users,
  Plus,
  Trash2,
  Send,
  Clock,
  CheckCircle2,
  XCircle,
  FileEdit,
} from "lucide-react";
import {
  useEmailSubscribers,
  useEmailSubscriberCount,
  useDeleteEmailSubscriber,
  useEmailCampaigns,
  useCreateEmailCampaign,
  useUpdateEmailCampaign,
  useDeleteEmailCampaign,
} from "@/hooks/useEmail";
import { useTitles } from "@/hooks/useTitles";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CAMPAIGN_TYPES = [
  { value: "new_release", label: "New Release" },
  { value: "monthly_digest", label: "Monthly Digest" },
  { value: "festival_win", label: "Festival Win" },
  { value: "trailer_drop", label: "Trailer Drop" },
  { value: "custom", label: "Custom" },
];

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; className: string }> = {
  draft: { icon: <FileEdit className="h-3 w-3" />, className: "bg-muted text-muted-foreground" },
  scheduled: { icon: <Clock className="h-3 w-3" />, className: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  sending: { icon: <Send className="h-3 w-3" />, className: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  sent: { icon: <CheckCircle2 className="h-3 w-3" />, className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  failed: { icon: <XCircle className="h-3 w-3" />, className: "bg-destructive/10 text-destructive" },
};

// ─── Subscribers Tab ─────────────────────────────────────────────────────────

function SubscribersTab() {
  const { data: subscribers = [], isLoading } = useEmailSubscribers();
  const { data: countData } = useEmailSubscriberCount();
  const deleteSubscriber = useDeleteEmailSubscriber();

  const activeCount = (countData as any)?.count ?? 0;

  if (isLoading) return <div className="flex justify-center py-20 text-sm text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">
            {activeCount} active subscriber{activeCount !== 1 ? "s" : ""}
          </p>
          <Badge variant="outline" className="text-[10px]">
            Captured via smart links
          </Badge>
        </div>
      </div>

      {(subscribers as any[]).length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No email subscribers yet. They'll appear when users sign up via smart link landing pages.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Email</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Name</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Source</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Joined</th>
                    <th className="px-4 py-2.5 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {(subscribers as any[]).map((s: any) => (
                    <tr key={s.id} className="border-b border-muted/30 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-2.5 text-sm">{s.email}</td>
                      <td className="px-4 py-2.5 text-sm text-muted-foreground">{s.name ?? "—"}</td>
                      <td className="px-4 py-2.5">
                        <Badge variant="outline" className="text-[10px]">{s.source}</Badge>
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant={s.isActive ? "default" : "secondary"} className="text-[10px]">
                          {s.isActive ? "Active" : "Unsubscribed"}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">
                        {new Date(s.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-2.5">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteSubscriber.mutate(s.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Campaigns Tab ───────────────────────────────────────────────────────────

function CampaignsTab() {
  const { data: campaigns = [], isLoading } = useEmailCampaigns();
  const { data: titles = [] } = useTitles();
  const createCampaign = useCreateEmailCampaign();
  const deleteCampaign = useDeleteEmailCampaign();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", type: "new_release", subject: "", bodyText: "", titleId: "" });

  function handleAdd() {
    if (!form.name || !form.subject) return;
    createCampaign.mutate(
      { ...form, titleId: form.titleId ? Number(form.titleId) : null },
      { onSuccess: () => { setShowAdd(false); setForm({ name: "", type: "new_release", subject: "", bodyText: "", titleId: "" }); } }
    );
  }

  function titleName(id: number | null): string {
    if (!id) return "—";
    return (titles as any[]).find((t: any) => t.id === id)?.title ?? `#${id}`;
  }

  if (isLoading) return <div className="flex justify-center py-20 text-sm text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Email campaigns for announcements, digests, and festival wins.</p>
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" /> New Campaign
        </Button>
      </div>

      {(campaigns as any[]).length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Mail className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No email campaigns yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {(campaigns as any[]).map((c: any) => {
            const statusCfg = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.draft;
            return (
              <Card key={c.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{c.name}</p>
                        <Badge className={`text-[10px] gap-1 ${statusCfg.className}`}>
                          {statusCfg.icon} {c.status}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {CAMPAIGN_TYPES.find((t) => t.value === c.type)?.label ?? c.type}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Subject: {c.subject}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                        {c.titleId && <span>Title: {titleName(c.titleId)}</span>}
                        {c.recipientCount != null && <span>{c.recipientCount} recipients</span>}
                        {c.openCount > 0 && <span>{c.openCount} opens</span>}
                        {c.clickCount > 0 && <span>{c.clickCount} clicks</span>}
                        {c.sentAt && <span>Sent {new Date(c.sentAt).toLocaleDateString()}</span>}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => deleteCampaign.mutate(c.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Email Campaign</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Campaign Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="March 2026 Horror Release" />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CAMPAIGN_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Title (optional)</Label>
              <Select value={form.titleId} onValueChange={(v) => setForm({ ...form, titleId: v })}>
                <SelectTrigger><SelectValue placeholder="Select title..." /></SelectTrigger>
                <SelectContent>
                  {(titles as any[]).map((t: any) => (
                    <SelectItem key={t.id} value={t.id.toString()}>{t.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Subject Line</Label>
              <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Now Streaming: [Film Title]" />
            </div>
            <div>
              <Label>Body (plain text)</Label>
              <Textarea value={form.bodyText} onChange={(e) => setForm({ ...form, bodyText: e.target.value })} placeholder="Write email body..." rows={5} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={createCampaign.isPending}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function EmailPage() {
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Email & Newsletter</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Subscriber list, email campaigns, and newsletter management.
        </p>
      </div>

      <Tabs defaultValue="subscribers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="subscribers" className="gap-1.5">
            <Users className="h-3.5 w-3.5" /> Subscribers
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="gap-1.5">
            <Mail className="h-3.5 w-3.5" /> Campaigns
          </TabsTrigger>
        </TabsList>

        <TabsContent value="subscribers"><SubscribersTab /></TabsContent>
        <TabsContent value="campaigns"><CampaignsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

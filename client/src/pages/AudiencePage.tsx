import { useState } from "react";
import {
  Users,
  MessageSquare,
  Eye,
  Plus,
  Trash2,
  ArrowRightLeft,
  Check,
  X,
  Target,
} from "lucide-react";
import {
  useAudiencePersonas,
  useCreateAudiencePersona,
  useDeleteAudiencePersona,
  useEngagementTemplates,
  useCreateEngagementTemplate,
  useDeleteEngagementTemplate,
  useCompetitors,
  useCreateCompetitor,
  useDeleteCompetitor,
  useCrossPromotions,
  useUpdateCrossPromotionStatus,
} from "@/hooks/useAudience";
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

// ─── Personas Tab ────────────────────────────────────────────────────────────

function PersonasTab() {
  const { data: personas = [], isLoading } = useAudiencePersonas();
  const createPersona = useCreateAudiencePersona();
  const deletePersona = useDeleteAudiencePersona();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", estimatedSize: "" });

  function handleAdd() {
    if (!form.name) return;
    createPersona.mutate(
      {
        name: form.name,
        description: form.description,
        estimatedSize: form.estimatedSize ? Number(form.estimatedSize) : null,
      },
      { onSuccess: () => { setShowAdd(false); setForm({ name: "", description: "", estimatedSize: "" }); } }
    );
  }

  if (isLoading) return <div className="flex justify-center py-20 text-sm text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Audience segments Morgan uses to target content.</p>
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Persona
        </Button>
      </div>

      {(personas as any[]).length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No audience personas yet. Create segments to help Morgan target content.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(personas as any[]).map((p: any) => (
            <Card key={p.id} className="group">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{p.name}</p>
                    {p.description && <p className="text-xs text-muted-foreground mt-1">{p.description}</p>}
                    <div className="flex items-center gap-2 mt-2">
                      {p.estimatedSize && (
                        <Badge variant="outline" className="text-[10px]">~{p.estimatedSize.toLocaleString()} people</Badge>
                      )}
                      {p.isAiGenerated && (
                        <Badge variant="secondary" className="text-[10px]">AI Generated</Badge>
                      )}
                      {p.platforms && (p.platforms as string[]).map((pl: string) => (
                        <Badge key={pl} variant="outline" className="text-[10px]">{pl}</Badge>
                      ))}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100"
                    onClick={() => deletePersona.mutate(p.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Audience Persona</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Horror Fans 18-24" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Young horror fans who engage most on TikTok..." rows={3} />
            </div>
            <div>
              <Label>Estimated Size</Label>
              <Input type="number" value={form.estimatedSize} onChange={(e) => setForm({ ...form, estimatedSize: e.target.value })} placeholder="50000" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={createPersona.isPending}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Engagement Tab ──────────────────────────────────────────────────────────

const TEMPLATE_CATEGORIES = [
  { value: "comment_reply", label: "Comment Reply" },
  { value: "dm_response", label: "DM Response" },
  { value: "mention_response", label: "Mention Response" },
  { value: "review_response", label: "Review Response" },
];

function EngagementTab() {
  const { data: templates = [], isLoading } = useEngagementTemplates();
  const createTemplate = useCreateEngagementTemplate();
  const deleteTemplate = useDeleteEngagementTemplate();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", category: "comment_reply", templateText: "", triggerPattern: "" });

  function handleAdd() {
    if (!form.name || !form.templateText) return;
    createTemplate.mutate(form, {
      onSuccess: () => { setShowAdd(false); setForm({ name: "", category: "comment_reply", templateText: "", triggerPattern: "" }); },
    });
  }

  if (isLoading) return <div className="flex justify-center py-20 text-sm text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Response templates Morgan uses to draft replies (human approves).</p>
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Template
        </Button>
      </div>

      {(templates as any[]).length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <MessageSquare className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No engagement templates yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {(templates as any[]).map((t: any) => (
            <Card key={t.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{t.name}</p>
                      <Badge variant="outline" className="text-[10px]">
                        {TEMPLATE_CATEGORIES.find((c) => c.value === t.category)?.label ?? t.category}
                      </Badge>
                      {t.usageCount > 0 && (
                        <span className="text-[10px] text-muted-foreground">Used {t.usageCount}x</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{t.templateText}</p>
                    {t.triggerPattern && (
                      <p className="text-[10px] text-muted-foreground mt-1 font-mono">Trigger: {t.triggerPattern}</p>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => deleteTemplate.mutate(t.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Engagement Template</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Positive Comment Thank You" />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TEMPLATE_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Template Text</Label>
              <Textarea value={form.templateText} onChange={(e) => setForm({ ...form, templateText: e.target.value })}
                placeholder="Thanks for watching {film_title}! Glad you enjoyed it." rows={4} />
              <p className="text-[10px] text-muted-foreground mt-1">Use {"{film_title}"}, {"{user_name}"} as variables</p>
            </div>
            <div>
              <Label>Trigger Pattern (optional)</Label>
              <Input value={form.triggerPattern} onChange={(e) => setForm({ ...form, triggerPattern: e.target.value })} placeholder="loved it|amazing|great film" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={createTemplate.isPending}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Competitors Tab ─────────────────────────────────────────────────────────

function CompetitorsTab() {
  const { data: competitors = [], isLoading } = useCompetitors();
  const createCompetitor = useCreateCompetitor();
  const deleteCompetitor = useDeleteCompetitor();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", website: "", postingFrequency: "", strengthNotes: "", weaknessNotes: "" });

  function handleAdd() {
    if (!form.name) return;
    createCompetitor.mutate(form, {
      onSuccess: () => { setShowAdd(false); setForm({ name: "", website: "", postingFrequency: "", strengthNotes: "", weaknessNotes: "" }); },
    });
  }

  if (isLoading) return <div className="flex justify-center py-20 text-sm text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Track what similar indie companies are doing on social.</p>
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Competitor
        </Button>
      </div>

      {(competitors as any[]).length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Eye className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No competitors tracked yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {(competitors as any[]).map((c: any) => (
            <Card key={c.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{c.name}</p>
                      {c.website && (
                        <a href={c.website} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary hover:underline">{new URL(c.website).hostname}</a>
                      )}
                      {c.postingFrequency && (
                        <Badge variant="outline" className="text-[10px]">{c.postingFrequency}</Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      {c.strengthNotes && (
                        <div className="text-xs">
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">Strengths: </span>
                          <span className="text-muted-foreground">{c.strengthNotes}</span>
                        </div>
                      )}
                      {c.weaknessNotes && (
                        <div className="text-xs">
                          <span className="text-amber-600 dark:text-amber-400 font-medium">Weaknesses: </span>
                          <span className="text-muted-foreground">{c.weaknessNotes}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => deleteCompetitor.mutate(c.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Competitor</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Company Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="NEON" />
            </div>
            <div>
              <Label>Website</Label>
              <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://neonrated.com" />
            </div>
            <div>
              <Label>Posting Frequency</Label>
              <Input value={form.postingFrequency} onChange={(e) => setForm({ ...form, postingFrequency: e.target.value })} placeholder="3x/week" />
            </div>
            <div>
              <Label>Strengths</Label>
              <Input value={form.strengthNotes} onChange={(e) => setForm({ ...form, strengthNotes: e.target.value })} placeholder="Strong TikTok presence, viral moments" />
            </div>
            <div>
              <Label>Weaknesses</Label>
              <Input value={form.weaknessNotes} onChange={(e) => setForm({ ...form, weaknessNotes: e.target.value })} placeholder="Low engagement on X, inconsistent posting" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={createCompetitor.isPending}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Cross-Promo Tab ─────────────────────────────────────────────────────────

function CrossPromoTab() {
  const { data: promos = [], isLoading } = useCrossPromotions();
  const { data: titles = [] } = useTitles();
  const updateStatus = useUpdateCrossPromotionStatus();

  function titleName(id: number): string {
    return (titles as any[]).find((t: any) => t.id === id)?.title ?? `Title #${id}`;
  }

  const statusColors: Record<string, string> = {
    suggested: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    approved: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    used: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    dismissed: "bg-muted text-muted-foreground",
  };

  if (isLoading) return <div className="flex justify-center py-20 text-sm text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Titles with overlapping audiences that could benefit from cross-promotion. Morgan generates these automatically.
      </p>

      {(promos as any[]).length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <ArrowRightLeft className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No cross-promotion suggestions yet. Morgan will generate these based on audience overlap.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {(promos as any[]).map((p: any) => (
            <Card key={p.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">
                        {titleName(p.sourceTitleId)} <ArrowRightLeft className="inline h-3 w-3 mx-1 text-muted-foreground" /> {titleName(p.targetTitleId)}
                      </p>
                      <Badge className={`text-[10px] ${statusColors[p.status] ?? ""}`}>
                        {p.status}
                      </Badge>
                      {p.overlapScore && (
                        <span className="text-[10px] text-muted-foreground">{p.overlapScore}% overlap</span>
                      )}
                    </div>
                    {p.reason && <p className="text-xs text-muted-foreground mt-1">{p.reason}</p>}
                    {p.suggestedCopy && (
                      <div className="mt-2 p-2 rounded-lg bg-muted/30 text-xs">{p.suggestedCopy}</div>
                    )}
                  </div>
                  {p.status === "suggested" && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-emerald-600"
                        onClick={() => updateStatus.mutate({ id: p.id, status: "approved" })}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => updateStatus.mutate({ id: p.id, status: "dismissed" })}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function AudiencePage() {
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Audience & Engagement</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Audience segments, engagement templates, competitor intel, and cross-promotion.
        </p>
      </div>

      <Tabs defaultValue="personas" className="space-y-4">
        <TabsList>
          <TabsTrigger value="personas" className="gap-1.5">
            <Target className="h-3.5 w-3.5" /> Personas
          </TabsTrigger>
          <TabsTrigger value="engagement" className="gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" /> Engagement
          </TabsTrigger>
          <TabsTrigger value="competitors" className="gap-1.5">
            <Eye className="h-3.5 w-3.5" /> Competitors
          </TabsTrigger>
          <TabsTrigger value="cross-promo" className="gap-1.5">
            <ArrowRightLeft className="h-3.5 w-3.5" /> Cross-Promo
          </TabsTrigger>
        </TabsList>

        <TabsContent value="personas"><PersonasTab /></TabsContent>
        <TabsContent value="engagement"><EngagementTab /></TabsContent>
        <TabsContent value="competitors"><CompetitorsTab /></TabsContent>
        <TabsContent value="cross-promo"><CrossPromoTab /></TabsContent>
      </Tabs>
    </div>
  );
}

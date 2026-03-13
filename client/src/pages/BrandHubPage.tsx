import { useState } from "react";
import {
  Palette,
  FileText,
  MessageSquare,
  Plus,
  Trash2,
  ExternalLink,
  Copy,
  Check,
  Image,
  Type,
  Globe,
  ChevronDown,
} from "lucide-react";
import {
  useBrandAssets,
  useCreateBrandAsset,
  useDeleteBrandAsset,
  useBrandVoiceRules,
  useCreateBrandVoiceRule,
  useUpdateBrandVoiceRule,
  useDeleteBrandVoiceRule,
  useSocialProfiles,
  useCreateSocialProfile,
  useDeleteSocialProfile,
  usePressKitItems,
  useCreatePressKitItem,
  useDeletePressKitItem,
} from "@/hooks/useBrand";
import { useTitles } from "@/hooks/useTitles";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const PLATFORM_ICONS: Record<string, string> = {
  instagram: "IG",
  tiktok: "TK",
  x: "X",
  youtube: "YT",
  facebook: "FB",
  letterboxd: "LB",
  imdb: "IM",
};

const ASSET_TYPE_LABELS: Record<string, string> = {
  logo: "Logo",
  logo_dark: "Logo (Dark)",
  icon: "Icon",
  wordmark: "Wordmark",
  color_palette: "Color Palette",
  font: "Font",
  press_photo: "Press Photo",
  social_banner: "Social Banner",
  email_header: "Email Header",
  other: "Other",
};

// ─── Assets Tab ──────────────────────────────────────────────────────────────

function AssetsTab() {
  const { data: assets = [], isLoading } = useBrandAssets();
  const createAsset = useCreateBrandAsset();
  const deleteAsset = useDeleteBrandAsset();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", type: "logo", fileUrl: "", mimeType: "" });

  function handleAdd() {
    if (!form.name || !form.fileUrl) return;
    createAsset.mutate(form, {
      onSuccess: () => {
        setShowAdd(false);
        setForm({ name: "", type: "logo", fileUrl: "", mimeType: "" });
      },
    });
  }

  if (isLoading) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">Loading assets...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Logos, fonts, color palettes, and brand imagery.</p>
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Asset
        </Button>
      </div>

      {(assets as any[]).length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Image className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No brand assets yet. Add logos, fonts, and imagery.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {(assets as any[]).map((asset: any) => (
            <Card key={asset.id} className="group relative">
              <CardContent className="p-4">
                {asset.mimeType?.startsWith("image/") || asset.fileUrl?.match(/\.(png|jpg|jpeg|svg|webp|gif)$/i) ? (
                  <div className="h-24 rounded-lg bg-muted/50 flex items-center justify-center mb-3 overflow-hidden">
                    <img src={asset.fileUrl} alt={asset.name} className="max-h-full max-w-full object-contain" />
                  </div>
                ) : (
                  <div className="h-24 rounded-lg bg-muted/50 flex items-center justify-center mb-3">
                    <FileText className="h-8 w-8 text-muted-foreground/40" />
                  </div>
                )}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{asset.name}</p>
                    <Badge variant="outline" className="text-[10px] mt-1">
                      {ASSET_TYPE_LABELS[asset.type] ?? asset.type}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <a href={asset.fileUrl} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </a>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => deleteAsset.mutate(asset.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Brand Asset</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="OAE Primary Logo" />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ASSET_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>File URL</Label>
              <Input value={form.fileUrl} onChange={(e) => setForm({ ...form, fileUrl: e.target.value })} placeholder="https://..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={createAsset.isPending}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Voice Guide Tab ─────────────────────────────────────────────────────────

function VoiceGuideTab() {
  const { data: rules = [], isLoading } = useBrandVoiceRules();
  const createRule = useCreateBrandVoiceRule();
  const updateRule = useUpdateBrandVoiceRule();
  const deleteRule = useDeleteBrandVoiceRule();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", doExample: "", dontExample: "" });

  function handleAdd() {
    if (!form.name) return;
    createRule.mutate(form, {
      onSuccess: () => {
        setShowAdd(false);
        setForm({ name: "", description: "", doExample: "", dontExample: "" });
      },
    });
  }

  if (isLoading) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">Loading voice guide...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Rules that define OAE's brand voice. Morgan checks all content against these.</p>
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Rule
        </Button>
      </div>

      {(rules as any[]).length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <MessageSquare className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No voice rules yet. Define how OAE should sound.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {(rules as any[]).map((rule: any) => (
            <Card key={rule.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{rule.name}</p>
                      <Switch
                        checked={rule.isActive}
                        onCheckedChange={(checked) => updateRule.mutate({ id: rule.id, isActive: checked })}
                      />
                    </div>
                    {rule.description && (
                      <p className="text-xs text-muted-foreground">{rule.description}</p>
                    )}
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      {rule.doExample && (
                        <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/10 p-2.5">
                          <p className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">Do</p>
                          <p className="text-xs text-foreground/80">{rule.doExample}</p>
                        </div>
                      )}
                      {rule.dontExample && (
                        <div className="rounded-lg bg-destructive/5 border border-destructive/10 p-2.5">
                          <p className="text-[10px] font-medium text-destructive uppercase tracking-wider mb-1">Don't</p>
                          <p className="text-xs text-foreground/80">{rule.dontExample}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive shrink-0"
                    onClick={() => deleteRule.mutate(rule.id)}
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
          <DialogHeader>
            <DialogTitle>Add Voice Rule</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Rule Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Active Voice" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Always use active, direct language..." rows={2} />
            </div>
            <div>
              <Label>Do Example</Label>
              <Input value={form.doExample} onChange={(e) => setForm({ ...form, doExample: e.target.value })} placeholder="'Watch the trailer now'" />
            </div>
            <div>
              <Label>Don't Example</Label>
              <Input value={form.dontExample} onChange={(e) => setForm({ ...form, dontExample: e.target.value })} placeholder="'The trailer can be viewed here'" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={createRule.isPending}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Social Profiles Tab ─────────────────────────────────────────────────────

function SocialProfilesTab() {
  const { data: profiles = [], isLoading } = useSocialProfiles();
  const createProfile = useCreateSocialProfile();
  const deleteProfile = useDeleteSocialProfile();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ platform: "instagram", handle: "", profileUrl: "", bio: "" });
  const [copied, setCopied] = useState<number | null>(null);

  function handleAdd() {
    if (!form.handle || !form.profileUrl) return;
    createProfile.mutate(form, {
      onSuccess: () => {
        setShowAdd(false);
        setForm({ platform: "instagram", handle: "", profileUrl: "", bio: "" });
      },
    });
  }

  function copyBio(id: number, text: string) {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  if (isLoading) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">Loading profiles...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Centralized social handles, bios, and profile links.</p>
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Profile
        </Button>
      </div>

      {(profiles as any[]).length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Globe className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No social profiles yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {(profiles as any[]).map((profile: any) => (
            <Card key={profile.id}>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                  {PLATFORM_ICONS[profile.platform] ?? profile.platform.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">@{profile.handle}</p>
                    <Badge variant="outline" className="text-[10px]">{profile.platform}</Badge>
                    {profile.followerCount && (
                      <span className="text-[10px] text-muted-foreground">{profile.followerCount.toLocaleString()} followers</span>
                    )}
                  </div>
                  {profile.bio && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{profile.bio}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {profile.bio && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyBio(profile.id, profile.bio)}>
                      {copied === profile.id ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  )}
                  <a href={profile.profileUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </a>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteProfile.mutate(profile.id)}>
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
          <DialogHeader>
            <DialogTitle>Add Social Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Platform</Label>
              <Select value={form.platform} onValueChange={(v) => setForm({ ...form, platform: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PLATFORM_ICONS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{k.charAt(0).toUpperCase() + k.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Handle</Label>
              <Input value={form.handle} onChange={(e) => setForm({ ...form, handle: e.target.value })} placeholder="otheranimal" />
            </div>
            <div>
              <Label>Profile URL</Label>
              <Input value={form.profileUrl} onChange={(e) => setForm({ ...form, profileUrl: e.target.value })} placeholder="https://instagram.com/otheranimal" />
            </div>
            <div>
              <Label>Bio</Label>
              <Textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Independent genre film company..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={createProfile.isPending}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Press Kit Tab ───────────────────────────────────────────────────────────

function PressKitTab() {
  const { data: titles = [] } = useTitles();
  const [selectedTitleId, setSelectedTitleId] = useState<number | undefined>();
  const { data: items = [] } = usePressKitItems(selectedTitleId);
  const createItem = useCreatePressKitItem();
  const deleteItem = useDeletePressKitItem();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ type: "synopsis", label: "", content: "", attribution: "" });

  function handleAdd() {
    if (!selectedTitleId || !form.content) return;
    createItem.mutate({ ...form, titleId: selectedTitleId }, {
      onSuccess: () => {
        setShowAdd(false);
        setForm({ type: "synopsis", label: "", content: "", attribution: "" });
      },
    });
  }

  const PRESS_KIT_TYPES = [
    { value: "synopsis", label: "Synopsis" },
    { value: "tagline", label: "Tagline" },
    { value: "review_quote", label: "Review Quote" },
    { value: "still", label: "Still Image" },
    { value: "trailer_link", label: "Trailer Link" },
    { value: "contact", label: "Contact Info" },
    { value: "laurel", label: "Festival Laurel" },
    { value: "fact_sheet", label: "Fact Sheet" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Select value={selectedTitleId?.toString() ?? ""} onValueChange={(v) => setSelectedTitleId(Number(v))}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Select a title..." />
            </SelectTrigger>
            <SelectContent>
              {(titles as any[]).map((t: any) => (
                <SelectItem key={t.id} value={t.id.toString()}>{t.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">Per-title press kit materials.</p>
        </div>
        {selectedTitleId && (
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Item
          </Button>
        )}
      </div>

      {!selectedTitleId ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Select a title to manage its press kit.</p>
          </CardContent>
        </Card>
      ) : (items as any[]).length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No press kit items for this title yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {(items as any[]).map((item: any) => (
            <Card key={item.id}>
              <CardContent className="flex items-start gap-3 p-4">
                <Badge variant="outline" className="text-[10px] shrink-0 mt-0.5">
                  {PRESS_KIT_TYPES.find((t) => t.value === item.type)?.label ?? item.type}
                </Badge>
                <div className="flex-1 min-w-0">
                  {item.label && <p className="text-xs font-medium mb-0.5">{item.label}</p>}
                  <p className="text-sm text-foreground/80 whitespace-pre-wrap">{item.content}</p>
                  {item.attribution && (
                    <p className="text-xs text-muted-foreground mt-1">— {item.attribution}</p>
                  )}
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => deleteItem.mutate(item.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Press Kit Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRESS_KIT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Label (optional)</Label>
              <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Short label..." />
            </div>
            <div>
              <Label>Content</Label>
              <Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Synopsis text, URL, quote, etc." rows={4} />
            </div>
            <div>
              <Label>Attribution (for quotes)</Label>
              <Input value={form.attribution} onChange={(e) => setForm({ ...form, attribution: e.target.value })} placeholder="Dread Central" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={createItem.isPending}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function BrandHubPage() {
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Brand Hub</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Brand assets, voice guide, social profiles, and press kits for OAE and its titles.
        </p>
      </div>

      <Tabs defaultValue="assets" className="space-y-4">
        <TabsList>
          <TabsTrigger value="assets" className="gap-1.5">
            <Image className="h-3.5 w-3.5" /> Assets
          </TabsTrigger>
          <TabsTrigger value="voice" className="gap-1.5">
            <Type className="h-3.5 w-3.5" /> Voice Guide
          </TabsTrigger>
          <TabsTrigger value="social" className="gap-1.5">
            <Globe className="h-3.5 w-3.5" /> Social Profiles
          </TabsTrigger>
          <TabsTrigger value="press-kit" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" /> Press Kits
          </TabsTrigger>
        </TabsList>

        <TabsContent value="assets"><AssetsTab /></TabsContent>
        <TabsContent value="voice"><VoiceGuideTab /></TabsContent>
        <TabsContent value="social"><SocialProfilesTab /></TabsContent>
        <TabsContent value="press-kit"><PressKitTab /></TabsContent>
      </Tabs>
    </div>
  );
}

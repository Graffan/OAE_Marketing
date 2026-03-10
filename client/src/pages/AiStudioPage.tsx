import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, FileText, AlertTriangle, X } from "lucide-react";
import { useSettings } from "@/hooks/useSettings";
import { useTitles } from "@/hooks/useTitles";
import { useCampaigns } from "@/hooks/useCampaigns";
import { useClips } from "@/hooks/useClips";
import { useAiUsage, useGenerateContent, useGetManualPrompt } from "@/hooks/useAiStudio";
import type { GenerateResult } from "@/hooks/useCampaigns";
import ProviderSelector from "@/components/ai/ProviderSelector";
import TokenUsageBar from "@/components/ai/TokenUsageBar";
import ManualPasteModal from "@/components/ai/ManualPasteModal";

const TASKS = [
  {
    value: "campaign_brief",
    label: "Campaign Brief",
    description: "Generate a full marketing brief for a title",
  },
  {
    value: "clip_to_post",
    label: "Clip to Post",
    description: "Turn a clip into ready-to-post social copy",
  },
  {
    value: "territory_assistant",
    label: "Territory Assistant",
    description: "Get region-specific campaign guidance",
  },
  {
    value: "catalog_revival",
    label: "Catalog Revival",
    description: "Identify back-catalog titles to re-promote",
  },
];

const PLATFORMS = ["TikTok", "Instagram", "YouTube Shorts", "X", "Facebook"];
const REGIONS = ["US", "CA", "GB", "AU", "DE", "FR", "JP", "BR", "MX"];

export default function AiStudioPage() {
  const { settings } = useSettings();
  const { data: titles = [] } = useTitles();
  const { data: campaigns = [] } = useCampaigns();
  const { data: usage } = useAiUsage();

  const [task, setTask] = useState("campaign_brief");
  const [provider, setProvider] = useState<string | null>(null);
  const [titleId, setTitleId] = useState<number | null>(null);
  const [goal, setGoal] = useState("");
  const [region, setRegion] = useState("US");
  const [platform, setPlatform] = useState("TikTok");
  const [clipId, setClipId] = useState<number | null>(null);
  const [attachCampaignId, setAttachCampaignId] = useState<number | null>(null);

  const [result, setResult] = useState<GenerateResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manualModal, setManualModal] = useState<GenerateResult | null>(null);
  const [savedText, setSavedText] = useState<string | null>(null);

  const { data: clips = [] } = useClips(
    task === "clip_to_post" && titleId ? { titleId, status: "approved" } : {}
  );

  const generate = useGenerateContent();
  const getPrompt = useGetManualPrompt();

  const draftCampaigns = campaigns.filter(
    (c) => c.status === "draft" || c.status === "ai_generated"
  );

  function buildContext(): Record<string, unknown> {
    const ctx: Record<string, unknown> = { titleId, region };
    if (task === "campaign_brief") ctx.goal = goal;
    if (task === "clip_to_post") { ctx.clipId = clipId; ctx.platform = platform; }
    if (attachCampaignId) ctx.campaignId = attachCampaignId;
    return ctx;
  }

  function handleGenerate() {
    setError(null);
    setResult(null);
    setSavedText(null);

    if (provider === "manual") {
      getPrompt.mutate(
        { task, context: buildContext() },
        {
          onSuccess: (res) => setManualModal(res),
          onError: (e: unknown) => setError(e instanceof Error ? e.message : String(e)),
        }
      );
      return;
    }

    generate.mutate(
      {
        task,
        campaignId: attachCampaignId ?? undefined,
        clipId: task === "clip_to_post" && clipId ? clipId : undefined,
        provider: provider ?? undefined,
        context: buildContext(),
      },
      {
        onSuccess: (res) => {
          if (res.manualMode) {
            setManualModal(res);
          } else {
            setResult(res);
          }
        },
        onError: (e: unknown) => setError(e instanceof Error ? e.message : String(e)),
      }
    );
  }

  function handleGetPromptOnly() {
    setError(null);
    getPrompt.mutate(
      { task, context: buildContext() },
      {
        onSuccess: (res) => setManualModal(res),
        onError: (e: unknown) => setError(e instanceof Error ? e.message : String(e)),
      }
    );
  }

  const isLoading = generate.isPending || getPrompt.isPending;

  return (
    <div className="p-6 space-y-5">
      <h1 className="text-xl font-semibold">AI Studio</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left — Input */}
        <div className="space-y-5">
          {/* Task selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Task</label>
            <div className="grid grid-cols-2 gap-2">
              {TASKS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTask(t.value)}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    task === t.value
                      ? "border-rose-500 bg-rose-500/5"
                      : "border-border hover:border-border/80 hover:bg-muted/50"
                  }`}
                >
                  <div className="font-medium text-sm">{t.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{t.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Context fields */}
          {task !== "catalog_revival" && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Select
                value={titleId ? String(titleId) : "none"}
                onValueChange={(v) => setTitleId(v === "none" ? null : Number(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select title…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {titles.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>{t.titleName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {task === "campaign_brief" && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Goal (optional)</label>
              <input
                type="text"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="e.g. awareness, watch_now"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
              />
            </div>
          )}

          {(task === "campaign_brief" || task === "territory_assistant") && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Region</label>
              <Select value={region} onValueChange={setRegion}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REGIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {task === "clip_to_post" && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Clip</label>
                <Select
                  value={clipId ? String(clipId) : "none"}
                  onValueChange={(v) => setClipId(v === "none" ? null : Number(v))}
                >
                  <SelectTrigger><SelectValue placeholder="Select clip…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— None —</SelectItem>
                    {clips.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.filename}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Platform</label>
                <Select value={platform} onValueChange={setPlatform}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Region</label>
                <Select value={region} onValueChange={setRegion}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {REGIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* Attach campaign */}
          {draftCampaigns.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Save to Campaign (optional)</label>
              <Select
                value={attachCampaignId ? String(attachCampaignId) : "none"}
                onValueChange={(v) => setAttachCampaignId(v === "none" ? null : Number(v))}
              >
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {draftCampaigns.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.campaignName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Provider */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Provider</label>
            <ProviderSelector value={provider} onChange={setProvider} settings={settings} />
          </div>

          {/* Token usage */}
          {usage && settings && (
            <TokenUsageBar
              dailyTotal={usage.dailyTotal}
              dailyCap={settings.aiDailyTokenCap ?? 100000}
            />
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/5 px-3 py-2.5">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-destructive">Generation failed</p>
                <p className="text-xs text-destructive/80 mt-0.5 break-words">{error}</p>
              </div>
              <button onClick={() => setError(null)} className="shrink-0 text-destructive/60 hover:text-destructive">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <div className="flex gap-2">
            <Button className="flex-1" onClick={handleGenerate} disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Generate
            </Button>
            <Button variant="outline" onClick={handleGetPromptOnly} disabled={isLoading}>
              <FileText className="h-4 w-4 mr-1" />
              Get Prompt
            </Button>
          </div>
        </div>

        {/* Right — Output */}
        <div className="space-y-4">
          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {savedText && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm capitalize">{task.replace(/_/g, " ")}</CardTitle>
                  <Badge variant="outline" className="text-xs">manual_paste</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{savedText}</p>
              </CardContent>
            </Card>
          )}

          {result && result.text && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm capitalize">{task.replace(/_/g, " ")}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{result.provider}</Badge>
                    <span className="text-xs text-muted-foreground">{result.latencyMs}ms</span>
                    <span className="text-xs text-muted-foreground">
                      {(result.tokensIn + result.tokensOut).toLocaleString()} tokens
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{result.text}</p>
              </CardContent>
            </Card>
          )}

          {!isLoading && !result && !savedText && !error && (
            <div className="flex items-center justify-center py-20 text-center">
              <div>
                <Sparkles className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Output will appear here</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {manualModal && (
        <ManualPasteModal
          open
          task={task}
          promptText={manualModal.promptForUser ?? ""}
          systemPrompt={manualModal.systemPrompt ?? ""}
          onSave={(text) => {
            setSavedText(text);
            setManualModal(null);
          }}
          onClose={() => setManualModal(null)}
        />
      )}
    </div>
  );
}

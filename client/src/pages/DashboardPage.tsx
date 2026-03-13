import React, { useState, useRef } from "react";
import { Link, useLocation } from "wouter";
import {
  Film, Video, Globe, Link2, ArrowRight,
  AlertTriangle, CheckCircle, TrendingUp, Activity,
  BrainCircuit, Send, MessageSquare, Clock, Inbox,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useTitles } from "@/hooks/useTitles";
import { useClips } from "@/hooks/useClips";
import { useSmartLinks } from "@/hooks/useSmartLinks";
import { useDestinationAlerts } from "@/hooks/useDestinations";
import { useAnalyticsDashboard } from "@/hooks/useAnalytics";
import { useMorganConversations, useCreateMorganConversation, useSendMessage } from "@/hooks/useMorgan";
import { useMorganTasks } from "@/hooks/useMorganTasks";
import ExpiryAlerts from "@/components/ExpiryAlerts";
import { useAuth } from "@/hooks/useAuth";
import { fetchJSON } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import type { Campaign, Title, Clip } from "@shared/schema";
import type { RotationByProject } from "@/hooks/useAnalytics";

// ─── Types ────────────────────────────────────────────────────────────────────
type AssetHealth = {
  unsyncedProjects: { id: number; name: string }[];
  titlesWithNoClips: Title[];
  titlesWithNoDestinations: { id: number; titleName: string }[];
  clipsWithMissingMetadata: Clip[];
};
type AiSummary = { text: string | null; createdAt: string | null } | null;

// ─── Local sub-components ─────────────────────────────────────────────────────
function SectionHeader({ title }: { title: string }) {
  return (
    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
      {title}
    </h2>
  );
}

function StatCard({ label, value, icon: Icon, href, loading }: {
  label: string; value: number | string; icon: React.ElementType; href?: string; loading?: boolean;
}) {
  const content = (
    <div className={cn("rounded-xl border border-border bg-card p-5 flex items-center gap-4 transition-colors", href && "hover:bg-muted/30 cursor-pointer")}>
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

function CampaignStatusBadge({ status }: { status: string }) {
  const classes: Record<string, string> = {
    active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    awaiting_approval: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    ai_generated: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    draft: "bg-muted text-muted-foreground",
    completed: "bg-muted text-muted-foreground",
  };
  const label = status.replace(/_/g, " ");
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize", classes[status] ?? "bg-muted text-muted-foreground")}>
      {label}
    </span>
  );
}

function HealthRow({ ok, okMessage, failMessage, count }: { ok: boolean; okMessage: string; failMessage: string; count?: number }) {
  return (
    <div className={cn("flex items-start gap-3 rounded-lg px-4 py-3", ok ? "bg-green-50 dark:bg-green-900/10" : "bg-red-50 dark:bg-red-900/10")}>
      {ok
        ? <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
        : <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />}
      <p className={cn("text-sm", ok ? "text-green-800 dark:text-green-300" : "text-red-800 dark:text-red-300")}>
        {ok ? okMessage : `${count} ${failMessage}`}
      </p>
    </div>
  );
}

// ─── Morgan Widget ────────────────────────────────────────────────────────────

function MorganWidget() {
  const [, navigate] = useLocation();
  const [quickMessage, setQuickMessage] = useState("");
  const [morganReply, setMorganReply] = useState<string | null>(null);
  const [isAsking, setIsAsking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: conversations = [] } = useMorganConversations();
  const createConvo = useCreateMorganConversation();
  const sendMessage = useSendMessage();
  const { data: tasks = [] } = useMorganTasks();

  // Recent tasks summary
  const recentTasks = (tasks as any[]).slice(0, 3);
  const pendingApprovals = (tasks as any[]).filter((t: any) => t.taskType === "content_draft" && t.status === "completed").length;

  async function handleQuickAsk() {
    if (!quickMessage.trim() || isAsking) return;
    setIsAsking(true);
    setMorganReply(null);
    try {
      // Find or create a conversation
      let convoId: number;
      const existing = (conversations as any[]).find((c: any) => !c.archivedAt);
      if (existing) {
        convoId = existing.id;
      } else {
        const newConvo = await createConvo.mutateAsync({ title: "Dashboard Quick Chat" });
        convoId = newConvo.id;
      }
      const result = await sendMessage.mutateAsync({ conversationId: convoId, message: quickMessage });
      setMorganReply(result.response);
      setQuickMessage("");
    } catch (err: any) {
      setMorganReply(`Sorry, I couldn't process that: ${err.message}`);
    } finally {
      setIsAsking(false);
    }
  }

  return (
    <div>
      <SectionHeader title="Morgan" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Quick Chat */}
        <Card className="lg:col-span-2">
          <CardContent className="p-4">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="h-8 w-8 rounded-full bg-violet-500/10 flex items-center justify-center shrink-0">
                <BrainCircuit className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <p className="text-sm font-medium">Ask Morgan</p>
                <p className="text-[11px] text-muted-foreground">What should I post today? Plan a campaign for Last Moon?</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={quickMessage}
                onChange={(e) => setQuickMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleQuickAsk()}
                placeholder="Ask Morgan anything..."
                disabled={isAsking}
                className="text-sm"
              />
              <Button
                size="sm"
                onClick={handleQuickAsk}
                disabled={!quickMessage.trim() || isAsking}
                className="shrink-0"
              >
                {isAsking ? (
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>

            {morganReply && (
              <div className="mt-3 p-3 rounded-lg bg-violet-500/5 border border-violet-500/10">
                <p className="text-sm text-foreground/90 whitespace-pre-wrap">{morganReply}</p>
              </div>
            )}

            <div className="flex items-center gap-2 mt-3">
              <Button variant="ghost" size="sm" className="text-xs h-7 text-muted-foreground" onClick={() => navigate("/morgan")}>
                <MessageSquare className="h-3 w-3 mr-1" /> Full Chat
              </Button>
              <Button variant="ghost" size="sm" className="text-xs h-7 text-muted-foreground" onClick={() => navigate("/morgan/status")}>
                <Inbox className="h-3 w-3 mr-1" /> Approval Queue
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Task Status */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium">Recent Activity</p>
              <Link href="/morgan/status">
                <Button variant="ghost" size="sm" className="text-xs h-6">View All</Button>
              </Link>
            </div>

            {recentTasks.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">
                No tasks yet. Morgan will start running scheduled tasks once AI providers are configured.
              </p>
            ) : (
              <div className="space-y-2">
                {recentTasks.map((task: any) => (
                  <div key={task.id} className="flex items-center gap-2.5 py-1">
                    <div className={cn(
                      "h-1.5 w-1.5 rounded-full shrink-0",
                      task.status === "completed" ? "bg-emerald-500" :
                      task.status === "failed" ? "bg-destructive" :
                      task.status === "running" ? "bg-blue-500 animate-pulse" : "bg-muted-foreground"
                    )} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs truncate">{task.taskType.replace(/_/g, " ")}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {task.completedAt
                          ? new Date(task.completedAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                          : task.status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── DashboardPage ─────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();

  // Section 1 — Stat cards
  const { data: titles, isLoading: titlesLoading } = useTitles();
  const { data: clips, isLoading: clipsLoading } = useClips();
  const { data: smartLinks, isLoading: linksLoading } = useSmartLinks();
  const { data: alerts } = useDestinationAlerts();

  // Sections 2–5 — dashboard summary
  const { data: summary, isLoading: summaryLoading } = useAnalyticsDashboard();

  // Section 6 — AI summary
  const { data: aiSummary, isLoading: aiLoading } = useQuery<AiSummary>({
    queryKey: ["/api/analytics/summary"],
    queryFn: () => fetchJSON("/api/analytics/summary"),
  });

  // Section 7 — Asset health
  const { data: assetHealth, isLoading: healthLoading } = useQuery<AssetHealth>({
    queryKey: ["/api/analytics/asset-health"],
    queryFn: () => fetchJSON("/api/analytics/asset-health"),
  });

  const role = user?.role ?? "";
  const canEdit = ["admin", "marketing_operator"].includes(role);
  const canSeeAiRecs = ["admin", "marketing_operator", "reviewer"].includes(role);

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-5 border-b border-border">
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Live marketing command center</p>
      </div>

      <div className="flex-1 overflow-auto px-6 py-6 space-y-8">

        {/* Section 1 — Stat Cards */}
        <div>
          <SectionHeader title="Overview" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Titles" value={titles?.length ?? 0} icon={Film} href="/titles" loading={titlesLoading} />
            <StatCard label="Clips" value={clips?.length ?? 0} icon={Video} href="/clips" loading={clipsLoading} />
            <StatCard label="Expiring Watch Links" value={alerts?.expiringCount ?? 0} icon={Globe} href="/destinations" />
            <StatCard label="Smart Links" value={smartLinks?.length ?? 0} icon={Link2} href="/smart-links" loading={linksLoading} />
          </div>
        </div>

        {/* Morgan Command Center */}
        <MorganWidget />

        {/* Alerts */}
        <div>
          <SectionHeader title="Alerts" />
          <ExpiryAlerts compact={false} />
        </div>

        {/* Section 2 — Campaigns in Flight */}
        <div>
          <SectionHeader title="Campaigns in Flight" />
          {summaryLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
            </div>
          ) : !summary?.activeCampaigns?.length ? (
            <Card>
              <CardContent className="py-6 text-center">
                <p className="text-sm text-muted-foreground mb-3">No active campaigns.</p>
                <Link href="/campaigns">
                  <Button variant="outline" size="sm">Go to Campaigns</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {summary.activeCampaigns.map((c: Campaign & { titleName?: string }) => (
                <Link key={c.id} href="/campaigns">
                  <div className="rounded-xl border border-border bg-card px-4 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors cursor-pointer">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.campaignName}</p>
                      {c.titleName && <p className="text-xs text-muted-foreground truncate">{c.titleName}</p>}
                    </div>
                    <CampaignStatusBadge status={c.status ?? "draft"} />
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Section 3 — Rotation Status */}
        <div>
          <SectionHeader title="Rotation Status" />
          {summaryLoading ? (
            <div className="space-y-2">
              {[0, 1].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
            </div>
          ) : !summary?.rotationByProject?.length ? (
            <Card><CardContent className="py-6 text-center text-sm text-muted-foreground">No projects with clips.</CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {summary.rotationByProject.map((p: RotationByProject) => {
                const pct = p.totalApproved > 0 ? Math.round((p.totalPosted / p.totalApproved) * 100) : 0;
                const remaining = p.totalApproved - p.totalPosted;
                return (
                  <Card key={p.projectId}>
                    <CardContent className="py-4 px-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium truncate">{p.projectName}</p>
                        {p.isPoolExhausted
                          ? <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">Pool Exhausted</span>
                          : <span className="text-xs text-muted-foreground">{remaining} remaining</span>}
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-rose-500 rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{p.totalPosted} of {p.totalApproved} clips used</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Section 4 — Titles Needing Promotion */}
        <div>
          <SectionHeader title="Titles Needing Promotion" />
          {summaryLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
            </div>
          ) : !summary?.titlesNeedingPromotion?.length ? (
            <Card><CardContent className="py-6 text-center text-sm text-muted-foreground">All titles have active campaigns.</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {summary.titlesNeedingPromotion.slice(0, 6).map((t: Title) => (
                <div key={t.id} className="rounded-xl border border-border bg-card px-4 py-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-medium truncate">{t.titleName ?? (t as unknown as { name?: string }).name}</p>
                  <Link href="/campaigns">
                    <Button variant="outline" size="sm" className="text-xs h-7 flex-shrink-0">
                      Create Campaign
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 5 — Top Clips */}
        <div>
          <SectionHeader title="Top Clips" />
          {summaryLoading ? (
            <div className="space-y-2">
              {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
            </div>
          ) : !summary?.topClips?.length ? (
            <Card><CardContent className="py-6 text-center text-sm text-muted-foreground">No clips with performance data yet.</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {summary.topClips.slice(0, 5).map((c: Clip) => {
                const score = c.engagementScore != null ? parseFloat(c.engagementScore) : 0;
                const scoreClass = score > 5
                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                  : score >= 1
                  ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                  : "bg-muted text-muted-foreground";
                return (
                  <Link key={c.id} href="/clips">
                    <div className="rounded-xl border border-border bg-card px-4 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors cursor-pointer">
                      <Activity className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <p className="text-sm flex-1 truncate">{c.filename}</p>
                      <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", scoreClass)}>
                        {score.toFixed(2)}
                      </span>
                      <span className="text-xs text-muted-foreground flex-shrink-0">{c.status}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Section 6 — AI Recommendations (admin, marketing_operator, reviewer only) */}
        {canSeeAiRecs && (
          <div>
            <SectionHeader title="AI Recommendations" />
            {aiLoading ? (
              <Skeleton className="h-32 w-full rounded-xl" />
            ) : aiSummary?.text ? (
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="text-base">AI Weekly Summary</CardTitle>
                    <div className="flex items-center gap-2">
                      {aiSummary.createdAt && (
                        <Badge variant="secondary" className="text-xs">
                          {new Date(aiSummary.createdAt).toLocaleDateString()}
                        </Badge>
                      )}
                      <Button variant="outline" size="sm" onClick={() => navigate("/ai-studio")}>
                        Regenerate
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-[8]">{aiSummary.text}</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-6 text-center">
                  <p className="text-sm text-muted-foreground mb-3">No weekly summary yet.</p>
                  <Button variant="outline" size="sm" onClick={() => navigate("/ai-studio")}>Generate in AI Studio</Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Section 7 — Asset Health (admin and marketing_operator only) */}
        {canEdit && (
          <div>
            <SectionHeader title="Asset Health" />
            {healthLoading ? (
              <div className="space-y-2">
                {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
              </div>
            ) : (
              <div className="space-y-2">
                <HealthRow
                  ok={!assetHealth?.unsyncedProjects?.length}
                  okMessage="All projects synced"
                  failMessage="projects have sync errors"
                  count={assetHealth?.unsyncedProjects?.length}
                />
                <HealthRow
                  ok={!assetHealth?.titlesWithNoClips?.length}
                  okMessage="All titles have clips"
                  failMessage="titles have no clips"
                  count={assetHealth?.titlesWithNoClips?.length}
                />
                <HealthRow
                  ok={!assetHealth?.titlesWithNoDestinations?.length}
                  okMessage="All titles have watch links"
                  failMessage="titles have no watch links"
                  count={assetHealth?.titlesWithNoDestinations?.length}
                />
                <HealthRow
                  ok={!assetHealth?.clipsWithMissingMetadata?.length}
                  okMessage="All clips have complete metadata"
                  failMessage="clips missing hook type or theme"
                  count={assetHealth?.clipsWithMissingMetadata?.length}
                />
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

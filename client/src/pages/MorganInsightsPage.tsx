import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { fetchJSON, apiRequest, parseOrThrow, queryClient } from "@/lib/queryClient";
import {
  Brain,
  Lightbulb,
  FlaskConical,
  Search,
  Cpu,
  TrendingUp,
  CheckCircle2,
  Clock,
  Loader2,
  Play,
  BarChart3,
  BookOpen,
  Sparkles,
  AlertTriangle,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Insight {
  id: number | string;
  type: string;
  content: string;
  source?: string;
  createdAt: string;
  confidence?: number;
}

interface Strategy {
  name: string;
  status: string;
  description?: string;
  learnings?: string[];
}

interface Playbook {
  strategies?: Strategy[];
  experiments?: ExperimentRecord[];
  learnings?: string[];
}

interface ExperimentRecord {
  id: number | string;
  name: string;
  hypothesis?: string;
  status: string;
  startedAt?: string;
  result?: string;
  metrics?: Record<string, unknown>;
}

interface TokenBudget {
  dailyLimit?: number;
  used?: number;
  apiTokens?: number;
  localTokens?: number;
  percentUsed?: number;
}

interface ModelRecommendation {
  activeModel?: string;
  recommendations?: Array<{
    model: string;
    reason: string;
    suitable?: boolean;
  }>;
}

interface TrendReport {
  trends?: Array<{
    topic: string;
    score?: number;
    summary?: string;
  }>;
  generatedAt?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

const INSIGHT_BADGE: Record<string, { label: string; className: string }> = {
  observation: {
    label: "Observation",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  },
  hypothesis: {
    label: "Hypothesis",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  },
  result: {
    label: "Result",
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
  learning: {
    label: "Learning",
    className: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  },
};

const EXPERIMENT_STATUS: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  running: {
    label: "Running",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    icon: Loader2,
  },
  completed: {
    label: "Completed",
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    icon: CheckCircle2,
  },
  pending: {
    label: "Pending",
    className: "bg-muted text-muted-foreground",
    icon: Clock,
  },
  failed: {
    label: "Failed",
    className: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    icon: AlertTriangle,
  },
};

// ─── Strategy Playbook Tab ──────────────────────────────────────────────────

function PlaybookTab() {
  const { data, isLoading, error } = useQuery<Playbook>({
    queryKey: ["/api/morgan/playbook"],
    queryFn: () => fetchJSON("/api/morgan/playbook"),
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 border border-dashed border-border/50 rounded-xl">
        <AlertTriangle className="h-8 w-8 text-muted-foreground/20 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Failed to load playbook</p>
        <p className="text-xs text-muted-foreground/60 mt-1">{(error as Error).message}</p>
      </div>
    );
  }

  const strategies = data?.strategies ?? [];
  const learnings = data?.learnings ?? [];

  return (
    <div className="space-y-6">
      {/* Active Strategies */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">Active Strategies</h3>
        {strategies.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-border/50 rounded-xl">
            <BookOpen className="h-8 w-8 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No strategies in the playbook yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Morgan builds strategies from experiment results and observations
            </p>
          </div>
        ) : (
          strategies.map((strategy, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl border border-border/50 bg-card space-y-2"
            >
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-violet-500 flex-shrink-0" />
                <span className="text-sm font-medium">{strategy.name}</span>
                <Badge className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                  {strategy.status}
                </Badge>
              </div>
              {strategy.description && (
                <p className="text-xs text-muted-foreground pl-6">{strategy.description}</p>
              )}
              {strategy.learnings && strategy.learnings.length > 0 && (
                <ul className="pl-6 space-y-1">
                  {strategy.learnings.map((l, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <Lightbulb className="h-3 w-3 text-amber-500 flex-shrink-0 mt-0.5" />
                      {l}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))
        )}
      </div>

      {/* Global Learnings */}
      {learnings.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">Key Learnings</h3>
          <div className="p-4 rounded-xl border border-border/50 bg-card space-y-2">
            {learnings.map((learning, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <Lightbulb className="h-3.5 w-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">{learning}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Insights Log Tab ───────────────────────────────────────────────────────

function InsightsLogTab() {
  const [filter, setFilter] = useState<string>("all");

  const { data: insights = [], isLoading, error } = useQuery<Insight[]>({
    queryKey: ["/api/morgan/insights"],
    queryFn: () => fetchJSON("/api/morgan/insights"),
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 border border-dashed border-border/50 rounded-xl">
        <AlertTriangle className="h-8 w-8 text-muted-foreground/20 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Failed to load insights</p>
      </div>
    );
  }

  const insightList = insights as Insight[];
  const filtered = filter === "all" ? insightList : insightList.filter((i) => i.type === filter);

  return (
    <div className="space-y-4">
      {/* Filter buttons */}
      <div className="flex flex-wrap gap-2">
        {["all", "observation", "hypothesis", "result", "learning"].map((type) => (
          <Button
            key={type}
            variant={filter === type ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(type)}
            className="text-xs capitalize"
          >
            {type}
          </Button>
        ))}
      </div>

      {/* Insights list */}
      {filtered.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-border/50 rounded-xl">
          <Brain className="h-8 w-8 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No insights recorded yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Morgan logs observations, hypotheses, and results as she works
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((insight) => {
            const badge = INSIGHT_BADGE[insight.type] ?? {
              label: insight.type,
              className: "bg-muted text-muted-foreground",
            };
            return (
              <div
                key={insight.id}
                className="p-4 rounded-xl border border-border/50 bg-card"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <Badge className={`text-[10px] ${badge.className}`}>{badge.label}</Badge>
                  <span className="text-[10px] text-muted-foreground/60">
                    {formatTime(insight.createdAt)}
                  </span>
                  {insight.confidence != null && (
                    <span className="text-[10px] text-muted-foreground/60">
                      Confidence: {Math.round(insight.confidence * 100)}%
                    </span>
                  )}
                </div>
                <p className="text-sm leading-relaxed">{insight.content}</p>
                {insight.source && (
                  <p className="text-[10px] text-muted-foreground/60 mt-1">Source: {insight.source}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Experiments Tab ────────────────────────────────────────────────────────

function ExperimentsTab() {
  const { data: playbook, isLoading } = useQuery<Playbook>({
    queryKey: ["/api/morgan/playbook"],
    queryFn: () => fetchJSON("/api/morgan/playbook"),
  });

  const measureMutation = useMutation({
    mutationFn: async (experimentId: number | string) => {
      const res = await apiRequest("POST", `/api/morgan/experiments/${experimentId}/measure`);
      return parseOrThrow(res);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/morgan/playbook"] });
    },
  });

  const [newExperiment, setNewExperiment] = useState({ name: "", hypothesis: "" });

  const startMutation = useMutation({
    mutationFn: async (payload: { name: string; hypothesis: string }) => {
      const res = await apiRequest("POST", "/api/morgan/experiments", payload);
      return parseOrThrow(res);
    },
    onSuccess: () => {
      setNewExperiment({ name: "", hypothesis: "" });
      queryClient.invalidateQueries({ queryKey: ["/api/morgan/playbook"] });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    );
  }

  const experiments = playbook?.experiments ?? [];

  return (
    <div className="space-y-6">
      {/* Start new experiment */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Start New Experiment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Experiment name (e.g., 'BTS content on Tuesdays')"
            value={newExperiment.name}
            onChange={(e) => setNewExperiment({ ...newExperiment, name: e.target.value })}
          />
          <Input
            placeholder="Hypothesis (e.g., 'BTS content gets 2x engagement on Tuesdays')"
            value={newExperiment.hypothesis}
            onChange={(e) => setNewExperiment({ ...newExperiment, hypothesis: e.target.value })}
          />
          <Button
            size="sm"
            onClick={() => startMutation.mutate(newExperiment)}
            disabled={!newExperiment.name.trim() || startMutation.isPending}
          >
            {startMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <FlaskConical className="h-3.5 w-3.5 mr-1.5" />
            )}
            Start Experiment
          </Button>
          {startMutation.isError && (
            <p className="text-xs text-red-500">{(startMutation.error as Error).message}</p>
          )}
        </CardContent>
      </Card>

      {/* Experiment list */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">
          Experiments ({experiments.length})
        </h3>
        {experiments.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-border/50 rounded-xl">
            <FlaskConical className="h-8 w-8 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No experiments yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Start an experiment above to test a marketing hypothesis
            </p>
          </div>
        ) : (
          experiments.map((exp) => {
            const status = EXPERIMENT_STATUS[exp.status] ?? EXPERIMENT_STATUS.pending;
            const StatusIcon = status.icon;
            return (
              <div
                key={exp.id}
                className="p-4 rounded-xl border border-border/50 bg-card space-y-2"
              >
                <div className="flex items-center gap-2">
                  <FlaskConical className="h-4 w-4 text-violet-500 flex-shrink-0" />
                  <span className="text-sm font-medium flex-1">{exp.name}</span>
                  <Badge className={`text-[10px] ${status.className}`}>
                    <StatusIcon
                      className={`h-3 w-3 mr-1 ${exp.status === "running" ? "animate-spin" : ""}`}
                    />
                    {status.label}
                  </Badge>
                </div>
                {exp.hypothesis && (
                  <p className="text-xs text-muted-foreground pl-6">{exp.hypothesis}</p>
                )}
                {exp.startedAt && (
                  <p className="text-[10px] text-muted-foreground/60 pl-6">
                    Started {formatTime(exp.startedAt)}
                  </p>
                )}
                {exp.result && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 pl-6">
                    Result: {exp.result}
                  </p>
                )}
                {exp.status === "running" && (
                  <div className="pl-6">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => measureMutation.mutate(exp.id)}
                      disabled={measureMutation.isPending}
                      className="text-xs"
                    >
                      {measureMutation.isPending ? (
                        <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                      ) : (
                        <BarChart3 className="h-3 w-3 mr-1.5" />
                      )}
                      Measure Results
                    </Button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── Web Research Tab ───────────────────────────────────────────────────────

function WebResearchTab() {
  const [topic, setTopic] = useState("");
  const [results, setResults] = useState<string | null>(null);

  const { data: trends, isLoading: trendsLoading } = useQuery<TrendReport>({
    queryKey: ["/api/morgan/trends"],
    queryFn: () => fetchJSON("/api/morgan/trends"),
  });

  const researchMutation = useMutation({
    mutationFn: async (researchTopic: string) => {
      const res = await apiRequest("POST", "/api/morgan/research", { topic: researchTopic });
      return parseOrThrow(res);
    },
    onSuccess: (data) => {
      setResults(typeof data === "string" ? data : JSON.stringify(data, null, 2));
    },
  });

  function handleResearch() {
    if (!topic.trim()) return;
    researchMutation.mutate(topic.trim());
  }

  return (
    <div className="space-y-6">
      {/* Research input */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Ask Morgan to Research</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Topic (e.g., 'indie horror film marketing trends 2026')"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleResearch();
              }}
              className="flex-1"
            />
            <Button
              onClick={handleResearch}
              disabled={!topic.trim() || researchMutation.isPending}
            >
              {researchMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </div>
          {researchMutation.isError && (
            <p className="text-xs text-red-500">{(researchMutation.error as Error).message}</p>
          )}
        </CardContent>
      </Card>

      {/* Research results */}
      {results && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">Research Results</h3>
          <div className="p-4 rounded-xl border border-border/50 bg-card">
            <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-words font-mono leading-relaxed">
              {results}
            </pre>
          </div>
        </div>
      )}

      {/* Trend report */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">Trend Report</h3>
        {trendsLoading ? (
          <Skeleton className="h-24 rounded-xl" />
        ) : !trends?.trends || trends.trends.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-border/50 rounded-xl">
            <TrendingUp className="h-8 w-8 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No trend data available yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {trends.generatedAt && (
              <p className="text-[10px] text-muted-foreground/60">
                Generated {formatTime(trends.generatedAt)}
              </p>
            )}
            {trends.trends.map((trend, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3 rounded-xl border border-border/50 bg-card"
              >
                <TrendingUp className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{trend.topic}</span>
                    {trend.score != null && (
                      <Badge className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                        Score: {trend.score}
                      </Badge>
                    )}
                  </div>
                  {trend.summary && (
                    <p className="text-xs text-muted-foreground mt-0.5">{trend.summary}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Token Budget & Model Info Tab ──────────────────────────────────────────

function SystemTab() {
  const { data: budget, isLoading: budgetLoading } = useQuery<TokenBudget>({
    queryKey: ["/api/morgan/token-budget"],
    queryFn: () => fetchJSON("/api/morgan/token-budget"),
  });

  const { data: modelInfo, isLoading: modelLoading } = useQuery<ModelRecommendation>({
    queryKey: ["/api/morgan/model-recommendations"],
    queryFn: () => fetchJSON("/api/morgan/model-recommendations"),
  });

  return (
    <div className="space-y-6">
      {/* Token Budget */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">Daily Token Budget</h3>
        {budgetLoading ? (
          <Skeleton className="h-32 rounded-xl" />
        ) : !budget ? (
          <div className="text-center py-8 border border-dashed border-border/50 rounded-xl">
            <BarChart3 className="h-8 w-8 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Token budget data unavailable</p>
          </div>
        ) : (
          <Card className="border-border/50">
            <CardContent className="pt-6 space-y-4">
              {/* Usage bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Usage</span>
                  <span className="font-medium">
                    {budget.percentUsed != null
                      ? `${Math.round(budget.percentUsed)}%`
                      : budget.dailyLimit
                        ? `${((budget.used ?? 0) / budget.dailyLimit * 100).toFixed(1)}%`
                        : "—"}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      (budget.percentUsed ?? 0) > 80
                        ? "bg-red-500"
                        : (budget.percentUsed ?? 0) > 50
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                    }`}
                    style={{
                      width: `${Math.min(
                        budget.percentUsed ??
                          (budget.dailyLimit ? ((budget.used ?? 0) / budget.dailyLimit) * 100 : 0),
                        100
                      )}%`,
                    }}
                  />
                </div>
              </div>

              {/* Breakdown */}
              <div className="grid grid-cols-2 gap-4">
                {budget.apiTokens != null && (
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">API Tokens</p>
                    <p className="text-lg font-semibold tabular-nums">
                      {budget.apiTokens.toLocaleString()}
                    </p>
                  </div>
                )}
                {budget.localTokens != null && (
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Local Tokens</p>
                    <p className="text-lg font-semibold tabular-nums">
                      {budget.localTokens.toLocaleString()}
                    </p>
                  </div>
                )}
                {budget.used != null && (
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Used Today</p>
                    <p className="text-lg font-semibold tabular-nums">
                      {budget.used.toLocaleString()}
                    </p>
                  </div>
                )}
                {budget.dailyLimit != null && (
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Daily Limit</p>
                    <p className="text-lg font-semibold tabular-nums">
                      {budget.dailyLimit.toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Model Info */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">Model Configuration</h3>
        {modelLoading ? (
          <Skeleton className="h-32 rounded-xl" />
        ) : !modelInfo ? (
          <div className="text-center py-8 border border-dashed border-border/50 rounded-xl">
            <Cpu className="h-8 w-8 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Model info unavailable</p>
          </div>
        ) : (
          <Card className="border-border/50">
            <CardContent className="pt-6 space-y-4">
              {/* Active model */}
              {modelInfo.activeModel && (
                <div className="flex items-center gap-3 p-3 rounded-xl border border-violet-200 dark:border-violet-800/50 bg-violet-50 dark:bg-violet-900/10">
                  <Cpu className="h-5 w-5 text-violet-500" />
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Active Model</p>
                    <p className="text-sm font-medium">{modelInfo.activeModel}</p>
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {modelInfo.recommendations && modelInfo.recommendations.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Proxmox Recommendations</p>
                  {modelInfo.recommendations.map((rec, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 p-3 rounded-xl border border-border/50 bg-card"
                    >
                      <Cpu className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{rec.model}</span>
                          {rec.suitable != null && (
                            <Badge
                              className={`text-[10px] ${
                                rec.suitable
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {rec.suitable ? "Suitable" : "Not recommended"}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{rec.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function MorganInsightsPage() {
  return (
    <div className="flex flex-col h-full">
      <div className="px-8 py-6 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center shadow-[0_2px_8px_rgba(139,92,246,0.3)]">
            <Brain className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Morgan's Brain</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Insights, experiments, research, and strategy playbook
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="playbook" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="border-b border-border/50 rounded-none bg-transparent w-full justify-start gap-1 h-auto px-8 py-0">
          <TabsTrigger
            value="playbook"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 px-4"
          >
            Playbook
          </TabsTrigger>
          <TabsTrigger
            value="insights"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 px-4"
          >
            Insights
          </TabsTrigger>
          <TabsTrigger
            value="experiments"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 px-4"
          >
            Experiments
          </TabsTrigger>
          <TabsTrigger
            value="research"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 px-4"
          >
            Research
          </TabsTrigger>
          <TabsTrigger
            value="system"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 px-4"
          >
            System
          </TabsTrigger>
        </TabsList>

        <TabsContent value="playbook" className="flex-1 overflow-auto p-8">
          <div className="max-w-3xl">
            <PlaybookTab />
          </div>
        </TabsContent>
        <TabsContent value="insights" className="flex-1 overflow-auto p-8">
          <div className="max-w-3xl">
            <InsightsLogTab />
          </div>
        </TabsContent>
        <TabsContent value="experiments" className="flex-1 overflow-auto p-8">
          <div className="max-w-3xl">
            <ExperimentsTab />
          </div>
        </TabsContent>
        <TabsContent value="research" className="flex-1 overflow-auto p-8">
          <div className="max-w-3xl">
            <WebResearchTab />
          </div>
        </TabsContent>
        <TabsContent value="system" className="flex-1 overflow-auto p-8">
          <div className="max-w-3xl">
            <SystemTab />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

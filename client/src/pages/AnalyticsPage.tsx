import React, { useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import {
  useTopClips,
  useAnalyticsByRegion,
  useAnalyticsByPlatform,
  useWeeklySummary,
} from "@/hooks/useAnalytics";
import type { WeeklySummaryResult } from "@/hooks/useAnalytics";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function engagementBadgeVariant(score: string | null | undefined): string {
  const n = parseFloat(score ?? "0");
  if (n > 5) return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
  if (n >= 1) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
  return "bg-muted text-muted-foreground";
}

function StatCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <p className="text-lg font-semibold">{value.toLocaleString()}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

// ─── Tab: Top Clips ───────────────────────────────────────────────────────────

function TopClipsTab() {
  const { data: clips, isLoading } = useTopClips(20);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-14 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (!clips || clips.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No clips with engagement data yet.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {clips.map((clip) => (
        <Card key={clip.id} className="border border-border">
          <CardContent className="py-3 px-4 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{clip.filename}</p>
              <p className="text-xs text-muted-foreground">
                Posted {clip.postedCount} time{clip.postedCount !== 1 ? "s" : ""}
              </p>
            </div>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${engagementBadgeVariant(clip.engagementScore)}`}
            >
              Score: {clip.engagementScore != null ? parseFloat(clip.engagementScore).toFixed(2) : "0.00"}
            </span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Tab: By Region ───────────────────────────────────────────────────────────

function ByRegionTab() {
  const { data: regions, isLoading } = useAnalyticsByRegion();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (!regions || regions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No regional data yet.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {regions.map((r) => (
        <Card key={r.region} className="border border-border">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm font-semibold">{r.region}</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="grid grid-cols-4 gap-2">
              <StatCell label="Impressions" value={r.impressions ?? 0} />
              <StatCell label="Plays" value={r.plays ?? 0} />
              <StatCell label="Likes" value={r.likes ?? 0} />
              <StatCell label="Click-throughs" value={r.clickThroughs ?? 0} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Tab: By Platform ─────────────────────────────────────────────────────────

function ByPlatformTab() {
  const { data: platforms, isLoading } = useAnalyticsByPlatform();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (!platforms || platforms.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No platform data yet.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {platforms.map((p) => (
        <Card key={p.platform} className="border border-border">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm font-semibold">{p.platform}</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="grid grid-cols-4 gap-2">
              <StatCell label="Impressions" value={p.impressions ?? 0} />
              <StatCell label="Plays" value={p.plays ?? 0} />
              <StatCell label="Likes" value={p.likes ?? 0} />
              <StatCell label="Click-throughs" value={p.clickThroughs ?? 0} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Tab: Campaigns ───────────────────────────────────────────────────────────

function CampaignsTab() {
  return (
    <div className="py-8 text-center">
      <p className="text-sm text-muted-foreground">
        Select a campaign from the{" "}
        <Link href="/campaigns" className="underline text-foreground hover:text-primary">
          Campaigns page
        </Link>{" "}
        to view its analytics.
      </p>
    </div>
  );
}

// ─── Weekly Summary Dialog ────────────────────────────────────────────────────

function WeeklySummaryDialog({
  open,
  onClose,
  isPending,
  result,
  error,
}: {
  open: boolean;
  onClose: () => void;
  isPending: boolean;
  result: WeeklySummaryResult | undefined;
  error: Error | null;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>AI Weekly Summary</DialogTitle>
        </DialogHeader>
        <div className="mt-2">
          {isPending && (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          )}
          {!isPending && error && (
            <p className="text-sm text-destructive">{error.message}</p>
          )}
          {!isPending && result && (
            <pre className="whitespace-pre-wrap text-sm leading-relaxed overflow-auto max-h-[60vh]">
              {result.text ?? "No summary generated."}
            </pre>
          )}
        </div>
        <div className="mt-4 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── AnalyticsPage ────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { user } = useAuth();
  const canGenerate = ["admin", "marketing_operator"].includes(user?.role ?? "");

  const [summaryOpen, setSummaryOpen] = useState(false);
  const weeklySummary = useWeeklySummary();

  function handleWeeklySummary() {
    setSummaryOpen(true);
    weeklySummary.mutate({});
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-5 border-b border-border flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Performance data by clip, region, and platform
          </p>
        </div>
        {canGenerate && (
          <Button
            size="sm"
            onClick={handleWeeklySummary}
            disabled={weeklySummary.isPending}
          >
            Weekly Summary
          </Button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-6 py-6">
        <Tabs defaultValue="top-clips">
          <TabsList className="mb-6">
            <TabsTrigger value="top-clips">Top Clips</TabsTrigger>
            <TabsTrigger value="by-region">By Region</TabsTrigger>
            <TabsTrigger value="by-platform">By Platform</TabsTrigger>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          </TabsList>

          <TabsContent value="top-clips">
            <TopClipsTab />
          </TabsContent>

          <TabsContent value="by-region">
            <ByRegionTab />
          </TabsContent>

          <TabsContent value="by-platform">
            <ByPlatformTab />
          </TabsContent>

          <TabsContent value="campaigns">
            <CampaignsTab />
          </TabsContent>
        </Tabs>
      </div>

      {/* Weekly Summary Dialog */}
      <WeeklySummaryDialog
        open={summaryOpen}
        onClose={() => setSummaryOpen(false)}
        isPending={weeklySummary.isPending}
        result={weeklySummary.data}
        error={weeklySummary.error}
      />
    </div>
  );
}

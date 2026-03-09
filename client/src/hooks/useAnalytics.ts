import { useQuery, useMutation } from "@tanstack/react-query";
import { fetchJSON, apiRequest } from "@/lib/queryClient";
import type { Clip, ClipPost, Campaign, Title } from "@shared/schema";

// ─── Return types matching API shapes ─────────────────────────────────────────

export type RegionStat = {
  region: string;
  impressions: number;
  plays: number;
  likes: number;
  clickThroughs: number;
  postCount: number;
};

export type PlatformStat = {
  platform: string;
  impressions: number;
  plays: number;
  likes: number;
  clickThroughs: number;
  postCount: number;
};

export type RotationByProject = {
  projectId: number;
  projectName: string;
  totalApproved: number;
  totalPosted: number;
  isPoolExhausted: boolean;
};

export type DashboardSummary = {
  activeCampaigns: Campaign[];
  titlesNeedingPromotion: Title[];
  rotationByProject: RotationByProject[];
  topClips: Clip[];
};

export type WeeklySummaryResult = {
  text: string | null;
  provider: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  latencyMs: number;
  logId: number | null;
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useAnalyticsDashboard() {
  return useQuery<DashboardSummary>({
    queryKey: ["/api/analytics/dashboard"],
    queryFn: () => fetchJSON("/api/analytics/dashboard"),
  });
}

export function useTopClips(limit = 10) {
  return useQuery<Clip[]>({
    queryKey: ["/api/analytics/top-clips", limit],
    queryFn: () => fetchJSON(`/api/analytics/top-clips?limit=${limit}`),
  });
}

export function useAnalyticsByRegion(titleId?: number) {
  const url = titleId
    ? `/api/analytics/by-region?titleId=${titleId}`
    : "/api/analytics/by-region";
  return useQuery<RegionStat[]>({
    queryKey: ["/api/analytics/by-region", titleId ?? null],
    queryFn: () => fetchJSON(url),
  });
}

export function useAnalyticsByPlatform(titleId?: number) {
  const url = titleId
    ? `/api/analytics/by-platform?titleId=${titleId}`
    : "/api/analytics/by-platform";
  return useQuery<PlatformStat[]>({
    queryKey: ["/api/analytics/by-platform", titleId ?? null],
    queryFn: () => fetchJSON(url),
  });
}

export function useClipAnalytics(clipId: number | null) {
  return useQuery<{ posts: ClipPost[]; performanceScore: number }>({
    queryKey: ["/api/analytics/clips", clipId],
    queryFn: () => fetchJSON(`/api/analytics/clips/${clipId}`),
    enabled: clipId !== null,
  });
}

export function useCampaignAnalytics(campaignId: number | null) {
  return useQuery<ClipPost[]>({
    queryKey: ["/api/analytics/campaigns", campaignId],
    queryFn: () => fetchJSON(`/api/analytics/campaigns/${campaignId}`),
    enabled: campaignId !== null,
  });
}

export function useWeeklySummary() {
  return useMutation<WeeklySummaryResult, Error, { provider?: string }>({
    mutationFn: (payload) =>
      apiRequest("POST", "/api/analytics/weekly-summary", payload).then((r) =>
        r.json()
      ),
  });
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchJSON, apiRequest } from "@/lib/queryClient";
import type { Campaign, CampaignContent } from "@shared/schema";

export type GenerateResult = {
  text: string | null;
  provider: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  latencyMs: number;
  logId: number | null;
  manualMode?: boolean;
  promptForUser?: string;
  systemPrompt?: string;
};

export function useCampaigns(titleId?: number) {
  const url = titleId ? `/api/campaigns?titleId=${titleId}` : "/api/campaigns";
  return useQuery<Campaign[]>({
    queryKey: ["/api/campaigns", titleId ?? null],
    queryFn: () => fetchJSON(url),
  });
}

export function useCampaign(id: number | null) {
  return useQuery<Campaign>({
    queryKey: ["/api/campaigns", id],
    queryFn: () => fetchJSON(`/api/campaigns/${id}`),
    enabled: id !== null,
  });
}

export function useCreateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Campaign>) =>
      apiRequest("POST", "/api/campaigns", data).then((r) => r.json() as Promise<Campaign>),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/campaigns"] }),
  });
}

export function useUpdateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Campaign> }) =>
      apiRequest("PATCH", `/api/campaigns/${id}`, data).then((r) => r.json() as Promise<Campaign>),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ["/api/campaigns"] });
      qc.invalidateQueries({ queryKey: ["/api/campaigns", id] });
    },
  });
}

export function useDeleteCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/campaigns/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/campaigns"] }),
  });
}

export function usePatchCampaignStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiRequest("PATCH", `/api/campaigns/${id}/status`, { status }).then((r) => r.json() as Promise<Campaign>),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ["/api/campaigns"] });
      qc.invalidateQueries({ queryKey: ["/api/campaigns", id] });
    },
  });
}

export function useCampaignContents(campaignId: number | null) {
  return useQuery<CampaignContent[]>({
    queryKey: ["/api/campaigns", campaignId, "contents"],
    queryFn: () => fetchJSON(`/api/campaigns/${campaignId}/contents`),
    enabled: campaignId !== null,
  });
}

export function useGenerateCampaignContent() {
  return useMutation({
    mutationFn: (payload: { task: string; campaignId?: number; clipId?: number; provider?: string; context?: Record<string, unknown> }) =>
      apiRequest("POST", "/api/ai/generate", payload).then((r) => r.json() as Promise<GenerateResult>),
  });
}

export function useActivateCampaignContent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ campaignId, contentId }: { campaignId: number; contentId: number }) =>
      apiRequest("PATCH", `/api/campaigns/${campaignId}/contents/${contentId}/activate`).then((r) => r.json()),
    onSuccess: (_data, { campaignId }) => {
      qc.invalidateQueries({ queryKey: ["/api/campaigns", campaignId, "contents"] });
    },
  });
}

export function useAiUsage() {
  return useQuery<{ dailyTotal: number; userTotals: { userId: number | null; total: number }[] }>({
    queryKey: ["/api/ai/usage"],
    queryFn: () => fetchJSON("/api/ai/usage"),
  });
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchJSON, apiRequest, parseOrThrow } from "@/lib/queryClient";
import type { PromptTemplate } from "@shared/schema";
import type { GenerateResult } from "./useCampaigns";

export type AiLog = {
  id: number;
  provider: string;
  model: string;
  task: string;
  tokensIn: number;
  tokensOut: number;
  latencyMs: number;
  status: string;
  userId: number | null;
  campaignId: number | null;
  promptText: string | null;
  responseText: string | null;
  createdAt: string;
};

export type AiUsage = {
  dailyTotal: number;
  userTotals: { userId: number | null; total: number }[];
};

export function useAiUsage() {
  return useQuery<AiUsage>({
    queryKey: ["/api/ai/usage"],
    queryFn: () => fetchJSON("/api/ai/usage"),
    staleTime: 30_000,
  });
}

export function useAiLogs(page: number) {
  return useQuery<{ logs: AiLog[]; total: number; page: number }>({
    queryKey: ["/api/ai/logs", page],
    queryFn: () => fetchJSON(`/api/ai/logs?page=${page}&limit=50`),
  });
}

export function usePromptTemplates() {
  return useQuery<PromptTemplate[]>({
    queryKey: ["/api/ai/prompt-templates"],
    queryFn: () => fetchJSON("/api/ai/prompt-templates"),
  });
}

export function useUpdatePromptTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<PromptTemplate> }) =>
      apiRequest("PATCH", `/api/ai/prompt-templates/${id}`, data).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/ai/prompt-templates"] }),
  });
}

export function useGenerateContent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      task: string;
      campaignId?: number;
      clipId?: number;
      provider?: string;
      context?: Record<string, unknown>;
    }) => apiRequest("POST", "/api/ai/generate", payload).then((r) => parseOrThrow<GenerateResult>(r)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/ai/usage"] }),
  });
}

export function useGetManualPrompt() {
  return useMutation({
    mutationFn: (payload: {
      task: string;
      context?: Record<string, unknown>;
    }) =>
      apiRequest("POST", "/api/ai/prompt-preview", payload).then((r) => parseOrThrow<GenerateResult>(r)),
  });
}

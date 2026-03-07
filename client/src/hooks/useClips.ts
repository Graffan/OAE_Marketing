import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchJSON, apiRequest } from "@/lib/queryClient";
import type { Clip } from "@shared/schema";

type ClipFilters = {
  titleId?: number;
  projectId?: number;
  status?: string;
  unpostedOnly?: boolean;
};

export type RotationStats = {
  totalApproved: number;
  postedCount: number;
  remainingInCycle: number;
};

function buildClipUrl(filters: ClipFilters): string {
  const params = new URLSearchParams();
  if (filters.titleId) params.set("titleId", String(filters.titleId));
  if (filters.projectId) params.set("projectId", String(filters.projectId));
  if (filters.status) params.set("status", filters.status);
  if (filters.unpostedOnly) params.set("unpostedOnly", "true");
  const qs = params.toString();
  return qs ? `/api/clips?${qs}` : "/api/clips";
}

export function useClips(filters: ClipFilters = {}) {
  return useQuery<Clip[]>({
    queryKey: ["/api/clips", filters],
    queryFn: () => fetchJSON(buildClipUrl(filters)),
  });
}

export function useClip(id: number | null) {
  return useQuery<Clip>({
    queryKey: ["/api/clips", id],
    queryFn: () => fetchJSON(`/api/clips/${id}`),
    enabled: id !== null,
  });
}

export function useUpdateClip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Clip> }) => {
      const res = await apiRequest("PUT", `/api/clips/${id}`, data);
      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: "Failed to update clip" }));
        throw new Error(body.message);
      }
      return res.json() as Promise<Clip>;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/clips"] }),
  });
}

export function useApproveClip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/clips/${id}/approve`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: "Failed to approve clip" }));
        throw new Error(body.message);
      }
      return res.json() as Promise<Clip>;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/clips"] }),
  });
}

export function useRejectClip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/clips/${id}/reject`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: "Failed to reject clip" }));
        throw new Error(body.message);
      }
      return res.json() as Promise<Clip>;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/clips"] }),
  });
}

export function useBulkApproveClips() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: number[]) => {
      const res = await apiRequest("POST", "/api/clips/bulk-approve", { ids });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: "Bulk approve failed" }));
        throw new Error(body.message);
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/clips"] }),
  });
}

export function useBulkArchiveClips() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: number[]) => {
      const res = await apiRequest("POST", "/api/clips/bulk-archive", { ids });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: "Bulk archive failed" }));
        throw new Error(body.message);
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/clips"] }),
  });
}

export function useRotationStats(projectId: number | null) {
  return useQuery<RotationStats>({
    queryKey: ["/api/clips/rotation-stats", projectId],
    queryFn: () => fetchJSON(`/api/clips/rotation-stats?projectId=${projectId}`),
    enabled: projectId !== null,
  });
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchJSON, apiRequest } from "@/lib/queryClient";
import type { ClipPost, Clip } from "@shared/schema";

export type { ClipPost };

export interface DuplicateWarning {
  lastPostedAt: string;
  platform: string;
  region: string;
  daysSince: number;
}

export interface RotationStats {
  totalApproved: number;
  totalPosted: number;
  totalUnposted: number;
  isPoolExhausted: boolean;
  lastResetAt: string | null;
}

export interface RotationData {
  stats: RotationStats;
  nextClip: Clip | null;
}

export function useClipPosts(clipId: number | null) {
  return useQuery<{ clipId: number; posts: ClipPost[] }>({
    queryKey: ["/api/clips", clipId, "post-history"],
    queryFn: () => fetchJSON(`/api/clips/${clipId}/post-history`),
    enabled: clipId !== null,
  });
}

export function useDuplicateWarning(
  clipId: number | null,
  platform: string,
  region: string
) {
  return useQuery<DuplicateWarning | null>({
    queryKey: ["/api/clips", clipId, "duplicate-warning", platform, region],
    queryFn: () =>
      fetchJSON(`/api/clips/${clipId}/duplicate-warning?platform=${encodeURIComponent(platform)}&region=${encodeURIComponent(region)}`),
    enabled: clipId !== null && platform.length > 0 && region.length > 0,
  });
}

export function useMarkPosted() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      clipId,
      platform,
      region,
      caption,
      cta,
      smartLinkId,
      postedAt,
    }: {
      clipId: number;
      platform: string;
      region: string;
      caption?: string;
      cta?: string;
      smartLinkId?: number;
      postedAt?: string;
    }) => {
      const res = await apiRequest("POST", `/api/clips/${clipId}/mark-posted`, {
        platform,
        region,
        caption,
        cta,
        smartLinkId,
        postedAt,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: "Failed to mark as posted" }));
        throw new Error(body.message);
      }
      return res.json() as Promise<{ clipPost: ClipPost; clip: Clip }>;
    },
    onSuccess: (_data, { clipId }) => {
      qc.invalidateQueries({ queryKey: ["/api/clips", clipId, "post-history"] });
      qc.invalidateQueries({ queryKey: ["/api/clips"] });
    },
  });
}

export function useRotationData(projectId: number | null) {
  return useQuery<RotationData>({
    queryKey: ["/api/projects", projectId, "rotation"],
    queryFn: () => fetchJSON(`/api/projects/${projectId}/rotation`),
    enabled: projectId !== null,
  });
}

export function useResetRotation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (projectId: number) => {
      const res = await apiRequest("POST", `/api/projects/${projectId}/rotation/reset`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: "Failed to reset rotation" }));
        throw new Error(body.message);
      }
      return res.json();
    },
    onSuccess: (_data, projectId) => {
      qc.invalidateQueries({ queryKey: ["/api/projects", projectId, "rotation"] });
      qc.invalidateQueries({ queryKey: ["/api/clips"] });
    },
  });
}

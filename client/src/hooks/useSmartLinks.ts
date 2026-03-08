import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchJSON, apiRequest } from "@/lib/queryClient";
import type { SmartLink, RegionalDestination } from "@shared/schema";

export function useSmartLinks(titleId?: number) {
  const url = titleId ? `/api/smart-links?titleId=${titleId}` : "/api/smart-links";
  return useQuery<SmartLink[]>({
    queryKey: ["/api/smart-links", titleId ?? null],
    queryFn: () => fetchJSON(url),
  });
}

export function useSmartLink(id: number | null) {
  return useQuery<SmartLink>({
    queryKey: ["/api/smart-links", id],
    queryFn: () => fetchJSON(`/api/smart-links/${id}`),
    enabled: id !== null,
  });
}

export type PreviewResult = {
  slug: string;
  titleId: number | null;
  countryCode: string;
  resolvedUrl: string;
  destination: RegionalDestination | null;
  isDefault: boolean;
  trackingParams: string;
};

export function usePreviewSmartLink() {
  return useMutation({
    mutationFn: async ({ slug, countryCode }: { slug: string; countryCode: string }): Promise<PreviewResult> => {
      const res = await apiRequest("POST", `/api/smart-links/${slug}/preview`, { countryCode });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: "Preview failed" }));
        throw new Error(body.message);
      }
      return res.json();
    },
  });
}

export function useCreateSmartLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<SmartLink, "id" | "createdAt" | "updatedAt"> & { slug?: string }) => {
      const res = await apiRequest("POST", "/api/smart-links", data);
      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: "Failed to create smart link" }));
        throw new Error(body.message);
      }
      return res.json() as Promise<SmartLink>;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/smart-links"] }),
  });
}

export function useUpdateSmartLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<SmartLink> }) => {
      const res = await apiRequest("PUT", `/api/smart-links/${id}`, data);
      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: "Failed to update smart link" }));
        throw new Error(body.message);
      }
      return res.json() as Promise<SmartLink>;
    },
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ["/api/smart-links"] });
      qc.invalidateQueries({ queryKey: ["/api/smart-links", id] });
    },
  });
}

export function useDeleteSmartLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/smart-links/${id}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: "Failed to delete smart link" }));
        throw new Error(body.message);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/smart-links"] }),
  });
}

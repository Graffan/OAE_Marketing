import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchJSON, apiRequest } from "@/lib/queryClient";
import type { RegionalDestination } from "@shared/schema";

export type DestinationComputedStatus = "active" | "expiring_soon" | "expired";
export type DestinationWithStatus = RegionalDestination & { computedStatus: DestinationComputedStatus };

export function useDestinations(titleId?: number) {
  const url = titleId ? `/api/destinations?titleId=${titleId}` : "/api/destinations";
  return useQuery<DestinationWithStatus[]>({
    queryKey: ["/api/destinations", titleId ?? null],
    queryFn: () => fetchJSON(url),
  });
}

export function useDestination(id: number | null) {
  return useQuery<RegionalDestination>({
    queryKey: ["/api/destinations", id],
    queryFn: () => fetchJSON(`/api/destinations/${id}`),
    enabled: id !== null,
  });
}

export function useExpiringDestinations() {
  return useQuery<DestinationWithStatus[]>({
    queryKey: ["/api/destinations/expiring"],
    queryFn: () => fetchJSON("/api/destinations/expiring"),
  });
}

export function useCreateDestination() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<RegionalDestination, "id" | "createdAt" | "updatedAt">) => {
      const res = await apiRequest("POST", "/api/destinations", data);
      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: "Failed to create destination" }));
        throw new Error(body.message);
      }
      return res.json() as Promise<RegionalDestination>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/destinations"] });
      qc.invalidateQueries({ queryKey: ["/api/destinations/expiring"] });
    },
  });
}

export function useUpdateDestination() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<RegionalDestination> }) => {
      const res = await apiRequest("PUT", `/api/destinations/${id}`, data);
      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: "Failed to update destination" }));
        throw new Error(body.message);
      }
      return res.json() as Promise<RegionalDestination>;
    },
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ["/api/destinations"] });
      qc.invalidateQueries({ queryKey: ["/api/destinations", id] });
      qc.invalidateQueries({ queryKey: ["/api/destinations/expiring"] });
    },
  });
}

export function useDeleteDestination() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/destinations/${id}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: "Failed to delete destination" }));
        throw new Error(body.message);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/destinations"] });
      qc.invalidateQueries({ queryKey: ["/api/destinations/expiring"] });
    },
  });
}

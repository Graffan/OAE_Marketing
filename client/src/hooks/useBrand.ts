import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchJSON } from "@/lib/queryClient";

// ─── Brand Assets ────────────────────────────────────────────────────────────

export function useBrandAssets(titleId?: number | null) {
  const param = titleId === undefined ? "" : titleId === null ? "?titleId=null" : `?titleId=${titleId}`;
  return useQuery({
    queryKey: ["/api/brand/assets", titleId],
    queryFn: () => fetchJSON(`/api/brand/assets${param}`),
  });
}

export function useCreateBrandAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      fetch("/api/brand/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      }).then((r) => {
        if (!r.ok) throw new Error("Failed to create asset");
        return r.json();
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/brand/assets"] });
    },
  });
}

export function useUpdateBrandAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & Record<string, unknown>) =>
      fetch(`/api/brand/assets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      }).then((r) => {
        if (!r.ok) throw new Error("Failed to update asset");
        return r.json();
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/brand/assets"] });
    },
  });
}

export function useDeleteBrandAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      fetch(`/api/brand/assets/${id}`, {
        method: "DELETE",
        credentials: "include",
      }).then((r) => {
        if (!r.ok) throw new Error("Failed to delete asset");
        return r.json();
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/brand/assets"] });
    },
  });
}

// ─── Brand Voice Rules ───────────────────────────────────────────────────────

export function useBrandVoiceRules(titleId?: number | null) {
  const param = titleId === undefined ? "" : titleId === null ? "?titleId=null" : `?titleId=${titleId}`;
  return useQuery({
    queryKey: ["/api/brand/voice", titleId],
    queryFn: () => fetchJSON(`/api/brand/voice${param}`),
  });
}

export function useCreateBrandVoiceRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      fetch("/api/brand/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      }).then((r) => {
        if (!r.ok) throw new Error("Failed to create rule");
        return r.json();
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/brand/voice"] });
    },
  });
}

export function useUpdateBrandVoiceRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & Record<string, unknown>) =>
      fetch(`/api/brand/voice/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      }).then((r) => {
        if (!r.ok) throw new Error("Failed to update rule");
        return r.json();
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/brand/voice"] });
    },
  });
}

export function useDeleteBrandVoiceRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      fetch(`/api/brand/voice/${id}`, {
        method: "DELETE",
        credentials: "include",
      }).then((r) => {
        if (!r.ok) throw new Error("Failed to delete rule");
        return r.json();
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/brand/voice"] });
    },
  });
}

// ─── Social Profiles ─────────────────────────────────────────────────────────

export function useSocialProfiles(titleId?: number | null) {
  const param = titleId === undefined ? "" : titleId === null ? "?titleId=null" : `?titleId=${titleId}`;
  return useQuery({
    queryKey: ["/api/brand/social-profiles", titleId],
    queryFn: () => fetchJSON(`/api/brand/social-profiles${param}`),
  });
}

export function useCreateSocialProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      fetch("/api/brand/social-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      }).then((r) => {
        if (!r.ok) throw new Error("Failed to create profile");
        return r.json();
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/brand/social-profiles"] });
    },
  });
}

export function useUpdateSocialProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & Record<string, unknown>) =>
      fetch(`/api/brand/social-profiles/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      }).then((r) => {
        if (!r.ok) throw new Error("Failed to update profile");
        return r.json();
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/brand/social-profiles"] });
    },
  });
}

export function useDeleteSocialProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      fetch(`/api/brand/social-profiles/${id}`, {
        method: "DELETE",
        credentials: "include",
      }).then((r) => {
        if (!r.ok) throw new Error("Failed to delete profile");
        return r.json();
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/brand/social-profiles"] });
    },
  });
}

// ─── Press Kit Items ─────────────────────────────────────────────────────────

export function usePressKitItems(titleId: number | undefined) {
  return useQuery({
    queryKey: ["/api/brand/press-kit", titleId],
    queryFn: () => fetchJSON(`/api/brand/press-kit/${titleId}`),
    enabled: !!titleId,
  });
}

export function useCreatePressKitItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      fetch("/api/brand/press-kit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      }).then((r) => {
        if (!r.ok) throw new Error("Failed to create press kit item");
        return r.json();
      }),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["/api/brand/press-kit"] });
    },
  });
}

export function useDeletePressKitItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      fetch(`/api/brand/press-kit/${id}`, {
        method: "DELETE",
        credentials: "include",
      }).then((r) => {
        if (!r.ok) throw new Error("Failed to delete press kit item");
        return r.json();
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/brand/press-kit"] });
    },
  });
}

// ─── Link Analytics ──────────────────────────────────────────────────────────

export function useLinkAnalyticsStats(smartLinkId?: number) {
  const param = smartLinkId ? `?smartLinkId=${smartLinkId}` : "";
  return useQuery({
    queryKey: ["/api/link-analytics/stats", smartLinkId],
    queryFn: () => fetchJSON(`/api/link-analytics/stats${param}`),
  });
}

export function useLinkAnalyticsEvents(filters?: Record<string, string | number>) {
  const params = filters
    ? "?" + Object.entries(filters).map(([k, v]) => `${k}=${v}`).join("&")
    : "";
  return useQuery({
    queryKey: ["/api/link-analytics/events", filters],
    queryFn: () => fetchJSON(`/api/link-analytics/events${params}`),
  });
}

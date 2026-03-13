import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchJSON } from "@/lib/queryClient";

// ─── Audience Personas ───────────────────────────────────────────────────────

export function useAudiencePersonas() {
  return useQuery({
    queryKey: ["/api/audience/personas"],
    queryFn: () => fetchJSON("/api/audience/personas"),
  });
}

export function useCreateAudiencePersona() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      fetch("/api/audience/personas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      }).then((r) => { if (!r.ok) throw new Error("Failed"); return r.json(); }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/audience/personas"] }),
  });
}

export function useDeleteAudiencePersona() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      fetch(`/api/audience/personas/${id}`, { method: "DELETE", credentials: "include" })
        .then((r) => { if (!r.ok) throw new Error("Failed"); return r.json(); }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/audience/personas"] }),
  });
}

// ─── Engagement Templates ────────────────────────────────────────────────────

export function useEngagementTemplates(category?: string) {
  const param = category ? `?category=${category}` : "";
  return useQuery({
    queryKey: ["/api/engagement/templates", category],
    queryFn: () => fetchJSON(`/api/engagement/templates${param}`),
  });
}

export function useCreateEngagementTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      fetch("/api/engagement/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      }).then((r) => { if (!r.ok) throw new Error("Failed"); return r.json(); }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/engagement/templates"] }),
  });
}

export function useDeleteEngagementTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      fetch(`/api/engagement/templates/${id}`, { method: "DELETE", credentials: "include" })
        .then((r) => { if (!r.ok) throw new Error("Failed"); return r.json(); }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/engagement/templates"] }),
  });
}

// ─── Competitors ─────────────────────────────────────────────────────────────

export function useCompetitors() {
  return useQuery({
    queryKey: ["/api/competitors"],
    queryFn: () => fetchJSON("/api/competitors"),
  });
}

export function useCreateCompetitor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      fetch("/api/competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      }).then((r) => { if (!r.ok) throw new Error("Failed"); return r.json(); }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/competitors"] }),
  });
}

export function useUpdateCompetitor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & Record<string, unknown>) =>
      fetch(`/api/competitors/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      }).then((r) => { if (!r.ok) throw new Error("Failed"); return r.json(); }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/competitors"] }),
  });
}

export function useDeleteCompetitor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      fetch(`/api/competitors/${id}`, { method: "DELETE", credentials: "include" })
        .then((r) => { if (!r.ok) throw new Error("Failed"); return r.json(); }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/competitors"] }),
  });
}

// ─── Cross-Promotions ────────────────────────────────────────────────────────

export function useCrossPromotions(status?: string) {
  const param = status ? `?status=${status}` : "";
  return useQuery({
    queryKey: ["/api/cross-promotions", status],
    queryFn: () => fetchJSON(`/api/cross-promotions${param}`),
  });
}

export function useUpdateCrossPromotionStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      fetch(`/api/cross-promotions/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
        credentials: "include",
      }).then((r) => { if (!r.ok) throw new Error("Failed"); return r.json(); }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/cross-promotions"] }),
  });
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchJSON } from "@/lib/queryClient";

// ─── Email Subscribers ───────────────────────────────────────────────────────

export function useEmailSubscribers(filters?: { isActive?: boolean; source?: string }) {
  const params = filters
    ? "?" + Object.entries(filters).filter(([, v]) => v !== undefined).map(([k, v]) => `${k}=${v}`).join("&")
    : "";
  return useQuery({
    queryKey: ["/api/email/subscribers", filters],
    queryFn: () => fetchJSON(`/api/email/subscribers${params}`),
  });
}

export function useEmailSubscriberCount() {
  return useQuery({
    queryKey: ["/api/email/subscribers/count"],
    queryFn: () => fetchJSON("/api/email/subscribers/count"),
  });
}

export function useDeleteEmailSubscriber() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      fetch(`/api/email/subscribers/${id}`, { method: "DELETE", credentials: "include" })
        .then((r) => { if (!r.ok) throw new Error("Failed"); return r.json(); }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/email/subscribers"] });
      qc.invalidateQueries({ queryKey: ["/api/email/subscribers/count"] });
    },
  });
}

// ─── Email Campaigns ─────────────────────────────────────────────────────────

export function useEmailCampaigns() {
  return useQuery({
    queryKey: ["/api/email/campaigns"],
    queryFn: () => fetchJSON("/api/email/campaigns"),
  });
}

export function useCreateEmailCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      fetch("/api/email/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      }).then((r) => { if (!r.ok) throw new Error("Failed"); return r.json(); }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/email/campaigns"] }),
  });
}

export function useUpdateEmailCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & Record<string, unknown>) =>
      fetch(`/api/email/campaigns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      }).then((r) => { if (!r.ok) throw new Error("Failed"); return r.json(); }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/email/campaigns"] }),
  });
}

export function useDeleteEmailCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      fetch(`/api/email/campaigns/${id}`, { method: "DELETE", credentials: "include" })
        .then((r) => { if (!r.ok) throw new Error("Failed"); return r.json(); }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/email/campaigns"] }),
  });
}

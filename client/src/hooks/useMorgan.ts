import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchJSON } from "@/lib/queryClient";

// ─── Conversations ───────────────────────────────────────────────────────────

export function useMorganConversations() {
  return useQuery({
    queryKey: ["/api/morgan/conversations"],
    queryFn: () => fetchJSON("/api/morgan/conversations"),
  });
}

export function useMorganMessages(conversationId: number | undefined) {
  return useQuery({
    queryKey: ["/api/morgan/conversations", conversationId, "messages"],
    queryFn: () => fetchJSON(`/api/morgan/conversations/${conversationId}/messages`),
    enabled: !!conversationId,
    refetchInterval: false,
  });
}

export function useCreateMorganConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data?: { title?: string }) =>
      fetch("/api/morgan/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data ?? {}),
        credentials: "include",
      }).then((r) => {
        if (!r.ok) throw new Error("Failed to create conversation");
        return r.json();
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/morgan/conversations"] });
    },
  });
}

export function useArchiveConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      fetch(`/api/morgan/conversations/${id}/archive`, {
        method: "POST",
        credentials: "include",
      }).then((r) => {
        if (!r.ok) throw new Error("Failed to archive conversation");
        return r.json();
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/morgan/conversations"] });
    },
  });
}

// ─── Chat ────────────────────────────────────────────────────────────────────

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, message }: { conversationId: number; message: string }) =>
      fetch(`/api/morgan/conversations/${conversationId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
        credentials: "include",
      }).then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          throw new Error(body.message ?? "Failed to send message");
        }
        return r.json();
      }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: ["/api/morgan/conversations", variables.conversationId, "messages"],
      });
      qc.invalidateQueries({ queryKey: ["/api/morgan/conversations"] });
    },
  });
}

// ─── Memory ──────────────────────────────────────────────────────────────────

export function useMorganMemory(type?: string) {
  const url = type ? `/api/morgan/memory?type=${type}` : "/api/morgan/memory";
  return useQuery({
    queryKey: ["/api/morgan/memory", type],
    queryFn: () => fetchJSON(url),
  });
}

export function useAddMorganMemory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { type: string; content: string; importance?: number }) =>
      fetch("/api/morgan/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      }).then((r) => {
        if (!r.ok) throw new Error("Failed to add memory");
        return r.json();
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/morgan/memory"] });
    },
  });
}

export function useDeleteMorganMemory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      fetch(`/api/morgan/memory/${id}`, {
        method: "DELETE",
        credentials: "include",
      }).then((r) => {
        if (!r.ok) throw new Error("Failed to delete memory");
        return r.json();
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/morgan/memory"] });
    },
  });
}

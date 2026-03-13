import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchJSON } from "@/lib/queryClient";

export function useMorganTasks() {
  return useQuery({
    queryKey: ["/api/morgan/tasks"],
    queryFn: () => fetchJSON("/api/morgan/tasks"),
    refetchInterval: 30_000, // Refresh every 30s to see task progress
  });
}

export function useRunMorganTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskType: string) =>
      fetch(`/api/morgan/tasks/${taskType}/run`, {
        method: "POST",
        credentials: "include",
      }).then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          throw new Error(body.message ?? "Failed to run task");
        }
        return r.json();
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/morgan/tasks"] });
    },
  });
}

export function useMorganAutoApproveRules() {
  return useQuery({
    queryKey: ["/api/morgan/auto-approve-rules"],
    queryFn: () => fetchJSON("/api/morgan/auto-approve-rules"),
  });
}

export function useCreateAutoApproveRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string; conditions: Record<string, unknown> }) =>
      fetch("/api/morgan/auto-approve-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      }).then((r) => {
        if (!r.ok) throw new Error("Failed to create rule");
        return r.json();
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/morgan/auto-approve-rules"] });
    },
  });
}

export function useUpdateAutoApproveRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & Record<string, unknown>) =>
      fetch(`/api/morgan/auto-approve-rules/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      }).then((r) => {
        if (!r.ok) throw new Error("Failed to update rule");
        return r.json();
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/morgan/auto-approve-rules"] });
    },
  });
}

export function useDeleteAutoApproveRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      fetch(`/api/morgan/auto-approve-rules/${id}`, {
        method: "DELETE",
        credentials: "include",
      }).then((r) => {
        if (!r.ok) throw new Error("Failed to delete rule");
        return r.json();
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/morgan/auto-approve-rules"] });
    },
  });
}

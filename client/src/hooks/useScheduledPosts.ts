import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchJSON } from "@/lib/queryClient";

interface ScheduledPostFilters {
  status?: string;
  platform?: string;
  campaignId?: number;
  from?: string;
  to?: string;
}

function buildQueryString(filters: ScheduledPostFilters): string {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.platform) params.set("platform", filters.platform);
  if (filters.campaignId) params.set("campaignId", String(filters.campaignId));
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function useScheduledPosts(filters: ScheduledPostFilters = {}) {
  const qs = buildQueryString(filters);
  return useQuery({
    queryKey: ["/api/scheduled-posts", filters],
    queryFn: () => fetchJSON(`/api/scheduled-posts${qs}`),
  });
}

export function useScheduledPost(id: number | undefined) {
  return useQuery({
    queryKey: ["/api/scheduled-posts", id],
    queryFn: () => fetchJSON(`/api/scheduled-posts/${id}`),
    enabled: !!id,
  });
}

export function useCalendarPosts(from: string, to: string) {
  return useQuery({
    queryKey: ["/api/scheduled-posts/calendar", from, to],
    queryFn: () => fetchJSON(`/api/scheduled-posts/calendar?from=${from}&to=${to}`),
  });
}

export function useCreateScheduledPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      fetch("/api/scheduled-posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      }).then((r) => {
        if (!r.ok) throw new Error("Failed to create post");
        return r.json();
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/scheduled-posts"] });
    },
  });
}

export function useUpdateScheduledPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & Record<string, unknown>) =>
      fetch(`/api/scheduled-posts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      }).then((r) => {
        if (!r.ok) throw new Error("Failed to update post");
        return r.json();
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/scheduled-posts"] });
    },
  });
}

export function useApprovePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      fetch(`/api/scheduled-posts/${id}/approve`, {
        method: "POST",
        credentials: "include",
      }).then((r) => {
        if (!r.ok) throw new Error("Failed to approve post");
        return r.json();
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/scheduled-posts"] });
    },
  });
}

export function useCancelPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      fetch(`/api/scheduled-posts/${id}/cancel`, {
        method: "POST",
        credentials: "include",
      }).then((r) => {
        if (!r.ok) throw new Error("Failed to cancel post");
        return r.json();
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/scheduled-posts"] });
    },
  });
}

export function useRetryPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      fetch(`/api/scheduled-posts/${id}/retry`, {
        method: "POST",
        credentials: "include",
      }).then((r) => {
        if (!r.ok) throw new Error("Failed to retry post");
        return r.json();
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/scheduled-posts"] });
    },
  });
}

export function useDeleteScheduledPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      fetch(`/api/scheduled-posts/${id}`, {
        method: "DELETE",
        credentials: "include",
      }).then((r) => {
        if (!r.ok) throw new Error("Failed to delete post");
        return r.json();
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/scheduled-posts"] });
    },
  });
}

export function usePublishNow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      fetch(`/api/scheduled-posts/${id}/publish-now`, {
        method: "POST",
        credentials: "include",
      }).then((r) => {
        if (!r.ok) throw new Error("Failed to publish");
        return r.json();
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/scheduled-posts"] });
    },
  });
}

export function useBulkCreatePosts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (posts: Record<string, unknown>[]) =>
      fetch("/api/scheduled-posts/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ posts }),
        credentials: "include",
      }).then((r) => {
        if (!r.ok) throw new Error("Failed to create posts");
        return r.json();
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/scheduled-posts"] });
    },
  });
}

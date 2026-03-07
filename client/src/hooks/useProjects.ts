import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchJSON, apiRequest } from "@/lib/queryClient";
import type { Project, InsertProject, Clip } from "@shared/schema";

export function useProjects(titleId?: number) {
  const url = titleId ? `/api/projects?titleId=${titleId}` : "/api/projects";
  return useQuery<Project[]>({
    queryKey: titleId ? ["/api/projects", { titleId }] : ["/api/projects"],
    queryFn: () => fetchJSON(url),
  });
}

export function useProject(id: number | null) {
  return useQuery<Project>({
    queryKey: ["/api/projects", id],
    queryFn: () => fetchJSON(`/api/projects/${id}`),
    enabled: id !== null,
    refetchInterval: (query) => {
      // Poll every 2 seconds while syncing
      const data = query.state.data as Project | undefined;
      return data?.syncStatus === "syncing" ? 2000 : false;
    },
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertProject) => {
      const res = await apiRequest("POST", "/api/projects", data);
      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: "Failed to create project" }));
        throw new Error(body.message);
      }
      return res.json() as Promise<Project>;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/projects"] }),
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertProject> }) => {
      const res = await apiRequest("PUT", `/api/projects/${id}`, data);
      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: "Failed to update project" }));
        throw new Error(body.message);
      }
      return res.json() as Promise<Project>;
    },
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ["/api/projects"] });
      qc.invalidateQueries({ queryKey: ["/api/projects", id] });
    },
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/projects/${id}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: "Failed to delete project" }));
        throw new Error(body.message);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/projects"] }),
  });
}

export function useSyncProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/projects/${id}/sync`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: "Sync failed to start" }));
        throw new Error(body.message);
      }
      return res.json();
    },
    onSuccess: (_data, id) => {
      // Invalidate project to start polling for sync status
      qc.invalidateQueries({ queryKey: ["/api/projects", id] });
      qc.invalidateQueries({ queryKey: ["/api/projects"] });
    },
  });
}

export function useProjectClips(id: number | null) {
  return useQuery<Clip[]>({
    queryKey: ["/api/projects", id, "clips"],
    queryFn: () => fetchJSON(`/api/projects/${id}/clips`),
    enabled: id !== null,
  });
}

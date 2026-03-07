import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchJSON, apiRequest } from "@/lib/queryClient";
import type { Title, InsertTitle } from "@shared/schema";

type TitleWithCounts = Title & { clipCount: number; campaignCount: number };

export function useTitles() {
  return useQuery<TitleWithCounts[]>({
    queryKey: ["/api/titles"],
    queryFn: () => fetchJSON("/api/titles"),
  });
}

export function useTitle(id: number | null) {
  return useQuery<Title>({
    queryKey: ["/api/titles", id],
    queryFn: () => fetchJSON(`/api/titles/${id}`),
    enabled: id !== null,
  });
}

export function useCreateTitle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertTitle & { omdbConfirmed?: boolean; omdbData?: Record<string, unknown> }) => {
      const res = await apiRequest("POST", "/api/titles", data);
      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: "Failed to create title" }));
        throw new Error(body.message);
      }
      return res.json() as Promise<Title>;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/titles"] }),
  });
}

export function useUpdateTitle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertTitle> }) => {
      const res = await apiRequest("PUT", `/api/titles/${id}`, data);
      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: "Failed to update title" }));
        throw new Error(body.message);
      }
      return res.json() as Promise<Title>;
    },
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ["/api/titles"] });
      qc.invalidateQueries({ queryKey: ["/api/titles", id] });
    },
  });
}

export function useDeleteTitle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/titles/${id}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: "Failed to delete title" }));
        throw new Error(body.message);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/titles"] }),
  });
}

export type OmdbResult = {
  Title: string | null;
  Year: string | null;
  Runtime: string | null;
  Genre: string | null;
  Director: string | null;
  Actors: string | null;
  Plot: string | null;
  Poster: string | null;
  imdbRating: string | null;
  imdbID: string | null;
  runtimeMinutes: number | null;
};

export function useOmdbSearch() {
  return useMutation({
    mutationFn: async (query: string): Promise<OmdbResult> => {
      const res = await apiRequest("GET", `/api/titles/omdb-search?q=${encodeURIComponent(query)}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: "OMDb search failed" }));
        throw new Error(body.message);
      }
      return res.json();
    },
  });
}

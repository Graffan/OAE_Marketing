import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchJSON, apiRequest } from "@/lib/queryClient";
import type { User } from "@shared/schema";

type SafeUser = Omit<User, "password">;

export function useAuth() {
  const qc = useQueryClient();

  const { data: user, isLoading } = useQuery<SafeUser | null>({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      try {
        return await fetchJSON<SafeUser>("/api/auth/me");
      } catch {
        return null;
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      const res = await apiRequest("POST", "/api/auth/login", credentials);
      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: "Login failed" }));
        throw new Error(body.message ?? "Login failed");
      }
      return res.json() as Promise<SafeUser>;
    },
    onSuccess: (user) => {
      qc.setQueryData(["/api/auth/me"], user);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      qc.setQueryData(["/api/auth/me"], null);
      qc.clear();
    },
  });

  return {
    user: user ?? null,
    isLoading,
    isAuthenticated: !!user,
    login: loginMutation.mutateAsync,
    loginError: loginMutation.error,
    isLoggingIn: loginMutation.isPending,
    logout: logoutMutation.mutateAsync,
  };
}

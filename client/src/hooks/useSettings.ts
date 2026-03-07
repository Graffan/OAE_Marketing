import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { fetchJSON } from "@/lib/queryClient";
import type { AppSettings } from "@shared/schema";

type PublicSettings = Omit<AppSettings, "claudeApiKey" | "openaiApiKey" | "deepseekApiKey" | "omdbApiKey" | "smtpPassword">;

export function useSettings() {
  const { data: settings, isLoading } = useQuery<PublicSettings | null>({
    queryKey: ["/api/settings"],
    queryFn: () => fetchJSON<PublicSettings>("/api/settings"),
    staleTime: 1000 * 60 * 10, // 10 minutes
    retry: false,
  });

  useEffect(() => {
    if (settings?.accentColor) {
      document.documentElement.style.setProperty("--accent-color", settings.accentColor);
    }
  }, [settings?.accentColor]);

  return { settings, isLoading };
}

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AppSettings } from "@shared/schema";

const PROVIDERS: { value: string | null; label: string; settingsKey: string | null }[] = [
  { value: null, label: "Auto", settingsKey: null },
  { value: "claude", label: "Claude", settingsKey: "claudeApiKey" },
  { value: "openai", label: "OpenAI", settingsKey: "openaiApiKey" },
  { value: "deepseek", label: "DeepSeek", settingsKey: "deepseekApiKey" },
  { value: "manual", label: "Manual", settingsKey: null },
];

interface ProviderSelectorProps {
  value: string | null;
  onChange: (provider: string | null) => void;
  settings?: Partial<AppSettings> | null;
}

export default function ProviderSelector({ value, onChange, settings }: ProviderSelectorProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {PROVIDERS.map((p) => {
        const hasKey =
          p.settingsKey == null ||
          !!(settings && (settings as Record<string, unknown>)[p.settingsKey]);
        const isSelected = value === p.value;
        return (
          <Button
            key={String(p.value)}
            size="sm"
            variant={isSelected ? "default" : "outline"}
            className={cn("text-xs gap-1.5", isSelected && "bg-rose-500 hover:bg-rose-600 border-rose-500")}
            disabled={p.settingsKey !== null && !hasKey && p.value !== "manual"}
            onClick={() => onChange(p.value)}
          >
            {p.label}
            {p.settingsKey !== null && !hasKey && p.value !== "manual" && (
              <Badge variant="outline" className="text-[10px] py-0 px-1">no key</Badge>
            )}
          </Button>
        );
      })}
    </div>
  );
}

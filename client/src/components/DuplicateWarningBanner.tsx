import { AlertTriangle } from "lucide-react";
import type { DuplicateWarning } from "@/hooks/useClipPosts";

interface Props {
  warning: DuplicateWarning | null | undefined;
}

export function DuplicateWarningBanner({ warning }: Props) {
  if (!warning) return null;

  return (
    <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm dark:border-amber-800 dark:bg-amber-950/30">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
      <div className="text-amber-800 dark:text-amber-300">
        <span className="font-medium">Duplicate warning:</span> This clip was posted to{" "}
        <span className="font-medium">{warning.platform}</span> /{" "}
        <span className="font-medium">{warning.region}</span>{" "}
        {warning.daysSince === 0 ? "today" : `${warning.daysSince} day${warning.daysSince === 1 ? "" : "s"} ago`}.
      </div>
    </div>
  );
}

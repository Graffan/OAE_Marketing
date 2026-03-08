import { cn } from "@/lib/utils";
import type { RotationStats } from "@/hooks/useClipPosts";

interface RotationIndicatorProps {
  stats: RotationStats;
  compact?: boolean;
}

export function RotationIndicator({ stats, compact = false }: RotationIndicatorProps) {
  const pct =
    stats.totalApproved > 0
      ? Math.round((stats.totalPosted / stats.totalApproved) * 100)
      : 0;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-1.5 w-24 rounded-full bg-muted overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              stats.isPoolExhausted ? "bg-amber-500" : "bg-rose-500"
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground">
          {stats.totalUnposted} left
        </span>
        {stats.isPoolExhausted && (
          <span className="text-xs font-medium text-amber-500">Pool exhausted</span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {stats.isPoolExhausted && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
          All approved clips have been posted. The cycle will auto-reset when you pick the next clip.
        </div>
      )}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Cycle progress</span>
        <span className="font-medium">
          {stats.totalPosted} / {stats.totalApproved} clips
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            stats.isPoolExhausted ? "bg-amber-500" : "bg-rose-500"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{stats.totalPosted} posted this cycle</span>
        <span>{stats.totalUnposted} remaining</span>
      </div>
    </div>
  );
}

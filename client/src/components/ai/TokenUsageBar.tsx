import { cn } from "@/lib/utils";

const COST_PER_TOKEN = 0.000015; // conservative estimate (Claude output rate)

function formatCost(tokens: number): string {
  return `$${(tokens * COST_PER_TOKEN).toFixed(4)}`;
}

function barColor(used: number, cap: number): string {
  const pct = cap > 0 ? used / cap : 0;
  if (pct >= 0.9) return "bg-red-500";
  if (pct >= 0.7) return "bg-amber-500";
  return "bg-emerald-500";
}

interface TokenUsageBarProps {
  dailyTotal: number;
  dailyCap: number;
  userTotal?: number;
  perUserCap?: number;
}

export default function TokenUsageBar({ dailyTotal, dailyCap, userTotal, perUserCap }: TokenUsageBarProps) {
  const dailyPct = dailyCap > 0 ? Math.min(dailyTotal / dailyCap, 1) : 0;
  const userPct = perUserCap && userTotal != null ? Math.min(userTotal / perUserCap, 1) : 0;

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Daily Usage</span>
          <span>
            {dailyTotal.toLocaleString()} / {dailyCap.toLocaleString()} tokens
            <span className="ml-1 text-muted-foreground/70">(est. {formatCost(dailyTotal)})</span>
          </span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all", barColor(dailyTotal, dailyCap))}
            style={{ width: `${dailyPct * 100}%` }}
          />
        </div>
      </div>

      {perUserCap != null && userTotal != null && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Your Usage</span>
            <span>
              {userTotal.toLocaleString()} / {perUserCap.toLocaleString()} tokens
              <span className="ml-1 text-muted-foreground/70">(est. {formatCost(userTotal)})</span>
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all", barColor(userTotal, perUserCap))}
              style={{ width: `${userPct * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

import { useState } from "react";
import {
  BarChart3,
  Globe,
  Monitor,
  Smartphone,
  Tablet,
  MousePointerClick,
  TrendingUp,
  Calendar,
} from "lucide-react";
import { useLinkAnalyticsStats, useLinkAnalyticsEvents } from "@/hooks/useBrand";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { fetchJSON } from "@/lib/queryClient";

function countryFlag(code: string): string {
  if (!code || code.length !== 2) return "";
  return String.fromCodePoint(
    ...[...code.toUpperCase()].map((c) => 127397 + c.charCodeAt(0))
  );
}

const PLATFORM_ICON: Record<string, React.ReactNode> = {
  desktop: <Monitor className="h-3.5 w-3.5" />,
  mobile: <Smartphone className="h-3.5 w-3.5" />,
  tablet: <Tablet className="h-3.5 w-3.5" />,
};

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
          {icon}
        </div>
        <div>
          <p className="text-2xl font-semibold tracking-tight">{typeof value === "number" ? value.toLocaleString() : value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function BarRow({ label, value, maxValue, extra }: { label: string; value: number; maxValue: number; extra?: React.ReactNode }) {
  const pct = maxValue > 0 ? (value / maxValue) * 100 : 0;
  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className="w-24 shrink-0 flex items-center gap-1.5 text-sm">
        {extra}
        <span className="truncate">{label}</span>
      </div>
      <div className="flex-1 h-6 bg-muted/50 rounded-md overflow-hidden relative">
        <div
          className="absolute inset-y-0 left-0 bg-primary/20 rounded-md transition-all duration-300"
          style={{ width: `${Math.max(pct, 2)}%` }}
        />
        <span className="absolute inset-0 flex items-center pl-2 text-xs font-medium">
          {value.toLocaleString()}
        </span>
      </div>
    </div>
  );
}

// ─── Recent Clicks Table ────────────────────────────────────────────────────

function RecentClicksTable({ smartLinkId }: { smartLinkId?: number }) {
  const filters: Record<string, string | number> = { limit: 50 };
  if (smartLinkId) filters.smartLinkId = smartLinkId;
  const { data: events = [] } = useLinkAnalyticsEvents(filters);

  if ((events as any[]).length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">No click events recorded yet.</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="py-2 pr-3 text-xs font-medium text-muted-foreground">Time</th>
            <th className="py-2 pr-3 text-xs font-medium text-muted-foreground">Slug</th>
            <th className="py-2 pr-3 text-xs font-medium text-muted-foreground">Country</th>
            <th className="py-2 pr-3 text-xs font-medium text-muted-foreground">Device</th>
            <th className="py-2 pr-3 text-xs font-medium text-muted-foreground">Referrer</th>
            <th className="py-2 pr-3 text-xs font-medium text-muted-foreground">UTM Source</th>
          </tr>
        </thead>
        <tbody>
          {(events as any[]).map((e: any) => (
            <tr key={e.id} className="border-b border-muted/30 hover:bg-muted/20 transition-colors">
              <td className="py-2 pr-3 text-xs text-muted-foreground whitespace-nowrap">
                {new Date(e.createdAt).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </td>
              <td className="py-2 pr-3 font-mono text-xs">{e.slug}</td>
              <td className="py-2 pr-3">
                <span className="text-xs">{e.country ? `${countryFlag(e.country)} ${e.country}` : "—"}</span>
              </td>
              <td className="py-2 pr-3">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  {PLATFORM_ICON[e.platform] ?? null}
                  {e.platform ?? "—"}
                </div>
              </td>
              <td className="py-2 pr-3 text-xs text-muted-foreground truncate max-w-[150px]">
                {e.referer ? new URL(e.referer).hostname : "—"}
              </td>
              <td className="py-2 pr-3">
                {e.utmSource ? (
                  <Badge variant="outline" className="text-[10px]">{e.utmSource}</Badge>
                ) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function LinkAnalyticsPage() {
  const { data: smartLinks = [] } = useQuery({
    queryKey: ["/api/smart-links"],
    queryFn: () => fetchJSON("/api/smart-links"),
  });
  const [selectedLinkId, setSelectedLinkId] = useState<number | undefined>();
  const { data: rawStats, isLoading } = useLinkAnalyticsStats(selectedLinkId);
  const stats = rawStats as any;

  const maxCountry = Math.max(...(stats?.byCountry?.map((c: any) => c.clicks) ?? [0]));
  const maxPlatform = Math.max(...(stats?.byPlatform?.map((p: any) => p.clicks) ?? [0]));

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Link Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Click tracking for smart links — by region, device, referrer, and UTM.
          </p>
        </div>
        <Select
          value={selectedLinkId?.toString() ?? "all"}
          onValueChange={(v) => setSelectedLinkId(v === "all" ? undefined : Number(v))}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All links" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All links</SelectItem>
            {(smartLinks as any[]).map((link: any) => (
              <SelectItem key={link.id} value={link.id.toString()}>
                /{link.slug}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">Loading analytics...</div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatCard
              label="Total Clicks"
              value={stats?.totalClicks ?? 0}
              icon={<MousePointerClick className="h-5 w-5" />}
            />
            <StatCard
              label="Countries"
              value={stats?.byCountry?.length ?? 0}
              icon={<Globe className="h-5 w-5" />}
            />
            <StatCard
              label="Days Tracked"
              value={stats?.byDay?.length ?? 0}
              icon={<Calendar className="h-5 w-5" />}
            />
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Clicks by Country</CardTitle>
              </CardHeader>
              <CardContent>
                {(stats?.byCountry?.length ?? 0) === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No data</p>
                ) : (
                  <div className="space-y-0.5">
                    {stats.byCountry.map((row: any) => (
                      <BarRow
                        key={row.country}
                        label={row.country}
                        value={row.clicks}
                        maxValue={maxCountry}
                        extra={<span className="text-sm">{countryFlag(row.country)}</span>}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Clicks by Device</CardTitle>
              </CardHeader>
              <CardContent>
                {(stats?.byPlatform?.length ?? 0) === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No data</p>
                ) : (
                  <div className="space-y-0.5">
                    {stats.byPlatform.map((row: any) => (
                      <BarRow
                        key={row.platform}
                        label={row.platform}
                        value={row.clicks}
                        maxValue={maxPlatform}
                        extra={PLATFORM_ICON[row.platform]}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Daily trend */}
          {stats?.byDay?.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" /> Daily Clicks (last 30 days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-0.5 h-32">
                  {[...stats.byDay].reverse().map((day: any) => {
                    const maxDay = Math.max(...stats.byDay.map((d: any) => d.clicks));
                    const h = maxDay > 0 ? (day.clicks / maxDay) * 100 : 0;
                    return (
                      <div
                        key={day.day}
                        className="flex-1 bg-primary/20 hover:bg-primary/40 rounded-t transition-colors relative group"
                        style={{ height: `${Math.max(h, 3)}%` }}
                        title={`${day.day}: ${day.clicks} clicks`}
                      >
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 whitespace-nowrap">
                          {day.clicks}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
                  <span>{stats.byDay[stats.byDay.length - 1]?.day}</span>
                  <span>{stats.byDay[0]?.day}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent clicks table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Recent Clicks</CardTitle>
            </CardHeader>
            <CardContent>
              <RecentClicksTable smartLinkId={selectedLinkId} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

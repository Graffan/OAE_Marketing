import React from "react";
import { Link } from "wouter";
import { Film, Video, Globe, Link2, Plus, ArrowRight } from "lucide-react";
import { useTitles } from "@/hooks/useTitles";
import { useClips } from "@/hooks/useClips";
import { useSmartLinks } from "@/hooks/useSmartLinks";
import { useDestinationAlerts } from "@/hooks/useDestinations";
import ExpiryAlerts from "@/components/ExpiryAlerts";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

// ─── StatCard ──────────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  icon: Icon,
  href,
  loading,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  href?: string;
  loading?: boolean;
}) {
  const content = (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-5 flex items-center gap-4 transition-colors",
        href && "hover:bg-muted/30 cursor-pointer"
      )}
    >
      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-2xl font-semibold tracking-tight">
          {loading ? (
            <span className="inline-block h-6 w-12 animate-pulse rounded bg-muted" />
          ) : (
            value
          )}
        </p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
      {href && <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
    </div>
  );

  if (href) return <Link href={href}>{content}</Link>;
  return content;
}

// ─── DashboardPage ─────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user } = useAuth();
  const { data: titles, isLoading: titlesLoading } = useTitles();
  const { data: clips, isLoading: clipsLoading } = useClips();
  const { data: smartLinks, isLoading: linksLoading } = useSmartLinks();
  const { data: alerts } = useDestinationAlerts();

  const canEdit = ["admin", "marketing_operator"].includes(user?.role ?? "");

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-5 border-b border-border">
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Overview of your marketing assets</p>
      </div>

      <div className="flex-1 overflow-auto px-6 py-6 space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Titles"
            value={titles?.length ?? 0}
            icon={Film}
            href="/titles"
            loading={titlesLoading}
          />
          <StatCard
            label="Clips"
            value={clips?.length ?? 0}
            icon={Video}
            href="/clips"
            loading={clipsLoading}
          />
          <StatCard
            label="Expiring Watch Links"
            value={alerts?.expiringCount ?? 0}
            icon={Globe}
            href="/destinations"
          />
          <StatCard
            label="Smart Links"
            value={smartLinks?.length ?? 0}
            icon={Link2}
            href="/smart-links"
            loading={linksLoading}
          />
        </div>

        {/* Alerts section */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Alerts
          </h2>
          <ExpiryAlerts compact={false} />
        </div>

        {/* Quick actions */}
        {canEdit && (
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Quick Actions
            </h2>
            <div className="flex flex-wrap gap-3">
              <Link href="/destinations">
                <button className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted/50 transition-colors">
                  <Plus className="h-4 w-4" />
                  Add Destination
                </button>
              </Link>
              <Link href="/smart-links">
                <button className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted/50 transition-colors">
                  <Plus className="h-4 w-4" />
                  New Smart Link
                </button>
              </Link>
              <Link href="/clips">
                <button className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted/50 transition-colors">
                  <Video className="h-4 w-4" />
                  Clip Library
                </button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

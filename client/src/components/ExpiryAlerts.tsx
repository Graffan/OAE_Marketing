import { useState } from "react";
import { Link } from "wouter";
import { AlertTriangle, X, MapPin } from "lucide-react";
import { useDestinationAlerts } from "@/hooks/useDestinations";

interface ExpiryAlertsProps {
  compact?: boolean;
}

const SESSION_KEY = "oae_alerts_dismissed";

export default function ExpiryAlerts({ compact = false }: ExpiryAlertsProps) {
  const { data: alerts, isLoading } = useDestinationAlerts();
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(SESSION_KEY) === "true";
    } catch {
      return false;
    }
  });

  function handleDismiss() {
    setDismissed(true);
    try {
      sessionStorage.setItem(SESSION_KEY, "true");
    } catch {
      // sessionStorage unavailable — dismiss in memory only
    }
  }

  if (isLoading || !alerts) return null;

  const hasExpiring = alerts.expiringCount > 0;
  const hasMissing = alerts.titlesWithNoDestinations.length > 0;

  if (!hasExpiring && !hasMissing) return null;

  // Compact mode: small inline badge row for dashboard cards
  if (compact) {
    return (
      <div className="flex items-center gap-3 flex-wrap">
        {hasExpiring && (
          <Link
            href="/destinations"
            className="inline-flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 hover:underline"
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            {alerts.expiringCount} expiring soon
          </Link>
        )}
        {hasMissing && (
          <Link
            href="/destinations"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:underline"
          >
            <MapPin className="h-3.5 w-3.5" />
            {alerts.titlesWithNoDestinations.length} titles without watch links
          </Link>
        )}
      </div>
    );
  }

  // Full mode: dismissible banners
  if (dismissed) return null;

  return (
    <div className="space-y-2">
      {hasExpiring && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
              {alerts.expiringCount} destination{alerts.expiringCount !== 1 ? "s" : ""} expiring within 30 days
            </p>
            <Link
              href="/destinations"
              className="text-xs text-amber-600 dark:text-amber-400/70 hover:underline"
            >
              View expiring destinations
            </Link>
          </div>
          <button
            onClick={handleDismiss}
            className="text-amber-400/50 hover:text-amber-400 transition-colors flex-shrink-0"
            aria-label="Dismiss alert"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {hasMissing && (
        <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
          <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">
              {alerts.titlesWithNoDestinations.length} title
              {alerts.titlesWithNoDestinations.length !== 1 ? "s" : ""} have no active watch links configured
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {alerts.titlesWithNoDestinations
                .slice(0, 3)
                .map((t) => t.titleName)
                .join(", ")}
              {alerts.titlesWithNoDestinations.length > 3
                ? ` and ${alerts.titlesWithNoDestinations.length - 3} more`
                : ""}
            </p>
            <Link
              href="/destinations"
              className="text-xs text-muted-foreground hover:underline"
            >
              Configure destinations
            </Link>
          </div>
          <button
            onClick={handleDismiss}
            className="text-muted-foreground/40 hover:text-muted-foreground transition-colors flex-shrink-0"
            aria-label="Dismiss alert"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

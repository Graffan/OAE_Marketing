import { useState } from "react";
import { Globe, Plus, Pencil, Trash2, ExternalLink, AlertTriangle, X } from "lucide-react";
import {
  useDestinations,
  useDeleteDestination,
  useExpiringDestinations,
  type DestinationWithStatus,
} from "@/hooks/useDestinations";
import { useTitles } from "@/hooks/useTitles";
import { useAuth } from "@/hooks/useAuth";
import DestinationDialog from "@/components/DestinationDialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { RegionalDestination } from "@shared/schema";

function countryFlag(code: string): string {
  if (!code || code.length !== 2) return "";
  return String.fromCodePoint(
    ...[...code.toUpperCase()].map((c) => 127397 + c.charCodeAt(0))
  );
}

function ComputedStatusBadge({
  status,
  endDate,
}: {
  status: DestinationWithStatus["computedStatus"];
  endDate: string | null;
}) {
  if (status === "expired") {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-red-500/10 text-red-700 dark:text-red-400 ring-1 ring-red-500/20">
        Expired
      </span>
    );
  }
  if (status === "expiring_soon" && endDate) {
    const days = Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000);
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400 ring-1 ring-amber-500/20">
        Expiring in {days}d
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-green-500/10 text-green-700 dark:text-green-400 ring-1 ring-green-500/20">
      Active
    </span>
  );
}

function StatusOverrideBadge({ status }: { status: string }) {
  if (status === "inactive") {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground ring-1 ring-border">
        Inactive
      </span>
    );
  }
  return null;
}

function ExpiryAlerts({
  dismissed,
  onDismiss,
}: {
  dismissed: boolean;
  onDismiss: () => void;
}) {
  const { data: expiring } = useExpiringDestinations();
  if (dismissed || !expiring || expiring.length === 0) return null;
  return (
    <div className="mx-6 mt-4 flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
      <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
      <p className="text-sm text-amber-700 dark:text-amber-400 flex-1">
        <span className="font-semibold">
          {expiring.length} destination{expiring.length !== 1 ? "s" : ""}
        </span>{" "}
        expiring within 30 days
      </p>
      <button
        onClick={onDismiss}
        className="text-amber-500/60 hover:text-amber-500 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function DestinationsPage() {
  const { user } = useAuth();
  const [titleFilter, setTitleFilter] = useState<number | undefined>(undefined);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RegionalDestination | null>(null);
  const [alertDismissed, setAlertDismissed] = useState(false);

  const { data: destinations, isLoading } = useDestinations(titleFilter);
  const { data: titles } = useTitles();
  const deleteDestination = useDeleteDestination();

  const canEdit = ["admin", "marketing_operator"].includes(user?.role ?? "");
  const isAdmin = user?.role === "admin";

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(dest: RegionalDestination) {
    setEditing(dest);
    setDialogOpen(true);
  }

  async function handleDelete(dest: RegionalDestination) {
    if (
      !window.confirm(
        `Delete destination for ${dest.countryCode} — ${dest.platformName}? This cannot be undone.`
      )
    )
      return;
    try {
      await deleteDestination.mutateAsync(dest.id);
    } catch (err: any) {
      alert(err.message ?? "Failed to delete destination");
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Page header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-border">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Destinations</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage regional streaming destinations and deal windows for each title
          </p>
        </div>
        {canEdit && (
          <Button onClick={openCreate} size="sm">
            <Plus className="h-4 w-4 mr-1.5" />
            Add Destination
          </Button>
        )}
      </div>

      {/* Expiry alert */}
      <ExpiryAlerts dismissed={alertDismissed} onDismiss={() => setAlertDismissed(true)} />

      {/* Toolbar */}
      <div className="px-6 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-56">
            <Select
              value={titleFilter != null ? String(titleFilter) : "all"}
              onValueChange={(v) => setTitleFilter(v === "all" ? undefined : parseInt(v))}
            >
              <SelectTrigger>
                <SelectValue placeholder="All titles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All titles</SelectItem>
                {(titles ?? []).map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {t.titleName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
          </div>
        ) : !destinations || destinations.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center px-6">
            <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
              <Globe className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium text-foreground">
                {titleFilter ? "No destinations match the selected title" : "No destinations yet"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {titleFilter
                  ? "Try selecting a different title or add a new destination"
                  : "Add your first regional destination to get started"}
              </p>
            </div>
            {canEdit && !titleFilter && (
              <Button onClick={openCreate} size="sm">
                <Plus className="h-4 w-4 mr-1.5" />
                Add your first destination
              </Button>
            )}
          </div>
        ) : (
          <div className="px-6 py-4">
            {/* Table header */}
            <div className="grid grid-cols-[80px_1fr_1fr_200px_140px_120px_60px_100px] gap-3 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border mb-1">
              <div>Country</div>
              <div>Platform</div>
              <div>URL</div>
              <div>Deal Window</div>
              <div>Status</div>
              <div>Priority</div>
              <div></div>
              <div></div>
            </div>

            {/* Table rows */}
            <div className="divide-y divide-border/50">
              {destinations.map((d) => (
                <div
                  key={d.id}
                  className="grid grid-cols-[80px_1fr_1fr_200px_140px_120px_60px_100px] gap-3 px-3 py-3 items-center hover:bg-muted/30 rounded-lg transition-colors"
                >
                  {/* Country */}
                  <div className="text-sm font-medium flex items-center gap-1">
                    <span>{countryFlag(d.countryCode)}</span>
                    <span>{d.countryCode}</span>
                  </div>

                  {/* Platform */}
                  <div className="min-w-0">
                    <span className="text-sm font-medium truncate block">{d.platformName}</span>
                    {d.platformType && (
                      <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground mt-0.5 uppercase tracking-wide">
                        {d.platformType}
                      </span>
                    )}
                  </div>

                  {/* Destination URL */}
                  <div className="min-w-0 flex items-center gap-1">
                    <span className="text-sm text-muted-foreground truncate flex-1">
                      {d.destinationUrl}
                    </span>
                    <a
                      href={d.destinationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>

                  {/* Deal Window */}
                  <div className="text-sm text-muted-foreground">
                    {d.startDate ?? "Open"} &rarr; {d.endDate ?? "Ongoing"}
                  </div>

                  {/* Status */}
                  <div>
                    {d.status === "inactive" ? (
                      <StatusOverrideBadge status={d.status} />
                    ) : (
                      <ComputedStatusBadge status={d.computedStatus} endDate={d.endDate} />
                    )}
                  </div>

                  {/* Priority */}
                  <div className="text-sm text-muted-foreground">
                    {d.campaignPriority ?? 0}
                  </div>

                  {/* Spacer column */}
                  <div />

                  {/* Actions */}
                  <div className="flex items-center gap-1 justify-end">
                    {canEdit && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        title="Edit"
                        onClick={() => openEdit(d)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {isAdmin && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                        title="Delete"
                        onClick={() => handleDelete(d)}
                        disabled={deleteDestination.isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <DestinationDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditing(null);
        }}
        editing={editing}
        defaultTitleId={titleFilter}
      />
    </div>
  );
}

import { Film, Smartphone, Monitor, Square, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Clip } from "@shared/schema";

type StatusKey =
  | "new"
  | "awaiting_review"
  | "approved"
  | "rejected"
  | "posted"
  | "archived";

const STATUS_CONFIG: Record<
  StatusKey,
  { label: string; className: string }
> = {
  new: { label: "New", className: "bg-gray-500/80 text-white" },
  awaiting_review: { label: "Review", className: "bg-amber-500/90 text-white" },
  approved: { label: "Approved", className: "bg-green-600/90 text-white" },
  rejected: { label: "Rejected", className: "bg-red-600/90 text-white" },
  posted: { label: "Posted", className: "bg-blue-600/90 text-white" },
  archived: { label: "Archived", className: "bg-gray-400/60 text-white/70" },
};

function formatDuration(seconds: string | number | null | undefined): string {
  if (seconds === null || seconds === undefined) return "";
  const secs = typeof seconds === "string" ? parseFloat(seconds) : seconds;
  if (isNaN(secs)) return "";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function OrientationIcon({ orientation }: { orientation: string | null | undefined }) {
  if (!orientation) return null;
  if (orientation === "vertical") return <Smartphone className="h-3.5 w-3.5" />;
  if (orientation === "horizontal") return <Monitor className="h-3.5 w-3.5" />;
  if (orientation === "square") return <Square className="h-3.5 w-3.5" />;
  return null;
}

interface ClipCardProps {
  clip: Clip;
  isSelected: boolean;
  onSelect: (id: number, selected: boolean) => void;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  onViewDetails: (clip: Clip) => void;
  canApprove: boolean;
  isApprovePending: boolean;
  isRejectPending: boolean;
}

export default function ClipCard({
  clip,
  isSelected,
  onSelect,
  onApprove,
  onReject,
  onViewDetails,
  canApprove,
  isApprovePending,
  isRejectPending,
}: ClipCardProps) {
  const status = (clip.status ?? "new") as StatusKey;
  const statusConfig = STATUS_CONFIG[status] ?? STATUS_CONFIG.new;
  const duration = formatDuration(clip.durationSeconds);
  const showApproveReject =
    canApprove && (status === "new" || status === "awaiting_review");

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-xl overflow-hidden border transition-all cursor-pointer group",
        isSelected
          ? "border-rose-500 ring-2 ring-rose-500/30"
          : "border-border/50 hover:border-border"
      )}
      onClick={() => onViewDetails(clip)}
    >
      {/* Thumbnail area */}
      <div className="relative aspect-video bg-muted flex-shrink-0">
        {clip.thumbnailUrl ? (
          <img
            src={clip.thumbnailUrl}
            alt={clip.filename}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <Film className="h-8 w-8 text-muted-foreground/30" />
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="text-white text-xs font-medium">View Details</span>
        </div>

        {/* Checkbox (top-left) */}
        <div
          className={cn(
            "absolute top-2 left-2 transition-opacity",
            isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(clip.id, !isSelected);
          }}
        >
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => {}}
            className="h-4 w-4 rounded accent-rose-500 cursor-pointer"
          />
        </div>

        {/* Status badge (top-right) */}
        <div className="absolute top-2 right-2">
          <span
            className={cn(
              "text-[10px] font-semibold px-1.5 py-0.5 rounded-md",
              statusConfig.className
            )}
          >
            {statusConfig.label}
          </span>
        </div>

        {/* Unavailable ribbon */}
        {!clip.isAvailable && (
          <div className="absolute bottom-0 left-0 right-0 bg-red-600/90 text-white text-[10px] font-semibold text-center py-0.5">
            Unavailable
          </div>
        )}
      </div>

      {/* Bottom info */}
      <div className="p-3 space-y-1.5 flex-1 flex flex-col">
        <p className="text-sm font-medium truncate leading-tight" title={clip.filename}>
          {clip.filename}
        </p>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {duration && <span>{duration}</span>}
          <OrientationIcon orientation={clip.orientation} />
          {(clip.postedCount ?? 0) > 0 && (
            <span className="text-blue-500 font-medium">Posted {clip.postedCount}x</span>
          )}
        </div>

        {/* Approve / Reject buttons */}
        {showApproveReject && (
          <div
            className="flex gap-1.5 pt-1"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => onApprove(clip.id)}
              disabled={isApprovePending || isRejectPending}
              className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30 disabled:opacity-40 transition-colors"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              Approve
            </button>
            <button
              onClick={() => onReject(clip.id)}
              disabled={isApprovePending || isRejectPending}
              className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-40 transition-colors"
            >
              <XCircle className="h-3.5 w-3.5" />
              Reject
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

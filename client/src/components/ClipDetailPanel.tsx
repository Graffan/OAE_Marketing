import { useState, type ReactNode } from "react";
import { X, Film, CheckCircle, XCircle, Pencil, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Clip } from "@shared/schema";
import type { RotationStats } from "@/hooks/useClips";
import { MarkPostedDialog } from "./MarkPostedDialog";
import { ClipPostHistoryPanel } from "./ClipPostHistoryPanel";

type StatusKey =
  | "new"
  | "awaiting_review"
  | "approved"
  | "rejected"
  | "posted"
  | "archived";

const STATUS_LABELS: Record<StatusKey, string> = {
  new: "New",
  awaiting_review: "Awaiting Review",
  approved: "Approved",
  rejected: "Rejected",
  posted: "Posted",
  archived: "Archived",
};

const STATUS_COLORS: Record<StatusKey, string> = {
  new: "text-gray-500",
  awaiting_review: "text-amber-500",
  approved: "text-green-600",
  rejected: "text-red-500",
  posted: "text-blue-500",
  archived: "text-gray-400",
};

function formatDuration(seconds: string | number | null | undefined): string {
  if (seconds === null || seconds === undefined) return "—";
  const secs = typeof seconds === "string" ? parseFloat(seconds) : seconds;
  if (isNaN(secs)) return "—";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

function MetaRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between gap-2 py-1.5">
      <dt className="text-xs text-muted-foreground flex-shrink-0">{label}</dt>
      <dd className="text-xs text-right truncate max-w-[60%]">{value ?? "—"}</dd>
    </div>
  );
}

interface ClipDetailPanelProps {
  clip: Clip | null;
  onClose: () => void;
  canApprove: boolean;
  canEdit: boolean;
  canMarkPosted: boolean;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  onEdit: (clip: Clip) => void;
  rotationStats: RotationStats | null;
}

export default function ClipDetailPanel({
  clip,
  onClose,
  canApprove,
  canEdit,
  canMarkPosted,
  onApprove,
  onReject,
  onEdit,
  rotationStats,
}: ClipDetailPanelProps) {
  const [markPostedOpen, setMarkPostedOpen] = useState(false);
  if (!clip) {
    return (
      <div className="w-80 border-l border-border/50 flex items-center justify-center">
        <p className="text-sm text-muted-foreground text-center px-4">
          Select a clip to view details
        </p>
      </div>
    );
  }

  const status = (clip.status ?? "new") as StatusKey;
  const showApproveReject =
    canApprove && (status === "new" || status === "awaiting_review");

  return (
    <div className="w-80 border-l border-border/50 flex flex-col overflow-y-auto flex-shrink-0">
      {/* Header */}
      <div className="flex items-start gap-2 p-4 border-b border-border/50">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" title={clip.filename}>
            {clip.filename}
          </p>
          <span
            className={cn(
              "text-xs font-medium",
              STATUS_COLORS[status] ?? "text-muted-foreground"
            )}
          >
            {STATUS_LABELS[status] ?? status}
          </span>
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 p-1 rounded-lg hover:bg-muted transition-colors"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* Thumbnail */}
      <div className="aspect-video bg-muted border-b border-border/50 flex-shrink-0">
        {clip.thumbnailUrl ? (
          <img
            src={clip.thumbnailUrl}
            alt={clip.filename}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Film className="h-10 w-10 text-muted-foreground/25" />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 space-y-2 border-b border-border/50">
        {showApproveReject ? (
          <div className="flex gap-2">
            <button
              onClick={() => onApprove(clip.id)}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2 px-3 rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              Approve
            </button>
            <button
              onClick={() => onReject(clip.id)}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2 px-3 rounded-lg border border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            >
              <XCircle className="h-3.5 w-3.5" />
              Reject
            </button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center">
            Status:{" "}
            <span className={cn("font-medium", STATUS_COLORS[status])}>
              {STATUS_LABELS[status] ?? status}
            </span>
          </p>
        )}
        {canEdit && (
          <button
            onClick={() => onEdit(clip)}
            className="w-full flex items-center justify-center gap-1.5 text-xs font-medium py-2 px-3 rounded-lg border border-border hover:bg-muted transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit Metadata
          </button>
        )}
        {canMarkPosted && clip.status === "approved" && (
          <button
            onClick={() => setMarkPostedOpen(true)}
            className="w-full flex items-center justify-center gap-1.5 text-xs font-medium py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
          >
            <Send className="h-3.5 w-3.5" />
            Mark as Posted
          </button>
        )}
      </div>

      {/* File metadata */}
      <div className="px-4 py-2 border-b border-border/50">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-1">
          File Info
        </p>
        <dl>
          <MetaRow label="Filename" value={clip.filename} />
          <MetaRow label="Size" value={formatFileSize(clip.fileSizeBytes)} />
          <MetaRow label="Type" value={clip.mimeType} />
          <MetaRow label="Duration" value={formatDuration(clip.durationSeconds)} />
          <MetaRow label="Orientation" value={clip.orientation} />
          <MetaRow label="Uploaded" value={formatDate(clip.createdAt)} />
          <MetaRow
            label="Approved At"
            value={clip.approvedAt ? formatDate(clip.approvedAt) : null}
          />
          <MetaRow
            label="Last Posted"
            value={clip.lastPostedAt ? formatDate(clip.lastPostedAt) : "Never"}
          />
          <MetaRow label="Posted Count" value={clip.postedCount ?? 0} />
        </dl>
      </div>

      {/* Tags / editorial metadata */}
      <div className="px-4 py-2 border-b border-border/50">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-1">
          Tags
        </p>
        <dl>
          <MetaRow label="Hook Type" value={clip.hookType} />
          <MetaRow label="Theme" value={clip.theme} />
          <MetaRow label="Character Focus" value={clip.characterFocus} />
          <MetaRow label="Spoiler Level" value={clip.spoilerLevel} />
          <MetaRow label="Intensity" value={clip.intensityLevel} />
          <MetaRow
            label="Platform Fit"
            value={
              clip.platformFit && clip.platformFit.length > 0
                ? clip.platformFit.join(", ")
                : null
            }
          />
          <MetaRow
            label="Allowed Regions"
            value={
              clip.allowedRegions && clip.allowedRegions.length > 0
                ? clip.allowedRegions.join(", ")
                : "All"
            }
          />
          <MetaRow
            label="Restricted Regions"
            value={
              clip.restrictedRegions && clip.restrictedRegions.length > 0
                ? clip.restrictedRegions.join(", ")
                : "None"
            }
          />
          <MetaRow label="Embargo Date" value={formatDate(clip.embargoDate)} />
        </dl>
      </div>

      {/* Rotation indicator */}
      {rotationStats && (
        <div className="px-4 py-3 border-b border-border/50">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-2">
            Rotation
          </p>
          <p className="text-xs text-foreground mb-1.5">
            {rotationStats.postedCount} of {rotationStats.totalApproved} clips used in cycle
          </p>
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden mb-1.5">
            <div
              className="h-full bg-rose-500 rounded-full transition-all"
              style={{
                width:
                  rotationStats.totalApproved > 0
                    ? `${(rotationStats.postedCount / rotationStats.totalApproved) * 100}%`
                    : "0%",
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {rotationStats.remainingInCycle} remaining in this cycle
          </p>
        </div>
      )}

      {/* Posting history */}
      <div className="px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-2">
          Posting History
        </p>
        <ClipPostHistoryPanel clipId={clip.id} />
      </div>

      {canMarkPosted && (
        <MarkPostedDialog
          clip={clip}
          open={markPostedOpen}
          onOpenChange={setMarkPostedOpen}
        />
      )}
    </div>
  );
}

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, CheckSquare, Square } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTitles } from "@/hooks/useTitles";
import { useProjects } from "@/hooks/useProjects";
import {
  useClips,
  useApproveClip,
  useRejectClip,
  useBulkApproveClips,
  useBulkArchiveClips,
} from "@/hooks/useClips";
import { useRotationData } from "@/hooks/useClipPosts";
import ClipCard from "@/components/ClipCard";
import ClipDetailPanel from "@/components/ClipDetailPanel";
import ClipMetadataDialog from "@/components/ClipMetadataDialog";
import type { Clip } from "@shared/schema";

type Filters = {
  titleId?: number;
  projectId?: number;
  status?: string;
  unpostedOnly: boolean;
};

const STATUS_FILTER_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "new", label: "New" },
  { value: "awaiting_review", label: "Awaiting Review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "posted", label: "Posted" },
  { value: "archived", label: "Archived" },
];

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-border/50 overflow-hidden animate-pulse">
      <div className="aspect-video bg-muted" />
      <div className="p-3 space-y-2">
        <div className="h-3 bg-muted rounded w-3/4" />
        <div className="h-3 bg-muted rounded w-1/2" />
      </div>
    </div>
  );
}

export default function ClipLibraryPage() {
  const { user } = useAuth();

  const canApprove = ["admin", "marketing_operator", "reviewer"].includes(
    user?.role ?? ""
  );
  const canEdit = ["admin", "marketing_operator"].includes(user?.role ?? "");

  // Parse URL params for pre-filtering
  const [filters, setFilters] = useState<Filters>(() => {
    const params = new URLSearchParams(window.location.search);
    return {
      titleId: params.get("title") ? parseInt(params.get("title")!) : undefined,
      projectId: params.get("project") ? parseInt(params.get("project")!) : undefined,
      status: undefined,
      unpostedOnly: false,
    };
  });

  const [selectedClips, setSelectedClips] = useState<Set<number>>(new Set());
  const [selectedClipForDetail, setSelectedClipForDetail] = useState<Clip | null>(null);
  const [metadataDialogOpen, setMetadataDialogOpen] = useState(false);
  const [metadataDialogClip, setMetadataDialogClip] = useState<Clip | null>(null);

  // Data hooks
  const { data: titles = [] } = useTitles();
  const { data: allProjects = [] } = useProjects();
  const { data: clips = [], isLoading, refetch } = useClips({
    titleId: filters.titleId,
    projectId: filters.projectId,
    status: filters.status,
    unpostedOnly: filters.unpostedOnly,
  });

  const approveClip = useApproveClip();
  const rejectClip = useRejectClip();
  const bulkApprove = useBulkApproveClips();
  const bulkArchive = useBulkArchiveClips();

  // Rotation data for selected clip's project
  const detailProjectId = selectedClipForDetail?.projectId ?? null;
  const { data: rotationData } = useRotationData(detailProjectId);
  const rotationStats = rotationData?.stats
    ? {
        totalApproved: rotationData.stats.totalApproved,
        postedCount: rotationData.stats.totalPosted,
        remainingInCycle: rotationData.stats.totalUnposted,
      }
    : null;

  // Filter projects by selected title
  const filteredProjects = filters.titleId
    ? allProjects.filter((p) => p.titleId === filters.titleId)
    : allProjects;

  // If selected clip is no longer in the list (e.g., after filter change), deselect
  useEffect(() => {
    if (
      selectedClipForDetail &&
      clips.length > 0 &&
      !clips.find((c) => c.id === selectedClipForDetail.id)
    ) {
      setSelectedClipForDetail(null);
    }
  }, [clips, selectedClipForDetail]);

  // Update selectedClipForDetail when clips list refreshes (so detail reflects latest data)
  useEffect(() => {
    if (selectedClipForDetail) {
      const updated = clips.find((c) => c.id === selectedClipForDetail.id);
      if (updated) setSelectedClipForDetail(updated);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clips]);

  const handleSelectClip = useCallback((id: number, checked: boolean) => {
    setSelectedClips((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const handleSelectAll = () => {
    setSelectedClips(new Set(clips.map((c) => c.id)));
  };

  const handleClearSelection = () => {
    setSelectedClips(new Set());
  };

  const handleBulkApprove = async () => {
    if (selectedClips.size === 0) return;
    const ids = [...selectedClips];
    await bulkApprove.mutateAsync(ids);
    setSelectedClips(new Set());
  };

  const handleBulkArchive = async () => {
    if (selectedClips.size === 0) return;
    const ids = [...selectedClips];
    await bulkArchive.mutateAsync(ids);
    setSelectedClips(new Set());
  };

  const handleApprove = async (id: number) => {
    await approveClip.mutateAsync(id);
  };

  const handleReject = async (id: number) => {
    await rejectClip.mutateAsync(id);
  };

  const handleViewDetails = (clip: Clip) => {
    setSelectedClipForDetail(clip);
  };

  const handleCloseDetail = () => {
    setSelectedClipForDetail(null);
  };

  const handleEdit = (clip: Clip) => {
    setMetadataDialogClip(clip);
    setMetadataDialogOpen(true);
  };

  const clearFilters = () => {
    setFilters({ unpostedOnly: false });
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left filter panel */}
      <aside className="w-64 flex-shrink-0 border-r border-border/50 flex flex-col overflow-y-auto">
        <div className="p-4 space-y-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-3">
              Filters
            </p>

            {/* Title filter */}
            <div className="space-y-1.5 mb-3">
              <label className="text-xs font-medium text-muted-foreground">Title</label>
              <select
                value={filters.titleId ?? ""}
                onChange={(e) => {
                  const val = e.target.value ? parseInt(e.target.value) : undefined;
                  setFilters((f) => ({ ...f, titleId: val, projectId: undefined }));
                }}
                className="w-full text-xs rounded-lg border border-input bg-background px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">All Titles</option>
                {titles.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.titleName}
                  </option>
                ))}
              </select>
            </div>

            {/* Project filter */}
            <div className="space-y-1.5 mb-3">
              <label className="text-xs font-medium text-muted-foreground">Project</label>
              <select
                value={filters.projectId ?? ""}
                onChange={(e) => {
                  const val = e.target.value ? parseInt(e.target.value) : undefined;
                  setFilters((f) => ({ ...f, projectId: val }));
                }}
                className="w-full text-xs rounded-lg border border-input bg-background px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">All Projects</option>
                {filteredProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.projectName}
                  </option>
                ))}
              </select>
            </div>

            {/* Status filter */}
            <div className="space-y-1.5 mb-3">
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <select
                value={filters.status ?? ""}
                onChange={(e) => {
                  const val = e.target.value || undefined;
                  setFilters((f) => ({ ...f, status: val }));
                }}
                className="w-full text-xs rounded-lg border border-input bg-background px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {STATUS_FILTER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Unposted only toggle */}
            <div className="flex items-center gap-2 mb-4">
              <input
                id="unposted-toggle"
                type="checkbox"
                checked={filters.unpostedOnly}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, unpostedOnly: e.target.checked }))
                }
                className="h-4 w-4 rounded accent-rose-500"
              />
              <label
                htmlFor="unposted-toggle"
                className="text-xs text-muted-foreground cursor-pointer"
              >
                Unposted only
              </label>
            </div>

            <button
              onClick={clearFilters}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear filters
            </button>
          </div>
        </div>
      </aside>

      {/* Center panel */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-border/50 flex-shrink-0">
          <h1 className="text-sm font-semibold">Clip Library</h1>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {clips.length} clips
          </span>

          <div className="flex-1" />

          {selectedClips.size > 0 ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {selectedClips.size} selected
              </span>
              {canApprove && (
                <button
                  onClick={handleBulkApprove}
                  disabled={bulkApprove.isPending}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 transition-colors"
                >
                  Approve All
                </button>
              )}
              <button
                onClick={handleBulkArchive}
                disabled={bulkArchive.isPending}
                className="text-xs font-medium px-3 py-1.5 rounded-lg border border-border hover:bg-muted disabled:opacity-50 transition-colors"
              >
                Archive All
              </button>
              <button
                onClick={handleClearSelection}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {clips.length > 0 && (
                <button
                  onClick={handleSelectAll}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <CheckSquare className="h-3.5 w-3.5" />
                  Select All
                </button>
              )}
              <button
                onClick={() => refetch()}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </button>
            </div>
          )}
        </div>

        {/* Grid area */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : clips.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center max-w-xs">
                <Square className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-sm font-medium text-muted-foreground">
                  {filters.titleId || filters.projectId || filters.status || filters.unpostedOnly
                    ? "No clips match your filters"
                    : "No clips yet"}
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  {filters.titleId || filters.projectId || filters.status || filters.unpostedOnly
                    ? "Try adjusting your filters"
                    : "Connect a Dropbox folder in Projects to sync clips."}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {clips.map((clip) => (
                <ClipCard
                  key={clip.id}
                  clip={clip}
                  isSelected={selectedClips.has(clip.id)}
                  onSelect={handleSelectClip}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onViewDetails={handleViewDetails}
                  canApprove={canApprove}
                  isApprovePending={approveClip.isPending}
                  isRejectPending={rejectClip.isPending}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right detail panel */}
      <ClipDetailPanel
        clip={selectedClipForDetail}
        onClose={handleCloseDetail}
        canApprove={canApprove}
        canEdit={canEdit}
        canMarkPosted={canEdit}
        onApprove={handleApprove}
        onReject={handleReject}
        onEdit={handleEdit}
        rotationStats={rotationStats}
      />

      {/* Metadata dialog */}
      <ClipMetadataDialog
        open={metadataDialogOpen}
        onClose={() => {
          setMetadataDialogOpen(false);
          setMetadataDialogClip(null);
        }}
        clip={metadataDialogClip}
      />
    </div>
  );
}

import { useState } from "react";
import { Link, useParams } from "wouter";
import { ArrowLeft, RefreshCw, Pencil, HardDrive, Film, AlertCircle, RotateCcw, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjectDialog } from "@/components/ProjectDialog";
import { useProject, useProjectClips, useSyncProject } from "@/hooks/useProjects";
import { useTitle } from "@/hooks/useTitles";
import { useAuth } from "@/hooks/useAuth";
import { useRotationData, useResetRotation } from "@/hooks/useClipPosts";
import { RotationIndicator } from "@/components/RotationIndicator";
import { cn } from "@/lib/utils";
import type { Clip } from "@shared/schema";

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "Never";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString();
}

function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    paused: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20",
    archived: "bg-muted text-muted-foreground border-border",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        map[status] ?? map.archived
      )}
    >
      {status}
    </span>
  );
}

function ClipStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    new: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/20",
    approved: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    rejected: "bg-destructive/10 text-destructive border-destructive/20",
    posted: "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/20",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
        map[status] ?? "bg-muted text-muted-foreground border-border"
      )}
    >
      {status}
    </span>
  );
}

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? "0");
  const { user } = useAuth();
  const role = user?.role ?? "";
  const isOperator = ["admin", "marketing_operator"].includes(role);

  const [editOpen, setEditOpen] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);

  const { data: project, isLoading: projectLoading } = useProject(id || null);
  const { data: clips = [], isLoading: clipsLoading } = useProjectClips(id || null);
  const { data: title } = useTitle(project?.titleId ?? null);
  const syncProject = useSyncProject();
  const { data: rotationData } = useRotationData(id || null);
  const resetRotation = useResetRotation();

  const handleSync = async () => {
    if (!project) return;
    try {
      await syncProject.mutateAsync(project.id);
    } catch (err: any) {
      alert(err.message ?? "Sync failed to start.");
    }
  };

  if (projectLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-foreground" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h1 className="text-lg font-semibold text-foreground">Project not found</h1>
          <Link href="/projects" className="text-sm text-muted-foreground hover:underline mt-2 inline-block">
            Back to Projects
          </Link>
        </div>
      </div>
    );
  }

  const isSyncing = project.syncStatus === "syncing";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border px-6 py-5">
        <div className="flex items-center gap-3 mb-1">
          <Link href="/projects">
            <Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground">
              <ArrowLeft className="h-3.5 w-3.5 mr-1" />
              Projects
            </Button>
          </Link>
          {title && (
            <>
              <span className="text-muted-foreground/40">/</span>
              <span className="text-sm text-muted-foreground">{title.titleName}</span>
            </>
          )}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-foreground">{project.projectName}</h1>
            <StatusBadge status={project.status} />
          </div>
          {isOperator && (
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="h-3.5 w-3.5 mr-1.5" />
              Edit
            </Button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Dropbox Connection Card */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-semibold text-[15px]">Dropbox Connection</h2>
            </div>
            {isOperator && (
              <Button
                size="sm"
                variant="outline"
                disabled={isSyncing || syncProject.isPending}
                onClick={handleSync}
              >
                <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", isSyncing && "animate-spin")} />
                {isSyncing ? "Syncing..." : "Sync Now"}
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Root Folder</p>
              <p className="text-sm font-mono">
                {project.dropboxRootFolderPath || <span className="text-muted-foreground italic">Not configured</span>}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Viral Clips Folder</p>
              <p className="text-sm font-mono">
                {project.dropboxViralClipsFolderPath || <span className="text-muted-foreground italic">Not configured</span>}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Sync Status</p>
              <div className="flex items-center gap-1.5">
                {isSyncing ? (
                  <>
                    <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-sm text-blue-500">Syncing...</span>
                  </>
                ) : project.syncStatus === "error" ? (
                  <>
                    <span className="h-2 w-2 rounded-full bg-destructive" />
                    <span className="text-sm text-destructive">Error</span>
                  </>
                ) : (
                  <>
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                    <span className="text-sm text-muted-foreground">Idle</span>
                  </>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Last Synced</p>
              <p className="text-sm">{formatDate(project.lastSyncedAt)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Dropbox Cursor</p>
              <p className="text-sm text-muted-foreground">
                {project.dropboxCursor ? "Cursor stored (incremental sync ready)" : "Initial sync pending"}
              </p>
            </div>
          </div>

          {project.syncStatus === "error" && project.syncErrorMessage && (
            <div className="mt-4 flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3">
              <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{project.syncErrorMessage}</p>
            </div>
          )}
        </div>

        {/* Rotation Section */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Shuffle className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-semibold text-[15px]">Clip Rotation</h2>
            </div>
            {isOperator && (rotationData?.stats.totalApproved ?? 0) > 0 && (
              <div className="flex items-center gap-2">
                {resetConfirm ? (
                  <>
                    <span className="text-xs text-muted-foreground">Reset cycle?</span>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={resetRotation.isPending}
                      onClick={async () => {
                        await resetRotation.mutateAsync(id);
                        setResetConfirm(false);
                      }}
                    >
                      {resetRotation.isPending ? "Resetting..." : "Confirm"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setResetConfirm(false)}>
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setResetConfirm(true)}
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                    Reset Cycle
                  </Button>
                )}
              </div>
            )}
          </div>

          {!rotationData ? (
            <p className="text-sm text-muted-foreground">Loading rotation data...</p>
          ) : rotationData.stats.totalApproved === 0 ? (
            <p className="text-sm text-muted-foreground">
              No approved clips yet. Approve clips in the Clip Library to enable rotation.
            </p>
          ) : (
            <div className="space-y-4">
              <RotationIndicator stats={rotationData.stats} />
              {rotationData.nextClip && (
                <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
                  <p className="text-xs text-muted-foreground mb-1">Next clip to post</p>
                  <p className="text-sm font-medium truncate" title={rotationData.nextClip.filename}>
                    {rotationData.nextClip.filename}
                  </p>
                  {rotationData.nextClip.engagementScore && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Engagement score: {rotationData.nextClip.engagementScore}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Clips Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Film className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-semibold text-[15px]">Indexed Clips</h2>
              <span className="inline-flex items-center rounded-full bg-muted border border-border px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {clips.length}
              </span>
            </div>
            <Link href={`/clips?project=${project.id}`}>
              <Button variant="outline" size="sm">
                View in Clip Library
              </Button>
            </Link>
          </div>

          {clipsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 rounded-lg border border-border bg-muted/30 animate-pulse" />
              ))}
            </div>
          ) : clips.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 py-10 text-center">
              <Film className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No clips indexed yet.</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Run a sync to index video files from the Dropbox folder.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Filename</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Size</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Available</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {clips.map((clip: Clip) => (
                    <tr key={clip.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-2.5 font-mono text-xs truncate max-w-[240px]" title={clip.filename}>
                        {clip.filename}
                      </td>
                      <td className="px-4 py-2.5">
                        <ClipStatusBadge status={clip.status} />
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">
                        {formatBytes(clip.fileSizeBytes)}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={cn(
                            "h-2 w-2 rounded-full inline-block",
                            clip.isAvailable ? "bg-emerald-500" : "bg-muted-foreground/30"
                          )}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <ProjectDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        editing={project}
      />
    </div>
  );
}

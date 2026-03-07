import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { useTitles } from "@/hooks/useTitles";
import { useCreateProject, useUpdateProject, useSyncProject } from "@/hooks/useProjects";
import type { Project } from "@shared/schema";
import { cn } from "@/lib/utils";

interface ProjectDialogProps {
  open: boolean;
  onClose: () => void;
  editing?: Project | null;
  defaultTitleId?: number;
}

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "Never";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString();
}

function SyncStatusBadge({ status }: { status: string }) {
  if (status === "syncing") {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-blue-500">
        <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
        Syncing...
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-destructive">
        <span className="h-2 w-2 rounded-full bg-destructive" />
        Sync Error
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
      <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
      Idle
    </span>
  );
}

export function ProjectDialog({
  open,
  onClose,
  editing,
  defaultTitleId,
}: ProjectDialogProps) {
  const isEditing = !!editing;
  const { data: titles = [] } = useTitles();
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const syncProject = useSyncProject();

  const [projectName, setProjectName] = useState("");
  const [titleId, setTitleId] = useState<string>("");
  const [status, setStatus] = useState<string>("active");
  const [dropboxRootFolderPath, setDropboxRootFolderPath] = useState("");
  const [dropboxViralClipsFolderPath, setDropboxViralClipsFolderPath] = useState("");
  const [folderTrailers, setFolderTrailers] = useState("");
  const [folderPosters, setFolderPosters] = useState("");
  const [folderStills, setFolderStills] = useState("");
  const [folderSubtitles, setFolderSubtitles] = useState("");
  const [folderPress, setFolderPress] = useState("");
  const [showAdditional, setShowAdditional] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (editing) {
        setProjectName(editing.projectName ?? "");
        setTitleId(String(editing.titleId));
        setStatus(editing.status ?? "active");
        setDropboxRootFolderPath(editing.dropboxRootFolderPath ?? "");
        setDropboxViralClipsFolderPath(editing.dropboxViralClipsFolderPath ?? "");
        setFolderTrailers(editing.folderTrailers ?? "");
        setFolderPosters(editing.folderPosters ?? "");
        setFolderStills(editing.folderStills ?? "");
        setFolderSubtitles(editing.folderSubtitles ?? "");
        setFolderPress(editing.folderPress ?? "");
      } else {
        setProjectName("");
        setTitleId(defaultTitleId ? String(defaultTitleId) : "");
        setStatus("active");
        setDropboxRootFolderPath("");
        setDropboxViralClipsFolderPath("");
        setFolderTrailers("");
        setFolderPosters("");
        setFolderStills("");
        setFolderSubtitles("");
        setFolderPress("");
        setShowAdditional(false);
      }
      setError(null);
    }
  }, [open, editing, defaultTitleId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!projectName.trim()) {
      setError("Project name is required.");
      return;
    }
    if (!isEditing && !titleId) {
      setError("Please select a title.");
      return;
    }

    const payload = {
      projectName: projectName.trim(),
      titleId: parseInt(titleId),
      status,
      dropboxRootFolderPath: dropboxRootFolderPath.trim() || null,
      dropboxViralClipsFolderPath: dropboxViralClipsFolderPath.trim() || null,
      folderTrailers: folderTrailers.trim() || null,
      folderPosters: folderPosters.trim() || null,
      folderStills: folderStills.trim() || null,
      folderSubtitles: folderSubtitles.trim() || null,
      folderPress: folderPress.trim() || null,
    } as any;

    try {
      if (isEditing && editing) {
        await updateProject.mutateAsync({ id: editing.id, data: payload });
      } else {
        await createProject.mutateAsync(payload);
      }
      onClose();
    } catch (err: any) {
      setError(err.message ?? "An error occurred.");
    }
  };

  const handleSync = async () => {
    if (!editing) return;
    try {
      await syncProject.mutateAsync(editing.id);
    } catch (err: any) {
      setError(err.message ?? "Sync failed to start.");
    }
  };

  const isPending = createProject.isPending || updateProject.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Project" : "New Project"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Sync status panel (edit mode only) */}
          {isEditing && editing && (
            <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <SyncStatusBadge status={editing.syncStatus} />
                <p className="text-xs text-muted-foreground">
                  Last synced: {formatDate(editing.lastSyncedAt)}
                </p>
                {editing.syncStatus === "error" && editing.syncErrorMessage && (
                  <p className="text-xs text-destructive">{editing.syncErrorMessage}</p>
                )}
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={editing.syncStatus === "syncing" || syncProject.isPending}
                onClick={handleSync}
              >
                <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", syncProject.isPending && "animate-spin")} />
                Sync Now
              </Button>
            </div>
          )}

          {/* Project Name */}
          <div className="space-y-1.5">
            <Label htmlFor="projectName">Project Name <span className="text-destructive">*</span></Label>
            <Input
              id="projectName"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="e.g. Poor Agnes — Viral Campaign 2024"
            />
          </div>

          {/* Title Select */}
          <div className="space-y-1.5">
            <Label htmlFor="titleId">Title <span className="text-destructive">*</span></Label>
            <Select
              value={titleId}
              onValueChange={setTitleId}
              disabled={isEditing}
            >
              <SelectTrigger id="titleId">
                <SelectValue placeholder="Select a title..." />
              </SelectTrigger>
              <SelectContent>
                {titles.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {t.titleName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isEditing && (
              <p className="text-xs text-muted-foreground">Title cannot be changed after creation.</p>
            )}
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Dropbox Root Folder */}
          <div className="space-y-1.5">
            <Label htmlFor="dropboxRoot">Dropbox Root Folder</Label>
            <Input
              id="dropboxRoot"
              value={dropboxRootFolderPath}
              onChange={(e) => setDropboxRootFolderPath(e.target.value)}
              placeholder="/Poor Agnes"
            />
          </div>

          {/* Dropbox Viral Clips Folder */}
          <div className="space-y-1.5">
            <Label htmlFor="dropboxViralClips">Viral Clips Folder</Label>
            <Input
              id="dropboxViralClips"
              value={dropboxViralClipsFolderPath}
              onChange={(e) => setDropboxViralClipsFolderPath(e.target.value)}
              placeholder="/Poor Agnes/Viral Clips"
            />
            <p className="text-xs text-muted-foreground">
              This folder will be scanned during Dropbox sync for .mp4, .mov, .m4v files.
            </p>
          </div>

          {/* Additional Folder Paths (collapsible) */}
          <div className="border border-border rounded-lg">
            <button
              type="button"
              className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setShowAdditional((v) => !v)}
            >
              Additional Folder Paths
              {showAdditional ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
            {showAdditional && (
              <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                {[
                  { label: "Trailers", value: folderTrailers, setter: setFolderTrailers, placeholder: "/Poor Agnes/Trailers" },
                  { label: "Posters", value: folderPosters, setter: setFolderPosters, placeholder: "/Poor Agnes/Posters" },
                  { label: "Stills", value: folderStills, setter: setFolderStills, placeholder: "/Poor Agnes/Stills" },
                  { label: "Subtitles", value: folderSubtitles, setter: setFolderSubtitles, placeholder: "/Poor Agnes/Subtitles" },
                  { label: "Press", value: folderPress, setter: setFolderPress, placeholder: "/Poor Agnes/Press" },
                ].map(({ label, value, setter, placeholder }) => (
                  <div key={label} className="space-y-1">
                    <Label className="text-xs text-muted-foreground">{label}</Label>
                    <Input
                      value={value}
                      onChange={(e) => setter(e.target.value)}
                      placeholder={placeholder}
                      className="h-8 text-sm"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : isEditing ? "Save Changes" : "Create Project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

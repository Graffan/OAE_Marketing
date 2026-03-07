import { useState } from "react";
import { Link } from "wouter";
import { Plus, RefreshCw, Pencil, Trash2, FolderOpen, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProjectDialog } from "@/components/ProjectDialog";
import { useProjects, useDeleteProject, useSyncProject } from "@/hooks/useProjects";
import { useTitles } from "@/hooks/useTitles";
import { useAuth } from "@/hooks/useAuth";
import type { Project } from "@shared/schema";
import { cn } from "@/lib/utils";

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "Never synced";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString();
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

function SyncIndicator({ project }: { project: Project }) {
  const { syncStatus, syncErrorMessage } = project;
  if (syncStatus === "syncing") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-blue-500">
        <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
        Syncing...
      </span>
    );
  }
  if (syncStatus === "error") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-destructive" title={syncErrorMessage ?? undefined}>
        <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
        Sync Error
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
      Idle
    </span>
  );
}

export default function ProjectsPage() {
  const { user } = useAuth();
  const role = user?.role ?? "";
  const isOperator = ["admin", "marketing_operator"].includes(role);
  const isAdmin = role === "admin";

  const [filterTitleId, setFilterTitleId] = useState<number | undefined>(undefined);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const { data: projects = [], isLoading } = useProjects(filterTitleId);
  const { data: titles = [] } = useTitles();
  const deleteProject = useDeleteProject();
  const syncProject = useSyncProject();

  const titleMap = new Map(titles.map((t) => [t.id, t.titleName]));

  const handleDelete = async (project: Project) => {
    if (!window.confirm(`Delete project "${project.projectName}"? This will also delete all associated clips.`)) return;
    try {
      await deleteProject.mutateAsync(project.id);
    } catch (err: any) {
      alert(err.message ?? "Failed to delete project.");
    }
  };

  const handleSync = async (project: Project) => {
    try {
      await syncProject.mutateAsync(project.id);
    } catch (err: any) {
      alert(err.message ?? "Sync failed to start.");
    }
  };

  const openCreate = () => {
    setEditingProject(null);
    setDialogOpen(true);
  };

  const openEdit = (project: Project) => {
    setEditingProject(project);
    setDialogOpen(true);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Projects</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage Dropbox-connected projects for your titles
            </p>
          </div>
          {isOperator && (
            <Button onClick={openCreate} size="sm">
              <Plus className="h-4 w-4 mr-1.5" />
              New Project
            </Button>
          )}
        </div>

        {/* Filter bar */}
        <div className="mt-4 flex items-center gap-3">
          <div className="w-56">
            <Select
              value={filterTitleId ? String(filterTitleId) : "all"}
              onValueChange={(v) => setFilterTitleId(v === "all" ? undefined : parseInt(v))}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Titles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Titles</SelectItem>
                {titles.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {t.titleName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <span className="text-sm text-muted-foreground">
            {projects.length} project{projects.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-52 rounded-xl border border-border bg-muted/30 animate-pulse" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <FolderOpen className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <h3 className="text-sm font-medium text-foreground">No projects yet</h3>
            <p className="text-xs text-muted-foreground mt-1 mb-4">
              Create a project to connect a Dropbox folder to a title.
            </p>
            {isOperator && (
              <Button onClick={openCreate} size="sm">
                <Plus className="h-4 w-4 mr-1.5" />
                Create your first project
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <div
                key={project.id}
                className="flex flex-col rounded-xl border border-border bg-card shadow-sm overflow-hidden"
              >
                {/* Card header */}
                <div className="px-4 pt-4 pb-3 border-b border-border/60">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground truncate">
                        {titleMap.get(project.titleId) ?? `Title #${project.titleId}`}
                      </p>
                      <h3 className="font-semibold text-[15px] text-foreground leading-tight mt-0.5 truncate">
                        {project.projectName}
                      </h3>
                    </div>
                    <StatusBadge status={project.status} />
                  </div>
                </div>

                {/* Card body */}
                <div className="px-4 py-3 flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <SyncIndicator project={project} />
                    <span className="text-xs text-muted-foreground">
                      {formatDate(project.lastSyncedAt)}
                    </span>
                  </div>

                  {project.dropboxViralClipsFolderPath ? (
                    <p className="text-xs text-muted-foreground font-mono truncate" title={project.dropboxViralClipsFolderPath}>
                      {project.dropboxViralClipsFolderPath}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground/50 italic">No clips folder configured</p>
                  )}

                  {project.syncStatus === "error" && project.syncErrorMessage && (
                    <p className="text-xs text-destructive line-clamp-2">
                      {project.syncErrorMessage}
                    </p>
                  )}
                </div>

                {/* Card actions */}
                <div className="px-4 py-3 border-t border-border/60 flex items-center gap-2">
                  {isOperator && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs"
                      disabled={project.syncStatus === "syncing" || syncProject.isPending}
                      onClick={() => handleSync(project)}
                    >
                      <RefreshCw className={cn(
                        "h-3 w-3 mr-1.5",
                        project.syncStatus === "syncing" && "animate-spin"
                      )} />
                      Sync
                    </Button>
                  )}
                  {isOperator && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-xs"
                      onClick={() => openEdit(project)}
                    >
                      <Pencil className="h-3 w-3 mr-1.5" />
                      Edit
                    </Button>
                  )}
                  <div className="flex-1" />
                  {isAdmin && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(project)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                  <Link href={`/projects/${project.id}`}>
                    <Button size="sm" variant="ghost" className="h-8 text-xs">
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ProjectDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        editing={editingProject}
      />
    </div>
  );
}

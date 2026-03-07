import { useState } from "react";
import { Link } from "wouter";
import { Plus, Search, Pencil, Trash2, ExternalLink, Film } from "lucide-react";
import { useTitles, useDeleteTitle } from "@/hooks/useTitles";
import { useAuth } from "@/hooks/useAuth";
import TitleDialog from "@/components/TitleDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Title } from "@shared/schema";

type TitleWithCounts = Title & { clipCount: number; campaignCount: number };

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        status === "active" && "bg-green-500/10 text-green-700 dark:text-green-400 ring-1 ring-green-500/20",
        status === "upcoming" && "bg-blue-500/10 text-blue-700 dark:text-blue-400 ring-1 ring-blue-500/20",
        status === "archived" && "bg-muted text-muted-foreground ring-1 ring-border"
      )}
    >
      {status}
    </span>
  );
}

export default function TitlesPage() {
  const { user } = useAuth();
  const { data: titles, isLoading } = useTitles();
  const deleteTitle = useDeleteTitle();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TitleWithCounts | null>(null);
  const [search, setSearch] = useState("");

  const canEdit = ["admin", "marketing_operator"].includes(user?.role ?? "");
  const isAdmin = user?.role === "admin";

  const filtered = (titles ?? []).filter((t) =>
    t.titleName.toLowerCase().includes(search.toLowerCase())
  );

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(title: TitleWithCounts) {
    setEditing(title);
    setDialogOpen(true);
  }

  async function handleDelete(title: TitleWithCounts) {
    if (!window.confirm(`Delete "${title.titleName}"? This cannot be undone.`)) return;
    try {
      await deleteTitle.mutateAsync(title.id);
    } catch (err: any) {
      alert(err.message ?? "Failed to delete title");
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Page header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-border">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Titles</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage film and series titles, metadata, and marketing content
          </p>
        </div>
        {canEdit && (
          <Button onClick={openCreate} size="sm">
            <Plus className="h-4 w-4 mr-1.5" />
            Add Title
          </Button>
        )}
      </div>

      {/* Toolbar */}
      <div className="px-6 py-3 border-b border-border">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search titles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center px-6">
            <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
              <Film className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium text-foreground">
                {search ? "No titles match your search" : "No titles yet"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {search ? "Try a different search term" : "Add your first title to get started"}
              </p>
            </div>
            {canEdit && !search && (
              <Button onClick={openCreate} size="sm">
                <Plus className="h-4 w-4 mr-1.5" />
                Add your first title
              </Button>
            )}
          </div>
        ) : (
          <div className="px-6 py-4">
            {/* Table header */}
            <div className="grid grid-cols-[48px_1fr_72px_140px_100px_64px_80px_120px] gap-3 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border mb-1">
              <div></div>
              <div>Title</div>
              <div>Year</div>
              <div>Genre</div>
              <div>Status</div>
              <div className="text-center">Clips</div>
              <div className="text-center">Campaigns</div>
              <div></div>
            </div>

            {/* Table rows */}
            <div className="divide-y divide-border/50">
              {filtered.map((title) => (
                <div
                  key={title.id}
                  className="grid grid-cols-[48px_1fr_72px_140px_100px_64px_80px_120px] gap-3 px-3 py-3 items-center hover:bg-muted/30 rounded-lg transition-colors"
                >
                  {/* Poster */}
                  <div className="flex-shrink-0">
                    {title.omdbPosterUrl ? (
                      <img
                        src={title.omdbPosterUrl}
                        alt={title.titleName}
                        className="h-10 w-auto rounded object-cover"
                        style={{ maxWidth: 40 }}
                      />
                    ) : (
                      <div className="h-10 w-8 rounded bg-muted flex items-center justify-center">
                        <Film className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Title name */}
                  <div className="min-w-0">
                    <Link
                      href={`/titles/${title.id}`}
                      className="font-medium text-sm text-foreground hover:underline truncate block"
                    >
                      {title.titleName}
                    </Link>
                  </div>

                  {/* Year */}
                  <div className="text-sm text-muted-foreground">
                    {title.releaseYear ?? "—"}
                  </div>

                  {/* Genre */}
                  <div className="text-sm text-muted-foreground truncate">
                    {title.genre ?? "—"}
                  </div>

                  {/* Status badge */}
                  <div>
                    <StatusBadge status={title.status} />
                  </div>

                  {/* Clip count */}
                  <div className="text-sm text-center text-muted-foreground">
                    {title.clipCount}
                  </div>

                  {/* Campaign count */}
                  <div className="text-sm text-center text-muted-foreground">
                    {title.campaignCount}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 justify-end">
                    <Link href={`/titles/${title.id}`}>
                      <Button size="icon" variant="ghost" className="h-7 w-7" title="View">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                    {canEdit && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        title="Edit"
                        onClick={() => openEdit(title)}
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
                        onClick={() => handleDelete(title)}
                        disabled={deleteTitle.isPending}
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

      <TitleDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditing(null); }}
        editing={editing}
      />
    </div>
  );
}

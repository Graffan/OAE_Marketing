import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useScheduledPosts,
  useApprovePost,
  useCancelPost,
  useRetryPost,
  useDeleteScheduledPost,
  usePublishNow,
} from "@/hooks/useScheduledPosts";
import PostComposer from "@/components/schedule/PostComposer";
import {
  Plus,
  Instagram,
  Twitter,
  Youtube,
  Music2,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Send,
  RotateCcw,
  Trash2,
  ThumbsUp,
  Ban,
  Loader2,
  FileText,
  Zap,
} from "lucide-react";

// ─── Constants ──────────────────────────────────────────────────────────────

const PLATFORM_ICONS: Record<string, React.ElementType> = {
  instagram: Instagram,
  tiktok: Music2,
  twitter: Twitter,
  youtube: Youtube,
};

const PLATFORM_COLORS: Record<string, string> = {
  instagram: "text-pink-500",
  tiktok: "text-cyan-500",
  twitter: "text-sky-500",
  youtube: "text-red-500",
};

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  draft: {
    label: "Draft",
    icon: FileText,
    className: "bg-muted text-muted-foreground",
  },
  queued: {
    label: "Queued",
    icon: Clock,
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  },
  scheduled: {
    label: "Scheduled",
    icon: Clock,
    className: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  },
  publishing: {
    label: "Publishing",
    icon: Loader2,
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  },
  published: {
    label: "Published",
    icon: CheckCircle2,
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
  failed: {
    label: "Failed",
    icon: XCircle,
    className: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  },
  cancelled: {
    label: "Cancelled",
    icon: Ban,
    className: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
  },
};

const TAB_FILTERS: Record<string, string | undefined> = {
  all: undefined,
  drafts: "draft",
  scheduled: "scheduled",
  published: "published",
  failed: "failed",
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + "..." : text;
}

// ─── Post Row ────────────────────────────────────────────────────────────────

function PostRow({ post }: { post: any }) {
  const approvePost = useApprovePost();
  const cancelPost = useCancelPost();
  const retryPost = useRetryPost();
  const deletePost = useDeleteScheduledPost();
  const publishNow = usePublishNow();

  const status = STATUS_CONFIG[post.status] ?? STATUS_CONFIG.draft;
  const PlatformIcon = PLATFORM_ICONS[post.platform] ?? Send;
  const platformColor = PLATFORM_COLORS[post.platform] ?? "text-muted-foreground";
  const StatusIcon = status.icon;
  const isPending =
    approvePost.isPending || cancelPost.isPending || retryPost.isPending || deletePost.isPending || publishNow.isPending;

  return (
    <div className="group flex items-start gap-4 p-4 rounded-xl border border-border/50 bg-card hover:border-border/80 transition-colors">
      {/* Platform icon */}
      <div className="flex-shrink-0 mt-0.5">
        <PlatformIcon className={`h-5 w-5 ${platformColor}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={`text-[10px] font-medium ${status.className}`}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {status.label}
          </Badge>
          {post.createdByType === "morgan" && (
            <Badge variant="outline" className="text-[10px] border-violet-300 text-violet-600 dark:text-violet-400">
              Morgan
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">
            {formatDateTime(post.scheduledAt ?? post.createdAt)}
          </span>
        </div>
        <p className="text-sm leading-relaxed">
          {truncate(post.caption ?? "", 180)}
        </p>
        {post.hashtags && (post.hashtags as string[]).length > 0 && (
          <p className="text-xs text-muted-foreground">
            {(post.hashtags as string[]).map((t: string) => `#${t}`).join(" ")}
          </p>
        )}
        {post.errorMessage && (
          <p className="text-xs text-red-500 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            {post.errorMessage}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {(post.status === "draft" || post.status === "queued") && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            disabled={isPending}
            onClick={() => approvePost.mutate(post.id)}
            title="Approve"
          >
            <ThumbsUp className="h-3.5 w-3.5" />
          </Button>
        )}
        {(post.status === "draft" || post.status === "queued" || post.status === "scheduled") && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs text-emerald-600"
            disabled={isPending}
            onClick={() => publishNow.mutate(post.id)}
            title="Publish Now"
          >
            <Zap className="h-3.5 w-3.5" />
          </Button>
        )}
        {(post.status === "draft" || post.status === "scheduled" || post.status === "queued") && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            disabled={isPending}
            onClick={() => cancelPost.mutate(post.id)}
            title="Cancel"
          >
            <Ban className="h-3.5 w-3.5" />
          </Button>
        )}
        {post.status === "failed" && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            disabled={isPending}
            onClick={() => retryPost.mutate(post.id)}
            title="Retry"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        )}
        {(post.status === "draft" || post.status === "cancelled" || post.status === "failed") && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs text-red-500 hover:text-red-600"
            disabled={isPending}
            onClick={() => deletePost.mutate(post.id)}
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Schedule Page ───────────────────────────────────────────────────────────

export default function SchedulePage() {
  const [composerOpen, setComposerOpen] = useState(false);
  const [tab, setTab] = useState("all");
  const [platformFilter, setPlatformFilter] = useState<string>("all");

  const statusFilter = TAB_FILTERS[tab];
  const { data: posts = [], isLoading } = useScheduledPosts({
    status: statusFilter,
    platform: platformFilter === "all" ? undefined : platformFilter,
  });

  const allPosts = posts as any[];

  // Stat counts
  const drafts = allPosts.filter((p: any) => p.status === "draft").length;
  const scheduled = allPosts.filter((p: any) => p.status === "scheduled").length;
  const published = allPosts.filter((p: any) => p.status === "published").length;
  const failed = allPosts.filter((p: any) => p.status === "failed").length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-8 py-6 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Schedule</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage and schedule posts across all platforms
            </p>
          </div>
          <Button onClick={() => setComposerOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Compose Post
          </Button>
        </div>

        {/* Quick stats */}
        <div className="flex items-center gap-6 mt-5">
          <StatPill label="Drafts" count={drafts} className="text-muted-foreground" />
          <StatPill label="Scheduled" count={scheduled} className="text-violet-600 dark:text-violet-400" />
          <StatPill label="Published" count={published} className="text-emerald-600 dark:text-emerald-400" />
          {failed > 0 && (
            <StatPill label="Failed" count={failed} className="text-red-600 dark:text-red-400" />
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="px-8 py-3 border-b border-border/50 flex items-center gap-4">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="bg-transparent gap-1 h-auto p-0">
            {Object.keys(TAB_FILTERS).map((key) => (
              <TabsTrigger
                key={key}
                value={key}
                className="rounded-lg px-3 py-1.5 text-xs capitalize data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                {key}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="ml-auto">
          <Select value={platformFilter} onValueChange={setPlatformFilter}>
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue placeholder="All platforms" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              <SelectItem value="instagram">Instagram</SelectItem>
              <SelectItem value="tiktok">TikTok</SelectItem>
              <SelectItem value="twitter">X / Twitter</SelectItem>
              <SelectItem value="youtube">YouTube</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Post list */}
      <div className="flex-1 overflow-auto p-8">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : allPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Send className="h-10 w-10 text-muted-foreground/30 mb-4" />
            <p className="text-sm text-muted-foreground mb-1">No posts yet</p>
            <p className="text-xs text-muted-foreground/60 mb-4">
              Create your first post to start building your social presence
            </p>
            <Button variant="outline" size="sm" onClick={() => setComposerOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-2" />
              Compose Post
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {allPosts.map((post: any) => (
              <PostRow key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>

      <PostComposer open={composerOpen} onOpenChange={setComposerOpen} />
    </div>
  );
}

// ─── StatPill ────────────────────────────────────────────────────────────────

function StatPill({ label, count, className }: { label: string; count: number; className: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`text-lg font-semibold tabular-nums ${className}`}>{count}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

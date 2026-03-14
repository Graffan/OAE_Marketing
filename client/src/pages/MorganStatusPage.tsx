import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import {
  useMorganTasks,
  useRunMorganTask,
  useMorganAutoApproveRules,
  useCreateAutoApproveRule,
  useUpdateAutoApproveRule,
  useDeleteAutoApproveRule,
} from "@/hooks/useMorganTasks";
import {
  useScheduledPosts,
  useApprovePost,
  useCancelPost,
  useUpdateScheduledPost,
} from "@/hooks/useScheduledPosts";
import { Textarea } from "@/components/ui/textarea";
import {
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Sparkles,
  ThumbsUp,
  Ban,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Brain,
  Zap,
  Instagram,
  Twitter,
  Youtube,
  Music2,
  Send,
  AlertTriangle,
} from "lucide-react";

// ─── Constants ──────────────────────────────────────────────────────────────

const TASK_META: Record<string, { label: string; description: string; icon: React.ElementType }> = {
  morning_scan: { label: "Morning Scan", description: "Inventory check, analytics, rotation state", icon: Brain },
  content_draft: { label: "Content Draft", description: "Generate post ideas for today", icon: Sparkles },
  morning_briefing: { label: "Morning Briefing", description: "Summary notification to all owners", icon: Send },
  publish_approved: { label: "Publish Approved", description: "Publish posts at scheduled times", icon: Zap },
  evening_digest: { label: "Evening Digest", description: "Day's performance snapshot", icon: Clock },
  weekly_review: { label: "Weekly Review", description: "Weekly strategy analysis (Sundays)", icon: Brain },
};

const STATUS_BADGE: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  pending: { label: "Pending", className: "bg-muted text-muted-foreground", icon: Clock },
  running: { label: "Running", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300", icon: Loader2 },
  completed: { label: "Completed", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300", icon: CheckCircle2 },
  failed: { label: "Failed", className: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300", icon: XCircle },
  skipped: { label: "Skipped", className: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400", icon: Ban },
};

const PLATFORM_ICONS: Record<string, React.ElementType> = {
  instagram: Instagram,
  tiktok: Music2,
  twitter: Twitter,
  youtube: Youtube,
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

// ─── Task History Tab ────────────────────────────────────────────────────────

function TaskHistoryTab() {
  const { user } = useAuth();
  const { data: tasks = [], isLoading } = useMorganTasks();
  const runTask = useRunMorganTask();
  const isAdmin = user?.role === "admin";

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Manual trigger buttons (admin only) */}
      {isAdmin && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Run Task Manually</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(TASK_META).map(([type, meta]) => (
              <Button
                key={type}
                variant="outline"
                size="sm"
                onClick={() => runTask.mutate(type)}
                disabled={runTask.isPending}
                className="text-xs"
              >
                <Play className="h-3 w-3 mr-1.5" />
                {meta.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Task history */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">Recent Tasks</h3>
        {(tasks as any[]).length === 0 ? (
          <div className="text-center py-8 border border-dashed border-border/50 rounded-xl">
            <Brain className="h-8 w-8 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No tasks have run yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Morgan's scheduler runs automatically, or trigger tasks manually above
            </p>
          </div>
        ) : (
          (tasks as any[]).map((task: any) => {
            const meta = TASK_META[task.taskType] ?? { label: task.taskType, description: "", icon: Brain };
            const status = STATUS_BADGE[task.status] ?? STATUS_BADGE.pending;
            const StatusIcon = status.icon;
            const TaskIcon = meta.icon;

            return (
              <div
                key={task.id}
                className="flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-card"
              >
                <TaskIcon className="h-5 w-5 text-violet-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{meta.label}</span>
                    <Badge className={`text-[10px] ${status.className}`}>
                      <StatusIcon className={`h-3 w-3 mr-1 ${task.status === "running" ? "animate-spin" : ""}`} />
                      {status.label}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatTime(task.scheduledAt)}
                    {task.completedAt && ` — completed ${formatTime(task.completedAt)}`}
                  </p>
                  {task.error && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {task.error}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── Approval Card ──────────────────────────────────────────────────────────

interface ApprovalCardProps {
  post: any;
  onApprove: () => void;
  onReject: () => void;
  approving: boolean;
  rejecting: boolean;
}

function ApprovalCard({ post, onApprove, onReject, approving, rejecting }: ApprovalCardProps) {
  const [editing, setEditing] = useState(false);
  const [caption, setCaption] = useState(post.caption ?? "");
  const [hashtags, setHashtags] = useState(post.hashtags ?? "");
  const [scheduledTime, setScheduledTime] = useState(
    post.scheduledAt ? new Date(post.scheduledAt).toISOString().slice(0, 16) : ""
  );
  const updatePost = useUpdateScheduledPost();

  const PlatformIcon = PLATFORM_ICONS[post.platform] ?? Send;
  const isDirty =
    caption !== (post.caption ?? "") ||
    hashtags !== (post.hashtags ?? "") ||
    scheduledTime !== (post.scheduledAt ? new Date(post.scheduledAt).toISOString().slice(0, 16) : "");

  function handleSave() {
    updatePost.mutate(
      {
        id: post.id,
        caption,
        hashtags,
        ...(scheduledTime ? { scheduledAt: new Date(scheduledTime).toISOString() } : {}),
      },
      { onSuccess: () => setEditing(false) }
    );
  }

  function handleCancel() {
    setCaption(post.caption ?? "");
    setHashtags(post.hashtags ?? "");
    setScheduledTime(post.scheduledAt ? new Date(post.scheduledAt).toISOString().slice(0, 16) : "");
    setEditing(false);
  }

  return (
    <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <PlatformIcon className="h-4 w-4 text-violet-500 flex-shrink-0" />
        <span className="text-xs font-medium capitalize text-muted-foreground">{post.platform}</span>
        {post.titleName && (
          <Badge className="text-[10px] bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
            {post.titleName}
          </Badge>
        )}
        <span className="text-[10px] text-muted-foreground/60 ml-auto">
          <Clock className="h-3 w-3 inline mr-1" />
          {formatTime(post.scheduledAt)}
        </span>
      </div>

      {/* Content */}
      <div className="px-4 pb-3">
        {editing ? (
          <div className="space-y-3 mt-2">
            <div>
              <Label className="text-xs text-muted-foreground">Caption</Label>
              <Textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={4}
                className="mt-1 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Hashtags</Label>
              <Input
                value={hashtags}
                onChange={(e) => setHashtags(e.target.value)}
                placeholder="#indie #film #horror"
                className="mt-1 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Scheduled Time</Label>
              <Input
                type="datetime-local"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="mt-1 text-sm"
              />
            </div>
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="w-full text-left group cursor-pointer"
            title="Click to edit"
          >
            <p className="text-sm mt-1 group-hover:bg-muted/50 rounded-lg p-1.5 -m-1.5 transition-colors">
              {post.caption?.slice(0, 200)}
              {post.caption?.length > 200 && "..."}
            </p>
            {post.hashtags && (
              <p className="text-xs text-blue-500 mt-1 group-hover:bg-muted/50 rounded-lg p-1.5 -m-1.5 transition-colors">
                {post.hashtags}
              </p>
            )}
          </button>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 px-4 pb-4">
        {editing ? (
          <>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!isDirty || updatePost.isPending}
              className="text-xs"
            >
              {updatePost.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
              Save Changes
            </Button>
            <Button size="sm" variant="ghost" onClick={handleCancel} className="text-xs">
              Cancel
            </Button>
          </>
        ) : (
          <>
            <Button
              size="sm"
              onClick={onApprove}
              disabled={approving || rejecting}
              className="text-xs bg-emerald-600 hover:bg-emerald-700"
            >
              {approving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <ThumbsUp className="h-3 w-3 mr-1" />}
              Approve
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onReject}
              disabled={approving || rejecting}
              className="text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              {rejecting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Ban className="h-3 w-3 mr-1" />}
              Reject
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditing(true)}
              className="text-xs ml-auto"
            >
              Edit
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Approval Queue Tab ──────────────────────────────────────────────────────

function ApprovalQueueTab() {
  const { data: posts = [], isLoading } = useScheduledPosts({ status: "draft" });
  const approvePost = useApprovePost();
  const cancelPost = useCancelPost();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  const queue = (posts as any[]).filter((p: any) => p.createdByType === "morgan");
  const humanDrafts = (posts as any[]).filter((p: any) => p.createdByType !== "morgan");

  return (
    <div className="space-y-6">
      {/* Morgan's drafts awaiting approval */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">
          Morgan's Drafts ({queue.length})
        </h3>
        {queue.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-border/50 rounded-xl">
            <Sparkles className="h-8 w-8 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No drafts awaiting approval</p>
          </div>
        ) : (
          queue.map((post: any) => (
            <ApprovalCard
              key={post.id}
              post={post}
              onApprove={() => approvePost.mutate(post.id)}
              onReject={() => cancelPost.mutate(post.id)}
              approving={approvePost.isPending}
              rejecting={cancelPost.isPending}
            />
          ))
        )}
      </div>

      {/* Human drafts */}
      {humanDrafts.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">
            Your Drafts ({humanDrafts.length})
          </h3>
          {humanDrafts.map((post: any) => {
            const PIcon = PLATFORM_ICONS[post.platform] ?? Send;
            return (
              <div
                key={post.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-card"
              >
                <PIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm truncate flex-1">{post.caption?.slice(0, 80)}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => approvePost.mutate(post.id)}
                >
                  <ThumbsUp className="h-3 w-3 mr-1" />
                  Approve
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Auto-Approve Rules Tab ──────────────────────────────────────────────────

function AutoApproveRulesTab() {
  const { data: rules = [], isLoading } = useMorganAutoApproveRules();
  const createRule = useCreateAutoApproveRule();
  const updateRule = useUpdateAutoApproveRule();
  const deleteRule = useDeleteAutoApproveRule();
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "",
    description: "",
    conditionType: "recurring_series",
    threshold: 5,
  });

  function handleAdd() {
    createRule.mutate(
      {
        name: addForm.name,
        description: addForm.description || undefined,
        conditions: {
          type: addForm.conditionType,
          threshold: addForm.conditionType === "high_performer" ? addForm.threshold : undefined,
        },
      },
      {
        onSuccess: () => {
          setAddOpen(false);
          setAddForm({ name: "", description: "", conditionType: "recurring_series", threshold: 5 });
        },
      }
    );
  }

  if (isLoading) {
    return <Skeleton className="h-40 rounded-xl" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">Auto-Approve Rules</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Posts matching these rules are automatically approved without human review
          </p>
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Add Rule
        </Button>
      </div>

      {/* Default rules info */}
      <div className="rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/10 p-3">
        <p className="text-xs text-amber-700 dark:text-amber-300">
          Morgan NEVER auto-approves: first posts for new titles, crisis/sensitive content, or partnership mentions. These always go to the approval queue.
        </p>
      </div>

      {(rules as any[]).length === 0 ? (
        <div className="text-center py-8 border border-dashed border-border/50 rounded-xl">
          <Zap className="h-8 w-8 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No auto-approve rules configured</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            All Morgan-generated content will require manual approval
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {(rules as any[]).map((rule: any) => (
            <div
              key={rule.id}
              className="flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-card"
            >
              <Zap className="h-4 w-4 text-amber-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{rule.name}</span>
                  {!rule.isActive && (
                    <Badge className="text-[10px] bg-muted text-muted-foreground">Disabled</Badge>
                  )}
                </div>
                {rule.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">{rule.description}</p>
                )}
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                  Type: {(rule.conditions as any)?.type}
                  {(rule.conditions as any)?.threshold && ` · Threshold: ${(rule.conditions as any).threshold}`}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  onClick={() => updateRule.mutate({ id: rule.id, isActive: !rule.isActive })}
                >
                  {rule.isActive ? (
                    <ToggleRight className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-red-500"
                  onClick={() => deleteRule.mutate(rule.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Rule Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Add Auto-Approve Rule</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Rule Name</Label>
              <Input
                value={addForm.name}
                onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                placeholder="e.g., Throwback Thursday posts"
              />
            </div>
            <div className="space-y-2">
              <Label>Description <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input
                value={addForm.description}
                onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
                placeholder="When this rule applies..."
              />
            </div>
            <div className="space-y-2">
              <Label>Condition Type</Label>
              <Select
                value={addForm.conditionType}
                onValueChange={(v) => setAddForm({ ...addForm, conditionType: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recurring_series">Recurring Series (e.g., weekly themes)</SelectItem>
                  <SelectItem value="high_performer">High Performer Re-share</SelectItem>
                  <SelectItem value="template_match">Approved Template Match</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {addForm.conditionType === "high_performer" && (
              <div className="space-y-2">
                <Label>Engagement Threshold</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={addForm.threshold}
                  onChange={(e) => setAddForm({ ...addForm, threshold: Number(e.target.value) })}
                />
                <p className="text-xs text-muted-foreground">
                  Minimum engagement score (1-10) for auto-approval
                </p>
              </div>
            )}
          </div>
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button
              onClick={handleAdd}
              disabled={!addForm.name.trim() || createRule.isPending}
            >
              {createRule.isPending ? "Creating..." : "Create Rule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Morgan Status Page ──────────────────────────────────────────────────────

export default function MorganStatusPage() {
  return (
    <div className="flex flex-col h-full">
      <div className="px-8 py-6 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center shadow-[0_2px_8px_rgba(139,92,246,0.3)]">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Morgan Operations</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Autonomous cycle, approval queue, and automation rules
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="queue" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="border-b border-border/50 rounded-none bg-transparent w-full justify-start gap-1 h-auto px-8 py-0">
          <TabsTrigger
            value="queue"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 px-4"
          >
            Approval Queue
          </TabsTrigger>
          <TabsTrigger
            value="tasks"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 px-4"
          >
            Task History
          </TabsTrigger>
          <TabsTrigger
            value="rules"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 px-4"
          >
            Auto-Approve Rules
          </TabsTrigger>
        </TabsList>
        <TabsContent value="queue" className="flex-1 overflow-auto p-8">
          <div className="max-w-3xl">
            <ApprovalQueueTab />
          </div>
        </TabsContent>
        <TabsContent value="tasks" className="flex-1 overflow-auto p-8">
          <div className="max-w-3xl">
            <TaskHistoryTab />
          </div>
        </TabsContent>
        <TabsContent value="rules" className="flex-1 overflow-auto p-8">
          <div className="max-w-3xl">
            <AutoApproveRulesTab />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

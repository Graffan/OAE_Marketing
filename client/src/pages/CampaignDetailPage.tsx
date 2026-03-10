import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Trash2,
  Pencil,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Play,
  CheckSquare,
  Video,
} from "lucide-react";
import {
  useCampaign,
  useCampaignContents,
  usePatchCampaignStatus,
  useDeleteCampaign,
  useActivateCampaignContent,
} from "@/hooks/useCampaigns";
import { useClips } from "@/hooks/useClips";
import { useAuth } from "@/hooks/useAuth";
import AiOutputCard from "@/components/ai/AiOutputCard";
import CampaignWizard from "@/components/campaigns/CampaignWizard";
import { apiRequest } from "@/lib/queryClient";

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  ai_generated: "AI Generated",
  awaiting_approval: "Awaiting Approval",
  approved: "Approved",
  active: "Active",
  completed: "Completed",
  rejected: "Rejected",
  archived: "Archived",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  ai_generated: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  awaiting_approval: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  completed: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  rejected: "bg-destructive/10 text-destructive",
  archived: "bg-muted text-muted-foreground",
};

export default function CampaignDetailPage() {
  const [match, params] = useRoute("/campaigns/:id");
  const [, navigate] = useLocation();
  const id = match ? Number(params?.id) : null;

  const [wizardOpen, setWizardOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [requestEditsDialogOpen, setRequestEditsDialogOpen] = useState(false);
  const [editsNote, setEditsNote] = useState("");

  const { data: campaign, isLoading } = useCampaign(id);
  const { data: contents = [] } = useCampaignContents(id);
  const patchStatus = usePatchCampaignStatus();
  const deleteCampaign = useDeleteCampaign();
  const activateContent = useActivateCampaignContent();
  const { user } = useAuth();

  // Fetch clips for the title so we can show which ones are attached
  const { data: allTitleClips = [] } = useClips(
    campaign?.titleId ? { titleId: campaign.titleId } : {}
  );

  const role = user?.role ?? "";
  const canApprove = role === "admin" || role === "reviewer" || role === "executive";
  const canActivate = role === "admin" || role === "marketing_operator";
  const canEdit = role === "admin" || role === "marketing_operator";

  const briefContents = contents.filter((c) => c.contentType === "campaign_brief");
  const copyContents = contents.filter((c) => c.contentType === "post_copy");

  const campaignClipIds = (campaign?.clipIds as number[] | null) ?? [];
  const attachedClips = allTitleClips.filter((c) => campaignClipIds.includes(c.id));

  function handleActivateContent(contentId: number) {
    if (!id) return;
    activateContent.mutate({ campaignId: id, contentId });
  }

  function handleEdit(contentId: number, body: string) {
    if (!id) return;
    apiRequest("PATCH", `/api/campaigns/${id}/contents/${contentId}`, { body }).catch(() => {});
  }

  function handleDelete() {
    if (!id || !campaign) return;
    if (!confirm(`Delete campaign "${campaign.campaignName}"?`)) return;
    deleteCampaign.mutate(id, { onSuccess: () => navigate("/campaigns") });
  }

  function handleReject() {
    if (!id) return;
    patchStatus.mutate(
      { id, status: "rejected" },
      { onSuccess: () => setRejectDialogOpen(false) }
    );
  }

  function handleRequestEdits() {
    if (!id) return;
    patchStatus.mutate(
      { id, status: "draft" },
      { onSuccess: () => setRequestEditsDialogOpen(false) }
    );
  }

  if (isLoading || !campaign) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
    );
  }

  const statusLabel = STATUS_LABELS[campaign.status] ?? campaign.status;
  const statusColor = STATUS_COLORS[campaign.status] ?? "";

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/campaigns")}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <h1 className="text-xl font-semibold flex-1 truncate">{campaign.campaignName}</h1>
        <Badge className={statusColor}>{statusLabel}</Badge>
        {canEdit && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setWizardOpen(true)}
            title="Edit campaign"
          >
            <Pencil className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive"
          onClick={handleDelete}
          title="Delete campaign"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Details */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Campaign Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Goal</span>
            <span className="capitalize">{campaign.goal?.replace(/_/g, " ") ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Template</span>
            <span className="capitalize">{campaign.templateType?.replace(/_/g, " ") ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Regions</span>
            <span>{(campaign.targetRegions as string[] | null)?.join(", ") ?? "All"}</span>
          </div>
          {campaign.aiProviderUsed && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">AI Provider</span>
              <span className="capitalize">{campaign.aiProviderUsed}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Created</span>
            <span>{campaign.createdAt ? new Date(campaign.createdAt).toLocaleDateString() : "—"}</span>
          </div>
        </CardContent>
      </Card>

      {/* Attached Clips */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Video className="h-4 w-4" />
            Clips
            <Badge variant="outline" className="text-xs ml-1">{attachedClips.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {attachedClips.length === 0 ? (
            <p className="text-sm text-muted-foreground">No clips attached to this campaign.</p>
          ) : (
            <div className="space-y-1.5">
              {attachedClips.map((clip) => (
                <div key={clip.id} className="flex items-center justify-between text-sm py-1">
                  <span className="truncate flex-1 text-muted-foreground">{clip.filename ?? clip.dropboxPath ?? clip.dropboxFileId ?? `Clip ${clip.id}`}</span>
                  <Badge variant="outline" className="text-xs ml-2 shrink-0 capitalize">{clip.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Content */}
      {briefContents.length > 0 && (
        <AiOutputCard
          contentType="campaign_brief"
          contents={briefContents}
          onActivate={handleActivateContent}
          onEdit={handleEdit}
        />
      )}

      {copyContents.length > 0 && (
        <AiOutputCard
          contentType="post_copy"
          contents={copyContents}
          onActivate={handleActivateContent}
          onEdit={handleEdit}
        />
      )}

      {/* Approval Workflow */}
      <div className="flex flex-wrap gap-2 pt-2">
        {(campaign.status === "draft" || campaign.status === "ai_generated") && (
          <Button
            onClick={() => patchStatus.mutate({ id: campaign.id, status: "awaiting_approval" })}
            disabled={patchStatus.isPending}
          >
            Submit for Approval
          </Button>
        )}

        {canApprove && campaign.status === "awaiting_approval" && (
          <>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => patchStatus.mutate({ id: campaign.id, status: "approved" })}
              disabled={patchStatus.isPending}
            >
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              Approve
            </Button>
            <Button
              variant="outline"
              onClick={() => setRequestEditsDialogOpen(true)}
              disabled={patchStatus.isPending}
            >
              <RotateCcw className="h-4 w-4 mr-1.5" />
              Request Edits
            </Button>
            <Button
              variant="outline"
              className="text-destructive border-destructive/40 hover:bg-destructive/10"
              onClick={() => setRejectDialogOpen(true)}
              disabled={patchStatus.isPending}
            >
              <XCircle className="h-4 w-4 mr-1.5" />
              Reject
            </Button>
          </>
        )}

        {canActivate && campaign.status === "approved" && (
          <Button
            onClick={() => patchStatus.mutate({ id: campaign.id, status: "active" })}
            disabled={patchStatus.isPending}
          >
            <Play className="h-4 w-4 mr-1.5" />
            Activate Campaign
          </Button>
        )}

        {canActivate && campaign.status === "active" && (
          <Button
            variant="outline"
            onClick={() => patchStatus.mutate({ id: campaign.id, status: "completed" })}
            disabled={patchStatus.isPending}
          >
            <CheckSquare className="h-4 w-4 mr-1.5" />
            Mark Complete
          </Button>
        )}

        {campaign.status === "rejected" && canEdit && (
          <Button
            variant="outline"
            onClick={() => patchStatus.mutate({ id: campaign.id, status: "draft" })}
            disabled={patchStatus.isPending}
          >
            Reopen as Draft
          </Button>
        )}
      </div>

      {/* Edit Wizard Dialog */}
      {wizardOpen && (
        <Dialog open onOpenChange={(open) => !open && setWizardOpen(false)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Campaign</DialogTitle>
            </DialogHeader>
            <CampaignWizard initialCampaignId={campaign.id} />
          </DialogContent>
        </Dialog>
      )}

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reject Campaign</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Add an optional note explaining the rejection.
            </p>
            <Textarea
              placeholder="Rejection reason (optional)"
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              className="min-h-[80px] text-sm"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
              <Button
                className="bg-destructive hover:bg-destructive/90 text-white"
                onClick={handleReject}
                disabled={patchStatus.isPending}
              >
                Confirm Reject
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Request Edits Dialog */}
      <Dialog open={requestEditsDialogOpen} onOpenChange={setRequestEditsDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Request Edits</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              This will return the campaign to Draft status for revision.
            </p>
            <Textarea
              placeholder="What needs to be changed? (optional)"
              value={editsNote}
              onChange={(e) => setEditsNote(e.target.value)}
              className="min-h-[80px] text-sm"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setRequestEditsDialogOpen(false)}>Cancel</Button>
              <Button
                onClick={handleRequestEdits}
                disabled={patchStatus.isPending}
              >
                Send Back for Edits
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

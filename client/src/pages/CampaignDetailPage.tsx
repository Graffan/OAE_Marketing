import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Trash2 } from "lucide-react";
import {
  useCampaign,
  useCampaignContents,
  usePatchCampaignStatus,
  useDeleteCampaign,
  useActivateCampaignContent,
} from "@/hooks/useCampaigns";
import { useAuth } from "@/hooks/useAuth";
import AiOutputCard from "@/components/ai/AiOutputCard";
import { apiRequest } from "@/lib/queryClient";

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  ai_generated: "AI Generated",
  awaiting_approval: "Awaiting Approval",
  approved: "Approved",
  active: "Active",
  completed: "Completed",
};

export default function CampaignDetailPage() {
  const [match, params] = useRoute("/campaigns/:id");
  const [, navigate] = useLocation();
  const id = match ? Number(params?.id) : null;

  const { data: campaign, isLoading } = useCampaign(id);
  const { data: contents = [] } = useCampaignContents(id);
  const patchStatus = usePatchCampaignStatus();
  const deleteCampaign = useDeleteCampaign();
  const activateContent = useActivateCampaignContent();
  const { user } = useAuth();

  const role = user?.role ?? "";
  const canApprove = role === "admin" || role === "reviewer" || role === "executive";
  const canActivate = role === "admin" || role === "marketing_operator";

  const briefContents = contents.filter((c) => c.contentType === "campaign_brief");
  const copyContents = contents.filter((c) => c.contentType === "post_copy");

  function handleActivate(contentId: number) {
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

  if (isLoading || !campaign) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/campaigns")}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <h1 className="text-xl font-semibold flex-1">{campaign.campaignName}</h1>
        <Badge variant="outline">{STATUS_LABELS[campaign.status] ?? campaign.status}</Badge>
        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={handleDelete}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Details */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Goal</span>
            <span>{campaign.goal?.replace(/_/g, " ") ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Template</span>
            <span>{campaign.templateType?.replace(/_/g, " ") ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Regions</span>
            <span>{(campaign.targetRegions as string[] | null)?.join(", ") ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Clips</span>
            <span>{(campaign.clipIds as number[] | null)?.length ?? 0}</span>
          </div>
          {campaign.aiProviderUsed && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">AI Provider</span>
              <span>{campaign.aiProviderUsed}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Content */}
      {briefContents.length > 0 && (
        <AiOutputCard
          contentType="campaign_brief"
          contents={briefContents}
          onActivate={handleActivate}
          onEdit={handleEdit}
        />
      )}

      {copyContents.length > 0 && (
        <AiOutputCard
          contentType="post_copy"
          contents={copyContents}
          onActivate={handleActivate}
          onEdit={handleEdit}
        />
      )}

      {/* Approval workflow */}
      <div className="flex gap-2 pt-2">
        {campaign.status === "draft" || campaign.status === "ai_generated" ? (
          <Button
            onClick={() => patchStatus.mutate({ id: campaign.id, status: "awaiting_approval" })}
            disabled={patchStatus.isPending}
          >
            Submit for Approval
          </Button>
        ) : null}

        {canApprove && campaign.status === "awaiting_approval" ? (
          <Button
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={() => patchStatus.mutate({ id: campaign.id, status: "approved" })}
            disabled={patchStatus.isPending}
          >
            Approve
          </Button>
        ) : null}

        {canActivate && campaign.status === "approved" ? (
          <Button
            onClick={() => patchStatus.mutate({ id: campaign.id, status: "active" })}
            disabled={patchStatus.isPending}
          >
            Activate
          </Button>
        ) : null}

        {canActivate && campaign.status === "active" ? (
          <Button
            variant="outline"
            onClick={() => patchStatus.mutate({ id: campaign.id, status: "completed" })}
            disabled={patchStatus.isPending}
          >
            Mark Complete
          </Button>
        ) : null}
      </div>
    </div>
  );
}

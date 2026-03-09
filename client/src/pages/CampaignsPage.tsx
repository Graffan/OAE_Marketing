import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, ChevronRight } from "lucide-react";
import { useCampaigns, useDeleteCampaign } from "@/hooks/useCampaigns";
import CampaignWizard from "@/components/campaigns/CampaignWizard";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  ai_generated: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  awaiting_approval: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  active: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  completed: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  ai_generated: "AI Generated",
  awaiting_approval: "Awaiting Approval",
  approved: "Approved",
  active: "Active",
  completed: "Completed",
};

export default function CampaignsPage() {
  const [, navigate] = useLocation();
  const [showWizard, setShowWizard] = useState(false);
  const { data: campaigns = [], isLoading } = useCampaigns();
  const deleteCampaign = useDeleteCampaign();

  if (showWizard) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={() => setShowWizard(false)}>← Back</Button>
          <h1 className="text-xl font-semibold">New Campaign</h1>
        </div>
        <CampaignWizard />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Campaigns</h1>
        <Button onClick={() => setShowWizard(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Campaign
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-muted-foreground mb-4">No campaigns yet.</p>
          <Button onClick={() => setShowWizard(true)}>Create your first campaign</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => (
            <Card
              key={c.id}
              className="cursor-pointer hover:border-border/80 transition-colors"
              onClick={() => navigate(`/campaigns/${c.id}`)}
            >
              <CardHeader className="pb-2 pt-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-medium">{c.campaignName}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge className={STATUS_COLORS[c.status] ?? ""}>
                      {STATUS_LABELS[c.status] ?? c.status}
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {c.goal && <span>Goal: {c.goal.replace(/_/g, " ")}</span>}
                  {c.templateType && <span>Template: {c.templateType.replace(/_/g, " ")}</span>}
                  {Array.isArray(c.targetRegions) && c.targetRegions.length > 0 && (
                    <span>{(c.targetRegions as string[]).join(", ")}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

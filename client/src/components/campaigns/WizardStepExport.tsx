import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Download } from "lucide-react";
import { useSmartLinks } from "@/hooks/useSmartLinks";
import { useAuth } from "@/hooks/useAuth";
import type { Campaign, CampaignContent } from "@shared/schema";

interface WizardStepExportProps {
  campaign: Campaign;
  titleId: number;
  briefContents: CampaignContent[];
  copyContents: CampaignContent[];
  smartLinkId: number | null;
  onSmartLinkChange: (id: number | null) => void;
  onSubmit: () => void;
  onApprove: () => void;
  onBack: () => void;
}

export default function WizardStepExport({
  campaign,
  titleId,
  briefContents,
  copyContents,
  smartLinkId,
  onSmartLinkChange,
  onSubmit,
  onApprove,
  onBack,
}: WizardStepExportProps) {
  const { data: smartLinks = [] } = useSmartLinks(titleId);
  const { user } = useAuth();

  const activeBrief = briefContents.find((c) => c.isActive) ?? briefContents[0];
  const activeCopy = copyContents.find((c) => c.isActive) ?? copyContents[0];

  function handleDownload() {
    const payload = {
      campaign,
      brief: activeBrief?.body ?? null,
      copy: activeCopy?.body ?? null,
      smartLink: smartLinks.find((sl) => sl.id === smartLinkId) ?? null,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `campaign-${campaign.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const role = user?.role ?? "";
  const canApprove = role === "admin" || role === "reviewer" || role === "executive";
  const canSubmit = role !== "executive";

  const statusLabel: Record<string, string> = {
    draft: "Draft",
    ai_generated: "AI Generated",
    awaiting_approval: "Awaiting Approval",
    approved: "Approved",
    active: "Active",
    completed: "Completed",
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">Status</span>
        <Badge variant="outline">{statusLabel[campaign.status] ?? campaign.status}</Badge>
      </div>

      {smartLinks.length > 0 && (
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Smart Link</label>
          <Select
            value={smartLinkId ? String(smartLinkId) : "none"}
            onValueChange={(v) => onSmartLinkChange(v === "none" ? null : Number(v))}
          >
            <SelectTrigger>
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {smartLinks.map((sl) => (
                <SelectItem key={sl.id} value={String(sl.id)}>
                  {sl.slug}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2 rounded-lg border p-4 text-sm">
        <div className="font-medium mb-2">Summary</div>
        <div className="flex justify-between text-muted-foreground">
          <span>Campaign</span>
          <span className="font-medium text-foreground">{campaign.campaignName}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Goal</span>
          <span className="font-medium text-foreground">{campaign.goal ?? "—"}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Regions</span>
          <span className="font-medium text-foreground">
            {(campaign.targetRegions as string[] | null)?.join(", ") ?? "—"}
          </span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Brief</span>
          <span>{activeBrief ? "✓" : "—"}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Post Copy</span>
          <span>{activeCopy ? "✓" : "—"}</span>
        </div>
      </div>

      <Button variant="outline" className="w-full" onClick={handleDownload}>
        <Download className="h-4 w-4 mr-2" />
        Download JSON
      </Button>

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <div className="flex gap-2">
          {canSubmit && campaign.status === "draft" || campaign.status === "ai_generated" ? (
            <Button onClick={onSubmit}>Submit for Approval</Button>
          ) : null}
          {canApprove && campaign.status === "awaiting_approval" ? (
            <Button onClick={onApprove} className="bg-emerald-600 hover:bg-emerald-700">Approve</Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

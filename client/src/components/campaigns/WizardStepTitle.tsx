import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { fetchJSON } from "@/lib/queryClient";
import type { Title } from "@shared/schema";

const TEMPLATE_TYPES = [
  { value: "new_title_launch", label: "New Title Launch" },
  { value: "trailer_release", label: "Trailer Release" },
  { value: "watch_now", label: "Watch Now" },
  { value: "seasonal", label: "Seasonal" },
  { value: "catalog_revival", label: "Catalog Revival" },
];

interface WizardStepTitleProps {
  defaultTitleId?: number;
  defaultCampaignName?: string;
  defaultTemplateType?: string;
  onNext: (data: { titleId: number; campaignName: string; templateType: string }) => void;
}

export default function WizardStepTitle({ defaultTitleId, defaultCampaignName, defaultTemplateType, onNext }: WizardStepTitleProps) {
  const [titleId, setTitleId] = useState<number | null>(defaultTitleId ?? null);
  const [campaignName, setCampaignName] = useState(defaultCampaignName ?? "");
  const [templateType, setTemplateType] = useState(defaultTemplateType ?? "");

  const { data: titles = [] } = useQuery<Title[]>({
    queryKey: ["/api/titles"],
    queryFn: () => fetchJSON("/api/titles"),
  });

  const canProceed = titleId !== null && campaignName.trim() && templateType;

  return (
    <div className="space-y-5">
      <div>
        <Label>Title</Label>
        <Select value={titleId?.toString() ?? ""} onValueChange={(v) => setTitleId(parseInt(v))}>
          <SelectTrigger className="mt-1.5">
            <SelectValue placeholder="Select a title..." />
          </SelectTrigger>
          <SelectContent>
            {titles.map((t) => (
              <SelectItem key={t.id} value={t.id.toString()}>{t.titleName}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Campaign Name</Label>
        <Input
          className="mt-1.5"
          placeholder="e.g. Spring 2026 — US Launch"
          value={campaignName}
          onChange={(e) => setCampaignName(e.target.value)}
        />
      </div>

      <div>
        <Label>Template Type</Label>
        <Select value={templateType} onValueChange={setTemplateType}>
          <SelectTrigger className="mt-1.5">
            <SelectValue placeholder="Select template..." />
          </SelectTrigger>
          <SelectContent>
            {TEMPLATE_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end pt-2">
        <Button
          disabled={!canProceed}
          onClick={() => onNext({ titleId: titleId!, campaignName: campaignName.trim(), templateType })}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

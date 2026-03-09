import { useState } from "react";
import { useLocation } from "wouter";
import {
  useCreateCampaign,
  useUpdateCampaign,
  useCampaign,
  useCampaignContents,
  usePatchCampaignStatus,
  useGenerateCampaignContent,
  useActivateCampaignContent,
} from "@/hooks/useCampaigns";
import { apiRequest } from "@/lib/queryClient";
import WizardStepTitle from "./WizardStepTitle";
import WizardStepGoal from "./WizardStepGoal";
import WizardStepRegions from "./WizardStepRegions";
import WizardStepClips from "./WizardStepClips";
import WizardStepAI from "./WizardStepAI";
import WizardStepExport from "./WizardStepExport";

const STEP_LABELS = ["Title", "Goal", "Regions", "Clips", "AI Copy", "Review"];

interface CampaignWizardProps {
  initialCampaignId?: number;
}

export default function CampaignWizard({ initialCampaignId }: CampaignWizardProps) {
  const [, navigate] = useLocation();
  const [step, setStep] = useState(initialCampaignId ? 1 : 0);
  const [campaignId, setCampaignId] = useState<number | null>(initialCampaignId ?? null);

  const { data: campaign } = useCampaign(campaignId);
  const { data: contents = [] } = useCampaignContents(campaignId);

  const createCampaign = useCreateCampaign();
  const updateCampaign = useUpdateCampaign();
  const patchStatus = usePatchCampaignStatus();
  const generateContent = useGenerateCampaignContent();
  const activateContent = useActivateCampaignContent();

  const briefContents = contents.filter((c) => c.contentType === "campaign_brief");
  const copyContents = contents.filter((c) => c.contentType === "post_copy");

  // Step 0: Title / Campaign Name
  function handleTitleNext(data: { titleId: number; campaignName: string; templateType: string }) {
    createCampaign.mutate(
      { titleId: data.titleId, campaignName: data.campaignName, templateType: data.templateType },
      {
        onSuccess: (created) => {
          setCampaignId(created.id);
          setStep(1);
        },
      }
    );
  }

  // Step 1: Goal
  function handleGoalNext(goal: string) {
    if (!campaignId) return;
    updateCampaign.mutate({ id: campaignId, data: { goal } }, { onSuccess: () => setStep(2) });
  }

  // Step 2: Regions
  function handleRegionsNext(targetRegions: string[]) {
    if (!campaignId) return;
    updateCampaign.mutate({ id: campaignId, data: { targetRegions } }, { onSuccess: () => setStep(3) });
  }

  // Step 3: Clips
  function handleClipsNext(clipIds: number[]) {
    if (!campaignId) return;
    updateCampaign.mutate({ id: campaignId, data: { clipIds } }, { onSuccess: () => setStep(4) });
  }

  // Step 4: AI — manual paste save
  function handleSaveManual(task: string, text: string) {
    if (!campaignId) return;
    apiRequest("POST", `/api/campaigns/${campaignId}/contents`, {
      contentType: task,
      body: text,
      source: "manual",
      version: 1,
      isActive: true,
    }).catch(() => {});
  }

  // Step 4: activate a content version
  function handleActivate(task: string, contentId: number) {
    if (!campaignId) return;
    activateContent.mutate({ campaignId, contentId });
  }

  // Step 4: inline edit save
  function handleEdit(contentId: number, body: string) {
    if (!campaignId) return;
    apiRequest("PATCH", `/api/campaigns/${campaignId}/contents/${contentId}`, { body }).catch(() => {});
  }

  // Step 5: smart link
  function handleSmartLinkChange(id: number | null) {
    if (!campaignId) return;
    updateCampaign.mutate({ id: campaignId, data: { smartLinkId: id } });
  }

  function handleSubmit() {
    if (!campaignId) return;
    patchStatus.mutate(
      { id: campaignId, status: "awaiting_approval" },
      { onSuccess: () => navigate("/campaigns") }
    );
  }

  function handleApprove() {
    if (!campaignId) return;
    patchStatus.mutate(
      { id: campaignId, status: "approved" },
      { onSuccess: () => navigate("/campaigns") }
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          {STEP_LABELS.map((label, i) => (
            <span
              key={label}
              className={i === step ? "font-semibold text-foreground" : i < step ? "text-rose-500" : ""}
            >
              {label}
            </span>
          ))}
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-rose-500 transition-all duration-300"
            style={{ width: `${((step + 1) / STEP_LABELS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      {step === 0 && (
        <WizardStepTitle
          defaultTitleId={campaign?.titleId}
          defaultCampaignName={campaign?.campaignName}
          defaultTemplateType={campaign?.templateType ?? undefined}
          onNext={handleTitleNext}
        />
      )}

      {step === 1 && campaignId && (
        <WizardStepGoal
          defaultGoal={campaign?.goal ?? undefined}
          onBack={() => setStep(0)}
          onNext={handleGoalNext}
        />
      )}

      {step === 2 && campaign && (
        <WizardStepRegions
          titleId={campaign.titleId}
          defaultRegions={(campaign.targetRegions as string[] | null) ?? undefined}
          onBack={() => setStep(1)}
          onNext={handleRegionsNext}
        />
      )}

      {step === 3 && campaign && (
        <WizardStepClips
          titleId={campaign.titleId}
          defaultClipIds={(campaign.clipIds as number[] | null) ?? undefined}
          onBack={() => setStep(2)}
          onNext={handleClipsNext}
        />
      )}

      {step === 4 && campaign && campaignId && (
        <WizardStepAI
          campaignId={campaignId}
          titleId={campaign.titleId}
          goal={campaign.goal ?? ""}
          regions={(campaign.targetRegions as string[] | null) ?? []}
          clipIds={(campaign.clipIds as number[] | null) ?? []}
          briefContents={briefContents}
          copyContents={copyContents}
          onActivate={handleActivate}
          onEdit={handleEdit}
          onSaveManual={handleSaveManual}
          onBack={() => setStep(3)}
          onNext={() => setStep(5)}
        />
      )}

      {step === 5 && campaign && campaignId && (
        <WizardStepExport
          campaign={campaign}
          titleId={campaign.titleId}
          briefContents={briefContents}
          copyContents={copyContents}
          smartLinkId={campaign.smartLinkId ?? null}
          onSmartLinkChange={handleSmartLinkChange}
          onSubmit={handleSubmit}
          onApprove={handleApprove}
          onBack={() => setStep(4)}
        />
      )}
    </div>
  );
}

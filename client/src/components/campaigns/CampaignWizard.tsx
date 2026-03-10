import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
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

function getResumeStep(c: { goal?: string | null; targetRegions?: unknown } | undefined): number {
  if (!c) return 0;
  if (!c.goal) return 1;
  if (!c.targetRegions || (c.targetRegions as string[]).length === 0) return 2;
  return 3;
}

export default function CampaignWizard({ initialCampaignId }: CampaignWizardProps) {
  const [, navigate] = useLocation();
  const [campaignId, setCampaignId] = useState<number | null>(initialCampaignId ?? null);
  const [step, setStep] = useState(0);
  const [stepInitialized, setStepInitialized] = useState(!initialCampaignId);

  const { data: campaign } = useCampaign(campaignId);
  const { data: contents = [] } = useCampaignContents(campaignId);

  const createCampaign = useCreateCampaign();
  const updateCampaign = useUpdateCampaign();
  const patchStatus = usePatchCampaignStatus();
  const generateContent = useGenerateCampaignContent();
  const activateContent = useActivateCampaignContent();

  // When resuming a draft, jump to the furthest incomplete step once data loads
  useEffect(() => {
    if (!stepInitialized && campaign) {
      setStep(getResumeStep(campaign));
      setStepInitialized(true);
    }
  }, [campaign, stepInitialized]);

  const briefContents = contents.filter((c) => c.contentType === "campaign_brief");
  const copyContents = contents.filter((c) => c.contentType === "post_copy");

  // Step 0: Title / Campaign Name — creates or updates depending on whether campaignId exists
  function handleTitleNext(data: { titleId: number; campaignName: string; templateType: string }) {
    if (campaignId) {
      updateCampaign.mutate({ id: campaignId, data }, { onSuccess: () => setStep(1) });
    } else {
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
  }

  function handleGoalNext(goal: string) {
    if (!campaignId) return;
    updateCampaign.mutate({ id: campaignId, data: { goal } }, { onSuccess: () => setStep(2) });
  }

  function handleRegionsNext(targetRegions: string[]) {
    if (!campaignId) return;
    updateCampaign.mutate({ id: campaignId, data: { targetRegions } }, { onSuccess: () => setStep(3) });
  }

  function handleClipsNext(clipIds: number[]) {
    if (!campaignId) return;
    updateCampaign.mutate({ id: campaignId, data: { clipIds } }, { onSuccess: () => setStep(4) });
  }

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

  function handleActivate(task: string, contentId: number) {
    if (!campaignId) return;
    activateContent.mutate({ campaignId, contentId });
  }

  function handleEdit(contentId: number, body: string) {
    if (!campaignId) return;
    apiRequest("PATCH", `/api/campaigns/${campaignId}/contents/${contentId}`, { body }).catch(() => {});
  }

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

  // Steps before the campaign is created are locked; once created all are accessible
  function canJumpToStep(i: number): boolean {
    if (i === 0) return true;
    return campaignId !== null;
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Progress — clickable once campaign exists */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          {STEP_LABELS.map((label, i) => {
            const isActive = i === step;
            const isDone = i < step;
            const canJump = canJumpToStep(i);
            return (
              <button
                key={label}
                disabled={!canJump}
                onClick={() => canJump && setStep(i)}
                className={cn(
                  "transition-colors",
                  isActive && "font-semibold text-foreground",
                  isDone && "text-rose-500",
                  !isActive && !isDone && "text-muted-foreground",
                  canJump && !isActive && "hover:text-foreground cursor-pointer",
                  !canJump && "cursor-default"
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-rose-500 transition-all duration-300"
            style={{ width: `${((step + 1) / STEP_LABELS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Loading state while campaign data is fetching on resume */}
      {initialCampaignId && !stepInitialized && (
        <div className="py-12 text-center text-sm text-muted-foreground">Loading campaign…</div>
      )}

      {stepInitialized && (
        <>
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
        </>
      )}
    </div>
  );
}

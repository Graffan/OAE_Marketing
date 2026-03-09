import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles } from "lucide-react";
import { useGenerateCampaignContent } from "@/hooks/useCampaigns";
import type { GenerateResult } from "@/hooks/useCampaigns";
import ManualPasteModal from "@/components/ai/ManualPasteModal";
import AiOutputCard from "@/components/ai/AiOutputCard";
import type { CampaignContent } from "@shared/schema";

const PROVIDERS = [
  { value: "auto", label: "Auto (best available)" },
  { value: "claude", label: "Claude (Anthropic)" },
  { value: "openai", label: "OpenAI" },
  { value: "deepseek", label: "DeepSeek" },
];

interface WizardStepAIProps {
  campaignId: number;
  titleId: number;
  goal: string;
  regions: string[];
  clipIds: number[];
  briefContents: CampaignContent[];
  copyContents: CampaignContent[];
  onActivate: (task: string, contentId: number) => void;
  onEdit: (contentId: number, body: string) => void;
  onSaveManual: (task: string, text: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export default function WizardStepAI({
  campaignId,
  titleId,
  goal,
  regions,
  clipIds,
  briefContents,
  copyContents,
  onActivate,
  onEdit,
  onSaveManual,
  onBack,
  onNext,
}: WizardStepAIProps) {
  const [provider, setProvider] = useState("auto");
  const [manualModal, setManualModal] = useState<{ task: string; result: GenerateResult } | null>(null);
  const generate = useGenerateCampaignContent();

  const context = { titleId, goal, regions, clipIds };

  function handleGenerate(task: string) {
    generate.mutate(
      { task, campaignId, provider: provider === "auto" ? undefined : provider, context },
      {
        onSuccess: (result) => {
          if (result.manualMode) {
            setManualModal({ task, result });
          }
        },
      }
    );
  }

  const isGenerating = generate.isPending;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium whitespace-nowrap">AI Provider</label>
        <Select value={provider} onValueChange={setProvider}>
          <SelectTrigger className="flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PROVIDERS.map((p) => (
              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {briefContents.length > 0 && (
          <AiOutputCard
            contentType="campaign_brief"
            contents={briefContents}
            onActivate={(id) => onActivate("campaign_brief", id)}
            onEdit={onEdit}
          />
        )}

        <Button
          variant={briefContents.length > 0 ? "outline" : "default"}
          className="w-full"
          disabled={isGenerating}
          onClick={() => handleGenerate("campaign_brief")}
        >
          {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
          {briefContents.length > 0 ? "Regenerate Brief" : "Generate Campaign Brief"}
        </Button>

        {copyContents.length > 0 && (
          <AiOutputCard
            contentType="post_copy"
            contents={copyContents}
            onActivate={(id) => onActivate("post_copy", id)}
            onEdit={onEdit}
          />
        )}

        <Button
          variant={copyContents.length > 0 ? "outline" : "default"}
          className="w-full"
          disabled={isGenerating || briefContents.length === 0}
          onClick={() => handleGenerate("post_copy")}
        >
          {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
          {copyContents.length > 0 ? "Regenerate Post Copy" : "Generate Post Copy"}
        </Button>
        {briefContents.length === 0 && (
          <p className="text-xs text-muted-foreground text-center">Generate a brief first</p>
        )}
      </div>

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button onClick={onNext}>Next</Button>
      </div>

      {manualModal && (
        <ManualPasteModal
          open
          task={manualModal.task}
          promptText={manualModal.result.promptForUser ?? ""}
          systemPrompt={manualModal.result.systemPrompt ?? ""}
          onSave={(text) => onSaveManual(manualModal.task, text)}
          onClose={() => setManualModal(null)}
        />
      )}
    </div>
  );
}

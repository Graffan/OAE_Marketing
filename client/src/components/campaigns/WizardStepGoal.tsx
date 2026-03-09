import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const GOALS = [
  { value: "awareness", label: "Awareness", description: "Introduce the title to new audiences" },
  { value: "engagement", label: "Engagement", description: "Drive likes, comments, and shares" },
  { value: "trailer", label: "Trailer Push", description: "Maximize trailer views and click-throughs" },
  { value: "watch_now", label: "Watch Now", description: "Convert viewers to platform subscribers" },
];

interface WizardStepGoalProps {
  defaultGoal?: string;
  onBack: () => void;
  onNext: (goal: string) => void;
}

export default function WizardStepGoal({ defaultGoal, onBack, onNext }: WizardStepGoalProps) {
  const [selected, setSelected] = useState(defaultGoal ?? "");

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        {GOALS.map((g) => (
          <button
            key={g.value}
            onClick={() => setSelected(g.value)}
            className={cn(
              "p-4 rounded-xl border-2 text-left transition-all",
              selected === g.value
                ? "border-rose-500 bg-rose-500/5"
                : "border-border hover:border-border/80 hover:bg-muted/50"
            )}
          >
            <div className="font-medium text-sm mb-1">{g.label}</div>
            <div className="text-xs text-muted-foreground">{g.description}</div>
          </button>
        ))}
      </div>

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button disabled={!selected} onClick={() => onNext(selected)}>Next</Button>
      </div>
    </div>
  );
}

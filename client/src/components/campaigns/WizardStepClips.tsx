import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useClips } from "@/hooks/useClips";

interface WizardStepClipsProps {
  titleId: number;
  defaultClipIds?: number[];
  onBack: () => void;
  onNext: (clipIds: number[]) => void;
}

export default function WizardStepClips({ titleId, defaultClipIds, onBack, onNext }: WizardStepClipsProps) {
  const [selected, setSelected] = useState<Set<number>>(new Set(defaultClipIds ?? []));
  const { data: clips = [], isLoading } = useClips({ titleId, status: "approved" });

  function toggleClip(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  if (isLoading) {
    return <div className="py-8 text-center text-sm text-muted-foreground">Loading clips…</div>;
  }

  if (clips.length === 0) {
    return (
      <div className="space-y-5">
        <div className="rounded-lg border border-dashed p-6 text-center space-y-2">
          <p className="text-sm font-medium">No approved clips yet</p>
          <p className="text-xs text-muted-foreground">
            Clips can be attached to this campaign at any time — clipping often happens after release.
          </p>
        </div>
        <div className="flex justify-between pt-2">
          <Button variant="outline" onClick={onBack}>Back</Button>
          <Button onClick={() => onNext([])}>Next</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Optionally select clips to feature in this campaign. You can add more clips later.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
        {clips.map((clip) => {
          const checked = selected.has(clip.id);
          return (
            <label
              key={clip.id}
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                checked ? "border-rose-500 bg-rose-500/5" : "border-border hover:bg-muted/50"
              )}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggleClip(clip.id)}
                className="mt-0.5 accent-rose-500"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{clip.filename}</p>
                {clip.platformFit && clip.platformFit.length > 0 && (
                  <Badge variant="outline" className="text-[10px] mt-0.5">{clip.platformFit[0]}</Badge>
                )}
              </div>
            </label>
          );
        })}
      </div>

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button onClick={() => onNext(Array.from(selected))}>
          {selected.size === 0 ? "Skip for now" : "Next"}
        </Button>
      </div>
    </div>
  );
}

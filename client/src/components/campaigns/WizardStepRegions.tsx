import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { fetchJSON } from "@/lib/queryClient";

const ALL_REGIONS = [
  { value: "US", label: "United States" },
  { value: "CA", label: "Canada" },
  { value: "GB", label: "United Kingdom" },
  { value: "AU", label: "Australia" },
  { value: "DE", label: "Germany" },
  { value: "FR", label: "France" },
  { value: "JP", label: "Japan" },
  { value: "BR", label: "Brazil" },
  { value: "MX", label: "Mexico" },
];

interface WizardStepRegionsProps {
  titleId: number;
  defaultRegions?: string[];
  onBack: () => void;
  onNext: (regions: string[]) => void;
}

export default function WizardStepRegions({ titleId, defaultRegions, onBack, onNext }: WizardStepRegionsProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set(defaultRegions ?? []));
  const [linkedRegions, setLinkedRegions] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchJSON(`/api/destinations?titleId=${titleId}`)
      .then((data: unknown) => {
        const destinations = data as { region: string }[];
        setLinkedRegions(new Set(destinations.map((d) => d.region)));
      })
      .catch(() => {});
  }, [titleId]);

  function toggleRegion(value: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(ALL_REGIONS.map((r) => r.value)));
  }

  function clearAll() {
    setSelected(new Set());
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Select target regions for this campaign.</p>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" className="text-xs" onClick={selectAll}>All</Button>
          <Button size="sm" variant="ghost" className="text-xs" onClick={clearAll}>None</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {ALL_REGIONS.map((r) => {
          const checked = selected.has(r.value);
          const hasLink = linkedRegions.has(r.value);
          return (
            <label
              key={r.value}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                checked ? "border-rose-500 bg-rose-500/5" : "border-border hover:bg-muted/50"
              )}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggleRegion(r.value)}
                className="accent-rose-500"
              />
              <span className="text-sm flex-1">{r.label}</span>
              {hasLink && (
                <Badge variant="secondary" className="text-[10px] shrink-0">watch link</Badge>
              )}
            </label>
          );
        })}
      </div>

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button disabled={selected.size === 0} onClick={() => onNext(Array.from(selected))}>
          Next
        </Button>
      </div>
    </div>
  );
}

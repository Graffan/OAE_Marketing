import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useUpdateClip } from "@/hooks/useClips";
import type { Clip } from "@shared/schema";

interface ClipMetadataDialogProps {
  open: boolean;
  onClose: () => void;
  clip: Clip | null;
}

const STATUS_OPTIONS = [
  { value: "new", label: "New" },
  { value: "awaiting_review", label: "Awaiting Review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "archived", label: "Archived" },
];

const ORIENTATION_OPTIONS = [
  { value: "", label: "— Not set —" },
  { value: "horizontal", label: "Horizontal" },
  { value: "vertical", label: "Vertical" },
  { value: "square", label: "Square" },
];

const SPOILER_OPTIONS = [
  { value: "", label: "— Not set —" },
  { value: "none", label: "None" },
  { value: "mild", label: "Mild" },
  { value: "moderate", label: "Moderate" },
  { value: "heavy", label: "Heavy" },
];

const INTENSITY_OPTIONS = [
  { value: "", label: "— Not set —" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "extreme", label: "Extreme" },
];

type FormState = {
  status: string;
  orientation: string;
  hookType: string;
  theme: string;
  characterFocus: string;
  spoilerLevel: string;
  intensityLevel: string;
  platformFit: string;
  allowedRegions: string;
  restrictedRegions: string;
  embargoDate: string;
  distributorNotes: string;
};

function clipToForm(clip: Clip): FormState {
  return {
    status: clip.status ?? "new",
    orientation: clip.orientation ?? "",
    hookType: clip.hookType ?? "",
    theme: clip.theme ?? "",
    characterFocus: clip.characterFocus ?? "",
    spoilerLevel: clip.spoilerLevel ?? "",
    intensityLevel: clip.intensityLevel ?? "",
    platformFit: clip.platformFit?.join(", ") ?? "",
    allowedRegions: clip.allowedRegions?.join(", ") ?? "",
    restrictedRegions: clip.restrictedRegions?.join(", ") ?? "",
    embargoDate: clip.embargoDate ?? "",
    distributorNotes: clip.distributorNotes ?? "",
  };
}

function splitCSV(val: string): string[] {
  return val
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function ClipMetadataDialog({
  open,
  onClose,
  clip,
}: ClipMetadataDialogProps) {
  const updateClip = useUpdateClip();
  const [form, setForm] = useState<FormState>({
    status: "new",
    orientation: "",
    hookType: "",
    theme: "",
    characterFocus: "",
    spoilerLevel: "",
    intensityLevel: "",
    platformFit: "",
    allowedRegions: "",
    restrictedRegions: "",
    embargoDate: "",
    distributorNotes: "",
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (clip && open) {
      setForm(clipToForm(clip));
      setError(null);
    }
  }, [clip, open]);

  if (!open || !clip) return null;

  function set(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    if (!clip) return;
    setError(null);
    try {
      await updateClip.mutateAsync({
        id: clip.id,
        data: {
          status: form.status || undefined,
          orientation: form.orientation || null,
          hookType: form.hookType || null,
          theme: form.theme || null,
          characterFocus: form.characterFocus || null,
          spoilerLevel: form.spoilerLevel || null,
          intensityLevel: form.intensityLevel || null,
          platformFit: form.platformFit ? splitCSV(form.platformFit) : null,
          allowedRegions: form.allowedRegions ? splitCSV(form.allowedRegions) : null,
          restrictedRegions: form.restrictedRegions
            ? splitCSV(form.restrictedRegions)
            : null,
          embargoDate: form.embargoDate || null,
          distributorNotes: form.distributorNotes || null,
        },
      });
      onClose();
    } catch (err: any) {
      setError(err.message ?? "Failed to save");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-background rounded-2xl shadow-2xl border border-border w-full max-w-[500px] mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
          <div>
            <h2 className="text-sm font-semibold">Edit Clip Metadata</h2>
            <p className="text-xs text-muted-foreground truncate max-w-[340px]">
              {clip.filename}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Form */}
        <div className="px-6 py-4 space-y-4">
          {error && (
            <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* Status */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <select
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
                className="w-full text-sm rounded-lg border border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Orientation */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Orientation
              </label>
              <select
                value={form.orientation}
                onChange={(e) => set("orientation", e.target.value)}
                className="w-full text-sm rounded-lg border border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {ORIENTATION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Spoiler Level */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Spoiler Level
              </label>
              <select
                value={form.spoilerLevel}
                onChange={(e) => set("spoilerLevel", e.target.value)}
                className="w-full text-sm rounded-lg border border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {SPOILER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Intensity Level */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Intensity Level
              </label>
              <select
                value={form.intensityLevel}
                onChange={(e) => set("intensityLevel", e.target.value)}
                className="w-full text-sm rounded-lg border border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {INTENSITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Hook Type */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Hook Type</label>
            <input
              type="text"
              value={form.hookType}
              onChange={(e) => set("hookType", e.target.value)}
              placeholder="e.g. action_open, dialogue_hook"
              className="w-full text-sm rounded-lg border border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Theme */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Theme</label>
            <input
              type="text"
              value={form.theme}
              onChange={(e) => set("theme", e.target.value)}
              placeholder="e.g. thriller, romance, comedy"
              className="w-full text-sm rounded-lg border border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Character Focus */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Character Focus
            </label>
            <input
              type="text"
              value={form.characterFocus}
              onChange={(e) => set("characterFocus", e.target.value)}
              placeholder="e.g. protagonist, ensemble"
              className="w-full text-sm rounded-lg border border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Platform Fit */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Platform Fit
              <span className="ml-1 text-muted-foreground/60">(comma-separated)</span>
            </label>
            <input
              type="text"
              value={form.platformFit}
              onChange={(e) => set("platformFit", e.target.value)}
              placeholder="tiktok, instagram, youtube"
              className="w-full text-sm rounded-lg border border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Allowed Regions */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Allowed Regions
              <span className="ml-1 text-muted-foreground/60">(comma-separated, blank = all)</span>
            </label>
            <input
              type="text"
              value={form.allowedRegions}
              onChange={(e) => set("allowedRegions", e.target.value)}
              placeholder="US, CA, GB"
              className="w-full text-sm rounded-lg border border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Restricted Regions */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Restricted Regions
              <span className="ml-1 text-muted-foreground/60">(comma-separated)</span>
            </label>
            <input
              type="text"
              value={form.restrictedRegions}
              onChange={(e) => set("restrictedRegions", e.target.value)}
              placeholder="CN, RU"
              className="w-full text-sm rounded-lg border border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Embargo Date */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Embargo Date
            </label>
            <input
              type="date"
              value={form.embargoDate}
              onChange={(e) => set("embargoDate", e.target.value)}
              className="w-full text-sm rounded-lg border border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Distributor Notes */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Distributor Notes
            </label>
            <textarea
              value={form.distributorNotes}
              onChange={(e) => set("distributorNotes", e.target.value)}
              rows={3}
              placeholder="Internal notes for distributors..."
              className="w-full text-sm rounded-lg border border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border/50">
          <button
            onClick={onClose}
            className="text-sm px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={updateClip.isPending}
            className="text-sm px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-medium disabled:opacity-50 transition-colors"
          >
            {updateClip.isPending ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

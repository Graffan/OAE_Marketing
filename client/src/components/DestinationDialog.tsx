import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateDestination, useUpdateDestination } from "@/hooks/useDestinations";
import { useTitles } from "@/hooks/useTitles";
import type { RegionalDestination } from "@shared/schema";

interface FormState {
  titleId: string;
  countryCode: string;
  regionName: string;
  platformName: string;
  platformType: string;
  destinationUrl: string;
  ctaLabel: string;
  language: string;
  startDate: string;
  endDate: string;
  campaignPriority: string;
  status: string;
  trackingParametersTemplate: string;
}

const defaultForm: FormState = {
  titleId: "",
  countryCode: "",
  regionName: "",
  platformName: "",
  platformType: "svod",
  destinationUrl: "",
  ctaLabel: "Watch Now",
  language: "en",
  startDate: "",
  endDate: "",
  campaignPriority: "0",
  status: "active",
  trackingParametersTemplate: "",
};

function destinationToForm(d: RegionalDestination): FormState {
  return {
    titleId: d.titleId != null ? String(d.titleId) : "",
    countryCode: d.countryCode ?? "",
    regionName: d.regionName ?? "",
    platformName: d.platformName ?? "",
    platformType: d.platformType ?? "svod",
    destinationUrl: d.destinationUrl ?? "",
    ctaLabel: d.ctaLabel ?? "Watch Now",
    language: d.language ?? "en",
    startDate: d.startDate ?? "",
    endDate: d.endDate ?? "",
    campaignPriority: d.campaignPriority != null ? String(d.campaignPriority) : "0",
    status: d.status ?? "active",
    trackingParametersTemplate: d.trackingParametersTemplate ?? "",
  };
}

interface DestinationDialogProps {
  open: boolean;
  onClose: () => void;
  editing?: RegionalDestination | null;
  defaultTitleId?: number;
}

export default function DestinationDialog({ open, onClose, editing, defaultTitleId }: DestinationDialogProps) {
  const isEdit = !!editing;
  const [form, setForm] = useState<FormState>(
    editing ? destinationToForm(editing) : defaultTitleId ? { ...defaultForm, titleId: String(defaultTitleId) } : defaultForm
  );
  const [error, setError] = useState<string | null>(null);

  const createDestination = useCreateDestination();
  const updateDestination = useUpdateDestination();
  const { data: titles } = useTitles();

  useEffect(() => {
    if (open) {
      if (editing) {
        setForm(destinationToForm(editing));
      } else {
        setForm(defaultTitleId ? { ...defaultForm, titleId: String(defaultTitleId) } : defaultForm);
      }
      setError(null);
    }
  }, [open, editing, defaultTitleId]);

  function handleField(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.countryCode || form.countryCode.length !== 2) {
      setError("Country code must be exactly 2 characters (e.g. US, GB)");
      return;
    }
    if (!form.platformName.trim()) {
      setError("Platform name is required");
      return;
    }
    if (!form.destinationUrl.trim()) {
      setError("Destination URL is required");
      return;
    }
    if (!form.titleId) {
      setError("Title is required");
      return;
    }

    const payload = {
      titleId: parseInt(form.titleId),
      countryCode: form.countryCode.toUpperCase(),
      regionName: form.regionName || null,
      platformName: form.platformName,
      platformType: form.platformType || null,
      destinationUrl: form.destinationUrl,
      ctaLabel: form.ctaLabel || null,
      language: form.language || null,
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      campaignPriority: form.campaignPriority ? parseInt(form.campaignPriority) : 0,
      status: form.status,
      trackingParametersTemplate: form.trackingParametersTemplate || null,
    };

    try {
      if (isEdit && editing) {
        await updateDestination.mutateAsync({ id: editing.id, data: payload });
      } else {
        await createDestination.mutateAsync(payload as Omit<RegionalDestination, "id" | "createdAt" | "updatedAt">);
      }
      onClose();
    } catch (err: any) {
      setError(err.message ?? "Failed to save destination");
    }
  }

  const isPending = createDestination.isPending || updateDestination.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Destination" : "Add Destination"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            {/* Row 1: Title (col-span-2) */}
            <div className="col-span-2 space-y-1">
              <Label htmlFor="titleId">
                Title <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.titleId}
                onValueChange={(v) => handleField("titleId", v)}
                disabled={isEdit}
              >
                <SelectTrigger id="titleId">
                  <SelectValue placeholder="Select a title..." />
                </SelectTrigger>
                <SelectContent>
                  {(titles ?? []).map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.titleName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Row 2: Country Code + Region Name */}
            <div className="space-y-1">
              <Label htmlFor="countryCode">
                Country Code <span className="text-destructive">*</span>
              </Label>
              <Input
                id="countryCode"
                value={form.countryCode}
                onChange={(e) => handleField("countryCode", e.target.value.toUpperCase().slice(0, 2))}
                placeholder="US"
                maxLength={2}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="regionName">Region Name</Label>
              <Input
                id="regionName"
                value={form.regionName}
                onChange={(e) => handleField("regionName", e.target.value)}
                placeholder="e.g. North America"
              />
            </div>

            {/* Row 3: Platform Name + Platform Type */}
            <div className="space-y-1">
              <Label htmlFor="platformName">
                Platform Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="platformName"
                value={form.platformName}
                onChange={(e) => handleField("platformName", e.target.value)}
                placeholder="e.g. Netflix"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="platformType">Platform Type</Label>
              <Select
                value={form.platformType}
                onValueChange={(v) => handleField("platformType", v)}
              >
                <SelectTrigger id="platformType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="svod">SVOD</SelectItem>
                  <SelectItem value="avod">AVOD</SelectItem>
                  <SelectItem value="tvod">TVOD</SelectItem>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="theatrical">Theatrical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Row 4: Destination URL (col-span-2) */}
            <div className="col-span-2 space-y-1">
              <Label htmlFor="destinationUrl">
                Destination URL <span className="text-destructive">*</span>
              </Label>
              <Input
                id="destinationUrl"
                type="url"
                value={form.destinationUrl}
                onChange={(e) => handleField("destinationUrl", e.target.value)}
                placeholder="https://www.netflix.com/title/..."
              />
            </div>

            {/* Row 5: CTA Label + Language */}
            <div className="space-y-1">
              <Label htmlFor="ctaLabel">CTA Label</Label>
              <Input
                id="ctaLabel"
                value={form.ctaLabel}
                onChange={(e) => handleField("ctaLabel", e.target.value)}
                placeholder="Watch Now"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="language">Language</Label>
              <Input
                id="language"
                value={form.language}
                onChange={(e) => handleField("language", e.target.value)}
                placeholder="en"
              />
            </div>

            {/* Row 6: Start Date + End Date */}
            <div className="space-y-1">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={form.startDate}
                onChange={(e) => handleField("startDate", e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={form.endDate}
                onChange={(e) => handleField("endDate", e.target.value)}
              />
            </div>

            {/* Row 7: Campaign Priority + Status */}
            <div className="space-y-1">
              <Label htmlFor="campaignPriority">Campaign Priority</Label>
              <Input
                id="campaignPriority"
                type="number"
                min={0}
                value={form.campaignPriority}
                onChange={(e) => handleField("campaignPriority", e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="status">Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => handleField("status", v)}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Row 8: Tracking Params Template (col-span-2) */}
            <div className="col-span-2 space-y-1">
              <Label htmlFor="trackingParametersTemplate">Tracking Parameters Template</Label>
              <Input
                id="trackingParametersTemplate"
                value={form.trackingParametersTemplate}
                onChange={(e) => handleField("trackingParametersTemplate", e.target.value)}
                placeholder="utm_source=oaemarketing&utm_medium=smart_link&utm_campaign={slug}"
              />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : isEdit ? "Save Changes" : "Add Destination"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

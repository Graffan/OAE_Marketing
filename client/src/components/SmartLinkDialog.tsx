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
import { useCreateSmartLink, useUpdateSmartLink } from "@/hooks/useSmartLinks";
import { useTitles } from "@/hooks/useTitles";
import type { SmartLink } from "@shared/schema";

interface FormState {
  titleId: string;
  slug: string;
  defaultUrl: string;
  trackingParamsTemplate: string;
  isActive: boolean;
}

const DEFAULT_TRACKING = "utm_source=oaemarketing&utm_medium=smart_link&utm_campaign={slug}";

const defaultForm: FormState = {
  titleId: "",
  slug: "",
  defaultUrl: "",
  trackingParamsTemplate: DEFAULT_TRACKING,
  isActive: true,
};

function linkToForm(link: SmartLink): FormState {
  return {
    titleId: link.titleId != null ? String(link.titleId) : "",
    slug: link.slug ?? "",
    defaultUrl: link.defaultUrl ?? "",
    trackingParamsTemplate: link.trackingParamsTemplate ?? DEFAULT_TRACKING,
    isActive: link.isActive ?? true,
  };
}

interface SmartLinkDialogProps {
  open: boolean;
  onClose: () => void;
  editing?: SmartLink | null;
}

export default function SmartLinkDialog({ open, onClose, editing }: SmartLinkDialogProps) {
  const isEdit = !!editing;
  const [form, setForm] = useState<FormState>(editing ? linkToForm(editing) : defaultForm);
  const [error, setError] = useState<string | null>(null);

  const createSmartLink = useCreateSmartLink();
  const updateSmartLink = useUpdateSmartLink();
  const { data: titles } = useTitles();

  useEffect(() => {
    if (open) {
      setForm(editing ? linkToForm(editing) : defaultForm);
      setError(null);
    }
  }, [open, editing]);

  function handleField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleGenerateSlug() {
    setForm((prev) => ({ ...prev, slug: Math.random().toString(36).slice(2, 10) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.defaultUrl.trim()) {
      setError("Default URL is required");
      return;
    }

    const payload = {
      titleId: form.titleId ? parseInt(form.titleId) : null,
      slug: form.slug.trim() || undefined,
      defaultUrl: form.defaultUrl.trim(),
      trackingParamsTemplate: form.trackingParamsTemplate.trim() || null,
      isActive: form.isActive,
    };

    try {
      if (isEdit && editing) {
        const { slug: _s, titleId: _t, ...updatable } = payload;
        await updateSmartLink.mutateAsync({ id: editing.id, data: updatable });
      } else {
        await createSmartLink.mutateAsync(payload as any);
      }
      onClose();
    } catch (err: any) {
      setError(err.message ?? "Failed to save smart link");
    }
  }

  const isPending = createSmartLink.isPending || updateSmartLink.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Smart Link" : "Create Smart Link"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            {/* Row 1: Title (col-span-2) */}
            <div className="col-span-2 space-y-1">
              <Label htmlFor="sl-titleId">Title</Label>
              <Select
                value={form.titleId}
                onValueChange={(v) => handleField("titleId", v)}
                disabled={isEdit}
              >
                <SelectTrigger id="sl-titleId">
                  <SelectValue placeholder="Select a title (optional)..." />
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

            {/* Row 2: Slug + isActive */}
            <div className="space-y-1">
              <Label htmlFor="sl-slug">Slug</Label>
              {isEdit ? (
                <div className="flex items-center h-9 px-3 rounded-md border border-input bg-muted text-sm text-muted-foreground font-mono">
                  {form.slug}
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    id="sl-slug"
                    value={form.slug}
                    onChange={(e) => handleField("slug", e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20))}
                    placeholder="Auto-generated if blank"
                    className="font-mono"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateSlug}
                    className="whitespace-nowrap"
                  >
                    Generate
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-1 flex flex-col justify-end">
              <Label htmlFor="sl-isActive" className="text-sm font-medium">Active</Label>
              <div className="flex items-center h-9">
                <input
                  id="sl-isActive"
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => handleField("isActive", e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                />
                <label htmlFor="sl-isActive" className="ml-2 text-sm text-muted-foreground">
                  {form.isActive ? "Link is active" : "Link is inactive"}
                </label>
              </div>
            </div>

            {/* Row 3: Default URL (col-span-2) */}
            <div className="col-span-2 space-y-1">
              <Label htmlFor="sl-defaultUrl">
                Default URL <span className="text-destructive">*</span>
              </Label>
              <Input
                id="sl-defaultUrl"
                type="url"
                value={form.defaultUrl}
                onChange={(e) => handleField("defaultUrl", e.target.value)}
                placeholder="https://www.example.com/watch"
                required
              />
            </div>

            {/* Row 4: Tracking Params Template (col-span-2) */}
            <div className="col-span-2 space-y-1">
              <Label htmlFor="sl-trackingParams">Tracking Params Template</Label>
              <Input
                id="sl-trackingParams"
                value={form.trackingParamsTemplate}
                onChange={(e) => handleField("trackingParamsTemplate", e.target.value)}
                placeholder={DEFAULT_TRACKING}
              />
              <p className="text-xs text-muted-foreground">
                Use {"{slug}"} as a placeholder — it will be replaced with the actual slug at redirect time.
              </p>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : isEdit ? "Save Changes" : "Create Smart Link"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

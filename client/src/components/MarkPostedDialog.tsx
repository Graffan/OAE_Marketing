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
import { useMarkPosted, useDuplicateWarning } from "@/hooks/useClipPosts";
import { useSmartLinks } from "@/hooks/useSmartLinks";
import { DuplicateWarningBanner } from "./DuplicateWarningBanner";
import type { Clip } from "@shared/schema";

const PLATFORMS = [
  "Instagram",
  "TikTok",
  "YouTube",
  "Facebook",
  "Twitter/X",
  "LinkedIn",
  "Snapchat",
  "Other",
];

interface Props {
  clip: Clip;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MarkPostedDialog({ clip, open, onOpenChange }: Props) {
  const markPosted = useMarkPosted();
  const { data: smartLinks } = useSmartLinks(clip.titleId ?? undefined);

  const [platform, setPlatform] = useState("");
  const [region, setRegion] = useState("");
  const [caption, setCaption] = useState("");
  const [cta, setCta] = useState("");
  const [smartLinkId, setSmartLinkId] = useState<string>("");
  const [postedAt, setPostedAt] = useState(new Date().toISOString().slice(0, 16));
  const [error, setError] = useState<string | null>(null);

  const { data: warning } = useDuplicateWarning(
    open ? clip.id : null,
    platform,
    region
  );

  useEffect(() => {
    if (!open) {
      setPlatform("");
      setRegion("");
      setCaption("");
      setCta("");
      setSmartLinkId("");
      setPostedAt(new Date().toISOString().slice(0, 16));
      setError(null);
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    try {
      await markPosted.mutateAsync({
        clipId: clip.id,
        platform,
        region,
        caption: caption || undefined,
        cta: cta || undefined,
        smartLinkId: smartLinkId ? parseInt(smartLinkId) : undefined,
        postedAt: new Date(postedAt).toISOString(),
      });
      onOpenChange(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to mark as posted");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Mark as Posted</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label>Platform *</Label>
            <Select value={platform} onValueChange={setPlatform} required>
              <SelectTrigger>
                <SelectValue placeholder="Select platform" />
              </SelectTrigger>
              <SelectContent>
                {PLATFORMS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Region *</Label>
            <Input
              value={region}
              onChange={(e) => setRegion(e.target.value.toUpperCase())}
              placeholder="e.g. US, GB, AU"
              required
            />
          </div>

          {warning !== undefined && (
            <DuplicateWarningBanner warning={warning} />
          )}

          <div className="space-y-1">
            <Label>Caption</Label>
            <Input
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Caption used for this post"
            />
          </div>

          <div className="space-y-1">
            <Label>CTA</Label>
            <Input
              value={cta}
              onChange={(e) => setCta(e.target.value)}
              placeholder="Call to action text"
            />
          </div>

          {smartLinks && smartLinks.length > 0 && (
            <div className="space-y-1">
              <Label>Smart Link</Label>
              <Select value={smartLinkId} onValueChange={setSmartLinkId}>
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {smartLinks.map((sl) => (
                    <SelectItem key={sl.id} value={String(sl.id)}>
                      /{sl.slug}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1">
            <Label>Posted At</Label>
            <Input
              type="datetime-local"
              value={postedAt}
              onChange={(e) => setPostedAt(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!platform || !region || markPosted.isPending}>
              {markPosted.isPending ? "Saving..." : "Mark as Posted"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

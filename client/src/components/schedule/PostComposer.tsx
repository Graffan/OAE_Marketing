import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useActiveSocialConnections } from "@/hooks/useSocialConnections";
import { useCreateScheduledPost } from "@/hooks/useScheduledPosts";
import { useCampaigns } from "@/hooks/useCampaigns";
import { Instagram, Twitter, Youtube, Music2, Send, Calendar } from "lucide-react";

const PLATFORM_META: Record<string, { label: string; icon: React.ElementType; color: string; maxChars: number }> = {
  instagram: { label: "Instagram", icon: Instagram, color: "text-pink-500", maxChars: 2200 },
  tiktok: { label: "TikTok", icon: Music2, color: "text-cyan-500", maxChars: 2200 },
  twitter: { label: "X / Twitter", icon: Twitter, color: "text-sky-500", maxChars: 280 },
  youtube: { label: "YouTube", icon: Youtube, color: "text-red-500", maxChars: 5000 },
};

interface PostComposerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: string;
}

export default function PostComposer({ open, onOpenChange, defaultDate }: PostComposerProps) {
  const { data: connections = [] } = useActiveSocialConnections();
  const { data: campaigns = [] } = useCampaigns();
  const createPost = useCreateScheduledPost();

  const [connectionId, setConnectionId] = useState<string>("");
  const [campaignId, setCampaignId] = useState<string>("");
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [cta, setCta] = useState("");
  const [scheduledAt, setScheduledAt] = useState(defaultDate ?? "");
  const [asDraft, setAsDraft] = useState(false);

  const selectedConnection = (connections as any[]).find(
    (c: any) => String(c.id) === connectionId
  );
  const platform = selectedConnection?.platform ?? "";
  const meta = PLATFORM_META[platform];
  const charLimit = meta?.maxChars ?? 5000;
  const charsUsed = caption.length;
  const overLimit = charsUsed > charLimit;

  function reset() {
    setConnectionId("");
    setCampaignId("");
    setCaption("");
    setHashtags("");
    setCta("");
    setScheduledAt(defaultDate ?? "");
    setAsDraft(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!connectionId || !caption.trim()) return;

    await createPost.mutateAsync({
      socialConnectionId: Number(connectionId),
      campaignId: campaignId ? Number(campaignId) : null,
      platform,
      caption: caption.trim(),
      hashtags: hashtags
        .split(/[,\s]+/)
        .map((t) => t.replace(/^#/, "").trim())
        .filter(Boolean),
      cta: cta.trim() || null,
      scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
      status: asDraft ? "draft" : scheduledAt ? "scheduled" : "draft",
      createdByType: "human",
    });

    reset();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Compose Post</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          {/* Account selector */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Account
            </Label>
            <Select value={connectionId} onValueChange={setConnectionId}>
              <SelectTrigger>
                <SelectValue placeholder="Select social account..." />
              </SelectTrigger>
              <SelectContent>
                {(connections as any[]).map((c: any) => {
                  const pm = PLATFORM_META[c.platform];
                  const Icon = pm?.icon;
                  return (
                    <SelectItem key={c.id} value={String(c.id)}>
                      <span className="flex items-center gap-2">
                        {Icon && <Icon className={`h-3.5 w-3.5 ${pm.color}`} />}
                        <span>{c.accountName}</span>
                        <span className="text-muted-foreground text-xs">({pm?.label})</span>
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {(connections as any[]).length === 0 && (
              <p className="text-xs text-muted-foreground">
                No social accounts connected. Add accounts in Admin &gt; Social Connections.
              </p>
            )}
          </div>

          {/* Campaign (optional) */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Campaign <span className="text-muted-foreground/60">(optional)</span>
            </Label>
            <Select value={campaignId} onValueChange={setCampaignId}>
              <SelectTrigger>
                <SelectValue placeholder="No campaign" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No campaign</SelectItem>
                {(campaigns as any[]).map((c: any) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Caption */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Caption
              </Label>
              {platform && (
                <span className={`text-xs tabular-nums ${overLimit ? "text-red-500 font-medium" : "text-muted-foreground"}`}>
                  {charsUsed.toLocaleString()} / {charLimit.toLocaleString()}
                </span>
              )}
            </div>
            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write your post caption..."
              className="min-h-[120px] resize-y"
            />
          </div>

          {/* Hashtags */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Hashtags
            </Label>
            <Input
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
              placeholder="#oae #film #newrelease"
            />
            <p className="text-xs text-muted-foreground">
              Separate with spaces or commas
            </p>
          </div>

          {/* CTA */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Call to Action <span className="text-muted-foreground/60">(optional)</span>
            </Label>
            <Input
              value={cta}
              onChange={(e) => setCta(e.target.value)}
              placeholder="Watch now at watch.otheranimal.app/..."
            />
          </div>

          {/* Schedule datetime */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Schedule For
            </Label>
            <Input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Leave empty to save as draft
            </p>
          </div>

          {/* Platform preview badge */}
          {platform && meta && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border/50">
              <meta.icon className={`h-4 w-4 ${meta.color}`} />
              <span className="text-sm font-medium">{meta.label}</span>
              <Badge variant="outline" className="ml-auto text-xs">
                {selectedConnection?.accountName}
              </Badge>
            </div>
          )}

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setAsDraft(true);
                // Trigger form submit with draft flag
                const form = document.querySelector("form");
                form?.requestSubmit();
              }}
              disabled={!connectionId || !caption.trim() || createPost.isPending}
            >
              Save as Draft
            </Button>
            <Button
              type="submit"
              disabled={!connectionId || !caption.trim() || overLimit || createPost.isPending}
            >
              {createPost.isPending ? (
                <span className="flex items-center gap-2">
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Saving...
                </span>
              ) : scheduledAt ? (
                <span className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5" />
                  Schedule Post
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Send className="h-3.5 w-3.5" />
                  Create Post
                </span>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

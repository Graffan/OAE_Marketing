import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Edit2, Check, X } from "lucide-react";
import type { CampaignContent } from "@shared/schema";

interface AiOutputCardProps {
  contentType: string;
  contents: CampaignContent[];
  onActivate: (id: number) => void;
  onEdit: (id: number, body: string) => void;
}

function tryParseJson(body: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(body);
    if (typeof parsed === "object" && parsed !== null) return parsed as Record<string, unknown>;
    return null;
  } catch {
    return null;
  }
}

function JsonField({ label, value }: { label: string; value: unknown }) {
  if (value === undefined || value === null || value === "") return null;

  if (Array.isArray(value)) {
    return (
      <div className="space-y-1">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
        <div className="flex flex-wrap gap-1.5">
          {value.map((item, i) =>
            typeof item === "object" ? (
              <div key={i} className="w-full rounded-md bg-muted/50 px-3 py-2 text-xs">
                {Object.entries(item as Record<string, unknown>).map(([k, v]) => (
                  <div key={k}><span className="font-medium capitalize">{k}:</span> {String(v)}</div>
                ))}
              </div>
            ) : (
              <Badge key={i} variant="secondary" className="text-xs font-normal">{String(item)}</Badge>
            )
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-sm">{String(value)}</p>
    </div>
  );
}

// Human-readable label map for known field names
const FIELD_LABELS: Record<string, string> = {
  audienceAngle: "Audience Angle",
  hooks: "Hook Ideas",
  clipRationale: "Clip Selection Rationale",
  cta: "Call to Action",
  cadence: "Posting Cadence",
  summary: "Summary",
  headline: "Headline",
  captionShort: "Short Caption",
  captionLong: "Long Caption",
  hashtags: "Hashtags",
  activeWindows: "Active Windows",
  expiringDeals: "Expiring Deals",
  missingRegions: "Missing Regions",
  promotionalTiming: "Promotional Timing",
  recommendations: "Title Recommendations",
  seasonalInsight: "Seasonal Insight",
  text: "Content",
};

function StructuredOutput({ body }: { body: string }) {
  const json = tryParseJson(body);

  if (!json) {
    return <p className="text-sm whitespace-pre-wrap">{body}</p>;
  }

  return (
    <div className="space-y-4">
      {Object.entries(json).map(([key, value]) => (
        <JsonField key={key} label={FIELD_LABELS[key] ?? key} value={value} />
      ))}
    </div>
  );
}

export default function AiOutputCard({ contentType, contents, onActivate, onEdit }: AiOutputCardProps) {
  const [showHistory, setShowHistory] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editBody, setEditBody] = useState("");

  const active = contents.find((c) => c.isActive) ?? contents[0];
  const sorted = [...contents].sort((a, b) => b.version - a.version);

  function startEdit(c: CampaignContent) {
    setEditingId(c.id);
    setEditBody(c.body);
  }

  function saveEdit() {
    if (editingId !== null) {
      onEdit(editingId, editBody);
      setEditingId(null);
    }
  }

  if (!active) return null;

  return (
    <Card className="mb-3">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium capitalize">
            {contentType.replace(/_/g, " ")}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">{active.source}</Badge>
            {editingId !== active.id && (
              <Button size="sm" variant="ghost" onClick={() => startEdit(active)}>
                <Edit2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {editingId === active.id ? (
          <div className="space-y-2">
            <Textarea
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              className="min-h-[120px] text-sm font-mono"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={saveEdit}><Check className="h-3.5 w-3.5 mr-1" />Save</Button>
              <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}><X className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
        ) : (
          <StructuredOutput body={active.body} />
        )}

        {contents.length > 1 && (
          <div className="mt-3">
            <Button
              size="sm"
              variant="ghost"
              className="text-xs text-muted-foreground"
              onClick={() => setShowHistory(!showHistory)}
            >
              {showHistory ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
              {showHistory ? "Hide" : "Show"} history ({contents.length} versions)
            </Button>
            {showHistory && (
              <div className="mt-2 space-y-2 border-t pt-2">
                {sorted.map((c) => (
                  <div key={c.id} className="flex items-start gap-2 text-xs">
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="font-medium">v{c.version}</span>
                        <Badge variant="outline" className="text-[10px] py-0">{c.source}</Badge>
                        {c.isActive && <Badge className="text-[10px] py-0 bg-emerald-600">active</Badge>}
                      </div>
                      <StructuredOutput body={c.body} />
                    </div>
                    {!c.isActive && (
                      <Button size="sm" variant="outline" className="text-[11px] shrink-0" onClick={() => onActivate(c.id)}>
                        Activate
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

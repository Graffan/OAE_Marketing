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
            {editingId !== active.id ? (
              <Button size="sm" variant="ghost" onClick={() => startEdit(active)}>
                <Edit2 className="h-3.5 w-3.5" />
              </Button>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {editingId === active.id ? (
          <div className="space-y-2">
            <Textarea
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              className="min-h-[100px] text-sm"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={saveEdit}><Check className="h-3.5 w-3.5 mr-1" />Save</Button>
              <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}><X className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
        ) : (
          <p className="text-sm whitespace-pre-wrap">{active.body}</p>
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
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="font-medium">v{c.version}</span>
                        <Badge variant="outline" className="text-[10px] py-0">{c.source}</Badge>
                        {c.isActive && <Badge className="text-[10px] py-0 bg-emerald-600">active</Badge>}
                      </div>
                      <p className="text-muted-foreground line-clamp-2">{c.body}</p>
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

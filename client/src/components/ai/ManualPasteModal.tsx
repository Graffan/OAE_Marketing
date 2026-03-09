import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Check } from "lucide-react";

interface ManualPasteModalProps {
  open: boolean;
  promptText: string;
  systemPrompt: string;
  task: string;
  onSave: (text: string) => void;
  onClose: () => void;
}

export default function ManualPasteModal({
  open,
  promptText,
  systemPrompt,
  task,
  onSave,
  onClose,
}: ManualPasteModalProps) {
  const [pastedText, setPastedText] = useState("");
  const [copiedSystem, setCopiedSystem] = useState(false);
  const [copiedUser, setCopiedUser] = useState(false);

  function handleCopy(text: string, which: "system" | "user") {
    navigator.clipboard.writeText(text);
    if (which === "system") {
      setCopiedSystem(true);
      setTimeout(() => setCopiedSystem(false), 2000);
    } else {
      setCopiedUser(true);
      setTimeout(() => setCopiedUser(false), 2000);
    }
  }

  function handleSave() {
    if (pastedText.trim()) {
      onSave(pastedText.trim());
      setPastedText("");
      onClose();
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manual AI Generation — {task}</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          No API key configured. Copy the prompt below, paste into Claude.ai or ChatGPT, then paste the result here.
        </p>

        <Tabs defaultValue="prompt">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="prompt">Prompt</TabsTrigger>
            <TabsTrigger value="paste">Paste Result</TabsTrigger>
          </TabsList>

          <TabsContent value="prompt" className="space-y-4 mt-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">System Prompt</p>
                <Button size="sm" variant="ghost" onClick={() => handleCopy(systemPrompt, "system")}>
                  {copiedSystem ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  <span className="ml-1.5 text-xs">{copiedSystem ? "Copied" : "Copy"}</span>
                </Button>
              </div>
              <Textarea
                readOnly
                value={systemPrompt}
                className="font-mono text-xs h-24 resize-none bg-muted/50"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">User Prompt</p>
                <Button size="sm" variant="ghost" onClick={() => handleCopy(promptText, "user")}>
                  {copiedUser ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  <span className="ml-1.5 text-xs">{copiedUser ? "Copied" : "Copy"}</span>
                </Button>
              </div>
              <Textarea
                readOnly
                value={promptText}
                className="font-mono text-xs h-48 resize-none bg-muted/50"
              />
            </div>
          </TabsContent>

          <TabsContent value="paste" className="space-y-4 mt-4">
            <Textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="Paste AI response here..."
              className="h-64 resize-none"
            />
            <Button onClick={handleSave} disabled={!pastedText.trim()} className="w-full">
              Save Result
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

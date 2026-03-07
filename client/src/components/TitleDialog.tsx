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
import { useCreateTitle, useUpdateTitle, useOmdbSearch, type OmdbResult } from "@/hooks/useTitles";
import { cn } from "@/lib/utils";
import type { Title } from "@shared/schema";
import { Search, ArrowLeft, Film } from "lucide-react";

type Step = "form" | "omdb-search" | "omdb-confirm";

interface FormState {
  titleName: string;
  status: string;
  releaseYear: string;
  runtimeMinutes: string;
  genre: string;
  subgenre: string;
  synopsisShort: string;
  synopsisLong: string;
  marketingPositioning: string;
  mood: string;
  spoilerGuidelines: string;
  approvedBrandVoiceNotes: string;
  keySellingPoints: string;
  trailerLinks: string;
}

const defaultForm: FormState = {
  titleName: "",
  status: "active",
  releaseYear: "",
  runtimeMinutes: "",
  genre: "",
  subgenre: "",
  synopsisShort: "",
  synopsisLong: "",
  marketingPositioning: "",
  mood: "",
  spoilerGuidelines: "",
  approvedBrandVoiceNotes: "",
  keySellingPoints: "",
  trailerLinks: "",
};

function titleToForm(t: Title): FormState {
  return {
    titleName: t.titleName ?? "",
    status: t.status ?? "active",
    releaseYear: t.releaseYear != null ? String(t.releaseYear) : "",
    runtimeMinutes: t.runtimeMinutes != null ? String(t.runtimeMinutes) : "",
    genre: t.genre ?? "",
    subgenre: t.subgenre ?? "",
    synopsisShort: t.synopsisShort ?? "",
    synopsisLong: t.synopsisLong ?? "",
    marketingPositioning: t.marketingPositioning ?? "",
    mood: t.mood ?? "",
    spoilerGuidelines: t.spoilerGuidelines ?? "",
    approvedBrandVoiceNotes: t.approvedBrandVoiceNotes ?? "",
    keySellingPoints: t.keySellingPoints ?? "",
    trailerLinks: Array.isArray(t.trailerLinks) ? t.trailerLinks.join("\n") : "",
  };
}

interface TitleDialogProps {
  open: boolean;
  onClose: () => void;
  editing?: Title | null;
}

export default function TitleDialog({ open, onClose, editing }: TitleDialogProps) {
  const isEdit = !!editing;
  const [step, setStep] = useState<Step>(isEdit ? "form" : "form");
  const [form, setForm] = useState<FormState>(editing ? titleToForm(editing) : defaultForm);
  const [omdbQuery, setOmdbQuery] = useState("");
  const [omdbResult, setOmdbResult] = useState<OmdbResult | null>(null);
  const [omdbConfirmed, setOmdbConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createTitle = useCreateTitle();
  const updateTitle = useUpdateTitle();
  const omdbSearch = useOmdbSearch();

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setForm(editing ? titleToForm(editing) : defaultForm);
      setStep("form");
      setOmdbQuery("");
      setOmdbResult(null);
      setOmdbConfirmed(false);
      setError(null);
    }
  }, [open, editing]);

  function handleField(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleOmdbSearch() {
    if (!omdbQuery.trim()) return;
    setError(null);
    try {
      const result = await omdbSearch.mutateAsync(omdbQuery.trim());
      setOmdbResult(result);
      setStep("omdb-confirm");
    } catch (err: any) {
      setError(err.message ?? "OMDb search failed");
    }
  }

  function handleUseOmdb() {
    if (!omdbResult) return;
    setForm((prev) => ({
      ...prev,
      titleName: omdbResult.Title ?? prev.titleName,
      releaseYear: omdbResult.Year ?? prev.releaseYear,
      runtimeMinutes: omdbResult.runtimeMinutes != null ? String(omdbResult.runtimeMinutes) : prev.runtimeMinutes,
      genre: omdbResult.Genre?.split(",")[0]?.trim() ?? prev.genre,
      synopsisShort: omdbResult.Plot ?? prev.synopsisShort,
    }));
    setOmdbConfirmed(true);
    setStep("form");
  }

  function handleSkipOmdb() {
    setOmdbResult(null);
    setOmdbConfirmed(false);
    setStep("form");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const payload: Record<string, unknown> = {
      titleName: form.titleName,
      status: form.status,
      releaseYear: form.releaseYear ? parseInt(form.releaseYear) : null,
      runtimeMinutes: form.runtimeMinutes ? parseInt(form.runtimeMinutes) : null,
      genre: form.genre || null,
      subgenre: form.subgenre || null,
      synopsisShort: form.synopsisShort || null,
      synopsisLong: form.synopsisLong || null,
      marketingPositioning: form.marketingPositioning || null,
      mood: form.mood || null,
      spoilerGuidelines: form.spoilerGuidelines || null,
      approvedBrandVoiceNotes: form.approvedBrandVoiceNotes || null,
      keySellingPoints: form.keySellingPoints || null,
      trailerLinks: form.trailerLinks
        ? form.trailerLinks.split("\n").map((s) => s.trim()).filter(Boolean)
        : null,
    };

    if (!isEdit && omdbConfirmed && omdbResult) {
      payload.omdbConfirmed = true;
      payload.omdbData = omdbResult as unknown as Record<string, unknown>;
    }

    try {
      if (isEdit && editing) {
        await updateTitle.mutateAsync({ id: editing.id, data: payload as any });
      } else {
        await createTitle.mutateAsync(payload as any);
      }
      onClose();
    } catch (err: any) {
      setError(err.message ?? "Failed to save title");
    }
  }

  const isPending = createTitle.isPending || updateTitle.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Title" : "Add Title"}</DialogTitle>
        </DialogHeader>

        {/* OMDb Search Step */}
        {step === "omdb-search" && (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Search OMDb to auto-populate title metadata from IMDb.
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. Inception, The Dark Knight..."
                value={omdbQuery}
                onChange={(e) => setOmdbQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleOmdbSearch(); } }}
                autoFocus
              />
              <Button
                type="button"
                onClick={handleOmdbSearch}
                disabled={omdbSearch.isPending || !omdbQuery.trim()}
              >
                {omdbSearch.isPending ? "Searching..." : <><Search className="h-4 w-4 mr-1" />Search</>}
              </Button>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => { setStep("form"); setError(null); }}
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back to form
            </Button>
          </div>
        )}

        {/* OMDb Confirm Step */}
        {step === "omdb-confirm" && omdbResult && (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">Is this the right title?</p>
            <div className="flex gap-4 rounded-lg border p-4 bg-muted/30">
              {omdbResult.Poster ? (
                <img
                  src={omdbResult.Poster}
                  alt={omdbResult.Title ?? "Poster"}
                  className="h-32 w-auto rounded object-cover flex-shrink-0"
                />
              ) : (
                <div className="h-32 w-20 rounded bg-muted flex items-center justify-center flex-shrink-0">
                  <Film className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0 space-y-1">
                <p className="font-semibold text-base leading-tight">{omdbResult.Title}</p>
                {omdbResult.Year && <p className="text-sm text-muted-foreground">{omdbResult.Year}</p>}
                {omdbResult.Director && (
                  <p className="text-sm text-muted-foreground">Directed by {omdbResult.Director}</p>
                )}
                {omdbResult.Genre && (
                  <p className="text-xs text-muted-foreground">{omdbResult.Genre}</p>
                )}
                {omdbResult.Plot && (
                  <p className="text-xs text-muted-foreground line-clamp-3 mt-1">{omdbResult.Plot}</p>
                )}
                {omdbResult.imdbRating && (
                  <p className="text-xs font-medium">IMDb: {omdbResult.imdbRating}</p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="button" onClick={handleUseOmdb}>
                Use This Data
              </Button>
              <Button type="button" variant="ghost" onClick={handleSkipOmdb}>
                Skip — Enter Manually
              </Button>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => { setStep("omdb-search"); setOmdbResult(null); setError(null); }}
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back to search
            </Button>
          </div>
        )}

        {/* Main Form */}
        {step === "form" && (
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            {/* OMDb Search trigger — only in create mode */}
            {!isEdit && !omdbConfirmed && (
              <div className="flex items-center justify-between rounded-lg border border-dashed p-3 bg-muted/20">
                <div>
                  <p className="text-sm font-medium">Import from OMDb</p>
                  <p className="text-xs text-muted-foreground">Auto-populate metadata from IMDb database</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => { setStep("omdb-search"); setError(null); }}
                >
                  <Search className="h-3.5 w-3.5 mr-1" />
                  Search OMDb
                </Button>
              </div>
            )}

            {omdbConfirmed && omdbResult && (
              <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/5 p-3">
                {omdbResult.Poster && (
                  <img
                    src={omdbResult.Poster}
                    alt="Poster"
                    className="h-10 w-auto rounded object-cover flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-green-700 dark:text-green-400">
                    OMDb data loaded: {omdbResult.Title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Poster and metadata will be saved with this title
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => { setOmdbResult(null); setOmdbConfirmed(false); }}
                  className="text-xs"
                >
                  Remove
                </Button>
              </div>
            )}

            {/* Core fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1">
                <Label htmlFor="titleName">
                  Title Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="titleName"
                  value={form.titleName}
                  onChange={(e) => handleField("titleName", e.target.value)}
                  required
                  placeholder="e.g. Inception"
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
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="releaseYear">Release Year</Label>
                <Input
                  id="releaseYear"
                  type="number"
                  min="1900"
                  max="2099"
                  value={form.releaseYear}
                  onChange={(e) => handleField("releaseYear", e.target.value)}
                  placeholder="e.g. 2010"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="genre">Genre</Label>
                <Input
                  id="genre"
                  value={form.genre}
                  onChange={(e) => handleField("genre", e.target.value)}
                  placeholder="e.g. Thriller"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="subgenre">Subgenre</Label>
                <Input
                  id="subgenre"
                  value={form.subgenre}
                  onChange={(e) => handleField("subgenre", e.target.value)}
                  placeholder="e.g. Psychological"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="runtimeMinutes">Runtime (minutes)</Label>
                <Input
                  id="runtimeMinutes"
                  type="number"
                  min="1"
                  value={form.runtimeMinutes}
                  onChange={(e) => handleField("runtimeMinutes", e.target.value)}
                  placeholder="e.g. 148"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="mood">Mood</Label>
                <Input
                  id="mood"
                  value={form.mood}
                  onChange={(e) => handleField("mood", e.target.value)}
                  placeholder="e.g. Suspenseful, inspiring"
                />
              </div>
            </div>

            {/* Synopses */}
            <div className="space-y-1">
              <Label htmlFor="synopsisShort">Synopsis (Short)</Label>
              <textarea
                id="synopsisShort"
                rows={3}
                value={form.synopsisShort}
                onChange={(e) => handleField("synopsisShort", e.target.value)}
                placeholder="One-paragraph marketing synopsis..."
                className={cn(
                  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                )}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="synopsisLong">Synopsis (Long)</Label>
              <textarea
                id="synopsisLong"
                rows={5}
                value={form.synopsisLong}
                onChange={(e) => handleField("synopsisLong", e.target.value)}
                placeholder="Full detailed synopsis for press kits..."
                className={cn(
                  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                )}
              />
            </div>

            {/* Marketing fields */}
            <div className="space-y-1">
              <Label htmlFor="marketingPositioning">Marketing Positioning</Label>
              <textarea
                id="marketingPositioning"
                rows={3}
                value={form.marketingPositioning}
                onChange={(e) => handleField("marketingPositioning", e.target.value)}
                placeholder="How this title should be positioned in marketing..."
                className={cn(
                  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                )}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="keySellingPoints">Key Selling Points</Label>
              <textarea
                id="keySellingPoints"
                rows={3}
                value={form.keySellingPoints}
                onChange={(e) => handleField("keySellingPoints", e.target.value)}
                placeholder="Bullet points or key hooks for promotion..."
                className={cn(
                  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                )}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="approvedBrandVoiceNotes">Brand Voice Notes</Label>
              <textarea
                id="approvedBrandVoiceNotes"
                rows={3}
                value={form.approvedBrandVoiceNotes}
                onChange={(e) => handleField("approvedBrandVoiceNotes", e.target.value)}
                placeholder="Approved tone, language guidelines..."
                className={cn(
                  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                )}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="spoilerGuidelines">Spoiler Guidelines</Label>
              <textarea
                id="spoilerGuidelines"
                rows={2}
                value={form.spoilerGuidelines}
                onChange={(e) => handleField("spoilerGuidelines", e.target.value)}
                placeholder="What can/cannot be revealed in marketing..."
                className={cn(
                  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                )}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="trailerLinks">Trailer Links (one per line)</Label>
              <textarea
                id="trailerLinks"
                rows={3}
                value={form.trailerLinks}
                onChange={(e) => handleField("trailerLinks", e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                className={cn(
                  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                )}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending || !form.titleName.trim()}>
                {isPending ? "Saving..." : isEdit ? "Save Changes" : "Create Title"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

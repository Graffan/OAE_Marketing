import { useState } from "react";
import { Link2, Plus, Copy, Pencil, Trash2, FlaskConical, Check } from "lucide-react";
import {
  useSmartLinks,
  useDeleteSmartLink,
  usePreviewSmartLink,
} from "@/hooks/useSmartLinks";
import type { PreviewResult } from "@/hooks/useSmartLinks";
import { useTitles } from "@/hooks/useTitles";
import { useAuth } from "@/hooks/useAuth";
import SmartLinkDialog from "@/components/SmartLinkDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { SmartLink } from "@shared/schema";

const COMMON_COUNTRIES = [
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "JP", name: "Japan" },
  { code: "BR", name: "Brazil" },
  { code: "MX", name: "Mexico" },
  { code: "IN", name: "India" },
  { code: "ES", name: "Spain" },
  { code: "KR", name: "South Korea" },
];

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = new Date(d);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function SmartLinksPage() {
  const { user } = useAuth();
  const role = user?.role ?? "";
  const isAdmin = role === "admin";
  const canEdit = ["admin", "marketing_operator"].includes(role);

  const { data: links, isLoading, error } = useSmartLinks();
  const { data: titles } = useTitles();
  const deleteLink = useDeleteSmartLink();
  const previewLink = usePreviewSmartLink();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SmartLink | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [testerSlug, setTesterSlug] = useState<string | null>(null);
  const [testerCountry, setTesterCountry] = useState("US");
  const [testerCountryInput, setTesterCountryInput] = useState("");
  const [testerResult, setTesterResult] = useState<PreviewResult | null>(null);
  const [testerError, setTesterError] = useState<string | null>(null);
  const [copiedResultUrl, setCopiedResultUrl] = useState(false);

  function getTitleName(titleId: number | null | undefined): string {
    if (!titleId) return "—";
    const t = (titles ?? []).find((t) => t.id === titleId);
    return t?.titleName ?? `#${titleId}`;
  }

  async function handleCopy(link: SmartLink) {
    const url = `${window.location.origin}/l/${link.slug}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(link.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function handleCopyResultUrl() {
    if (!testerResult) return;
    await navigator.clipboard.writeText(testerResult.resolvedUrl);
    setCopiedResultUrl(true);
    setTimeout(() => setCopiedResultUrl(false), 2000);
  }

  function handleTest(link: SmartLink) {
    setTesterSlug(link.slug);
    setTesterResult(null);
    setTesterError(null);
  }

  async function handlePreview() {
    if (!testerSlug) return;
    setTesterError(null);
    const country = testerCountryInput.trim().toUpperCase().slice(0, 2) || testerCountry;
    try {
      const result = await previewLink.mutateAsync({ slug: testerSlug, countryCode: country });
      setTesterResult(result);
    } catch (err: any) {
      setTesterError(err.message ?? "Preview failed");
      setTesterResult(null);
    }
  }

  async function handleDelete(link: SmartLink) {
    if (!window.confirm(`Delete smart link "/${link.slug}"? This cannot be undone.`)) return;
    try {
      await deleteLink.mutateAsync(link.id);
      if (testerSlug === link.slug) setTesterSlug(null);
    } catch (err: any) {
      alert(err.message ?? "Failed to delete");
    }
  }

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(link: SmartLink) {
    setEditing(link);
    setDialogOpen(true);
  }

  return (
    <div className="flex h-full">
      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 p-6 overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-rose-600/10 flex items-center justify-center">
              <Link2 className="h-4 w-4 text-rose-600" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">Smart Links</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Slug-based redirects with IP geolocation routing
              </p>
            </div>
          </div>
          {canEdit && (
            <Button onClick={openCreate} size="sm" className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              New Smart Link
            </Button>
          )}
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
            Loading...
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-32 text-sm text-destructive">
            Failed to load smart links
          </div>
        ) : !links || links.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <Link2 className="h-8 w-8 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No smart links yet</p>
            {canEdit && (
              <Button onClick={openCreate} size="sm" variant="outline" className="mt-3 gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                Create your first smart link
              </Button>
            )}
          </div>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[180px_1fr_1fr_80px_130px_110px] gap-3 px-4 py-2.5 bg-muted/40 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <span>Slug</span>
              <span>Title</span>
              <span>Default URL</span>
              <span>Status</span>
              <span>Created</span>
              <span className="text-right">Actions</span>
            </div>

            {/* Table rows */}
            {links.map((link) => (
              <div
                key={link.id}
                className="grid grid-cols-[180px_1fr_1fr_80px_130px_110px] gap-3 px-4 py-3 border-b border-border last:border-b-0 hover:bg-muted/20 transition-colors items-center"
              >
                {/* Slug */}
                <div className="flex items-center gap-1.5 min-w-0">
                  <code className="font-mono text-xs text-foreground truncate">{link.slug}</code>
                  <button
                    onClick={() => handleCopy(link)}
                    className="flex-shrink-0 h-5 w-5 flex items-center justify-center rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    title="Copy link"
                  >
                    {copiedId === link.id ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </button>
                </div>

                {/* Title */}
                <span className="text-sm text-muted-foreground truncate">
                  {getTitleName(link.titleId)}
                </span>

                {/* Default URL */}
                <span
                  className="text-xs text-muted-foreground truncate"
                  title={link.defaultUrl}
                >
                  {link.defaultUrl}
                </span>

                {/* Active badge */}
                <div>
                  <span
                    className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                      link.isActive
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {link.isActive ? "Active" : "Inactive"}
                  </span>
                </div>

                {/* Created date */}
                <span className="text-xs text-muted-foreground">{formatDate(link.createdAt)}</span>

                {/* Actions */}
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={() => handleTest(link)}
                    className={cn(
                      "h-7 w-7 flex items-center justify-center rounded hover:bg-muted transition-colors",
                      testerSlug === link.slug
                        ? "text-rose-500 bg-rose-500/10"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    title="Test link"
                  >
                    <FlaskConical className="h-3.5 w-3.5" />
                  </button>
                  {canEdit && (
                    <button
                      onClick={() => openEdit(link)}
                      className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {isAdmin && (
                    <button
                      onClick={() => handleDelete(link)}
                      className="h-7 w-7 flex items-center justify-center rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tester panel */}
      <div className="w-80 flex-shrink-0 border-l border-border flex flex-col bg-muted/10">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 mb-1">
            <FlaskConical className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Link Tester</h2>
          </div>
          <p className="text-xs text-muted-foreground">Preview geo-resolution without triggering analytics</p>
        </div>

        <div className="p-4 space-y-4 flex-1 overflow-y-auto">
          {/* Selected slug */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Selected Link
            </label>
            <div
              className={cn(
                "h-9 flex items-center px-3 rounded-md border text-sm font-mono",
                testerSlug
                  ? "border-input bg-background text-foreground"
                  : "border-border bg-muted/40 text-muted-foreground"
              )}
            >
              {testerSlug ? `/${testerSlug}` : "— select a link to test —"}
            </div>
          </div>

          {/* Country select */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Country
            </label>
            <Select
              value={testerCountry}
              onValueChange={(v) => {
                setTesterCountry(v);
                setTesterCountryInput("");
              }}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COMMON_COUNTRIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.code} — {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Or type a 2-letter code:</p>
            <Input
              value={testerCountryInput}
              onChange={(e) => setTesterCountryInput(e.target.value.toUpperCase().slice(0, 2))}
              placeholder="e.g. NZ"
              className="h-8 text-sm font-mono"
              maxLength={2}
            />
          </div>

          {/* Preview button */}
          <Button
            onClick={handlePreview}
            disabled={!testerSlug || previewLink.isPending}
            className="w-full"
            size="sm"
          >
            {previewLink.isPending ? "Resolving..." : "Preview"}
          </Button>

          {/* Error */}
          {testerError && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="text-xs text-destructive">{testerError}</p>
            </div>
          )}

          {/* Result card */}
          {testerResult && !testerError && (
            <div className="p-3 rounded-lg border border-border bg-background space-y-3">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Resolved URL</p>
                <p
                  className={cn(
                    "text-xs font-mono break-all leading-relaxed",
                    testerResult.isDefault ? "text-muted-foreground" : "text-green-600 dark:text-green-400"
                  )}
                >
                  {testerResult.resolvedUrl}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground mb-0.5">Country</p>
                  <p className="font-mono font-medium">{testerResult.countryCode}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-0.5">Platform</p>
                  <p className="font-medium">
                    {testerResult.destination?.platformName ?? (
                      <span className="text-muted-foreground italic">No match</span>
                    )}
                  </p>
                </div>
              </div>

              {testerResult.isDefault && (
                <div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                  Using default URL
                </div>
              )}

              <Button
                size="sm"
                variant="outline"
                onClick={handleCopyResultUrl}
                className="w-full gap-1.5 h-7 text-xs"
              >
                {copiedResultUrl ? (
                  <>
                    <Check className="h-3 w-3 text-green-500" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    Copy resolved URL
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Dialog */}
      <SmartLinkDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        editing={editing}
      />
    </div>
  );
}

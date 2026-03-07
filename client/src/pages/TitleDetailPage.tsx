import { useState } from "react";
import { Link, useRoute } from "wouter";
import { ArrowLeft, Pencil, Film, Star, ExternalLink } from "lucide-react";
import { useTitle } from "@/hooks/useTitles";
import { useAuth } from "@/hooks/useAuth";
import TitleDialog from "@/components/TitleDialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        status === "active" && "bg-green-500/10 text-green-700 dark:text-green-400 ring-1 ring-green-500/20",
        status === "upcoming" && "bg-blue-500/10 text-blue-700 dark:text-blue-400 ring-1 ring-blue-500/20",
        status === "archived" && "bg-muted text-muted-foreground ring-1 ring-border"
      )}
    >
      {status}
    </span>
  );
}

function MetaField({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="space-y-1">
      <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground whitespace-pre-wrap">{value}</dd>
    </div>
  );
}

export default function TitleDetailPage() {
  const [, params] = useRoute("/titles/:id");
  const id = params?.id ? parseInt(params.id) : null;

  const { user } = useAuth();
  const { data: title, isLoading } = useTitle(id);
  const [dialogOpen, setDialogOpen] = useState(false);

  const canEdit = ["admin", "marketing_operator"].includes(user?.role ?? "");

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
      </div>
    );
  }

  if (!title) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <p className="font-medium text-foreground">Title not found</p>
        <Link href="/titles">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back to Titles
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Back navigation */}
      <div className="px-6 py-3 border-b border-border">
        <Link href="/titles">
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground -ml-2">
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Titles
          </Button>
        </Link>
      </div>

      {/* Title hero header */}
      <div className="px-6 py-6 border-b border-border bg-muted/20">
        <div className="flex gap-6 items-start">
          {/* Poster */}
          {title.omdbPosterUrl ? (
            <img
              src={title.omdbPosterUrl}
              alt={title.titleName}
              className="rounded-xl object-cover flex-shrink-0 shadow-lg"
              style={{ maxHeight: 192, width: "auto" }}
            />
          ) : (
            <div className="h-48 w-32 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
              <Film className="h-10 w-10 text-muted-foreground" />
            </div>
          )}

          {/* Info */}
          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <h1 className="text-2xl font-bold tracking-tight leading-tight">{title.titleName}</h1>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={title.status} />
                  {title.releaseYear && (
                    <span className="text-sm text-muted-foreground">{title.releaseYear}</span>
                  )}
                  {title.genre && (
                    <span className="text-sm text-muted-foreground">{title.genre}</span>
                  )}
                  {title.runtimeMinutes && (
                    <span className="text-sm text-muted-foreground">{title.runtimeMinutes} min</span>
                  )}
                </div>
              </div>
              {canEdit && (
                <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)}>
                  <Pencil className="h-3.5 w-3.5 mr-1.5" />
                  Edit
                </Button>
              )}
            </div>

            {title.synopsisShort && (
              <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
                {title.synopsisShort}
              </p>
            )}

            {/* OMDb ratings row */}
            {(title.omdbImdbRating || title.omdbImdbId) && (
              <div className="flex items-center gap-3">
                {title.omdbImdbRating && (
                  <div className="flex items-center gap-1 text-sm">
                    <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                    <span className="font-medium">{title.omdbImdbRating}</span>
                    <span className="text-muted-foreground">IMDb</span>
                  </div>
                )}
                {title.omdbImdbId && (
                  <a
                    href={`https://www.imdb.com/title/${title.omdbImdbId}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                  >
                    {title.omdbImdbId}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-1 overflow-auto">
        <Tabs defaultValue="overview" className="h-full flex flex-col">
          <div className="px-6 border-b border-border">
            <TabsList className="h-auto rounded-none bg-transparent p-0 gap-0">
              <TabsTrigger
                value="overview"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 text-sm font-medium"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="clips"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 text-sm font-medium"
              >
                Clips
              </TabsTrigger>
              <TabsTrigger
                value="campaigns"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 text-sm font-medium"
              >
                Campaigns
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Overview Tab */}
          <TabsContent value="overview" className="flex-1 overflow-auto m-0">
            <div className="px-6 py-6 space-y-8 max-w-4xl">
              {/* OMDb / Film Info Section */}
              {(title.omdbDirector || title.omdbActors || title.omdbPlot) && (
                <section className="space-y-4">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Film Info (OMDb)
                  </h2>
                  <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <MetaField label="Director" value={title.omdbDirector} />
                    <MetaField label="Cast" value={title.omdbActors} />
                    <div className="sm:col-span-2">
                      <MetaField label="OMDb Plot" value={title.omdbPlot} />
                    </div>
                  </dl>
                </section>
              )}

              {/* Marketing Section */}
              <section className="space-y-4">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Marketing
                </h2>
                <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {title.synopsisShort && (
                    <div className="sm:col-span-2">
                      <MetaField label="Synopsis (Short)" value={title.synopsisShort} />
                    </div>
                  )}
                  {title.synopsisLong && (
                    <div className="sm:col-span-2">
                      <MetaField label="Synopsis (Long)" value={title.synopsisLong} />
                    </div>
                  )}
                  {title.marketingPositioning && (
                    <div className="sm:col-span-2">
                      <MetaField label="Marketing Positioning" value={title.marketingPositioning} />
                    </div>
                  )}
                  <div className="sm:col-span-2">
                    <MetaField label="Key Selling Points" value={title.keySellingPoints} />
                  </div>
                  <MetaField label="Mood" value={title.mood} />
                  <MetaField label="Subgenre" value={title.subgenre} />
                </dl>
              </section>

              {/* Brand Voice & Guidelines */}
              {(title.approvedBrandVoiceNotes || title.spoilerGuidelines) && (
                <section className="space-y-4">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Brand Voice & Guidelines
                  </h2>
                  <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {title.approvedBrandVoiceNotes && (
                      <div className="sm:col-span-2">
                        <MetaField label="Brand Voice Notes" value={title.approvedBrandVoiceNotes} />
                      </div>
                    )}
                    {title.spoilerGuidelines && (
                      <div className="sm:col-span-2">
                        <MetaField label="Spoiler Guidelines" value={title.spoilerGuidelines} />
                      </div>
                    )}
                  </dl>
                </section>
              )}

              {/* Trailer Links */}
              {Array.isArray(title.trailerLinks) && title.trailerLinks.length > 0 && (
                <section className="space-y-4">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Trailers
                  </h2>
                  <ul className="space-y-2">
                    {title.trailerLinks.map((url, i) => (
                      <li key={i}>
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline flex items-center gap-1"
                        >
                          {url}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          </TabsContent>

          {/* Clips Tab */}
          <TabsContent value="clips" className="flex-1 overflow-auto m-0">
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center px-6">
              <div className="h-14 w-14 rounded-xl bg-muted flex items-center justify-center">
                <Film className="h-7 w-7 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-foreground">Clips managed in Clip Library</p>
                <p className="text-sm text-muted-foreground mt-1">
                  View and manage clips associated with this title there.
                </p>
              </div>
              <Link href={`/clips?title=${title.id}`}>
                <Button variant="outline" size="sm">
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                  Go to Clip Library
                </Button>
              </Link>
            </div>
          </TabsContent>

          {/* Campaigns Tab */}
          <TabsContent value="campaigns" className="flex-1 overflow-auto m-0">
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center px-6">
              <p className="font-medium text-foreground">Campaigns — Coming in Phase 4</p>
              <p className="text-sm text-muted-foreground">
                Campaign management will be available after Phase 4 is complete.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit dialog */}
      <TitleDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        editing={title}
      />
    </div>
  );
}

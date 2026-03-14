import { useState } from "react";
import { useSettings } from "@/hooks/useSettings";
import {
  BrainCircuit,
  Send,
  CalendarDays,
  Megaphone,
  Video,
  Globe,
  BarChart3,
  Sparkles,
  Settings,
  ChevronDown,
  ChevronRight,
  Activity,
  Film,
  Mail,
  HelpCircle,
} from "lucide-react";

// ─── Accordion Item ─────────────────────────────────────────────────────────

function AccordionItem({
  title,
  icon: Icon,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const Chevron = open ? ChevronDown : ChevronRight;

  return (
    <div className="border border-border/50 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-muted/30 transition-colors"
      >
        <Icon className="h-4 w-4 text-violet-500 flex-shrink-0" />
        <span className="text-sm font-medium flex-1">{title}</span>
        <Chevron className="h-4 w-4 text-muted-foreground" />
      </button>
      {open && (
        <div className="px-5 pb-5 pt-1 text-sm text-muted-foreground leading-relaxed space-y-3 border-t border-border/30">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Help Page ──────────────────────────────────────────────────────────────

export default function HelpPage() {
  const { settings } = useSettings();
  const appName = settings?.appTitle ?? "OAE Marketing";

  return (
    <div className="flex flex-col h-full">
      <div className="px-8 py-6 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-[0_2px_8px_rgba(59,130,246,0.3)]">
            <HelpCircle className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Help & Guide</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              How {appName} works, workflows, and Morgan&apos;s operations
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-3xl space-y-3">
          {/* Quick Start */}
          <AccordionItem title="Getting Started" icon={Sparkles} defaultOpen>
            <p>
              {appName} is a marketing operations platform for film distribution. It manages titles,
              clips, campaigns, smart links, social publishing, and analytics — with Morgan, an AI
              marketing assistant, handling day-to-day operations.
            </p>
            <div>
              <p className="font-medium text-foreground mb-1">Quick Start Workflow:</p>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>Add a title in <strong>Titles</strong> (film metadata auto-imported via OMDb)</li>
                <li>Upload clips in <strong>Clip Library</strong> or sync from Dropbox</li>
                <li>Set up destinations in <strong>Destinations</strong> (where your film is available)</li>
                <li>Create a smart link in <strong>Smart Links</strong> (geo-routing viewers to the right platform)</li>
                <li>Build a campaign in <strong>Campaigns</strong> (or let Morgan draft one)</li>
                <li>Review Morgan&apos;s drafts in <strong>Morgan Ops &amp; Queue</strong></li>
                <li>Track performance in <strong>Analytics</strong> and <strong>Link Stats</strong></li>
              </ol>
            </div>
          </AccordionItem>

          {/* Morgan */}
          <AccordionItem title="Morgan — AI Marketing Assistant" icon={BrainCircuit}>
            <p>
              Morgan is the AI head of marketing. She operates on a daily autonomous cycle,
              drafting content, analyzing performance, and recommending strategy adjustments.
            </p>
            <div>
              <p className="font-medium text-foreground mb-1">Daily Cycle:</p>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li><strong>Morning Scan</strong> — Inventory check, analytics review, rotation state</li>
                <li><strong>Content Draft</strong> — Generates post ideas for today&apos;s schedule</li>
                <li><strong>Morning Briefing</strong> — Summary notification sent to all owners</li>
                <li><strong>Publish Approved</strong> — Publishes approved posts at scheduled times</li>
                <li><strong>Evening Digest</strong> — Day&apos;s performance snapshot</li>
                <li><strong>Weekly Review</strong> — Strategy analysis (Sundays only)</li>
              </ol>
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">Approval Flow:</p>
              <p className="text-xs">
                Morgan never publishes without approval. All drafts go to the Approval Queue
                where owners can edit captions, hashtags, and timing before approving or rejecting.
                Auto-approve rules can be configured for recurring series or high-performing content.
              </p>
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">Smart Model Routing:</p>
              <p className="text-xs">
                Morgan uses a local LLM (Ollama) for drafts, brainstorming, and chat to minimize
                API costs. Paid API calls (Claude, OpenAI, DeepSeek) are reserved for final campaign
                briefs and polished copy. You can override this in chat by saying &quot;use api&quot; or &quot;use local&quot;.
              </p>
            </div>
          </AccordionItem>

          {/* Campaigns */}
          <AccordionItem title="Campaigns & Staging" icon={Megaphone}>
            <p>
              Campaigns are the core organizational unit. Each campaign is linked to a title and
              contains scheduled posts across platforms.
            </p>
            <div>
              <p className="font-medium text-foreground mb-1">Campaign Phases (Organic Rollout):</p>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li><strong>Seed</strong> (Days 1-3) — 1-2 posts/day, teasers and behind-the-scenes</li>
                <li><strong>Launch</strong> (Days 4-7) — 3-4 posts/day, hero clips and CTAs</li>
                <li><strong>Sustain</strong> (Days 8-14) — 2-3 posts/day, reviews and audience content</li>
                <li><strong>Revive</strong> (Days 15-21) — 1-2 posts/day, milestone celebrations</li>
                <li><strong>Evergreen</strong> (Days 22-90) — 0.5 posts/day, throwbacks and steady presence</li>
              </ol>
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">Anti-Bot Protection:</p>
              <p className="text-xs">
                Posts are humanized with timing jitter (1-8 minute delays), hashtag shuffling,
                caption variation, and per-platform rate limits to avoid social media automation detection.
              </p>
            </div>
          </AccordionItem>

          {/* Titles */}
          <AccordionItem title="Titles" icon={Film}>
            <p>
              Titles represent films or projects. When you create a title, metadata is
              auto-imported from OMDb (poster, year, genre, director, plot).
            </p>
            <p className="text-xs">
              Each title can have clips, destinations, smart links, and campaigns associated with it.
              The title detail page shows all related data and allows triggering AI analysis.
            </p>
          </AccordionItem>

          {/* Clips */}
          <AccordionItem title="Clip Library" icon={Video}>
            <p>
              The clip library stores all marketing assets — trailers, teasers, behind-the-scenes
              footage, and social clips.
            </p>
            <p className="text-xs">
              Clips can be uploaded directly or synced from a connected Dropbox folder. The clip
              rotation engine ensures variety in social posts by tracking which clips have been used
              recently.
            </p>
          </AccordionItem>

          {/* Destinations */}
          <AccordionItem title="Destinations & Smart Links" icon={Globe}>
            <p>
              Destinations are the streaming platforms where your film is available (Tubi, Amazon,
              Plex, etc.), organized by region.
            </p>
            <div>
              <p className="font-medium text-foreground mb-1">Smart Links:</p>
              <p className="text-xs">
                Smart links use IP geolocation to route viewers to the correct regional platform.
                A single link automatically sends US viewers to Tubi US, UK viewers to Tubi UK, etc.
              </p>
            </div>
          </AccordionItem>

          {/* Schedule */}
          <AccordionItem title="Schedule & Calendar" icon={CalendarDays}>
            <p>
              The Schedule page shows all upcoming and past social posts with their status
              (draft, scheduled, publishing, published, failed). The Calendar provides a
              visual month/week view.
            </p>
            <p className="text-xs">
              Posts move through: <strong>draft</strong> → <strong>scheduled</strong> →{" "}
              <strong>publishing</strong> → <strong>published</strong> or <strong>failed</strong>.
            </p>
          </AccordionItem>

          {/* Social Publishing */}
          <AccordionItem title="Social Publishing" icon={Send}>
            <p>
              The publish engine runs every 60 seconds, picking up scheduled posts that are due.
              Each platform uses its real API:
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li><strong>Instagram</strong> — Graph API (container create then publish)</li>
              <li><strong>TikTok</strong> — Content Posting API v2 (video required)</li>
              <li><strong>X/Twitter</strong> — API v2</li>
              <li><strong>YouTube</strong> — Requires manual upload (multipart flow planned)</li>
            </ul>
            <p className="text-xs">
              Social connections are configured in <strong>Admin &gt; Social Connections</strong>.
              Each platform requires OAuth setup with valid access tokens.
            </p>
          </AccordionItem>

          {/* Analytics */}
          <AccordionItem title="Analytics & Link Stats" icon={BarChart3}>
            <p>
              The Analytics page shows campaign performance, engagement metrics, and trend data.
              Link Stats tracks smart link clicks with geographic breakdown.
            </p>
          </AccordionItem>

          {/* AI Studio */}
          <AccordionItem title="AI Studio" icon={Sparkles}>
            <p>
              AI Studio provides direct access to AI content generation — campaign briefs,
              social copy, hashtag suggestions, and more. This is a manual alternative to
              Morgan&apos;s autonomous drafting.
            </p>
          </AccordionItem>

          {/* Email */}
          <AccordionItem title="Email" icon={Mail}>
            <p>
              The email system sends deadline reminders and digest emails via SMTP. Configure
              SMTP settings in <strong>Admin &gt; Settings</strong>.
            </p>
          </AccordionItem>

          {/* Morgan Operations */}
          <AccordionItem title="Morgan Ops & Queue" icon={Activity}>
            <p>The Morgan Operations page has three tabs:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li><strong>Approval Queue</strong> — Review, edit, approve or reject Morgan&apos;s drafts</li>
              <li><strong>Task History</strong> — See all completed and upcoming autonomous tasks</li>
              <li><strong>Auto-Approve Rules</strong> — Configure conditions for auto-publishing</li>
            </ul>
          </AccordionItem>

          {/* Admin */}
          <AccordionItem title="Admin Settings" icon={Settings}>
            <p>Admin-only settings include:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li><strong>General</strong> — Company name, app title, logo, accent color</li>
              <li><strong>AI Providers</strong> — Configure Claude, OpenAI, DeepSeek, Ollama</li>
              <li><strong>Social Connections</strong> — OAuth tokens for each platform</li>
              <li><strong>Dropbox</strong> — Connect Dropbox for clip syncing</li>
              <li><strong>SMTP</strong> — Email server configuration</li>
              <li><strong>Storage</strong> — Configure paths for clips, exports, and model files</li>
              <li><strong>User Management</strong> — Create/edit users and assign roles</li>
            </ul>
            <div>
              <p className="font-medium text-foreground mb-1">Roles:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li><strong>Admin</strong> — Full access to everything</li>
                <li><strong>Marketing Operator</strong> — Content, campaigns, scheduling, analytics</li>
                <li><strong>Reviewer</strong> — View campaigns and analytics, approve content</li>
                <li><strong>Executive</strong> — Dashboard, analytics, calendar (read-only)</li>
                <li><strong>Freelancer</strong> — Clip library and assigned tasks only</li>
              </ul>
            </div>
          </AccordionItem>
        </div>
      </div>
    </div>
  );
}

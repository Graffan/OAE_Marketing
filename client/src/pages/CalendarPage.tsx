import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useCalendarPosts } from "@/hooks/useScheduledPosts";
import PostComposer from "@/components/schedule/PostComposer";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Instagram,
  Twitter,
  Youtube,
  Music2,
  Send,
} from "lucide-react";

// ─── Constants ──────────────────────────────────────────────────────────────

const PLATFORM_ICONS: Record<string, React.ElementType> = {
  instagram: Instagram,
  tiktok: Music2,
  twitter: Twitter,
  youtube: Youtube,
};

const PLATFORM_COLORS: Record<string, string> = {
  instagram: "bg-pink-500",
  tiktok: "bg-cyan-500",
  twitter: "bg-sky-500",
  youtube: "bg-red-500",
};

const STATUS_DOT: Record<string, string> = {
  draft: "bg-gray-400",
  queued: "bg-blue-500",
  scheduled: "bg-violet-500",
  publishing: "bg-amber-500",
  published: "bg-emerald-500",
  failed: "bg-red-500",
  cancelled: "bg-gray-400",
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isToday(d: Date): boolean {
  return isSameDay(d, new Date());
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

// ─── Calendar Grid ──────────────────────────────────────────────────────────

function buildCalendarDays(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const start = new Date(first);
  start.setDate(start.getDate() - start.getDay()); // back to Sunday

  const days: Date[] = [];
  const current = new Date(start);
  // Always render 6 weeks = 42 cells for consistent grid
  for (let i = 0; i < 42; i++) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return days;
}

// ─── Day Cell ────────────────────────────────────────────────────────────────

function DayCell({
  date,
  currentMonth,
  posts,
  onAddPost,
}: {
  date: Date;
  currentMonth: number;
  posts: any[];
  onAddPost: (date: string) => void;
}) {
  const inMonth = date.getMonth() === currentMonth;
  const today = isToday(date);
  const dayPosts = posts.filter((p: any) => {
    const postDate = new Date(p.scheduledAt ?? p.createdAt);
    return isSameDay(postDate, date);
  });

  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}T12:00`;

  return (
    <div
      className={`group relative min-h-[100px] border-b border-r border-border/30 p-1.5 transition-colors ${
        inMonth ? "bg-card" : "bg-muted/30"
      } hover:bg-accent/30`}
    >
      {/* Day number */}
      <div className="flex items-center justify-between mb-1">
        <span
          className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${
            today
              ? "bg-primary text-primary-foreground"
              : inMonth
                ? "text-foreground"
                : "text-muted-foreground/50"
          }`}
        >
          {date.getDate()}
        </span>
        <button
          onClick={() => onAddPost(dateStr)}
          className="opacity-0 group-hover:opacity-100 transition-opacity h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent"
          title="Add post"
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>

      {/* Posts */}
      <div className="space-y-0.5">
        {dayPosts.slice(0, 3).map((post: any) => {
          const PIcon = PLATFORM_ICONS[post.platform] ?? Send;
          const dotColor = STATUS_DOT[post.status] ?? "bg-gray-400";
          return (
            <div
              key={post.id}
              className="flex items-center gap-1 px-1 py-0.5 rounded text-[10px] leading-tight bg-background/80 border border-border/30 truncate"
              title={post.caption}
            >
              <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${dotColor}`} />
              <PIcon className={`h-2.5 w-2.5 flex-shrink-0 ${PLATFORM_COLORS[post.platform] ? "text-white" : "text-muted-foreground"}`} style={{ color: PLATFORM_COLORS[post.platform]?.replace("bg-", "") }} />
              <span className="truncate">{formatTime(post.scheduledAt ?? post.createdAt)}</span>
            </div>
          );
        })}
        {dayPosts.length > 3 && (
          <span className="text-[10px] text-muted-foreground pl-1">
            +{dayPosts.length - 3} more
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Calendar Page ──────────────────────────────────────────────────────────

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerDate, setComposerDate] = useState<string>("");

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const from = startOfMonth(currentDate).toISOString();
  const to = endOfMonth(currentDate).toISOString();
  const { data: posts = [], isLoading } = useCalendarPosts(from, to);

  const days = useMemo(() => buildCalendarDays(year, month), [year, month]);

  function prevMonth() {
    setCurrentDate(new Date(year, month - 1, 1));
  }

  function nextMonth() {
    setCurrentDate(new Date(year, month + 1, 1));
  }

  function goToday() {
    setCurrentDate(new Date());
  }

  function handleAddPost(dateStr: string) {
    setComposerDate(dateStr);
    setComposerOpen(true);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-8 py-6 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Content Calendar</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Visual overview of your posting schedule
            </p>
          </div>
          <Button onClick={() => { setComposerDate(""); setComposerOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Compose Post
          </Button>
        </div>
      </div>

      {/* Month navigation */}
      <div className="px-8 py-3 border-b border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold min-w-[180px] text-center">
            {MONTHS[month]} {year}
          </h2>
          <Button variant="outline" size="sm" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={goToday} className="text-xs">
            Today
          </Button>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          {(["scheduled", "published", "draft", "failed"] as const).map((s) => (
            <span key={s} className="flex items-center gap-1 capitalize">
              <span className={`h-2 w-2 rounded-full ${STATUS_DOT[s]}`} />
              {s}
            </span>
          ))}
        </div>
      </div>

      {/* Calendar grid */}
      <div className="flex-1 overflow-auto px-8 py-4">
        {isLoading ? (
          <Skeleton className="h-[600px] rounded-xl" />
        ) : (
          <div className="border border-border/50 rounded-xl overflow-hidden">
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-border/50 bg-muted/50">
              {DAYS.map((d) => (
                <div key={d} className="py-2 text-center text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7">
              {days.map((date, i) => (
                <DayCell
                  key={i}
                  date={date}
                  currentMonth={month}
                  posts={posts as any[]}
                  onAddPost={handleAddPost}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <PostComposer
        open={composerOpen}
        onOpenChange={setComposerOpen}
        defaultDate={composerDate}
      />
    </div>
  );
}

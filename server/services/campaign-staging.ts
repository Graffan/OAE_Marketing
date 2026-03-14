/**
 * Campaign Staging Engine — Organic, phased content rollout.
 *
 * Campaigns don't dump everything at once. Real marketing campaigns
 * build momentum over phases:
 *
 * Phase 1: SEED (Days 1-3)     — Tease content, build curiosity
 * Phase 2: LAUNCH (Days 4-7)   — Main push, hero content, CTA
 * Phase 3: SUSTAIN (Days 8-14) — Varied content, engagement, community
 * Phase 4: REVIVE (Days 15-21) — Behind-the-scenes, user content, press
 * Phase 5: EVERGREEN (ongoing) — Periodic repost, milestone celebration
 *
 * Each phase has different:
 * - Post frequency (ramps up then down)
 * - Content types (teasers → hero → BTS → UGC)
 * - Platform priority (TikTok first, then IG, then Twitter)
 * - Hashtag strategy (niche → broad → niche)
 * - CTA intensity (soft → hard → soft)
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type CampaignPhase = "seed" | "launch" | "sustain" | "revive" | "evergreen";

export interface PhaseConfig {
  name: CampaignPhase;
  label: string;
  dayRange: [number, number]; // days from campaign start
  postsPerDay: { min: number; max: number };
  contentTypes: ContentType[];
  platformPriority: string[];
  hashtagStrategy: "niche" | "broad" | "mixed";
  ctaIntensity: "soft" | "medium" | "hard";
  description: string;
}

export type ContentType =
  | "teaser"
  | "hero_clip"
  | "behind_the_scenes"
  | "quote_card"
  | "review_highlight"
  | "audience_question"
  | "poll"
  | "countdown"
  | "cta_direct"
  | "milestone"
  | "repost"
  | "press_mention"
  | "cast_feature"
  | "trivia";

export interface StagedPost {
  day: number;
  phase: CampaignPhase;
  platform: string;
  contentType: ContentType;
  suggestedTime: string; // "HH:MM" in campaign timezone
  captionPrompt: string; // instruction for AI to generate
  hashtagStrategy: "niche" | "broad" | "mixed";
  ctaIntensity: "soft" | "medium" | "hard";
  priority: "must_post" | "should_post" | "nice_to_have";
}

export interface CampaignStage {
  titleName: string;
  totalDays: number;
  phases: PhaseConfig[];
  schedule: StagedPost[];
  dailySummary: Array<{
    day: number;
    phase: CampaignPhase;
    postCount: number;
    platforms: string[];
  }>;
}

// ─── Phase Definitions ────────────────────────────────────────────────────────

const PHASE_CONFIGS: PhaseConfig[] = [
  {
    name: "seed",
    label: "Seed & Tease",
    dayRange: [1, 3],
    postsPerDay: { min: 1, max: 2 },
    contentTypes: ["teaser", "countdown", "audience_question"],
    platformPriority: ["tiktok", "instagram"],
    hashtagStrategy: "niche",
    ctaIntensity: "soft",
    description: "Build curiosity. No direct sell. Just intrigue.",
  },
  {
    name: "launch",
    label: "Main Launch",
    dayRange: [4, 7],
    postsPerDay: { min: 2, max: 3 },
    contentTypes: ["hero_clip", "cta_direct", "review_highlight", "quote_card"],
    platformPriority: ["tiktok", "instagram", "twitter"],
    hashtagStrategy: "broad",
    ctaIntensity: "hard",
    description: "Maximum push. Hero content, clear CTAs, all platforms.",
  },
  {
    name: "sustain",
    label: "Sustain & Engage",
    dayRange: [8, 14],
    postsPerDay: { min: 1, max: 2 },
    contentTypes: ["behind_the_scenes", "poll", "trivia", "cast_feature", "audience_question"],
    platformPriority: ["instagram", "tiktok", "twitter"],
    hashtagStrategy: "mixed",
    ctaIntensity: "medium",
    description: "Keep momentum. Varied content, encourage engagement.",
  },
  {
    name: "revive",
    label: "Revive & Extend",
    dayRange: [15, 21],
    postsPerDay: { min: 1, max: 1 },
    contentTypes: ["press_mention", "behind_the_scenes", "milestone", "repost"],
    platformPriority: ["instagram", "twitter"],
    hashtagStrategy: "niche",
    ctaIntensity: "soft",
    description: "Second wind. Press, milestones, fresh angles.",
  },
  {
    name: "evergreen",
    label: "Evergreen",
    dayRange: [22, 90],
    postsPerDay: { min: 0, max: 1 }, // not every day
    contentTypes: ["repost", "milestone", "trivia", "audience_question"],
    platformPriority: ["instagram"],
    hashtagStrategy: "niche",
    ctaIntensity: "soft",
    description: "Periodic touchpoints. Keep the title visible without oversaturating.",
  },
];

// ─── Optimal Posting Times by Platform ────────────────────────────────────────

const POSTING_TIMES: Record<string, string[]> = {
  tiktok: ["09:30", "12:00", "19:00", "21:00"],
  instagram: ["11:00", "13:00", "17:30", "20:00"],
  twitter: ["08:30", "12:30", "17:00"],
  youtube: ["14:00", "18:00"],
  facebook: ["10:00", "15:00", "19:00"],
};

// ─── Content Type Prompts ─────────────────────────────────────────────────────

const CONTENT_PROMPTS: Record<ContentType, string> = {
  teaser: "Create a mysterious, curiosity-building teaser. No plot details. Just mood and intrigue. End with a question.",
  hero_clip: "Write a punchy caption for the main trailer/clip. Highlight the most compelling aspect. Include clear CTA.",
  behind_the_scenes: "Share a behind-the-scenes moment. Make it personal and relatable. Show the human side of filmmaking.",
  quote_card: "Pick a powerful line of dialogue or a review quote. Frame it as a standalone moment.",
  review_highlight: "Highlight a positive review or audience reaction. Let others sell the film for you.",
  audience_question: "Ask the audience a question related to the film's themes. Drive comments and engagement.",
  poll: "Create a fun poll related to the film's genre or themes. Two clear options.",
  countdown: "Build anticipation with a countdown post. Create urgency without being pushy.",
  cta_direct: "Direct call-to-action. Tell people exactly where to watch and why they should watch NOW.",
  milestone: "Celebrate a milestone (views, streams, positive reviews). Thank the audience.",
  repost: "Reshare a top-performing post with a fresh caption or new context.",
  press_mention: "Share press coverage or festival recognition. Add context about what it means.",
  cast_feature: "Spotlight a cast or crew member. Share their perspective on the project.",
  trivia: "Share an interesting behind-the-scenes fact or trivia about the production.",
};

// ─── Stage Builder ────────────────────────────────────────────────────────────

/**
 * Generate a full campaign staging plan.
 * This is the blueprint Morgan uses to schedule posts over time.
 */
export function buildCampaignStage(
  titleName: string,
  platforms: string[] = ["instagram", "tiktok", "twitter"],
  totalDays = 30
): CampaignStage {
  const schedule: StagedPost[] = [];

  for (const phase of PHASE_CONFIGS) {
    const [startDay, endDay] = phase.dayRange;
    if (startDay > totalDays) break;

    const actualEnd = Math.min(endDay, totalDays);

    for (let day = startDay; day <= actualEnd; day++) {
      // Determine post count for this day
      const postCount = randomInRange(phase.postsPerDay.min, phase.postsPerDay.max);

      // For evergreen, only post every 3-5 days
      if (phase.name === "evergreen" && day % 4 !== 0) continue;

      // Filter platforms to those the user has
      const activePlatforms = phase.platformPriority.filter((p) => platforms.includes(p));
      if (activePlatforms.length === 0) continue;

      for (let i = 0; i < postCount; i++) {
        // Rotate platforms across posts
        const platform = activePlatforms[i % activePlatforms.length];
        const times = POSTING_TIMES[platform] ?? POSTING_TIMES.instagram;

        // Pick a content type (rotate through phase types)
        const contentType = phase.contentTypes[i % phase.contentTypes.length];

        // Pick posting time (with slight jitter for naturalness)
        const baseTime = times[i % times.length];
        const suggestedTime = addTimeJitter(baseTime, 15);

        schedule.push({
          day,
          phase: phase.name,
          platform,
          contentType,
          suggestedTime,
          captionPrompt: buildCaptionPrompt(titleName, contentType, phase),
          hashtagStrategy: phase.hashtagStrategy,
          ctaIntensity: phase.ctaIntensity,
          priority: i === 0 ? "must_post" : postCount > 2 ? "nice_to_have" : "should_post",
        });
      }
    }
  }

  // Build daily summary
  const dailySummary = buildDailySummary(schedule, totalDays);

  return {
    titleName,
    totalDays,
    phases: PHASE_CONFIGS.filter((p) => p.dayRange[0] <= totalDays),
    schedule,
    dailySummary,
  };
}

function buildCaptionPrompt(
  titleName: string,
  contentType: ContentType,
  phase: PhaseConfig
): string {
  const base = CONTENT_PROMPTS[contentType];
  const ctaNote = phase.ctaIntensity === "hard"
    ? " Include a strong call-to-action with the streaming link."
    : phase.ctaIntensity === "medium"
      ? " Include a gentle nudge to watch."
      : " No hard sell.";

  return `For "${titleName}": ${base}${ctaNote}`;
}

function buildDailySummary(
  schedule: StagedPost[],
  totalDays: number
): Array<{ day: number; phase: CampaignPhase; postCount: number; platforms: string[] }> {
  const summary: Array<{ day: number; phase: CampaignPhase; postCount: number; platforms: string[] }> = [];

  for (let day = 1; day <= totalDays; day++) {
    const dayPosts = schedule.filter((p) => p.day === day);
    if (dayPosts.length === 0) continue;

    summary.push({
      day,
      phase: dayPosts[0].phase,
      postCount: dayPosts.length,
      platforms: [...new Set(dayPosts.map((p) => p.platform))],
    });
  }

  return summary;
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function randomInRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function addTimeJitter(baseTime: string, maxMinutes: number): string {
  const [h, m] = baseTime.split(":").map(Number);
  const jitter = Math.floor(Math.random() * maxMinutes * 2) - maxMinutes;
  const totalMinutes = h * 60 + m + jitter;
  const newH = Math.max(0, Math.min(23, Math.floor(totalMinutes / 60)));
  const newM = Math.max(0, Math.min(59, totalMinutes % 60));
  return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
}

// ─── Phase Detection ──────────────────────────────────────────────────────────

/**
 * Determine which phase a campaign is currently in based on start date.
 */
export function getCurrentPhase(startDate: Date): {
  phase: PhaseConfig;
  dayNumber: number;
  daysRemaining: number;
} {
  const now = new Date();
  const dayNumber = Math.max(1, Math.ceil((now.getTime() - startDate.getTime()) / 86400000));

  const phase = PHASE_CONFIGS.find(
    (p) => dayNumber >= p.dayRange[0] && dayNumber <= p.dayRange[1]
  ) ?? PHASE_CONFIGS[PHASE_CONFIGS.length - 1];

  return {
    phase,
    dayNumber,
    daysRemaining: phase.dayRange[1] - dayNumber,
  };
}

/**
 * Get today's scheduled posts from a campaign stage.
 */
export function getTodaysPosts(
  stage: CampaignStage,
  startDate: Date
): StagedPost[] {
  const { dayNumber } = getCurrentPhase(startDate);
  return stage.schedule.filter((p) => p.day === dayNumber);
}

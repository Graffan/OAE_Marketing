/**
 * Human-Like Social Posting Service
 *
 * Makes automated posts appear natural to platform AI monitoring.
 * Applies timing jitter, content variation, and behavioral patterns
 * that mimic real human social media managers.
 *
 * Key anti-detection strategies:
 * 1. Timing jitter — posts land ±1-8 minutes off schedule (humans aren't precise)
 * 2. Content variation — slight randomization of emoji placement, hashtag order, line breaks
 * 3. Platform-native patterns — different behavior per platform (IG captions vs TikTok style)
 * 4. Rate limiting — max posts per hour/day with natural spacing
 * 5. Session warmth — vary posting cadence throughout the day
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HumanizedPost {
  caption: string;
  hashtags: string[];
  postingDelay: number; // milliseconds to wait before actually posting
  bestTimeSlot: string; // suggested time window
  platformTips: string[];
}

export interface PlatformLimits {
  maxPostsPerHour: number;
  maxPostsPerDay: number;
  minSecondsBetweenPosts: number;
  maxCaptionLength: number;
  maxHashtags: number;
}

// ─── Platform Limits (conservative to avoid flags) ────────────────────────────

const PLATFORM_LIMITS: Record<string, PlatformLimits> = {
  instagram: {
    maxPostsPerHour: 2,
    maxPostsPerDay: 8,
    minSecondsBetweenPosts: 900, // 15 min minimum
    maxCaptionLength: 2200,
    maxHashtags: 30,
  },
  tiktok: {
    maxPostsPerHour: 2,
    maxPostsPerDay: 6,
    minSecondsBetweenPosts: 1200, // 20 min minimum
    maxCaptionLength: 4000,
    maxHashtags: 5, // TikTok penalizes hashtag spam
  },
  twitter: {
    maxPostsPerHour: 4,
    maxPostsPerDay: 20,
    minSecondsBetweenPosts: 300, // 5 min minimum
    maxCaptionLength: 280,
    maxHashtags: 3,
  },
  youtube: {
    maxPostsPerHour: 1,
    maxPostsPerDay: 3,
    minSecondsBetweenPosts: 3600, // 1 hour minimum
    maxCaptionLength: 5000,
    maxHashtags: 15,
  },
  facebook: {
    maxPostsPerHour: 2,
    maxPostsPerDay: 5,
    minSecondsBetweenPosts: 1800, // 30 min minimum
    maxCaptionLength: 63206,
    maxHashtags: 10,
  },
};

// ─── Timing Humanization ──────────────────────────────────────────────────────

/**
 * Add realistic jitter to a scheduled time.
 * Real social media managers don't post at exactly :00 or :30.
 * Returns delay in milliseconds.
 */
export function calculatePostingDelay(): number {
  // Base jitter: 1-8 minutes (humans are imprecise)
  const baseJitterMs = (60 + Math.random() * 420) * 1000;

  // Occasional longer delays (5% chance of 8-15 minute delay — "got distracted")
  const longDelay = Math.random() < 0.05
    ? (480 + Math.random() * 420) * 1000
    : 0;

  return Math.round(baseJitterMs + longDelay);
}

/**
 * Best posting times by platform (US entertainment audience).
 * Returns optimal time slots based on platform and day of week.
 */
export function getBestPostingWindow(platform: string): {
  windows: Array<{ start: number; end: number; label: string }>;
  timezone: string;
} {
  const dayOfWeek = new Date().getDay(); // 0=Sun
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  const windows: Record<string, Array<{ start: number; end: number; label: string }>> = {
    instagram: isWeekend
      ? [
          { start: 10, end: 12, label: "Late morning (weekend browsing)" },
          { start: 19, end: 21, label: "Evening wind-down" },
        ]
      : [
          { start: 11, end: 13, label: "Lunch break scroll" },
          { start: 17, end: 19, label: "Post-work commute" },
          { start: 20, end: 22, label: "Evening couch time" },
        ],
    tiktok: [
      { start: 9, end: 11, label: "Morning scroll" },
      { start: 12, end: 14, label: "Lunch break" },
      { start: 19, end: 23, label: "Prime evening (highest engagement)" },
    ],
    twitter: [
      { start: 8, end: 10, label: "Morning news cycle" },
      { start: 12, end: 13, label: "Lunch takes" },
      { start: 17, end: 19, label: "Post-work discourse" },
    ],
    youtube: [
      { start: 14, end: 16, label: "Afternoon upload (indexes before evening)" },
      { start: 18, end: 20, label: "Evening premiere slot" },
    ],
  };

  return {
    windows: windows[platform] ?? windows.instagram,
    timezone: "America/New_York",
  };
}

// ─── Content Humanization ─────────────────────────────────────────────────────

/**
 * Apply human-like variations to a caption.
 * Platforms detect bot-like uniformity — this adds natural variation.
 */
export function humanizeCaption(
  caption: string,
  platform: string
): string {
  const limits = PLATFORM_LIMITS[platform] ?? PLATFORM_LIMITS.instagram;
  let result = caption;

  // Vary line break style (some people double-space, some don't)
  if (Math.random() > 0.5) {
    result = result.replace(/\n\n/g, "\n.\n");
  }

  // Occasionally add/remove trailing period (humans are inconsistent)
  if (Math.random() > 0.7) {
    if (result.endsWith(".")) {
      result = result.slice(0, -1);
    } else if (!result.endsWith("!") && !result.endsWith("?")) {
      result = result + ".";
    }
  }

  // Truncate to platform limit
  if (result.length > limits.maxCaptionLength) {
    result = result.slice(0, limits.maxCaptionLength - 3) + "...";
  }

  return result;
}

/**
 * Shuffle and limit hashtags per platform best practices.
 * Consistent hashtag ordering is a bot signal.
 */
export function humanizeHashtags(
  hashtags: string[],
  platform: string
): string[] {
  const limits = PLATFORM_LIMITS[platform] ?? PLATFORM_LIMITS.instagram;

  // Shuffle order (humans don't alphabetize)
  const shuffled = [...hashtags].sort(() => Math.random() - 0.5);

  // Limit to platform max
  const limited = shuffled.slice(0, limits.maxHashtags);

  // Occasionally drop 1-2 hashtags (humans are inconsistent)
  if (limited.length > 3 && Math.random() > 0.6) {
    const dropCount = Math.random() > 0.7 ? 2 : 1;
    return limited.slice(0, limited.length - dropCount);
  }

  return limited;
}

/**
 * Format hashtags for a specific platform.
 */
export function formatHashtagsForPlatform(
  hashtags: string[],
  platform: string
): string {
  const humanized = humanizeHashtags(hashtags, platform);

  switch (platform) {
    case "instagram":
      // IG: hashtags in a comment or at the end after line breaks
      return "\n.\n.\n.\n" + humanized.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ");
    case "tiktok":
      // TikTok: inline, fewer tags, no dot spacers
      return " " + humanized.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ");
    case "twitter":
      // Twitter: inline, very few
      return " " + humanized.slice(0, 3).map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ");
    default:
      return " " + humanized.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ");
  }
}

// ─── Rate Limiting ────────────────────────────────────────────────────────────

// In-memory tracking of recent posts per platform (resets on server restart)
const recentPosts: Map<string, number[]> = new Map();

/**
 * Check if posting is safe (within rate limits).
 * Returns delay in ms to wait, or 0 if safe to post now.
 */
export function checkRateLimit(platform: string): {
  canPost: boolean;
  waitMs: number;
  reason?: string;
} {
  const limits = PLATFORM_LIMITS[platform] ?? PLATFORM_LIMITS.instagram;
  const key = platform;
  const now = Date.now();
  const timestamps = recentPosts.get(key) ?? [];

  // Clean old timestamps (keep last 24h)
  const dayAgo = now - 86400000;
  const recent = timestamps.filter((t) => t > dayAgo);
  recentPosts.set(key, recent);

  // Check daily limit
  if (recent.length >= limits.maxPostsPerDay) {
    return {
      canPost: false,
      waitMs: 0,
      reason: `Daily limit reached (${limits.maxPostsPerDay} posts/day on ${platform})`,
    };
  }

  // Check hourly limit
  const hourAgo = now - 3600000;
  const lastHour = recent.filter((t) => t > hourAgo);
  if (lastHour.length >= limits.maxPostsPerHour) {
    const oldestInHour = Math.min(...lastHour);
    const waitMs = oldestInHour + 3600000 - now;
    return {
      canPost: false,
      waitMs,
      reason: `Hourly limit reached. Wait ${Math.ceil(waitMs / 60000)} minutes.`,
    };
  }

  // Check minimum spacing
  if (recent.length > 0) {
    const lastPost = Math.max(...recent);
    const elapsed = (now - lastPost) / 1000;
    if (elapsed < limits.minSecondsBetweenPosts) {
      const waitMs = (limits.minSecondsBetweenPosts - elapsed) * 1000;
      return {
        canPost: false,
        waitMs,
        reason: `Too soon. Wait ${Math.ceil(waitMs / 60000)} minutes between posts.`,
      };
    }
  }

  return { canPost: true, waitMs: 0 };
}

/**
 * Record that a post was made (for rate limiting).
 */
export function recordPost(platform: string): void {
  const key = platform;
  const timestamps = recentPosts.get(key) ?? [];
  recentPosts.set(key, [...timestamps, Date.now()]);
}

// ─── Full Humanization Pipeline ───────────────────────────────────────────────

/**
 * Prepare a post for human-like publishing.
 * Takes raw content and returns humanized version with timing guidance.
 */
export function humanizePost(
  caption: string,
  hashtags: string[],
  platform: string
): HumanizedPost {
  const humanizedCaption = humanizeCaption(caption, platform);
  const humanizedHashtags = humanizeHashtags(hashtags, platform);
  const formattedTags = formatHashtagsForPlatform(humanizedHashtags, platform);
  const delay = calculatePostingDelay();
  const { windows } = getBestPostingWindow(platform);
  const bestSlot = windows[0]?.label ?? "Any time";

  const tips: string[] = [];

  // Platform-specific tips
  switch (platform) {
    case "instagram":
      tips.push("Post hashtags as first comment (not in caption) to look cleaner");
      tips.push("Engage with 3-5 similar accounts within 15 min after posting");
      tips.push("Respond to comments within the first hour (algorithm boost)");
      break;
    case "tiktok":
      tips.push("Use 3-5 hashtags max — TikTok penalizes hashtag stuffing");
      tips.push("First 3 seconds determine watch-through — hook immediately");
      tips.push("Post consistently at the same 2-3 times daily");
      break;
    case "twitter":
      tips.push("Quote-tweet your own post 2-4 hours later with additional context");
      tips.push("Engage in replies on trending topics before posting");
      tips.push("Threads outperform single tweets for complex topics");
      break;
    case "youtube":
      tips.push("Upload 2-3 hours before peak viewing for indexing");
      tips.push("Custom thumbnail is critical — faces with emotion perform best");
      tips.push("First 48 hours determine algorithmic reach");
      break;
  }

  return {
    caption: humanizedCaption + formattedTags,
    hashtags: humanizedHashtags,
    postingDelay: delay,
    bestTimeSlot: bestSlot,
    platformTips: tips,
  };
}

/**
 * Generate a set of caption variations for A/B testing.
 * Different phrasings prevent platform-detected repetition.
 */
export function generateCaptionVariations(
  baseCaption: string,
  count = 3
): string[] {
  const variations: string[] = [baseCaption];

  // Sentence starters to rotate
  const starters = [
    "",
    "Just dropped — ",
    "Now streaming — ",
    "Have you seen this? ",
    "This one hits different. ",
    "Still thinking about this. ",
  ];

  // CTA variations
  const ctas = [
    "",
    "\n\nLink in bio.",
    "\n\nStreaming now — link in bio.",
    "\n\nWatch free — link in bio.",
    "\n\nFree on Tubi.",
  ];

  for (let i = 1; i < count; i++) {
    const starter = starters[Math.floor(Math.random() * starters.length)];
    const cta = ctas[Math.floor(Math.random() * ctas.length)];
    variations.push(starter + baseCaption + cta);
  }

  return variations;
}

// ─── Entertainment Industry Hashtag Sets ──────────────────────────────────────

export const ENTERTAINMENT_HASHTAGS: Record<string, string[]> = {
  indieFilm: [
    "indiefilm", "independentfilm", "supportindiefilm", "indiecinema",
    "filmmaking", "filmmaker", "cinema", "movienight",
  ],
  horror: [
    "horrorfilm", "horrorcommunity", "horrorjunkie", "scarymovies",
    "horrorfan", "darkcinema", "horrormovies",
  ],
  thriller: [
    "thriller", "thrillermovie", "suspense", "psychologicalthriller",
    "crimemovie", "crimethriller", "darkthriller",
  ],
  streaming: [
    "nowstreaming", "streamingmovies", "tubi", "freemovies",
    "watchnow", "movierecommendation", "whattowatch",
  ],
  general: [
    "film", "movie", "movies", "cinema", "cinephile",
    "movielovers", "filmlover", "movietime",
  ],
};

/**
 * Build a hashtag set from genre + platform context.
 */
export function buildHashtagSet(
  genres: string[],
  platform: string,
  customTags: string[] = []
): string[] {
  const limits = PLATFORM_LIMITS[platform] ?? PLATFORM_LIMITS.instagram;
  const allTags: string[] = [...customTags];

  // Add genre-specific tags
  for (const genre of genres) {
    const key = genre.toLowerCase();
    const genreTags = ENTERTAINMENT_HASHTAGS[key] ?? ENTERTAINMENT_HASHTAGS.general;
    allTags.push(...genreTags);
  }

  // Always include streaming tags for free content
  allTags.push(...ENTERTAINMENT_HASHTAGS.streaming.slice(0, 3));

  // Deduplicate and limit
  const unique = [...new Set(allTags)];
  return unique.slice(0, limits.maxHashtags);
}

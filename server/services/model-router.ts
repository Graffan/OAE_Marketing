/**
 * Smart Model Router — Minimizes API costs by routing tasks intelligently.
 *
 * Strategy:
 * - LOCAL (Ollama): Drafts, brainstorming, hashtags, scheduling, routine chat,
 *   memory extraction, daily scans, internal summaries
 * - API (Claude/OpenAI): Final client-facing copy, complex campaign analysis,
 *   tasks the user explicitly requests high quality for
 *
 * Morgan tells the user which model is handling what, and the user
 * can override to force API when they want premium quality.
 */

import { getFullAppSettings } from "../storage.js";
import type { AppSettings } from "@shared/schema.js";

// ─── Task Classification ──────────────────────────────────────────────────────

export type TaskTier = "local" | "api" | "user_choice";

export interface TaskRoute {
  tier: TaskTier;
  reason: string;
  suggestedProvider: string;
  suggestedModel: string;
  alternativeProvider?: string;
  alternativeModel?: string;
  estimatedTokens: number;
}

/**
 * Tasks classified by quality requirements.
 * LOCAL = fast, free, good enough for internal/draft work
 * API = needs highest quality for external-facing output
 */
const TASK_CLASSIFICATIONS: Record<string, TaskTier> = {
  // LOCAL — drafts, internal, brainstorming
  morgan_chat: "local",
  memory_extraction: "local",
  morning_scan: "local",
  content_draft: "local", // first drafts are local
  hashtag_generation: "local",
  caption_variation: "local",
  scheduling_suggestion: "local",
  trend_analysis: "local",
  competitor_summary: "local",
  daily_digest: "local",
  weekly_review: "local",
  experiment_analysis: "local",
  web_research_summary: "local",

  // API — final output, complex analysis
  campaign_brief: "api", // client-facing briefs need quality
  clip_to_post: "api", // final social copy
  territory_assistant: "api", // regional strategy
  catalog_revival: "api", // revival campaigns
  performance_summarizer: "api", // executive summaries
  content_final: "api", // polished, publish-ready copy
  sentiment_analysis: "api", // nuanced analysis

  // USER_CHOICE — could go either way
  content_review: "user_choice",
  campaign_strategy: "user_choice",
};

// ─── Model Recommendations for Proxmox CT ─────────────────────────────────────

export interface ModelRecommendation {
  name: string;
  ollamaTag: string;
  sizeMb: number;
  ramRequired: string;
  speed: "fast" | "medium" | "slow";
  quality: "basic" | "good" | "great";
  bestFor: string;
  recommended: boolean;
}

/**
 * Models ranked for a resource-constrained Proxmox CT.
 * Prioritizes small + fast over large + smart.
 */
export const RECOMMENDED_MODELS: ModelRecommendation[] = [
  {
    name: "Qwen 2.5 3B",
    ollamaTag: "qwen2.5:3b",
    sizeMb: 1900,
    ramRequired: "4 GB",
    speed: "fast",
    quality: "good",
    bestFor: "Best balance of speed and quality for marketing copy. Recommended for Proxmox.",
    recommended: true,
  },
  {
    name: "Phi-3 Mini",
    ollamaTag: "phi3:mini",
    sizeMb: 2300,
    ramRequired: "4 GB",
    speed: "fast",
    quality: "good",
    bestFor: "Microsoft's small model. Strong at structured tasks, hashtags, scheduling.",
    recommended: true,
  },
  {
    name: "Gemma 2 2B",
    ollamaTag: "gemma2:2b",
    sizeMb: 1600,
    ramRequired: "3 GB",
    speed: "fast",
    quality: "basic",
    bestFor: "Smallest option. Fast but less creative. Good for hashtags and simple tasks.",
    recommended: false,
  },
  {
    name: "Llama 3.1 8B",
    ollamaTag: "llama3.1:8b",
    sizeMb: 4900,
    ramRequired: "8 GB",
    speed: "medium",
    quality: "great",
    bestFor: "Best quality local model. Needs more RAM. Use if Proxmox CT has 8GB+.",
    recommended: false,
  },
  {
    name: "Mistral 7B",
    ollamaTag: "mistral:7b",
    sizeMb: 4100,
    ramRequired: "6 GB",
    speed: "medium",
    quality: "great",
    bestFor: "Excellent for marketing copy and creative writing. Needs 6GB+ RAM.",
    recommended: false,
  },
];

// ─── Smart Routing ────────────────────────────────────────────────────────────

/**
 * Determine which model should handle a task.
 * Returns routing decision with explanation for Morgan to relay to user.
 */
export async function routeTask(
  taskName: string,
  options: {
    forceApi?: boolean;
    forceLocal?: boolean;
    qualityOverride?: "draft" | "final";
  } = {}
): Promise<TaskRoute> {
  const settings = await getFullAppSettings();
  if (!settings) {
    return {
      tier: "local",
      reason: "No settings found, defaulting to local model",
      suggestedProvider: "ollama",
      suggestedModel: "llama3.1:8b",
      estimatedTokens: 0,
    };
  }

  // User overrides
  if (options.forceApi) {
    return buildApiRoute(settings, taskName, "User requested API-quality output");
  }
  if (options.forceLocal) {
    return buildLocalRoute(settings, taskName, "User requested local processing");
  }

  // Quality override (draft vs final)
  if (options.qualityOverride === "final") {
    return buildApiRoute(settings, taskName, "Final/publish-ready content needs API quality");
  }
  if (options.qualityOverride === "draft") {
    return buildLocalRoute(settings, taskName, "Draft content — local model is fine");
  }

  // Classify by task type
  const tier = TASK_CLASSIFICATIONS[taskName] ?? "local";

  switch (tier) {
    case "local":
      return buildLocalRoute(
        settings,
        taskName,
        `"${taskName}" is a draft/internal task — using free local model`
      );
    case "api":
      return hasAnyApiKey(settings)
        ? buildApiRoute(settings, taskName, `"${taskName}" is publish-quality — using API for best results`)
        : buildLocalRoute(settings, taskName, `"${taskName}" would benefit from API, but no keys configured — using local`);
    case "user_choice":
      return buildLocalRoute(
        settings,
        taskName,
        `"${taskName}" can go either way — defaulting to local (free). Say "use API" for premium quality.`
      );
    default:
      return buildLocalRoute(settings, taskName, "Unknown task — defaulting to local");
  }
}

function buildLocalRoute(settings: AppSettings, taskName: string, reason: string): TaskRoute {
  const model = settings.ollamaModel ?? "llama3.1:8b";
  const apiProvider = getFirstAvailableApiProvider(settings);

  return {
    tier: "local",
    reason,
    suggestedProvider: "ollama",
    suggestedModel: model,
    ...(apiProvider ? {
      alternativeProvider: apiProvider.provider,
      alternativeModel: apiProvider.model,
    } : {}),
    estimatedTokens: estimateTokens(taskName),
  };
}

function buildApiRoute(settings: AppSettings, taskName: string, reason: string): TaskRoute {
  const apiProvider = getFirstAvailableApiProvider(settings);
  const localModel = settings.ollamaModel ?? "llama3.1:8b";

  if (!apiProvider) {
    return {
      tier: "local",
      reason: `${reason} — but no API keys configured, falling back to local`,
      suggestedProvider: "ollama",
      suggestedModel: localModel,
      estimatedTokens: estimateTokens(taskName),
    };
  }

  return {
    tier: "api",
    reason,
    suggestedProvider: apiProvider.provider,
    suggestedModel: apiProvider.model,
    alternativeProvider: "ollama",
    alternativeModel: localModel,
    estimatedTokens: estimateTokens(taskName),
  };
}

function hasAnyApiKey(settings: AppSettings): boolean {
  return !!(settings.claudeApiKey || settings.openaiApiKey || settings.deepseekApiKey);
}

function getFirstAvailableApiProvider(
  settings: AppSettings
): { provider: string; model: string } | null {
  if (settings.claudeApiKey) {
    return { provider: "claude", model: settings.claudeModel ?? "claude-sonnet-4-6" };
  }
  if (settings.openaiApiKey) {
    return { provider: "openai", model: settings.openaiModel ?? "gpt-4o" };
  }
  if (settings.deepseekApiKey) {
    return { provider: "deepseek", model: settings.deepseekModel ?? "deepseek-chat" };
  }
  return null;
}

function estimateTokens(taskName: string): number {
  const estimates: Record<string, number> = {
    morgan_chat: 800,
    memory_extraction: 300,
    morning_scan: 1500,
    content_draft: 1000,
    hashtag_generation: 200,
    caption_variation: 400,
    campaign_brief: 2000,
    clip_to_post: 1500,
    territory_assistant: 1500,
    catalog_revival: 2000,
    performance_summarizer: 1500,
    content_final: 1200,
    sentiment_analysis: 1000,
    weekly_review: 2500,
    daily_digest: 1000,
  };
  return estimates[taskName] ?? 500;
}

// ─── Token Budget Tracking ────────────────────────────────────────────────────

interface TokenBudget {
  dailyApiTokensUsed: number;
  dailyApiTokensCap: number;
  localTokensUsed: number; // tracked but no cap (free)
  percentUsed: number;
  shouldThrottle: boolean;
}

// In-memory daily tracking (resets on server restart or midnight)
let dailyApiTokens = 0;
let dailyLocalTokens = 0;
let lastResetDate = new Date().toDateString();

function resetIfNewDay(): void {
  const today = new Date().toDateString();
  if (today !== lastResetDate) {
    dailyApiTokens = 0;
    dailyLocalTokens = 0;
    lastResetDate = today;
  }
}

export function recordTokenUsage(provider: string, tokens: number): void {
  resetIfNewDay();
  if (provider === "ollama") {
    dailyLocalTokens += tokens;
  } else {
    dailyApiTokens += tokens;
  }
}

export async function getTokenBudget(): Promise<TokenBudget> {
  resetIfNewDay();
  const settings = await getFullAppSettings();
  const cap = settings?.aiDailyTokenCap ?? 100000;
  const percentUsed = cap > 0 ? Math.round((dailyApiTokens / cap) * 100) : 0;

  return {
    dailyApiTokensUsed: dailyApiTokens,
    dailyApiTokensCap: cap,
    localTokensUsed: dailyLocalTokens,
    percentUsed,
    shouldThrottle: percentUsed > 80,
  };
}

// ─── Morgan's Model Report ────────────────────────────────────────────────────

/**
 * Generate a human-readable summary for Morgan to tell the user
 * about which model is handling what and why.
 */
export function formatRouteExplanation(route: TaskRoute): string {
  const provider = route.suggestedProvider === "ollama"
    ? `local model (${route.suggestedModel})`
    : `${route.suggestedProvider} API (${route.suggestedModel})`;

  let explanation = `Using ${provider}. ${route.reason}`;

  if (route.alternativeProvider) {
    const alt = route.alternativeProvider === "ollama"
      ? `local (${route.alternativeModel})`
      : `${route.alternativeProvider} (${route.alternativeModel})`;
    explanation += ` Alternative: ${alt}.`;
  }

  return explanation;
}

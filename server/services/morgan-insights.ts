/**
 * Morgan Insights Engine — Persistent learning and experiment loops.
 *
 * Patterns from: Pi-AutoResearch (autonomous experiment loops),
 * A-Mem (self-organizing memory with linking), OpenClaw (skill registry).
 *
 * Provides:
 * 1. Insights log — append-only record of what Morgan learns
 * 2. Campaign experiment loop — hypothesize → measure → retain/discard
 * 3. Strategy memory — cross-campaign learnings that persist
 * 4. Memory decay — older, lower-importance memories fade
 * 5. Memory linking — connect related insights across campaigns
 */

import {
  getMorganMemories,
  createMorganMemory,
  updateMorganMemory,
  getScheduledPosts,
  getCampaigns,
  getAnalyticsDashboardSummary,
} from "../storage.js";
import type { MorganMemory } from "@shared/schema.js";
import { appendFile, readFile, mkdir } from "fs/promises";
import { join } from "path";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InsightEntry {
  id: string;
  timestamp: string;
  type: "observation" | "hypothesis" | "experiment_result" | "strategy_update" | "trend_alert";
  category: string; // e.g. "platform_performance", "content_type", "timing", "audience"
  content: string;
  metrics?: Record<string, number>;
  status: "active" | "validated" | "invalidated" | "superseded";
  linkedInsightIds: string[];
  source: string; // what triggered this insight
}

export interface Experiment {
  id: string;
  hypothesis: string;
  metric: string; // what we're measuring
  baselineValue: number;
  targetValue: number;
  startedAt: string;
  measuredAt?: string;
  currentValue?: number;
  status: "running" | "success" | "failed" | "inconclusive";
  conclusion?: string;
}

export interface StrategyPlaybook {
  lastUpdated: string;
  activeStrategies: Array<{
    platform: string;
    bestContentType: string;
    bestPostTime: string;
    avgEngagement: number;
    confidence: "low" | "medium" | "high";
    basedOnExperiments: number;
  }>;
  experimentHistory: Experiment[];
}

// ─── Insights Log (Append-Only, Pi-AutoResearch pattern) ──────────────────────

const DATA_DIR = join(process.cwd(), "data");
const INSIGHTS_FILE = join(DATA_DIR, "morgan-insights.jsonl");
const PLAYBOOK_FILE = join(DATA_DIR, "morgan-playbook.json");

async function ensureDataDir(): Promise<void> {
  try {
    await mkdir(DATA_DIR, { recursive: true });
  } catch {
    // directory exists
  }
}

/**
 * Append an insight to the persistent log.
 * JSONL format — one JSON object per line, append-only.
 */
export async function logInsight(entry: Omit<InsightEntry, "id" | "timestamp">): Promise<InsightEntry> {
  await ensureDataDir();

  const insight: InsightEntry = {
    ...entry,
    id: `insight_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
  };

  await appendFile(INSIGHTS_FILE, JSON.stringify(insight) + "\n");

  // Also store high-importance insights as Morgan memories for chat context
  if (entry.type === "strategy_update" || entry.type === "experiment_result") {
    await createMorganMemory({
      type: "learning",
      content: `[${entry.category}] ${entry.content}`,
      importance: entry.status === "validated" ? 8 : 5,
      source: "insights_engine",
      userId: null,
    });
  }

  return insight;
}

/**
 * Read all insights from the persistent log.
 */
export async function readInsights(): Promise<InsightEntry[]> {
  try {
    const content = await readFile(INSIGHTS_FILE, "utf-8");
    return content
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  } catch {
    return []; // file doesn't exist yet
  }
}

/**
 * Get recent insights filtered by type or category.
 */
export async function getRecentInsights(
  filters: { type?: string; category?: string; limit?: number } = {}
): Promise<InsightEntry[]> {
  const all = await readInsights();
  const { type, category, limit = 20 } = filters;

  return all
    .filter((i) => (!type || i.type === type) && (!category || i.category === category))
    .slice(-limit);
}

// ─── Experiment Loop (Pi-AutoResearch pattern) ────────────────────────────────

/**
 * Load or initialize the strategy playbook.
 */
async function loadPlaybook(): Promise<StrategyPlaybook> {
  try {
    const content = await readFile(PLAYBOOK_FILE, "utf-8");
    return JSON.parse(content);
  } catch {
    return {
      lastUpdated: new Date().toISOString(),
      activeStrategies: [],
      experimentHistory: [],
    };
  }
}

async function savePlaybook(playbook: StrategyPlaybook): Promise<void> {
  await ensureDataDir();
  const { writeFile } = await import("fs/promises");
  await writeFile(PLAYBOOK_FILE, JSON.stringify(playbook, null, 2));
}

/**
 * Start a new experiment — Morgan hypothesizes and we measure.
 *
 * Example: "Instagram posts with behind-the-scenes content at 6pm
 * get higher engagement than promotional posts at noon"
 */
export async function startExperiment(
  hypothesis: string,
  metric: string,
  baselineValue: number,
  targetValue: number
): Promise<Experiment> {
  const experiment: Experiment = {
    id: `exp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    hypothesis,
    metric,
    baselineValue,
    targetValue,
    startedAt: new Date().toISOString(),
    status: "running",
  };

  const playbook = await loadPlaybook();
  const updatedPlaybook: StrategyPlaybook = {
    ...playbook,
    lastUpdated: new Date().toISOString(),
    experimentHistory: [...playbook.experimentHistory, experiment],
  };
  await savePlaybook(updatedPlaybook);

  await logInsight({
    type: "hypothesis",
    category: "experiment",
    content: `Started experiment: ${hypothesis}. Measuring: ${metric}. Baseline: ${baselineValue}, Target: ${targetValue}`,
    metrics: { baseline: baselineValue, target: targetValue },
    status: "active",
    linkedInsightIds: [],
    source: "experiment_engine",
  });

  return experiment;
}

/**
 * Measure an experiment's result and decide: retain or discard.
 */
export async function measureExperiment(
  experimentId: string,
  currentValue: number
): Promise<Experiment> {
  const playbook = await loadPlaybook();
  const expIndex = playbook.experimentHistory.findIndex((e) => e.id === experimentId);

  if (expIndex === -1) throw new Error(`Experiment ${experimentId} not found`);

  const exp = playbook.experimentHistory[expIndex];
  const improved = currentValue >= exp.targetValue;
  const unchanged = Math.abs(currentValue - exp.baselineValue) < exp.baselineValue * 0.05;

  const updatedExp: Experiment = {
    ...exp,
    measuredAt: new Date().toISOString(),
    currentValue,
    status: improved ? "success" : unchanged ? "inconclusive" : "failed",
    conclusion: improved
      ? `Hypothesis validated: ${exp.metric} improved from ${exp.baselineValue} to ${currentValue} (target was ${exp.targetValue})`
      : unchanged
        ? `Inconclusive: ${exp.metric} stayed at ${currentValue} (baseline ${exp.baselineValue})`
        : `Hypothesis invalidated: ${exp.metric} is ${currentValue}, below baseline of ${exp.baselineValue}`,
  };

  const updatedHistory = [...playbook.experimentHistory];
  updatedHistory[expIndex] = updatedExp;

  await savePlaybook({
    ...playbook,
    lastUpdated: new Date().toISOString(),
    experimentHistory: updatedHistory,
  });

  await logInsight({
    type: "experiment_result",
    category: "experiment",
    content: updatedExp.conclusion ?? "",
    metrics: {
      baseline: exp.baselineValue,
      target: exp.targetValue,
      actual: currentValue,
    },
    status: improved ? "validated" : "invalidated",
    linkedInsightIds: [],
    source: "experiment_engine",
  });

  return updatedExp;
}

// ─── Memory Decay & Self-Organization ─────────────────────────────────────────

/**
 * Run memory maintenance — decay old memories, consolidate duplicates.
 *
 * Pattern from A-Mem: the agent decides what to remember and what to let go.
 * Lower-importance memories that haven't been accessed decay over time.
 */
export async function runMemoryMaintenance(): Promise<{
  decayed: number;
  consolidated: number;
}> {
  const memories = await getMorganMemories({ limit: 200 });
  let decayed = 0;
  let consolidated = 0;

  const now = Date.now();
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
  const NINETY_DAYS = 90 * 24 * 60 * 60 * 1000;

  for (const mem of memories as MorganMemory[]) {
    const age = now - new Date(mem.createdAt!).getTime();

    // Decay: reduce importance of old, low-importance memories
    if (age > THIRTY_DAYS && mem.importance <= 3) {
      await updateMorganMemory(mem.id, { importance: Math.max(1, mem.importance - 1) });
      decayed++;
    }

    // Expire: set expiration on very old, low-importance memories
    if (age > NINETY_DAYS && mem.importance <= 2 && !mem.expiresAt) {
      await updateMorganMemory(mem.id, {
        expiresAt: new Date(now + 7 * 24 * 60 * 60 * 1000), // expire in 7 days
      });
      decayed++;
    }
  }

  // Consolidation: find duplicate/similar memories by checking content overlap
  const memoryMap = new Map<string, MorganMemory[]>();
  for (const mem of memories as MorganMemory[]) {
    // Simple key: first 50 chars lowercase
    const key = mem.content.toLowerCase().slice(0, 50);
    const group = memoryMap.get(key) ?? [];
    memoryMap.set(key, [...group, mem]);
  }

  for (const [, group] of memoryMap) {
    if (group.length > 1) {
      // Keep the highest-importance one, decay the rest
      const sorted = [...group].sort((a, b) => b.importance - a.importance);
      for (const dup of sorted.slice(1)) {
        await updateMorganMemory(dup.id, { importance: Math.max(1, dup.importance - 2) });
        consolidated++;
      }
    }
  }

  if (decayed > 0 || consolidated > 0) {
    console.log(`[Morgan Insights] Memory maintenance: ${decayed} decayed, ${consolidated} consolidated`);
  }

  return { decayed, consolidated };
}

// ─── Campaign Performance Analysis ───────────────────────────────────────────

/**
 * Analyze recent campaign performance and generate insights.
 * Called during Morgan's evening digest or weekly review.
 */
export async function analyzeCampaignPerformance(): Promise<InsightEntry[]> {
  const [posts, campaigns, dashboard] = await Promise.all([
    getScheduledPosts({ status: "published" }),
    getCampaigns(),
    getAnalyticsDashboardSummary(),
  ]);

  const publishedPosts = posts as any[];
  const insights: InsightEntry[] = [];

  // Platform performance breakdown
  const platformStats = new Map<string, { count: number; published: number; failed: number }>();

  for (const post of publishedPosts) {
    const platform = post.platform ?? "unknown";
    const current = platformStats.get(platform) ?? { count: 0, published: 0, failed: 0 };
    platformStats.set(platform, {
      count: current.count + 1,
      published: current.published + (post.status === "published" ? 1 : 0),
      failed: current.failed + (post.status === "failed" ? 1 : 0),
    });
  }

  for (const [platform, stats] of platformStats) {
    const successRate = stats.count > 0 ? (stats.published / stats.count) * 100 : 0;

    if (successRate < 80 && stats.count >= 3) {
      const insight = await logInsight({
        type: "observation",
        category: "platform_performance",
        content: `${platform} has a ${successRate.toFixed(0)}% success rate (${stats.published}/${stats.count} posts). May need connection review.`,
        metrics: { successRate, totalPosts: stats.count },
        status: "active",
        linkedInsightIds: [],
        source: "campaign_analysis",
      });
      insights.push(insight);
    }

    if (successRate === 100 && stats.count >= 5) {
      const insight = await logInsight({
        type: "observation",
        category: "platform_performance",
        content: `${platform} is performing perfectly — ${stats.count} posts, 100% success rate. Strong channel.`,
        metrics: { successRate: 100, totalPosts: stats.count },
        status: "validated",
        linkedInsightIds: [],
        source: "campaign_analysis",
      });
      insights.push(insight);
    }
  }

  // Post frequency analysis
  if (publishedPosts.length > 0) {
    const oldestPost = new Date(
      Math.min(...publishedPosts.map((p: any) => new Date(p.createdAt).getTime()))
    );
    const daysSinceFirst = Math.max(1, (Date.now() - oldestPost.getTime()) / (24 * 60 * 60 * 1000));
    const postsPerDay = publishedPosts.length / daysSinceFirst;

    if (postsPerDay < 0.5) {
      const insight = await logInsight({
        type: "observation",
        category: "content_frequency",
        content: `Posting frequency is low: ${postsPerDay.toFixed(1)} posts/day. Industry average for social is 1-3/day. Consider ramping up.`,
        metrics: { postsPerDay: Math.round(postsPerDay * 10) / 10 },
        status: "active",
        linkedInsightIds: [],
        source: "campaign_analysis",
      });
      insights.push(insight);
    }
  }

  return insights;
}

// ─── Strategy Playbook Access ────────────────────────────────────────────────

/**
 * Get the current strategy playbook for Morgan to reference.
 */
export async function getPlaybook(): Promise<StrategyPlaybook> {
  return loadPlaybook();
}

/**
 * Get a formatted summary of active strategies for Morgan's system prompt.
 */
export async function getStrategySummary(): Promise<string> {
  const playbook = await loadPlaybook();
  const insights = await getRecentInsights({ type: "strategy_update", limit: 10 });

  let summary = "";

  if (playbook.activeStrategies.length > 0) {
    summary += "## Active Strategies\n";
    for (const s of playbook.activeStrategies) {
      summary += `- **${s.platform}**: ${s.bestContentType} at ${s.bestPostTime} (${s.confidence} confidence, ${s.avgEngagement} avg engagement)\n`;
    }
  }

  const runningExperiments = playbook.experimentHistory.filter((e) => e.status === "running");
  if (runningExperiments.length > 0) {
    summary += "\n## Running Experiments\n";
    for (const e of runningExperiments) {
      summary += `- ${e.hypothesis} (measuring: ${e.metric}, baseline: ${e.baselineValue})\n`;
    }
  }

  if (insights.length > 0) {
    summary += "\n## Recent Learnings\n";
    for (const i of insights.slice(-5)) {
      summary += `- [${i.category}] ${i.content}\n`;
    }
  }

  return summary || "No strategy data yet — Morgan is still learning.";
}

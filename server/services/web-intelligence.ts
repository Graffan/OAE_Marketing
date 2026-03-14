/**
 * Web Intelligence Service — Morgan's eyes and ears on the internet.
 *
 * Provides:
 * 1. Google Trends integration (entertainment trending topics, OAE title interest)
 * 2. Web research via fetch (competitor pages, news, press coverage)
 * 3. Trend spike detection (Poisson-inspired anomaly scoring)
 * 4. Competitor monitoring helpers
 *
 * Patterns inspired by: trends-js, Firecrawl, Gnip-Trend-Detection
 */

import { getFullAppSettings, getSmartLinks, getTitles } from "../storage.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TrendResult {
  keyword: string;
  interest: number; // 0-100 relative interest
  rising: boolean;
  relatedQueries: string[];
}

export interface WebResearchResult {
  url: string;
  title: string;
  content: string; // markdown or plain text
  fetchedAt: string;
  error?: string;
}

export interface CompetitorSnapshot {
  name: string;
  url: string;
  changes: string[];
  lastChecked: string;
}

export interface TrendReport {
  timestamp: string;
  entertainmentTrends: TrendResult[];
  oaeTitleInterest: TrendResult[];
  opportunities: string[];
  risks: string[];
}

// ─── Google Trends ────────────────────────────────────────────────────────────

/**
 * Fetch daily trending searches in entertainment.
 * Uses trends-js (TypeScript Google Trends client).
 */
export async function getEntertainmentTrends(): Promise<TrendResult[]> {
  try {
    // Dynamic import — trends-js is optional
    const trendsModule = await import("trends-js");
    const trends = trendsModule.default ?? trendsModule;

    // Get real-time trending topics in entertainment category
    const dailyData = await trends.dailyTrends({
      geo: "US",
    });

    const parsed = JSON.parse(dailyData);
    const trendingSearches =
      parsed?.default?.trendingSearchesDays?.[0]?.trendingSearches ?? [];

    return trendingSearches.slice(0, 10).map((t: any) => ({
      keyword: t.title?.query ?? t.query ?? "unknown",
      interest: parseInt(t.formattedTraffic?.replace(/[+,K]/g, "") ?? "0", 10),
      rising: true,
      relatedQueries: (t.relatedQueries ?? [])
        .slice(0, 5)
        .map((q: any) => q.query ?? q),
    }));
  } catch (err) {
    console.error("[Web Intelligence] Google Trends fetch failed:", err);
    return [];
  }
}

/**
 * Check search interest for OAE titles to gauge audience awareness.
 */
export async function getOAETitleInterest(): Promise<TrendResult[]> {
  try {
    const titles = await getTitles();
    const titleNames = (titles as any[])
      .filter((t: any) => t.status === "released" || t.status === "upcoming")
      .slice(0, 5)
      .map((t: any) => t.name);

    if (titleNames.length === 0) return [];

    const trendsModule = await import("trends-js");
    const trends = trendsModule.default ?? trendsModule;

    const data = await trends.interestOverTime({
      keyword: titleNames,
      geo: "US",
      startTime: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // last 30 days
    });

    const parsed = JSON.parse(data);
    const timeline = parsed?.default?.timelineData ?? [];
    const latest = timeline[timeline.length - 1];

    return titleNames.map((name: string, i: number) => ({
      keyword: name,
      interest: latest?.value?.[i] ?? 0,
      rising: (latest?.value?.[i] ?? 0) > (timeline[0]?.value?.[i] ?? 0),
      relatedQueries: [],
    }));
  } catch (err) {
    console.error("[Web Intelligence] OAE title interest check failed:", err);
    return [];
  }
}

// ─── Web Research ─────────────────────────────────────────────────────────────

/**
 * Fetch a URL and extract readable content.
 * Uses Jina Reader API (free, no key needed) for clean markdown extraction.
 */
export async function fetchWebContent(url: string): Promise<WebResearchResult> {
  try {
    const jinaUrl = `https://r.jina.ai/${url}`;
    const response = await fetch(jinaUrl, {
      headers: {
        Accept: "text/markdown",
        "X-Return-Format": "markdown",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      return {
        url,
        title: "",
        content: "",
        fetchedAt: new Date().toISOString(),
        error: `HTTP ${response.status}`,
      };
    }

    const text = await response.text();
    // Extract title from first markdown heading
    const titleMatch = text.match(/^#\s+(.+)$/m);

    return {
      url,
      title: titleMatch?.[1] ?? url,
      content: text.slice(0, 5000), // cap at 5k chars to control token usage
      fetchedAt: new Date().toISOString(),
    };
  } catch (err) {
    return {
      url,
      title: "",
      content: "",
      fetchedAt: new Date().toISOString(),
      error: err instanceof Error ? err.message : "Fetch failed",
    };
  }
}

/**
 * Search the web and get summarized results.
 * Uses Jina Search API (free tier).
 */
export async function searchWeb(query: string, maxResults = 5): Promise<WebResearchResult[]> {
  try {
    const response = await fetch(`https://s.jina.ai/${encodeURIComponent(query)}`, {
      headers: {
        Accept: "application/json",
        "X-Return-Format": "markdown",
      },
      signal: AbortSignal.timeout(20000),
    });

    if (!response.ok) {
      console.error(`[Web Intelligence] Search failed: HTTP ${response.status}`);
      return [];
    }

    const text = await response.text();

    // Parse the markdown response into individual results
    const results: WebResearchResult[] = [];
    const sections = text.split(/\n---\n|\n#{1,2}\s/).filter(Boolean);

    for (const section of sections.slice(0, maxResults)) {
      const urlMatch = section.match(/https?:\/\/[^\s)]+/);
      const titleMatch = section.match(/\[([^\]]+)\]/);
      results.push({
        url: urlMatch?.[0] ?? "",
        title: titleMatch?.[1] ?? section.slice(0, 60).trim(),
        content: section.slice(0, 2000),
        fetchedAt: new Date().toISOString(),
      });
    }

    return results;
  } catch (err) {
    console.error("[Web Intelligence] Search error:", err);
    return [];
  }
}

// ─── Trend Spike Detection ────────────────────────────────────────────────────

/**
 * Poisson-inspired anomaly scoring.
 * Detects when a metric value is significantly above its historical baseline.
 *
 * Pattern from: Gnip-Trend-Detection (Twitter/X official algorithms)
 */
export function detectSpike(
  values: number[],
  currentValue: number,
  sensitivity = 2.0
): { isSpike: boolean; score: number; baseline: number } {
  if (values.length < 3) {
    return { isSpike: false, score: 0, baseline: currentValue };
  }

  // Calculate baseline (mean) and standard deviation
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  const stddev = Math.sqrt(variance);

  // Z-score: how many standard deviations above the mean
  const score = stddev > 0 ? (currentValue - mean) / stddev : 0;

  return {
    isSpike: score > sensitivity,
    score: Math.round(score * 100) / 100,
    baseline: Math.round(mean * 100) / 100,
  };
}

// ─── Full Trend Report ────────────────────────────────────────────────────────

/**
 * Generate a comprehensive trend report for Morgan's morning scan.
 * Combines Google Trends + OAE title interest + opportunity identification.
 */
export async function generateTrendReport(): Promise<TrendReport> {
  const [entertainmentTrends, oaeTitleInterest] = await Promise.all([
    getEntertainmentTrends(),
    getOAETitleInterest(),
  ]);

  // Identify opportunities: trending topics that relate to OAE content
  const opportunities: string[] = [];
  const risks: string[] = [];

  // Check if any OAE titles are trending upward
  for (const title of oaeTitleInterest) {
    if (title.rising && title.interest > 20) {
      opportunities.push(
        `"${title.keyword}" search interest is rising (${title.interest}/100) — consider increasing posting frequency`
      );
    }
    if (!title.rising && title.interest < 10) {
      risks.push(
        `"${title.keyword}" has very low search interest (${title.interest}/100) — may need awareness campaign`
      );
    }
  }

  // Check entertainment trends for relevance to OAE genres
  const oaeGenreKeywords = [
    "indie film", "independent", "documentary", "festival", "premiere",
    "streaming", "short film", "horror", "thriller", "drama",
  ];

  for (const trend of entertainmentTrends) {
    const keyword = trend.keyword.toLowerCase();
    if (oaeGenreKeywords.some((g) => keyword.includes(g))) {
      opportunities.push(
        `Trending topic "${trend.keyword}" aligns with OAE content — potential engagement opportunity`
      );
    }
  }

  return {
    timestamp: new Date().toISOString(),
    entertainmentTrends,
    oaeTitleInterest,
    opportunities,
    risks,
  };
}

// ─── Competitor Research ──────────────────────────────────────────────────────

/**
 * Research a competitor or topic by searching the web and summarizing findings.
 * Morgan can call this during content_draft or on-demand via chat.
 */
export async function researchTopic(topic: string): Promise<{
  query: string;
  results: WebResearchResult[];
  summary: string;
}> {
  const results = await searchWeb(topic, 5);

  const summary = results.length > 0
    ? `Found ${results.length} results for "${topic}". Top sources: ${results
        .map((r) => r.title || r.url)
        .filter(Boolean)
        .join(", ")}`
    : `No results found for "${topic}"`;

  return { query: topic, results, summary };
}

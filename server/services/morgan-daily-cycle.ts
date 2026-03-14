/**
 * Morgan Daily Cycle — Autonomous Marketing Operations
 *
 * Runs Morgan's daily schedule:
 * 1. Morning scan (6:00 AM) — inventory check, analytics, rotation state
 * 2. Content draft (6:30 AM) — generate posts for today + upcoming days
 * 3. Morning briefing (7:00 AM) — send summary notification to all owners
 * 4. Publish approved (throughout day) — publish posts at their scheduled times
 * 5. Evening digest (9:00 PM) — day's performance snapshot
 * 6. Weekly review (Sunday 10:00 AM) — weekly strategy analysis
 */

import {
  getFullAppSettings,
  getClips,
  getCampaigns,
  getScheduledPosts,
  getTopPerformingClips,
  getAnalyticsDashboardSummary,
  getAssetHealthReport,
  getPostsDueForPublishing,
  getActiveSocialConnections,
  createNotification,
  createMorganMessage,
  getMorganConversations,
  createMorganConversation,
  getUsers,
} from "../storage.js";
import {
  createMorganTask,
  getMorganTasksByDate,
  updateMorganTask,
} from "../storage.js";
import { chatWithMorgan } from "./morgan-chat.js";
import { processPublishQueue } from "./publish-engine.js";
import { generateTrendReport, researchTopic } from "./web-intelligence.js";
import {
  analyzeCampaignPerformance,
  runMemoryMaintenance,
  getStrategySummary,
  logInsight,
} from "./morgan-insights.js";

// ─── Task Runner ─────────────────────────────────────────────────────────────

type TaskRunner = () => Promise<Record<string, unknown>>;

const TASK_RUNNERS: Record<string, TaskRunner> = {
  morning_scan: runMorningScan,
  content_draft: runContentDraft,
  morning_briefing: runMorningBriefing,
  publish_approved: runPublishApproved,
  evening_digest: runEveningDigest,
  weekly_review: runWeeklyReview,
};

export async function runTask(taskType: string): Promise<Record<string, unknown>> {
  const runner = TASK_RUNNERS[taskType];
  if (!runner) throw new Error(`Unknown task type: ${taskType}`);
  return runner();
}

// ─── Morning Scan ────────────────────────────────────────────────────────────

async function runMorningScan(): Promise<Record<string, unknown>> {
  // Fetch internal data + web intelligence in parallel
  const [clips, campaigns, connections, dashboardSummary, healthReport, trendReport] =
    await Promise.all([
      getClips(),
      getCampaigns(),
      getActiveSocialConnections(),
      getAnalyticsDashboardSummary(),
      getAssetHealthReport(),
      generateTrendReport().catch(() => null), // graceful fallback if trends fail
    ]);

  const todayPosts = await getScheduledPosts({ status: "scheduled" });
  const draftPosts = await getScheduledPosts({ status: "draft" });

  // Run memory maintenance (decay old, consolidate duplicates)
  const memMaintenance = await runMemoryMaintenance().catch(() => ({ decayed: 0, consolidated: 0 }));

  const summary: Record<string, unknown> = {
    clipCount: (clips as any[]).length,
    activeCampaigns: (campaigns as any[]).filter((c: any) => c.status === "active").length,
    connectedPlatforms: (connections as any[]).length,
    scheduledToday: (todayPosts as any[]).length,
    draftsAwaitingApproval: (draftPosts as any[]).length,
    dashboard: dashboardSummary,
    health: healthReport,
    memoryMaintenance: memMaintenance,
    timestamp: new Date().toISOString(),
  };

  // Add trend intelligence if available
  if (trendReport) {
    summary.trends = {
      entertainmentTrending: trendReport.entertainmentTrends.slice(0, 5).map((t) => t.keyword),
      oaeTitleInterest: trendReport.oaeTitleInterest.map((t) => ({
        title: t.keyword,
        interest: t.interest,
        rising: t.rising,
      })),
      opportunities: trendReport.opportunities,
      risks: trendReport.risks,
    };

    // Log trend opportunities as insights
    for (const opp of trendReport.opportunities) {
      await logInsight({
        type: "trend_alert",
        category: "trends",
        content: opp,
        status: "active",
        linkedInsightIds: [],
        source: "morning_scan",
      }).catch(() => {}); // best-effort
    }
  }

  return summary;
}

// ─── Content Draft ───────────────────────────────────────────────────────────

async function runContentDraft(): Promise<Record<string, unknown>> {
  const settings = await getFullAppSettings();
  if (!settings?.claudeApiKey && !settings?.openaiApiKey) {
    return { skipped: true, reason: "No AI provider configured" };
  }

  // Get context for content generation
  const [clips, connections, topClips] = await Promise.all([
    getClips(),
    getActiveSocialConnections(),
    getTopPerformingClips(10),
  ]);

  if ((connections as any[]).length === 0) {
    return { skipped: true, reason: "No social accounts connected" };
  }

  // Get or create Morgan's autonomous conversation
  const convId = await getAutonomousConversationId();

  // Get strategy context and trend intelligence for smarter content drafts
  const [strategySummary, trendReport] = await Promise.all([
    getStrategySummary().catch(() => ""),
    generateTrendReport().catch(() => null),
  ]);

  // Ask Morgan to draft content with full intelligence context
  const trendContext = trendReport
    ? `\nTrending in entertainment: ${trendReport.entertainmentTrends.slice(0, 5).map((t) => t.keyword).join(", ")}
OAE title interest: ${trendReport.oaeTitleInterest.map((t) => `${t.keyword}: ${t.interest}/100 ${t.rising ? "(rising)" : "(flat)"}`).join(", ") || "No data yet"}
Opportunities: ${trendReport.opportunities.join("; ") || "None identified"}
Risks: ${trendReport.risks.join("; ") || "None"}`
    : "";

  const prompt = `It's time for your daily content draft. Here's what you're working with:

Connected platforms: ${(connections as any[]).map((c: any) => `${c.platform} (${c.accountName})`).join(", ")}
Available clips: ${(clips as any[]).length} total
Top performing clips: ${(topClips as any[]).map((c: any) => `"${c.name}" (score: ${c.engagementScore})`).join(", ") || "No data yet"}
${trendContext}
${strategySummary ? `\nYour current strategy insights:\n${strategySummary}` : ""}

Please draft 2-3 post ideas for today. For each, include:
- Platform recommendation
- Caption text
- Suggested hashtags
- Best time to post
- Why this content/angle works right now (reference trends if relevant)
- Which OAE title or clip to feature

Keep it OAE brand voice — authentic indie film energy, not corporate. If there's a trending topic you can tie into, do it authentically.`;

  const result = await chatWithMorgan(convId, prompt);

  return {
    generated: true,
    response: result.response,
    provider: result.provider,
    model: result.model,
  };
}

// ─── Morning Briefing ────────────────────────────────────────────────────────

async function runMorningBriefing(): Promise<Record<string, unknown>> {
  // Run scan first to get latest data
  const scanData = await runMorningScan();

  const convId = await getAutonomousConversationId();

  const prompt = `Generate a morning briefing for the team. Here's today's data:

${JSON.stringify(scanData, null, 2)}

Write a brief, warm morning message summarizing:
1. What's scheduled for today
2. Yesterday's performance highlights (if any data)
3. Anything that needs attention
4. Your recommendation for the day

Keep it conversational — this goes to Ryan, Jon, and Geoff as a notification.`;

  const result = await chatWithMorgan(convId, prompt);

  // Send notification to all users
  const users = await getUsers();
  const owners = (users as any[]).filter((u: any) =>
    ["admin", "marketing_operator"].includes(u.role) && u.isActive
  );

  for (const owner of owners) {
    await createNotification({
      userId: owner.id,
      type: "system",
      title: "Morgan's Morning Briefing",
      message: result.response.slice(0, 500),
      metadata: { fullBriefing: result.response, taskType: "morning_briefing" },
    });
  }

  return {
    briefingSent: true,
    recipientCount: owners.length,
    briefingPreview: result.response.slice(0, 200),
  };
}

// ─── Publish Approved ────────────────────────────────────────────────────────

async function runPublishApproved(): Promise<Record<string, unknown>> {
  const result = await processPublishQueue();
  return {
    postsProcessed: result.processed,
    published: result.published,
    failed: result.failed,
  };
}

// ─── Evening Digest ──────────────────────────────────────────────────────────

async function runEveningDigest(): Promise<Record<string, unknown>> {
  const convId = await getAutonomousConversationId();

  const [todayPosts, dashboardSummary, campaignInsights] = await Promise.all([
    getScheduledPosts({ status: "published" }),
    getAnalyticsDashboardSummary(),
    analyzeCampaignPerformance().catch(() => []),
  ]);

  const insightsContext = campaignInsights.length > 0
    ? `\nNew insights from today's analysis:\n${campaignInsights.map((i) => `- [${i.category}] ${i.content}`).join("\n")}`
    : "";

  const prompt = `Time for the evening digest. Here's how today went:

Published posts today: ${(todayPosts as any[]).length}
Dashboard: ${JSON.stringify(dashboardSummary, null, 2)}
${insightsContext}

Write a quick evening wrap-up:
1. What went live today
2. Early performance signals
3. Insights and patterns you noticed
4. Anything to adjust for tomorrow
5. One thing you're excited about

Keep it brief — end-of-day energy.`;

  const result = await chatWithMorgan(convId, prompt);

  // Notify owners
  const users = await getUsers();
  const owners = (users as any[]).filter((u: any) =>
    ["admin", "marketing_operator"].includes(u.role) && u.isActive
  );

  for (const owner of owners) {
    await createNotification({
      userId: owner.id,
      type: "system",
      title: "Morgan's Evening Digest",
      message: result.response.slice(0, 500),
      metadata: { fullDigest: result.response, taskType: "evening_digest" },
    });
  }

  return {
    digestSent: true,
    recipientCount: owners.length,
  };
}

// ─── Weekly Review ───────────────────────────────────────────────────────────

async function runWeeklyReview(): Promise<Record<string, unknown>> {
  const convId = await getAutonomousConversationId();

  const [dashboardSummary, topClips, healthReport, strategySummary, trendReport, campaignInsights] =
    await Promise.all([
      getAnalyticsDashboardSummary(),
      getTopPerformingClips(10),
      getAssetHealthReport(),
      getStrategySummary().catch(() => ""),
      generateTrendReport().catch(() => null),
      analyzeCampaignPerformance().catch(() => []),
    ]);

  const trendContext = trendReport
    ? `\nEntertainment trends this week: ${trendReport.entertainmentTrends.map((t) => t.keyword).join(", ")}
OAE search interest: ${trendReport.oaeTitleInterest.map((t) => `${t.keyword}: ${t.interest}/100`).join(", ") || "No data"}
Identified opportunities: ${trendReport.opportunities.join("; ") || "None"}
Risks to watch: ${trendReport.risks.join("; ") || "None"}`
    : "";

  const insightsContext = campaignInsights.length > 0
    ? `\nThis week's performance insights:\n${campaignInsights.map((i) => `- [${i.category}] ${i.content}`).join("\n")}`
    : "";

  const prompt = `It's Sunday — time for the weekly strategy review.

Dashboard: ${JSON.stringify(dashboardSummary, null, 2)}
Top clips this week: ${JSON.stringify(topClips, null, 2)}
Asset health: ${JSON.stringify(healthReport, null, 2)}
${strategySummary ? `\nStrategy playbook:\n${strategySummary}` : ""}
${trendContext}
${insightsContext}

Write a comprehensive weekly review covering:
1. **Performance summary** — what worked, what didn't (reference specific insights)
2. **Top content** — best performing posts and why
3. **Trend intelligence** — what's trending in entertainment and how we can capitalize
4. **Audience insights** — any patterns in engagement, search interest, or click-throughs
5. **Strategy experiments** — what we're testing, early results, what to try next
6. **Recommendations** — what to focus on next week, any trend-riding opportunities
7. **Content gaps** — what we should create or schedule

This goes to the team as a proper strategy document. Be thorough but keep it readable. Reference data when you have it.`;

  // Run campaign analysis to generate lasting insights
  await analyzeCampaignPerformance().catch(() => []);

  const result = await chatWithMorgan(convId, prompt);

  const users = await getUsers();
  const owners = (users as any[]).filter((u: any) =>
    ["admin", "marketing_operator"].includes(u.role) && u.isActive
  );

  for (const owner of owners) {
    await createNotification({
      userId: owner.id,
      type: "system",
      title: "Morgan's Weekly Strategy Review",
      message: result.response.slice(0, 500),
      metadata: { fullReview: result.response, taskType: "weekly_review" },
    });
  }

  return {
    reviewSent: true,
    recipientCount: owners.length,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getAutonomousConversationId(): Promise<number> {
  const convos = await getMorganConversations();
  const autonomous = (convos as any[]).find(
    (c: any) => c.channel === "app" && c.title === "Morgan Autonomous"
  );
  if (autonomous) return autonomous.id;

  const conv = await createMorganConversation({
    title: "Morgan Autonomous",
    channel: "app",
  });
  return conv.id;
}

// ─── Scheduler ───────────────────────────────────────────────────────────────

interface ScheduleEntry {
  taskType: string;
  hour: number;
  minute: number;
  daysOfWeek?: number[]; // 0=Sun, 6=Sat. undefined = every day
}

const DAILY_SCHEDULE: ScheduleEntry[] = [
  { taskType: "morning_scan", hour: 6, minute: 0 },
  { taskType: "content_draft", hour: 6, minute: 30 },
  { taskType: "morning_briefing", hour: 7, minute: 0 },
  { taskType: "publish_approved", hour: 10, minute: 0 },
  { taskType: "publish_approved", hour: 14, minute: 0 },
  { taskType: "publish_approved", hour: 18, minute: 0 },
  { taskType: "evening_digest", hour: 21, minute: 0 },
  { taskType: "weekly_review", hour: 10, minute: 0, daysOfWeek: [0] }, // Sunday only
];

let schedulerTimer: ReturnType<typeof setInterval> | null = null;

export function startMorganScheduler(): void {
  if (schedulerTimer) return;

  // Check every minute if any tasks are due
  schedulerTimer = setInterval(async () => {
    try {
      await checkAndRunDueTasks();
    } catch (err) {
      console.error("[Morgan Scheduler] Error:", err);
    }
  }, 60_000);

  console.log("[Morgan Scheduler] Started — checking for due tasks every minute");
}

export function stopMorganScheduler(): void {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
    console.log("[Morgan Scheduler] Stopped");
  }
}

async function checkAndRunDueTasks(): Promise<void> {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentDay = now.getDay();

  for (const entry of DAILY_SCHEDULE) {
    // Check if this task is due right now (within this minute)
    if (entry.hour !== currentHour || entry.minute !== currentMinute) continue;
    if (entry.daysOfWeek && !entry.daysOfWeek.includes(currentDay)) continue;

    // Check if we already ran this task today at this time
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayTasks = await getMorganTasksByDate(todayStart);
    const alreadyRan = (todayTasks as any[]).some(
      (t: any) =>
        t.taskType === entry.taskType &&
        t.status !== "failed" &&
        new Date(t.scheduledAt).getHours() === entry.hour
    );

    if (alreadyRan) continue;

    // Create and run the task
    console.log(`[Morgan Scheduler] Running ${entry.taskType}...`);

    const task = await createMorganTask({
      taskType: entry.taskType,
      status: "running",
      scheduledAt: now,
      startedAt: now,
    });

    try {
      const result = await runTask(entry.taskType);
      await updateMorganTask(task.id, {
        status: "completed",
        completedAt: new Date(),
        result,
      });
      console.log(`[Morgan Scheduler] Completed ${entry.taskType}`);
    } catch (err: any) {
      await updateMorganTask(task.id, {
        status: "failed",
        completedAt: new Date(),
        error: err.message,
      });
      console.error(`[Morgan Scheduler] Failed ${entry.taskType}:`, err.message);
    }
  }
}

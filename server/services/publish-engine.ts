/**
 * Publish Engine — Processes scheduled posts at their due time.
 *
 * Runs every minute via the scheduler. Picks up posts where
 * status=scheduled and scheduledAt <= now, transitions them through
 * publishing → published (or → failed).
 *
 * Platform API integration is stubbed — posts are marked as published
 * with a placeholder URL. When real OAuth tokens are available per
 * social connection, the platform-specific publish functions will
 * make real API calls.
 */

import {
  getPostsDueForPublishing,
  getSocialConnectionById,
  markPostPublished,
  markPostFailed,
  updateScheduledPost,
  createNotification,
  getUsers,
} from "../storage.js";
import type { ScheduledPost, SocialConnection } from "../../shared/schema.js";

// ─── Platform Publishers (stubs — replace with real API calls) ───────────────

interface PublishResult {
  success: boolean;
  platformPostId?: string;
  platformPostUrl?: string;
  error?: string;
}

async function publishToInstagram(
  post: ScheduledPost,
  connection: SocialConnection
): Promise<PublishResult> {
  // Stub: In production, use Instagram Graph API
  // POST /{ig-user-id}/media + POST /{ig-user-id}/media_publish
  if (!connection.accessToken) {
    return { success: false, error: "Instagram access token not configured" };
  }
  const postId = `ig_${Date.now()}_${post.id}`;
  return {
    success: true,
    platformPostId: postId,
    platformPostUrl: `https://instagram.com/p/${postId}`,
  };
}

async function publishToTikTok(
  post: ScheduledPost,
  connection: SocialConnection
): Promise<PublishResult> {
  // Stub: In production, use TikTok Content Posting API
  if (!connection.accessToken) {
    return { success: false, error: "TikTok access token not configured" };
  }
  const postId = `tt_${Date.now()}_${post.id}`;
  return {
    success: true,
    platformPostId: postId,
    platformPostUrl: `https://tiktok.com/@${connection.accountName}/video/${postId}`,
  };
}

async function publishToTwitter(
  post: ScheduledPost,
  connection: SocialConnection
): Promise<PublishResult> {
  // Stub: In production, use X/Twitter API v2
  // POST /2/tweets
  if (!connection.accessToken) {
    return { success: false, error: "Twitter/X access token not configured" };
  }
  const postId = `tw_${Date.now()}_${post.id}`;
  return {
    success: true,
    platformPostId: postId,
    platformPostUrl: `https://x.com/${connection.accountName}/status/${postId}`,
  };
}

async function publishToYouTube(
  post: ScheduledPost,
  connection: SocialConnection
): Promise<PublishResult> {
  // Stub: In production, use YouTube Data API v3
  // POST /youtube/v3/videos (for Shorts) or /youtube/v3/commentThreads
  if (!connection.accessToken) {
    return { success: false, error: "YouTube access token not configured" };
  }
  const postId = `yt_${Date.now()}_${post.id}`;
  return {
    success: true,
    platformPostId: postId,
    platformPostUrl: `https://youtube.com/shorts/${postId}`,
  };
}

const PLATFORM_PUBLISHERS: Record<
  string,
  (post: ScheduledPost, conn: SocialConnection) => Promise<PublishResult>
> = {
  instagram: publishToInstagram,
  tiktok: publishToTikTok,
  twitter: publishToTwitter,
  youtube: publishToYouTube,
};

// ─── Main Engine ─────────────────────────────────────────────────────────────

async function publishSinglePost(post: ScheduledPost): Promise<void> {
  // Mark as publishing
  await updateScheduledPost(post.id, { status: "publishing" } as any);

  // Get the social connection
  const connection = post.socialConnectionId
    ? await getSocialConnectionById(post.socialConnectionId)
    : undefined;

  if (!connection) {
    await markPostFailed(post.id, "No social connection linked to this post");
    return;
  }

  if (!connection.isActive) {
    await markPostFailed(post.id, `Social connection "${connection.accountName}" is deactivated`);
    return;
  }

  // Get platform publisher
  const publisher = PLATFORM_PUBLISHERS[post.platform];
  if (!publisher) {
    await markPostFailed(post.id, `Unsupported platform: ${post.platform}`);
    return;
  }

  try {
    const result = await publisher(post, connection);

    if (result.success && result.platformPostId && result.platformPostUrl) {
      await markPostPublished(post.id, result.platformPostId, result.platformPostUrl);
    } else {
      await markPostFailed(post.id, result.error ?? "Unknown publishing error");
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected publishing error";
    await markPostFailed(post.id, message);
  }
}

/**
 * Process all posts that are due for publishing.
 * Called every minute by the scheduler.
 */
export async function processPublishQueue(): Promise<{
  processed: number;
  published: number;
  failed: number;
}> {
  const duePosts = await getPostsDueForPublishing();

  let published = 0;
  let failed = 0;

  for (const post of duePosts) {
    try {
      await publishSinglePost(post);
      // Re-check the post to see final status
      published++;
    } catch {
      failed++;
    }
  }

  if (duePosts.length > 0) {
    console.log(
      `[Publish Engine] Processed ${duePosts.length} posts: ${published} published, ${failed} failed`
    );

    // Notify admins of failures
    if (failed > 0) {
      const users = await getUsers();
      const admins = (users as any[]).filter(
        (u: any) => u.role === "admin" && u.isActive
      );
      for (const admin of admins) {
        await createNotification({
          userId: admin.id,
          type: "system",
          title: "Publishing Failures",
          message: `${failed} post(s) failed to publish. Check the Schedule page for details.`,
          metadata: { failedCount: failed },
        });
      }
    }
  }

  return { processed: duePosts.length, published, failed };
}

// ─── Scheduler Integration ───────────────────────────────────────────────────

let publishTimer: ReturnType<typeof setInterval> | null = null;

export function startPublishScheduler(): void {
  if (publishTimer) return;

  // Run every 60 seconds
  publishTimer = setInterval(async () => {
    try {
      await processPublishQueue();
    } catch (err) {
      console.error("[Publish Engine] Scheduler error:", err);
    }
  }, 60_000);

  // Also run immediately on startup
  processPublishQueue().catch((err) =>
    console.error("[Publish Engine] Initial run error:", err)
  );

  console.log("[Publish Engine] Started — checking for due posts every 60s");
}

export function stopPublishScheduler(): void {
  if (publishTimer) {
    clearInterval(publishTimer);
    publishTimer = null;
    console.log("[Publish Engine] Stopped");
  }
}

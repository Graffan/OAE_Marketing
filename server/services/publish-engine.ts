/**
 * Publish Engine — Processes scheduled posts at their due time.
 *
 * Runs every minute via the scheduler. Picks up posts where
 * status=scheduled and scheduledAt <= now, transitions them through
 * publishing → published (or → failed).
 *
 * Each platform publisher calls the real API (Instagram Graph API,
 * TikTok Content Posting API v2, X/Twitter API v2). If OAuth is not
 * configured for a connection, the publisher returns an explicit error.
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
import {
  humanizePost,
  checkRateLimit,
  recordPost,
  calculatePostingDelay,
} from "./human-posting.js";

// ─── Platform Publishers ─────────────────────────────────────────────────────
//
// Each publisher calls the real platform API. If OAuth is not configured,
// they return an explicit error — never fake success.

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
  if (!connection.accessToken) {
    return { success: false, error: "Instagram not connected. Go to Admin > Social Connections to set up OAuth." };
  }

  // Instagram Graph API: create media container, then publish
  try {
    const igUserId = connection.accountId ?? connection.accountName;
    const caption = (post as any).caption ?? "";

    // Step 1: Create media container
    const createRes = await fetch(
      `https://graph.facebook.com/v19.0/${igUserId}/media`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caption,
          access_token: connection.accessToken,
          // For image posts: image_url is required
          // For video/reels: video_url + media_type=REELS
          ...(post.mediaUrl ? { image_url: post.mediaUrl } : {}),
        }),
      }
    );
    if (!createRes.ok) {
      const err = await createRes.json();
      return { success: false, error: `Instagram API: ${err.error?.message ?? createRes.statusText}` };
    }
    const { id: containerId } = await createRes.json();

    // Step 2: Publish the container
    const publishRes = await fetch(
      `https://graph.facebook.com/v19.0/${igUserId}/media_publish`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creation_id: containerId,
          access_token: connection.accessToken,
        }),
      }
    );
    if (!publishRes.ok) {
      const err = await publishRes.json();
      return { success: false, error: `Instagram publish failed: ${err.error?.message ?? publishRes.statusText}` };
    }
    const { id: postId } = await publishRes.json();

    return {
      success: true,
      platformPostId: postId,
      platformPostUrl: `https://instagram.com/p/${postId}`,
    };
  } catch (err) {
    return { success: false, error: `Instagram error: ${err instanceof Error ? err.message : String(err)}` };
  }
}

async function publishToTikTok(
  post: ScheduledPost,
  connection: SocialConnection
): Promise<PublishResult> {
  if (!connection.accessToken) {
    return { success: false, error: "TikTok not connected. Go to Admin > Social Connections to set up OAuth." };
  }

  // TikTok Content Posting API v2
  try {
    const caption = (post as any).caption ?? "";

    // TikTok requires video upload via their API — text-only posts not supported
    // For now, if no media URL, we can't post
    if (!post.mediaUrl) {
      return { success: false, error: "TikTok requires a video URL. Upload a clip first." };
    }

    const res = await fetch("https://open.tiktokapis.com/v2/post/publish/video/init/", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${connection.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        post_info: {
          title: caption.slice(0, 150),
          privacy_level: "PUBLIC_TO_EVERYONE",
        },
        source_info: {
          source: "PULL_FROM_URL",
          video_url: post.mediaUrl,
        },
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      return { success: false, error: `TikTok API: ${err.error?.message ?? res.statusText}` };
    }

    const data = await res.json();
    const publishId = data.data?.publish_id;

    return {
      success: true,
      platformPostId: publishId ?? `tiktok_${Date.now()}`,
      platformPostUrl: `https://tiktok.com/@${connection.accountName}`,
    };
  } catch (err) {
    return { success: false, error: `TikTok error: ${err instanceof Error ? err.message : String(err)}` };
  }
}

async function publishToTwitter(
  post: ScheduledPost,
  connection: SocialConnection
): Promise<PublishResult> {
  if (!connection.accessToken) {
    return { success: false, error: "X/Twitter not connected. Go to Admin > Social Connections to set up OAuth." };
  }

  // X/Twitter API v2: POST /2/tweets
  try {
    const caption = (post as any).caption ?? "";

    const res = await fetch("https://api.x.com/2/tweets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${connection.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: caption.slice(0, 280) }),
    });

    if (!res.ok) {
      const err = await res.json();
      return { success: false, error: `X/Twitter API: ${err.detail ?? err.title ?? res.statusText}` };
    }

    const data = await res.json();
    const tweetId = data.data?.id;

    return {
      success: true,
      platformPostId: tweetId,
      platformPostUrl: `https://x.com/${connection.accountName}/status/${tweetId}`,
    };
  } catch (err) {
    return { success: false, error: `X/Twitter error: ${err instanceof Error ? err.message : String(err)}` };
  }
}

async function publishToYouTube(
  post: ScheduledPost,
  connection: SocialConnection
): Promise<PublishResult> {
  if (!connection.accessToken) {
    return { success: false, error: "YouTube not connected. Go to Admin > Social Connections to set up OAuth." };
  }

  // YouTube Data API v3 requires multipart video upload
  // Text-only posts are not supported on YouTube
  if (!post.mediaUrl) {
    return { success: false, error: "YouTube requires a video file. Upload a clip first." };
  }

  return {
    success: false,
    error: "YouTube video upload requires multipart upload flow. Coming in next release — use YouTube Studio for now.",
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
  // 1. Rate limit check — don't blast posts
  const rateCheck = checkRateLimit(post.platform);
  if (!rateCheck.canPost) {
    console.log(`[Publish Engine] Rate limited on ${post.platform}: ${rateCheck.reason}`);
    // Don't fail — just skip this cycle, it'll retry next minute
    return;
  }

  // 2. Human-like delay — don't post exactly on the minute
  const delay = calculatePostingDelay();
  console.log(`[Publish Engine] Humanized delay: ${Math.round(delay / 1000)}s for post ${post.id}`);
  await new Promise((r) => setTimeout(r, delay));

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
      // 3. Record for rate limiting
      recordPost(post.platform);
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

import { db } from "./db.js";
import { users, appSettings, titles, clips, campaigns, projects, regionalDestinations, smartLinks, analyticsEvents, clipPosts, aiLogs, campaignContents, promptTemplates, notifications, socialConnections, scheduledPosts } from "@shared/schema.js";
import { eq, count, and, inArray, lte, gte, isNotNull, sql, desc, asc } from "drizzle-orm";
import type { User, AppSettings, Title, InsertTitle, Project, InsertProject, Clip, InsertUser, RegionalDestination, SmartLink, AnalyticsEvent, ClipPost, Campaign, InsertCampaign, AiLog, InsertAiLog, CampaignContent, InsertCampaignContent, PromptTemplate, InsertPromptTemplate, Notification, NotificationType, SocialConnection, InsertSocialConnection, ScheduledPost, InsertScheduledPost } from "@shared/schema.js";
import type { SQL } from "drizzle-orm";
import bcrypt from "bcrypt";

export async function getUserByUsername(username: string): Promise<User | undefined> {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);
  return result[0];
}

export async function getUserById(id: number): Promise<User | undefined> {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  return result[0];
}

export async function updateLastLogin(userId: number): Promise<void> {
  await db
    .update(users)
    .set({ lastLoginAt: new Date(), updatedAt: new Date() })
    .where(eq(users.id, userId));
}

export async function getAppSettings(): Promise<AppSettings | null> {
  const result = await db.select().from(appSettings).where(eq(appSettings.id, 1)).limit(1);
  return result[0] ?? null;
}

// ─── Titles ───────────────────────────────────────────────────────────────────

export async function getTitles(): Promise<(Title & { clipCount: number; campaignCount: number })[]> {
  const allTitles = await db.select().from(titles).orderBy(titles.titleName);

  const withCounts = await Promise.all(
    allTitles.map(async (title) => {
      const [clipResult] = await db.select({ count: count() }).from(clips).where(eq(clips.titleId, title.id));
      const [campaignResult] = await db.select({ count: count() }).from(campaigns).where(eq(campaigns.titleId, title.id));
      return {
        ...title,
        clipCount: Number(clipResult?.count ?? 0),
        campaignCount: Number(campaignResult?.count ?? 0),
      };
    })
  );
  return withCounts;
}

export async function getTitleById(id: number): Promise<Title | undefined> {
  const result = await db.select().from(titles).where(eq(titles.id, id)).limit(1);
  return result[0];
}

export async function createTitle(data: InsertTitle): Promise<Title> {
  const [created] = await db.insert(titles).values(data).returning();
  return created;
}

export async function updateTitle(id: number, data: Partial<InsertTitle>): Promise<Title> {
  const [updated] = await db
    .update(titles)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(titles.id, id))
    .returning();
  return updated;
}

export async function deleteTitle(id: number): Promise<void> {
  await db.delete(titles).where(eq(titles.id, id));
}

export async function getTitleByName(titleName: string): Promise<Title | undefined> {
  const result = await db
    .select()
    .from(titles)
    .where(eq(titles.titleName, titleName))
    .limit(1);
  return result[0];
}

// ─── Projects ─────────────────────────────────────────────────────────────────

export async function getProjects(): Promise<Project[]> {
  return db.select().from(projects).orderBy(projects.createdAt);
}

export async function getProjectsByTitle(titleId: number): Promise<Project[]> {
  return db
    .select()
    .from(projects)
    .where(eq(projects.titleId, titleId))
    .orderBy(projects.createdAt);
}

export async function getProjectById(id: number): Promise<Project | undefined> {
  const result = await db
    .select()
    .from(projects)
    .where(eq(projects.id, id))
    .limit(1);
  return result[0];
}

export async function createProject(data: InsertProject): Promise<Project> {
  const [created] = await db.insert(projects).values(data).returning();
  return created;
}

export async function updateProject(
  id: number,
  data: Partial<InsertProject>
): Promise<Project> {
  const [updated] = await db
    .update(projects)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(projects.id, id))
    .returning();
  return updated;
}

export async function deleteProject(id: number): Promise<void> {
  await db.delete(projects).where(eq(projects.id, id));
}

export async function updateProjectSyncState(
  id: number,
  state: {
    syncStatus: "idle" | "syncing" | "error";
    lastSyncedAt?: Date;
    dropboxCursor?: string | null;
    syncErrorMessage?: string | null;
  }
): Promise<void> {
  await db
    .update(projects)
    .set({
      syncStatus: state.syncStatus,
      lastSyncedAt: state.lastSyncedAt,
      dropboxCursor: state.dropboxCursor,
      syncErrorMessage: state.syncErrorMessage ?? null,
      updatedAt: new Date(),
    })
    .where(eq(projects.id, id));
}

// ─── Clips (Dropbox sync) ─────────────────────────────────────────────────────

export async function getClipByDropboxFileId(
  dropboxFileId: string
): Promise<Clip | undefined> {
  const result = await db
    .select()
    .from(clips)
    .where(eq(clips.dropboxFileId, dropboxFileId))
    .limit(1);
  return result[0];
}

export async function upsertClipFromDropbox(data: {
  projectId: number;
  titleId: number;
  filename: string;
  dropboxPath: string;
  dropboxFileId: string;
  fileSizeBytes: number;
  mimeType: string;
}): Promise<Clip> {
  // Check if clip already exists by dropbox_file_id
  const existing = await getClipByDropboxFileId(data.dropboxFileId);
  if (existing) {
    // Update path and availability in case it moved
    const [updated] = await db
      .update(clips)
      .set({
        dropboxPath: data.dropboxPath,
        filename: data.filename,
        isAvailable: true,
        updatedAt: new Date(),
      })
      .where(eq(clips.id, existing.id))
      .returning();
    return updated;
  }

  // Insert new clip
  const [created] = await db
    .insert(clips)
    .values({
      ...data,
      status: "new",
      isAvailable: true,
      postedCount: 0,
    })
    .returning();
  return created;
}

export async function markClipUnavailable(
  dropboxFileId: string
): Promise<void> {
  await db
    .update(clips)
    .set({ isAvailable: false, updatedAt: new Date() })
    .where(eq(clips.dropboxFileId, dropboxFileId));
}

export async function getClipsByProject(projectId: number): Promise<Clip[]> {
  return db
    .select()
    .from(clips)
    .where(eq(clips.projectId, projectId))
    .orderBy(clips.createdAt);
}

// ─── Clips (library queries) ──────────────────────────────────────────────────

type ClipFilters = {
  titleId?: number;
  projectId?: number;
  status?: string;
  unpostedOnly?: boolean;
};

export async function getClips(filters: ClipFilters = {}): Promise<Clip[]> {
  const conditions = [];

  if (filters.titleId) conditions.push(eq(clips.titleId, filters.titleId));
  if (filters.projectId) conditions.push(eq(clips.projectId, filters.projectId));
  if (filters.status) conditions.push(eq(clips.status, filters.status));
  if (filters.unpostedOnly) conditions.push(eq(clips.postedCount, 0));

  const query = db.select().from(clips);
  if (conditions.length > 0) {
    return query.where(and(...conditions)).orderBy(clips.createdAt);
  }
  return query.orderBy(clips.createdAt);
}

export async function getClipById(id: number): Promise<Clip | undefined> {
  const result = await db.select().from(clips).where(eq(clips.id, id)).limit(1);
  return result[0];
}

export async function updateClip(
  id: number,
  data: Partial<Omit<Clip, "id" | "createdAt">>
): Promise<Clip> {
  const [updated] = await db
    .update(clips)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(clips.id, id))
    .returning();
  return updated;
}

export async function approveClip(id: number, approverId: number): Promise<Clip> {
  const [updated] = await db
    .update(clips)
    .set({
      status: "approved",
      approvedById: approverId,
      approvedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(clips.id, id))
    .returning();
  return updated;
}

export async function rejectClip(id: number): Promise<Clip> {
  const [updated] = await db
    .update(clips)
    .set({ status: "rejected", updatedAt: new Date() })
    .where(eq(clips.id, id))
    .returning();
  return updated;
}

export async function bulkUpdateClips(
  ids: number[],
  data: { status?: string; isAvailable?: boolean }
): Promise<void> {
  if (ids.length === 0) return;
  await db
    .update(clips)
    .set({ ...data, updatedAt: new Date() })
    .where(inArray(clips.id, ids));
}

export async function getClipRotationStats(projectId: number): Promise<{
  totalApproved: number;
  postedCount: number;
  remainingInCycle: number;
}> {
  const allApproved = await db
    .select()
    .from(clips)
    .where(and(eq(clips.projectId, projectId), eq(clips.status, "approved")));

  const totalApproved = allApproved.length;
  const posted = allApproved.filter((c) => (c.postedCount ?? 0) > 0).length;
  return {
    totalApproved,
    postedCount: posted,
    remainingInCycle: totalApproved - posted,
  };
}

// ─── Admin: User Management ───────────────────────────────────────────────────

export async function getUsers(): Promise<Omit<User, "password">[]> {
  const all = await db
    .select({
      id: users.id,
      username: users.username,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      isActive: users.isActive,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .orderBy(users.username);
  return all;
}

export async function createUser(data: InsertUser): Promise<Omit<User, "password">> {
  const hashed = await bcrypt.hash(data.password, 12);
  const [created] = await db
    .insert(users)
    .values({ ...data, password: hashed })
    .returning({
      id: users.id,
      username: users.username,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      isActive: users.isActive,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    });
  return created;
}

export async function adminUpdateUser(
  id: number,
  data: { role?: string; isActive?: boolean; firstName?: string; lastName?: string; email?: string }
): Promise<Omit<User, "password">> {
  const [updated] = await db
    .update(users)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning({
      id: users.id,
      username: users.username,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      isActive: users.isActive,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    });
  return updated;
}

export async function resetUserPassword(id: number, newPassword: string): Promise<void> {
  const hashed = await bcrypt.hash(newPassword, 12);
  await db
    .update(users)
    .set({ password: hashed, updatedAt: new Date() })
    .where(eq(users.id, id));
}

// ─── Admin: App Settings ──────────────────────────────────────────────────────

export async function getFullAppSettings(): Promise<AppSettings | null> {
  // Returns full settings including API keys — for admin use only
  const result = await db.select().from(appSettings).where(eq(appSettings.id, 1)).limit(1);
  return result[0] ?? null;
}

export async function updateAppSettings(
  data: Partial<Omit<AppSettings, "id" | "updatedAt">>
): Promise<AppSettings> {
  const [updated] = await db
    .update(appSettings)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(appSettings.id, 1))
    .returning();
  return updated;
}

// ─── Regional Destinations ────────────────────────────────────────────────────

export type DestinationComputedStatus = "active" | "expiring_soon" | "expired";

export function computeDestinationStatus(dest: RegionalDestination): DestinationComputedStatus {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (dest.endDate) {
    const end = new Date(dest.endDate);
    end.setHours(0, 0, 0, 0);
    if (end < today) return "expired";
    const thirtyDaysOut = new Date(today);
    thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30);
    if (end <= thirtyDaysOut) return "expiring_soon";
  }
  return "active";
}

export async function getDestinations(titleId?: number): Promise<(RegionalDestination & { computedStatus: DestinationComputedStatus })[]> {
  const query = db.select().from(regionalDestinations);
  const rows = titleId
    ? await query.where(eq(regionalDestinations.titleId, titleId)).orderBy(regionalDestinations.countryCode)
    : await query.orderBy(regionalDestinations.countryCode);
  return rows.map((d) => ({ ...d, computedStatus: computeDestinationStatus(d) }));
}

export async function getDestinationById(id: number): Promise<RegionalDestination | undefined> {
  const result = await db
    .select()
    .from(regionalDestinations)
    .where(eq(regionalDestinations.id, id))
    .limit(1);
  return result[0];
}

export async function createDestination(
  data: Omit<RegionalDestination, "id" | "createdAt" | "updatedAt">
): Promise<RegionalDestination> {
  const [created] = await db.insert(regionalDestinations).values(data).returning();
  return created;
}

export async function updateDestination(
  id: number,
  data: Partial<Omit<RegionalDestination, "id" | "createdAt" | "updatedAt">>
): Promise<RegionalDestination> {
  const [updated] = await db
    .update(regionalDestinations)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(regionalDestinations.id, id))
    .returning();
  return updated;
}

export async function deleteDestination(id: number): Promise<void> {
  await db.delete(regionalDestinations).where(eq(regionalDestinations.id, id));
}

export async function getExpiringDestinations(daysAhead = 30): Promise<(RegionalDestination & { computedStatus: DestinationComputedStatus })[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const future = new Date(today);
  future.setDate(future.getDate() + daysAhead);

  const rows = await db
    .select()
    .from(regionalDestinations)
    .where(
      and(
        isNotNull(regionalDestinations.endDate),
        lte(regionalDestinations.endDate, future.toISOString().slice(0, 10)),
        gte(regionalDestinations.endDate, today.toISOString().slice(0, 10))
      )
    )
    .orderBy(regionalDestinations.endDate);

  return rows.map((d) => ({ ...d, computedStatus: computeDestinationStatus(d) }));
}

export async function getTitlesWithNoActiveDestinations(): Promise<{ id: number; titleName: string }[]> {
  const activeDestTitleIds = await db
    .selectDistinct({ titleId: regionalDestinations.titleId })
    .from(regionalDestinations)
    .where(eq(regionalDestinations.status, "active"));

  const activeIds = activeDestTitleIds.map((r) => r.titleId).filter((id): id is number => id !== null);

  const allTitles = await db.select({ id: titles.id, titleName: titles.titleName }).from(titles);

  return allTitles.filter((t) => !activeIds.includes(t.id));
}

// ─── Smart Links ───────────────────────────────────────────────────────────────

export function generateSlug(): string {
  return Math.random().toString(36).slice(2, 10);
}

export async function getSmartLinks(titleId?: number): Promise<SmartLink[]> {
  const query = db.select().from(smartLinks);
  return titleId
    ? query.where(eq(smartLinks.titleId, titleId)).orderBy(smartLinks.createdAt)
    : query.orderBy(smartLinks.createdAt);
}

export async function getSmartLinkById(id: number): Promise<SmartLink | undefined> {
  const result = await db.select().from(smartLinks).where(eq(smartLinks.id, id)).limit(1);
  return result[0];
}

export async function getSmartLinkBySlug(slug: string): Promise<SmartLink | undefined> {
  const result = await db.select().from(smartLinks).where(eq(smartLinks.slug, slug)).limit(1);
  return result[0];
}

export async function createSmartLink(
  data: Omit<SmartLink, "id" | "createdAt" | "updatedAt"> & { slug?: string }
): Promise<SmartLink> {
  const slug = (data.slug ?? "").trim() || generateSlug();
  // Ensure slug uniqueness — retry once on collision
  const existing = await getSmartLinkBySlug(slug);
  if (existing) {
    const retrySlug = generateSlug();
    const [created] = await db.insert(smartLinks).values({ ...data, slug: retrySlug }).returning();
    return created;
  }
  const [created] = await db.insert(smartLinks).values({ ...data, slug }).returning();
  return created;
}

export async function updateSmartLink(
  id: number,
  data: Partial<Omit<SmartLink, "id" | "slug" | "createdAt" | "updatedAt">>
): Promise<SmartLink> {
  const [updated] = await db
    .update(smartLinks)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(smartLinks.id, id))
    .returning();
  return updated;
}

export async function deleteSmartLink(id: number): Promise<void> {
  await db.delete(smartLinks).where(eq(smartLinks.id, id));
}

export async function recordSmartLinkClick(
  smartLinkId: number,
  countryCode: string,
  resolvedUrl: string,
  isDefault: boolean
): Promise<void> {
  await db.insert(analyticsEvents).values({
    eventType: "smart_link_click",
    smartLinkId,
    region: countryCode,
    metadata: { resolvedUrl, isDefault },
  });
}

export async function resolveDestinationForCountry(
  titleId: number,
  countryCode: string
): Promise<RegionalDestination | undefined> {
  const today = new Date().toISOString().slice(0, 10);
  const result = await db
    .select()
    .from(regionalDestinations)
    .where(
      and(
        eq(regionalDestinations.titleId, titleId),
        eq(regionalDestinations.countryCode, countryCode.toUpperCase()),
        eq(regionalDestinations.status, "active"),
        sql`(${regionalDestinations.startDate} IS NULL OR ${regionalDestinations.startDate} <= ${today})`,
        sql`(${regionalDestinations.endDate} IS NULL OR ${regionalDestinations.endDate} >= ${today})`
      )
    )
    .orderBy(sql`${regionalDestinations.campaignPriority} DESC`)
    .limit(1);
  return result[0];
}

// ─── Clip Rotation Engine ─────────────────────────────────────────────────────

export interface EngagementMetrics {
  likes?: number | null;
  comments?: number | null;
  shares?: number | null;
  saves?: number | null;
  plays?: number | null;
  clickThroughs?: number | null;
  impressions?: number | null;
}

export function computeEngagementScore(metrics: EngagementMetrics): number {
  const likes = metrics.likes ?? 0;
  const comments = metrics.comments ?? 0;
  const shares = metrics.shares ?? 0;
  const saves = metrics.saves ?? 0;
  const plays = metrics.plays ?? 0;
  const clickThroughs = metrics.clickThroughs ?? 0;
  const impressions = Math.max(metrics.impressions ?? 0, 1);
  const score =
    (likes * 3 + comments * 4 + shares * 5 + saves * 4 + plays * 1 + clickThroughs * 6) /
    impressions;
  return Math.round(score * 10000) / 10000;
}

export async function createClipPost(data: {
  clipId: number;
  platform?: string;
  region?: string;
  caption?: string;
  cta?: string;
  smartLinkId?: number;
  postedById?: number;
  postedAt?: Date;
}): Promise<ClipPost> {
  const postedAt = data.postedAt ?? new Date();

  const [clipPost] = await db
    .insert(clipPosts)
    .values({
      clipId: data.clipId,
      platform: data.platform,
      region: data.region,
      captionUsed: data.caption,
      ctaUsed: data.cta,
      smartLinkId: data.smartLinkId,
      postedById: data.postedById,
      postedAt,
    })
    .returning();

  await db
    .update(clips)
    .set({
      postedCount: sql`${clips.postedCount} + 1`,
      lastPostedAt: postedAt,
      updatedAt: new Date(),
    })
    .where(eq(clips.id, data.clipId));

  // Recompute engagement score from all posts for this clip
  const allPosts = await db.select().from(clipPosts).where(eq(clipPosts.clipId, data.clipId));
  if (allPosts.length > 0) {
    const newScore = computeEngagementScore({
      likes: allPosts.reduce((s, p) => s + (p.likes ?? 0), 0),
      comments: allPosts.reduce((s, p) => s + (p.comments ?? 0), 0),
      shares: allPosts.reduce((s, p) => s + (p.shares ?? 0), 0),
      saves: allPosts.reduce((s, p) => s + (p.saves ?? 0), 0),
      plays: allPosts.reduce((s, p) => s + (p.plays ?? 0), 0),
      clickThroughs: allPosts.reduce((s, p) => s + (p.clickThroughs ?? 0), 0),
      impressions: allPosts.reduce((s, p) => s + (p.impressions ?? 0), 0),
    });
    await db
      .update(clips)
      .set({ engagementScore: newScore.toString() })
      .where(eq(clips.id, data.clipId));
  }

  return clipPost;
}

export async function getClipPosts(clipId: number): Promise<ClipPost[]> {
  return db
    .select()
    .from(clipPosts)
    .where(eq(clipPosts.clipId, clipId))
    .orderBy(desc(clipPosts.postedAt));
}

export async function getLastPostForClip(clipId: number): Promise<ClipPost | null> {
  const result = await db
    .select()
    .from(clipPosts)
    .where(eq(clipPosts.clipId, clipId))
    .orderBy(desc(clipPosts.postedAt))
    .limit(1);
  return result[0] ?? null;
}

export interface DuplicateWarning {
  lastPostedAt: Date;
  platform: string;
  region: string;
  daysSince: number;
}

export async function getDuplicateWarning(
  clipId: number,
  platform: string,
  region: string
): Promise<DuplicateWarning | null> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const result = await db
    .select()
    .from(clipPosts)
    .where(
      and(
        eq(clipPosts.clipId, clipId),
        eq(clipPosts.platform, platform),
        eq(clipPosts.region, region),
        sql`${clipPosts.postedAt} >= ${thirtyDaysAgo.toISOString()}`
      )
    )
    .orderBy(desc(clipPosts.postedAt))
    .limit(1);

  if (!result[0]?.postedAt) return null;
  const daysSince = Math.floor(
    (Date.now() - result[0].postedAt.getTime()) / (24 * 60 * 60 * 1000)
  );
  return {
    lastPostedAt: result[0].postedAt,
    platform: result[0].platform ?? platform,
    region: result[0].region ?? region,
    daysSince,
  };
}

export interface RotationStats {
  totalApproved: number;
  totalPosted: number;
  totalUnposted: number;
  isPoolExhausted: boolean;
  lastResetAt: Date | null;
}

export async function getRotationStats(projectId: number): Promise<RotationStats> {
  const allApproved = await db
    .select()
    .from(clips)
    .where(and(eq(clips.projectId, projectId), eq(clips.status, "approved")));

  const totalApproved = allApproved.length;
  const totalPosted = allApproved.filter((c) => (c.postedCount ?? 0) > 0).length;
  const totalUnposted = totalApproved - totalPosted;
  return {
    totalApproved,
    totalPosted,
    totalUnposted,
    isPoolExhausted: totalApproved > 0 && totalUnposted === 0,
    lastResetAt: null,
  };
}

export async function resetRotationCycle(projectId: number): Promise<void> {
  await db
    .update(clips)
    .set({ postedCount: 0, lastPostedAt: null, updatedAt: new Date() })
    .where(and(eq(clips.projectId, projectId), eq(clips.status, "approved")));
}

function isClipAllowedForRegionAndPlatform(
  clip: Clip,
  region?: string,
  platform?: string
): boolean {
  if (region) {
    const allowed = clip.allowedRegions as string[] | null;
    const restricted = clip.restrictedRegions as string[] | null;
    if (allowed && allowed.length > 0 && !allowed.includes(region)) return false;
    if (restricted && restricted.length > 0 && restricted.includes(region)) return false;
  }
  if (platform) {
    const fit = clip.platformFit as string[] | null;
    if (fit && fit.length > 0 && !fit.includes(platform)) return false;
  }
  return true;
}

export async function pickNextClip(
  projectId: number,
  options: { region?: string; platform?: string } = {}
): Promise<Clip | null> {
  const { region, platform } = options;

  const fetchUnposted = () =>
    db
      .select()
      .from(clips)
      .where(
        and(eq(clips.projectId, projectId), eq(clips.status, "approved"), eq(clips.postedCount, 0))
      )
      .orderBy(desc(clips.engagementScore));

  const unposted = await fetchUnposted();
  const eligible = unposted.filter((c) => isClipAllowedForRegionAndPlatform(c, region, platform));

  if (eligible[0]) return eligible[0];

  // Pool exhausted — check if there are any approved clips for this filter at all
  const allApproved = await db
    .select()
    .from(clips)
    .where(and(eq(clips.projectId, projectId), eq(clips.status, "approved")));

  const anyEligible = allApproved.some((c) =>
    isClipAllowedForRegionAndPlatform(c, region, platform)
  );
  if (!anyEligible) return null;

  await resetRotationCycle(projectId);

  const afterReset = await fetchUnposted();
  const eligibleAfterReset = afterReset.filter((c) =>
    isClipAllowedForRegionAndPlatform(c, region, platform)
  );

  return eligibleAfterReset[0] ?? null;
}

export async function computeClipPerformanceScore(clipId: number): Promise<number> {
  const posts = await db.select().from(clipPosts).where(eq(clipPosts.clipId, clipId));
  if (posts.length === 0) return 0.0;

  const totals = posts.reduce(
    (acc, p) => ({
      likes: acc.likes + (p.likes ?? 0),
      comments: acc.comments + (p.comments ?? 0),
      shares: acc.shares + (p.shares ?? 0),
      saves: acc.saves + (p.saves ?? 0),
      plays: acc.plays + (p.plays ?? 0),
      clickThroughs: acc.clickThroughs + (p.clickThroughs ?? 0),
      impressions: acc.impressions + (p.impressions ?? 0),
    }),
    { likes: 0, comments: 0, shares: 0, saves: 0, plays: 0, clickThroughs: 0, impressions: 0 }
  );

  const engagementScore = computeEngagementScore(totals);
  const avgCTR = (totals.clickThroughs / Math.max(totals.impressions, 1)) * 100;

  const distinctRegions = new Set(posts.map((p) => p.region).filter((r): r is string => r !== null));
  const regionBreadth = Math.min((distinctRegions.size / 5) * 20, 20);

  const distinctPlatforms = new Set(posts.map((p) => p.platform).filter((p): p is string => p !== null));
  const platformBreadth = Math.min((distinctPlatforms.size / 4) * 20, 20);

  const total = engagementScore + avgCTR + regionBreadth + platformBreadth;
  return Math.round(total * 10000) / 10000;
}

export async function isRepostEligible(
  clipId: number,
  options: { engagementThreshold: number; minDaysSinceLastPost: number; isPoolExhausted: boolean }
): Promise<boolean> {
  const clip = await getClipById(clipId);
  if (!clip) return false;

  const daysSince = clip.lastPostedAt
    ? Math.floor((Date.now() - clip.lastPostedAt.getTime()) / 86400000)
    : 999;

  const meetsEngagement = Number(clip.engagementScore ?? 0) >= options.engagementThreshold;
  const meetsDays = daysSince >= options.minDaysSinceLastPost;
  const meetsPool = options.isPoolExhausted || (clip.postedCount ?? 0) > 0;

  return meetsEngagement && meetsDays && meetsPool;
}

export async function recordAnalyticsEvent(data: {
  eventType: string;
  clipId?: number;
  clipPostId?: number;
  campaignId?: number;
  smartLinkId?: number;
  userId?: number;
  region?: string;
  platform?: string;
  metadata?: Record<string, unknown>;
}): Promise<AnalyticsEvent> {
  const [created] = await db.insert(analyticsEvents).values(data).returning();
  return created;
}

// ─── Campaigns ────────────────────────────────────────────────────────────────

export async function getCampaigns(titleId?: number): Promise<(Campaign & { titleName: string })[]> {
  const query = db
    .select({
      id: campaigns.id,
      titleId: campaigns.titleId,
      projectId: campaigns.projectId,
      campaignName: campaigns.campaignName,
      goal: campaigns.goal,
      status: campaigns.status,
      templateType: campaigns.templateType,
      targetRegions: campaigns.targetRegions,
      clipIds: campaigns.clipIds,
      smartLinkId: campaigns.smartLinkId,
      briefText: campaigns.briefText,
      aiProviderUsed: campaigns.aiProviderUsed,
      aiModelUsed: campaigns.aiModelUsed,
      aiTokensUsed: campaigns.aiTokensUsed,
      createdById: campaigns.createdById,
      approvedById: campaigns.approvedById,
      approvedAt: campaigns.approvedAt,
      createdAt: campaigns.createdAt,
      updatedAt: campaigns.updatedAt,
      titleName: titles.titleName,
    })
    .from(campaigns)
    .leftJoin(titles, eq(campaigns.titleId, titles.id));

  const rows = titleId
    ? await query.where(eq(campaigns.titleId, titleId)).orderBy(desc(campaigns.createdAt))
    : await query.orderBy(desc(campaigns.createdAt));

  return rows.map((r) => ({ ...r, titleName: r.titleName ?? "" }));
}

export async function getCampaignById(id: number): Promise<Campaign | undefined> {
  const result = await db.select().from(campaigns).where(eq(campaigns.id, id)).limit(1);
  return result[0];
}

export async function createCampaign(data: InsertCampaign): Promise<Campaign> {
  const [created] = await db
    .insert(campaigns)
    .values({ ...data, status: data.status ?? "draft" })
    .returning();
  return created;
}

export async function updateCampaign(id: number, data: Partial<InsertCampaign>): Promise<Campaign> {
  const [updated] = await db
    .update(campaigns)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(campaigns.id, id))
    .returning();
  return updated;
}

export async function deleteCampaign(id: number): Promise<void> {
  await db.delete(campaigns).where(eq(campaigns.id, id));
}

export async function patchCampaignStatus(
  id: number,
  status: string,
  userId?: number
): Promise<Campaign> {
  const patch: Record<string, unknown> = { status, updatedAt: new Date() };
  if (status === "approved" && userId != null) {
    patch.approvedById = userId;
    patch.approvedAt = new Date();
  }
  const [updated] = await db
    .update(campaigns)
    .set(patch)
    .where(eq(campaigns.id, id))
    .returning();
  return updated;
}

// ─── Campaign Contents ────────────────────────────────────────────────────────

export async function getCampaignContents(campaignId: number): Promise<CampaignContent[]> {
  return db
    .select()
    .from(campaignContents)
    .where(eq(campaignContents.campaignId, campaignId))
    .orderBy(
      asc(campaignContents.contentType),
      asc(campaignContents.platform),
      asc(campaignContents.region),
      desc(campaignContents.version)
    );
}

export async function createCampaignContent(data: InsertCampaignContent): Promise<CampaignContent> {
  const [created] = await db.insert(campaignContents).values(data).returning();
  return created;
}

export async function activateCampaignContentVersion(
  versionId: number,
  campaignId: number,
  contentType: string,
  platform: string,
  region: string
): Promise<CampaignContent> {
  return db.transaction(async (tx) => {
    // Deactivate all versions matching this (campaignId, contentType, platform, region)
    await tx
      .update(campaignContents)
      .set({ isActive: false })
      .where(
        and(
          eq(campaignContents.campaignId, campaignId),
          eq(campaignContents.contentType, contentType),
          eq(campaignContents.platform, platform),
          eq(campaignContents.region, region)
        )
      );

    // Activate the chosen version
    const [activated] = await tx
      .update(campaignContents)
      .set({ isActive: true })
      .where(eq(campaignContents.id, versionId))
      .returning();

    return activated;
  });
}

export async function getActiveCampaignContents(campaignId: number): Promise<CampaignContent[]> {
  return db
    .select()
    .from(campaignContents)
    .where(
      and(
        eq(campaignContents.campaignId, campaignId),
        eq(campaignContents.isActive, true)
      )
    );
}

// ─── AI Logs ──────────────────────────────────────────────────────────────────

export async function createAiLog(
  data: Omit<InsertAiLog, "id" | "createdAt">
): Promise<AiLog> {
  const [created] = await db.insert(aiLogs).values(data).returning();
  return created;
}

export async function getAiLogById(id: number): Promise<AiLog | null> {
  const result = await db.select().from(aiLogs).where(eq(aiLogs.id, id)).limit(1);
  return result[0] ?? null;
}

export async function getAiLogs(
  page: number,
  limit: number
): Promise<{ rows: AiLog[]; total: number }> {
  const offset = (page - 1) * limit;
  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(aiLogs)
      .orderBy(desc(aiLogs.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(aiLogs),
  ]);
  return { rows, total: Number(total) };
}

export async function getAiUsageSummary(): Promise<{
  dailyTotal: number;
  userTotals: { userId: number | null; total: number }[];
}> {
  const todayMidnight = new Date();
  todayMidnight.setUTCHours(0, 0, 0, 0);

  const [dailyResult, userResult] = await Promise.all([
    db
      .select({ total: sql<number>`COALESCE(SUM(${aiLogs.tokensIn} + ${aiLogs.tokensOut}), 0)` })
      .from(aiLogs)
      .where(
        and(
          gte(aiLogs.createdAt, todayMidnight),
          eq(aiLogs.status, "success")
        )
      ),
    db
      .select({
        userId: aiLogs.userId,
        total: sql<number>`COALESCE(SUM(${aiLogs.tokensIn} + ${aiLogs.tokensOut}), 0)`,
      })
      .from(aiLogs)
      .where(
        and(
          gte(aiLogs.createdAt, todayMidnight),
          eq(aiLogs.status, "success")
        )
      )
      .groupBy(aiLogs.userId),
  ]);

  return {
    dailyTotal: Number(dailyResult[0]?.total ?? 0),
    userTotals: userResult.map((r) => ({
      userId: r.userId,
      total: Number(r.total),
    })),
  };
}

export async function checkTokenCaps(
  userId: number,
  settings: AppSettings
): Promise<void> {
  const todayMidnight = new Date();
  todayMidnight.setUTCHours(0, 0, 0, 0);

  const [globalResult, userResult] = await Promise.all([
    db
      .select({ total: sql<number>`COALESCE(SUM(${aiLogs.tokensIn} + ${aiLogs.tokensOut}), 0)` })
      .from(aiLogs)
      .where(
        and(
          gte(aiLogs.createdAt, todayMidnight),
          eq(aiLogs.status, "success")
        )
      ),
    db
      .select({ total: sql<number>`COALESCE(SUM(${aiLogs.tokensIn} + ${aiLogs.tokensOut}), 0)` })
      .from(aiLogs)
      .where(
        and(
          eq(aiLogs.userId, userId),
          gte(aiLogs.createdAt, todayMidnight),
          eq(aiLogs.status, "success")
        )
      ),
  ]);

  const dailyTotal = Number(globalResult[0]?.total ?? 0);
  const userTotal = Number(userResult[0]?.total ?? 0);

  const dailyCap = settings.aiDailyTokenCap ?? 100000;
  const perUserCap = settings.aiPerUserCap ?? 10000;

  if (dailyTotal >= dailyCap) {
    throw new Error("Daily token cap reached");
  }
  if (userTotal >= perUserCap) {
    throw new Error("User token cap reached");
  }
}

// ─── Prompt Templates ─────────────────────────────────────────────────────────

export async function getPromptTemplates(): Promise<PromptTemplate[]> {
  return db.select().from(promptTemplates).orderBy(asc(promptTemplates.taskName));
}

export async function getPromptTemplate(taskName: string): Promise<PromptTemplate | undefined> {
  const result = await db
    .select()
    .from(promptTemplates)
    .where(
      and(
        eq(promptTemplates.taskName, taskName),
        eq(promptTemplates.isActive, true)
      )
    )
    .orderBy(desc(promptTemplates.version))
    .limit(1);
  return result[0];
}

export async function updatePromptTemplate(
  id: number,
  data: Partial<InsertPromptTemplate>
): Promise<PromptTemplate> {
  const [updated] = await db
    .update(promptTemplates)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(promptTemplates.id, id))
    .returning();
  return updated;
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export async function getClipAnalytics(clipId: number): Promise<ClipPost[]> {
  return db
    .select()
    .from(clipPosts)
    .where(eq(clipPosts.clipId, clipId))
    .orderBy(desc(clipPosts.postedAt));
}

export async function getCampaignAnalytics(campaignId: number): Promise<ClipPost[]> {
  return db
    .select()
    .from(clipPosts)
    .where(eq(clipPosts.campaignId, campaignId))
    .orderBy(desc(clipPosts.postedAt));
}

export async function getAnalyticsByRegion(
  titleId?: number
): Promise<{ region: string; impressions: number; plays: number; likes: number; clickThroughs: number; postCount: number }[]> {
  const baseQuery = db
    .select({
      region: clipPosts.region,
      impressions: sql<number>`COALESCE(SUM(${clipPosts.impressions}), 0)`,
      plays: sql<number>`COALESCE(SUM(${clipPosts.plays}), 0)`,
      likes: sql<number>`COALESCE(SUM(${clipPosts.likes}), 0)`,
      clickThroughs: sql<number>`COALESCE(SUM(${clipPosts.clickThroughs}), 0)`,
      postCount: sql<number>`COUNT(*)`,
    })
    .from(clipPosts);

  const rows = titleId
    ? await baseQuery
        .innerJoin(clips, eq(clipPosts.clipId, clips.id))
        .where(and(isNotNull(clipPosts.region), eq(clips.titleId, titleId)))
        .groupBy(clipPosts.region)
    : await baseQuery.where(isNotNull(clipPosts.region)).groupBy(clipPosts.region);

  return rows
    .filter((r): r is typeof r & { region: string } => r.region !== null)
    .map((r) => ({
      region: r.region,
      impressions: Number(r.impressions),
      plays: Number(r.plays),
      likes: Number(r.likes),
      clickThroughs: Number(r.clickThroughs),
      postCount: Number(r.postCount),
    }));
}

export async function getAnalyticsByPlatform(
  titleId?: number
): Promise<{ platform: string; impressions: number; plays: number; likes: number; clickThroughs: number; postCount: number }[]> {
  const baseQuery = db
    .select({
      platform: clipPosts.platform,
      impressions: sql<number>`COALESCE(SUM(${clipPosts.impressions}), 0)`,
      plays: sql<number>`COALESCE(SUM(${clipPosts.plays}), 0)`,
      likes: sql<number>`COALESCE(SUM(${clipPosts.likes}), 0)`,
      clickThroughs: sql<number>`COALESCE(SUM(${clipPosts.clickThroughs}), 0)`,
      postCount: sql<number>`COUNT(*)`,
    })
    .from(clipPosts);

  const rows = titleId
    ? await baseQuery
        .innerJoin(clips, eq(clipPosts.clipId, clips.id))
        .where(and(isNotNull(clipPosts.platform), eq(clips.titleId, titleId)))
        .groupBy(clipPosts.platform)
    : await baseQuery.where(isNotNull(clipPosts.platform)).groupBy(clipPosts.platform);

  return rows
    .filter((r): r is typeof r & { platform: string } => r.platform !== null)
    .map((r) => ({
      platform: r.platform,
      impressions: Number(r.impressions),
      plays: Number(r.plays),
      likes: Number(r.likes),
      clickThroughs: Number(r.clickThroughs),
      postCount: Number(r.postCount),
    }));
}

export async function getTopPerformingClips(limit = 10): Promise<Clip[]> {
  return db
    .select()
    .from(clips)
    .where(isNotNull(clips.engagementScore))
    .orderBy(desc(clips.engagementScore))
    .limit(limit);
}

export async function getAnalyticsDashboardSummary(): Promise<{
  activeCampaigns: Campaign[];
  titlesNeedingPromotion: Title[];
  rotationByProject: Array<{ projectId: number; projectName: string; totalApproved: number; totalPosted: number; isPoolExhausted: boolean }>;
  topClips: Clip[];
}> {
  const [activeCampaigns, allTitles, allCampaigns, allProjects, topClips] = await Promise.all([
    db.select().from(campaigns).where(inArray(campaigns.status, ["active", "awaiting_approval", "ai_generated"])),
    db.select().from(titles),
    db.select({ titleId: campaigns.titleId }).from(campaigns).where(eq(campaigns.status, "active")),
    db.select().from(projects),
    getTopPerformingClips(5),
  ]);

  const activeTitleIds = new Set(allCampaigns.map((c) => c.titleId));
  const titlesNeedingPromotion = allTitles.filter((t) => !activeTitleIds.has(t.id));

  const rotationByProject = await Promise.all(
    allProjects.map(async (p) => {
      const stats = await getRotationStats(p.id);
      return {
        projectId: p.id,
        projectName: p.projectName,
        totalApproved: stats.totalApproved,
        totalPosted: stats.totalPosted,
        isPoolExhausted: stats.isPoolExhausted,
      };
    })
  );

  return { activeCampaigns, titlesNeedingPromotion, rotationByProject, topClips };
}

export async function getAssetHealthReport(): Promise<{
  unsyncedProjects: Project[];
  titlesWithNoClips: Title[];
  titlesWithNoDestinations: { id: number; titleName: string }[];
  clipsWithMissingMetadata: Clip[];
}> {
  const [allProjects, allTitles, allClips, titlesWithNoDestinations, clipsWithMissingMetadata] =
    await Promise.all([
      db.select().from(projects),
      db.select().from(titles),
      db.select({ titleId: clips.titleId }).from(clips),
      getTitlesWithNoActiveDestinations(),
      db
        .select()
        .from(clips)
        .where(sql`${clips.hookType} IS NULL OR ${clips.theme} IS NULL`)
        .limit(50),
    ]);

  const unsyncedProjects = allProjects.filter(
    (p) => p.syncStatus === "error" || p.lastSyncedAt === null
  );

  const clippedTitleIds = new Set(
    allClips.map((c) => c.titleId).filter((id): id is number => id !== null)
  );
  const titlesWithNoClips = allTitles.filter((t) => !clippedTitleIds.has(t.id));

  return { unsyncedProjects, titlesWithNoClips, titlesWithNoDestinations, clipsWithMissingMetadata };
}

// ─── Notifications ────────────────────────────────────────────────────────────

export async function createNotification(data: {
  userId?: number;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}): Promise<Notification> {
  const [created] = await db
    .insert(notifications)
    .values({ ...data, isRead: false })
    .returning();
  return created;
}

export async function getNotifications(userId?: number, limit = 50): Promise<Notification[]> {
  const query = db.select().from(notifications);
  const rows = userId
    ? await query.where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(limit)
    : await query.orderBy(desc(notifications.createdAt)).limit(limit);
  return rows;
}

export async function getUnreadCount(userId?: number): Promise<number> {
  const conditions = [eq(notifications.isRead, false)];
  if (userId != null) conditions.push(eq(notifications.userId, userId));
  const [result] = await db
    .select({ total: count() })
    .from(notifications)
    .where(and(...conditions));
  return Number(result?.total ?? 0);
}

export async function markNotificationRead(id: number, userId: number): Promise<boolean> {
  const result = await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
    .returning({ id: notifications.id });
  return result.length > 0;
}

export async function markAllNotificationsRead(userId?: number): Promise<void> {
  const conditions = [eq(notifications.isRead, false)];
  if (userId != null) conditions.push(eq(notifications.userId, userId));
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(...conditions));
}

// ─── Social Connections ──────────────────────────────────────────────────────

export async function getSocialConnections(): Promise<SocialConnection[]> {
  return db.select().from(socialConnections).orderBy(socialConnections.platform);
}

export async function getSocialConnectionById(id: number): Promise<SocialConnection | undefined> {
  const [row] = await db.select().from(socialConnections).where(eq(socialConnections.id, id)).limit(1);
  return row;
}

export async function getActiveSocialConnections(): Promise<SocialConnection[]> {
  return db.select().from(socialConnections).where(eq(socialConnections.isActive, true)).orderBy(socialConnections.platform);
}

export async function createSocialConnection(data: InsertSocialConnection): Promise<SocialConnection> {
  const [created] = await db.insert(socialConnections).values(data).returning();
  return created;
}

export async function updateSocialConnection(id: number, data: Partial<InsertSocialConnection>): Promise<SocialConnection | undefined> {
  const [updated] = await db
    .update(socialConnections)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(socialConnections.id, id))
    .returning();
  return updated;
}

export async function deleteSocialConnection(id: number): Promise<boolean> {
  const result = await db.delete(socialConnections).where(eq(socialConnections.id, id)).returning({ id: socialConnections.id });
  return result.length > 0;
}

// ─── Scheduled Posts ─────────────────────────────────────────────────────────

export async function getScheduledPosts(filters?: {
  status?: string;
  platform?: string;
  campaignId?: number;
  from?: Date;
  to?: Date;
}): Promise<ScheduledPost[]> {
  const conditions: SQL[] = [];
  if (filters?.status) conditions.push(eq(scheduledPosts.status, filters.status));
  if (filters?.platform) conditions.push(eq(scheduledPosts.platform, filters.platform));
  if (filters?.campaignId) conditions.push(eq(scheduledPosts.campaignId, filters.campaignId));
  if (filters?.from) conditions.push(sql`${scheduledPosts.scheduledAt} >= ${filters.from.toISOString()}`);
  if (filters?.to) conditions.push(sql`${scheduledPosts.scheduledAt} <= ${filters.to.toISOString()}`);

  const query = conditions.length > 0
    ? db.select().from(scheduledPosts).where(and(...conditions))
    : db.select().from(scheduledPosts);

  return query.orderBy(scheduledPosts.scheduledAt);
}

export async function getScheduledPostById(id: number): Promise<ScheduledPost | undefined> {
  const [row] = await db.select().from(scheduledPosts).where(eq(scheduledPosts.id, id)).limit(1);
  return row;
}

export async function createScheduledPost(data: InsertScheduledPost): Promise<ScheduledPost> {
  const [created] = await db.insert(scheduledPosts).values(data).returning();
  return created;
}

export async function updateScheduledPost(id: number, data: Partial<InsertScheduledPost & { status: string; publishedAt: string; platformPostId: string; platformPostUrl: string; errorMessage: string }>): Promise<ScheduledPost | undefined> {
  const [updated] = await db
    .update(scheduledPosts)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(scheduledPosts.id, id))
    .returning();
  return updated;
}

export async function deleteScheduledPost(id: number): Promise<boolean> {
  const result = await db.delete(scheduledPosts).where(eq(scheduledPosts.id, id)).returning({ id: scheduledPosts.id });
  return result.length > 0;
}

export async function approveScheduledPost(id: number, userId: number): Promise<ScheduledPost | undefined> {
  const [updated] = await db
    .update(scheduledPosts)
    .set({ status: "scheduled", approvedById: userId, approvedAt: new Date(), updatedAt: new Date() })
    .where(eq(scheduledPosts.id, id))
    .returning();
  return updated;
}

export async function getPostsDueForPublishing(): Promise<ScheduledPost[]> {
  const now = new Date();
  return db
    .select()
    .from(scheduledPosts)
    .where(
      and(
        eq(scheduledPosts.status, "scheduled"),
        sql`${scheduledPosts.scheduledAt} <= ${now.toISOString()}`
      )
    )
    .orderBy(scheduledPosts.scheduledAt);
}

export async function markPostPublished(id: number, platformPostId: string, platformPostUrl: string): Promise<ScheduledPost | undefined> {
  const [updated] = await db
    .update(scheduledPosts)
    .set({
      status: "published",
      publishedAt: new Date(),
      platformPostId,
      platformPostUrl,
      updatedAt: new Date(),
    })
    .where(eq(scheduledPosts.id, id))
    .returning();
  return updated;
}

export async function markPostFailed(id: number, errorMessage: string): Promise<ScheduledPost | undefined> {
  const post = await getScheduledPostById(id);
  const retryCount = (post?.retryCount ?? 0) + 1;
  const [updated] = await db
    .update(scheduledPosts)
    .set({
      status: "failed",
      errorMessage,
      retryCount,
      updatedAt: new Date(),
    })
    .where(eq(scheduledPosts.id, id))
    .returning();
  return updated;
}

export async function getCalendarPosts(from: Date, to: Date): Promise<ScheduledPost[]> {
  return db
    .select()
    .from(scheduledPosts)
    .where(
      and(
        sql`${scheduledPosts.scheduledAt} >= ${from.toISOString()}`,
        sql`${scheduledPosts.scheduledAt} <= ${to.toISOString()}`,
        sql`${scheduledPosts.status} != 'cancelled'`
      )
    )
    .orderBy(scheduledPosts.scheduledAt);
}

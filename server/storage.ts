import { db } from "./db.js";
import { users, appSettings, titles, clips, campaigns, projects, regionalDestinations, smartLinks, analyticsEvents } from "@shared/schema.js";
import { eq, count, and, inArray, lte, gte, isNotNull, sql } from "drizzle-orm";
import type { User, AppSettings, Title, InsertTitle, Project, InsertProject, Clip, InsertUser, RegionalDestination, SmartLink, AnalyticsEvent } from "@shared/schema.js";
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

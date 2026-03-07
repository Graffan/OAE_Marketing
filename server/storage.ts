import { db } from "./db.js";
import { users, appSettings, titles, clips, campaigns, projects } from "@shared/schema.js";
import { eq, count } from "drizzle-orm";
import type { User, AppSettings, Title, InsertTitle, Project, InsertProject, Clip } from "@shared/schema.js";

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

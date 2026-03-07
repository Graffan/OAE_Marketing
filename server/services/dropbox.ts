import { Dropbox } from "dropbox";
import type { files } from "dropbox";
import {
  getProjectById,
  updateProjectSyncState,
  upsertClipFromDropbox,
} from "../storage.js";

// Supported video extensions for viral clips
const VIDEO_EXTENSIONS = [".mp4", ".mov", ".m4v", ".avi", ".mkv"];

export function getDropboxClient(): Dropbox {
  const clientId = process.env.DROPBOX_APP_KEY;
  const clientSecret = process.env.DROPBOX_APP_SECRET;
  const refreshToken = process.env.DROPBOX_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Dropbox credentials not configured. Set DROPBOX_APP_KEY, DROPBOX_APP_SECRET, DROPBOX_REFRESH_TOKEN in .env"
    );
  }

  return new Dropbox({ clientId, clientSecret, refreshToken });
}

function isVideoFile(filename: string): boolean {
  const ext = filename.substring(filename.lastIndexOf(".")).toLowerCase();
  return VIDEO_EXTENSIONS.includes(ext);
}

function inferMimeType(filename: string): string {
  const ext = filename.substring(filename.lastIndexOf(".")).toLowerCase();
  const map: Record<string, string> = {
    ".mp4": "video/mp4",
    ".mov": "video/quicktime",
    ".m4v": "video/x-m4v",
    ".avi": "video/x-msvideo",
    ".mkv": "video/x-matroska",
  };
  return map[ext] ?? "video/mp4";
}

// List all files in a folder (handles pagination via cursor)
export async function listFolderContents(
  dbx: Dropbox,
  path: string
): Promise<files.FileMetadataReference[]> {
  const allFiles: files.FileMetadataReference[] = [];

  let result = await dbx.filesListFolder({ path, recursive: false });
  for (const entry of result.result.entries) {
    if (entry[".tag"] === "file") {
      allFiles.push(entry as files.FileMetadataReference);
    }
  }

  while (result.result.has_more) {
    const cont = await dbx.filesListFolderContinue({
      cursor: result.result.cursor,
    });
    for (const entry of cont.result.entries) {
      if (entry[".tag"] === "file") {
        allFiles.push(entry as files.FileMetadataReference);
      }
    }
    result = cont as any;
  }

  return allFiles;
}

// Get thumbnail as data URL for a file path
export async function getFileThumbnail(
  dbx: Dropbox,
  path: string
): Promise<string | null> {
  try {
    const result = await dbx.filesGetThumbnailV2({
      resource: { ".tag": "path", path },
      format: { ".tag": "jpeg" },
      size: { ".tag": "w256h256" },
    });

    const buffer = (result.result as any).fileBinary as Buffer ?? (result.result as any).thumbnail as Buffer;
    if (!buffer) return null;
    const base64 = Buffer.from(buffer).toString("base64");
    return `data:image/jpeg;base64,${base64}`;
  } catch (err: any) {
    console.error(
      `[Dropbox] Thumbnail fetch failed for ${path}:`,
      err.message
    );
    return null;
  }
}

// Full sync: scan viral_clips_folder_path, upsert clips into DB
export async function syncProjectClips(projectId: number): Promise<void> {
  const project = await getProjectById(projectId);
  if (!project) throw new Error(`Project ${projectId} not found`);

  if (!project.dropboxViralClipsFolderPath) {
    throw new Error("Project has no Dropbox viral clips folder configured");
  }

  // Set status to syncing
  await updateProjectSyncState(projectId, { syncStatus: "syncing" });

  const dbx = getDropboxClient();
  let cursor = project.dropboxCursor;
  let addedCount = 0;

  try {
    let entries: files.MetadataReference[] = [];

    if (!cursor) {
      // Full sync: use filesListFolder
      console.log(
        `[Dropbox] Starting full sync for project ${projectId} at ${project.dropboxViralClipsFolderPath}`
      );
      let result = await dbx.filesListFolder({
        path: project.dropboxViralClipsFolderPath,
        recursive: false,
      });
      entries.push(...result.result.entries);
      cursor = result.result.cursor;

      // Paginate
      while (result.result.has_more) {
        const cont = await dbx.filesListFolderContinue({ cursor });
        entries.push(...cont.result.entries);
        cursor = cont.result.cursor;
        result = cont as any;
      }
    } else {
      // Incremental sync: use filesListFolderContinue with stored cursor
      console.log(
        `[Dropbox] Starting incremental sync for project ${projectId}`
      );
      const result = await dbx.filesListFolderContinue({ cursor });
      entries = result.result.entries;
      cursor = result.result.cursor;
    }

    console.log(`[Dropbox] Processing ${entries.length} entries`);

    // Process each entry
    for (const entry of entries) {
      if (entry[".tag"] === "file") {
        const fileEntry = entry as files.FileMetadataReference;

        if (!isVideoFile(fileEntry.name)) continue;

        await upsertClipFromDropbox({
          projectId,
          titleId: project.titleId,
          filename: fileEntry.name,
          dropboxPath: fileEntry.path_lower ?? fileEntry.path_display ?? "",
          dropboxFileId: fileEntry.id,
          fileSizeBytes: fileEntry.size,
          mimeType: inferMimeType(fileEntry.name),
        });
        addedCount++;
      } else if (entry[".tag"] === "deleted") {
        const deletedEntry = entry as files.DeletedMetadataReference;
        console.log(`[Dropbox] File deleted: ${deletedEntry.path_lower}`);
        // Best-effort: path-based deletion tracking for future enhancement
      }
    }

    // Update project: set cursor, last_synced_at, status=idle
    await updateProjectSyncState(projectId, {
      syncStatus: "idle",
      lastSyncedAt: new Date(),
      dropboxCursor: cursor,
      syncErrorMessage: null,
    });

    console.log(
      `[Dropbox] Sync complete for project ${projectId}: ${addedCount} clips upserted`
    );
  } catch (err: any) {
    console.error(
      `[Dropbox] Sync error for project ${projectId}:`,
      err.message
    );
    await updateProjectSyncState(projectId, {
      syncStatus: "error",
      syncErrorMessage: err.message ?? "Unknown sync error",
    });
    throw err;
  }
}

// Fetch thumbnail for a clip and return as base64 data URL
export async function fetchClipThumbnail(
  dropboxPath: string
): Promise<string | null> {
  try {
    const dbx = getDropboxClient();
    return await getFileThumbnail(dbx, dropboxPath);
  } catch (err: any) {
    console.error(
      `[Dropbox] Thumbnail fetch failed for ${dropboxPath}:`,
      err.message
    );
    return null;
  }
}

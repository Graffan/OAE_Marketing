---
phase: 05-analytics-dashboard
plan: "02"
subsystem: notifications
tags: [schema, storage, notifications, drizzle]
dependency_graph:
  requires: []
  provides: [notifications-schema, notifications-storage]
  affects: [server/storage.ts, shared/schema.ts]
tech_stack:
  added: []
  patterns: [drizzle-table-with-indexes, zod-extend-overrides, and-combinator-conditions]
key_files:
  created: []
  modified:
    - shared/schema.ts
    - server/storage.ts
decisions:
  - "NOTIFICATION_TYPES as const array (not enum) for lightweight union type"
  - "userId FK uses set null on delete — notifications persist even if user deleted"
  - "getUnreadCount and markAllNotificationsRead use conditions array + and(...conditions) pattern — matches existing storage.ts style"
  - "isRead defaults to false at insert time in createNotification — schema default is belt-and-suspenders"
metrics:
  duration: "~3 minutes"
  completed: "2026-03-09"
  tasks_completed: 2
  files_modified: 2
---

# Phase 5 Plan 02: Notifications Schema and Storage Summary

In-app notification system foundation: notifications table with 7 event types, 5 storage functions, schema pushed to DB.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | notifications table in shared/schema.ts | ef06ebe | shared/schema.ts |
| 2 | Notification storage functions in server/storage.ts | e542467 | server/storage.ts |

## What Was Built

### shared/schema.ts additions

- `NOTIFICATION_TYPES` const array — 7 types: `clip_synced`, `approval_required`, `link_expiring`, `pool_exhausted`, `strong_clip_detected`, `sync_error`, `deleted_source_file`
- `NotificationType` union type derived from the const
- `notifications` pgTable — columns: id, userId (FK to users, set null on delete), type, title, message, isRead (bool, default false), metadata (json, nullable), createdAt
- Two indexes: `notifications_user_id_idx` on userId, `notifications_is_read_idx` on isRead
- `insertNotificationSchema` — picks userId, type, title, message, isRead, metadata; extends userId and metadata to be nullable/optional
- `Notification` and `InsertNotification` types exported

### server/storage.ts additions

- `createNotification(data)` — inserts with isRead=false, returns Notification
- `getNotifications(userId?, limit?)` — ordered desc by createdAt, filtered by userId if provided, default limit 50
- `getUnreadCount(userId?)` — count where isRead=false, filtered by userId if provided; uses `and(...conditions)` combinator pattern
- `markNotificationRead(id)` — sets isRead=true for single row by id
- `markAllNotificationsRead(userId?)` — sets isRead=true for all unread rows (filtered by userId if provided)

### DB

- `npm run db:push` completed — notifications table created in `oae_marketing` database

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- shared/schema.ts exports NOTIFICATION_TYPES (7 values), notifications table, insertNotificationSchema, Notification type, InsertNotification type
- server/storage.ts exports createNotification, getNotifications, getUnreadCount, markNotificationRead, markAllNotificationsRead
- Commits ef06ebe and e542467 exist
- TypeScript compiles clean (npx tsc --noEmit passes)
- DB schema pushed successfully

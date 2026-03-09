# Phase 3 Research: Clip Rotation Engine

## Schema Analysis (from shared/schema.ts)

### `clips` table — relevant columns already present
- `status`: text, default "new" — values: new, awaiting_review, approved, scheduled, posted, archived
- `postedCount`: integer, default 0 — incremented on each post
- `engagementScore`: decimal(10,4) — used to re-rank on new cycle
- `lastPostedAt`: timestamp — for reuse cooldown enforcement
- `approvedById`, `approvedAt`: set when approved
- `isAvailable`: boolean — can block clips from rotation

### `clip_posts` table — post history record
- `clipId` (FK→clips), `campaignId` (FK→campaigns, nullable)
- `platform`, `region` — where posted
- `postedAt`, `postedById` — when/who
- `captionUsed`, `ctaUsed`, `smartLinkId` — what was posted
- `impressions`, `plays`, `completionRate`, `likes`, `comments`, `shares`, `saves`, `clickThroughs`
- `engagementScoreAtPost` — snapshot at time of post
- **No rotationCycle field exists** — cycle tracking done via postedCount + pool exhaustion check

### No `rotationCycle` column in clips — rotation state derived from:
- `postedCount` > 0 → has been posted
- Pool exhaustion: ALL approved clips for a project have postedCount > 0 → new cycle starts
- New cycle: reset postedCount to 0 for all approved clips in project, re-rank by engagementScore DESC

## Rotation Algorithm Design

```
pickNextClip(projectId, filters?) → Clip | null

1. Fetch all approved, available clips for projectId (optionally filtered by region/platform)
2. Separate into: unposted (postedCount=0) and posted (postedCount>0)
3. If unposted pool is empty:
   a. POOL EXHAUSTED → start new cycle
   b. Reset postedCount=0 for all approved clips in project
   c. Re-rank by engagementScore DESC (top performers get priority)
   d. Re-fetch unposted pool (now all clips)
4. From unposted pool: sort by (engagementScore DESC, createdAt ASC)
5. Return first clip
```

**Engagement score computation** (for re-ranking):
```
score = (likes * 3 + comments * 4 + shares * 5 + saves * 4 + plays * 1 + clickThroughs * 6) / max(impressions, 1)
```
Stored as `engagementScore` on clips table after each post history is recorded.

**Reuse cooldown** (operator control):
- `lastPostedAt + cooldownDays <= today` → eligible for reuse
- Cooldown is a project-level setting (or global setting in appSettings)
- For MVP: simple 7-day default cooldown on top performers in new cycle

## Key Storage Functions Needed

### clip_posts CRUD
- `createClipPost(data)` → insert post history record, update clip (postedCount++, lastPostedAt, status="posted"), recompute engagementScore
- `getClipPosts(clipId)` → all post history for a clip
- `getClipPostsByProject(projectId, filters?)` → recent posts across project
- `getLastPostForClip(clipId)` → most recent clip_post record (for duplicate warning)

### Rotation engine
- `pickNextClip(projectId, { region?, platform?, excludeIds? })` → next clip to post
- `getRotationStats(projectId)` → `{ totalApproved, postedCount, remainingInCycle, cycleNumber }`
- `checkPoolExhaustion(projectId)` → boolean, triggers cycle reset
- `resetRotationCycle(projectId)` → sets postedCount=0 for all approved clips, logs cycle reset
- `computeEngagementScore(clipPost)` → pure function returning decimal

### Duplicate warning
- `getDuplicateWarning(clipId)` → `{ lastPostedAt, platforms, regions, daysSince, alternatives[] }`

## API Routes Needed

- `GET /api/clips/:id/post-history` — requireAuth
- `POST /api/clips/:id/mark-posted` — requireOperator — body: { platform, region, campaignId, captionUsed, ctaUsed, smartLinkId } — records clip_post, updates clip
- `GET /api/projects/:id/rotation` — requireAuth — returns rotation stats + next suggested clip
- `POST /api/projects/:id/rotation/reset` — requireAdmin — force cycle reset
- `GET /api/clips/:id/duplicate-warning` — requireAuth

## UI Components Needed

### RotationIndicator (widget, used in ClipDetailPanel + ProjectDetailPage)
- "X of Y clips used · Z remaining in cycle"
- Progress bar (posted / total approved)
- "Pool exhausted — new cycle starting" banner when all posted

### DuplicateWarningBanner (in ClipDetailPanel when clip already posted)
- Shows: "Last posted X days ago on [platform] in [region]"
- Suggested alternatives (top 3 unposted approved clips)
- "Post anyway (override)" button for operators

### MarkPostedDialog (operator action from ClipDetailPanel or ClipLibraryPage)
- Fields: platform (Select: instagram/tiktok/youtube/x/facebook/other), region (text, ISO-2), campaignId (optional Select), captionUsed (textarea), ctaUsed (text), smartLinkId (optional Select from useSmartLinks)
- On submit: POST /api/clips/:id/mark-posted → updates clip status to "posted", increments postedCount
- Shows duplicate warning inline if clip already has posts

### ClipPostHistoryPanel (in ClipDetailPage tabs or ClipDetailPanel)
- Table of past posts: date, platform, region, campaign, engagement snapshot
- "No posts yet" empty state

### RotationControlsPanel (operator panel, in ProjectDetailPage or new RotationPage)
- Shows rotation stats
- "Reset Cycle" button (admin only)
- Cooldown setting (days, stored in project or app settings)
- "Pick Next Clip" action → shows suggested clip + opens MarkPostedDialog

## Wave Plan

**Wave 1:** Plan 01 — Rotation engine backend
- clip_posts storage functions + createClipPost (with clip update + score computation)
- pickNextClip algorithm + getRotationStats + checkPoolExhaustion + resetRotationCycle
- getDuplicateWarning
- API routes: mark-posted, post-history, rotation stats, rotation reset, duplicate-warning

**Wave 2:** Plan 02 — Mark Posted UI + History
- useClipPosts hook (getPostHistory, markPosted, duplicateWarning)
- MarkPostedDialog component
- ClipPostHistoryPanel component
- DuplicateWarningBanner component
- Wire into ClipDetailPanel (show history tab, duplicate banner, Mark Posted button)

**Wave 3:** Plan 03 — Rotation indicator + controls
- RotationIndicator widget (update existing ClipDetailPanel + add to ProjectDetailPage)
- RotationControlsPanel in ProjectDetailPage (stats, next clip suggestion, reset cycle)
- Update ClipLibraryPage rotation stats display to use new API
- Pool exhaustion handling (banner + auto-cycle-reset notification)

## Validation Architecture

### Automated checks
- POST /api/clips/:id/mark-posted → clip.postedCount increments from 0 to 1
- POST again → postedCount becomes 2, lastPostedAt updates
- GET /api/projects/:id/rotation → remainingInCycle decrements after posting
- POST /api/projects/:id/rotation/reset → postedCount resets to 0 for all project clips
- GET /api/clips/:id/duplicate-warning → returns last post info after posting

### Manual browser checks
- Mark a clip as posted → it disappears from "unposted" filter in ClipLibrary
- Rotation indicator in ClipDetailPanel shows "1 of N clips used"
- Post all approved clips → pool exhaustion banner appears
- Admin resets cycle → all clips eligible again, indicator resets

## RESEARCH COMPLETE

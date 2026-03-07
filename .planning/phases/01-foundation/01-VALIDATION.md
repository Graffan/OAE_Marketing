---
phase: 1
slug: foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-07
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Manual HTTP + browser (no test framework in v1) |
| **Config file** | none — Wave 0 sets up dev server |
| **Quick run command** | `npm run check` (TypeScript) |
| **Full suite command** | `npm run check && npm run dev` (verify server starts) |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run check`
- **After every plan wave:** Run `npm run dev`, verify endpoints manually
- **Before `/gsd:verify-work`:** Full suite must be green + manual UAT checklist
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 1-01-01 | 01 | 1 | Scaffold | manual | `npm run check` | ⬜ pending |
| 1-01-02 | 01 | 1 | DB Schema | manual | `npm run db:push` | ⬜ pending |
| 1-02-01 | 02 | 1 | Auth | manual | POST /api/auth/login | ⬜ pending |
| 1-03-01 | 03 | 2 | Titles+OMDb | manual | GET /api/titles | ⬜ pending |
| 1-04-01 | 04 | 2 | Dropbox | manual | POST /api/projects/:id/sync | ⬜ pending |
| 1-05-01 | 05 | 3 | Clip Library | manual | GET /api/clips | ⬜ pending |
| 1-06-01 | 06 | 3 | Admin Panel | manual | GET /api/admin/users | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `npm run dev` starts on port 5003 without errors
- [ ] `npm run db:push` applies schema without errors
- [ ] `npm run db:seed` creates admin user with role `admin`
- [ ] `npm run check` passes TypeScript compilation

*These must pass before any feature work begins.*

---

## Manual Verification Checklist

### Deliverable 1: Project Scaffold
- [ ] `npm run dev` starts without errors on port 5003
- [ ] `GET /` returns 200 (serves React app)
- [ ] `GET /api/auth/me` returns 401 (unauthenticated)
- [ ] `npm run check` passes

### Deliverable 2: Session Auth + 5 Roles
- [ ] `POST /api/auth/login` with `admin/oaeadmin2024` returns user + sets session cookie
- [ ] `GET /api/auth/me` after login returns user (session persists)
- [ ] `POST /api/auth/logout` clears session; subsequent `/api/auth/me` returns 401
- [ ] Wrong password returns 401
- [ ] Deactivated user returns 401
- [ ] `requireAdmin` blocks non-admin roles (403)
- [ ] `requireOperator` allows admin + marketing_operator, blocks others

### Deliverable 3: Admin Panel
- [ ] Admin can create user → appears in `GET /api/admin/users`
- [ ] Admin can edit role → new role on next login
- [ ] Admin can deactivate user → login blocked
- [ ] Admin can reset password
- [ ] App settings save/retrieve (company name, accent color, OMDb key)
- [ ] AI provider keys saveable (not returned in API response)
- [ ] Non-admin accessing `/admin` gets redirected

### Deliverable 4: Titles CRUD + OMDb
- [ ] `POST /api/titles/omdb-search?q=PoorAgnes` returns OMDb data with poster URL
- [ ] OMDb "N/A" fields normalized to null
- [ ] `POST /api/titles` creates title with omdb_imdb_id, poster, release_year, runtime populated
- [ ] `GET /api/titles` returns all titles
- [ ] `PUT /api/titles/:id` updates without overwriting OMDb fields
- [ ] `DELETE /api/titles/:id` cascades to projects/clips

### Deliverable 5: Projects + Dropbox Connection
- [ ] `POST /api/projects` creates project linked to title
- [ ] Can set `dropbox_root_folder_path` and `dropbox_viral_clips_folder_path`
- [ ] `GET /api/projects/:id` returns sync_status, last_synced_at, dropbox_cursor
- [ ] Invalid Dropbox path stores sync_error_message

### Deliverable 6: Dropbox Sync
- [ ] `POST /api/projects/:id/sync` triggers sync, returns `{ status: "started" }`
- [ ] After sync, `GET /api/clips` returns clips indexed from Dropbox
- [ ] Clip records have filename, duration, orientation, hook_type (empty), approval_status: "new"
- [ ] Thumbnails generated and accessible via URL
- [ ] Re-sync with cursor only fetches new/changed files

### Deliverable 7: Clip Library UI
- [ ] Filter by title works
- [ ] Filter by posted/unposted works
- [ ] Filter by approval status works
- [ ] Approve/reject clip updates status
- [ ] Bulk approve works
- [ ] Clip detail panel shows metadata + posting history (empty initially)
- [ ] Clip rotation indicator shows correct counts

### Deliverable 8: All 5 roles see correct UI
- [ ] Admin: sees /admin nav link, all edit controls
- [ ] marketing_operator: no /admin, can create campaigns/clips
- [ ] reviewer: approve/reject only, no create
- [ ] executive: read-only dashboards
- [ ] freelancer: only assigned projects visible

---

## Validation Sign-Off

- [ ] All deliverables manually tested
- [ ] TypeScript check passes clean
- [ ] DB migration applies cleanly from scratch
- [ ] Seed creates correct admin user
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

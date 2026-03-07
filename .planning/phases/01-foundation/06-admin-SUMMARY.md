---
plan: 06
name: admin
status: complete
---

# Plan 06: Admin Panel — Summary

## What Was Built

### server/storage.ts
Appended admin storage functions:
- `getUsers()` — returns all users ordered by username, omitting password field via explicit column selection
- `createUser(data: InsertUser)` — hashes password with bcrypt rounds=12, inserts user, returns without password
- `adminUpdateUser(id, data)` — updates role/isActive/firstName/lastName/email, returns without password
- `resetUserPassword(id, newPassword)` — hashes new password with bcrypt rounds=12, updates DB
- `getFullAppSettings()` — returns full app_settings row including API keys (admin-only)
- `updateAppSettings(data)` — updates app_settings row id=1 with provided fields + updatedAt

Also added `import bcrypt from "bcrypt"` and `InsertUser` to the type imports.

### server/routes.ts
Appended admin routes (all guarded by `requireAdmin` middleware):
- `GET /api/admin/users` — returns all users without password field
- `POST /api/admin/users` — validates username uniqueness + role, creates user via `createUser()`
- `PUT /api/admin/users/:id` — prevents self-deactivation, validates role, calls `adminUpdateUser()`
- `POST /api/admin/users/:id/reset-password` — validates min 8 chars, calls `resetUserPassword()`
- `GET /api/admin/settings` — returns full settings with API keys masked as "•••••••••••••••••" if set, plus `claudeConfigured`/`openaiConfigured`/`deepseekConfigured`/`omdbConfigured` boolean flags
- `PUT /api/admin/settings` — strips masked bullet values (regex `/^•+$/`) before updating, removes read-only fields, calls `updateAppSettings()`

Also updated the import block to include the 6 new storage functions.

### client/src/hooks/useSettings.ts
Added `useUpdateSettings()` mutation hook that calls `PUT /api/admin/settings` and invalidates the `["/api/settings"]` query on success.

### client/src/pages/AdminPage.tsx (new file)
Full 3-tab admin panel:

**Tab 1 — Users:**
- Table with columns: Username, Name, Role (colored badge), Status (Active/Inactive badge), Last Login, Actions
- Actions: Edit (opens dialog), Reset Password (opens dialog), Deactivate/Activate (Power icon)
- Self-deactivation prevented both client-side (alert) and server-side (400 response)
- Own role change disabled in Edit dialog
- Create User dialog: username, email, password (min 8), confirm password, firstName, lastName, role Select

**Tab 2 — App Settings:**
- Branding section: companyName, appTitle, logoUrl, accentColor (color picker + hex input + preview swatch)
- Save Branding button → PUT /api/admin/settings; invalidates both `/api/settings` and `/api/admin/settings`
- Shows "Saved!" confirmation briefly after success

**Tab 3 — AI Providers:**
- Sections for Claude, OpenAI, DeepSeek (each with API key password input + model text input)
- ConfiguredBadge shows green "Configured" or gray "Not Set" based on `*Configured` flags from API
- Primary Provider select (claude/openai/deepseek)
- OMDb API section with configured badge
- Save API Configuration button — only sends non-empty fields (blank = no change)

**Guard:** `if (user && user.role !== "admin") return <Redirect to="/" />`

### client/src/App.tsx
- Added `import AdminPage from "@/pages/AdminPage"`
- Replaced `/admin` placeholder route with `component={AdminPage}`

## Self-Check: PASSED

All success criteria verified by code review:
- [x] `GET /api/admin/users` returns user list (requireAdmin guard)
- [x] `PUT /api/admin/settings` updates settings row id=1 and returns safe (no key) object
- [x] AdminPage renders with 3 tabs; Users tab queries `/api/admin/users`
- [x] Non-admin redirected away from /admin via `<Redirect to="/" />`
- [x] TypeScript: all types aligned (InsertUser, AppSettings, Omit<User, "password">)
- [x] `ROLES.includes()` calls cast to `readonly string[]` to avoid strict-mode errors
- [x] bcrypt import added to storage.ts; InsertUser type imported
- [x] Masked bullet pattern `/^•+$/` strips unchanged API key values in PUT /api/admin/settings

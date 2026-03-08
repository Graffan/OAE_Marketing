---
status: testing
phase: 01-foundation
source: 01-scaffold-SUMMARY.md, 02-auth-SUMMARY.md, 03-titles-SUMMARY.md, 04-projects-dropbox-SUMMARY.md, 05-clip-library-SUMMARY.md, 06-admin-SUMMARY.md
started: 2026-03-07T20:45:00Z
updated: 2026-03-07T20:45:00Z
---

## Current Test

number: 1
name: Cold Start Smoke Test
expected: |
  Kill any running server. Start fresh with `npm run dev`. Server boots on port 5003 without errors, GET /api/health returns {"status":"ok"}, and GET / serves the React app.
awaiting: user response

## Tests

### 1. Cold Start Smoke Test
expected: Kill any running server. Start fresh with `npm run dev`. Server boots on port 5003 without errors, GET /api/health returns {"status":"ok"}, and GET / serves the React app.
result: [pending]

### 2. Login Page Renders
expected: Navigating to http://localhost:5003 (unauthenticated) shows the split-panel login page — left panel has "Film Marketing Command Center" headline with rose glow effects, right panel has username/password fields and a rose "Sign in" button.
result: [pending]

### 3. Login with admin credentials
expected: Enter username "admin" and password "oaeadmin2024", click Sign in. You're redirected to the dashboard. Sidebar shows: Dashboard, Titles, Clip Library, Campaigns, Destinations, AI Studio, Analytics, Admin — all visible for admin role.
result: [pending]

### 4. Wrong password returns error
expected: Enter username "admin" and an incorrect password. The login form shows a red error message "Invalid credentials" inline — no page reload.
result: [pending]

### 5. Session persistence
expected: After logging in, refresh the page. You remain logged in (not redirected to login). The sidebar and dashboard are still visible.
result: [pending]

### 6. Logout
expected: Click "Sign out" at the bottom of the sidebar. You're returned to the login page. Refreshing confirms you're logged out (stays on login page).
result: [pending]

### 7. Titles Page — Empty State
expected: Navigate to /titles. The page loads with a search input, "Add Title" button (visible for admin), and an empty state message/illustration since no titles have been created.
result: [pending]

### 8. Create Title with OMDb
expected: Click "Add Title". A dialog opens with an OMDb search step. Type "Poor Agnes" in the search field and click Search. OMDb results appear (poster, year, director, plot). Click "Use This Data". The form pre-fills with OMDb data. Set status to "active" and save. The new title appears as a card on the Titles page with poster, name, and year.
result: [pending]

### 9. Title Detail Page
expected: Click on the newly created title. The detail page shows a hero section with the OMDb poster, title name, year, runtime, and genre. Tabs for Overview, Clips, and Campaigns are visible. Overview tab shows OMDb metadata fields.
result: [pending]

### 10. Projects Page — Empty State
expected: Navigate to /projects (or via sidebar if present). The page shows a project grid with an empty state since no projects exist yet.
result: [pending]

### 11. Create Project linked to Title
expected: Click "New Project" (or equivalent). A dialog opens with fields for project name, title (select dropdown showing "Poor Agnes"), status, and Dropbox folder paths. Fill in a project name and select the title. Save. The project card appears on the Projects page with the title name and a sync status indicator.
result: [pending]

### 12. Clip Library — Empty State
expected: Navigate to /clips. The 3-panel clip library loads: left filter panel (Title, Project, Status dropdowns), center grid area (empty state message since no clips synced yet), right detail panel (empty state "select a clip").
result: [pending]

### 13. Admin Panel — Users Tab
expected: Navigate to /admin. The admin panel loads with tabs: Users, App Settings, AI Providers. The Users tab shows a table with the admin user (username "admin", role "admin", status "active"). A "New User" button is visible.
result: [pending]

### 14. Admin Panel — Create User
expected: Click "New User". A dialog opens with fields for username, password, role (select: admin/marketing_operator/reviewer/executive/freelancer), and active toggle. Fill in a test username/password, select role "reviewer", save. The new user appears in the users table.
result: [pending]

### 15. Admin Panel — App Settings
expected: Click the "App Settings" tab. Fields for Company Name, App Title, Logo URL, Accent Color (with color picker), OMDb API Key, Dropbox Token are visible. Change the company name and save. The sidebar footer should reflect the new company name after refresh.
result: [pending]

### 16. Role-gated UI — Reviewer cannot see Admin nav
expected: Log out, then log in as the reviewer user you just created. The sidebar should NOT show the "Admin" nav item. Navigating to /admin directly should redirect to the dashboard.
result: [pending]

### 17. Theme Toggle
expected: While logged in, click the theme toggle icon (sun/moon/monitor) at the bottom of the sidebar. Clicking it cycles through light → dark → system themes. The UI background and text colors update accordingly.
result: [pending]

## Summary

total: 17
passed: 0
issues: 0
pending: 17
skipped: 0

## Gaps

[none yet]

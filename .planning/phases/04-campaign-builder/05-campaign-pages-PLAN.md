---
plan: 5
wave: 2
name: campaign-pages
goal: Build CampaignsPage, CampaignDetailPage with full approval workflow and active/completed state transitions, wire all routes in App.tsx
estimated_tasks: 6
depends_on: [4]
files_modified:
  - client/src/pages/CampaignsPage.tsx
  - client/src/pages/CampaignDetailPage.tsx
  - client/src/App.tsx
autonomous: true
must_haves:
  - CampaignsPage shows all campaigns with status badges and "New Campaign" button
  - CampaignDetailPage shows contents, version history, and approval action for reviewers
  - Approval transitions: awaiting_approval → approved, approved → active, active → completed
  - "Request Edits" reverts status from awaiting_approval back to ai_generated
  - All campaign routes (list, new, detail, edit) resolve correctly in wouter
---

<task id="4-5-01">
  <title>Create CampaignsPage</title>
  <description>
    Create client/src/pages/CampaignsPage.tsx.
    Uses useCampaigns(). Displays:
    - Page header: "Campaigns" title + "New Campaign" button (navigates to /campaigns/new).
    - Filters: optional title filter dropdown (useTitles).
    - Table columns: Campaign Name, Title, Template, Goal, Status (badge), Created, Actions.
    - Status badge colors: draft=gray, ai_generated=blue, awaiting_approval=amber,
      approved=green, active=emerald, completed=muted.
    - Actions: View (link to /campaigns/:id), Delete (admin only, with confirm dialog).
    - Empty state: "No campaigns yet. Create your first campaign."
    - Loading skeleton: 5 row placeholders while query is loading.
    Use shadcn/ui Table, Badge, Button, Skeleton components.
    Role gating: "New Campaign" button hidden for reviewer/executive/freelancer roles.
  </description>
  <files>client/src/pages/CampaignsPage.tsx</files>
  <action>create</action>
  <verify>npx tsc --noEmit 2>&1 | head -5</verify>
</task>

<task id="4-5-02">
  <title>Create CampaignDetailPage — header and content sections</title>
  <description>
    Create client/src/pages/CampaignDetailPage.tsx (first half).
    Route param: id (number from URL).
    Uses useCampaign(id) and useCampaignContents(id).

    Sections:
    1. Header: campaign name, status badge, title name, template type, goal, created date.
       Edit button (operator+) navigates to /campaigns/:id/edit/step/1.
    2. AI Provider info: provider used, model, total tokens (from campaign.aiProviderUsed etc).
    3. Generated Contents: grouped by contentType. For each group, show active version body
       in a Card with "Edit" (inline textarea toggle) and "Version History" (collapsible list
       of all versions with activate button using useActivateCampaignContent).
    4. Clip list: show selected clip filenames.
    5. Smart Link: show linked smart link slug if set.
    Loading state: skeleton layout.
  </description>
  <files>client/src/pages/CampaignDetailPage.tsx</files>
  <action>create</action>
  <verify>npx tsc --noEmit 2>&1 | head -5</verify>
</task>

<task id="4-5-03">
  <title>Add approval workflow and state transitions to CampaignDetailPage</title>
  <description>
    Add to client/src/pages/CampaignDetailPage.tsx:

    Approval section — visible to reviewer/admin roles only. Shows current status and action buttons:
    - When status is "awaiting_approval": show "Approve" button (sets status to "approved") and
      "Request Edits" button (sets status back to "ai_generated").
    - When status is "approved": show "Mark as Active" button (sets status to "active"). This
      indicates the campaign has been launched and is now running.
    - When status is "active": show "Mark as Completed" button (sets status to "completed"). This
      closes out the campaign.
    - When status is "completed": show read-only "Completed" badge, no action buttons.

    All status transitions call usePatchCampaignStatus({ id, status }).
    Each button must show a loading spinner while the mutation is in flight.
    After status change: invalidate campaign query to refresh header badge.

    Export button (operator+): "Download Export" button calls GET /api/campaigns/:id/export
    and triggers browser download of the JSON response as campaign-{id}.json.
  </description>
  <files>client/src/pages/CampaignDetailPage.tsx</files>
  <action>modify</action>
  <verify>npx tsc --noEmit 2>&1 | head -5</verify>
</task>

<task id="4-5-04">
  <title>Wire campaign routes in App.tsx</title>
  <description>
    Modify client/src/App.tsx:
    - Import CampaignsPage from @/pages/CampaignsPage.
    - Import CampaignDetailPage from @/pages/CampaignDetailPage.
    - Import CampaignWizard from @/components/campaigns/CampaignWizard.
    - Replace the placeholder route for /campaigns with CampaignsPage component.
    - Add route /campaigns/new → renders CampaignWizard with no campaignId prop.
    - Add route /campaigns/:id → renders CampaignDetailPage.
    - Add route /campaigns/:id/edit/step/:step → renders CampaignWizard with campaignId from params.
    Place the more specific routes (/campaigns/new, /campaigns/:id/edit) BEFORE /campaigns/:id
    in the Switch to avoid wouter matching :id for "new".
    The sidebar nav entry for /campaigns already exists — no sidebar change needed.
  </description>
  <files>client/src/App.tsx</files>
  <action>modify</action>
  <verify>npx tsc --noEmit 2>&1 | head -5</verify>
</task>

<task id="4-5-05">
  <title>Update patchCampaignStatus storage function to handle all state transitions</title>
  <description>
    Modify server/storage.ts patchCampaignStatus function to handle the full campaign lifecycle:
    - "approved": set approvedById = userId, approvedAt = new Date().
    - "active": set activatedAt = new Date() (add activatedAt column to campaigns schema if not present).
    - "completed": set completedAt = new Date() (add completedAt column to campaigns schema if not present).
    - "ai_generated": clear approvedById and approvedAt (revert from awaiting_approval).
    Validate that the requested transition is valid given current status to prevent invalid state
    changes (e.g., cannot go from draft to completed). Throw Error("Invalid status transition")
    for disallowed moves.
    If activatedAt / completedAt columns need to be added to shared/schema.ts campaigns table,
    add them as nullable timestamps before updating this function. Run db:push if schema changed.
  </description>
  <files>server/storage.ts, shared/schema.ts</files>
  <action>modify</action>
  <verify>npx tsc --noEmit 2>&1 | head -5</verify>
</task>

<task id="4-5-06">
  <title>End-to-end browser verification of campaign wizard and detail page</title>
  <description>
    Manual verification checklist (not automated — reviewer confirms in browser):
    1. Click "New Campaign" on /campaigns page — wizard opens at step 1.
    2. Select a title, enter campaign name, pick template — click Next.
    3. Confirm new campaign appears in /campaigns table with status "draft".
    4. Complete steps 2-4 — confirm campaign record is updated at each step (check /api/campaigns/:id).
    5. At step 5, click Generate Brief — confirm AI response appears (or manual paste modal appears
       if no API key).
    6. Complete step 6, submit for review — confirm status changes to "awaiting_approval".
    7. As reviewer, open /campaigns/:id — confirm Approve button is visible and works.
       Confirm status changes to "approved".
    8. Confirm "Mark as Active" button appears on approved campaign — click it — status becomes "active".
    9. Confirm "Mark as Completed" button appears on active campaign — click it — status becomes "completed".
    10. Confirm all content appears in CampaignDetailPage under generated contents section.
  </description>
  <files>client/src/pages/CampaignDetailPage.tsx</files>
  <action>modify</action>
  <verify>echo "Manual verification required in browser"</verify>
</task>

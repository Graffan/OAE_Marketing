---
plan: 4
wave: 2
name: campaign-wizard
goal: Build useCampaigns hooks, ManualPasteModal, AiOutputCard, and all 6 WizardStep components for the campaign creation flow
estimated_tasks: 6
depends_on: [1, 2, 3]
files_modified:
  - client/src/hooks/useCampaigns.ts
  - client/src/components/ai/ManualPasteModal.tsx
  - client/src/components/ai/AiOutputCard.tsx
  - client/src/components/campaigns/WizardStepTitle.tsx
  - client/src/components/campaigns/WizardStepGoal.tsx
  - client/src/components/campaigns/WizardStepRegions.tsx
  - client/src/components/campaigns/WizardStepClips.tsx
  - client/src/components/campaigns/WizardStepAI.tsx
  - client/src/components/campaigns/WizardStepExport.tsx
  - client/src/components/campaigns/CampaignWizard.tsx
autonomous: true
must_haves:
  - Full wizard creates a draft campaign on step 1 and patches it at each subsequent step
  - Draft campaign ID is URL-persisted so browser back button preserves state
  - Step 5 calls POST /api/ai/generate and displays generated content
  - Manual paste mode (no API key) shows prompt text and accepts pasted result
  - Step 6 sets campaign status to awaiting_approval or approved based on role
---

<task id="4-4-01">
  <title>Create useCampaigns hooks</title>
  <description>
    Create client/src/hooks/useCampaigns.ts following the exact pattern of useDestinations.ts.
    Import fetchJSON, apiRequest from @/lib/queryClient. Import Campaign, CampaignContent from
    @shared/schema.

    Export:
    - useCampaigns(titleId?: number): useQuery to GET /api/campaigns?titleId=N or /api/campaigns.
      QueryKey: ["/api/campaigns", titleId ?? null].
    - useCampaign(id: number | null): useQuery to GET /api/campaigns/:id. Enabled when id !== null.
    - useCreateCampaign(): useMutation POST /api/campaigns. OnSuccess invalidates ["/api/campaigns"].
    - useUpdateCampaign(): useMutation PATCH /api/campaigns/:id. Accepts { id, data }.
      OnSuccess invalidates ["/api/campaigns"] and ["/api/campaigns", id].
    - useDeleteCampaign(): useMutation DELETE /api/campaigns/:id.
      OnSuccess invalidates ["/api/campaigns"].
    - usePatchCampaignStatus(): useMutation PATCH /api/campaigns/:id/status. Accepts { id, status }.
      OnSuccess invalidates both keys.
    - useCampaignContents(campaignId: number | null): useQuery GET /api/campaigns/:id/contents.
      Returns CampaignContent[]. Enabled when campaignId !== null.
    - useGenerateCampaignContent(): useMutation POST /api/ai/generate. Returns generate result.
    - useActivateCampaignContent(): useMutation PATCH /api/campaigns/:id/contents/:cid/activate.
  </description>
  <files>client/src/hooks/useCampaigns.ts</files>
  <action>create</action>
  <verify>npx tsc --noEmit 2>&1 | head -5</verify>
</task>

<task id="4-4-02">
  <title>Create ManualPasteModal component</title>
  <description>
    Create client/src/components/ai/ManualPasteModal.tsx.
    Props: { open: boolean; promptText: string; systemPrompt: string; task: string;
             campaignId?: number; clipId?: number; onSave: (text: string) => void; onClose: () => void }.
    UI (shadcn Dialog):
    - Header: "Manual AI Generation".
    - Tab 1 "Prompt": system prompt (read-only textarea, smaller), user prompt (read-only textarea
      with Copy button that calls navigator.clipboard.writeText).
    - Tab 2 "Paste Result": textarea with placeholder "Paste AI response here..."
      and a "Save Result" button. On save: calls onSave(text) and closes modal.
    - Footer note: "No API key configured. Copy the prompt above, paste into Claude.ai or
      ChatGPT, then paste the result here."
    Immutable: does not modify any external state directly — delegates to onSave callback.
  </description>
  <files>client/src/components/ai/ManualPasteModal.tsx</files>
  <action>create</action>
  <verify>npx tsc --noEmit 2>&1 | head -5</verify>
</task>

<task id="4-4-03">
  <title>Create AiOutputCard component</title>
  <description>
    Create client/src/components/ai/AiOutputCard.tsx.
    Props: { contentType: string; contents: CampaignContent[]; onActivate: (id: number) => void;
             onEdit: (id: number, body: string) => void }.
    Displays the active version body in a Card. Shows contentType as the card title.
    "Edit" button toggles to inline textarea edit mode — on save calls onEdit with id and new body.
    "History" toggle shows a collapsible list of all versions (sorted by version desc) with
    "Activate" button on each non-active row. Provider badge (source field) shown per version.
    Immutable: all mutations delegated to callbacks.
  </description>
  <files>client/src/components/ai/AiOutputCard.tsx</files>
  <action>create</action>
  <verify>npx tsc --noEmit 2>&1 | head -5</verify>
</task>

<task id="4-4-04">
  <title>Create WizardStep components — Title, Goal, Regions, Clips</title>
  <description>
    Create four step components following the same prop/callback pattern:

    WizardStepTitle.tsx (client/src/components/campaigns/WizardStepTitle.tsx):
    Props: { onNext: (data: { titleId: number; campaignName: string; templateType: string }) => void }.
    UI: Title select (useTitles hook), campaign name input, template type select
    (new_title_launch, trailer_release, watch_now, seasonal, catalog_revival). All required.
    Next disabled until all filled. No API calls — wizard shell manages persistence.

    WizardStepGoal.tsx (client/src/components/campaigns/WizardStepGoal.tsx):
    Props: { defaultGoal?: string; onBack: () => void; onNext: (goal: string) => void }.
    UI: Four clickable goal cards — awareness, engagement, trailer, watch_now. Each shows
    title + one-line description. Selected state ring. Next disabled until selected.

    WizardStepRegions.tsx (client/src/components/campaigns/WizardStepRegions.tsx):
    Props: { titleId: number; defaultRegions?: string[]; onBack: () => void; onNext: (regions: string[]) => void }.
    UI: Multi-select checkboxes for US, CA, GB, AU, DE, FR, JP, BR, MX, ALL. Optionally fetch
    GET /api/destinations?titleId= to pre-populate available regions and show "(has watch link)"
    badge next to matched regions. At least one required.

    WizardStepClips.tsx (client/src/components/campaigns/WizardStepClips.tsx):
    Props: { titleId: number; defaultClipIds?: number[]; onBack: () => void; onNext: (clipIds: number[]) => void }.
    Fetch clips using useClips filtered to status="approved". Grid of clip cards with checkbox.
    Show selected count. At least one required.

    Use shadcn/ui Label, Input, Select, Button, Card, Checkbox components throughout.
  </description>
  <files>client/src/components/campaigns/WizardStepTitle.tsx, client/src/components/campaigns/WizardStepGoal.tsx, client/src/components/campaigns/WizardStepRegions.tsx, client/src/components/campaigns/WizardStepClips.tsx</files>
  <action>create</action>
  <verify>npx tsc --noEmit 2>&1 | head -5</verify>
</task>

<task id="4-4-05">
  <title>Create WizardStepAI component</title>
  <description>
    Create client/src/components/campaigns/WizardStepAI.tsx.
    Props: { campaignId: number; campaign: Campaign; onBack: () => void; onNext: () => void }.
    Depends on ManualPasteModal (task 4-4-02) — import from @/components/ai/ManualPasteModal.
    Sections:
    1. Provider selector row: Auto (follows settings) | Claude | OpenAI | DeepSeek | Manual.
       "Auto" is default. Fetch /api/ai/usage to show today's token count and cap.
    2. "Generate Campaign Brief" button — calls useGenerateCampaignContent with task="campaign_brief",
       campaignId, context from campaign fields, provider override if not Auto.
       On success: show generated brief text in a read-only textarea. Show provider + tokens used badge.
    3. "Generate Post Copy" button (enabled after brief is generated) — calls generate with
       task="clip_to_post" for each selected clip. Display results per clip.
    4. Manual mode: if POST /api/ai/generate returns manualMode (no API key), show ManualPasteModal.
    Loading state: disable buttons and show spinner while generating.
    Back and Next buttons. Next enabled once at least the brief is generated.
  </description>
  <files>client/src/components/campaigns/WizardStepAI.tsx</files>
  <action>create</action>
  <verify>npx tsc --noEmit 2>&1 | head -5</verify>
</task>

<task id="4-4-06">
  <title>Create WizardStepExport and CampaignWizard shell</title>
  <description>
    Create WizardStepExport.tsx (client/src/components/campaigns/WizardStepExport.tsx):
    Props: { campaignId: number; campaign: Campaign; userRole: string; onBack: () => void; onDone: () => void }.
    Sections:
    1. Smart link selector: show existing smart links for the title in a Select. Optional.
       On select: call useUpdateCampaign to PATCH smartLinkId.
    2. Summary: read-only list of selected clips with generated captions from useCampaignContents.
    3. Status action buttons (role-gated):
       - marketing_operator: "Submit for Review" → PATCH status to "awaiting_approval".
       - reviewer/admin: "Approve" → PATCH status to "approved".
    4. Export JSON: "Download Export" button → fetches GET /api/campaigns/:id/export and triggers
       browser download as campaign-{id}.json.
    Back button. After status change, call onDone() which navigates to /campaigns/:id.

    Create CampaignWizard.tsx (client/src/components/campaigns/CampaignWizard.tsx):
    Props: { campaignId?: number }.
    State: currentStep (1-6), campaignId (number | null). Load existing campaign if prop provided.
    Step navigation:
    - Step 1 onNext: call useCreateCampaign → save returned id → navigate to /campaigns/:id/edit/step/2.
    - Steps 2-4 onNext: call useUpdateCampaign → navigate to next step URL.
    - Step 5 onNext: navigate to step 6.
    - Step 6 onDone: navigate to /campaigns/:id.
    Progress bar: 6 step indicators labeled: Setup, Goal, Regions, Clips, AI Copy, Export.
    Handle loading state with centered spinner.
  </description>
  <files>client/src/components/campaigns/WizardStepExport.tsx, client/src/components/campaigns/CampaignWizard.tsx</files>
  <action>create</action>
  <verify>npx tsc --noEmit 2>&1 | head -5</verify>
</task>

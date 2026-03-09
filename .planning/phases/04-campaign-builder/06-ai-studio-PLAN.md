---
plan: 6
wave: 3
name: ai-studio
goal: Build standalone AI Studio page, provider selector, token usage bar, AI audit log admin page, and admin token stats
estimated_tasks: 10
depends_on: [1, 2, 3, 4, 5]
files_modified:
  - client/src/pages/AiStudioPage.tsx
  - client/src/pages/AdminPage.tsx
  - client/src/components/ai/ProviderSelector.tsx
  - client/src/components/ai/TokenUsageBar.tsx
  - client/src/hooks/useAiStudio.ts
  - client/src/App.tsx
autonomous: true
must_haves:
  - All four AI tasks run from /ai-studio and save output when campaignId is provided
  - Manual paste mode (no API key configured) presents prompt and accepts pasted result
  - Token usage bar shows today's used tokens vs daily cap, updates after each generation
  - /admin/ai-logs table shows all AI log rows with provider, model, task, tokens, latency, status
  - Admin can view and edit prompt templates from the admin page
  - /ai-studio route is accessible to marketing_operator and above (already gated in sidebar)
---

<task id="4-6-01">
  <title>Create useAiStudio hooks</title>
  <description>
    Create client/src/hooks/useAiStudio.ts.

    Export:
    - useAiUsage(): useQuery GET /api/ai/usage returning { dailyTotal, userTotals }.
      QueryKey: ["/api/ai/usage"]. StaleTime: 30 seconds.
    - useAiLogs(page: number): useQuery GET /api/ai/logs?page=N&limit=50.
      QueryKey: ["/api/ai/logs", page].
    - usePromptTemplates(): useQuery GET /api/ai/prompt-templates (admin only).
      QueryKey: ["/api/ai/prompt-templates"].
    - useUpdatePromptTemplate(): useMutation PATCH /api/ai/prompt-templates/:id.
      OnSuccess invalidates ["/api/ai/prompt-templates"].
    - useGenerateContent(): useMutation POST /api/ai/generate.
      OnSuccess invalidates ["/api/ai/usage"] to refresh token count.
    - useGetManualPrompt(): useMutation POST /api/ai/prompt-preview. Returns { promptForUser, systemPrompt, manualMode }.
  </description>
  <files>client/src/hooks/useAiStudio.ts</files>
  <action>create</action>
  <verify>npx tsc --noEmit 2>&1 | head -5</verify>
</task>

<task id="4-6-02">
  <title>Create ProviderSelector component</title>
  <description>
    Create client/src/components/ai/ProviderSelector.tsx.
    Props: { value: string | null; onChange: (provider: string | null) => void; settings?: AppSettings }.
    UI: Row of radio-style buttons: Auto | Claude | OpenAI | DeepSeek | Manual.
    "Auto" value = null (follows appSettings). Each provider button is disabled and shows
    a "(no key)" badge if the corresponding API key is not set in settings.
    Manual means the getManualPrompt flow. Shows current selection with active highlight.
    Use only shadcn/ui Button and Tailwind — no additional dependencies.
    Immutable: calls onChange with new value; does not manage own state.
  </description>
  <files>client/src/components/ai/ProviderSelector.tsx</files>
  <action>create</action>
  <verify>npx tsc --noEmit 2>&1 | head -5</verify>
</task>

<task id="4-6-03">
  <title>Create TokenUsageBar component</title>
  <description>
    Create client/src/components/ai/TokenUsageBar.tsx.
    Props: { dailyTotal: number; dailyCap: number; userTotal?: number; perUserCap?: number }.
    UI:
    - Label row: "Daily Usage" and count text "X / Y tokens".
    - Progress bar: filled proportion = dailyTotal / dailyCap. Color: green < 70%, amber < 90%, red >= 90%.
    - If perUserCap provided: second row "Your Usage" with same pattern.
    - No border or card wrapper — designed to embed inline.
    All values are display-only. No mutations.
    Compute cost estimate: show "(est. $X.XX)" next to token count using hardcoded per-provider
    pricing constants defined at top of file:
    PRICING = { claude: 0.000015, openai: 0.000005, deepseek: 0.0000014 } per token (output rate).
    Use total/1000 * 0.000015 as conservative estimate. Label it "est." to indicate approximation.
  </description>
  <files>client/src/components/ai/TokenUsageBar.tsx</files>
  <action>create</action>
  <verify>npx tsc --noEmit 2>&1 | head -5</verify>
</task>

<task id="4-6-04">
  <title>Create AiStudioPage</title>
  <description>
    Create client/src/pages/AiStudioPage.tsx.
    Uses useAiUsage, useGenerateContent, useGetManualPrompt, useSettings hooks.
    Also uses useTitles (for title context select) and useCampaigns (optional campaign to attach output).

    Layout (two-column on wide screens, single column on mobile):
    Left panel — Input Form:
    - Task selector: four buttons or segmented control for campaign_brief | clip_to_post |
      territory_assistant | catalog_revival. Shows brief description of each.
    - Context fields (conditional on task):
      - campaign_brief: Title select, goal input, regions multi-select.
      - clip_to_post: Title select, clip select (approved clips for title), platform select,
        region select.
      - territory_assistant: Title select, date range inputs.
      - catalog_revival: reads all titles automatically.
    - Campaign attach (optional): "Save to Campaign" select — lists draft/ai_generated campaigns.
    - ProviderSelector component.
    - TokenUsageBar component (uses useAiUsage data).
    - "Generate" button — calls useGenerateContent or useGetManualPrompt if provider="manual".
    - "Get Prompt Only" button — always calls useGetManualPrompt, shows ManualPasteModal.

    Right panel — Output:
    - Loading spinner while generating.
    - On success: AiOutputCard per content type returned. Provider badge + latency + tokens.
    - "Save as new version" per card if a campaign is attached.
    - On manualMode: show ManualPasteModal immediately.

    Error display: toast or inline error message below generate button.
  </description>
  <files>client/src/pages/AiStudioPage.tsx</files>
  <action>create</action>
  <verify>npx tsc --noEmit 2>&1 | head -5</verify>
</task>

<task id="4-6-05">
  <title>Add AI Logs admin section to AdminPage</title>
  <description>
    Modify client/src/pages/AdminPage.tsx to add two new admin sections (tabs or accordion panels):

    Section 1 — AI Usage Stats:
    - Import useAiUsage and useSettings hooks.
    - Show TokenUsageBar with dailyTotal and dailyCap from settings.
    - Table of top users by today's token usage (from userTotals in useAiUsage response).
    - Columns: Username, Today's Tokens, Cap, % Used.

    Section 2 — AI Audit Log:
    - Import useAiLogs hook.
    - Paginated table with columns: Timestamp, Provider, Model, Task, Tokens In, Tokens Out,
      Latency (ms), Status, User, Campaign ID.
    - Status badges: success=green, error=red, manual_paste=amber.
    - Pagination controls: Previous / Next buttons, page number display.
    - Click row to expand: show prompt text and response text in a collapsible detail area.

    Section 3 — Prompt Templates:
    - Import usePromptTemplates and useUpdatePromptTemplate hooks.
    - List all templates in an accordion. Each shows: task name, version number, provider, isActive.
    - Expand to edit: systemPrompt (textarea), userPromptTemplate (textarea).
    - "Save" button calls useUpdatePromptTemplate. Shows "Version X → X+1" after save.
    - Warning: "Editing templates affects all future generations. Previous outputs are logged."

    All sections admin-only gated (existing requireAdmin logic in AdminPage).
  </description>
  <files>client/src/pages/AdminPage.tsx</files>
  <action>modify</action>
  <verify>npx tsc --noEmit 2>&1 | head -5</verify>
</task>

<task id="4-6-06">
  <title>Wire AiStudioPage route in App.tsx</title>
  <description>
    Modify client/src/App.tsx:
    - Import AiStudioPage from @/pages/AiStudioPage.
    - Replace the placeholder Route for /ai-studio with: component={AiStudioPage}.
    The sidebar nav entry for /ai-studio already exists and is gated to OPERATOR_AND_ABOVE.
    No sidebar changes needed — the route replacement is all that's required.
  </description>
  <files>client/src/App.tsx</files>
  <action>modify</action>
  <verify>npx tsc --noEmit 2>&1 | head -5</verify>
</task>

<task id="4-6-07">
  <title>Final TypeScript compile check — full project</title>
  <description>
    Run npx tsc --noEmit across the full project after all Wave 3 additions.
    Fix any type errors before marking wave complete.
    Pay attention to: AiOutputCard props (CampaignContent type import), ProviderSelector
    AppSettings import path, and any implicit any warnings in AiStudioPage context building.
  </description>
  <files>client/src/pages/AiStudioPage.tsx</files>
  <action>modify</action>
  <verify>npx tsc --noEmit 2>&1</verify>
</task>

<task id="4-6-08">
  <title>Wave 3 end-to-end verification</title>
  <description>
    Manual verification checklist:
    1. Navigate to /ai-studio — page loads without errors for marketing_operator user.
    2. Select "Campaign Brief" task — fill title and goal — click Generate.
       Confirm AI output appears in right panel with provider badge and token count.
    3. Confirm TokenUsageBar updates after generation (token count increases).
    4. Select "Manual" provider — click Generate — confirm ManualPasteModal opens with prompt text.
       Paste fake text — click Save — confirm output card appears with source="manual_paste".
    5. Navigate to /admin — find AI Usage section — confirm daily token count is visible.
    6. Find AI Audit Log section — confirm the generation rows from steps 2 and 4 appear.
    7. Click a log row — confirm prompt text and response text expand correctly.
    8. Find Prompt Templates section — edit campaign_brief userPromptTemplate — save —
       confirm version number increments. Generate a new brief — confirm new template is used.
  </description>
  <files>client/src/pages/AiStudioPage.tsx</files>
  <action>modify</action>
  <verify>echo "Manual verification required in browser"</verify>
</task>

<task id="4-6-09">
  <title>Token cap enforcement integration test</title>
  <description>
    Manual verification for token cap enforcement:
    1. In AdminPage settings, set AI Daily Token Cap to 1 (one token).
    2. Navigate to /ai-studio and attempt to generate content.
    3. Confirm the UI shows an error message indicating "Daily token cap reached" or similar.
    4. Confirm the error is a 429 response from the server (check network tab).
    5. Restore the daily cap to a reasonable value (e.g., 100000).
    This test verifies Pitfall 1 from the research doc is avoided — cap checked before API call.
  </description>
  <files>server/services/ai-orchestrator.ts</files>
  <action>modify</action>
  <verify>echo "Manual cap enforcement test required"</verify>
</task>

<task id="4-6-10">
  <title>Phase 4 completion verification</title>
  <description>
    Verify all Phase 4 roadmap must-haves are met:
    [x] Full campaign builder wizard runs title → goal → regions → clips → AI copy → export.
    [x] Campaign states: draft → ai_generated → awaiting_approval → approved → active → completed visible on list page.
    [x] Campaign templates: 5 types available in step 1 dropdown.
    [x] ai_orchestrator: Claude, OpenAI, DeepSeek all work with provider selection.
    [x] AI tasks: campaign_brief and clip_to_post implemented and tested.
    [x] territory_assistant and catalog_revival available in AI Studio task selector.
    [x] Automatic provider fallback chain works when primary is misconfigured.
    [x] Manual provider selection UI works from both wizard and AI Studio.
    [x] Non-API manual paste mode saves output with source="manual_paste".
    [x] Token tracking visible in admin AI usage section.
    [x] Prompt templates stored in DB and editable from admin without deploy.
    [x] AI output audit log shows all requests with full metadata.
    [x] Content versioning: each generation creates a new version row; activate works atomically.
    [x] Export endpoint returns JSON payload for manual publishing.
    Update STATE.md: mark Phase 4 as Complete.
  </description>
  <files>/Users/geoffraffan/Projects/OAE_Marketing/.planning/STATE.md</files>
  <action>modify</action>
  <verify>echo "Phase 4 completion confirmed"</verify>
</task>

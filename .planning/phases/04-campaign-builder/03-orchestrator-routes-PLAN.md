---
plan: 3
wave: 1
name: orchestrator-routes
goal: Build ai_orchestrator service with provider adapters and fallback chain, add all campaign and AI API routes
estimated_tasks: 6
depends_on: [1, 2]
files_modified:
  - server/services/ai-orchestrator.ts
  - server/routes.ts
autonomous: true
must_haves:
  - generateText() falls back from primary to secondary provider when primary throws
  - Token cap check returns HTTP 429 before any AI API call when daily sum >= cap
  - GET /api/campaigns returns 200 with correct JSON shape
  - POST /api/ai/generate returns generated text, provider, model, tokens, logId
  - All routes return 401 for unauthenticated requests
---

<task id="4-3-01">
  <title>Create ai-orchestrator service — types and buildPrompt</title>
  <description>
    Create server/services/ai-orchestrator.ts.

    Export AiTask type: "campaign_brief" | "clip_to_post" | "territory_assistant" | "catalog_revival".
    Export GenerateOptions interface: { forceProvider?: "claude" | "openai" | "deepseek"; userId?: number; campaignId?: number; saveToContents?: boolean; }.
    Export GenerateResult interface: { content: string; provider: string; model: string; inputTokens: number; outputTokens: number; latencyMs: number; logId: number; }.
    Export ManualModeResult interface: { manualMode: true; promptForUser: string; systemPrompt: string; }.

    Export buildPrompt(taskName: AiTask, context: Record<string, unknown>): Promise<{ systemPrompt: string; userPrompt: string; templateVersion: number }>:
    - Calls getPromptTemplate(taskName). Throws if none found.
    - Replaces all {{variable}} tokens in userPromptTemplate using Object.entries(context).reduce().
    - Returns { systemPrompt, userPrompt: rendered, templateVersion: template.version }.
  </description>
  <files>server/services/ai-orchestrator.ts</files>
  <action>create</action>
  <verify>npx tsc --noEmit 2>&1 | head -5</verify>
</task>

<task id="4-3-02">
  <title>Create ai-orchestrator — provider adapters</title>
  <description>
    Add to server/services/ai-orchestrator.ts:

    Internal type ProviderResult: { content: string; model: string; inputTokens: number; outputTokens: number }.

    callClaudeProvider(settings: AppSettings, systemPrompt: string, userPrompt: string): Promise<ProviderResult>:
    - Throw Error("Claude API key not configured") if !settings.claudeApiKey.
    - Instantiate Anthropic({ apiKey: settings.claudeApiKey }).
    - Call client.messages.create({ model: settings.claudeModel ?? "claude-opus-4-5", max_tokens: 2048, system: systemPrompt, messages: [{ role: "user", content: userPrompt }] }).
    - Return { content: (response.content[0] as Anthropic.TextBlock).text, model: settings.claudeModel!, inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens }.

    callOpenAIProvider(settings: AppSettings, systemPrompt: string, userPrompt: string): Promise<ProviderResult>:
    - Throw if !settings.openaiApiKey.
    - Instantiate OpenAI({ apiKey: settings.openaiApiKey }).
    - Call client.chat.completions.create with model: settings.openaiModel ?? "gpt-4o".
    - Return { content, model, inputTokens: usage.prompt_tokens, outputTokens: usage.completion_tokens }.

    callDeepSeekProvider(settings: AppSettings, systemPrompt: string, userPrompt: string): Promise<ProviderResult>:
    - Throw if !settings.deepseekApiKey.
    - Instantiate OpenAI({ apiKey: settings.deepseekApiKey, baseURL: "https://api.deepseek.com" }).
    - Use model: settings.deepseekModel ?? "deepseek-chat". Comment: "deepseek-chat is the alias for DeepSeek-V3; do not use deepseek-v3 directly."
    - Same return shape.

    callProvider(provider: string, settings: AppSettings, systemPrompt: string, userPrompt: string): Promise<ProviderResult>:
    - Switch on provider — delegate to the three adapters. Throw Error(`Unknown provider: ${provider}`) for unknown values.
  </description>
  <files>server/services/ai-orchestrator.ts</files>
  <action>modify</action>
  <verify>npx tsc --noEmit 2>&1 | head -5</verify>
</task>

<task id="4-3-03">
  <title>Create ai-orchestrator — generateText with fallback chain and token cap</title>
  <description>
    Add to server/services/ai-orchestrator.ts:

    Export generateText(task: AiTask, systemPrompt: string, userPrompt: string, templateVersion: number, options: GenerateOptions = {}): Promise<GenerateResult>:
    1. Call getFullAppSettings(). Throw if null.
    2. Call checkTokenCaps(options.userId ?? 0, settings) — throws 429-style Error if over cap.
    3. Build provider order: options.forceProvider ? [options.forceProvider] : [settings.aiPrimaryProvider ?? "claude", ...(settings.aiFallbackOrder ?? [])]. Deduplicate.
    4. Iterate order. For each provider:
       a. Record startMs = Date.now().
       b. Try callProvider(provider, settings, systemPrompt, userPrompt).
       c. On success: call createAiLog with all fields + status "success" + promptTemplateVersion.
          Return { content, provider, model, inputTokens, outputTokens, latencyMs, logId }.
       d. On error: call createAiLog with status "error" + responseText = err.message. Continue.
    5. After loop: throw lastError ?? new Error("All AI providers failed").

    Export getManualPrompt(task: AiTask, context: Record<string, unknown>): Promise<ManualModeResult>:
    - Calls buildPrompt(task, context).
    - Returns { manualMode: true, promptForUser: userPrompt, systemPrompt }.
    - Does NOT call any AI API or write any log.
  </description>
  <files>server/services/ai-orchestrator.ts</files>
  <action>modify</action>
  <verify>npx tsc --noEmit 2>&1 | head -5</verify>
</task>

<task id="4-3-04">
  <title>Add campaign API routes — CRUD</title>
  <description>
    Add to server/routes.ts after existing smart links routes.
    Import: getCampaigns, getCampaignById, createCampaign, updateCampaign, deleteCampaign,
    patchCampaignStatus, getCampaignContents, createCampaignContent, activateCampaignContentVersion,
    getActiveCampaignContents from storage.js.
    Import insertCampaignSchema, insertCampaignContentSchema from @shared/schema.js.

    Routes (all under /api/campaigns):
    GET /api/campaigns — requireAuth — optional ?titleId= query param — return getCampaigns(titleId).
    POST /api/campaigns — requireOperator — validate body with insertCampaignSchema — set createdById
      from req.user.id — return createCampaign(data) with 201.
    GET /api/campaigns/:id — requireAuth — return getCampaignById(id) or 404.
    PATCH /api/campaigns/:id — requireOperator — partial update with updateCampaign — return updated.
    DELETE /api/campaigns/:id — requireAdmin — deleteCampaign(id) — return 204.
    PATCH /api/campaigns/:id/status — requireReviewer — body: { status } — validate status is in
      allowed set — call patchCampaignStatus(id, status, req.user.id) — return updated.
    GET /api/campaigns/:id/contents — requireAuth — return getCampaignContents(id).
    POST /api/campaigns/:id/contents — requireOperator — validate body — createCampaignContent — 201.
    PATCH /api/campaigns/:id/contents/:cid/activate — requireOperator — call
      activateCampaignContentVersion(cid, id, contentType, platform, region) — return activated row.
    GET /api/campaigns/:id/export — requireOperator — return getActiveCampaignContents(id) with
      campaign metadata as JSON payload.

    Error handling: wrap each handler in try/catch, return { error: err.message } with 500.
  </description>
  <files>server/routes.ts</files>
  <action>modify</action>
  <verify>curl -s http://localhost:5003/api/campaigns | head -20</verify>
</task>

<task id="4-3-05">
  <title>Add AI API routes — generate, prompt-preview, logs, usage, templates</title>
  <description>
    Add to server/routes.ts after campaign routes.
    Import generateText, getManualPrompt, buildPrompt from ./services/ai-orchestrator.js.
    Import getAiLogs, getAiUsageSummary, getPromptTemplates, updatePromptTemplate from storage.js.

    POST /api/ai/generate — requireOperator:
    - Parse body: { task, campaignId?, context, provider?, saveToContents? }.
    - Validate task is a known AiTask value.
    - Call buildPrompt(task, context) → { systemPrompt, userPrompt, templateVersion }.
    - Call generateText(task, systemPrompt, userPrompt, templateVersion, { forceProvider: provider,
      userId: req.user.id, campaignId }).
    - If saveToContents && campaignId: call createCampaignContent with source="ai", aiLogId=logId.
    - Return { content, provider, model, inputTokens, outputTokens, latencyMs, logId }.
    - Catch errors: if err.message includes "cap", return 429. Else 500.

    POST /api/ai/prompt-preview — requireOperator:
    - Parse body: { task, context }.
    - Call getManualPrompt(task, context).
    - Return { systemPrompt, promptForUser, manualMode: true }. No log written.

    GET /api/ai/logs — requireAdmin:
    - Query params: page (default 1), limit (default 50).
    - Return getAiLogs(page, limit).

    GET /api/ai/logs/:id — requireAdmin — return single log row or 404.

    GET /api/ai/usage — requireAuth — return getAiUsageSummary().

    GET /api/ai/prompt-templates — requireAdmin — return getPromptTemplates().

    PATCH /api/ai/prompt-templates/:id — requireAdmin:
    - Body: { systemPrompt?, userPromptTemplate? }.
    - Increment version by 1.
    - Return updatePromptTemplate(id, { ...data, version: current.version + 1, updatedAt: new Date() }).
  </description>
  <files>server/routes.ts</files>
  <action>modify</action>
  <verify>npx tsc --noEmit 2>&1 | head -5</verify>
</task>

<task id="4-3-06">
  <title>TypeScript compile check — wave 1 full project</title>
  <description>
    Run npx tsc --noEmit across the entire project to confirm zero type errors after all Wave 1
    additions. Fix any type issues found before proceeding to Wave 2.
  </description>
  <files>shared/schema.ts</files>
  <action>modify</action>
  <verify>npx tsc --noEmit 2>&1</verify>
</task>

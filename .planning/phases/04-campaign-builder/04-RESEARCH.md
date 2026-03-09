# Phase 4: Campaign Builder + AI Studio — Research

**Researched:** 2026-03-09
**Domain:** Multi-provider AI orchestration, campaign content management, multi-step wizard UI
**Confidence:** HIGH

---

## Summary

Phase 4 builds the campaign creation workflow and the AI generation layer on top of the data
model already in place. The `campaigns` table and `InsertCampaign` schema already exist in
`shared/schema.ts`, so the DB work is additive — three new tables (`ai_logs`,
`campaign_contents`, `prompt_templates`) plus Drizzle migration. The AI packages are already
installed (`@anthropic-ai/sdk ^0.78.0`, `openai ^6.27.0`) and API settings are already stored
in the `appSettings` table. Phase work is therefore almost entirely application-level: the
`ai_orchestrator` service module, new storage functions, new Express routes, and the React UI.

The primary architectural decision is how to structure the `ai_orchestrator` module. The
recommended pattern is a thin provider-adapter layer (one file per provider) behind a common
`generateText(task, payload, options?)` interface, with an automatic fallback chain driven by
the `aiFallbackOrder` array from `appSettings`. DeepSeek uses the OpenAI SDK with
`baseURL: "https://api.deepseek.com"` — no additional package needed.

The campaign builder UI is a multi-step wizard with six steps, persisted in a single `draft`
campaign record updated at each step. The AI Studio panel is a separate page/tab that acts as
a prompt runner against the same `ai_orchestrator` service.

**Primary recommendation:** Build the orchestrator as a standalone service module at
`server/services/ai-orchestrator.ts` with a single exported `generateText` function, then add
campaign routes and storage functions following the exact same patterns used in Phases 1-2.

---

## Standard Stack

### Core (already installed — no new installs needed)

| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| `@anthropic-ai/sdk` | ^0.78.0 | Claude API client | Primary provider |
| `openai` | ^6.27.0 | OpenAI + DeepSeek client | Used for both providers |
| `drizzle-orm` | ^0.30.10 | DB queries for new tables | Same as existing |
| `drizzle-kit` | ^0.21.4 | Schema migration | `npm run db:push` |
| `zod` | ^3.23.8 | Insert schema validation | Same as existing |
| `@tanstack/react-query` | ^5.45.1 | Server state / mutations | Same as existing |

### No New Packages Required

All three AI providers can be served with the two already-installed SDK packages:
- Claude: `@anthropic-ai/sdk` — use `client.messages.create()`
- OpenAI: `openai` — use `client.chat.completions.create()`
- DeepSeek: `openai` — same client, `baseURL: "https://api.deepseek.com"`, `apiKey: deepseekApiKey`

---

## Architecture Patterns

### Recommended File Structure (new files for Phase 4)

```
server/
├── services/
│   └── ai-orchestrator.ts       # Provider abstraction, fallback chain, token tracking
├── storage.ts                   # Add: campaigns CRUD, ai_logs, campaign_contents, prompt_templates
└── routes.ts                    # Add: /api/campaigns/*, /api/ai/generate

shared/
└── schema.ts                    # Add: aiLogs, campaignContents, promptTemplates tables + insert schemas

client/src/pages/
├── CampaignsPage.tsx            # Campaign list + creation entry point
├── CampaignDetailPage.tsx       # Detail view: steps, content versions, export
└── AiStudioPage.tsx             # AI prompt runner, audit log, provider selector

client/src/components/
├── campaigns/
│   ├── CampaignWizard.tsx       # Multi-step wizard shell (6 steps)
│   ├── WizardStepTitle.tsx      # Step 1: title + template select
│   ├── WizardStepGoal.tsx       # Step 2: goal selection
│   ├── WizardStepRegions.tsx    # Step 3: target regions
│   ├── WizardStepClips.tsx      # Step 4: clip selection
│   ├── WizardStepAI.tsx         # Step 5: AI copy generation
│   └── WizardStepExport.tsx     # Step 6: export / smart link
└── ai/
    ├── ProviderSelector.tsx     # Manual provider select UI
    ├── ManualPasteModal.tsx     # Non-API fallback paste flow
    ├── AiOutputCard.tsx         # Display generated content + version toggle
    └── TokenUsageBar.tsx        # Usage vs. cap visualization
```

### Pattern 1: ai_orchestrator Service Module

**What:** Single exported async function wraps all three providers, reads settings from DB,
attempts primary provider, falls back in order, logs every attempt to `ai_logs`.

**When to use:** All AI generation — both server-side routes and background tasks.

```typescript
// server/services/ai-orchestrator.ts
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { getFullAppSettings } from "../storage.js";
import { createAiLog } from "../storage.js";

export type AiTask =
  | "campaign_brief"
  | "clip_to_post"
  | "territory_assistant"
  | "catalog_revival";

export interface GenerateOptions {
  forceProvider?: "claude" | "openai" | "deepseek";
  userId?: number;
  campaignId?: number;
}

export interface GenerateResult {
  content: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  logId: number;
}

export async function generateText(
  task: AiTask,
  systemPrompt: string,
  userPrompt: string,
  options: GenerateOptions = {}
): Promise<GenerateResult> {
  const settings = await getFullAppSettings();
  if (!settings) throw new Error("App settings not configured");

  const order: string[] = options.forceProvider
    ? [options.forceProvider]
    : [settings.aiPrimaryProvider ?? "claude", ...(settings.aiFallbackOrder ?? [])];

  let lastError: Error | null = null;

  for (const provider of order) {
    const startMs = Date.now();
    try {
      const result = await callProvider(provider, settings, systemPrompt, userPrompt);
      const latencyMs = Date.now() - startMs;

      const logId = await createAiLog({
        provider,
        model: result.model,
        task,
        tokensIn: result.inputTokens,
        tokensOut: result.outputTokens,
        latencyMs,
        status: "success",
        userId: options.userId,
        campaignId: options.campaignId,
        responseText: result.content,
        promptText: userPrompt,
      });

      return { ...result, latencyMs, logId };
    } catch (err) {
      lastError = err as Error;
      // log failure, continue to next provider
      await createAiLog({
        provider,
        task,
        tokensIn: 0,
        tokensOut: 0,
        latencyMs: Date.now() - startMs,
        status: "error",
        userId: options.userId,
        campaignId: options.campaignId,
        responseText: lastError.message,
        promptText: userPrompt,
      });
    }
  }

  throw lastError ?? new Error("All AI providers failed");
}
```

### Pattern 2: Campaign Wizard State — Draft-First Persistence

**What:** Create a `draft` campaign record at wizard step 1. Each subsequent step PATCHes the
same record. Wizard reads the campaign ID from URL params so the browser back button works.

**Why:** Prevents data loss on refresh, allows users to return to in-progress campaigns.
Matches the UX pattern used by the Smart Links wizard in Phase 2.

**Step → API mapping:**
```
Step 1 (title/template) → POST /api/campaigns           → creates draft, returns id
Step 2 (goal)           → PATCH /api/campaigns/:id       → {goal}
Step 3 (regions)        → PATCH /api/campaigns/:id       → {targetRegions}
Step 4 (clips)          → PATCH /api/campaigns/:id       → {clipIds}
Step 5 (AI copy)        → POST /api/campaigns/:id/generate → triggers ai_orchestrator
Step 6 (export)         → PATCH /api/campaigns/:id       → {status: "active"} + export
```

### Pattern 3: DeepSeek via OpenAI SDK

**What:** Instantiate a second `OpenAI` client with `baseURL` override.

```typescript
// Inside callProvider() in ai-orchestrator.ts
function buildDeepSeekClient(apiKey: string): OpenAI {
  return new OpenAI({
    apiKey,
    baseURL: "https://api.deepseek.com",
  });
}

// Models available: "deepseek-chat" (V3, fast), "deepseek-reasoner" (R1, thinking)
// Default: "deepseek-chat"
```

**Source:** [DeepSeek API Docs](https://api-docs.deepseek.com/) — confirmed base URL and model names.

### Pattern 4: Content Versioning

**What:** Each AI generation or manual edit creates a new row in `campaign_contents` with
incremented `version`. The `isActive` flag marks the current live version. Switching versions
is a PATCH that sets the old row `isActive: false` and the selected row `isActive: true`.

**Grain:** one row per (campaignId, contentType, platform, region) active version.

```
contentType values: "headline" | "caption_short" | "caption_long" | "cta" | "hashtags"
platform values:    "instagram" | "tiktok" | "youtube" | "x" | "facebook" | "generic"
region values:      ISO country code or "ALL"
source values:      "ai" | "manual" | "manual_paste"
```

### Pattern 5: Non-API (Manual Paste) Mode

**Flow:**
1. User clicks "Generate without API" in the AI Studio panel.
2. Server builds the full prompt from `prompt_templates` and returns it as plain text.
3. Frontend displays the prompt in a copy-to-clipboard textarea.
4. User pastes into ChatGPT/Claude.ai/etc., copies the response.
5. Frontend shows a `<textarea>` to paste the result.
6. On submit: backend creates a `campaign_contents` row with `source: "manual_paste"` and
   creates an `ai_logs` row with `provider: "manual"`, `status: "manual_paste"`.

**Route needed:** `POST /api/ai/prompt-preview` — builds prompt from template + context, returns
string. No AI call, no log. Safe for any role.

### Anti-Patterns to Avoid

- **Embedding prompts in code:** All prompt templates must live in `prompt_templates` table so
  they can be updated without deploys. Seed default templates on `db:seed`.
- **Fire-and-forget AI calls from the client:** All generation must route through a server
  endpoint — keys never leave the server.
- **Storing raw API keys in logs:** `ai_logs.prompt_text` should store the rendered user
  prompt only, never the system prompt with injected keys.
- **Blocking the HTTP response for long AI calls:** Use standard async/await on the route —
  Express handles this fine for calls under ~30s. For very long tasks (catalog revival summary),
  return a `jobId` immediately and poll.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Token counting | Custom tokenizer | SDK response `usage` field | Anthropic/OpenAI both return exact counts in response |
| Provider retry backoff | Custom exponential backoff | Linear fallback to next provider | Per-request fallback is simpler and aligns with UX intent |
| Prompt rendering | Mustache/Handlebars | Simple string `.replace()` with `{{variable}}` pattern | Templates are short; full templating engines add deps |
| JSON schema validation | Manual field checks | `zod` (already installed) | Consistent with rest of codebase |
| UUID generation for slugs | `uuid` package | `Math.random().toString(36)` (already used in storage.ts) | Sufficient for non-security slugs; already established pattern |

---

## Common Pitfalls

### Pitfall 1: Token Cap Enforcement Timing

**What goes wrong:** Daily token cap checked after the API call returns, so overage is detected
too late and the last request runs over budget.

**Why it happens:** Cap query and API call are not in a transaction.

**How to avoid:** Before calling the AI API, query `SUM(tokens_in + tokens_out)` from `ai_logs`
for today for this user and globally. If either exceeds cap, return a 429 with a clear message
before making the API call.

**Warning signs:** Admin sees token spend significantly over configured cap after a busy day.

### Pitfall 2: DeepSeek Model Name Mismatch

**What goes wrong:** Using `"deepseek-v3"` instead of `"deepseek-chat"` causes a 404 from the
DeepSeek API.

**Why it happens:** The model identifier is `deepseek-chat` even though the underlying model
is DeepSeek-V3.2. The alias is intentional by DeepSeek.

**How to avoid:** Seed `appSettings.deepseekModel` as `"deepseek-chat"`. Document the
model-name aliasing in a code comment.

### Pitfall 3: Wizard Step Data Loss on Provider Failure

**What goes wrong:** AI generation at Step 5 fails; user hits back; the wizard loses their
clip selection from Step 4.

**Why it happens:** If wizard state is only in React component state (not persisted to DB).

**How to avoid:** Draft-first persistence pattern (Pattern 2 above) — each step writes to DB
before advancing. Wizard renders from the campaign record, not local state.

### Pitfall 4: campaign_contents Version Drift

**What goes wrong:** Multiple `isActive: true` rows exist for the same
(campaignId, contentType, platform, region) tuple after a bug in the version activation logic.

**Why it happens:** Activation query sets new row `isActive: true` without first setting old
rows `isActive: false`, and the operations aren't wrapped in a transaction.

**How to avoid:** Wrap version activation in a Drizzle transaction: set all rows for the tuple
to `isActive: false`, then set the target row to `isActive: true`.

### Pitfall 5: Prompt Template Version Confusion

**What goes wrong:** An updated prompt template produces different output for the same campaign,
making the audit log misleading.

**Why it happens:** Prompt templates are fetched live at generation time rather than snapshotted.

**How to avoid:** Store the rendered prompt text in `ai_logs.prompt_text` at generation time.
The `prompt_templates.version` used should also be recorded in `ai_logs` (add a
`promptTemplateVersion` column or include it in the metadata).

### Pitfall 6: Anthropic SDK Usage Field Location

**What goes wrong:** Code reads `response.usage` but the field is `undefined` for streaming.

**Why it happens:** For streaming responses, usage is in the `message_start` event, not on the
final object. For non-streaming, it's on `response.usage` directly.

**How to avoid:** Use non-streaming `client.messages.create()` for all orchestrator calls
(streaming is not needed for batch generation). `response.usage.input_tokens` and
`response.usage.output_tokens` are always present on non-streaming responses.

---

## Code Examples

### Anthropic non-streaming with usage tracking

```typescript
// Source: @anthropic-ai/sdk — non-streaming messages
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey });
const response = await client.messages.create({
  model: "claude-opus-4-5",           // from appSettings.claudeModel
  max_tokens: 2048,
  system: systemPrompt,
  messages: [{ role: "user", content: userPrompt }],
});
const content = (response.content[0] as Anthropic.TextBlock).text;
const inputTokens = response.usage.input_tokens;
const outputTokens = response.usage.output_tokens;
```

### OpenAI / DeepSeek with usage tracking

```typescript
// Source: openai ^6.x — chat completions
import OpenAI from "openai";

// OpenAI
const openaiClient = new OpenAI({ apiKey: openaiApiKey });

// DeepSeek (same client, different baseURL)
const deepseekClient = new OpenAI({
  apiKey: deepseekApiKey,
  baseURL: "https://api.deepseek.com",
});

const response = await client.chat.completions.create({
  model: "deepseek-chat",    // or "gpt-4o" for OpenAI
  messages: [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ],
});
const content = response.choices[0].message.content ?? "";
const inputTokens = response.usage?.prompt_tokens ?? 0;
const outputTokens = response.usage?.completion_tokens ?? 0;
```

### Token cap check pattern

```typescript
// Before any AI call
import { sql } from "drizzle-orm";

const todayStart = new Date();
todayStart.setHours(0, 0, 0, 0);

const [dailyUsage] = await db
  .select({ total: sql<number>`SUM(tokens_in + tokens_out)` })
  .from(aiLogs)
  .where(
    and(
      eq(aiLogs.status, "success"),
      sql`${aiLogs.createdAt} >= ${todayStart.toISOString()}`
    )
  );

if ((dailyUsage?.total ?? 0) >= settings.aiDailyTokenCap) {
  throw new Error("Daily token cap reached. Try again tomorrow.");
}
```

### Drizzle transaction for content version activation

```typescript
await db.transaction(async (tx) => {
  // Deactivate all current versions for this slot
  await tx
    .update(campaignContents)
    .set({ isActive: false })
    .where(
      and(
        eq(campaignContents.campaignId, campaignId),
        eq(campaignContents.contentType, contentType),
        eq(campaignContents.platform, platform),
        eq(campaignContents.region, region)
      )
    );
  // Activate the selected version
  await tx
    .update(campaignContents)
    .set({ isActive: true })
    .where(eq(campaignContents.id, versionId));
});
```

---

## Schema Additions Needed

Three new tables. None of the existing tables require modification.

### `ai_logs` table

```typescript
export const aiLogs = pgTable(
  "ai_logs",
  {
    id: serial("id").primaryKey(),
    provider: text("provider").notNull(),         // "claude" | "openai" | "deepseek" | "manual"
    model: text("model"),
    task: text("task").notNull(),                 // AiTask enum value
    tokensIn: integer("tokens_in").notNull().default(0),
    tokensOut: integer("tokens_out").notNull().default(0),
    latencyMs: integer("latency_ms"),
    status: text("status").notNull(),             // "success" | "error" | "manual_paste"
    userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
    campaignId: integer("campaign_id").references(() => campaigns.id, { onDelete: "set null" }),
    promptText: text("prompt_text"),
    responseText: text("response_text"),
    promptTemplateVersion: integer("prompt_template_version"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    campaignIdIdx: index("ai_logs_campaign_id_idx").on(table.campaignId),
    userIdIdx: index("ai_logs_user_id_idx").on(table.userId),
    createdAtIdx: index("ai_logs_created_at_idx").on(table.createdAt),
  })
);
```

### `campaign_contents` table

```typescript
export const campaignContents = pgTable(
  "campaign_contents",
  {
    id: serial("id").primaryKey(),
    campaignId: integer("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    contentType: text("content_type").notNull(),  // "headline"|"caption_short"|"caption_long"|"cta"|"hashtags"
    platform: text("platform").notNull().default("generic"),
    region: text("region").notNull().default("ALL"),
    version: integer("version").notNull().default(1),
    body: text("body").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    source: text("source").notNull().default("ai"), // "ai" | "manual" | "manual_paste"
    aiLogId: integer("ai_log_id").references(() => aiLogs.id, { onDelete: "set null" }),
    editedById: integer("edited_by_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    campaignIdIdx: index("campaign_contents_campaign_id_idx").on(table.campaignId),
    isActiveIdx: index("campaign_contents_is_active_idx").on(table.isActive),
  })
);
```

### `prompt_templates` table

```typescript
export const promptTemplates = pgTable("prompt_templates", {
  id: serial("id").primaryKey(),
  taskName: text("task_name").notNull(),          // matches AiTask enum
  provider: text("provider").notNull().default("all"), // "all" | "claude" | "openai" | "deepseek"
  model: text("model"),
  systemPrompt: text("system_prompt").notNull(),
  userPromptTemplate: text("user_prompt_template").notNull(),
  version: integer("version").notNull().default(1),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

**Seeded default templates** — all four task types need seed rows in `server/seed.ts`:
`campaign_brief`, `clip_to_post`, `territory_assistant`, `catalog_revival`

---

## Route Structure

Following the exact pattern in `server/routes.ts` — auth middleware first, then operation.

### Campaigns API

```
GET    /api/campaigns                     requireAuth    list all (with optional ?titleId=)
POST   /api/campaigns                     requireOperator  create draft
GET    /api/campaigns/:id                 requireAuth    get single with contents
PATCH  /api/campaigns/:id                 requireOperator  update any field (wizard steps)
DELETE /api/campaigns/:id                 requireAdmin   delete campaign
PATCH  /api/campaigns/:id/status          requireReviewer  approve / reject
GET    /api/campaigns/:id/contents        requireAuth    list all content versions
POST   /api/campaigns/:id/contents        requireOperator  save manual content
PATCH  /api/campaigns/:id/contents/:cid/activate  requireOperator  activate version
GET    /api/campaigns/:id/export          requireOperator  build export payload (JSON)
```

### AI API

```
POST   /api/ai/generate                   requireOperator  run ai_orchestrator
POST   /api/ai/prompt-preview             requireOperator  return rendered prompt (no API call)
GET    /api/ai/logs                       requireAdmin   list ai_logs (paginated)
GET    /api/ai/logs/:id                   requireAdmin   get single log entry
GET    /api/ai/usage                      requireAuth    daily token usage summary
GET    /api/ai/prompt-templates           requireAdmin   list prompt templates
PATCH  /api/ai/prompt-templates/:id       requireAdmin   update template
```

### `POST /api/ai/generate` body

```typescript
{
  task: AiTask;
  campaignId?: number;
  context: {
    titleId?: number;
    clipIds?: number[];
    targetRegions?: string[];
    goal?: string;
    platform?: string;
    region?: string;
    [key: string]: unknown;
  };
  provider?: "claude" | "openai" | "deepseek";  // manual override
  saveToContents?: boolean;                       // auto-save output to campaign_contents
}
```

---

## Wave Breakdown

### Wave 1 — DB + Services + API Layer (no UI)

Tasks:
1. Add `aiLogs`, `campaignContents`, `promptTemplates` tables to `shared/schema.ts` with insert
   schemas and exported types.
2. Run `npm run db:push` to apply migration.
3. Add seed rows for 4 prompt templates in `server/seed.ts`.
4. Add storage functions: `createAiLog`, `getCampaigns`, `getCampaignById`, `createCampaign`,
   `updateCampaign`, `deleteCampaign`, `createCampaignContent`, `getCampaignContents`,
   `activateCampaignContentVersion`, `checkTokenCaps`, `getPromptTemplates`, `getAiUsageSummary`.
5. Build `server/services/ai-orchestrator.ts`: `generateText`, `callProvider` (Claude/OpenAI/
   DeepSeek branches), `buildPrompt` (fetch template + interpolate variables), `enforceTokenCaps`.
6. Add all campaign and AI routes to `server/routes.ts`.

**Wave 1 verification:** All routes respond with correct JSON via curl/REST client. AI generation
works for all three providers. Token cap enforcement returns 429 when over limit.

### Wave 2 — Campaign Builder UI

Tasks:
1. `CampaignsPage.tsx` — list view with status badges, "New Campaign" button.
2. `CampaignWizard.tsx` — 6-step shell using `wouter` route params (`/campaigns/new`,
   `/campaigns/:id/edit/step/:step`).
3. Six step components: `WizardStepTitle`, `WizardStepGoal`, `WizardStepRegions`,
   `WizardStepClips` (uses existing clips API), `WizardStepAI`, `WizardStepExport`.
4. `CampaignDetailPage.tsx` — read-only view of a completed campaign with content sections,
   version history, approval status, and export button.
5. Reviewer approval flow: status badge with "Approve / Request Edits" actions (role-gated).

**Wave 2 verification:** Full wizard runs end-to-end in browser. Draft is visible on list page.
Approval workflow changes status correctly.

### Wave 3 — AI Studio Panel + Audit UI

Tasks:
1. `AiStudioPage.tsx` — task selector, context form, provider selector, output display.
2. `ProviderSelector.tsx` — radio buttons for Claude/OpenAI/DeepSeek/Manual, reads from
   settings to show only configured providers.
3. `ManualPasteModal.tsx` — shows rendered prompt with copy button; paste-back textarea;
   submit saves to `campaign_contents`.
4. `AiOutputCard.tsx` — displays generated content per type (headline, short cap, long cap,
   CTA, hashtags); edit in place; save as new version.
5. `TokenUsageBar.tsx` — shows today's usage vs. daily cap; per-user usage.
6. Admin AI Logs page: table of `ai_logs` with provider/model/tokens/latency/status columns.
7. Admin Prompt Templates page: view and edit template body (textarea); shows version number.

**Wave 3 verification:** All four AI tasks run and save output. Manual paste mode saves with
correct source label. Token usage bar updates after generation. Audit log shows all requests.
Admin can edit prompt templates and new generation uses updated template.

---

## State of the Art

| Old Approach | Current Approach | Notes |
|--------------|------------------|-------|
| Separate DeepSeek SDK | OpenAI SDK + baseURL override | DeepSeek is OpenAI-compatible; no extra package |
| Hardcoded prompts | DB-stored versioned templates | Enables non-deploy updates |
| Per-request provider selection | Fallback chain from settings | Resilient to provider outages |
| Storing content in campaigns.briefText only | campaign_contents table with versioning | Supports multiple content types + edit history |

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Not configured — no test runner detected in package.json |
| Config file | None (Wave 0 gap) |
| Quick run command | TBD — see Wave 0 Gaps |
| Full suite command | TBD |

No test infrastructure is present in the project (no jest.config, vitest.config, pytest.ini,
or test/ directory). Given the project stack (Node/Express/TS + React/Vite), the standard
choice is **Vitest** (works with the existing Vite setup, no additional config needed for
frontend tests, Jest-compatible API for backend tests).

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Notes |
|--------|----------|-----------|-------|
| CAM-01 | Campaign CRUD returns correct data | Unit (storage fn) | Test createCampaign / updateCampaign / getCampaignById |
| CAM-02 | Campaign status transitions | Unit (storage fn) | draft → ai_generated → awaiting_approval → approved |
| AI-01 | ai_orchestrator falls back to secondary when primary throws | Unit (orchestrator) | Mock provider calls |
| AI-02 | Token cap enforcement returns 429 before API call | Unit (route) | Mock settings with low cap |
| AI-03 | DeepSeek uses correct baseURL | Unit (orchestrator) | Verify OpenAI client construction |
| AI-04 | Manual paste mode saves with source="manual_paste" | Unit (storage fn) | |
| CONTENT-01 | Version activation is atomic (no dual-active) | Unit (storage fn) | Check post-activation state |
| CONTENT-02 | Export endpoint returns all active content | Integration | |

### Wave 0 Gaps

- [ ] `vitest.config.ts` — install `vitest` and configure for Node environment
- [ ] `tests/setup.ts` — shared test DB setup (or mock DB layer)
- [ ] `tests/unit/ai-orchestrator.test.ts` — covers AI-01, AI-02, AI-03
- [ ] `tests/unit/campaign-storage.test.ts` — covers CAM-01, CAM-02, CONTENT-01

Install command: `npm install -D vitest @vitest/coverage-v8`

---

## Open Questions

1. **Prompt template interpolation variables per task**
   - What we know: Each task needs a different set of context variables (clip metadata, title
     info, regions, goal).
   - What's unclear: Should the template use `{{variable}}` syntax or something else?
   - Recommendation: Use `{{variable}}` as double-brace delimiters replaced by `.replace()`.
     Document the available variables for each task in the seed template's `userPromptTemplate`
     as a header comment.

2. **Token cost tracking (dollar amounts)**
   - What we know: We track `tokens_in` and `tokens_out` per log entry.
   - What's unclear: Should we compute dollar amounts in the DB or derive at query time?
   - Recommendation: Store only token counts in `ai_logs`. Compute cost in the UI using
     known per-provider pricing constants (a config object in the frontend). Pricing changes
     don't require a migration.

3. **Streaming vs. non-streaming for AI generation**
   - What we know: Both Anthropic and OpenAI SDKs support streaming.
   - What's unclear: Is streaming needed for the UX (typing animation)?
   - Recommendation: Non-streaming for v1. The wizard step 5 shows a loading spinner and
     the full output appears at once. Streaming adds complexity (SSE endpoint, partial saves)
     with marginal UX benefit for batch copy generation.

4. **Phase 3 completion status**
   - What we know: STATE.md lists Phase 3 as "Not started" as of 2026-03-07.
   - What's unclear: Is Phase 3 complete now (since Phase 4 research is being requested)?
   - Recommendation: Planner should confirm Phase 3 state before assuming `clip_posts` and
     rotation storage functions are fully implemented. The schema and base storage functions
     exist but the rotation UI/routes may not.

---

## Sources

### Primary (HIGH confidence)

- `shared/schema.ts` — campaigns table, appSettings AI fields, InsertCampaign schema (verified directly)
- `server/storage.ts` — existing storage function patterns, Drizzle query patterns (verified directly)
- `package.json` — confirmed @anthropic-ai/sdk ^0.78.0 and openai ^6.27.0 installed (verified directly)
- [DeepSeek API Docs](https://api-docs.deepseek.com/) — base URL `https://api.deepseek.com`, model names `deepseek-chat` and `deepseek-reasoner`

### Secondary (MEDIUM confidence)

- [Anthropic TypeScript SDK](https://platform.claude.com/docs/en/api/sdks/typescript) — non-streaming response shape, usage field location
- [OpenAI Node SDK](https://github.com/openai/openai-node) — chat completions usage fields

### Tertiary (LOW confidence)

- None — all critical findings verified against primary sources.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages already installed, versions confirmed from package.json
- Architecture: HIGH — follows existing patterns in storage.ts and routes.ts exactly
- AI provider setup: HIGH — DeepSeek base URL and models confirmed from official API docs
- Pitfalls: MEDIUM — token cap timing and version atomicity are design decisions, not observed bugs
- Schema additions: HIGH — consistent with existing schema patterns in the file

**Research date:** 2026-03-09
**Valid until:** 2026-06-09 (stable APIs; DeepSeek model names may change — verify before execution)

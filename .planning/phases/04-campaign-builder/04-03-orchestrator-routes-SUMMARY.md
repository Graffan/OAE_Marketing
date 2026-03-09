# Plan 04-03: orchestrator-routes — SUMMARY

**Status:** Complete
**Tasks:** 6/6
**Wave:** 1

## What Was Built

### server/services/ai-orchestrator.ts (273 lines)
- `buildPrompt()` — renders prompt templates with `{{var}}` substitution
- Provider adapters: `callClaude()` (Anthropic SDK), `callOpenAI()` (OpenAI SDK), `callDeepSeek()` (OpenAI SDK with baseURL: https://api.deepseek.com)
- `generateText(task, payload, options?)` — main export:
  - Reads appSettings fresh from DB each call (live key rotation)
  - Pre-call token cap check via `getTokenUsageToday()` → 429 if exceeded
  - Automatic fallback: primary → aiFallbackOrder[0] → aiFallbackOrder[1]
  - Non-API manual mode: returns `{ manualMode: true, promptForUser }` when no key configured
  - Writes to `ai_logs` after each attempt

### server/routes.ts (campaign + AI routes appended)
- `GET/POST /api/campaigns` — list + create
- `GET/PATCH/DELETE /api/campaigns/:id` — detail + update + delete
- `POST /api/campaigns/:id/contents` — add content version
- `PATCH /api/campaigns/:id/contents/:cid/activate` — activate version (transaction-safe)
- `GET /api/campaigns/:id/export` — export for posting
- `PATCH /api/campaigns/:id/status` — approval workflow
- `POST /api/ai/generate` — triggers generateText, returns result + logId
- `GET /api/ai/logs` — paginated audit log (admin)
- `GET /api/ai/logs/:id` — single log detail (admin)
- `GET /api/ai/usage` — token usage summary
- `GET/PATCH /api/ai/prompt-templates` — template management (admin)

## Commits
- f5ec62d feat(4-3-01): create ai-orchestrator service — types and buildPrompt
- 1a72d46 feat(4-3-02): add provider adapters to ai-orchestrator
- 536fc56 feat(4-3-03): add generateText with fallback chain and token cap
- 0a7025f fix(4-3): add missing getAiLogById — fix tsc build error

## Self-Check: PASSED
- tsc --noEmit: clean
- All 3 provider adapters implemented
- Fallback chain functional
- Token cap enforced pre-call
- All campaign + AI routes registered

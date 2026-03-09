---
phase: 4
slug: campaign-builder
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-09
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | TypeScript compiler (tsc --noEmit) — no unit test framework in project |
| **Config file** | tsconfig.json |
| **Quick run command** | `cd /Users/geoffraffan/Projects/OAE_Marketing && npx tsc --noEmit 2>&1 | head -20` |
| **Full suite command** | `cd /Users/geoffraffan/Projects/OAE_Marketing && npx tsc --noEmit` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx tsc --noEmit 2>&1 | head -20`
- **After every plan wave:** Run `npx tsc --noEmit`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 4-01-01 | 01 | 1 | Schema | compile | `npx tsc --noEmit` | ⬜ pending |
| 4-01-02 | 01 | 1 | ai_logs storage | compile | `npx tsc --noEmit` | ⬜ pending |
| 4-01-03 | 01 | 1 | orchestrator | compile | `npx tsc --noEmit` | ⬜ pending |
| 4-01-04 | 01 | 1 | campaign routes | compile | `npx tsc --noEmit` | ⬜ pending |
| 4-02-01 | 02 | 2 | campaign hooks | compile | `npx tsc --noEmit` | ⬜ pending |
| 4-02-02 | 02 | 2 | CampaignWizard | compile | `npx tsc --noEmit` | ⬜ pending |
| 4-02-03 | 02 | 2 | CampaignsPage | compile | `npx tsc --noEmit` | ⬜ pending |
| 4-03-01 | 03 | 3 | AI Studio panel | compile | `npx tsc --noEmit` | ⬜ pending |
| 4-03-02 | 03 | 3 | AuditLogPage | compile | `npx tsc --noEmit` | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements — TypeScript compiler is already configured.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Full campaign wizard end-to-end | Campaign builder | No E2E framework | Create campaign from title → export, verify all steps persist |
| AI generation fallback | Provider fallback | Requires live API keys | Set invalid Claude key, trigger generation, verify OpenAI used |
| Token cap enforcement | aiDailyTokenCap | Requires DB state | Set low cap, make requests, verify 429 returned on breach |
| Manual paste mode | Non-API fallback | UI interaction | Select manual mode, paste text, verify saved with source=manual |
| Campaign approval workflow | Approval workflow | Auth + state | Log in as reviewer, approve campaign, verify status transitions |

---

## Validation Sign-Off

- [ ] All tasks have compile verification
- [ ] Sampling continuity maintained
- [ ] Wave 0 not required (existing infrastructure)
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

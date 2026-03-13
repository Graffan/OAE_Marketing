# OAE_Marketing — Roadmap

**Project:** OAE_Marketing
**Created:** 2026-03-07
**Milestone:** v1.0 — Internal Marketing Operating System MVP

---

## Milestone 1: v1.0 — MVP

### Phase 1: Foundation
**Goal:** Core data models, auth, title catalog, Dropbox sync, clip library

**Deliverables:**
- Project scaffold (Node/Express/TS + React/Vite/Tailwind/shadcn + Postgres/Drizzle)
- Session auth with Passport.js, 5 roles (admin, marketing_operator, reviewer, executive, freelancer)
- Admin panel: user management + app settings + AI provider config
- Titles CRUD with OMDb API auto-import
- Projects CRUD with Dropbox connection + folder mapping
- Dropbox sync: index viral clips folder, store metadata in `clips` table
- Clip library UI: filter, preview, approve/reject, bulk actions
- DB schema: all 9 tables (titles, projects, assets, clips, clip_posts, campaigns, smart_links, regional_destinations, analytics_events)
- DB seed: admin user + app settings

**Verification:**
- [ ] Can create a title, auto-import from OMDb, and manually edit fields
- [ ] Can connect a Dropbox folder and sync clips into the library
- [ ] Clips appear with metadata and can be approved/rejected
- [ ] Admin can create/edit/deactivate users with correct role gating
- [ ] All 5 roles see appropriate UI elements

---

### Phase 2: Destinations & Smart Links
**Goal:** Regional watch-link management and territory-aware smart link routing

**Deliverables:**
- Regional destinations CRUD (per title, per country/region, with deal windows)
- Link state tracking: active, expiring_soon, expired
- Smart link generation: slug-based URLs (`watch.otheranimal.app/{slug}`)
- Smart link resolution endpoint: IP geolocation → regional_destinations → redirect + tracking params
- Smart link tester UI (input country → preview destination)
- Dashboard alerts for expiring/missing regional links
- Rights/restrictions fields on clips (allowed_regions, restricted_regions, embargo_date)

**Verification:**
- [ ] Can add regional destinations for a title (CA → Apple TV, US → Amazon, UK → Tubi)
- [ ] Smart link resolves correctly by region with tracking params appended
- [ ] Smart link tester shows correct resolution by country
- [ ] Dashboard shows expiring deal alerts

---

### Phase 3: Clip Rotation Engine
**Goal:** Prevent duplicate posting, track usage, enforce rotation rules

**Deliverables:**
- Clip rotation state per campaign/project (cycle tracking)
- Rotation algorithm: filter approved → remove already-posted → pick highest priority → on pool exhaustion re-rank and start new cycle
- Clip post history records (clip_posts table with full posting metadata)
- Duplicate warning UI: show last post date, last platforms, alternatives
- Operator rotation controls: no-repeat until exhausted, repeat top performers after X days, region/platform-specific reuse, manual override
- Clip rotation indicator widget (e.g., "18 of 26 clips used, 8 remaining")
- Clip states: new → awaiting_review → approved → scheduled → posted → archived

**Verification:**
- [ ] Rotation correctly blocks a clip from reuse until pool is exhausted
- [ ] Duplicate warning appears with correct last post info
- [ ] Manual override works
- [ ] Clip rotation indicator shows accurate counts

---

### Phase 4: Campaign Builder + AI Studio
**Goal:** End-to-end campaign creation with AI-assisted copy generation

**Deliverables:**
- Campaign builder workflow: title → goal → regions → clip select → AI copy → smart links → export
- Campaign states: draft, ai_generated, awaiting_approval, approved, active, completed
- Campaign templates: new title launch, trailer release, watch-now, seasonal, catalog revival
- `ai_orchestrator` module: provider abstraction layer for Claude, OpenAI, DeepSeek
- AI tasks implemented:
  - Campaign brief generator
  - Clip-to-post generator (headline, short/long caption, CTA, hashtags, platform recs, region-aware link)
  - Territory release assistant
  - Catalog revival assistant
- Automatic provider fallback (primary fail → secondary → log switch)
- Manual provider selection UI
- Non-API fallback mode (copy prompt → paste result back → label source)
- Token + cost tracking per request/user/project
- Prompt templates stored per task
- AI output audit log (provider, model, tokens, latency, response)
- Content versioning (captions, CTAs, links, campaign params)
- Post export (manual publishing in v1)

**Verification:**
- [ ] Can run full campaign builder workflow from title selection to post export
- [ ] AI generates caption, CTA, and hashtags for a selected clip
- [ ] Claude/OpenAI/DeepSeek all work as providers with correct routing
- [ ] Fallback triggers when primary provider fails
- [ ] Non-API manual paste mode saves AI output correctly
- [ ] Campaign approval workflow works end-to-end (reviewer approves/rejects)
- [ ] Token usage tracked per request and visible in admin

---

### Phase 5: Analytics + Dashboard
**Goal:** Clip and campaign performance tracking, AI-powered weekly summary

**Plans:** 6/6 plans complete

Plans:
- [ ] 05-01-PLAN.md — Analytics storage functions (scores, views, dashboard summary, asset health)
- [ ] 05-02-PLAN.md — Notification schema + storage functions
- [ ] 05-03-PLAN.md — Analytics API routes + AI weekly summary route
- [ ] 05-04-PLAN.md — Notification API routes + failure handling routes
- [ ] 05-05-PLAN.md — useAnalytics + useNotifications hooks + AnalyticsPage UI
- [ ] 05-06-PLAN.md — Rebuilt DashboardPage + NotificationBell component

**Deliverables:**
- Analytics events table population from clip_posts data
- Clip-level analytics: impressions, plays, completion rate, likes, comments, shares, saves, click-throughs, region/platform response
- Engagement score computation (weighted: likes + comments + shares + saves + view duration)
- Clip performance score (engagement + CTR + region + platform)
- Repost eligibility logic (engagement threshold + days since last post + pool exhaustion)
- Analytics views: by clip, by campaign, by region, by platform
- Performance summarizer AI task (weekly summary: what worked, what failed, best hooks, next actions)
- Full dashboard: campaigns in flight, titles needing promotion, rotation status, top clips, AI recs, asset health
- Asset health dashboard: unsynced projects, missing metadata, titles with no clips, regions missing watch links
- In-app notification system: new clips synced, approval required, link expiring, pool exhausted, strong clip detected
- Failure handling: cloud sync alerts, deleted source file detection, retry sync

**Verification:**
- [ ] Posting a clip creates analytics_events records
- [ ] Clip performance scores are computed and displayed
- [ ] Dashboard shows correct counts for all widgets
- [ ] Weekly AI summary generates from real performance data
- [ ] Asset health indicators show correct warnings
- [ ] Notifications fire for key events

---

## Milestone 1.5: v1.5 — Morgan: AI Marketing Department

**Why:** v1.0 built the data layer and UI but skipped Phase 3, has no social publishing, no scheduling, and no marketing intelligence. This milestone transforms the app from a manual tool into an AI-powered marketing department run by **Morgan** (AI Head of Marketing) with human oversight from Ryan, Jon, and Geoff.

**See also:** `.planning/SCOUT_SPEC.md` — full Morgan persona, operating modes, approval workflows, daily schedule.

**Constraint:** OAE projects only. No side projects, no external clients. Enforced at database level.

**Team:** Ryan, Jon, Geoff (co-owners, approvers). Morgan (AI, autonomous + collaborative).

---

### Phase 6: Health Check + Phase 3 Gap Fix
**Goal:** Verify all existing phases work end-to-end, fix Phase 3 (Clip Rotation Engine — skipped during v1.0), add multi-user support for Ryan/Jon/Geoff

**Deliverables:**
- Full build + runtime verification of Phases 1–5
- Fix any broken routes, missing imports, or wiring issues
- Implement Phase 3 (Clip Rotation Engine) — was skipped
  - Clip rotation state per campaign/project
  - Rotation algorithm: filter approved → remove posted → pick highest priority → re-rank on exhaustion
  - Clip post history tracking
  - Duplicate warning UI
  - Operator rotation controls
  - Clip rotation indicator widget
  - Clip states: new → awaiting_review → approved → scheduled → posted → archived
- Seed 3 owner accounts: Ryan (admin), Jon (admin), Geoff (admin)
- User preferences per account (notification prefs, default view, timezone)

**Verification:**
- [ ] App builds and runs cleanly on localhost
- [ ] All CRUD operations work (titles, clips, destinations, smart links, campaigns)
- [ ] AI campaign generation works with at least one provider
- [ ] Clip rotation blocks reuse correctly and shows accurate counts
- [ ] Dashboard shows real data from all modules
- [ ] All 3 owner accounts can log in with correct permissions

---

### Phase 7: Social Publishing + Scheduling
**Goal:** Post directly to social platforms and schedule future posts

**Deliverables:**
- Platform connection manager (Instagram Business API, TikTok API, X/Twitter API, YouTube Data API)
- OAuth flows for each platform stored in app settings
- Post composer: preview per platform (aspect ratio, character limits, hashtag handling)
- Platform-specific formatting (TikTok vertical, IG square/reel, X thread, YT Shorts)
- Direct publish action from campaign builder
- Scheduling engine: date/time picker with timezone, queue management
- Calendar view of scheduled + published posts (month/week/day views)
- Post status tracking: scheduled → publishing → published → failed
- Retry logic for failed publishes with error details
- Bulk scheduling: upload a week of content at once

**Verification:**
- [ ] Can connect at least one social platform via OAuth
- [ ] Can schedule a post for a future date/time
- [ ] Scheduled post publishes at correct time
- [ ] Calendar shows all scheduled and published posts
- [ ] Failed posts show error and can be retried

---

### Phase 8: Morgan Core — AI Marketing Brain
**Goal:** Build Morgan's intelligence layer — the AI that thinks like a marketing department head

**Deliverables:**
- **Morgan identity:** Named AI persona visible in UI ("Morgan recommends...", "Morgan drafted...")
- **Morgan chat interface:** Conversational panel where owners can ask Morgan questions ("What should we post for [film] this week?", "Why is TikTok engagement down?", "Draft 5 caption variants for this clip")
- **"What should I post today?"** — one-click recommendation: clip + caption + platform + time + smart link, based on rotation state, analytics, strategy, and trending topics
- **Campaign strategy wizard:** guided flow (genre → audience → platforms → release stage → budget) → Morgan generates full 30-day campaign plan with content calendar
- **Platform recommendation engine:** genre + audience → platform priority + posting cadence + content format
- **Posting cadence templates:** launch week (daily), sustain (3x/week), catalog (1x/week), event (real-time)
- **Content calendar auto-generator:** given title + release date + platforms → populate calendar with drafts
- **Hook/CTA library:** pre-built by genre and platform, with AI variant generation
- **Morgan learning system:** track which content performs → feed back into future recommendations (preference model per OAE audience, not generic)
- **Brand voice engine:** configurable tone/voice rules per title and for OAE overall; Morgan checks all generated content against brand voice before surfacing
- **New title onboarding:** import → clips → destinations → strategy → first campaign in under 10 clicks

**Verification:**
- [ ] Morgan chat responds to marketing questions with OAE-specific advice
- [ ] "What should I post today?" returns actionable suggestion with clip + caption + platform
- [ ] Strategy wizard generates a plausible 30-day plan for a horror film
- [ ] Platform recommendations change based on genre and audience
- [ ] Content calendar populates from strategy and can be edited
- [ ] Brand voice checker flags off-tone captions

---

### Phase 9: Morgan Autonomous Mode
**Goal:** Morgan operates on a daily cycle without human prompting — drafts content, queues posts, monitors performance, briefs owners

**Deliverables:**
- **Autonomous daily cycle** (cron-driven):
  - 6:00 AM ET: Morning scan — analytics, inventory, trends, rotation state
  - 6:30 AM ET: Auto-draft today's content + queue next 3 days
  - 7:00 AM ET: Morning briefing (in-app + optional email) to Ryan/Jon/Geoff
  - Publish windows: 9 AM, 12 PM, 6 PM (adjust based on audience data)
  - 9:00 PM ET: Evening digest — today's performance snapshot
  - Sunday AM: Weekly strategy review — what worked, what to change
- **Approval queue UI:** Morgan's drafts appear in queue; owners approve/edit/reject with one click
- **Auto-approval rules** (configurable per owner):
  - Recurring series posts (Throwback Thursday, etc.)
  - Re-shares of top performers above engagement threshold
  - Standard posts using approved templates
  - NEVER auto-approve: first posts for new titles, partner mentions, crisis content
- **Morgan activity log:** full audit trail of what Morgan did, when, and why
- **Trend monitoring:** Morgan watches trending topics/sounds on target platforms, suggests timely content when OAE can ride a wave
- **Performance coaching:** "Your TikTok engagement dropped 40%. Your best performer was BTS content. Post more BTS this week."
- **Proactive alerts:** "You haven't posted about [film] in 12 days. Here's a clip and caption ready to go."
- **Cross-title promotion:** Morgan identifies opportunities to market the OAE brand/catalog, not just individual titles
- **Schedule configuration:** owners can adjust Morgan's daily times, enable/disable autonomous posting, set approval thresholds

**Verification:**
- [ ] Morgan generates morning briefing with correct data
- [ ] Approval queue shows Morgan's drafts with approve/edit/reject actions
- [ ] Auto-approved posts publish at scheduled times without human action
- [ ] Edited posts feed back into Morgan's learning (preference captured)
- [ ] Morgan activity log shows full audit trail
- [ ] Trend suggestions appear when relevant topics are detected
- [ ] Proactive alerts fire when titles are undermarketed

---

### Phase 10: Smart Link Deployment + Brand Hub
**Goal:** Deploy watch.otheranimal.app redirect service and centralize OAE brand identity

**Deliverables:**
- Smart link redirect microservice (lightweight Express app or Caddy route)
- DNS configuration for watch.otheranimal.app
- Click tracking with UTM parameter parsing
- Link analytics dashboard (clicks by region, platform, referrer, time)
- Brand asset library: logos, color palettes, font specs, brand voice guide
- Social profile links and bios (centralized, copy-to-clipboard)
- Press kit generator: per-title press kit with synopsis, stills, trailer link, review quotes, contact info
- Brand consistency checker: Morgan reviews all generated content against brand voice

**Verification:**
- [ ] watch.otheranimal.app/{slug} redirects correctly by region
- [ ] Click events are tracked and visible in analytics
- [ ] Brand assets are accessible from campaign builder
- [ ] Press kit generates correctly for a title
- [ ] Morgan captions align with brand voice guide

---

### Phase 11: Audience Growth + Engagement
**Goal:** Move beyond posting into active audience building

**Deliverables:**
- Engagement response templates: Morgan drafts replies to comments (human approves)
- Community engagement tracking: track follower growth, engagement rate, reply rate per platform
- Audience persona profiles: Morgan builds audience segments from analytics (horror fans 18-24, international genre collectors, etc.)
- Cross-promotion engine: identify which OAE titles share audience overlap, suggest cross-promotion
- Newsletter/email signup: capture emails via smart link landing pages
- Email campaign templates: new release announcements, monthly OAE digest, festival wins
- Competitor monitoring: track what similar indie companies post, frequency, engagement (manual input initially, Exa-powered later)
- Release window strategy: ramp/sustain/catalog cadence templates tied to distribution deal dates

**Verification:**
- [ ] Follower growth tracked per platform over time
- [ ] Cross-promotion suggestions appear for titles with audience overlap
- [ ] Email capture works on smart link landing pages
- [ ] Release window strategy adjusts posting cadence based on deal dates
- [ ] Competitor tracking shows useful comparison data

---

## Milestone 2: v2.0 (Future)

- Provider comparison mode (side-by-side AI output comparison)
- A/B testing for hooks and CTAs
- Google Analytics / Meta Pixel integration
- PDF/CSV export for campaign reports
- Influencer outreach tracking and management
- Paid ad campaign management (Meta Ads, Google Ads budgets + ROAS tracking)
- Cross-title campaign bundles ("OAE Genre Fest" — promote full slate together)
- Audience retargeting lists (export to ad platforms)
- OAE website AI SEO page generation
- Morgan voice mode (talk to Morgan via audio, not just text)
- Mobile companion app (approve posts from phone)
- Multi-language caption generation for international markets

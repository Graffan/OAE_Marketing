# OAE_Marketing — Requirements

**Version:** 1.0
**Date:** 2026-03-07
**Source:** PROJECT_BRIEF.md

---

## V1 (MVP) Requirements

### Authentication & Users
- [ ] Session-based auth with Passport.js
- [ ] 5 roles: admin, marketing_operator, reviewer, executive, freelancer
- [ ] Role-gated UI (edit controls hidden based on role)
- [ ] User management in admin panel (create, edit, deactivate)
- [ ] Seeded admin account

### Title Catalog
- [ ] CRUD for film titles
- [ ] OMDb API auto-import on title creation (search by name, confirm match)
- [ ] Fields: title_name, status, release_year, runtime, genre, subgenre, synopsis_short, synopsis_long, marketing_positioning, key_selling_points, mood, trailer_links, awards/festivals, spoiler_guidelines, approved_brand_voice_notes
- [ ] Title-level asset overview (linked clips, campaigns, destinations)

### Projects
- [ ] Project records linking title to cloud storage
- [ ] Connect Dropbox account per project
- [ ] Assign root folder, viral clips subfolder
- [ ] Support folder structure: /Trailers /Posters /Stills /Viral Clips /Subtitles /Press

### Asset / Clip Library
- [ ] Dropbox sync: index files in designated viral clips folder
- [ ] Webhook-first sync with polling fallback (10 min interval)
- [ ] Metadata stored in `clips` table: duration, orientation, hook_type, theme, character_focus, spoiler_level, intensity_level, platform_fit
- [ ] Thumbnail and preview generation
- [ ] Clip approval workflow: new → awaiting review → approved / rejected
- [ ] Clip states: new, awaiting_review, approved, rejected, scheduled, posted, archived
- [ ] Posted count, engagement score, last_posted_at tracking per clip
- [ ] Bulk actions: bulk approve, bulk tag, bulk archive, bulk assign to campaign
- [ ] Filter by title, platform suitability, posted/unposted, engagement score

### Clip Rotation Engine
- [ ] Track rotation cycle per campaign/project
- [ ] Do not repeat a clip until all approved clips in active pool used
- [ ] On pool exhaustion: re-rank by engagement + recency, start new cycle
- [ ] Operator controls: no-repeat until exhausted, repeat top performers after X days, region/platform-specific reuse, manual override
- [ ] Duplicate warning UI: show last post date, last platforms, suggested alternatives

### Regional Destinations
- [ ] CRUD for regional watch links per title
- [ ] Fields: title_id, country_code, region_name, platform_name, platform_type, destination_url, cta_label, language, start_date, end_date, status, campaign_priority, tracking_parameters_template
- [ ] Link states: active, expiring_soon, expired, missing
- [ ] Expiry alerts on dashboard

### Smart Links
- [ ] Generate slug-based campaign links (`watch.otheranimal.app/{slug}`)
- [ ] Resolution: IP geolocation → regional_destinations lookup → redirect
- [ ] Fallback to default_url if no regional match
- [ ] Tracking parameters appended on redirect
- [ ] Smart link tester: input country → preview destination
- [ ] Smart link CRUD: POST /api/links, GET /api/links/{id}/resolve

### Campaign Builder
- [ ] Campaign creation: title → goal (awareness/engagement/trailer/watch-now) → regions → clip selection → AI copy generation → smart link → export
- [ ] Campaign states: draft, ai_generated, awaiting_approval, approved, scheduled, active, completed
- [ ] Campaign templates: new title launch, trailer release, watch-now, seasonal, catalog revival
- [ ] Export posts for manual publishing (v1 — no direct platform posting yet)
- [ ] Approval workflow: reviewer can approve/reject/request edits

### AI Studio
- [ ] Multi-provider abstraction layer (ai_orchestrator module)
- [ ] Claude API integration (primary — long reasoning, campaign planning)
- [ ] OpenAI API integration (copy generation, fast rewrites, metadata cleanup)
- [ ] DeepSeek API integration (low-cost drafting, alternate reasoning)
- [ ] Automatic provider fallback: try primary → if fail/timeout → secondary → log switch
- [ ] Manual provider selection in UI (use Claude / use ChatGPT / use DeepSeek)
- [ ] Non-API fallback mode: copy structured prompt → paste result back → label source
- [ ] AI tasks:
  - Campaign brief generator (title + goal + region + platform → audience angle, hook ideas, clip recs, CTA, posting cadence)
  - Clip-to-post generator (clip → headline, short caption, long caption, CTA, hashtags, platform recs, region-aware link)
  - Territory release assistant (title + date range → active deals, missing links, expiring windows)
  - Catalog revival assistant (older titles to push based on seasonality, trends)
  - Performance summarizer (weekly AI summary: what worked, what failed, best hooks, next actions)
- [ ] Prompt templates stored per task type
- [ ] AI output logging: provider, model, tokens used, latency, response stored with audit trail

### Analytics
- [ ] Clip-level performance: impressions, plays, completion rate, likes, comments, shares, saves, click-throughs, region response, platform response
- [ ] Campaign analytics: clicks by region, post engagement by platform, view-through to trailer/watch page
- [ ] Engagement score: weighted (likes + comments + shares + saves + view duration)
- [ ] Clip performance score: engagement + CTR + region response + platform response
- [ ] Analytics views: by clip, by campaign, by region, by platform
- [ ] Repost eligibility logic: engagement threshold + days since last post + pool exhaustion

### Dashboard
- [ ] Campaigns in flight (status cards)
- [ ] Titles needing promotion
- [ ] Unposted viral clips by project (rotation status)
- [ ] Expiring regional deals
- [ ] Top performing clips
- [ ] AI recommendations panel
- [ ] Asset health indicators: unsynced projects, missing metadata, titles with no clips, regions missing watch links

### Admin Panel
- [ ] User management (create, edit, deactivate, reset password, role assignment)
- [ ] AI provider settings (Claude/OpenAI/DeepSeek API keys, model selection, priority order, fallback order)
- [ ] Usage controls (per-day token cap, per-user cap, project budget cap, warning thresholds)
- [ ] App branding (company name, logo, accent color)
- [ ] Audit log (user, action, timestamp, object affected) for: clip approval, campaign approval, link changes, rotation overrides, AI output edits

### Rights & Restrictions
- [ ] Per-clip fields: allowed_regions, restricted_regions, embargo_date, distributor_notes
- [ ] Region restrictions enforced in rotation engine and campaign builder

### Content Versioning
- [ ] Version history for captions, CTAs, links, campaign parameters
- [ ] Version records: version number, editor, timestamp, change notes

### Notifications
- [ ] In-app alerts: new clips synced, campaign approval required, destination link expiring, clip pool exhausted, strong performing clip detected

### Failure Handling
- [ ] Dashboard alerts for: cloud sync interruptions, deleted source files, expired destination links, analytics import errors
- [ ] Retry sync operations, mark assets as unavailable

---

## V2 Requirements

- [ ] Direct social platform publishing (Instagram, TikTok, X, YouTube via APIs)
- [ ] Campaign scheduling with calendar view, queue management, timezone handling, blackout dates
- [ ] Automated post scheduling and timezone-aware cadence
- [ ] Provider comparison mode (same prompt → multiple providers → side-by-side output)
- [ ] Human feedback panel on clips (opening strength, pacing, spoiler risk, platform fit, CTA effectiveness)
- [ ] A/B testing for hooks and CTAs
- [ ] OMDb enhanced: TMDB API, Letterboxd monitoring
- [ ] Google Analytics / equivalent measurement stack integration
- [ ] PDF summary export for executives
- [ ] CSV analytics export
- [ ] Email/press workflow module
- [ ] OAE site page generation (AI SEO pages by title/collection/territory)
- [ ] Paid ad campaign management
- [ ] AI trailer cut suggestions
- [ ] Region-specific landing pages
- [ ] Fan audience capture tools

---

## Out of Scope

- Full video editing suite
- Enterprise CRM
- Ad buying platform replacement
- Public fan community platform
- Rights management system beyond light metadata
- Automated publishing in v1 (manual export only)

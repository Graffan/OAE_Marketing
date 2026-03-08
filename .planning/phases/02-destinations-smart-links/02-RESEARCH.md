# Phase 2 Research: Destinations & Smart Links

## Schema Analysis (from shared/schema.ts)

### `regional_destinations` table (already defined)
- `id`, `titleId` (FK → titles, cascade delete)
- `countryCode` text NOT NULL — ISO 3166-1 alpha-2 (US, GB, CA, AU, etc.)
- `regionName` text — optional display name (e.g. "United States")
- `platformName` text NOT NULL — e.g. "Apple TV", "Amazon Prime Video"
- `platformType` text — "svod", "avod", "tvod", "free"
- `destinationUrl` text NOT NULL — the actual watch link
- `ctaLabel` text — e.g. "Watch Now", "Stream Free"
- `language` text — ISO 639-1 (en, fr, de)
- `startDate` date, `endDate` date — deal window
- `status` text NOT NULL default "active"
- `campaignPriority` integer default 0
- `trackingParametersTemplate` text — UTM template string
- Indexes on titleId, countryCode

### `smart_links` table (already defined)
- `id`, `slug` text UNIQUE NOT NULL
- `titleId` FK → titles (set null on delete)
- `defaultUrl` text NOT NULL — fallback when no geo match
- `trackingParamsTemplate` text — e.g. "utm_source=oae&utm_medium=smart_link&utm_campaign={slug}"
- `isActive` boolean default true
- `createdById` FK → users

### `analytics_events` table (already defined)
- Has `smartLinkId`, `region`, `platform`, `metadata` json — records smart link hits

## Technical Decisions

### 1. IP Geolocation
**Chosen: ip-api.com (free, no API key)**
- URL: `http://ip-api.com/json/{ip}?fields=countryCode,country`
- Free tier: 45 req/min, no key required
- Returns: `{ "countryCode": "US", "country": "United States" }`
- Get real IP: check `x-forwarded-for` header first, then `req.ip`
- Fallback: if IP lookup fails or returns private IP (localhost dev), default to "US"
- In dev: allow `?country=XX` override on redirect endpoint

### 2. Smart Link Slug Strategy
- **Format:** 8-char nanoid (URL-safe, no install needed — use `Math.random` + base36)
- Or use title slug + random suffix: `poor-agnes-x7k2`
- Store in `slug` column (unique index already defined)
- Generation function: `generateSlug()` → check uniqueness → retry if collision
- Public redirect URL: `GET /l/:slug` (short path, easy to type)
- Note: `watch.otheranimal.app/{slug}` is the production domain; in dev use `/l/:slug` locally

### 3. Link State Logic (computed, not stored)
Status is computed from `startDate` / `endDate` at query time:
```
active        = (startDate is null OR startDate <= today) AND (endDate is null OR endDate >= today)
expiring_soon = active AND endDate is not null AND endDate <= today + 30 days
expired       = endDate is not null AND endDate < today
```
The stored `status` column serves as an override (manual deactivation). Computed state is returned as `computedStatus` in API responses.

### 4. Redirect Mechanics
`GET /l/:slug` — public, no auth required:
1. Lookup smart link by slug (404 if not found or isActive=false)
2. Extract IP from `x-forwarded-for` or `req.ip`
3. Call ip-api.com to get countryCode (with 5s timeout)
4. Query regional_destinations WHERE titleId = link.titleId AND countryCode = resolved country, ORDER BY campaignPriority DESC, status = 'active', deal window valid
5. If match found: build URL = destinationUrl + tracking params; if no match: use link.defaultUrl
6. Record analytics_event (eventType = "smart_link_click", smartLinkId, region, metadata: {countryCode, platform})
7. Return 302 redirect

### 5. Tracking Params
Template: `utm_source=oaemarketing&utm_medium=smart_link&utm_campaign={slug}`
- Replace `{slug}` with actual slug at redirect time
- Append as query string to destination URL (handle existing `?` vs `&`)
- Also supports per-destination `trackingParametersTemplate` override

### 6. Smart Link Tester
`POST /api/smart-links/:slug/preview` with body `{ countryCode: "GB" }`:
- Same resolution logic as redirect but returns JSON instead of redirecting
- Response: `{ resolvedUrl, countryCode, destination, isDefault, trackingParams }`
- Used by tester UI: user picks country → sees resolved URL preview

### 7. Dashboard Alerts
- Fetch all destinations with endDate within 30 days (expiring_soon)
- Fetch all titles with no active destinations (missing coverage)
- Shown as alert banners on dashboard or dedicated alerts panel on DestinationsPage

## UI Plan

### Pages & Components

**DestinationsPage** (`/destinations`)
- Header with title filter select, "Add Destination" button
- Table: Country flag + code, Region, Platform, Platform Type, Status badge (active/expiring_soon/expired), Deal window dates, Priority, Actions
- computedStatus badge: green=active, amber=expiring_soon (with countdown), red=expired
- Create/Edit via DestinationDialog
- Delete with confirm

**DestinationDialog**
- Fields: titleId (select), countryCode (text, ISO-2), regionName, platformName, platformType (select: svod/avod/tvod/free), destinationUrl, ctaLabel, language, startDate, endDate, campaignPriority, trackingParametersTemplate, status (active/inactive)

**SmartLinksPage** (`/smart-links` or `/destinations` with a "Smart Links" tab)
- Table: slug, title, defaultUrl, isActive, created date, Actions (copy link, test, edit, delete)
- "New Smart Link" button
- SmartLinkDialog: titleId, slug (auto-generated or manual), defaultUrl, trackingParamsTemplate, isActive

**SmartLinkTester** (panel within SmartLinksPage)
- Country select (dropdown with full country list or free text ISO-2)
- "Preview Resolution" → shows: resolved URL, matched destination details, tracking params applied
- "Copy URL" button

**ExpiryAlerts** (component)
- Shown on DestinationsPage header area
- Counts: X destinations expiring in 30 days, Y titles with no active destination
- Click-through filters to the relevant rows

### Navigation
- Add "Destinations" to sidebar (already placeholder in App.tsx)
- Add "Smart Links" as a tab within Destinations or separate nav item

## Wave Breakdown

**Wave 1 (sequential — both touch routes.ts/storage.ts):**
- Plan 01: Regional destinations backend (storage + routes) + DestinationsPage + DestinationDialog + useDestinations hook
- Run alone (avoids conflict with Plan 02 on same files)

**Wave 2 (after Wave 1):**
- Plan 02: Smart links backend (storage + routes + redirect endpoint + tester API) + SmartLinksPage + SmartLinkDialog + SmartLinkTester + useSmartLinks hook + analytics event recording

**Wave 3 (after Wave 2):**
- Plan 03: ExpiryAlerts component + dashboard integration + sidebar nav wiring + App.tsx route updates

## Validation Architecture

### Manual tests
- `curl -I http://localhost:5003/l/{slug}` → should 302 redirect (uses US fallback in dev)
- `curl -I "http://localhost:5003/l/{slug}?country=GB"` → resolves UK destination if exists
- `POST /api/smart-links/{slug}/preview` with `{ "countryCode": "CA" }` → JSON preview

### Integration tests
- Create destination (CA, Apple TV, active, no end date) → GET active destinations for title → must appear
- Create destination with endDate = yesterday → computedStatus must be "expired"
- Create destination with endDate = today + 15 days → computedStatus must be "expiring_soon"
- Smart link resolution: no geo match → must use defaultUrl

## RESEARCH COMPLETE

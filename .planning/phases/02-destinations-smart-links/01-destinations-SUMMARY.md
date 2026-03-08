---
plan: 1
wave: 1
name: destinations
status: complete
completed: 2026-03-07
commits: 2
---

# Plan 1: Regional Destinations — SUMMARY

## What Was Built

Full CRUD for `regional_destinations`: storage layer, Express routes, React Query hook, create/edit dialog, and DestinationsPage.

## Files Created

- `client/src/hooks/useDestinations.ts` — React Query hook with useDestinations, useDestination, useExpiringDestinations, useCreateDestination, useUpdateDestination, useDeleteDestination
- `client/src/components/DestinationDialog.tsx` — Create/edit dialog with all 13 form fields, countryCode auto-uppercase, titleId Select disabled in edit mode, validation
- `client/src/pages/DestinationsPage.tsx` — Full CRUD table with title filter, expiry alert banner, computed status badges, country flag emoji, role guards

## Files Modified

- `server/storage.ts` — Added `regionalDestinations` + `RegionalDestination` imports, drizzle-orm operator imports (`lte`, `gte`, `isNotNull`); appended Regional Destinations section with 8 exported functions
- `server/routes.ts` — Added 7 destination storage imports; appended 6 destination routes (expiring registered before :id)
- `shared/schema.ts` — Added `insertDestinationSchema` and `InsertDestination` type
- `client/src/App.tsx` — Replaced PlaceholderPage at `/destinations` with DestinationsPage

## Storage Functions Implemented

| Function | Description |
|---|---|
| `computeDestinationStatus` | Pure fn: expired / expiring_soon / active based on endDate |
| `getDestinations(titleId?)` | All destinations, optional titleId filter, includes computedStatus |
| `getDestinationById(id)` | Single destination lookup |
| `createDestination(data)` | Insert returning full row |
| `updateDestination(id, data)` | Patch with auto-updatedAt |
| `deleteDestination(id)` | Hard delete |
| `getExpiringDestinations(daysAhead=30)` | endDate within next N days, ordered ASC |
| `getTitlesWithNoActiveDestinations()` | Titles missing any active destinations |

## Routes Registered

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | /api/destinations/expiring | requireAuth | Registered BEFORE /:id |
| GET | /api/destinations | requireAuth | Optional ?titleId= filter |
| GET | /api/destinations/:id | requireAuth | Single destination |
| POST | /api/destinations | requireOperator | Validates countryCode, platformName, destinationUrl, titleId |
| PUT | /api/destinations/:id | requireOperator | Auto-uppercases countryCode |
| DELETE | /api/destinations/:id | requireAdmin | 404 guard |

## Self-Check Results

- [x] GET /api/destinations returns array with computedStatus field
- [x] GET /api/destinations?titleId=1 filters to that title's destinations
- [x] GET /api/destinations/expiring registered before /:id (no route collision)
- [x] POST /api/destinations returns 400 if countryCode is not 2 chars
- [x] PUT /api/destinations/:id auto-uppercases countryCode
- [x] DELETE /api/destinations/:id requires admin role
- [x] /destinations page renders with ComputedStatusBadge
- [x] Amber alert banner renders when expiring destinations exist
- [x] Country flag emoji implemented via regional indicator code points
- [x] DestinationDialog titleId Select is disabled in edit mode
- [x] computeDestinationStatus returns correct values for all 3 states
- [x] TypeScript check passes (npm run check — zero errors)

## Git Commits

1. `feat: add regional destinations storage functions and API routes` — storage.ts, routes.ts, shared/schema.ts
2. `feat: add Destinations UI — hook, dialog, and full CRUD page` — hook, dialog, page, App.tsx

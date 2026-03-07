---
plan: 01
name: scaffold
wave: 1
depends_on: []
files_modified:
  - package.json
  - tsconfig.json
  - vite.config.ts
  - drizzle.config.ts
  - .env.example
  - server/db.ts
  - server/index.ts
  - server/vite.ts
  - server/seed.ts
  - shared/schema.ts
  - client/index.html
  - client/src/main.tsx
  - client/src/index.css
  - client/src/lib/queryClient.ts
  - client/src/lib/utils.ts
autonomous: true
---

# Plan 01: Project Scaffold + DB Schema

## Overview

Stand up the full monorepo structure: package.json, TypeScript config, Vite config, Drizzle config, Express bootstrap, all 11 DB tables (9 domain tables + smart_links + regional_destinations), seed script, and React entry point. No auth, no routes beyond a health check. Goal: `npm run dev` starts clean on port 5003, `GET /api/health` returns 200, `GET /api/auth/me` returns 401, `npm run check` passes.

---

<task id="1-01-01" name="Create package.json">
  <description>Create the root package.json with all dependencies for the full monorepo. Use type: "module" for ESM. All scripts match VFXTracker pattern.</description>
  <files>package.json</files>
  <details>
    {
      "name": "oae-marketing",
      "version": "1.0.0",
      "type": "module",
      "scripts": {
        "dev": "NODE_ENV=development tsx --env-file=.env server/index.ts",
        "build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
        "start": "NODE_ENV=production node dist/index.js",
        "check": "tsc --noEmit",
        "db:push": "drizzle-kit push --config=drizzle.config.ts",
        "db:seed": "tsx --env-file=.env server/seed.ts"
      },
      "dependencies": {
        "@neondatabase/serverless": "^0.9.0",
        "axios": "^1.7.2",
        "bcrypt": "^5.1.1",
        "connect-pg-simple": "^9.0.1",
        "cors": "^2.8.5",
        "dotenv": "^16.4.5",
        "drizzle-orm": "^0.30.10",
        "dropbox": "^10.34.0",
        "express": "^4.19.2",
        "express-rate-limit": "^7.3.1",
        "express-session": "^1.18.0",
        "helmet": "^7.1.0",
        "passport": "^0.7.0",
        "passport-local": "^1.0.0",
        "pg": "^8.11.5",
        "zod": "^3.23.8"
      },
      "devDependencies": {
        "@types/bcrypt": "^5.0.2",
        "@types/connect-pg-simple": "^7.0.3",
        "@types/cors": "^2.8.17",
        "@types/express": "^4.17.21",
        "@types/express-session": "^1.18.0",
        "@types/node": "^20.14.2",
        "@types/passport": "^1.0.16",
        "@types/passport-local": "^1.0.38",
        "@types/pg": "^8.11.6",
        "@vitejs/plugin-react": "^4.3.1",
        "autoprefixer": "^10.4.19",
        "drizzle-kit": "^0.21.4",
        "drizzle-zod": "^0.5.1",
        "esbuild": "^0.21.5",
        "postcss": "^8.4.38",
        "tailwindcss": "^3.4.4",
        "tsx": "^4.15.6",
        "typescript": "^5.4.5",
        "vite": "^5.3.1"
      },
      "optionalDependencies": {
        "@types/react": "^18.3.3",
        "@types/react-dom": "^18.3.0",
        "class-variance-authority": "^0.7.0",
        "clsx": "^2.1.1",
        "cmdk": "^1.0.0",
        "lucide-react": "^0.395.0",
        "next-themes": "^0.3.0",
        "react": "^18.3.1",
        "react-dom": "^18.3.1",
        "@tanstack/react-query": "^5.45.1",
        "tailwind-merge": "^2.3.0",
        "tailwindcss-animate": "^1.0.7",
        "wouter": "^3.3.1",
        "@radix-ui/react-dialog": "^1.1.1",
        "@radix-ui/react-dropdown-menu": "^2.1.1",
        "@radix-ui/react-label": "^2.1.0",
        "@radix-ui/react-select": "^2.1.1",
        "@radix-ui/react-slot": "^1.1.0",
        "@radix-ui/react-tabs": "^1.1.0",
        "@radix-ui/react-toast": "^1.2.1",
        "@radix-ui/react-tooltip": "^1.1.2",
        "@radix-ui/react-checkbox": "^1.1.1",
        "@radix-ui/react-separator": "^1.1.0",
        "@radix-ui/react-switch": "^1.1.0",
        "@radix-ui/react-badge": "*"
      }
    }

    Run `npm install` after creating this file.
  </details>
  <automated>npm install</automated>
  <verify>node -e "require('./package.json')" exits 0; node_modules/ exists</verify>
</task>

<task id="1-01-02" name="Create tsconfig.json">
  <description>TypeScript config covering server, client/src, and shared directories with path aliases @/ and @shared/.</description>
  <files>tsconfig.json</files>
  <details>
    {
      "compilerOptions": {
        "target": "ES2022",
        "module": "ESNext",
        "moduleResolution": "bundler",
        "lib": ["ES2022", "DOM", "DOM.Iterable"],
        "jsx": "react-jsx",
        "strict": true,
        "esModuleInterop": true,
        "skipLibCheck": true,
        "resolveJsonModule": true,
        "allowImportingTsExtensions": true,
        "noEmit": true,
        "outDir": "dist",
        "baseUrl": ".",
        "paths": {
          "@/*": ["client/src/*"],
          "@shared/*": ["shared/*"]
        }
      },
      "include": ["client/src", "shared", "server"],
      "exclude": ["node_modules", "dist"]
    }
  </details>
  <automated>none</automated>
  <verify>npm run check passes (with stub files in place)</verify>
</task>

<task id="1-01-03" name="Create vite.config.ts">
  <description>Vite config with React plugin, path aliases @/ → client/src and @shared/ → shared, dev server proxy to port 5003.</description>
  <files>vite.config.ts</files>
  <details>
    import { defineConfig } from "vite";
    import react from "@vitejs/plugin-react";
    import path from "path";
    import { fileURLToPath } from "url";

    const __dirname = path.dirname(fileURLToPath(import.meta.url));

    export default defineConfig({
      plugins: [react()],
      resolve: {
        alias: {
          "@": path.resolve(__dirname, "client/src"),
          "@shared": path.resolve(__dirname, "shared"),
        },
      },
      root: path.resolve(__dirname, "client"),
      build: {
        outDir: path.resolve(__dirname, "dist/public"),
        emptyOutDir: true,
      },
      server: {
        proxy: {
          "/api": {
            target: "http://localhost:5003",
            changeOrigin: true,
          },
        },
      },
    });
  </details>
  <automated>none</automated>
  <verify>vite config parses without error</verify>
</task>

<task id="1-01-04" name="Create drizzle.config.ts">
  <description>Drizzle Kit config pointing at shared/schema.ts, PostgreSQL dialect, with tablesFilter to exclude the session table from migrations.</description>
  <files>drizzle.config.ts</files>
  <details>
    import type { Config } from "drizzle-kit";
    import { config } from "dotenv";
    config({ path: ".env" });

    export default {
      schema: "./shared/schema.ts",
      out: "./drizzle",
      dialect: "postgresql",
      dbCredentials: {
        url: process.env.DATABASE_URL!,
      },
      tablesFilter: ["!session"],
    } satisfies Config;
  </details>
  <automated>none</automated>
  <verify>drizzle-kit push --config=drizzle.config.ts runs without parse error</verify>
</task>

<task id="1-01-05" name="Create .env.example">
  <description>Environment variable template file listing all required variables with placeholder values.</description>
  <files>.env.example</files>
  <details>
    DATABASE_URL=postgresql://admin:oaeadmin2024@localhost:5432/oae_marketing
    SESSION_SECRET=replaceme_openssl_rand_hex_32
    SESSION_COOKIE_SECURE=false
    SESSION_COOKIE_SAMESITE=lax
    TRUST_PROXY=1
    NODE_ENV=development
    PORT=5003
    OMDB_API_KEY=
    DROPBOX_APP_KEY=
    DROPBOX_APP_SECRET=
    DROPBOX_REFRESH_TOKEN=
  </details>
  <automated>cp .env.example .env (user must set DATABASE_URL and SESSION_SECRET)</automated>
  <verify>File exists at project root</verify>
</task>

<task id="1-01-06" name="Create shared/schema.ts">
  <description>All 11 domain tables plus Zod insert schemas and exported TypeScript types. Tables: users, app_settings, titles, projects, assets, clips, clip_posts, campaigns, smart_links, regional_destinations, analytics_events.</description>
  <files>shared/schema.ts</files>
  <details>
    Import: import { pgTable, serial, text, integer, boolean, timestamp, decimal, date, json, index, unique } from "drizzle-orm/pg-core";
    Import: import { createInsertSchema } from "drizzle-zod";
    Import: import { z } from "zod";

    ROLES constant:
    export const ROLES = ["admin", "marketing_operator", "reviewer", "executive", "freelancer"] as const;
    export type UserRole = (typeof ROLES)[number];

    TABLE: users
    - id: serial("id").primaryKey()
    - username: text("username").notNull().unique()
    - email: text("email").notNull().unique()
    - password: text("password").notNull()
    - firstName: text("first_name")
    - lastName: text("last_name")
    - role: text("role").notNull().default("marketing_operator") — one of ROLES
    - isActive: boolean("is_active").notNull().default(true)
    - lastLoginAt: timestamp("last_login_at")
    - createdAt: timestamp("created_at").defaultNow()
    - updatedAt: timestamp("updated_at").defaultNow()
    Index: index on username, index on email

    TABLE: app_settings (singleton id=1)
    - id: serial("id").primaryKey()
    - companyName: text("company_name").notNull().default("Other Animal Entertainment")
    - appTitle: text("app_title").notNull().default("OAE Marketing")
    - logoUrl: text("logo_url")
    - accentColor: text("accent_color").notNull().default("#6366f1")
    - omdbApiKey: text("omdb_api_key")
    - claudeApiKey: text("claude_api_key")
    - claudeModel: text("claude_model").default("claude-opus-4-5")
    - openaiApiKey: text("openai_api_key")
    - openaiModel: text("openai_model").default("gpt-4o")
    - deepseekApiKey: text("deepseek_api_key")
    - deepseekModel: text("deepseek_model").default("deepseek-chat")
    - aiPrimaryProvider: text("ai_primary_provider").default("claude")
    - aiFallbackOrder: json("ai_fallback_order").$type<string[]>().default(["openai", "deepseek"])
    - aiDailyTokenCap: integer("ai_daily_token_cap").default(100000)
    - aiPerUserCap: integer("ai_per_user_cap").default(10000)
    - smtpHost: text("smtp_host")
    - smtpPort: integer("smtp_port")
    - smtpUser: text("smtp_user")
    - smtpPassword: text("smtp_password")
    - smtpFromEmail: text("smtp_from_email")
    - smtpFromName: text("smtp_from_name")
    - smtpTls: boolean("smtp_tls").default(true)
    - updatedAt: timestamp("updated_at").defaultNow()

    TABLE: titles
    - id: serial("id").primaryKey()
    - titleName: text("title_name").notNull().unique()
    - status: text("status").notNull().default("active") — "active"|"archived"|"upcoming"
    - releaseYear: integer("release_year")
    - runtimeMinutes: integer("runtime_minutes")
    - genre: text("genre")
    - subgenre: text("subgenre")
    - synopsisShort: text("synopsis_short")
    - synopsisLong: text("synopsis_long")
    - marketingPositioning: text("marketing_positioning")
    - keySellingPoints: text("key_selling_points")
    - mood: text("mood")
    - trailerLinks: json("trailer_links").$type<string[]>()
    - awardsFestivals: text("awards_festivals")
    - spoilerGuidelines: text("spoiler_guidelines")
    - approvedBrandVoiceNotes: text("approved_brand_voice_notes")
    - omdbImdbId: text("omdb_imdb_id")
    - omdbPosterUrl: text("omdb_poster_url")
    - omdbImdbRating: text("omdb_imdb_rating")
    - omdbDirector: text("omdb_director")
    - omdbActors: text("omdb_actors")
    - omdbPlot: text("omdb_plot")
    - createdById: integer("created_by_id").references(() => users.id, { onDelete: "set null" })
    - createdAt: timestamp("created_at").defaultNow()
    - updatedAt: timestamp("updated_at").defaultNow()

    TABLE: projects
    - id: serial("id").primaryKey()
    - titleId: integer("title_id").notNull().references(() => titles.id, { onDelete: "cascade" })
    - projectName: text("project_name").notNull()
    - status: text("status").notNull().default("active") — "active"|"paused"|"archived"
    - dropboxAccountId: text("dropbox_account_id")
    - dropboxRootFolderPath: text("dropbox_root_folder_path")
    - dropboxViralClipsFolderPath: text("dropbox_viral_clips_folder_path")
    - dropboxCursor: text("dropbox_cursor")
    - lastSyncedAt: timestamp("last_synced_at")
    - syncStatus: text("sync_status").notNull().default("idle") — "idle"|"syncing"|"error"
    - syncErrorMessage: text("sync_error_message")
    - folderTrailers: text("folder_trailers")
    - folderPosters: text("folder_posters")
    - folderStills: text("folder_stills")
    - folderSubtitles: text("folder_subtitles")
    - folderPress: text("folder_press")
    - createdById: integer("created_by_id").references(() => users.id, { onDelete: "set null" })
    - createdAt: timestamp("created_at").defaultNow()
    - updatedAt: timestamp("updated_at").defaultNow()
    Index: index on titleId

    TABLE: assets
    - id: serial("id").primaryKey()
    - projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" })
    - titleId: integer("title_id").references(() => titles.id, { onDelete: "set null" })
    - assetType: text("asset_type").notNull() — "trailer"|"poster"|"still"|"subtitle"|"press"|"other"
    - filename: text("filename").notNull()
    - dropboxPath: text("dropbox_path")
    - dropboxFileId: text("dropbox_file_id").unique()
    - fileSizeBytes: integer("file_size_bytes")
    - mimeType: text("mime_type")
    - thumbnailUrl: text("thumbnail_url")
    - previewUrl: text("preview_url")
    - isAvailable: boolean("is_available").notNull().default(true)
    - createdAt: timestamp("created_at").defaultNow()
    - updatedAt: timestamp("updated_at").defaultNow()

    TABLE: clips
    - id: serial("id").primaryKey()
    - projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" })
    - titleId: integer("title_id").references(() => titles.id, { onDelete: "set null" })
    - filename: text("filename").notNull()
    - dropboxPath: text("dropbox_path")
    - dropboxFileId: text("dropbox_file_id").unique()
    - fileSizeBytes: integer("file_size_bytes")
    - mimeType: text("mime_type")
    - durationSeconds: decimal("duration_seconds", { precision: 10, scale: 2 })
    - orientation: text("orientation") — "horizontal"|"vertical"|"square"
    - thumbnailUrl: text("thumbnail_url")
    - previewUrl: text("preview_url")
    - status: text("status").notNull().default("new") — "new"|"awaiting_review"|"approved"|"rejected"|"scheduled"|"posted"|"archived"
    - hookType: text("hook_type")
    - theme: text("theme")
    - characterFocus: text("character_focus")
    - spoilerLevel: text("spoiler_level") — "none"|"mild"|"moderate"|"heavy"
    - intensityLevel: text("intensity_level") — "low"|"medium"|"high"|"extreme"
    - platformFit: json("platform_fit").$type<string[]>()
    - allowedRegions: json("allowed_regions").$type<string[]>()
    - restrictedRegions: json("restricted_regions").$type<string[]>()
    - embargoDate: date("embargo_date")
    - postedCount: integer("posted_count").notNull().default(0)
    - engagementScore: decimal("engagement_score", { precision: 10, scale: 4 })
    - lastPostedAt: timestamp("last_posted_at")
    - approvedById: integer("approved_by_id").references(() => users.id, { onDelete: "set null" })
    - approvedAt: timestamp("approved_at")
    - isAvailable: boolean("is_available").notNull().default(true)
    - distributorNotes: text("distributor_notes")
    - createdAt: timestamp("created_at").defaultNow()
    - updatedAt: timestamp("updated_at").defaultNow()
    Index: index on projectId, index on titleId, index on status

    TABLE: smart_links (minimal schema for Phase 2, referenced by clip_posts and campaigns)
    - id: serial("id").primaryKey()
    - slug: text("slug").notNull().unique()
    - titleId: integer("title_id").references(() => titles.id, { onDelete: "set null" })
    - defaultUrl: text("default_url").notNull()
    - trackingParamsTemplate: text("tracking_params_template")
    - isActive: boolean("is_active").notNull().default(true)
    - createdById: integer("created_by_id").references(() => users.id, { onDelete: "set null" })
    - createdAt: timestamp("created_at").defaultNow()
    - updatedAt: timestamp("updated_at").defaultNow()

    TABLE: campaigns (Phase 4, schema defined now to avoid migration pain)
    - id: serial("id").primaryKey()
    - titleId: integer("title_id").notNull().references(() => titles.id, { onDelete: "cascade" })
    - projectId: integer("project_id").references(() => projects.id, { onDelete: "set null" })
    - campaignName: text("campaign_name").notNull()
    - goal: text("goal") — "awareness"|"engagement"|"trailer"|"watch_now"
    - status: text("status").notNull().default("draft") — "draft"|"ai_generated"|"awaiting_approval"|"approved"|"scheduled"|"active"|"completed"
    - templateType: text("template_type")
    - targetRegions: json("target_regions").$type<string[]>()
    - clipIds: json("clip_ids").$type<number[]>()
    - smartLinkId: integer("smart_link_id").references(() => smartLinks.id, { onDelete: "set null" })
    - briefText: text("brief_text")
    - aiProviderUsed: text("ai_provider_used")
    - aiModelUsed: text("ai_model_used")
    - aiTokensUsed: integer("ai_tokens_used")
    - createdById: integer("created_by_id").references(() => users.id, { onDelete: "set null" })
    - approvedById: integer("approved_by_id").references(() => users.id, { onDelete: "set null" })
    - approvedAt: timestamp("approved_at")
    - createdAt: timestamp("created_at").defaultNow()
    - updatedAt: timestamp("updated_at").defaultNow()

    TABLE: clip_posts (Phase 3 rotation, schema defined now)
    - id: serial("id").primaryKey()
    - clipId: integer("clip_id").notNull().references(() => clips.id, { onDelete: "cascade" })
    - campaignId: integer("campaign_id").references(() => campaigns.id, { onDelete: "set null" })
    - platform: text("platform")
    - region: text("region")
    - postedAt: timestamp("posted_at")
    - postedById: integer("posted_by_id").references(() => users.id, { onDelete: "set null" })
    - captionUsed: text("caption_used")
    - ctaUsed: text("cta_used")
    - smartLinkId: integer("smart_link_id").references(() => smartLinks.id, { onDelete: "set null" })
    - impressions: integer("impressions")
    - plays: integer("plays")
    - completionRate: decimal("completion_rate", { precision: 5, scale: 2 })
    - likes: integer("likes")
    - comments: integer("comments")
    - shares: integer("shares")
    - saves: integer("saves")
    - clickThroughs: integer("click_throughs")
    - engagementScoreAtPost: decimal("engagement_score_at_post", { precision: 10, scale: 4 })
    - notes: text("notes")
    - createdAt: timestamp("created_at").defaultNow()
    Index: index on clipId, index on campaignId

    TABLE: regional_destinations (Phase 2, schema defined now)
    - id: serial("id").primaryKey()
    - titleId: integer("title_id").notNull().references(() => titles.id, { onDelete: "cascade" })
    - countryCode: text("country_code").notNull()
    - regionName: text("region_name")
    - platformName: text("platform_name").notNull()
    - platformType: text("platform_type") — "svod"|"avod"|"tvod"|"theatrical"|"other"
    - destinationUrl: text("destination_url").notNull()
    - ctaLabel: text("cta_label")
    - language: text("language")
    - startDate: date("start_date")
    - endDate: date("end_date")
    - status: text("status").notNull().default("active") — "active"|"expiring_soon"|"expired"|"missing"
    - campaignPriority: integer("campaign_priority").default(0)
    - trackingParametersTemplate: text("tracking_parameters_template")
    - createdAt: timestamp("created_at").defaultNow()
    - updatedAt: timestamp("updated_at").defaultNow()
    Index: index on titleId, index on countryCode

    TABLE: analytics_events (Phase 5, schema defined now)
    - id: serial("id").primaryKey()
    - eventType: text("event_type").notNull() — "clip_view"|"clip_post"|"link_click"|"campaign_start"|"campaign_complete"
    - clipId: integer("clip_id").references(() => clips.id, { onDelete: "set null" })
    - clipPostId: integer("clip_post_id").references(() => clipPosts.id, { onDelete: "set null" })
    - campaignId: integer("campaign_id").references(() => campaigns.id, { onDelete: "set null" })
    - smartLinkId: integer("smart_link_id").references(() => smartLinks.id, { onDelete: "set null" })
    - userId: integer("user_id").references(() => users.id, { onDelete: "set null" })
    - region: text("region")
    - platform: text("platform")
    - metadata: json("metadata").$type<Record<string, unknown>>()
    - createdAt: timestamp("created_at").defaultNow()
    Index: index on eventType, index on clipId, index on campaignId

    INSERT SCHEMAS (using createInsertSchema + .pick + .extend pattern):

    export const insertUserSchema = createInsertSchema(users).pick({
      username: true, email: true, password: true, firstName: true, lastName: true, role: true, isActive: true,
    });

    export const insertTitleSchema = createInsertSchema(titles).pick({
      titleName: true, status: true, releaseYear: true, runtimeMinutes: true, genre: true, subgenre: true,
      synopsisShort: true, synopsisLong: true, marketingPositioning: true, keySellingPoints: true,
      mood: true, trailerLinks: true, awardsFestivals: true, spoilerGuidelines: true,
      approvedBrandVoiceNotes: true, omdbImdbId: true, omdbPosterUrl: true, omdbImdbRating: true,
      omdbDirector: true, omdbActors: true, omdbPlot: true, createdById: true,
    }).extend({
      releaseYear: z.number().nullable().optional(),
      runtimeMinutes: z.number().nullable().optional(),
      trailerLinks: z.array(z.string()).nullable().optional(),
    });

    export const insertProjectSchema = createInsertSchema(projects).pick({
      titleId: true, projectName: true, status: true,
      dropboxRootFolderPath: true, dropboxViralClipsFolderPath: true, createdById: true,
    });

    export const insertClipSchema = createInsertSchema(clips).pick({
      projectId: true, titleId: true, filename: true, dropboxPath: true, dropboxFileId: true,
      fileSizeBytes: true, mimeType: true, durationSeconds: true, orientation: true,
      thumbnailUrl: true, status: true, hookType: true, theme: true, characterFocus: true,
      spoilerLevel: true, intensityLevel: true, platformFit: true,
      allowedRegions: true, restrictedRegions: true, embargoDate: true, distributorNotes: true,
    }).extend({
      durationSeconds: z.string().nullable().optional(),
      platformFit: z.array(z.string()).nullable().optional(),
      allowedRegions: z.array(z.string()).nullable().optional(),
      restrictedRegions: z.array(z.string()).nullable().optional(),
      embargoDate: z.string().nullable().optional(),
    });

    EXPORTED TYPES at bottom:
    export type User = typeof users.$inferSelect;
    export type InsertUser = z.infer<typeof insertUserSchema>;
    export type AppSettings = typeof appSettings.$inferSelect;
    export type Title = typeof titles.$inferSelect;
    export type InsertTitle = z.infer<typeof insertTitleSchema>;
    export type Project = typeof projects.$inferSelect;
    export type InsertProject = z.infer<typeof insertProjectSchema>;
    export type Asset = typeof assets.$inferSelect;
    export type Clip = typeof clips.$inferSelect;
    export type InsertClip = z.infer<typeof insertClipSchema>;
    export type ClipPost = typeof clipPosts.$inferSelect;
    export type Campaign = typeof campaigns.$inferSelect;
    export type SmartLink = typeof smartLinks.$inferSelect;
    export type RegionalDestination = typeof regionalDestinations.$inferSelect;
    export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
  </details>
  <automated>none</automated>
  <verify>npm run check passes; npm run db:push creates all 11 tables without error</verify>
</task>

<task id="1-01-07" name="Create server/db.ts">
  <description>Export pool (pg Pool) and db (Drizzle instance). Pool is reused for connect-pg-simple session store. Use CJS default import pattern for pg.</description>
  <files>server/db.ts</files>
  <details>
    import pkg from "pg";
    const { Pool } = pkg;
    import { drizzle } from "drizzle-orm/node-postgres";
    import * as schema from "@shared/schema.js";

    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is required");
    }

    export const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    export const db = drizzle(pool, { schema });

    Note: The import from "@shared/schema" uses the path alias — this works in dev via tsx, and in build the alias is resolved by esbuild. Use ".js" extension for ESM compatibility.
  </details>
  <automated>none</automated>
  <verify>server/db.ts imports without TypeScript error</verify>
</task>

<task id="1-01-08" name="Create server/vite.ts">
  <description>Vite dev middleware / static serve helper — used by server/index.ts to serve the React app in both dev (HMR) and production (static) modes. Mirrors VFXTracker exactly.</description>
  <files>server/vite.ts</files>
  <details>
    In development: use `createViteServer` from "vite" with `server.middlewareMode: true` and attach HMR websocket to the http.Server. Use `vite.middlewares` as Express middleware.

    In production: use `express.static` to serve from `dist/public`.

    Export two functions:
    1. `setupVite(app: Express, server: http.Server): Promise<void>` — dev mode
    2. `serveStatic(app: Express): void` — production mode

    The function must handle the wildcard fallback — in production, serve `dist/public/index.html` for all non-API routes (so wouter client routing works). Use:
    app.use("*", (_req, res) => res.sendFile(path.resolve("dist/public/index.html")));

    In dev, Vite handles this automatically via its middleware.

    Import `createServer as createViteServer` from "vite".
    Import `type { ViteDevServer }` from "vite".
    Use `fileURLToPath` and `path.dirname` to compute __dirname since type: module.
  </details>
  <automated>none</automated>
  <verify>No TypeScript errors; dev server serves React app at /</verify>
</task>

<task id="1-01-09" name="Create server/index.ts">
  <description>Express app bootstrap: env validation, helmet, rate limiters, JSON middleware, session with connect-pg-simple, request logger, registerRoutes, error handler, Vite/static setup, server.listen on PORT=5003.</description>
  <files>server/index.ts</files>
  <details>
    Bootstrap order (MUST be exact):
    1. Import dotenv and call config() at top
    2. Validate DATABASE_URL and SESSION_SECRET exist; throw if missing
    3. Create Express app
    4. app.set("trust proxy", process.env.TRUST_PROXY === "1" ? 1 : 0)
    5. Helmet with CSP: in dev allow 'unsafe-inline', 'unsafe-eval', ws:; in prod tighten
    6. Rate limiter: express-rate-limit, 100 req / 15 min window, skip in test
    7. app.use(express.json())
    8. app.use(express.urlencoded({ extended: false }))
    9. Session middleware:
       import connectPgSimple from "connect-pg-simple";
       const PgSession = connectPgSimple(session);
       app.use(session({
         store: new PgSession({ pool, createTableIfMissing: true }),
         secret: process.env.SESSION_SECRET!,
         resave: false,
         saveUninitialized: false,
         cookie: {
           httpOnly: true,
           secure: process.env.SESSION_COOKIE_SECURE === "true",
           sameSite: (process.env.SESSION_COOKIE_SAMESITE ?? "lax") as "lax" | "strict" | "none",
           maxAge: 8 * 60 * 60 * 1000, // 8 hours
         },
       }));
    10. Simple request logger: log method + path + status + duration
    11. const server = await registerRoutes(app);
    12. Global error handler: (err, req, res, next) => res.status(500).json({ message: err.message })
    13. const isDev = process.env.NODE_ENV !== "production"
    14. if (isDev) await setupVite(app, server); else serveStatic(app);
    15. const PORT = parseInt(process.env.PORT ?? "5003");
        server.listen(PORT, () => console.log(`OAE Marketing running on port ${PORT}`));

    Import registerRoutes from "./routes.js"
    Import setupVite, serveStatic from "./vite.js"
    Import { pool } from "./db.js"
  </details>
  <automated>none</automated>
  <verify>npm run dev starts without crash; curl http://localhost:5003/api/health returns {"status":"ok"}</verify>
</task>

<task id="1-01-10" name="Create server/seed.ts">
  <description>Idempotent seed script: insert admin user (admin/oaeadmin2024) and app_settings row (id=1). Must be safe to run multiple times without errors or duplicates.</description>
  <files>server/seed.ts</files>
  <details>
    import bcrypt from "bcrypt";
    import { db } from "./db.js";
    import { users, appSettings } from "@shared/schema.js";
    import { eq } from "drizzle-orm";

    async function seed() {
      console.log("Seeding database...");

      // Admin user — idempotent check by username
      const existing = await db.select().from(users).where(eq(users.username, "admin")).limit(1);
      if (existing.length === 0) {
        const hashed = await bcrypt.hash("oaeadmin2024", 12);
        await db.insert(users).values({
          username: "admin",
          email: "admin@otheranimal.app",
          password: hashed,
          firstName: "Admin",
          lastName: "User",
          role: "admin",
          isActive: true,
        });
        console.log("Admin user created");
      } else {
        console.log("Admin user already exists — skipping");
      }

      // App settings singleton — idempotent check by id=1
      const existingSettings = await db.select().from(appSettings).where(eq(appSettings.id, 1)).limit(1);
      if (existingSettings.length === 0) {
        await db.insert(appSettings).values({
          id: 1,
          companyName: "Other Animal Entertainment",
          appTitle: "OAE Marketing",
          accentColor: "#6366f1",
        });
        console.log("App settings created");
      } else {
        console.log("App settings already exist — skipping");
      }

      console.log("Seed complete");
      process.exit(0);
    }

    seed().catch((err) => {
      console.error("Seed failed:", err);
      process.exit(1);
    });
  </details>
  <automated>npm run db:seed</automated>
  <verify>Runs without error on empty DB; runs again without error on populated DB; admin user exists in users table with role="admin"; app_settings row exists with id=1</verify>
</task>

<task id="1-01-11" name="Create client/index.html">
  <description>Vite HTML entry point for the React client.</description>
  <files>client/index.html</files>
  <details>
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>OAE Marketing</title>
      </head>
      <body>
        <div id="root"></div>
        <script type="module" src="/src/main.tsx"></script>
      </body>
    </html>
  </details>
  <automated>none</automated>
  <verify>Vite serves the HTML shell at /</verify>
</task>

<task id="1-01-12" name="Create client/src/main.tsx">
  <description>React root mount: QueryClientProvider, ThemeProvider from next-themes, render App.</description>
  <files>client/src/main.tsx</files>
  <details>
    import React from "react";
    import ReactDOM from "react-dom/client";
    import { QueryClientProvider } from "@tanstack/react-query";
    import { ThemeProvider } from "next-themes";
    import App from "./App.tsx";
    import "./index.css";
    import { queryClient } from "./lib/queryClient.ts";

    ReactDOM.createRoot(document.getElementById("root")!).render(
      <React.StrictMode>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <App />
          </ThemeProvider>
        </QueryClientProvider>
      </React.StrictMode>
    );
  </details>
  <automated>none</automated>
  <verify>Page renders without console errors</verify>
</task>

<task id="1-01-13" name="Create client/src/index.css">
  <description>Tailwind CSS directives, CSS variable definitions for shadcn/ui theme (light + dark), and --accent-color CSS var that can be overridden at runtime via useSettings.</description>
  <files>client/src/index.css</files>
  <details>
    @tailwind base;
    @tailwind components;
    @tailwind utilities;

    @layer base {
      :root {
        --background: 0 0% 100%;
        --foreground: 222.2 84% 4.9%;
        --card: 0 0% 100%;
        --card-foreground: 222.2 84% 4.9%;
        --popover: 0 0% 100%;
        --popover-foreground: 222.2 84% 4.9%;
        --primary: 239 84% 67%;
        --primary-foreground: 0 0% 100%;
        --secondary: 210 40% 96.1%;
        --secondary-foreground: 222.2 47.4% 11.2%;
        --muted: 210 40% 96.1%;
        --muted-foreground: 215.4 16.3% 46.9%;
        --accent: 210 40% 96.1%;
        --accent-foreground: 222.2 47.4% 11.2%;
        --destructive: 0 84.2% 60.2%;
        --destructive-foreground: 210 40% 98%;
        --border: 214.3 31.8% 91.4%;
        --input: 214.3 31.8% 91.4%;
        --ring: 239 84% 67%;
        --radius: 0.5rem;
        --accent-color: #6366f1;
      }

      .dark {
        --background: 222.2 84% 4.9%;
        --foreground: 210 40% 98%;
        --card: 222.2 84% 4.9%;
        --card-foreground: 210 40% 98%;
        --popover: 222.2 84% 4.9%;
        --popover-foreground: 210 40% 98%;
        --primary: 239 84% 67%;
        --primary-foreground: 0 0% 100%;
        --secondary: 217.2 32.6% 17.5%;
        --secondary-foreground: 210 40% 98%;
        --muted: 217.2 32.6% 17.5%;
        --muted-foreground: 215 20.2% 65.1%;
        --accent: 217.2 32.6% 17.5%;
        --accent-foreground: 210 40% 98%;
        --destructive: 0 62.8% 30.6%;
        --destructive-foreground: 210 40% 98%;
        --border: 217.2 32.6% 17.5%;
        --input: 217.2 32.6% 17.5%;
        --ring: 239 84% 67%;
        --accent-color: #6366f1;
      }
    }

    * {
      @apply border-border;
    }

    body {
      @apply bg-background text-foreground;
      font-feature-settings: "rlig" 1, "calt" 1;
    }
  </details>
  <automated>none</automated>
  <verify>Tailwind styles apply; dark mode CSS vars toggle correctly</verify>
</task>

<task id="1-01-14" name="Create client/src/lib/queryClient.ts">
  <description>QueryClient instance, fetchJSON helper, and apiRequest helper used across all data-fetching hooks.</description>
  <files>client/src/lib/queryClient.ts</files>
  <details>
    import { QueryClient } from "@tanstack/react-query";

    export const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 1000 * 60 * 5, // 5 minutes
          retry: 1,
        },
      },
    });

    export async function fetchJSON<T>(url: string): Promise<T> {
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(body || `HTTP ${res.status}`);
      }
      return res.json() as Promise<T>;
    }

    export async function apiRequest(
      method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
      url: string,
      data?: unknown
    ): Promise<Response> {
      const res = await fetch(url, {
        method,
        headers: data ? { "Content-Type": "application/json" } : {},
        body: data ? JSON.stringify(data) : undefined,
        credentials: "include",
      });
      return res;
    }
  </details>
  <automated>none</automated>
  <verify>TypeScript compiles without error</verify>
</task>

<task id="1-01-15" name="Create client/src/lib/utils.ts">
  <description>Utility functions: cn() for Tailwind class merging, formatDate(), formatFileSize().</description>
  <files>client/src/lib/utils.ts</files>
  <details>
    import { clsx, type ClassValue } from "clsx";
    import { twMerge } from "tailwind-merge";

    export function cn(...inputs: ClassValue[]) {
      return twMerge(clsx(inputs));
    }

    export function formatDate(date: string | Date | null | undefined): string {
      if (!date) return "—";
      return new Date(date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }

    export function formatFileSize(bytes: number | null | undefined): string {
      if (!bytes) return "—";
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }

    export function formatDuration(seconds: string | number | null | undefined): string {
      if (!seconds) return "—";
      const s = typeof seconds === "string" ? parseFloat(seconds) : seconds;
      if (isNaN(s)) return "—";
      const mins = Math.floor(s / 60);
      const secs = Math.round(s % 60);
      return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    }
  </details>
  <automated>none</automated>
  <verify>TypeScript compiles without error</verify>
</task>

<task id="1-01-16" name="Create tailwind.config.js and postcss.config.js">
  <description>Tailwind configuration with content paths covering client/src and shadcn/ui animate plugin. PostCSS config with tailwindcss and autoprefixer.</description>
  <files>tailwind.config.js, postcss.config.js</files>
  <details>
    tailwind.config.js:
    /** @type {import('tailwindcss').Config} */
    export default {
      darkMode: "class",
      content: [
        "./client/src/**/*.{ts,tsx}",
        "./client/index.html",
      ],
      theme: {
        extend: {
          colors: {
            border: "hsl(var(--border))",
            input: "hsl(var(--input))",
            ring: "hsl(var(--ring))",
            background: "hsl(var(--background))",
            foreground: "hsl(var(--foreground))",
            primary: {
              DEFAULT: "hsl(var(--primary))",
              foreground: "hsl(var(--primary-foreground))",
            },
            secondary: {
              DEFAULT: "hsl(var(--secondary))",
              foreground: "hsl(var(--secondary-foreground))",
            },
            destructive: {
              DEFAULT: "hsl(var(--destructive))",
              foreground: "hsl(var(--destructive-foreground))",
            },
            muted: {
              DEFAULT: "hsl(var(--muted))",
              foreground: "hsl(var(--muted-foreground))",
            },
            accent: {
              DEFAULT: "hsl(var(--accent))",
              foreground: "hsl(var(--accent-foreground))",
            },
            popover: {
              DEFAULT: "hsl(var(--popover))",
              foreground: "hsl(var(--popover-foreground))",
            },
            card: {
              DEFAULT: "hsl(var(--card))",
              foreground: "hsl(var(--card-foreground))",
            },
          },
          borderRadius: {
            lg: "var(--radius)",
            md: "calc(var(--radius) - 2px)",
            sm: "calc(var(--radius) - 4px)",
          },
        },
      },
      plugins: [require("tailwindcss-animate")],
    };

    postcss.config.js:
    export default {
      plugins: {
        tailwindcss: {},
        autoprefixer: {},
      },
    };
  </details>
  <automated>none</automated>
  <verify>Tailwind classes resolve; build doesn't warn about missing content paths</verify>
</task>

<task id="1-01-17" name="Create stub server/routes.ts and server/storage.ts">
  <description>Minimal stub files so the project compiles and the server starts. routes.ts exports registerRoutes that sets up passport, a health check, and returns an http.Server. storage.ts is empty with just type exports. These will be filled in by plans 02–06.</description>
  <files>server/routes.ts, server/storage.ts</files>
  <details>
    server/routes.ts:
    import type { Express } from "express";
    import http from "http";
    import passport from "passport";

    export async function registerRoutes(app: Express): Promise<http.Server> {
      // Health check
      app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

      // Unauthenticated me — will be replaced by plan 02
      app.get("/api/auth/me", (req, res) => {
        if (req.isAuthenticated()) {
          res.json(req.user);
        } else {
          res.status(401).json({ message: "Not authenticated" });
        }
      });

      const server = http.createServer(app);
      return server;
    }

    server/storage.ts:
    // Storage functions — implemented by plans 02–06
    export {};
  </details>
  <automated>none</automated>
  <verify>npm run dev starts; GET /api/health returns {"status":"ok"}; GET /api/auth/me returns 401</verify>
</task>

<task id="1-01-18" name="Create stub client/src/App.tsx">
  <description>Minimal App.tsx stub that renders a placeholder div. Will be replaced by plan 02. Required so main.tsx compiles.</description>
  <files>client/src/App.tsx</files>
  <details>
    export default function App() {
      return (
        <div className="flex h-screen items-center justify-center bg-background text-foreground">
          <p className="text-muted-foreground">OAE Marketing — Loading...</p>
        </div>
      );
    }
  </details>
  <automated>none</automated>
  <verify>Page renders without React errors</verify>
</task>

---

## must_haves
- [ ] `npm install` completes without errors
- [ ] `npm run check` passes TypeScript check (with all stub files in place)
- [ ] `npm run db:push` creates all 11 tables in the oae_marketing database without error
- [ ] `npm run db:seed` creates admin user and app_settings row; idempotent on second run
- [ ] `npm run dev` starts server on port 5003 without crash
- [ ] `GET /api/health` returns `{"status":"ok"}`
- [ ] `GET /api/auth/me` returns 401 JSON (not a server error)
- [ ] React app renders at `/` (even if just the stub placeholder)
- [ ] `psql -d oae_marketing -c "\dt"` shows all 11 tables: users, app_settings, titles, projects, assets, clips, clip_posts, campaigns, smart_links, regional_destinations, analytics_events

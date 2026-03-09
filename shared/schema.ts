import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  decimal,
  date,
  json,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ─── Roles ───────────────────────────────────────────────────────────────────

export const ROLES = [
  "admin",
  "marketing_operator",
  "reviewer",
  "executive",
  "freelancer",
] as const;
export type UserRole = (typeof ROLES)[number];

// ─── users ────────────────────────────────────────────────────────────────────

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    username: text("username").notNull().unique(),
    email: text("email").notNull().unique(),
    password: text("password").notNull(),
    firstName: text("first_name"),
    lastName: text("last_name"),
    role: text("role").notNull().default("marketing_operator"),
    isActive: boolean("is_active").notNull().default(true),
    lastLoginAt: timestamp("last_login_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    usernameIdx: index("users_username_idx").on(table.username),
    emailIdx: index("users_email_idx").on(table.email),
  })
);

// ─── app_settings ─────────────────────────────────────────────────────────────

export const appSettings = pgTable("app_settings", {
  id: serial("id").primaryKey(),
  companyName: text("company_name").notNull().default("Other Animal Entertainment"),
  appTitle: text("app_title").notNull().default("OAE Marketing"),
  logoUrl: text("logo_url"),
  accentColor: text("accent_color").notNull().default("#6366f1"),
  omdbApiKey: text("omdb_api_key"),
  claudeApiKey: text("claude_api_key"),
  claudeModel: text("claude_model").default("claude-opus-4-5"),
  openaiApiKey: text("openai_api_key"),
  openaiModel: text("openai_model").default("gpt-4o"),
  deepseekApiKey: text("deepseek_api_key"),
  deepseekModel: text("deepseek_model").default("deepseek-chat"),
  aiPrimaryProvider: text("ai_primary_provider").default("claude"),
  aiFallbackOrder: json("ai_fallback_order").$type<string[]>().default(["openai", "deepseek"]),
  aiDailyTokenCap: integer("ai_daily_token_cap").default(100000),
  aiPerUserCap: integer("ai_per_user_cap").default(10000),
  smtpHost: text("smtp_host"),
  smtpPort: integer("smtp_port"),
  smtpUser: text("smtp_user"),
  smtpPassword: text("smtp_password"),
  smtpFromEmail: text("smtp_from_email"),
  smtpFromName: text("smtp_from_name"),
  smtpTls: boolean("smtp_tls").default(true),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── titles ───────────────────────────────────────────────────────────────────

export const titles = pgTable("titles", {
  id: serial("id").primaryKey(),
  titleName: text("title_name").notNull().unique(),
  status: text("status").notNull().default("active"),
  releaseYear: integer("release_year"),
  runtimeMinutes: integer("runtime_minutes"),
  genre: text("genre"),
  subgenre: text("subgenre"),
  synopsisShort: text("synopsis_short"),
  synopsisLong: text("synopsis_long"),
  marketingPositioning: text("marketing_positioning"),
  keySellingPoints: text("key_selling_points"),
  mood: text("mood"),
  trailerLinks: json("trailer_links").$type<string[]>(),
  awardsFestivals: text("awards_festivals"),
  spoilerGuidelines: text("spoiler_guidelines"),
  approvedBrandVoiceNotes: text("approved_brand_voice_notes"),
  omdbImdbId: text("omdb_imdb_id"),
  omdbPosterUrl: text("omdb_poster_url"),
  omdbImdbRating: text("omdb_imdb_rating"),
  omdbDirector: text("omdb_director"),
  omdbActors: text("omdb_actors"),
  omdbPlot: text("omdb_plot"),
  createdById: integer("created_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── projects ─────────────────────────────────────────────────────────────────

export const projects = pgTable(
  "projects",
  {
    id: serial("id").primaryKey(),
    titleId: integer("title_id")
      .notNull()
      .references(() => titles.id, { onDelete: "cascade" }),
    projectName: text("project_name").notNull(),
    status: text("status").notNull().default("active"),
    dropboxAccountId: text("dropbox_account_id"),
    dropboxRootFolderPath: text("dropbox_root_folder_path"),
    dropboxViralClipsFolderPath: text("dropbox_viral_clips_folder_path"),
    dropboxCursor: text("dropbox_cursor"),
    lastSyncedAt: timestamp("last_synced_at"),
    syncStatus: text("sync_status").notNull().default("idle"),
    syncErrorMessage: text("sync_error_message"),
    folderTrailers: text("folder_trailers"),
    folderPosters: text("folder_posters"),
    folderStills: text("folder_stills"),
    folderSubtitles: text("folder_subtitles"),
    folderPress: text("folder_press"),
    createdById: integer("created_by_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    titleIdIdx: index("projects_title_id_idx").on(table.titleId),
  })
);

// ─── assets ───────────────────────────────────────────────────────────────────

export const assets = pgTable("assets", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  titleId: integer("title_id").references(() => titles.id, { onDelete: "set null" }),
  assetType: text("asset_type").notNull(),
  filename: text("filename").notNull(),
  dropboxPath: text("dropbox_path"),
  dropboxFileId: text("dropbox_file_id").unique(),
  fileSizeBytes: integer("file_size_bytes"),
  mimeType: text("mime_type"),
  thumbnailUrl: text("thumbnail_url"),
  previewUrl: text("preview_url"),
  isAvailable: boolean("is_available").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── clips ────────────────────────────────────────────────────────────────────

export const clips = pgTable(
  "clips",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    titleId: integer("title_id").references(() => titles.id, { onDelete: "set null" }),
    filename: text("filename").notNull(),
    dropboxPath: text("dropbox_path"),
    dropboxFileId: text("dropbox_file_id").unique(),
    fileSizeBytes: integer("file_size_bytes"),
    mimeType: text("mime_type"),
    durationSeconds: decimal("duration_seconds", { precision: 10, scale: 2 }),
    orientation: text("orientation"),
    thumbnailUrl: text("thumbnail_url"),
    previewUrl: text("preview_url"),
    status: text("status").notNull().default("new"),
    hookType: text("hook_type"),
    theme: text("theme"),
    characterFocus: text("character_focus"),
    spoilerLevel: text("spoiler_level"),
    intensityLevel: text("intensity_level"),
    platformFit: json("platform_fit").$type<string[]>(),
    allowedRegions: json("allowed_regions").$type<string[]>(),
    restrictedRegions: json("restricted_regions").$type<string[]>(),
    embargoDate: date("embargo_date"),
    postedCount: integer("posted_count").notNull().default(0),
    engagementScore: decimal("engagement_score", { precision: 10, scale: 4 }),
    lastPostedAt: timestamp("last_posted_at"),
    approvedById: integer("approved_by_id").references(() => users.id, { onDelete: "set null" }),
    approvedAt: timestamp("approved_at"),
    isAvailable: boolean("is_available").notNull().default(true),
    distributorNotes: text("distributor_notes"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    projectIdIdx: index("clips_project_id_idx").on(table.projectId),
    titleIdIdx: index("clips_title_id_idx").on(table.titleId),
    statusIdx: index("clips_status_idx").on(table.status),
  })
);

// ─── smart_links ──────────────────────────────────────────────────────────────

export const smartLinks = pgTable("smart_links", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  titleId: integer("title_id").references(() => titles.id, { onDelete: "set null" }),
  defaultUrl: text("default_url").notNull(),
  trackingParamsTemplate: text("tracking_params_template"),
  isActive: boolean("is_active").notNull().default(true),
  createdById: integer("created_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── campaigns ────────────────────────────────────────────────────────────────

export const campaigns = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  titleId: integer("title_id")
    .notNull()
    .references(() => titles.id, { onDelete: "cascade" }),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "set null" }),
  campaignName: text("campaign_name").notNull(),
  goal: text("goal"),
  status: text("status").notNull().default("draft"),
  templateType: text("template_type"),
  targetRegions: json("target_regions").$type<string[]>(),
  clipIds: json("clip_ids").$type<number[]>(),
  smartLinkId: integer("smart_link_id").references(() => smartLinks.id, { onDelete: "set null" }),
  briefText: text("brief_text"),
  aiProviderUsed: text("ai_provider_used"),
  aiModelUsed: text("ai_model_used"),
  aiTokensUsed: integer("ai_tokens_used"),
  createdById: integer("created_by_id").references(() => users.id, { onDelete: "set null" }),
  approvedById: integer("approved_by_id").references(() => users.id, { onDelete: "set null" }),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── clip_posts ───────────────────────────────────────────────────────────────

export const clipPosts = pgTable(
  "clip_posts",
  {
    id: serial("id").primaryKey(),
    clipId: integer("clip_id")
      .notNull()
      .references(() => clips.id, { onDelete: "cascade" }),
    campaignId: integer("campaign_id").references(() => campaigns.id, { onDelete: "set null" }),
    platform: text("platform"),
    region: text("region"),
    postedAt: timestamp("posted_at"),
    postedById: integer("posted_by_id").references(() => users.id, { onDelete: "set null" }),
    captionUsed: text("caption_used"),
    ctaUsed: text("cta_used"),
    smartLinkId: integer("smart_link_id").references(() => smartLinks.id, { onDelete: "set null" }),
    impressions: integer("impressions"),
    plays: integer("plays"),
    completionRate: decimal("completion_rate", { precision: 5, scale: 2 }),
    likes: integer("likes"),
    comments: integer("comments"),
    shares: integer("shares"),
    saves: integer("saves"),
    clickThroughs: integer("click_throughs"),
    engagementScoreAtPost: decimal("engagement_score_at_post", { precision: 10, scale: 4 }),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    clipIdIdx: index("clip_posts_clip_id_idx").on(table.clipId),
    campaignIdIdx: index("clip_posts_campaign_id_idx").on(table.campaignId),
  })
);

// ─── regional_destinations ────────────────────────────────────────────────────

export const regionalDestinations = pgTable(
  "regional_destinations",
  {
    id: serial("id").primaryKey(),
    titleId: integer("title_id")
      .notNull()
      .references(() => titles.id, { onDelete: "cascade" }),
    countryCode: text("country_code").notNull(),
    regionName: text("region_name"),
    platformName: text("platform_name").notNull(),
    platformType: text("platform_type"),
    destinationUrl: text("destination_url").notNull(),
    ctaLabel: text("cta_label"),
    language: text("language"),
    startDate: date("start_date"),
    endDate: date("end_date"),
    status: text("status").notNull().default("active"),
    campaignPriority: integer("campaign_priority").default(0),
    trackingParametersTemplate: text("tracking_parameters_template"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    titleIdIdx: index("regional_destinations_title_id_idx").on(table.titleId),
    countryCodeIdx: index("regional_destinations_country_code_idx").on(table.countryCode),
  })
);

// ─── analytics_events ─────────────────────────────────────────────────────────

export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: serial("id").primaryKey(),
    eventType: text("event_type").notNull(),
    clipId: integer("clip_id").references(() => clips.id, { onDelete: "set null" }),
    clipPostId: integer("clip_post_id").references(() => clipPosts.id, { onDelete: "set null" }),
    campaignId: integer("campaign_id").references(() => campaigns.id, { onDelete: "set null" }),
    smartLinkId: integer("smart_link_id").references(() => smartLinks.id, { onDelete: "set null" }),
    userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
    region: text("region"),
    platform: text("platform"),
    metadata: json("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    eventTypeIdx: index("analytics_events_event_type_idx").on(table.eventType),
    clipIdIdx: index("analytics_events_clip_id_idx").on(table.clipId),
    campaignIdIdx: index("analytics_events_campaign_id_idx").on(table.campaignId),
  })
);

// ─── ai_logs ──────────────────────────────────────────────────────────────────

export const aiLogs = pgTable(
  "ai_logs",
  {
    id: serial("id").primaryKey(),
    provider: text("provider").notNull(),
    model: text("model"),
    task: text("task").notNull(),
    tokensIn: integer("tokens_in").notNull().default(0),
    tokensOut: integer("tokens_out").notNull().default(0),
    latencyMs: integer("latency_ms"),
    status: text("status").notNull(),
    userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
    campaignId: integer("campaign_id").references(() => campaigns.id, { onDelete: "set null" }),
    promptText: text("prompt_text"),
    responseText: text("response_text"),
    promptTemplateVersion: integer("prompt_template_version"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    aiLogsCampaignIdIdx: index("ai_logs_campaign_id_idx").on(table.campaignId),
    aiLogsUserIdIdx: index("ai_logs_user_id_idx").on(table.userId),
    aiLogsCreatedAtIdx: index("ai_logs_created_at_idx").on(table.createdAt),
  })
);

export type AiLog = typeof aiLogs.$inferSelect;

// ─── campaign_contents ────────────────────────────────────────────────────────

export const campaignContents = pgTable(
  "campaign_contents",
  {
    id: serial("id").primaryKey(),
    campaignId: integer("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    contentType: text("content_type").notNull(),
    platform: text("platform").notNull().default("generic"),
    region: text("region").notNull().default("ALL"),
    version: integer("version").notNull().default(1),
    body: text("body").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    source: text("source").notNull().default("ai"),
    aiLogId: integer("ai_log_id").references(() => aiLogs.id, { onDelete: "set null" }),
    editedById: integer("edited_by_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    campaignContentsCampaignIdIdx: index("campaign_contents_campaign_id_idx").on(table.campaignId),
    campaignContentsIsActiveIdx: index("campaign_contents_is_active_idx").on(table.isActive),
  })
);

export const insertCampaignContentSchema = createInsertSchema(campaignContents).pick({
  campaignId: true,
  contentType: true,
  platform: true,
  region: true,
  version: true,
  body: true,
  isActive: true,
  source: true,
  aiLogId: true,
  editedById: true,
});

export type CampaignContent = typeof campaignContents.$inferSelect;
export type InsertCampaignContent = z.infer<typeof insertCampaignContentSchema>;

// ─── Insert Schemas ───────────────────────────────────────────────────────────

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  password: true,
  firstName: true,
  lastName: true,
  role: true,
  isActive: true,
});

export const insertTitleSchema = createInsertSchema(titles)
  .pick({
    titleName: true,
    status: true,
    releaseYear: true,
    runtimeMinutes: true,
    genre: true,
    subgenre: true,
    synopsisShort: true,
    synopsisLong: true,
    marketingPositioning: true,
    keySellingPoints: true,
    mood: true,
    trailerLinks: true,
    awardsFestivals: true,
    spoilerGuidelines: true,
    approvedBrandVoiceNotes: true,
    omdbImdbId: true,
    omdbPosterUrl: true,
    omdbImdbRating: true,
    omdbDirector: true,
    omdbActors: true,
    omdbPlot: true,
    createdById: true,
  })
  .extend({
    releaseYear: z.number().nullable().optional(),
    runtimeMinutes: z.number().nullable().optional(),
    trailerLinks: z.array(z.string()).nullable().optional(),
  });

export const insertProjectSchema = createInsertSchema(projects).pick({
  titleId: true,
  projectName: true,
  status: true,
  dropboxRootFolderPath: true,
  dropboxViralClipsFolderPath: true,
  createdById: true,
});

export const insertClipSchema = createInsertSchema(clips)
  .pick({
    projectId: true,
    titleId: true,
    filename: true,
    dropboxPath: true,
    dropboxFileId: true,
    fileSizeBytes: true,
    mimeType: true,
    durationSeconds: true,
    orientation: true,
    thumbnailUrl: true,
    status: true,
    hookType: true,
    theme: true,
    characterFocus: true,
    spoilerLevel: true,
    intensityLevel: true,
    platformFit: true,
    allowedRegions: true,
    restrictedRegions: true,
    embargoDate: true,
    distributorNotes: true,
  })
  .extend({
    durationSeconds: z.string().nullable().optional(),
    platformFit: z.array(z.string()).nullable().optional(),
    allowedRegions: z.array(z.string()).nullable().optional(),
    restrictedRegions: z.array(z.string()).nullable().optional(),
    embargoDate: z.string().nullable().optional(),
  });

export const insertDestinationSchema = createInsertSchema(regionalDestinations).pick({
  titleId: true,
  countryCode: true,
  regionName: true,
  platformName: true,
  platformType: true,
  destinationUrl: true,
  ctaLabel: true,
  language: true,
  startDate: true,
  endDate: true,
  status: true,
  campaignPriority: true,
  trackingParametersTemplate: true,
}).extend({
  campaignPriority: z.number().nullable().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
});

export type InsertDestination = z.infer<typeof insertDestinationSchema>;

export const insertSmartLinkSchema = createInsertSchema(smartLinks).pick({
  slug: true,
  titleId: true,
  defaultUrl: true,
  trackingParamsTemplate: true,
  isActive: true,
  createdById: true,
}).extend({
  slug: z.string().min(1).max(20).optional(),
  titleId: z.number().nullable().optional(),
});

export type InsertSmartLink = z.infer<typeof insertSmartLinkSchema>;

export const insertCampaignSchema = createInsertSchema(campaigns).pick({
  titleId: true,
  projectId: true,
  campaignName: true,
  goal: true,
  status: true,
  templateType: true,
  targetRegions: true,
  clipIds: true,
  smartLinkId: true,
  briefText: true,
  createdById: true,
}).extend({
  projectId: z.number().nullable().optional(),
  targetRegions: z.array(z.string()).nullable().optional(),
  clipIds: z.array(z.number()).nullable().optional(),
  smartLinkId: z.number().nullable().optional(),
  briefText: z.string().nullable().optional(),
  goal: z.string().nullable().optional(),
  templateType: z.string().nullable().optional(),
});

export type InsertCampaign = z.infer<typeof insertCampaignSchema>;

// ─── Exported Types ───────────────────────────────────────────────────────────

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

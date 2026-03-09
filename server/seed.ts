/**
 * Seed script — run once: npm run db:seed
 * Creates the default admin user and app settings for OAE Marketing.
 */
import bcrypt from "bcrypt";
import { db } from "./db.js";
import { users, appSettings, promptTemplates } from "@shared/schema.js";
import { eq } from "drizzle-orm";

const DEFAULT_USERNAME = "admin";
const DEFAULT_PASSWORD = "oaeadmin2024";

const DEFAULT_PROMPT_TEMPLATES = [
  {
    taskName: "campaign_brief",
    systemPrompt:
      "You are an expert film marketing strategist for an independent film distributor. Generate concise, compelling campaign briefs.",
    userPromptTemplate:
      "Title: {{titleName}}\nGoal: {{goal}}\nTarget Regions: {{targetRegions}}\nSynopsis: {{synopsis}}\nKey Selling Points: {{keySellingPoints}}\nGenerate a campaign brief with: audience angle, 3 hook ideas, clip selection rationale, CTA recommendation, and posting cadence.",
  },
  {
    taskName: "clip_to_post",
    systemPrompt:
      "You are a social media copywriter specializing in independent film marketing. Generate platform-optimized posts.",
    userPromptTemplate:
      "Film: {{titleName}}\nClip description: {{clipDescription}}\nPlatform: {{platform}}\nRegion: {{region}}\nSmart Link: {{smartLink}}\nGenerate: headline (max 80 chars), short caption (max 150 chars), long caption (max 500 chars), CTA (max 30 chars), 5-8 hashtags.",
  },
  {
    taskName: "territory_assistant",
    systemPrompt: "You are a film distribution rights expert.",
    userPromptTemplate:
      "Title: {{titleName}}\nDate range: {{dateRange}}\nActive deals: {{activeDeals}}\nAnalyze active windows, flag expiring deals within 30 days, identify missing regional links, and suggest promotional timing.",
  },
  {
    taskName: "catalog_revival",
    systemPrompt: "You are a film catalog marketing strategist.",
    userPromptTemplate:
      "Catalog: {{catalogTitles}}\nCurrent date: {{currentDate}}\nSeasonal context: {{seasonalContext}}\nIdentify 3-5 titles best suited for revival promotion with rationale based on seasonality, trends, and platform availability.",
  },
] as const;

async function seedPromptTemplates(): Promise<void> {
  console.log("Seeding prompt templates...");

  for (const template of DEFAULT_PROMPT_TEMPLATES) {
    const [existing] = await db
      .select()
      .from(promptTemplates)
      .where(eq(promptTemplates.taskName, template.taskName))
      .limit(1);

    if (existing) {
      console.log(`Prompt template '${template.taskName}' already exists — skipping.`);
    } else {
      await db.insert(promptTemplates).values({
        taskName: template.taskName,
        systemPrompt: template.systemPrompt,
        userPromptTemplate: template.userPromptTemplate,
        provider: "all",
        version: 1,
        isActive: true,
      });
      console.log(`Prompt template '${template.taskName}' created.`);
    }
  }

  console.log("Prompt templates seeded.");
}

async function seed() {
  console.log("Seeding database...");

  // Admin user
  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.username, DEFAULT_USERNAME))
    .limit(1);

  if (existing) {
    if (existing.role !== "admin") {
      await db.update(users).set({ role: "admin" }).where(eq(users.id, existing.id));
      console.log("Updated admin user role to \"admin\".");
    } else {
      console.log("Admin user already exists — skipping user seed.");
    }
  } else {
    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12);
    const [user] = await db
      .insert(users)
      .values({
        username: DEFAULT_USERNAME,
        email: "admin@otheranimal.app",
        password: passwordHash,
        firstName: "Admin",
        lastName: "User",
        role: "admin",
        isActive: true,
      })
      .returning();

    console.log(`Admin user created: ${user.username} (id: ${user.id})`);
    console.log(`Login: ${DEFAULT_USERNAME} / ${DEFAULT_PASSWORD}`);
    console.log("Change the password after first login!");
  }

  // App settings singleton
  const [existingSettings] = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.id, 1))
    .limit(1);

  if (!existingSettings) {
    await db.insert(appSettings).values({
      id: 1,
      companyName: "Other Animal Entertainment",
      appTitle: "OAE Marketing",
      logoUrl: null,
      accentColor: "#e11d48",
    });
    console.log("Default app settings created.");
  } else {
    console.log("App settings already exist — skipping settings seed.");
  }

  await seedPromptTemplates();

  console.log("Seed complete.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});

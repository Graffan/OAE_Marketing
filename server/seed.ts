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

// Owner accounts — Ryan, Jon, Geoff
const OWNER_ACCOUNTS = [
  { username: "ryan", email: "ryan@otheranimal.app", firstName: "Ryan", lastName: "" },
  { username: "jon", email: "jon@otheranimal.app", firstName: "Jon", lastName: "" },
  { username: "geoff", email: "geoff@otheranimal.app", firstName: "Geoff", lastName: "Raffan" },
] as const;

const DEFAULT_PROMPT_TEMPLATES = [
  {
    taskName: "campaign_brief",
    systemPrompt:
      "You are an expert film marketing strategist for an independent film distributor. Respond ONLY with a valid JSON object — no markdown, no code fences, no prose outside the JSON. Use exactly these fields: audienceAngle (string), hooks (array of 3 strings), clipRationale (string), cta (string), cadence (string), summary (string).",
    userPromptTemplate:
      "Title: {{titleName}}\nGoal: {{goal}}\nTarget Regions: {{targetRegions}}\nSynopsis: {{synopsis}}\nKey Selling Points: {{keySellingPoints}}\nGenerate a campaign brief JSON with: audienceAngle, hooks (3 ideas), clipRationale, cta, cadence, summary.",
  },
  {
    taskName: "clip_to_post",
    systemPrompt:
      "You are a social media copywriter specializing in independent film marketing. Respond ONLY with a valid JSON object — no markdown, no code fences, no prose outside the JSON. Use exactly these fields: headline (string, max 80 chars), captionShort (string, max 150 chars), captionLong (string, max 500 chars), cta (string, max 30 chars), hashtags (array of 5-8 strings without # prefix).",
    userPromptTemplate:
      "Film: {{titleName}}\nClip description: {{clipDescription}}\nPlatform: {{platform}}\nRegion: {{region}}\nSmart Link: {{smartLink}}\nGenerate a post copy JSON with: headline, captionShort, captionLong, cta, hashtags.",
  },
  {
    taskName: "territory_assistant",
    systemPrompt:
      "You are a film distribution rights expert. Respond ONLY with a valid JSON object — no markdown, no code fences, no prose outside the JSON. Use exactly these fields: activeWindows (array of strings), expiringDeals (array of strings), missingRegions (array of strings), promotionalTiming (string), summary (string).",
    userPromptTemplate:
      "Title: {{titleName}}\nDate range: {{dateRange}}\nActive deals: {{activeDeals}}\nGenerate a territory analysis JSON with: activeWindows, expiringDeals (within 30 days), missingRegions, promotionalTiming, summary.",
  },
  {
    taskName: "catalog_revival",
    systemPrompt:
      "You are a film catalog marketing strategist. Respond ONLY with a valid JSON object — no markdown, no code fences, no prose outside the JSON. Use exactly these fields: recommendations (array of objects with title and rationale strings), seasonalInsight (string).",
    userPromptTemplate:
      "Catalog: {{catalogTitles}}\nCurrent date: {{currentDate}}\nSeasonal context: {{seasonalContext}}\nGenerate a catalog revival JSON with: recommendations (3-5 titles with rationale), seasonalInsight.",
  },
  {
    taskName: "performance_summarizer",
    systemPrompt:
      "You are an entertainment marketing analyst. Analyze clip performance data and produce a concise weekly summary with actionable insights.",
    userPromptTemplate: "{{user_prompt}}",
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
      // Update system prompt and user prompt to ensure JSON format is current
      await db
        .update(promptTemplates)
        .set({
          systemPrompt: template.systemPrompt,
          userPromptTemplate: template.userPromptTemplate,
        })
        .where(eq(promptTemplates.taskName, template.taskName));
      console.log(`Prompt template '${template.taskName}' updated.`);
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
    console.log("Change the default password after first login!");
  }

  // Owner accounts
  const ownerPassword = await bcrypt.hash("oaeowner2024", 12);
  for (const owner of OWNER_ACCOUNTS) {
    const [existingOwner] = await db
      .select()
      .from(users)
      .where(eq(users.username, owner.username))
      .limit(1);

    if (existingOwner) {
      if (existingOwner.role !== "admin") {
        await db.update(users).set({ role: "admin" }).where(eq(users.id, existingOwner.id));
        console.log(`Updated ${owner.username} role to admin.`);
      } else {
        console.log(`Owner ${owner.username} already exists — skipping.`);
      }
    } else {
      await db.insert(users).values({
        username: owner.username,
        email: owner.email,
        password: ownerPassword,
        firstName: owner.firstName,
        lastName: owner.lastName,
        role: "admin",
        isActive: true,
      });
      console.log(`Owner account created: ${owner.username}`);
    }
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

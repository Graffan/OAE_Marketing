---
plan: 1
wave: 1
name: schema-seed
goal: Add aiLogs, campaignContents, promptTemplates tables to schema, run db:push, and seed four default prompt templates
estimated_tasks: 5
depends_on: []
files_modified:
  - shared/schema.ts
  - server/seed.ts
autonomous: true
must_haves:
  - ai_logs, campaign_contents, prompt_templates tables exist in the DB after db:push
  - Four prompt template seed rows exist (campaign_brief, clip_to_post, territory_assistant, catalog_revival)
---

<task id="4-1-01">
  <title>Add aiLogs table to schema</title>
  <description>
    Append the aiLogs pgTable definition to shared/schema.ts after the analyticsEvents table.
    Include columns: id (serial PK), provider (text notNull), model (text), task (text notNull),
    tokensIn (integer notNull default 0), tokensOut (integer notNull default 0),
    latencyMs (integer), status (text notNull), userId (integer FK users.id set null),
    campaignId (integer FK campaigns.id set null), promptText (text),
    responseText (text), promptTemplateVersion (integer), createdAt (timestamp defaultNow).
    Add indexes: ai_logs_campaign_id_idx, ai_logs_user_id_idx, ai_logs_created_at_idx.
    Export select type AiLog = typeof aiLogs.$inferSelect.
  </description>
  <files>shared/schema.ts</files>
  <action>modify</action>
  <verify>npx tsc --noEmit 2>&1 | head -5</verify>
</task>

<task id="4-1-02">
  <title>Add campaignContents table to schema</title>
  <description>
    Append campaignContents pgTable to shared/schema.ts after aiLogs.
    Columns: id (serial PK), campaignId (integer notNull FK campaigns.id cascade),
    contentType (text notNull — "headline"|"caption_short"|"caption_long"|"cta"|"hashtags"),
    platform (text notNull default "generic"), region (text notNull default "ALL"),
    version (integer notNull default 1), body (text notNull),
    isActive (boolean notNull default true), source (text notNull default "ai"),
    aiLogId (integer FK aiLogs.id set null), editedById (integer FK users.id set null),
    createdAt (timestamp defaultNow).
    Indexes: campaign_contents_campaign_id_idx, campaign_contents_is_active_idx.
    Create insertCampaignContentSchema using createInsertSchema picking all writable fields.
    Export types: CampaignContent, InsertCampaignContent.
  </description>
  <files>shared/schema.ts</files>
  <action>modify</action>
  <verify>npx tsc --noEmit 2>&1 | head -5</verify>
</task>

<task id="4-1-03">
  <title>Add promptTemplates table to schema</title>
  <description>
    Append promptTemplates pgTable to shared/schema.ts after campaignContents.
    Columns: id (serial PK), taskName (text notNull), provider (text notNull default "all"),
    model (text), systemPrompt (text notNull), userPromptTemplate (text notNull),
    version (integer notNull default 1), isActive (boolean notNull default true),
    createdAt (timestamp defaultNow), updatedAt (timestamp defaultNow).
    Create insertPromptTemplateSchema. Export types: PromptTemplate, InsertPromptTemplate.
    Also update the storage.ts import line to include the three new table names.
  </description>
  <files>shared/schema.ts</files>
  <action>modify</action>
  <verify>npx tsc --noEmit 2>&1 | head -5</verify>
</task>

<task id="4-1-04">
  <title>Run db:push to create new tables</title>
  <description>
    Execute npm run db:push to apply the three new table definitions to the PostgreSQL database
    oae_marketing. Verify by connecting to the DB and confirming ai_logs, campaign_contents,
    and prompt_templates tables exist.
  </description>
  <files>shared/schema.ts</files>
  <action>modify</action>
  <verify>npm run db:push 2>&1 | tail -5</verify>
</task>

<task id="4-1-05">
  <title>Seed default prompt templates</title>
  <description>
    Add a seedPromptTemplates() function to server/seed.ts. Import promptTemplates from schema.
    For each of the four task names (campaign_brief, clip_to_post, territory_assistant,
    catalog_revival), check if a row already exists for that taskName; if not, insert one.

    campaign_brief system prompt: "You are an expert film marketing strategist for an independent
    film distributor. Generate concise, compelling campaign briefs."
    campaign_brief userPromptTemplate: "Title: {{titleName}}\nGoal: {{goal}}\nTarget Regions:
    {{targetRegions}}\nSynopsis: {{synopsis}}\nKey Selling Points: {{keySellingPoints}}\n
    Generate a campaign brief with: audience angle, 3 hook ideas, clip selection rationale,
    CTA recommendation, and posting cadence."

    clip_to_post system prompt: "You are a social media copywriter specializing in independent
    film marketing. Generate platform-optimized posts."
    clip_to_post userPromptTemplate: "Film: {{titleName}}\nClip description: {{clipDescription}}\n
    Platform: {{platform}}\nRegion: {{region}}\nSmart Link: {{smartLink}}\n
    Generate: headline (max 80 chars), short caption (max 150 chars), long caption (max 500 chars),
    CTA (max 30 chars), 5-8 hashtags."

    territory_assistant system prompt: "You are a film distribution rights expert."
    territory_assistant userPromptTemplate: "Title: {{titleName}}\nDate range: {{dateRange}}\n
    Active deals: {{activeDeals}}\nAnalyze active windows, flag expiring deals within 30 days,
    identify missing regional links, and suggest promotional timing."

    catalog_revival system prompt: "You are a film catalog marketing strategist."
    catalog_revival userPromptTemplate: "Catalog: {{catalogTitles}}\nCurrent date: {{currentDate}}\n
    Seasonal context: {{seasonalContext}}\nIdentify 3-5 titles best suited for revival promotion
    with rationale based on seasonality, trends, and platform availability."

    Call seedPromptTemplates() from the main seed() function before process.exit.
    Verify: psql oae_marketing -c "SELECT task_name, version FROM prompt_templates;"
  </description>
  <files>server/seed.ts</files>
  <action>modify</action>
  <verify>psql oae_marketing -c "SELECT task_name, version FROM prompt_templates;" 2>&1</verify>
</task>

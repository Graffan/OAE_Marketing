---
plan: 2
wave: 1
name: storage
goal: Add all campaign, campaign content, AI log, and prompt template storage functions to server/storage.ts
estimated_tasks: 5
depends_on: [1]
files_modified:
  - server/storage.ts
autonomous: true
must_haves:
  - getCampaigns, getCampaignById, createCampaign, updateCampaign, deleteCampaign all return correct shapes
  - activateCampaignContentVersion wraps set-inactive + set-active in a single Drizzle transaction
  - checkTokenCaps throws with identifiable error message when daily or per-user cap is exceeded
  - All functions follow immutable pattern — return new object from .returning()
---

<task id="4-2-01">
  <title>Update storage.ts imports for new tables</title>
  <description>
    Update the import statement at the top of server/storage.ts to include the three new table
    names: aiLogs, campaignContents, promptTemplates. Also import the new insert and select types:
    InsertAiLog, InsertCampaignContent, InsertPromptTemplate, AiLog, CampaignContent, PromptTemplate.
    Ensure no existing imports are removed — this is a pure addition.
  </description>
  <files>server/storage.ts</files>
  <action>modify</action>
  <verify>npx tsc --noEmit 2>&1 | head -5</verify>
</task>

<task id="4-2-02">
  <title>Add campaign storage functions</title>
  <description>
    Add to server/storage.ts after existing campaign-related code (currently no campaign functions
    exist beyond schema). Import campaigns, campaignContents, aiLogs, promptTemplates from schema.

    Functions to add:
    - getCampaigns(titleId?: number): return all campaigns ordered by createdAt desc, optionally
      filtered by titleId. Join with titles to return titleName.
    - getCampaignById(id: number): single campaign by id.
    - createCampaign(data: InsertCampaign): insert and return. Set status to "draft".
    - updateCampaign(id: number, data: Partial<InsertCampaign>): update with updatedAt = new Date().
    - deleteCampaign(id: number): delete by id.
    - patchCampaignStatus(id: number, status: string, userId?: number): update status + approvedById
      + approvedAt when status is "approved".

    All functions follow existing immutable pattern — return new object from .returning().
  </description>
  <files>server/storage.ts</files>
  <action>modify</action>
  <verify>npx tsc --noEmit 2>&1 | head -5</verify>
</task>

<task id="4-2-03">
  <title>Add campaign content storage functions</title>
  <description>
    Add to server/storage.ts:
    - getCampaignContents(campaignId: number): return all content rows for a campaign ordered by
      contentType, platform, region, version desc.
    - createCampaignContent(data: InsertCampaignContent): insert and return.
    - activateCampaignContentVersion(versionId: number, campaignId: number, contentType: string,
      platform: string, region: string): wrap in Drizzle transaction — first set isActive=false
      for all rows matching (campaignId, contentType, platform, region), then set isActive=true
      for versionId. Return activated row.
    - getActiveCampaignContents(campaignId: number): return only isActive=true rows.
  </description>
  <files>server/storage.ts</files>
  <action>modify</action>
  <verify>npx tsc --noEmit 2>&1 | head -5</verify>
</task>

<task id="4-2-04">
  <title>Add AI log storage functions</title>
  <description>
    Add to server/storage.ts:
    - createAiLog(data: Omit<InsertAiLog, "id" | "createdAt">): insert and return id.
    - getAiLogs(page: number, limit: number): paginated desc by createdAt. Return {rows, total}.
    - getAiUsageSummary(): query SUM(tokens_in + tokens_out) from ai_logs where createdAt >=
      today midnight and status = "success". Return {dailyTotal, userTotals: {userId, total}[]}.
    - checkTokenCaps(userId: number, settings: AppSettings): query daily global total and
      per-user total. Throw Error with message "Daily token cap reached" or "User token cap
      reached" if either exceeds cap. Uses sql`SUM(tokens_in + tokens_out)` pattern.
  </description>
  <files>server/storage.ts</files>
  <action>modify</action>
  <verify>npx tsc --noEmit 2>&1 | head -5</verify>
</task>

<task id="4-2-05">
  <title>Add prompt template storage functions</title>
  <description>
    Add to server/storage.ts:
    - getPromptTemplates(): return all rows.
    - getPromptTemplate(taskName: string): return first active row for taskName.
    - updatePromptTemplate(id: number, data: Partial<InsertPromptTemplate>): update + updatedAt.
  </description>
  <files>server/storage.ts</files>
  <action>modify</action>
  <verify>npx tsc --noEmit 2>&1 | head -5</verify>
</task>

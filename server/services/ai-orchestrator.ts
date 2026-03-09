import { getPromptTemplate } from "../storage.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AiTask =
  | "campaign_brief"
  | "clip_to_post"
  | "territory_assistant"
  | "catalog_revival";

export interface GenerateOptions {
  forceProvider?: "claude" | "openai" | "deepseek";
  userId?: number;
  campaignId?: number;
  saveToContents?: boolean;
}

export interface GenerateResult {
  content: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  logId: number;
}

export interface ManualModeResult {
  manualMode: true;
  promptForUser: string;
  systemPrompt: string;
}

// ─── buildPrompt ──────────────────────────────────────────────────────────────

export async function buildPrompt(
  taskName: AiTask,
  context: Record<string, unknown>
): Promise<{ systemPrompt: string; userPrompt: string; templateVersion: number }> {
  const template = await getPromptTemplate(taskName);
  if (!template) {
    throw new Error(`No active prompt template found for task: ${taskName}`);
  }

  const userPrompt = Object.entries(context).reduce(
    (rendered, [key, value]) =>
      rendered.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), String(value ?? "")),
    template.userPromptTemplate
  );

  return {
    systemPrompt: template.systemPrompt,
    userPrompt,
    templateVersion: template.version,
  };
}

import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { getPromptTemplate } from "../storage.js";
import type { AppSettings } from "@shared/schema.js";

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

// ─── Provider Adapters ────────────────────────────────────────────────────────

interface ProviderResult {
  content: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

async function callClaudeProvider(
  settings: AppSettings,
  systemPrompt: string,
  userPrompt: string
): Promise<ProviderResult> {
  if (!settings.claudeApiKey) {
    throw new Error("Claude API key not configured");
  }
  const client = new Anthropic({ apiKey: settings.claudeApiKey });
  const model = settings.claudeModel ?? "claude-opus-4-5";
  const response = await client.messages.create({
    model,
    max_tokens: 2048,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });
  const textBlock = response.content[0] as Anthropic.TextBlock;
  return {
    content: textBlock.text,
    model,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}

async function callOpenAIProvider(
  settings: AppSettings,
  systemPrompt: string,
  userPrompt: string
): Promise<ProviderResult> {
  if (!settings.openaiApiKey) {
    throw new Error("OpenAI API key not configured");
  }
  const client = new OpenAI({ apiKey: settings.openaiApiKey });
  const model = settings.openaiModel ?? "gpt-4o";
  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    max_tokens: 2048,
  });
  const content = response.choices[0]?.message?.content ?? "";
  return {
    content,
    model,
    inputTokens: response.usage?.prompt_tokens ?? 0,
    outputTokens: response.usage?.completion_tokens ?? 0,
  };
}

async function callDeepSeekProvider(
  settings: AppSettings,
  systemPrompt: string,
  userPrompt: string
): Promise<ProviderResult> {
  if (!settings.deepseekApiKey) {
    throw new Error("DeepSeek API key not configured");
  }
  // deepseek-chat is the alias for DeepSeek-V3; do not use deepseek-v3 directly.
  const model = settings.deepseekModel ?? "deepseek-chat";
  const client = new OpenAI({
    apiKey: settings.deepseekApiKey,
    baseURL: "https://api.deepseek.com",
  });
  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    max_tokens: 2048,
  });
  const content = response.choices[0]?.message?.content ?? "";
  return {
    content,
    model,
    inputTokens: response.usage?.prompt_tokens ?? 0,
    outputTokens: response.usage?.completion_tokens ?? 0,
  };
}

async function callProvider(
  provider: string,
  settings: AppSettings,
  systemPrompt: string,
  userPrompt: string
): Promise<ProviderResult> {
  switch (provider) {
    case "claude":
      return callClaudeProvider(settings, systemPrompt, userPrompt);
    case "openai":
      return callOpenAIProvider(settings, systemPrompt, userPrompt);
    case "deepseek":
      return callDeepSeekProvider(settings, systemPrompt, userPrompt);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

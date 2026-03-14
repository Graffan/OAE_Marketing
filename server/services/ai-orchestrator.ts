import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { getPromptTemplate, getFullAppSettings, checkTokenCaps, createAiLog } from "../storage.js";
import type { AppSettings } from "@shared/schema.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AiTask =
  | "campaign_brief"
  | "clip_to_post"
  | "territory_assistant"
  | "catalog_revival"
  | "performance_summarizer";

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

const JSON_SYSTEM_SUFFIX =
  "\n\nIMPORTANT: You must respond with valid JSON only. Do not include markdown code blocks, commentary, or any text outside the JSON object.";

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
    system: systemPrompt + JSON_SYSTEM_SUFFIX,
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
    response_format: { type: "json_object" },
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
    response_format: { type: "json_object" },
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

async function callOllamaProvider(
  settings: AppSettings,
  systemPrompt: string,
  userPrompt: string
): Promise<ProviderResult> {
  const baseURL = settings.ollamaUrl ?? "http://localhost:11434";
  const model = settings.ollamaModel ?? "llama3.1:8b";

  // Ollama exposes an OpenAI-compatible API at /v1
  const client = new OpenAI({
    apiKey: "ollama", // required by SDK but ignored by Ollama
    baseURL: `${baseURL}/v1`,
  });
  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: systemPrompt + JSON_SYSTEM_SUFFIX },
      { role: "user", content: userPrompt },
    ],
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
    case "ollama":
      return callOllamaProvider(settings, systemPrompt, userPrompt);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

/** Strip markdown code fences if a model wraps JSON in ```json ... ``` */
function stripCodeFences(raw: string): string {
  return raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
}

/** Ensure the stored content is valid JSON. Wraps plain text as { text } as fallback. */
export function normalizeJsonContent(raw: string): string {
  const cleaned = stripCodeFences(raw);
  try {
    JSON.parse(cleaned);
    return cleaned;
  } catch {
    return JSON.stringify({ text: raw });
  }
}

// ─── Retry with exponential backoff (OpenClaw pattern) ────────────────────────

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 2,
  baseDelayMs = 1000
): Promise<T> {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const isRateLimited =
        lastError.message.includes("429") ||
        lastError.message.includes("rate") ||
        lastError.message.includes("overloaded");

      if (attempt < maxRetries && isRateLimited) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        console.log(`[ai-orchestrator] Rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise((r) => setTimeout(r, delay));
      } else {
        throw lastError;
      }
    }
  }
  throw lastError ?? new Error("Retry exhausted");
}

// ─── generateText ─────────────────────────────────────────────────────────────

export async function generateText(
  task: AiTask,
  systemPrompt: string,
  userPrompt: string,
  templateVersion: number,
  options: GenerateOptions = {}
): Promise<GenerateResult> {
  // 1. Load settings
  const settings = await getFullAppSettings();
  if (!settings) {
    throw new Error("App settings not found — cannot generate text");
  }

  // 2. Check token caps
  await checkTokenCaps(options.userId ?? 0, settings);

  // 3. Build provider order (deduplicated)
  const baseOrder: string[] = options.forceProvider
    ? [options.forceProvider]
    : [
        settings.aiPrimaryProvider ?? "claude",
        ...(settings.aiFallbackOrder ?? ["openai", "deepseek"]),
      ];
  const providerOrder = [...new Set(baseOrder)];

  // 4. Attempt each provider with failover + retry on rate limits (OpenClaw pattern)
  let lastError: Error | undefined;

  for (const provider of providerOrder) {
    const startMs = Date.now();
    try {
      const result = await retryWithBackoff(
        () => callProvider(provider, settings, systemPrompt, userPrompt),
        2,
        1000
      );
      const latencyMs = Date.now() - startMs;

      const normalizedContent = normalizeJsonContent(result.content);

      const logRow = await createAiLog({
        provider,
        model: result.model,
        task,
        tokensIn: result.inputTokens,
        tokensOut: result.outputTokens,
        latencyMs,
        status: "success",
        userId: options.userId ?? null,
        campaignId: options.campaignId ?? null,
        promptText: userPrompt,
        responseText: normalizedContent,
        promptTemplateVersion: templateVersion,
      });

      return {
        content: normalizedContent,
        provider,
        model: result.model,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        latencyMs,
        logId: logRow.id,
      };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      const latencyMs = Date.now() - startMs;
      lastError = error;

      // Log the failed attempt
      await createAiLog({
        provider,
        model: null,
        task,
        tokensIn: 0,
        tokensOut: 0,
        latencyMs,
        status: "error",
        userId: options.userId ?? null,
        campaignId: options.campaignId ?? null,
        promptText: userPrompt,
        responseText: error.message,
        promptTemplateVersion: templateVersion,
      }).catch((logErr) => {
        console.error("[ai-orchestrator] Failed to write error log:", logErr.message);
      });

      console.error(`[ai-orchestrator] Provider ${provider} failed, trying next:`, error.message);
    }
  }

  throw lastError ?? new Error("All AI providers failed");
}

// ─── getManualPrompt ──────────────────────────────────────────────────────────

export async function getManualPrompt(
  task: AiTask,
  context: Record<string, unknown>
): Promise<ManualModeResult> {
  const { systemPrompt, userPrompt } = await buildPrompt(task, context);
  return {
    manualMode: true,
    promptForUser: userPrompt,
    systemPrompt,
  };
}

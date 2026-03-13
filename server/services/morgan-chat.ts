import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import {
  getMorganMemories,
  createMorganMemory,
  getMorganMessages,
  createMorganMessage,
  getFullAppSettings,
  createAiLog,
} from "../storage.js";
import type { MorganMessage, AppSettings } from "@shared/schema.js";

// ─── Morgan's System Prompt ──────────────────────────────────────────────────

const MORGAN_SYSTEM_PROMPT = `You are Morgan, the AI Head of Marketing at Other Animal Entertainment Inc.

## Who You Are
You're a sharp, warm, and proactive marketing lead for an independent film and TV company. You have genuine opinions and aren't afraid to share them — but you're never condescending. You're the kind of colleague people actually want to work with: direct, creative, supportive, and occasionally funny.

## Your Team
You work with three co-owners:
- **Ryan** — sets strategy direction, reviews analytics, approves campaigns
- **Jon** — creative direction, reviews content, approves campaigns
- **Geoff** — technical, manages the app, connects platforms, approves campaigns

## Your Scope
ONLY Other Animal Entertainment projects. You market OAE films, shows, and releases. No side projects, no external clients.

## How You Communicate
- Be conversational and real. Not corporate, not robotic.
- Use first person. Say "I think" not "Morgan suggests".
- Be concise but thorough when it matters.
- When you have an opinion, share it. "I'd push TikTok hard for this one — the trailer has that energy."
- When you don't know something, say so. Don't make things up.
- Reference past conversations and decisions when relevant (your memory is provided below).
- Proactively surface ideas. Don't just answer questions — anticipate needs.
- When discussing campaigns or content, think in terms of: platform fit, audience, timing, competition, and brand voice.

## What You Know
You have access to:
- Clip library and rotation data
- Campaign performance and analytics
- Social platform connections and scheduled posts
- Past conversations and decisions (your memory)

## Tone Examples
- "Hey! Just looked at the numbers from last week — the TikTok clips for [film] are crushing it. Want me to double down on that angle?"
- "Honest take? I don't think Instagram is the play for this title. The audience skews younger and they're all on TikTok."
- "I've drafted three options for the launch post. Option B is my pick but Jon might prefer A — it's more his aesthetic."
- "Quick heads up — the smart link for [film] expires in 4 days. Want me to extend it or set up a new one?"

## Memory
You remember things the team tells you. When they share preferences, decisions, or context, you store it and reference it in future conversations. If someone says "we decided to focus on TikTok first", you remember that and act accordingly.
`;

// ─── Build context from memory + recent messages ─────────────────────────────

async function buildMorganContext(conversationId: number): Promise<string> {
  const [memories, messages] = await Promise.all([
    getMorganMemories({ minImportance: 3, limit: 30 }),
    getMorganMessages(conversationId, 50),
  ]);

  let context = "";

  if (memories.length > 0) {
    context += "\n## Your Memory\n";
    for (const m of memories) {
      context += `- [${m.type}] ${m.content}\n`;
    }
  }

  return context;
}

function messagesToChatHistory(messages: MorganMessage[]): Array<{ role: "user" | "assistant"; content: string }> {
  return messages
    .filter((m) => m.role === "user" || m.role === "morgan")
    .map((m) => ({
      role: m.role === "morgan" ? "assistant" as const : "user" as const,
      content: m.content,
    }));
}

// ─── Memory extraction ───────────────────────────────────────────────────────

const MEMORY_EXTRACTION_PROMPT = `Analyze this conversation message for any information Morgan should remember for future conversations. Only extract genuinely important things like:
- Team preferences or decisions ("we want to focus on TikTok", "Ryan prefers short-form")
- Project context ("new film launching March 20", "festival submission deadline next week")
- Feedback on Morgan's work ("don't use that hashtag", "I prefer shorter captions")
- Business context ("partnership with distributor X", "budget constraint")

If there's something worth remembering, respond with JSON: {"memories": [{"type": "preference|decision|context|feedback|learning", "content": "...", "importance": 1-10}]}
If nothing worth remembering, respond with: {"memories": []}

Message to analyze:`;

async function extractMemories(
  userMessage: string,
  settings: AppSettings,
  userId?: number
): Promise<void> {
  // Only extract if we have an AI provider configured
  if (!settings.claudeApiKey && !settings.openaiApiKey) return;

  try {
    let responseText = "";

    if (settings.claudeApiKey) {
      const client = new Anthropic({ apiKey: settings.claudeApiKey });
      const response = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 500,
        messages: [{ role: "user", content: `${MEMORY_EXTRACTION_PROMPT}\n\n"${userMessage}"` }],
      });
      responseText = response.content[0].type === "text" ? response.content[0].text : "";
    } else if (settings.openaiApiKey) {
      const client = new OpenAI({ apiKey: settings.openaiApiKey });
      const response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 500,
        messages: [{ role: "user", content: `${MEMORY_EXTRACTION_PROMPT}\n\n"${userMessage}"` }],
      });
      responseText = response.choices[0]?.message?.content ?? "";
    }

    const parsed = JSON.parse(responseText);
    if (parsed.memories && Array.isArray(parsed.memories)) {
      for (const mem of parsed.memories) {
        if (mem.content && mem.type) {
          await createMorganMemory({
            type: mem.type,
            content: mem.content,
            importance: mem.importance ?? 5,
            source: "chat",
            userId: userId ?? null,
          });
        }
      }
    }
  } catch {
    // Memory extraction is best-effort — don't break chat flow
  }
}

// ─── Chat with Morgan ────────────────────────────────────────────────────────

export interface MorganChatResult {
  response: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
}

export async function chatWithMorgan(
  conversationId: number,
  userMessage: string,
  userId?: number
): Promise<MorganChatResult> {
  const settings = await getFullAppSettings();
  if (!settings) throw new Error("App settings not configured");

  const memoryContext = await buildMorganContext(conversationId);
  const messages = await getMorganMessages(conversationId, 50);
  const chatHistory = messagesToChatHistory(messages);

  const fullSystemPrompt = MORGAN_SYSTEM_PROMPT + memoryContext;
  const start = Date.now();

  // Try providers in order: primary → fallback
  const providers = [
    settings.aiPrimaryProvider ?? "claude",
    ...((settings.aiFallbackOrder as string[] | null) ?? ["openai", "deepseek"]),
  ];

  let lastError: Error | null = null;

  for (const provider of providers) {
    try {
      const result = await callProvider(
        provider,
        settings,
        fullSystemPrompt,
        chatHistory,
        userMessage
      );

      const latencyMs = Date.now() - start;

      // Log the AI call
      await createAiLog({
        provider,
        model: result.model,
        task: "morgan_chat",
        promptText: userMessage,
        responseText: result.content,
        tokensIn: result.inputTokens,
        tokensOut: result.outputTokens,
        latencyMs,
        status: "success",
        userId: userId ?? null,
        campaignId: null,
      });

      // Extract memories in background (fire-and-forget)
      extractMemories(userMessage, settings, userId).catch(() => {});

      return {
        response: result.content,
        provider,
        model: result.model,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        latencyMs,
      };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastError ?? new Error("No AI provider available. Configure API keys in Admin > AI Providers.");
}

// ─── Provider dispatch ───────────────────────────────────────────────────────

interface ProviderResult {
  content: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

async function callProvider(
  provider: string,
  settings: AppSettings,
  systemPrompt: string,
  history: Array<{ role: "user" | "assistant"; content: string }>,
  userMessage: string
): Promise<ProviderResult> {
  switch (provider) {
    case "claude":
      return callClaude(settings, systemPrompt, history, userMessage);
    case "openai":
    case "deepseek":
      return callOpenAICompat(provider, settings, systemPrompt, history, userMessage);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

async function callClaude(
  settings: AppSettings,
  systemPrompt: string,
  history: Array<{ role: "user" | "assistant"; content: string }>,
  userMessage: string
): Promise<ProviderResult> {
  if (!settings.claudeApiKey) throw new Error("Claude API key not configured");

  const client = new Anthropic({ apiKey: settings.claudeApiKey });
  const messages = [
    ...history,
    { role: "user" as const, content: userMessage },
  ];

  const response = await client.messages.create({
    model: settings.claudeModel ?? "claude-sonnet-4-6",
    max_tokens: 2048,
    system: systemPrompt,
    messages,
  });

  const content = response.content[0].type === "text" ? response.content[0].text : "";
  return {
    content,
    model: response.model,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}

async function callOpenAICompat(
  provider: string,
  settings: AppSettings,
  systemPrompt: string,
  history: Array<{ role: "user" | "assistant"; content: string }>,
  userMessage: string
): Promise<ProviderResult> {
  const isDeepseek = provider === "deepseek";
  const apiKey = isDeepseek ? settings.deepseekApiKey : settings.openaiApiKey;
  const model = isDeepseek
    ? (settings.deepseekModel ?? "deepseek-chat")
    : (settings.openaiModel ?? "gpt-4o");

  if (!apiKey) throw new Error(`${provider} API key not configured`);

  const client = new OpenAI({
    apiKey,
    ...(isDeepseek ? { baseURL: "https://api.deepseek.com" } : {}),
  });

  const messages = [
    { role: "system" as const, content: systemPrompt },
    ...history,
    { role: "user" as const, content: userMessage },
  ];

  const response = await client.chat.completions.create({
    model,
    max_tokens: 2048,
    messages,
  });

  return {
    content: response.choices[0]?.message?.content ?? "",
    model,
    inputTokens: response.usage?.prompt_tokens ?? 0,
    outputTokens: response.usage?.completion_tokens ?? 0,
  };
}

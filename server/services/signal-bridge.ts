/**
 * Signal Bridge for Morgan
 *
 * Bridges Morgan's AI chat to a Signal group chat. When someone @morgan's
 * in the configured Signal group, Morgan reads the message, generates a
 * response, and sends it back to the group.
 *
 * Requirements:
 * - signal-cli installed and registered with a phone number for Morgan
 * - signal-cli-rest-api running (Docker: bbernhard/signal-cli-rest-api)
 *   OR signal-cli available in PATH
 *
 * Configuration (stored in app_settings):
 * - signalApiUrl: URL of signal-cli REST API (e.g. http://localhost:8080)
 * - signalPhoneNumber: Morgan's registered Signal phone number
 * - signalGroupId: Base64-encoded Signal group ID
 *
 * Architecture:
 * The bridge polls the signal-cli REST API for new messages every few seconds.
 * When it detects an @morgan mention in the configured group, it:
 * 1. Creates or finds a Signal-channel conversation in morgan_conversations
 * 2. Stores the incoming message
 * 3. Calls chatWithMorgan() for a response
 * 4. Sends the response back to the Signal group
 * 5. Stores the outgoing message
 */

import { chatWithMorgan } from "./morgan-chat.js";
import {
  getFullAppSettings,
  createMorganConversation,
  createMorganMessage,
  getMorganConversations,
} from "../storage.js";

// ─── Types ───────────────────────────────────────────────────────────────────

interface SignalMessage {
  envelope: {
    source: string;
    sourceNumber: string;
    sourceName?: string;
    timestamp: number;
    dataMessage?: {
      message: string;
      groupInfo?: {
        groupId: string;
      };
    };
  };
}

interface SignalBridgeConfig {
  apiUrl: string;
  phoneNumber: string;
  groupId: string;
  pollIntervalMs: number;
}

// ─── State ───────────────────────────────────────────────────────────────────

let pollTimer: ReturnType<typeof setInterval> | null = null;
let lastTimestamp = 0;
let signalConversationId: number | null = null;

// ─── API helpers ─────────────────────────────────────────────────────────────

async function receiveMessages(config: SignalBridgeConfig): Promise<SignalMessage[]> {
  try {
    const res = await fetch(`${config.apiUrl}/v1/receive/${config.phoneNumber}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

async function sendGroupMessage(
  config: SignalBridgeConfig,
  message: string
): Promise<boolean> {
  try {
    const res = await fetch(`${config.apiUrl}/v2/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        number: config.phoneNumber,
        recipients: [config.groupId],
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ─── Get or create the Signal conversation ───────────────────────────────────

async function getSignalConversation(): Promise<number> {
  if (signalConversationId) return signalConversationId;

  // Look for an existing Signal channel conversation
  const convos = await getMorganConversations();
  const existing = (convos as any[]).find((c: any) => c.channel === "signal");
  if (existing) {
    signalConversationId = existing.id;
    return existing.id;
  }

  // Create one
  const conv = await createMorganConversation({
    title: "Signal Group Chat",
    channel: "signal",
  });
  signalConversationId = conv.id;
  return conv.id;
}

// ─── Process incoming messages ───────────────────────────────────────────────

async function processMessages(config: SignalBridgeConfig): Promise<void> {
  const messages = await receiveMessages(config);

  for (const msg of messages) {
    const data = msg.envelope?.dataMessage;
    if (!data?.message) continue;
    if (msg.envelope.timestamp <= lastTimestamp) continue;

    lastTimestamp = msg.envelope.timestamp;

    // Check if it's from our group
    if (data.groupInfo?.groupId !== config.groupId) continue;

    // Check for @morgan mention (case-insensitive)
    const text = data.message;
    if (!/@morgan/i.test(text)) continue;

    // Strip the @morgan mention
    const cleanMessage = text.replace(/@morgan/gi, "").trim();
    if (!cleanMessage) continue;

    const senderName = msg.envelope.sourceName || msg.envelope.sourceNumber || "Someone";

    try {
      const conversationId = await getSignalConversation();

      // Store incoming message
      await createMorganMessage({
        conversationId,
        role: "user",
        content: `[Signal] ${senderName}: ${cleanMessage}`,
      });

      // Get Morgan's response
      const result = await chatWithMorgan(
        conversationId,
        `${senderName} (via Signal): ${cleanMessage}`
      );

      // Store Morgan's response
      await createMorganMessage({
        conversationId,
        role: "morgan",
        content: result.response,
        metadata: {
          provider: result.provider,
          model: result.model,
          channel: "signal",
        },
      });

      // Send back to Signal
      await sendGroupMessage(config, result.response);

      console.log(`[Signal Bridge] Responded to ${senderName}: ${cleanMessage.slice(0, 50)}...`);
    } catch (err) {
      console.error("[Signal Bridge] Error processing message:", err);
    }
  }
}

// ─── Start / Stop ────────────────────────────────────────────────────────────

export async function startSignalBridge(): Promise<boolean> {
  const settings = await getFullAppSettings();

  const apiUrl = (settings as any).signalApiUrl;
  const phoneNumber = (settings as any).signalPhoneNumber;
  const groupId = (settings as any).signalGroupId;

  if (!apiUrl || !phoneNumber || !groupId) {
    console.log("[Signal Bridge] Not configured — skipping. Set signalApiUrl, signalPhoneNumber, and signalGroupId in Admin settings.");
    return false;
  }

  const config: SignalBridgeConfig = {
    apiUrl,
    phoneNumber,
    groupId,
    pollIntervalMs: 5000,
  };

  // Reset state
  lastTimestamp = Date.now();
  signalConversationId = null;

  // Start polling
  pollTimer = setInterval(() => processMessages(config), config.pollIntervalMs);
  console.log(`[Signal Bridge] Started — polling ${apiUrl} every ${config.pollIntervalMs}ms for group ${groupId}`);
  return true;
}

export function stopSignalBridge(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
    console.log("[Signal Bridge] Stopped");
  }
}

export function isSignalBridgeRunning(): boolean {
  return pollTimer !== null;
}

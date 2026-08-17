import OpenAI from "openai";
import { Bot } from "../db/queries";

// ─── Lazy client ──────────────────────────────────────────────────────────────

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_client) {
    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error("OPENROUTER_API_KEY environment variable is required");
    }
    _client = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENROUTER_API_KEY,
      defaultHeaders: {
        "HTTP-Referer": process.env.FRONTEND_URL ?? "http://localhost:3000",
        "X-Title": "WhatsApp AI Agent",
      },
    });
  }
  return _client;
}

// ─── Fallback model chain ─────────────────────────────────────────────────────

const FALLBACK_MODELS = [
  "google/gemma-4-27b-it:free",
  "nvidia/nemotron-nano-9b-v2:free",
  "z-ai/glm-5.2:free",
  "openai/gpt-oss-20b:free",
];

// ─── Strip thinking/reasoning tags ───────────────────────────────────────────
//
// Some models (Nemotron, GLM, etc.) wrap their internal chain-of-thought in
// <think>…</think> or similar tags before the actual reply.
// We strip everything inside those blocks so only the clean message is sent.

function stripThinking(text: string): string {
  return (
    text
      // Remove <think>…</think> blocks (Nemotron, DeepSeek style)
      .replace(/<think>[\s\S]*?<\/think>/gi, "")
      // Remove <thinking>…</thinking> blocks
      .replace(/<thinking>[\s\S]*?<\/thinking>/gi, "")
      // Remove **Internal note:** … paragraphs (some instruction-tuned models)
      .replace(/\*\*Internal note:?\*\*[\s\S]*?(?=\n\n|\n[A-Z]|$)/gi, "")
      // Remove lines starting with common self-talk prefixes
      .replace(/^(Wait:|Actually,|Hmm,|Let me|I need to|I should|The user|Okay,|So,).+$/gim, "")
      // Collapse multiple blank lines into one
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

// ─── Wrap user system prompt ──────────────────────────────────────────────────
//
// Prepend a hard instruction so the model never leaks its reasoning into the
// WhatsApp reply, regardless of what the user's system prompt says.

function buildSystemPrompt(userPrompt: string): string {
  return `CRITICAL INSTRUCTIONS (follow exactly):
1. You are a WhatsApp bot. Output ONLY the reply message to send — nothing else.
2. Do NOT include any thinking, reasoning, notes, explanations, or meta-commentary.
3. Do NOT use tags like <think>, <thinking>, or similar.
4. Do NOT explain what you are doing or why.
5. Write naturally and conversationally, as if you are a real person texting.
6. Keep replies concise — max 3-4 sentences unless the topic requires more.

---

${userPrompt}`;
}

// ─── Core model call ──────────────────────────────────────────────────────────

async function callModel(
  model: string,
  systemPrompt: string,
  userMessage: string
): Promise<string | null> {
  const client = getClient();
  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: buildSystemPrompt(systemPrompt) },
      { role: "user", content: userMessage },
    ],
    max_tokens: 400,
    temperature: 0.6,
  });

  const raw = completion.choices[0]?.message?.content ?? "";
  const clean = stripThinking(raw);
  return clean.length > 0 ? clean : null;
}

// ─── Public: generate reply with fallback ─────────────────────────────────────

export async function generateReply(
  bot: Bot,
  incomingMessage: string
): Promise<string | null> {
  const attempts = [
    bot.model,
    ...FALLBACK_MODELS.filter((m) => m !== bot.model),
  ];

  for (const model of attempts) {
    try {
      const reply = await callModel(model, bot.system_prompt, incomingMessage);
      if (reply) {
        if (model !== bot.model) {
          console.warn(
            `[AI] Primary "${bot.model}" unavailable — used fallback "${model}"`
          );
        }
        return reply;
      }
    } catch (err: unknown) {
      const status = (err as { status?: number }).status;
      if (status === 404 || status === 503) {
        console.warn(`[AI] Model "${model}" returned ${status}, trying next…`);
        continue;
      }
      console.error(`[AI] Error with model "${model}":`, (err as Error).message);
      return null;
    }
  }

  console.error("[AI] All models exhausted — no reply generated");
  return null;
}

// ─── Number filter ────────────────────────────────────────────────────────────

export function isNumberAllowed(bot: Bot, fromNumber: string): boolean {
  if (!bot.allowed_numbers || bot.allowed_numbers.length === 0) return true;
  const cleaned = fromNumber.replace(/@c\.us$/, "").replace(/\D/g, "");
  return bot.allowed_numbers.some((n) => cleaned.endsWith(n) || n === cleaned);
}

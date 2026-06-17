import { readFile } from "fs/promises";
import path from "path";

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

function getConfig() {
  const apiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
  const baseUrl = (
    process.env.AI_API_BASE_URL || "https://api.openai.com/v1"
  ).replace(/\/$/, "");
  const model = process.env.AI_MODEL || "gpt-4o-mini";
  return { apiKey, baseUrl, model };
}

export function isAiConfigured(): boolean {
  return !!(process.env.AI_API_KEY || process.env.OPENAI_API_KEY);
}

export async function chatCompletion(
  messages: ChatMessage[],
  options?: { maxTokens?: number; temperature?: number }
): Promise<string | null> {
  const { apiKey, baseUrl, model } = getConfig();
  if (!apiKey) return null;

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 1800,
      }),
    });

    if (!res.ok) {
      console.error("AI API error:", res.status, await res.text());
      return null;
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch (err) {
    console.error("AI request failed:", err);
    return null;
  }
}

export async function transcribeRecording(
  publicPath: string
): Promise<string | null> {
  const whisperKey = process.env.OPENAI_API_KEY || process.env.AI_API_KEY;
  if (!whisperKey) return null;

  const whisperBase = (
    process.env.OPENAI_API_BASE_URL ||
    process.env.AI_API_BASE_URL ||
    "https://api.openai.com/v1"
  ).replace(/\/$/, "");

  const relative = publicPath.replace(/^\//, "");
  const fullPath = path.join(process.cwd(), "public", relative);

  try {
    const buffer = await readFile(fullPath);
    const form = new FormData();
    form.append("file", new Blob([buffer]), path.basename(relative));
    form.append("model", "whisper-1");

    const res = await fetch(`${whisperBase}/audio/transcriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${whisperKey}` },
      body: form,
    });

    if (!res.ok) return null;
    const data = (await res.json()) as { text?: string };
    return data.text?.trim() || null;
  } catch {
    return null;
  }
}

export async function askAssistant(
  userMessage: string,
  langLabel = "English"
): Promise<string | null> {
  const langInstruction = langLabel !== "English"
    ? ` Always respond entirely in ${langLabel}, including all text, labels, and explanations.`
    : "";
  return chatCompletion([
    {
      role: "system",
      content:
        `You are Yusi Discuss AI, a helpful workplace assistant for teams. Give clear, practical answers about meetings, tasks, notes, and collaboration. Use markdown sparingly (bold for emphasis). Keep responses concise and friendly.${langInstruction}`,
    },
    { role: "user", content: userMessage },
  ]);
}

export async function generateAiMeetingMinutes(ctx: {
  title: string;
  meetingLink?: string;
  transcript?: string;
  recordingName?: string;
  recordingNote?: string;
}): Promise<string | null> {
  const parts = [
    `Meeting title: ${ctx.title}`,
    ctx.meetingLink ? `Meeting link: ${ctx.meetingLink}` : "",
    ctx.recordingName ? `Recording file: ${ctx.recordingName}` : "",
    ctx.recordingNote || "",
    ctx.transcript ? `\nTranscript and notes:\n${ctx.transcript}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return chatCompletion([
    {
      role: "system",
      content:
        "You generate professional meeting minutes in markdown. Include: # title, ## Executive summary, ## Key decisions, ## Action items (with owners if known), ## Discussion highlights, ## Next steps. Be specific when transcript data exists; otherwise note what is missing.",
    },
    {
      role: "user",
      content: `Generate meeting minutes from this data:\n\n${parts}`,
    },
  ]);
}

export async function askAboutMeeting(
  ctx: { title: string; transcript?: string; meetingLink?: string },
  question: string
): Promise<string | null> {
  return chatCompletion([
    {
      role: "system",
      content:
        "Answer questions about a meeting using only the provided context. If the answer is not in the context, say so briefly and suggest what to check.",
    },
    {
      role: "user",
      content: `Meeting: ${ctx.title}\nLink: ${ctx.meetingLink || "n/a"}\n\nContext:\n${ctx.transcript || "(no transcript)"}\n\nQuestion: ${question}`,
    },
  ]);
}

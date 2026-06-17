import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-auth";
import { canPerform } from "@/lib/permissions";
import type { UserRole } from "@/lib/permissions";
import { askAssistant } from "@/lib/ai-provider";
import { limitByKey } from "@/lib/rate-limit";

function fallbackReply(prompt: string): string {
  const p = prompt.toLowerCase();
  if (p.includes("summarize") || p.includes("summary")) {
    return "Here's a quick summary structure:\n\n1. **Key decisions**: What was agreed?\n2. **Action items**: Who does what by when?\n3. **Open questions**: What needs follow-up?\n\nPaste your meeting notes and I can help refine each section.";
  }
  if (p.includes("task") || p.includes("project")) {
    return "For your project board, I suggest:\n- Break large goals into 2–3 day tasks\n- Always assign an owner and due date\n- Use REVIEW status before marking DONE\n\nWould you like me to draft task titles from your notes?";
  }
  if (p.includes("meeting")) {
    return "**Meeting notes template:**\n\n**Attendees:** \n**Agenda:** \n**Discussion:** \n**Decisions:** \n**Next steps:** \n\nUse the Meeting Notes page to save encrypted copies for your team.";
  }
  return `I understand you're asking about: "${prompt.slice(0, 80)}${prompt.length > 80 ? "…" : ""}"\n\nI'm your Yusi Discuss assistant. I can help with:\n- Summarizing discussions and meetings\n- Breaking work into tasks\n- Drafting messages and notes\n- Explaining features (whiteboard, board, encryption)\n\nAdd AI_API_KEY to .env.local for full AI responses (Groq or OpenAI work).`;
}

export async function GET() {
  const { session, error } = await requireSession();
  if (error) return error;
  const messages = await prisma.aiChatMessage.findMany({
    where: { userId: session!.user.id },
    orderBy: { createdAt: "asc" },
    take: 50,
  });
  return NextResponse.json(messages);
}

export async function POST(req: Request) {
  const { session, error } = await requireSession();
  if (error) return error;
  const role = session!.user.role as UserRole;
  if (!canPerform(role, "useAiChat")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const limit = limitByKey(`ai-chat:${session!.user.id}`, {
    windowMs: 60_000,
    max: 25,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: `Rate limit reached. Retry in ${limit.retryAfterSec}s` },
      { status: 429 }
    );
  }
  const { message, langLabel, regenerate } = await req.json();
  if (!message?.trim()) {
    return NextResponse.json({ error: "Message required" }, { status: 400 });
  }
  if (!regenerate) {
    await prisma.aiChatMessage.create({
      data: { role: "user", content: message.trim(), userId: session!.user.id },
    });
  }

  const aiReply = await askAssistant(message.trim(), langLabel || "English");
  const reply = aiReply || fallbackReply(message);

  const assistant = await prisma.aiChatMessage.create({
    data: { role: "assistant", content: reply, userId: session!.user.id },
  });
  await prisma.activityLog.create({
    data: {
      action: "AI_CHAT",
      details: "Used AI assistant",
      userId: session!.user.id,
      organizationId: session!.user.organizationId,
    },
  });
  return NextResponse.json({ reply: assistant.content });
}

export async function DELETE() {
  const { session, error } = await requireSession();
  if (error) return error;
  await prisma.aiChatMessage.deleteMany({
    where: { userId: session!.user.id },
  });
  return NextResponse.json({ ok: true });
}

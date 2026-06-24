import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encrypt, decrypt } from "@/lib/encryption";
import { requireSession } from "@/lib/api-auth";
import { canPerform } from "@/lib/permissions";
import type { UserRole } from "@/lib/permissions";
import { canPostInChannel } from "@/lib/channel-permissions";

export async function GET(req: Request) {
  const { session, error } = await requireSession();
  if (error) return error;
  const orgId = session!.user.organizationId;
  if (!orgId) return NextResponse.json({ error: "No organization selected" }, { status: 400 });
  const threadId = new URL(req.url).searchParams.get("threadId");
  if (!threadId) {
    return NextResponse.json({ error: "threadId required" }, { status: 400 });
  }

  const thread = await prisma.chatThread.findUnique({
    where: { id: threadId },
    include: {
      channel: { include: { community: true } },
      messages: { take: 1, select: { id: true } },
    },
  });
  if (!thread) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }
  if (thread.type === "dm") {
    const memberIds = [thread.dmUserAId, thread.dmUserBId].filter(Boolean);
    if (!memberIds.includes(session!.user.id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else if (thread.channel?.community.organizationId !== orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const messages = await prisma.chatMessage.findMany({
    where: { threadId },
    orderBy: { createdAt: "asc" },
    take: 100,
    include: { author: { select: { name: true, email: true, id: true, image: true } } },
  });

  const reactions = await prisma.chatReaction.findMany({
    where: { messageId: { in: messages.map((m) => m.id) } },
  });
  const reactionsByMsg: Record<string, { emoji: string; userId: string }[]> = {};
  reactions.forEach((r) => {
    if (!reactionsByMsg[r.messageId]) reactionsByMsg[r.messageId] = [];
    reactionsByMsg[r.messageId].push({ emoji: r.emoji, userId: r.userId });
  });

  return NextResponse.json(
    messages.map((m) => ({
      ...m,
      content: m.encrypted && m.content ? decrypt(m.content) : m.content,
      reactions: reactionsByMsg[m.id] || [],
    }))
  );
}

export async function POST(req: Request) {
  const { session, error } = await requireSession();
  if (error) return error;
  const orgId = session!.user.organizationId;
  if (!orgId) return NextResponse.json({ error: "No organization selected" }, { status: 400 });
  const role = session!.user.role as UserRole;
  if (!canPerform(role, "postDiscussion")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { threadId, content, attachmentPath, attachmentName, attachmentMime } =
    body;

  if (!threadId) {
    return NextResponse.json({ error: "threadId required" }, { status: 400 });
  }
  if (!content?.trim() && !attachmentPath) {
    return NextResponse.json({ error: "Message or attachment required" }, { status: 400 });
  }

  const thread = await prisma.chatThread.findUnique({
    where: { id: threadId },
    include: { channel: { include: { community: true } } },
  });
  if (!thread) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }
  if (thread.type === "dm") {
    const memberIds = [thread.dmUserAId, thread.dmUserBId].filter(Boolean);
    if (!memberIds.includes(session!.user.id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else if (thread.channel?.community.organizationId !== orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (
    thread.channel &&
    !canPostInChannel(thread.channel, session!.user.id, role)
  ) {
    return NextResponse.json(
      {
        error:
          "Only the channel owner or channel admins can post in Announcements. Members may react only.",
      },
      { status: 403 }
    );
  }

  const textContent = (content || "").trim();

  const msg = await prisma.chatMessage.create({
    data: {
      threadId,
      authorId: session!.user.id,
      content: textContent ? encrypt(textContent) : "",
      attachmentPath: attachmentPath || null,
      attachmentName: attachmentName || null,
      attachmentMime: attachmentMime || null,
      encrypted: !!textContent,
    },
    include: { author: { select: { name: true, email: true, id: true, image: true } } },
  });

  await prisma.chatThread.update({
    where: { id: threadId },
    data: { updatedAt: new Date() },
  });

  await prisma.activityLog.create({
    data: {
      action: "CHAT_MESSAGE",
      details: attachmentPath ? "Sent attachment" : "Sent message",
      userId: session!.user.id,
      organizationId: session!.user.organizationId,
    },
  });

  return NextResponse.json({
    ...msg,
    content: textContent,
  });
}

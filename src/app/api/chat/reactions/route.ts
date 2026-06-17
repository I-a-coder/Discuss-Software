import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-auth";

export async function POST(req: Request) {
  const { session, error } = await requireSession();
  if (error) return error;
  const { messageId, emoji } = await req.json();
  if (!messageId || !emoji) {
    return NextResponse.json({ error: "messageId and emoji required" }, { status: 400 });
  }

  await prisma.chatReaction.upsert({
    where: {
      messageId_userId_emoji: {
        messageId,
        userId: session!.user.id,
        emoji,
      },
    },
    create: { messageId, userId: session!.user.id, emoji },
    update: {},
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { session, error } = await requireSession();
  if (error) return error;
  const messageId = new URL(req.url).searchParams.get("messageId");
  const emoji = new URL(req.url).searchParams.get("emoji");
  if (!messageId || !emoji) {
    return NextResponse.json({ error: "messageId and emoji required" }, { status: 400 });
  }

  await prisma.chatReaction.deleteMany({
    where: { messageId, userId: session!.user.id, emoji },
  });
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-auth";

/**
 * POST /api/meetings/invite
 * Body: { roomCode: string; meetingLink: string; title: string; participantIds: string[] }
 *
 * Sends each invited participant a DM with the meeting link.
 */
export async function POST(req: Request) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { roomCode, meetingLink, title, participantIds } = await req.json();
  if (!roomCode || !meetingLink || !Array.isArray(participantIds)) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const callerId   = session!.user.id;
  const callerName = session!.user.name || session!.user.email || "Someone";

  const inviteText =
    `📹 **${callerName}** invited you to join a meeting: **${title || "Team Meeting"}**\n` +
    `Join here: ${meetingLink}\n` +
    `Room code: \`${roomCode}\``;

  const results: { userId: string; threadId: string }[] = [];

  for (const targetId of participantIds) {
    if (targetId === callerId) continue;

    // Get or create DM thread between caller ↔ target
    const [userA, userB] = [callerId, targetId].sort();
    let thread = await prisma.chatThread.findFirst({
      where: { dmUserAId: userA, dmUserBId: userB },
    });
    if (!thread) {
      thread = await prisma.chatThread.create({
        data: { type: "dm", dmUserAId: userA, dmUserBId: userB },
      });
    }

    await prisma.chatMessage.create({
      data: {
        threadId:  thread.id,
        authorId:  callerId,
        content:   inviteText,
        encrypted: false,
      },
    });

    results.push({ userId: targetId, threadId: thread.id });
  }

  return NextResponse.json({ ok: true, invited: results.length });
}

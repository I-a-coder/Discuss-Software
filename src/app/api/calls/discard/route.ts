import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { getRoom, removeRoom } from "@/lib/meeting-store";
import { cancelCall } from "@/lib/call-store";

/**
 * POST /api/calls/discard
 * Called when a call is cancelled or times out with no answer.
 * Deletes the meeting record if nobody ever joined (startedAt unchanged from creation).
 */
export async function POST(req: Request) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const { roomCode } = body as { roomCode?: string };

  // Always cancel any active outgoing call for this user
  cancelCall(session!.user.id);

  if (!roomCode) {
    return NextResponse.json({ ok: true, discarded: false });
  }

  const code = roomCode.toUpperCase();

  try {
    const meeting = await prisma.meeting.findUnique({ where: { roomCode: code } });

    if (!meeting) {
      return NextResponse.json({ ok: true, discarded: false });
    }

    // Check if anyone ever joined: startedAt is set when 2nd participant joins.
    // If startedAt equals createdAt (within 5 seconds), no one joined — safe to delete.
    const live = getRoom(code);
    const participantCount = live?.participants.size ?? 0;
    const neverStarted =
      participantCount < 2 &&
      Math.abs(meeting.startedAt.getTime() - meeting.createdAt.getTime()) < 5000;

    if (neverStarted && meeting.status !== "ended") {
      // Hard-delete from DB — it was an unanswered call
      await prisma.meeting.delete({ where: { id: meeting.id } });
      removeRoom(code);
      return NextResponse.json({ ok: true, discarded: true });
    }

    return NextResponse.json({ ok: true, discarded: false });
  } catch (err) {
    console.error("Failed to discard meeting:", err);
    return NextResponse.json({ ok: true, discarded: false });
  }
}

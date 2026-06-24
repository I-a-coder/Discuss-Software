import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-auth";
import { getRoom, addEvent } from "@/lib/meeting-store";
import { endLiveMeeting } from "@/lib/meeting-lifecycle";

type Params = { params: Promise<{ code: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { session, error } = await requireSession();
  if (error) return error;
  const { code } = await params;
  const meeting = await prisma.meeting.findUnique({
    where: { roomCode: code.toUpperCase() },
  });
  if (!meeting) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }
  const live = getRoom(code.toUpperCase());
  return NextResponse.json({
    meeting,
    live: live
      ? {
          participantCount: live.participants.size,
          events: live.events.slice(-20),
        }
      : null,
  });
}

export async function PATCH(req: Request, { params }: Params) {
  const { session, error } = await requireSession();
  if (error) return error;
  const { code } = await params;
  const roomCode = code.toUpperCase();
  const body = await req.json();
  const action = body.action as string;

  const meeting = await prisma.meeting.findUnique({
    where: { roomCode },
  });
  if (!meeting) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  if (action === "end") {
    const live = getRoom(roomCode);
    if (live) {
      addEvent(roomCode, `${session!.user.name || "User"} ended the meeting`);
    }
    const result = await endLiveMeeting(
      roomCode,
      session!.user.id,
      session!.user.name || "User",
      session!.user.organizationId
    );
    return NextResponse.json({
      meeting: result.meeting,
      minutes: result.minutes,
    });
  }

  if (action === "recording") {
    const meta = JSON.stringify({
      size: body.size,
      duration: body.duration,
      savedAt: new Date().toISOString(),
    });
    const transcriptExtra =
      (body.transcriptSnippet as string) ||
      `Recording saved (${body.duration || "?"}s).`;

    const live = getRoom(roomCode);
    if (live) {
      live.events.push(`[${new Date().toISOString()}] Recording saved`);
      if (body.transcriptSnippet) {
        live.events.push(body.transcriptSnippet);
      }
    }

    const updated = await prisma.meeting.update({
      where: { id: meeting.id },
      data: {
        recordingMeta: meta,
        transcript: meeting.transcript
          ? `${meeting.transcript}\n\n${transcriptExtra}`
          : transcriptExtra,
      },
    });

    return NextResponse.json({ meeting: updated });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export async function DELETE(req: Request, { params }: Params) {
  const { session, error } = await requireSession();
  if (error) return error;
  const { code } = await params;

  try {
    const meeting = await prisma.meeting.findFirst({
      where: {
        OR: [
          { id: code },
          { roomCode: code.toUpperCase() },
        ],
      },
    });

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    // Allow host or any owner, admin, or member of the same organization to delete
    const orgId = session!.user.organizationId;
    const isHost = meeting.hostId === session!.user.id;
    const isSameOrg = !!(orgId && meeting.organizationId === orgId);
    const isAllowedRole = ["OWNER", "ADMIN", "MEMBER"].includes(session!.user.role);

    if (!isAllowedRole || (!isHost && !isSameOrg)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Record that this user deleted/hid the meeting from their profile/history
    await prisma.deletedMeeting.upsert({
      where: {
        userId_meetingId: {
          userId: session!.user.id,
          meetingId: meeting.id,
        },
      },
      create: {
        userId: session!.user.id,
        meetingId: meeting.id,
      },
      update: {},
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Failed to delete meeting:", err);
    return NextResponse.json({ error: "Failed to delete meeting" }, { status: 500 });
  }
}

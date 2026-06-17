import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-auth";
import { canPerform } from "@/lib/permissions";
import type { UserRole } from "@/lib/permissions";
import { generateRoomCode, buildMeetingLink } from "@/lib/meeting-utils";
import { getOrCreateRoom, addEvent } from "@/lib/meeting-store";
import { encrypt } from "@/lib/encryption";

export async function GET() {
  const { session, error } = await requireSession();
  if (error) return error;
  const orgId = session!.user.organizationId;
  const meetings = await prisma.meeting.findMany({
    where: orgId
      ? {
          OR: [{ hostId: session!.user.id }, { organizationId: orgId }],
        }
      : { hostId: session!.user.id },
    orderBy: { startedAt: "desc" },
    take: 30,
  });
  return NextResponse.json(meetings);
}

export async function POST(req: Request) {
  const { session, error } = await requireSession();
  if (error) return error;
  const role = session!.user.role as UserRole;
  if (!canPerform(role, "takeMeetingNotes")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const title = (body.title as string) || "Team Meeting";
  const roomCode = generateRoomCode();
  const meetingLink = buildMeetingLink(roomCode);

  const meeting = await prisma.meeting.create({
    data: {
      roomCode,
      title,
      meetingLink,
      hostId: session!.user.id,
      organizationId: session!.user.organizationId,
      status: "live",
    },
  });

  getOrCreateRoom(roomCode, session!.user.id);
  addEvent(
    roomCode,
    `${session!.user.name || "Host"} started meeting "${title}"`
  );

  await prisma.meetingNote.create({
    data: {
      title: `${title} (live)`,
      content: encrypt(`Meeting started.\nLink: ${meetingLink}\n`),
      summary: encrypt("Live session — AI minutes available after the call."),
      meetingLink,
      meetingId: meeting.id,
      encrypted: true,
      authorId: session!.user.id,
    },
  });

  await prisma.activityLog.create({
    data: {
      action: "MEETING_STARTED",
      details: `${title} · ${roomCode}`,
      userId: session!.user.id,
      organizationId: session!.user.organizationId,
    },
  });

  return NextResponse.json({ ...meeting, roomCode, meetingLink });
}

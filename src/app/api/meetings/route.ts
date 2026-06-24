import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-auth";
import { canPerform } from "@/lib/permissions";
import type { UserRole } from "@/lib/permissions";
import { generateRoomCode, buildMeetingLink } from "@/lib/meeting-utils";
import { getOrCreateRoom, addEvent } from "@/lib/meeting-store";
import { encrypt } from "@/lib/encryption";
import {
  getAnyConnection,
  getCalendarProvider,
  handleCalendarError,
} from "@/lib/calendar";
import { rateLimit } from "@/lib/rate-limit";

export async function GET() {
  const { session, error } = await requireSession();
  if (error) return error;

  // Find all meeting IDs deleted/hidden by the current user
  const deletedMeetings = await prisma.deletedMeeting.findMany({
    where: { userId: session!.user.id },
    select: { meetingId: true },
  });
  const deletedIds = deletedMeetings.map((dm) => dm.meetingId);

  const orgId = session!.user.organizationId;
  const meetings = await prisma.meeting.findMany({
    where: {
      AND: [
        orgId
          ? {
              OR: [{ hostId: session!.user.id }, { organizationId: orgId }],
            }
          : { hostId: session!.user.id },
        {
          id: {
            notIn: deletedIds,
          },
        },
      ],
    },
    orderBy: { startedAt: "desc" },
    take: 30,
  });
  return NextResponse.json(meetings);
}

export async function POST(req: Request) {
  const { session, error } = await requireSession();
  if (error) return error;
  // Rate limit: max 10 meetings created per hour
  const limited = rateLimit(session!.user.id, { max: 10, windowMs: 60 * 60_000, label: "meetings" });
  if (limited) return limited;
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

  // ── Calendar sync: create a 1-hour placeholder event for live meetings ──
  const calConnection = await getAnyConnection(session!.user.id);
  let calendarEventCreated = false;
  if (calConnection) {
    try {
      const now   = new Date();
      const endAt = new Date(now.getTime() + 60 * 60 * 1000);
      const calProvider = getCalendarProvider(calConnection);
      const externalEventId = await calProvider.createEvent({
        title,
        description: `Yusi Discuss live meeting\nRoom code: ${roomCode}`,
        startAt: now,
        endAt,
        joinUrl: meetingLink,
        attendeeEmails: [],
        organizerEmail: session!.user.email,
      });
      await prisma.calendarEventSync.create({
        data: {
          meetingId: meeting.id,
          provider: calConnection.provider,
          externalEventId,
          organizerUserId: session!.user.id,
        },
      });
      calendarEventCreated = true;
    } catch (err) {
      await handleCalendarError(err, session!.user.id, calConnection.provider);
    }
  }
  // ──────────────────────────────────────────────────────────────────────

  return NextResponse.json({ ...meeting, roomCode, meetingLink, calendarEventCreated });
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-auth";
import { generateRoomCode, buildMeetingLink } from "@/lib/meeting-utils";
import {
  getAnyConnection,
  getCalendarProvider,
  handleCalendarError,
} from "@/lib/calendar";

const MAX_DAYS_AHEAD = 7;

export async function GET() {
  const { session, error } = await requireSession();
  if (error) return error;

  const meetings = await prisma.scheduledMeeting.findMany({
    where: {
      OR: [
        { hostId: session!.user.id },
        { organizationId: session!.user.organizationId ?? undefined },
      ],
      scheduledAt: { gte: new Date() },
    },
    orderBy: { scheduledAt: "asc" },
    take: 50,
  });

  // Fetch attendee names for org members
  const enriched = await Promise.all(
    meetings.map(async (m: typeof meetings[number]) => {
      const userIds: string[] = JSON.parse(m.attendeeUserIds || "[]");
      let attendeeNames: { id: string; name: string | null; email: string }[] = [];
      if (userIds.length > 0) {
        attendeeNames = await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, email: true },
        });
      }
      return {
        ...m,
        attendeeUserIds: userIds,
        attendeeEmails: JSON.parse(m.attendeeEmails || "[]"),
        attendees: attendeeNames,
      };
    })
  );

  return NextResponse.json(enriched);
}

export async function POST(req: Request) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const { title, scheduledAt, attendeeUserIds = [], attendeeEmails = [] } = body;

  if (!scheduledAt) {
    return NextResponse.json({ error: "scheduledAt is required" }, { status: 400 });
  }

  const scheduled = new Date(scheduledAt);
  const now = new Date();
  const maxDate = new Date(now.getTime() + MAX_DAYS_AHEAD * 24 * 60 * 60 * 1000);

  if (scheduled <= now) {
    return NextResponse.json({ error: "Scheduled time must be in the future" }, { status: 400 });
  }
  if (scheduled > maxDate) {
    return NextResponse.json({ error: "Scheduled time cannot be more than 7 days ahead" }, { status: 400 });
  }

  const roomCode = generateRoomCode();
  const meetingLink = buildMeetingLink(roomCode);

  const meeting = await prisma.scheduledMeeting.create({
    data: {
      title: title || "Scheduled Meeting",
      roomCode,
      meetingLink,
      scheduledAt: scheduled,
      hostId: session!.user.id,
      organizationId: session!.user.organizationId ?? null,
      attendeeUserIds: JSON.stringify(attendeeUserIds),
      attendeeEmails: JSON.stringify(attendeeEmails),
    },
  });

  const callerName = session!.user.name || session!.user.email || "Someone";
  const scheduledStr = scheduled.toLocaleString();

  // Send DM invites to org member attendees
  for (const targetId of attendeeUserIds as string[]) {
    if (targetId === session!.user.id) continue;
    const [userA, userB] = [session!.user.id, targetId].sort();
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
        threadId: thread.id,
        authorId: session!.user.id,
        content:
          `📅 **${callerName}** has scheduled a meeting: **${title || "Scheduled Meeting"}**\n` +
          `🕐 When: ${scheduledStr}\n` +
          `🔗 Join here: ${meetingLink}\n` +
          `Room code: \`${roomCode}\``,
        encrypted: false,
      },
    });
  }

  // For external emails: log what would be sent (email provider needed for real delivery)
  const emails = attendeeEmails as string[];
  if (emails.length > 0) {
    console.log(
      "[ScheduledMeeting] External email notifications (configure SMTP to deliver):",
      emails.map((email: string) => ({
        to: email,
        subject: `You're invited to a meeting: ${title || "Scheduled Meeting"}`,
        body: `${callerName} has invited you to join a meeting.\n\nWhen: ${scheduledStr}\nJoin: ${meetingLink}\n\nNote: You need a Yusi Discuss account to join this meeting.`,
      }))
    );
  }

  await prisma.activityLog.create({
    data: {
      action: "MEETING_SCHEDULED",
      details: `${title || "Scheduled Meeting"} · ${roomCode} · ${scheduledStr}`,
      userId: session!.user.id,
      organizationId: session!.user.organizationId ?? null,
    },
  });

  // ── Calendar sync ──────────────────────────────────────────────────────────
  // Only the organizer needs a connected calendar. Invitees receive the invite
  // automatically from the provider (Google / Microsoft sends it to all attendees).
  let calendarEventCreated = false;
  const connection = await getAnyConnection(session!.user.id);
  if (connection) {
    try {
      // Resolve email addresses for org-member attendees
      const memberEmails: string[] = [];
      if ((attendeeUserIds as string[]).length > 0) {
        const members = await prisma.user.findMany({
          where: { id: { in: attendeeUserIds as string[] } },
          select: { email: true },
        });
        memberEmails.push(...members.map((m) => m.email));
      }
      const allEmails = [...new Set([...memberEmails, ...(emails as string[])])];

      const organizerEmail = session!.user.email;
      const endAt = new Date(scheduled.getTime() + 60 * 60 * 1000); // +1 hour default

      const provider = getCalendarProvider(connection);
      const externalEventId = await provider.createEvent({
        title: title || "Scheduled Meeting",
        description: `Yusi Discuss scheduled meeting\nRoom code: ${roomCode}`,
        startAt: scheduled,
        endAt,
        joinUrl: meetingLink,
        attendeeEmails: allEmails,
        organizerEmail,
      });

      await prisma.calendarEventSync.create({
        data: {
          scheduledMeetingId: meeting.id,
          provider: connection.provider,
          externalEventId,
          organizerUserId: session!.user.id,
        },
      });
      calendarEventCreated = true;
    } catch (err) {
      await handleCalendarError(err, session!.user.id, connection.provider);
    }
  }
  // ──────────────────────────────────────────────────────────────────────────

  return NextResponse.json({
    ...meeting,
    attendeeUserIds: attendeeUserIds,
    attendeeEmails: attendeeEmails,
    dmsSent: attendeeUserIds.length,
    emailsQueued: emails.length,
    calendarEventCreated,
    calendarProvider: calendarEventCreated ? connection?.provider ?? null : null,
  });
}

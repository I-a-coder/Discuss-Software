import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-auth";
import {
  getAnyConnection,
  getCalendarProvider,
  handleCalendarError,
} from "@/lib/calendar";

// ── DELETE — cancel a scheduled meeting ───────────────────────────────────

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { id } = await params;

  const meeting = await prisma.scheduledMeeting.findUnique({ where: { id } });
  if (!meeting) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (meeting.hostId !== session!.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ── Calendar sync: cancel the external event before deleting the row ──
  const sync = await prisma.calendarEventSync.findFirst({
    where: { scheduledMeetingId: id },
  });
  if (sync) {
    const connection = await getAnyConnection(session!.user.id);
    if (connection) {
      try {
        const provider = getCalendarProvider(connection);
        await provider.cancelEvent(sync.externalEventId);
      } catch (err) {
        await handleCalendarError(err, session!.user.id, connection.provider);
      }
    }
    // Remove the sync record regardless
    await prisma.calendarEventSync.deleteMany({
      where: { scheduledMeetingId: id },
    });
  }
  // ──────────────────────────────────────────────────────────────────────

  await prisma.scheduledMeeting.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

// ── PATCH — edit title / time of a scheduled meeting ─────────────────────

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { id } = await params;

  const meeting = await prisma.scheduledMeeting.findUnique({ where: { id } });
  if (!meeting) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (meeting.hostId !== session!.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { title, scheduledAt } = body as { title?: string; scheduledAt?: string };

  const updateData: { title?: string; scheduledAt?: Date } = {};
  if (title)       updateData.title       = title;
  if (scheduledAt) updateData.scheduledAt = new Date(scheduledAt);

  const updated = await prisma.scheduledMeeting.update({
    where: { id },
    data: updateData,
  });

  // ── Calendar sync: propagate the edit to the external event ──
  const sync = await prisma.calendarEventSync.findFirst({
    where: { scheduledMeetingId: id },
  });
  if (sync) {
    const connection = await getAnyConnection(session!.user.id);
    if (connection) {
      try {
        const provider = getCalendarProvider(connection);
        const newStart = updateData.scheduledAt ?? meeting.scheduledAt;
        const newEnd   = new Date(newStart.getTime() + 60 * 60 * 1000);
        await provider.updateEvent(sync.externalEventId, {
          ...(updateData.title ? { title: updateData.title } : {}),
          ...(updateData.scheduledAt
            ? { startAt: newStart, endAt: newEnd }
            : {}),
        });
      } catch (err) {
        await handleCalendarError(err, session!.user.id, connection.provider);
      }
    }
  }
  // ──────────────────────────────────────────────────────────────────────

  return NextResponse.json(updated);
}

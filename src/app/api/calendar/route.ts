import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-auth";

export async function GET(req: Request) {
  const { session, error } = await requireSession();
  if (error) return error;
  const month = new URL(req.url).searchParams.get("month");

  let dateFilter = {};
  if (month) {
    const [y, m] = month.split("-").map(Number);
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0, 23, 59, 59);
    dateFilter = { eventDate: { gte: start, lte: end } };
  }

  const events = await prisma.calendarEvent.findMany({
    where: {
      userId: session!.user.id,
      ...dateFilter,
    },
    orderBy: { eventDate: "asc" },
  });
  return NextResponse.json(events);
}

export async function POST(req: Request) {
  const { session, error } = await requireSession();
  if (error) return error;
  const body = await req.json();
  const { title, eventDate, stickyNote, color, remindAt } = body;

  const event = await prisma.calendarEvent.create({
    data: {
      title: title || "Important date",
      eventDate: new Date(eventDate),
      stickyNote: stickyNote || null,
      color: color || "#FEF3C7",
      remindAt: remindAt ? new Date(remindAt) : null,
      userId: session!.user.id,
      organizationId: session!.user.organizationId,
    },
  });

  await prisma.activityLog.create({
    data: {
      action: "CALENDAR_EVENT",
      details: event.title,
      userId: session!.user.id,
      organizationId: session!.user.organizationId,
    },
  });

  return NextResponse.json(event);
}

export async function PATCH(req: Request) {
  const { session, error } = await requireSession();
  if (error) return error;
  const body = await req.json();
  const { id, ...data } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const existing = await prisma.calendarEvent.findFirst({
    where: { id, userId: session!.user.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const event = await prisma.calendarEvent.update({
    where: { id },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.eventDate !== undefined && { eventDate: new Date(data.eventDate) }),
      ...(data.stickyNote !== undefined && { stickyNote: data.stickyNote }),
      ...(data.color !== undefined && { color: data.color }),
      ...(data.remindAt !== undefined && {
        remindAt: data.remindAt ? new Date(data.remindAt) : null,
        reminded: false,
      }),
    },
  });
  return NextResponse.json(event);
}

export async function DELETE(req: Request) {
  const { session, error } = await requireSession();
  if (error) return error;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await prisma.calendarEvent.deleteMany({
    where: { id, userId: session!.user.id },
  });
  return NextResponse.json({ ok: true });
}

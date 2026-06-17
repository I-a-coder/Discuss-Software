import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-auth";

/** Returns due reminders and marks them as reminded */
export async function GET() {
  const { session, error } = await requireSession();
  if (error) return error;
  const now = new Date();

  const due = await prisma.calendarEvent.findMany({
    where: {
      userId: session!.user.id,
      remindAt: { lte: now },
      reminded: false,
    },
    orderBy: { remindAt: "asc" },
    take: 10,
  });

  if (due.length > 0) {
    await prisma.calendarEvent.updateMany({
      where: { id: { in: due.map((e) => e.id) } },
      data: { reminded: true },
    });
  }

  return NextResponse.json(due);
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-auth";
import { canPerform } from "@/lib/permissions";
import type { UserRole } from "@/lib/permissions";

export async function GET(req: Request) {
  const { session, error } = await requireSession();
  if (error) return error;
  const meetingId = new URL(req.url).searchParams.get("meetingId");
  if (!meetingId) {
    return NextResponse.json({ error: "meetingId required" }, { status: 400 });
  }

  const role = session!.user.role as UserRole;
  const meeting = await prisma.meeting.findUnique({ where: { id: meetingId } });
  const reviews = await prisma.meetingReview.findMany({
    where: { meetingId },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });

  const avg =
    reviews.length > 0
      ? reviews.reduce((s, r) => s + r.stars, 0) / reviews.length
      : 0;

  const mine = reviews.find((r) => r.userId === session!.user.id);

  return NextResponse.json({
    reviews: canPerform(role, "viewMeetingReviews") ? reviews : [],
    average: avg,
    count: reviews.length,
    mine,
    meetingLink: meeting?.meetingLink || null,
    meetingTitle: meeting?.title || null,
  });
}

export async function POST(req: Request) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { meetingId, stars, comment } = await req.json();
  if (!meetingId || !stars || stars < 1 || stars > 5) {
    return NextResponse.json({ error: "Valid meetingId and stars (1-5) required" }, { status: 400 });
  }

  const meeting = await prisma.meeting.findUnique({ where: { id: meetingId } });
  if (!meeting) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  const review = await prisma.meetingReview.upsert({
    where: {
      meetingId_userId: { meetingId, userId: session!.user.id },
    },
    create: {
      meetingId,
      userId: session!.user.id,
      stars: Math.round(stars),
      comment: comment?.trim() || null,
    },
    update: {
      stars: Math.round(stars),
      comment: comment?.trim() || null,
    },
  });

  await prisma.activityLog.create({
    data: {
      action: "MEETING_REVIEWED",
      details: `${stars} stars for ${meeting.title}`,
      userId: session!.user.id,
      organizationId: session!.user.organizationId,
    },
  });

  return NextResponse.json(review);
}

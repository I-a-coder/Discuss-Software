import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-auth";
import { canPerform } from "@/lib/permissions";
import type { UserRole } from "@/lib/permissions";

export async function GET() {
  const { session, error } = await requireSession();
  if (error) return error;
  const role = session!.user.role as UserRole;
  const orgId = session!.user.organizationId;

  const where = canPerform(role, "viewConcerns")
    ? orgId
      ? { organizationId: orgId }
      : {}
    : { userId: session!.user.id };

  const reports = await prisma.concernReport.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      user: { select: { name: true, email: true } },
    },
  });
  return NextResponse.json(reports);
}

export async function POST(req: Request) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { category, subject, description } = await req.json();
  if (!subject?.trim() || !description?.trim()) {
    return NextResponse.json({ error: "Subject and description required" }, { status: 400 });
  }

  const report = await prisma.concernReport.create({
    data: {
      category: category || "feedback",
      subject: subject.trim(),
      description: description.trim(),
      userId: session!.user.id,
      organizationId: session!.user.organizationId,
      status: "open",
    },
  });

  await prisma.activityLog.create({
    data: {
      action: "CONCERN_REPORTED",
      details: `${report.category}: ${report.subject}`,
      userId: session!.user.id,
      organizationId: session!.user.organizationId,
    },
  });

  return NextResponse.json(report);
}

export async function PATCH(req: Request) {
  const { session, error } = await requireSession();
  if (error) return error;
  const role = session!.user.role as UserRole;
  if (!canPerform(role, "viewConcerns")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id, status } = await req.json();
  const report = await prisma.concernReport.update({
    where: { id },
    data: { status: status || "resolved" },
  });
  return NextResponse.json(report);
}

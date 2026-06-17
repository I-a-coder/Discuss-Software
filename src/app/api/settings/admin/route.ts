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
  if (!orgId) return NextResponse.json({ error: "No organization selected" }, { status: 400 });
  if (!canPerform(role, "manageTeam")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [org, userCounts, communities, activeMeetings, concernsOpen, logs] =
    await Promise.all([
      prisma.organization.findUnique({
        where: { id: orgId },
        select: { id: true, name: true, slug: true, createdAt: true },
      }),
      prisma.user.groupBy({
        by: ["role"],
        where: { organizationId: orgId },
        _count: { role: true },
      }),
      prisma.community.count({ where: { organizationId: orgId } }),
      prisma.meeting.count({
        where: { organizationId: orgId, status: { in: ["live", "active"] } },
      }),
      prisma.concernReport.count({ where: { organizationId: orgId, status: "open" } }),
      prisma.activityLog.findMany({
        where: { organizationId: orgId },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { user: { select: { name: true, email: true } } },
      }),
    ]);

  return NextResponse.json({
    organization: org,
    counts: {
      usersByRole: userCounts,
      communities,
      activeMeetings,
      concernsOpen,
    },
    security: {
      encryptionKeyConfigured: !!process.env.ENCRYPTION_KEY,
      aiApiConfigured: !!(process.env.AI_API_KEY || process.env.OPENAI_API_KEY),
      googleAuthConfigured:
        !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET,
      strictMode: process.env.NODE_ENV === "production",
    },
    recentActivity: logs,
  });
}

export async function PATCH(req: Request) {
  const { session, error } = await requireSession();
  if (error) return error;
  const role = session!.user.role as UserRole;
  const orgId = session!.user.organizationId;
  if (!orgId) return NextResponse.json({ error: "No organization selected" }, { status: 400 });
  if (!canPerform(role, "manageTeam")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { organizationName } = await req.json();
  const name = String(organizationName || "").trim();
  if (name.length < 2) {
    return NextResponse.json({ error: "Organization name must be at least 2 chars" }, { status: 400 });
  }

  const updated = await prisma.organization.update({
    where: { id: orgId },
    data: { name: name.slice(0, 80) },
    select: { id: true, name: true },
  });

  await prisma.activityLog.create({
    data: {
      action: "ORG_SETTINGS_UPDATED",
      details: "Organization name updated",
      userId: session!.user.id,
      organizationId: orgId,
    },
  });

  return NextResponse.json({ organization: updated });
}


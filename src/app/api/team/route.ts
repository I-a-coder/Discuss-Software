import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-auth";
import { canPerform } from "@/lib/permissions";
import type { UserRole } from "@/lib/permissions";

export async function GET() {
  const { session, error } = await requireSession();
  if (error) return error;
  const orgId = session!.user.organizationId;
  if (!orgId) return NextResponse.json([]);
  const users = await prisma.user.findMany({
    where: { organizationId: orgId },
    select: { id: true, name: true, email: true, role: true, image: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(users);
}

export async function PATCH(req: Request) {
  const { session, error } = await requireSession();
  if (error) return error;
  const role = session!.user.role as UserRole;
  if (!canPerform(role, "changeRoles")) {
    return NextResponse.json({ error: "Only owners can change roles" }, { status: 403 });
  }
  const { userId, newRole } = await req.json();
  const orgId = session!.user.organizationId;
  if (!orgId) {
    return NextResponse.json({ error: "Organization not found" }, { status: 400 });
  }
  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, organizationId: true, role: true },
  });
  if (!target || target.organizationId !== orgId) {
    return NextResponse.json({ error: "User not in your organization" }, { status: 403 });
  }
  if (target.id === session!.user.id && newRole !== "OWNER") {
    return NextResponse.json({ error: "Owner cannot demote self" }, { status: 400 });
  }
  if (target.role === "OWNER" && newRole !== "OWNER") {
    const owners = await prisma.user.count({
      where: { organizationId: orgId, role: "OWNER" },
    });
    if (owners <= 1) {
      return NextResponse.json(
        { error: "At least one owner is required in the organization" },
        { status: 400 }
      );
    }
  }
  const user = await prisma.user.update({
    where: { id: userId },
    data: { role: newRole },
  });
  await prisma.activityLog.create({
    data: {
      action: "ROLE_CHANGED",
      details: `Role set to ${newRole}`,
      userId: session!.user.id,
      organizationId: session!.user.organizationId,
    },
  });
  return NextResponse.json(user);
}

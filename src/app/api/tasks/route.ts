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
  const tasks = await prisma.task.findMany({
    where: { organizationId: orgId },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      comments: { orderBy: { createdAt: "asc" } },
    },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(tasks);
}

export async function POST(req: Request) {
  const { session, error } = await requireSession();
  if (error) return error;
  const role = session!.user.role as UserRole;
  if (!canPerform(role, "createTask")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const orgId = session!.user.organizationId;
  if (!orgId) {
    return NextResponse.json({ error: "No organization" }, { status: 400 });
  }
  const body = await req.json();
  const task = await prisma.task.create({
    data: {
      title: body.title,
      description: body.description,
      status: body.status || "TODO",
      color: body.color || "#FEF3C7",
      dueAt: body.dueAt ? new Date(body.dueAt) : null,
      assigneeId: body.assigneeId || null,
      creatorId: session!.user.id,
      organizationId: orgId,
    },
    include: { assignee: true, comments: true },
  });
  await prisma.activityLog.create({
    data: {
      action: "TASK_CREATED",
      details: task.title,
      userId: session!.user.id,
      organizationId: orgId,
    },
  });
  return NextResponse.json(task);
}

export async function PATCH(req: Request) {
  const { session, error } = await requireSession();
  if (error) return error;
  const role = session!.user.role as UserRole;
  const body = await req.json();
  const existing = await prisma.task.findUnique({ where: { id: body.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const isOwn = existing.creatorId === session!.user.id;
  if (!canPerform(role, "editAnyTask") && !isOwn) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const task = await prisma.task.update({
    where: { id: body.id },
    data: {
      title: body.title,
      description: body.description,
      status: body.status,
      color: body.color,
      dueAt: body.dueAt !== undefined ? (body.dueAt ? new Date(body.dueAt) : null) : undefined,
      assigneeId: body.assigneeId !== undefined ? body.assigneeId : undefined,
    },
    include: { assignee: true, comments: true },
  });
  return NextResponse.json(task);
}

export async function DELETE(req: Request) {
  const { session, error } = await requireSession();
  if (error) return error;
  const role = session!.user.role as UserRole;
  const { id } = await req.json();
  const existing = await prisma.task.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const isOwn = existing.creatorId === session!.user.id;
  if (!canPerform(role, "deleteTask") && !isOwn) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await prisma.task.delete({ where: { id } });
  await prisma.activityLog.create({
    data: {
      action: "TASK_DELETED",
      details: existing.title,
      userId: session!.user.id,
      organizationId: session!.user.organizationId,
    },
  });
  return NextResponse.json({ ok: true });
}


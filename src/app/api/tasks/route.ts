import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-auth";
import { canPerform } from "@/lib/permissions";
import type { UserRole } from "@/lib/permissions";
import { sendAssignmentEmail } from "@/lib/email";

const APP_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

/** Fetches full User records for a list of ids (only those that exist). */
async function getUsersByIds(ids: string[]) {
  if (!ids.length) return [];
  return prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, email: true },
  });
}

/** Sends assignment emails to newly-added assignees. */
async function notifyNewAssignees(
  newIds: string[],
  assigner: { name: string | null; email: string },
  task: {
    id: string;
    title: string;
    description: string | null;
    status: string;
    color: string;
    dueAt: Date | null;
  }
) {
  if (!newIds.length) return;
  const users = await getUsersByIds(newIds);
  await Promise.all(
    users.map((u) =>
      sendAssignmentEmail({
        assignee: u,
        assigner,
        task,
        appUrl: APP_URL,
      })
    )
  );
}

export async function GET() {
  const { session, error } = await requireSession();
  if (error) return error;
  const orgId = session!.user.organizationId;
  if (!orgId) return NextResponse.json([]);

  const tasks = await prisma.task.findMany({
    where: { organizationId: orgId },
    include: {
      assignees: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
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
  const assigneeIds: string[] = Array.isArray(body.assigneeIds)
    ? body.assigneeIds.filter(Boolean)
    : body.assigneeId
    ? [body.assigneeId]
    : [];

  const task = await prisma.task.create({
    data: {
      title: body.title,
      description: body.description,
      status: body.status || "TODO",
      color: body.color || "#FEF3C7",
      dueAt: body.dueAt ? new Date(body.dueAt) : null,
      creatorId: session!.user.id,
      organizationId: orgId,
      assignees: {
        create: assigneeIds.map((userId) => ({ userId })),
      },
    },
    include: {
      assignees: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      comments: true,
    },
  });

  await prisma.activityLog.create({
    data: {
      action: "TASK_CREATED",
      details: task.title,
      userId: session!.user.id,
      organizationId: orgId,
    },
  });

  // Send emails to all assignees on creation
  const assigner = { name: session!.user.name ?? null, email: session!.user.email! };
  await notifyNewAssignees(assigneeIds, assigner, {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    color: task.color,
    dueAt: task.dueAt,
  });

  return NextResponse.json(task);
}

export async function PATCH(req: Request) {
  const { session, error } = await requireSession();
  if (error) return error;
  const role = session!.user.role as UserRole;
  const body = await req.json();

  const existing = await prisma.task.findUnique({
    where: { id: body.id },
    include: { assignees: { select: { userId: true } } },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isOwn = existing.creatorId === session!.user.id;
  if (!canPerform(role, "editAnyTask") && !isOwn) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Resolve new assignee list (support both formats)
  let newAssigneeIds: string[] | undefined;
  if (body.assigneeIds !== undefined) {
    newAssigneeIds = Array.isArray(body.assigneeIds)
      ? body.assigneeIds.filter(Boolean)
      : [];
  } else if (body.assigneeId !== undefined) {
    newAssigneeIds = body.assigneeId ? [body.assigneeId] : [];
  }

  const oldIds = existing.assignees.map((a) => a.userId);

  const task = await prisma.task.update({
    where: { id: body.id },
    data: {
      title: body.title,
      description: body.description,
      status: body.status,
      color: body.color,
      dueAt:
        body.dueAt !== undefined
          ? body.dueAt
            ? new Date(body.dueAt)
            : null
          : undefined,
      ...(newAssigneeIds !== undefined && {
        assignees: {
          // Delete all existing and recreate — cleanest approach for small sets
          deleteMany: {},
          create: newAssigneeIds.map((userId) => ({ userId })),
        },
      }),
    },
    include: {
      assignees: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      comments: true,
    },
  });

  // Email only newly added assignees (not already in old list)
  if (newAssigneeIds !== undefined) {
    const brandNewIds = newAssigneeIds.filter((id) => !oldIds.includes(id));
    const assigner = { name: session!.user.name ?? null, email: session!.user.email! };
    await notifyNewAssignees(brandNewIds, assigner, {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      color: task.color,
      dueAt: task.dueAt,
    });
  }

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

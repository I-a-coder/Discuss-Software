import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-auth";
import { canPerform } from "@/lib/permissions";
import type { UserRole } from "@/lib/permissions";

export async function GET(req: Request) {
  const { session, error } = await requireSession();
  if (error) return error;

  const id = new URL(req.url).searchParams.get("id");
  if (id) {
    const snap = await prisma.whiteboardSnapshot.findUnique({ where: { id } });
    if (!snap) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(snap);
  }

  const list = await prisma.whiteboardSnapshot.findMany({
    orderBy: { createdAt: "desc" },
    take: 40,
    select: {
      id: true,
      name: true,
      authorId: true,
      createdAt: true,
    },
  });
  return NextResponse.json(list);
}

export async function POST(req: Request) {
  const { session, error } = await requireSession();
  if (error) return error;
  const role = session!.user.role as UserRole;
  if (!canPerform(role, "useWhiteboard")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { data, name, id } = await req.json();

  if (id) {
    const snap = await prisma.whiteboardSnapshot.update({
      where: { id },
      data: {
        data: JSON.stringify(data),
        name: name || "Saved Board",
      },
    });
    return NextResponse.json(snap);
  }

  const snap = await prisma.whiteboardSnapshot.create({
    data: {
      data: JSON.stringify(data),
      name: name || "Team Whiteboard",
      authorId: session!.user.id,
    },
  });
  await prisma.activityLog.create({
    data: {
      action: "WHITEBOARD_SAVED",
      details: name || "Whiteboard saved",
      userId: session!.user.id,
      organizationId: session!.user.organizationId,
    },
  });
  return NextResponse.json(snap);
}

export async function DELETE(req: Request) {
  const { session, error } = await requireSession();
  if (error) return error;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await prisma.whiteboardSnapshot.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

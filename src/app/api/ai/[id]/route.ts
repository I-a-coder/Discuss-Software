import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-auth";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { session, error } = await requireSession();
  if (error) return error;
  const { id } = await params;
  const { content } = await req.json();
  if (!content?.trim()) {
    return NextResponse.json({ error: "Content required" }, { status: 400 });
  }

  const msg = await prisma.aiChatMessage.findUnique({ where: { id } });
  if (!msg || msg.userId !== session!.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (msg.role !== "user") {
    return NextResponse.json({ error: "Only user messages can be edited" }, { status: 400 });
  }

  const updated = await prisma.aiChatMessage.update({
    where: { id },
    data: { content: content.trim() },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: Params) {
  const { session, error } = await requireSession();
  if (error) return error;
  const { id } = await params;

  const msg = await prisma.aiChatMessage.findUnique({ where: { id } });
  if (!msg || msg.userId !== session!.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.aiChatMessage.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

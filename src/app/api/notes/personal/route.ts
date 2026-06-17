import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encrypt, decrypt } from "@/lib/encryption";
import { requireSession } from "@/lib/api-auth";

export async function GET() {
  const { session, error } = await requireSession();
  if (error) return error;
  const notes = await prisma.personalNote.findMany({
    where: { userId: session!.user.id },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(
    notes.map((n) => ({
      ...n,
      content: n.encrypted ? decrypt(n.content) : n.content,
    }))
  );
}

export async function POST(req: Request) {
  const { session, error } = await requireSession();
  if (error) return error;
  const { title, content, id } = await req.json();
  if (id) {
    const note = await prisma.personalNote.update({
      where: { id, userId: session!.user.id },
      data: {
        title: title || "Untitled",
        content: encrypt(content || ""),
        encrypted: true,
      },
    });
    return NextResponse.json({ ...note, content });
  }
  const note = await prisma.personalNote.create({
    data: {
      title: title || "Untitled",
      content: encrypt(content || ""),
      encrypted: true,
      userId: session!.user.id,
    },
  });
  await prisma.activityLog.create({
    data: {
      action: "NOTE_SAVED",
      details: note.title,
      userId: session!.user.id,
    },
  });
  return NextResponse.json({ ...note, content });
}

export async function DELETE(req: Request) {
  const { session, error } = await requireSession();
  if (error) return error;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await prisma.personalNote.deleteMany({
    where: { id, userId: session!.user.id },
  });
  return NextResponse.json({ ok: true });
}

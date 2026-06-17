import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-auth";
import { saveUpload } from "@/lib/upload";

export async function POST(req: Request) {
  const { session, error } = await requireSession();
  if (error) return error;

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Image files only" }, { status: 400 });
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "Max 5MB" }, { status: 400 });
  }

  const saved = await saveUpload(
    file,
    session!.user.organizationId || "avatars"
  );

  const user = await prisma.user.update({
    where: { id: session!.user.id },
    data: { image: saved.path },
    select: { id: true, image: true, name: true, email: true },
  });

  return NextResponse.json({ user, image: saved.path });
}

export async function DELETE() {
  const { session, error } = await requireSession();
  if (error) return error;

  await prisma.user.update({
    where: { id: session!.user.id },
    data: { image: null },
  });

  return NextResponse.json({ ok: true });
}

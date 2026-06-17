import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-auth";

export async function POST(req: Request) {
  const { session, error } = await requireSession();
  if (error) return error;
  const { taskId, content } = await req.json();
  if (!taskId || !content?.trim()) {
    return NextResponse.json({ error: "Invalid" }, { status: 400 });
  }
  const comment = await prisma.taskComment.create({
    data: {
      taskId,
      content: content.trim(),
      authorName: session!.user.name || session!.user.email || "User",
    },
  });
  return NextResponse.json(comment);
}

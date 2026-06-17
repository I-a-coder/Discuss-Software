import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encrypt, decrypt } from "@/lib/encryption";
import { requireSession } from "@/lib/api-auth";
import { canPerform } from "@/lib/permissions";
import type { UserRole } from "@/lib/permissions";

export async function GET() {
  const { session, error } = await requireSession();
  if (error) return error;
  const orgId = session!.user.organizationId;
  if (!orgId) return NextResponse.json([]);
  const messages = await prisma.discussionMessage.findMany({
    where: { author: { organizationId: orgId } },
    orderBy: { createdAt: "asc" },
    take: 100,
    include: { author: { select: { name: true, email: true, image: true } } },
  });
  return NextResponse.json(
    messages.map((m) => ({
      ...m,
      content: m.encrypted ? decrypt(m.content) : m.content,
    }))
  );
}

export async function POST(req: Request) {
  const { session, error } = await requireSession();
  if (error) return error;
  if (!session!.user.organizationId) {
    return NextResponse.json({ error: "No organization selected" }, { status: 400 });
  }
  const role = session!.user.role as UserRole;
  if (!canPerform(role, "postDiscussion")) {
    return NextResponse.json({ error: "Guests cannot post" }, { status: 403 });
  }
  const { content, channel } = await req.json();
  if (!content?.trim()) {
    return NextResponse.json({ error: "Message required" }, { status: 400 });
  }
  const msg = await prisma.discussionMessage.create({
    data: {
      content: encrypt(content.trim()),
      encrypted: true,
      authorId: session!.user.id,
      channel: channel || "general",
    },
    include: { author: { select: { name: true, email: true } } },
  });
  await prisma.activityLog.create({
    data: {
      action: "MESSAGE_SENT",
      details: `Posted in #${channel || "general"}`,
      userId: session!.user.id,
      organizationId: session!.user.organizationId,
    },
  });
  return NextResponse.json({ ...msg, content });
}

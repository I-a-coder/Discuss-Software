import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encrypt, decrypt } from "@/lib/encryption";
import { requireSession } from "@/lib/api-auth";
import { canPerform } from "@/lib/permissions";
import type { UserRole } from "@/lib/permissions";

export async function GET() {
  const { session, error } = await requireSession();
  if (error) return error;
  const notes = await prisma.meetingNote.findMany({
    orderBy: { createdAt: "desc" },
    include: { author: { select: { name: true } } },
  });
  return NextResponse.json(
    notes.map((n) => ({
      ...n,
      content: n.encrypted ? decrypt(n.content) : n.content,
      summary: n.summary && n.encrypted ? decrypt(n.summary) : n.summary,
      transcript:
        n.transcript && n.encrypted ? decrypt(n.transcript) : n.transcript,
    }))
  );
}

export async function POST(req: Request) {
  const { session, error } = await requireSession();
  if (error) return error;
  const role = session!.user.role as UserRole;
  if (!canPerform(role, "takeMeetingNotes")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { title, content, summary, meetingLink, transcript } = await req.json();
  const note = await prisma.meetingNote.create({
    data: {
      title: title || "Meeting Notes",
      content: encrypt(content || ""),
      summary: summary ? encrypt(summary) : null,
      meetingLink: meetingLink || null,
      transcript: transcript ? encrypt(transcript) : null,
      encrypted: true,
      authorId: session!.user.id,
    },
  });
  await prisma.activityLog.create({
    data: {
      action: "MEETING_NOTED",
      details: note.title,
      userId: session!.user.id,
      organizationId: session!.user.organizationId,
    },
  });
  return NextResponse.json({
    ...note,
    content,
    summary,
  });
}

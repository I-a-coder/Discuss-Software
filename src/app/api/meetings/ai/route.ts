import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-auth";
import { canPerform } from "@/lib/permissions";
import type { UserRole } from "@/lib/permissions";
import { decrypt, encrypt } from "@/lib/encryption";
import {
  generateMeetingMinutes,
  answerMeetingQuestion,
} from "@/lib/meeting-ai";
import {
  generateAiMeetingMinutes,
  askAboutMeeting,
  transcribeRecording,
} from "@/lib/ai-provider";
import { buildMeetingLink } from "@/lib/meeting-utils";
import { limitByKey } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const { session, error } = await requireSession();
  if (error) return error;
  const role = session!.user.role as UserRole;
  if (!canPerform(role, "useAiChat")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const limit = limitByKey(`meeting-ai:${session!.user.id}`, {
    windowMs: 60_000,
    max: 12,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: `Rate limit reached. Retry in ${limit.retryAfterSec}s` },
      { status: 429 }
    );
  }

  const body = await req.json();
  const action = body.action as "minutes" | "ask";
  const question = body.question as string | undefined;
  let meetingLink = body.meetingLink as string | undefined;
  const meetingId = body.meetingId as string | undefined;
  const noteId = body.noteId as string | undefined;
  const pastedTranscript = body.transcript as string | undefined;
  const recordingPath = body.recordingPath as string | undefined;
  const recordingName = body.recordingName as string | undefined;

  let meeting = meetingId
    ? await prisma.meeting.findUnique({ where: { id: meetingId } })
    : null;

  if (!meeting && meetingLink) {
    const code = meetingLink.split("/").pop()?.toUpperCase();
    if (code) {
      meeting = await prisma.meeting.findUnique({ where: { roomCode: code } });
    }
  }

  let note = noteId
    ? await prisma.meetingNote.findUnique({ where: { id: noteId } })
    : null;

  if (!note && meeting) {
    note = await prisma.meetingNote.findFirst({
      where: { meetingId: meeting.id },
      orderBy: { createdAt: "desc" },
    });
  }

  const title =
    meeting?.title || note?.title || body.title || "Meeting";
  meetingLink =
    meetingLink || meeting?.meetingLink || note?.meetingLink || undefined;

  let transcript =
    pastedTranscript ||
    (meeting?.transcript
      ? meeting.transcript
      : note?.transcript && note.encrypted
        ? decrypt(note.transcript)
        : note?.transcript) ||
    (note?.content && note.encrypted ? decrypt(note.content) : note?.content);

  if (recordingPath) {
    const whisperText = await transcribeRecording(recordingPath);
    const recordingHeader = `[Recording uploaded: ${recordingName || "meeting recording"}]`;
    if (whisperText) {
      transcript = `${transcript || ""}\n\n${recordingHeader}\n${whisperText}`.trim();
    } else {
      transcript = `${transcript || ""}\n\n${recordingHeader}\n(Transcription pending. Add OPENAI_API_KEY for Whisper, or paste notes below.)`.trim();
    }
  }

  const summary =
    note?.summary && note.encrypted ? decrypt(note.summary) : note?.summary;

  // Fetch host name for guaranteed participant entry
  const hostUser = meeting?.hostId
    ? await prisma.user.findUnique({ where: { id: meeting.hostId }, select: { name: true } })
    : null;
  const hostName = hostUser?.name || null;

  // Extract participant names from transcript join events (timestamp prefix stripped)
  const txLines = (transcript || "").split("\n");
  const detectedNames = [
    ...new Set(
      txLines
        .map((l) => {
          const stripped = l.replace(/^\[[^\]]+\]\s*/, "").trim();
          return stripped.match(/^(.+?)\s+joined the meeting$/i)?.[1]?.trim();
        })
        .filter((n): n is string => !!n && n.length > 0 && n.length < 80)
    ),
  ];
  // Always ensure host is listed
  if (hostName && !detectedNames.includes(hostName)) detectedNames.unshift(hostName);

  const ctx = {
    title,
    meetingLink,
    transcript: transcript || undefined,
    summary: summary || undefined,
    content: note?.content && note.encrypted ? decrypt(note.content) : undefined,
    startedAt: meeting?.startedAt?.toISOString(),
    endedAt: meeting?.endedAt?.toISOString(),
    participants: detectedNames.length > 0 ? detectedNames : undefined,
  };

  if (action === "ask") {
    if (!question?.trim()) {
      return NextResponse.json({ error: "Question required" }, { status: 400 });
    }
    const aiAnswer = await askAboutMeeting(
      { title, transcript: transcript || undefined, meetingLink },
      question.trim()
    );
    const answer =
      aiAnswer || answerMeetingQuestion(ctx, question.trim());
    return NextResponse.json({ answer });
  }

  const aiMinutes = await generateAiMeetingMinutes({
    title,
    meetingLink,
    transcript: transcript || undefined,
    recordingName,
  });
  const minutes = aiMinutes || generateMeetingMinutes(ctx);

  if (note) {
    await prisma.meetingNote.update({
      where: { id: note.id },
      data: {
        content: encrypt(minutes),
        summary: encrypt(
          minutes.split("## Executive summary")[1]?.split("##")[0]?.trim().slice(0, 250) ||
            "AI-generated minutes"
        ),
        meetingLink: meetingLink || note.meetingLink,
        transcript: transcript ? encrypt(transcript) : note.transcript,
      },
    });
  } else if (meetingLink || meeting) {
    const link = meetingLink || (meeting && buildMeetingLink(meeting.roomCode));
    await prisma.meetingNote.create({
      data: {
        title: `${title} - AI Minutes`,
        content: encrypt(minutes),
        summary: encrypt("AI-generated meeting minutes"),
        meetingLink: link,
        meetingId: meeting?.id,
        transcript: transcript ? encrypt(transcript) : null,
        encrypted: true,
        authorId: session!.user.id,
      },
    });
  }

  await prisma.activityLog.create({
    data: {
      action: "MEETING_AI",
      details: title,
      userId: session!.user.id,
      organizationId: session!.user.organizationId,
    },
  });

  return NextResponse.json({ minutes, meetingLink });
}

import { prisma } from "@/lib/prisma";
import {
  getRoom,
  buildTranscript,
  removeRoom,
  addEvent,
} from "@/lib/meeting-store";
import { encrypt } from "@/lib/encryption";
import { generateMeetingMinutes } from "@/lib/meeting-ai";

/** End a live meeting in DB and tear down in-memory room. */
export async function endLiveMeeting(
  roomCode: string,
  userId: string,
  userName: string,
  organizationId?: string | null
) {
  const code = roomCode.toUpperCase();
  const meeting = await prisma.meeting.findUnique({ where: { roomCode: code } });
  if (!meeting || meeting.status === "ended") {
    removeRoom(code);
    return { alreadyEnded: true, meeting };
  }

  const live = getRoom(code);
  if (live) {
    addEvent(code, `${userName} ended the meeting`);
  }
  const transcript = live ? buildTranscript(live) : meeting.transcript || "";

  // Collect all unique participant names who joined (strip timestamp prefix from events)
  // Event format: "[2026-06-15T12:34:56.789Z] Alice joined the meeting"
  const joinedNames = [
    ...new Set(
      transcript
        .split("\n")
        .map((l) => {
          const stripped = l.replace(/^\[[^\]]+\]\s*/, "").trim();
          return stripped.match(/^(.+?)\s+joined the meeting$/i)?.[1]?.trim();
        })
        .filter((n): n is string => !!n && n.length > 0 && n.length < 80)
    ),
  ];

  // Host is always a participant — add if not already detected
  if (!joinedNames.includes(userName)) joinedNames.unshift(userName);

  const minutes = generateMeetingMinutes({
    title: meeting.title,
    meetingLink: meeting.meetingLink,
    transcript,
    startedAt: meeting.startedAt.toISOString(),
    endedAt: new Date().toISOString(),
    participants: joinedNames,
  });

  const updated = await prisma.meeting.update({
    where: { id: meeting.id },
    data: {
      status: "ended",
      endedAt: new Date(),
      transcript,
    },
  });

  await prisma.meetingNote.updateMany({
    where: { meetingId: meeting.id },
    data: {
      title: meeting.title,
      content: encrypt(minutes),
      summary: encrypt(
        minutes.split("## Executive summary")[1]?.split("##")[0]?.trim().slice(0, 200) ||
          "Meeting ended"
      ),
      transcript: encrypt(transcript),
      meetingLink: meeting.meetingLink,
    },
  });

  removeRoom(code);

  if (organizationId) {
    await prisma.activityLog.create({
      data: {
        action: "MEETING_ENDED",
        details: meeting.title,
        userId,
        organizationId,
      },
    });
  }

  return { meeting: updated, minutes, alreadyEnded: false };
}

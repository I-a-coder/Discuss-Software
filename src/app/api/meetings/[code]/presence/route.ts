import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { clearCallsForRoom, dismissIncomingForUser } from "@/lib/call-store";
import { endLiveMeeting } from "@/lib/meeting-lifecycle";
import {
  getOrCreateRoom,
  getRoom,
  addEvent,
  getPendingCommandsForUser,
  consumeCommand,
  getPermissions,
  handleParticipantLeave,
  type LiveParticipant,
} from "@/lib/meeting-store";

type Params = { params: Promise<{ code: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { session, error } = await requireSession();
  if (error) return error;
  const { code } = await params;
  const roomCode = code.toUpperCase();
  const userId = session!.user.id;

  const meeting = await prisma.meeting.findUnique({ where: { roomCode } });
  if (!meeting || meeting.status === "ended") {
    return NextResponse.json({
      participants: [],
      chat: [],
      reactions: [],
      hostId: null,
      coHostIds: [],
      pendingCommands: [],
      meetingEnded: true,
      audioOnly: false,
      myPermissions: { micLocked: false, cameraLocked: false },
    });
  }

  const room = getRoom(roomCode);
  if (!room || room.ended) {
    return NextResponse.json({
      participants: [],
      chat: [],
      reactions: [],
      hostId: meeting.hostId,
      coHostIds: [],
      pendingCommands: [],
      meetingEnded: !!room?.ended,
      audioOnly: room?.audioOnly ?? false,
      myPermissions: { micLocked: false, cameraLocked: false },
    });
  }

  const now = Date.now();
  for (const [id, p] of room.participants) {
    if (now - p.lastSeen > 15000) room.participants.delete(id);
  }

  const participants = [...room.participants.values()].map((p) => {
    const perms = getPermissions(room, p.userId);
    return {
      userId: p.userId,
      name: p.name,
      handRaised: p.handRaised,
      videoOn: p.videoOn,
      audioOn: p.audioOn,
      screenSharing: p.screenSharing,
      reactions: p.reactions.filter((r) => now - r.at < 5000),
      isCoHost: room.coHostIds.has(p.userId),
      isHost: room.hostId === p.userId,
      micLocked: perms.micLocked,
      cameraLocked: perms.cameraLocked,
    };
  });

  const reactions = participants.flatMap((p) =>
    p.reactions.map((r) => ({ ...r, userId: p.userId, name: p.name }))
  );

  const pendingCommands = getPendingCommandsForUser(room, userId).map((c) => ({
    id: c.id,
    action: c.action,
    at: c.at,
  }));

  const myPermissions = getPermissions(room, userId);

  return NextResponse.json({
    participants,
    chat: room.chat.slice(-50),
    reactions,
    hostId: room.hostId,
    coHostIds: [...room.coHostIds],
    pendingCommands,
    meetingEnded: false,
    audioOnly: room.audioOnly ?? false,
    myPermissions,
    startedAt: meeting.startedAt.toISOString(),
    serverNow: new Date().toISOString(),
    participantCount: participants.length,
  });
}

export async function POST(req: Request, { params }: Params) {
  const { session, error } = await requireSession();
  if (error) return error;
  const { code } = await params;
  const roomCode = code.toUpperCase();
  const body = await req.json();

  const meeting = await prisma.meeting.findUnique({ where: { roomCode } });
  if (!meeting || meeting.status === "ended") {
    return NextResponse.json({ meetingEnded: true });
  }

  const userId = session!.user.id;
  const name = session!.user.name || session!.user.email || "Participant";
  const room = getOrCreateRoom(roomCode, meeting.hostId);

  if (body.ackCommand) {
    consumeCommand(room, body.ackCommand as string, userId);
    return NextResponse.json({ ok: true });
  }

  if (body.leave === true) {
    const result = handleParticipantLeave(room, userId, name);
    if (result.ended) {
      await endLiveMeeting(
        roomCode,
        userId,
        name,
        session!.user.organizationId
      );
      return NextResponse.json({ ok: true, meetingEnded: true });
    }
    return NextResponse.json({
      ok: true,
      meetingEnded: false,
      newHostId: result.newHostId,
    });
  }

  // Authorization: only allow users from the same org to join.
  // The meeting host is always allowed (handles direct/cross-org invites via link).
  const isHost = userId === meeting.hostId;
  const userOrgId = session!.user.organizationId;
  const meetingOrgId = meeting.organizationId;
  if (!isHost && meetingOrgId && userOrgId !== meetingOrgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const perms = getPermissions(room, userId);
  const isAudioOnly = room.audioOnly ?? false;

  const existing = room.participants.get(userId);

  let nextAudioOn = body.audioOn ?? existing?.audioOn ?? false;
  let nextVideoOn = body.videoOn ?? existing?.videoOn ?? false;

  if (isAudioOnly) nextVideoOn = false;
  if (nextAudioOn && perms.micLocked) nextAudioOn = false;
  if (nextVideoOn && perms.cameraLocked) nextVideoOn = false;

  const participant: LiveParticipant = {
    userId,
    name,
    handRaised: body.handRaised ?? existing?.handRaised ?? false,
    videoOn: nextVideoOn,
    audioOn: nextAudioOn,
    screenSharing: body.screenSharing ?? existing?.screenSharing ?? false,
    reactions: existing?.reactions ?? [],
    lastSeen: Date.now(),
    isCoHost: room.coHostIds.has(userId),
  };

  if (body.reaction) {
    participant.reactions.push({ emoji: body.reaction, at: Date.now() });
    addEvent(roomCode, `${name} reacted ${body.reaction}`);
  }

  if (body.handRaised === true && !existing?.handRaised) {
    addEvent(roomCode, `${name} raised their hand`);
  }
  if (body.handRaised === false && existing?.handRaised) {
    addEvent(roomCode, `${name} lowered their hand`);
  }
  if (body.screenSharing === true && !existing?.screenSharing) {
    addEvent(roomCode, `${name} started screen sharing`);
  }
  if (body.screenSharing === false && existing?.screenSharing) {
    addEvent(roomCode, `${name} stopped screen sharing`);
  }

  const isNewJoin = !existing;
  if (isNewJoin) {
    addEvent(roomCode, `${name} joined the meeting`);
    dismissIncomingForUser(userId);
  }

  room.participants.set(userId, participant);

  if (room.participants.size >= 2) {
    clearCallsForRoom(roomCode);
    if (isNewJoin) {
      await prisma.meeting.update({
        where: { roomCode },
        data: { startedAt: new Date() },
      });
    }
  }

  if (body.chat?.trim() || body.attachmentPath) {
    room.chat.push({
      userId,
      name,
      text: (body.chat as string)?.trim() || "",
      at: Date.now(),
      attachmentPath: body.attachmentPath as string | undefined,
      attachmentName: body.attachmentName as string | undefined,
      attachmentMime: body.attachmentMime as string | undefined,
    });
    addEvent(roomCode, `${name} (chat): ${body.chat?.trim() || "[attachment]"}`);
  }

  return NextResponse.json({ ok: true });
}

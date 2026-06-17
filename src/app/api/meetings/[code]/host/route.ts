import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import {
  getOrCreateRoom,
  isHostOrCoHost,
  pushHostCommand,
  addEvent,
  setPermissions,
  type HostCommandAction,
} from "@/lib/meeting-store";
import { ringIntoMeeting } from "@/lib/call-store";
import { buildMeetingLink } from "@/lib/meeting-utils";

type Params = { params: Promise<{ code: string }> };

const BULK_MAP: Record<string, HostCommandAction> = {
  mute_all: "mute",
  mic_lock_all: "mic_lock",
  mic_allow_all: "mic_allow",
  video_off_all: "video_off",
  video_lock_all: "video_lock",
  video_allow_all: "video_allow",
};

function targetsForBulk(room: ReturnType<typeof getOrCreateRoom>, actorId: string) {
  return [...room.participants.keys()].filter(
    (pid) => pid !== room.hostId && pid !== actorId
  );
}

export async function POST(req: Request, { params }: Params) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { code } = await params;
  const roomCode = code.toUpperCase();
  const body = await req.json();
  const action = body.action as string;
  const targetUserId = body.targetUserId as string | undefined;
  const participantIds = body.participantIds as string[] | undefined;

  const meeting = await prisma.meeting.findUnique({ where: { roomCode } });
  if (!meeting || meeting.status === "ended") {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  const room = getOrCreateRoom(roomCode, meeting.hostId);
  const userId = session!.user.id;
  const userName = session!.user.name || session!.user.email || "Host";

  if (!isHostOrCoHost(room, userId)) {
    return NextResponse.json({ error: "Host or co-host only" }, { status: 403 });
  }

  if (action === "invite" && participantIds?.length) {
    const meetingLink = meeting.meetingLink || buildMeetingLink(roomCode);
    ringIntoMeeting({
      callerId: userId,
      callerName: userName,
      targetIds: participantIds,
      type: "meet",
      title: meeting.title,
      roomCode,
      meetingLink,
    });

    for (const pid of participantIds) {
      if (pid === userId) continue;
      const [userA, userB] = [userId, pid].sort();
      let thread = await prisma.chatThread.findFirst({
        where: { dmUserAId: userA, dmUserBId: userB },
      });
      if (!thread) {
        thread = await prisma.chatThread.create({
          data: { type: "dm", dmUserAId: userA, dmUserBId: userB },
        });
      }
      await prisma.chatMessage.create({
        data: {
          threadId: thread.id,
          authorId: userId,
          content: `📹 **${userName}** invited you to join: **${meeting.title}**\nJoin: ${meetingLink}\nRoom: \`${roomCode}\``,
          encrypted: false,
        },
      });
    }

    addEvent(roomCode, `${userName} invited ${participantIds.length} member(s)`);
    return NextResponse.json({ ok: true, invited: participantIds.length });
  }

  if (BULK_MAP[action]) {
    const cmd = BULK_MAP[action];
    const targets = targetsForBulk(room, userId);
    for (const pid of targets) {
      if (cmd === "mic_lock") setPermissions(room, pid, { micLocked: true });
      if (cmd === "mic_allow") setPermissions(room, pid, { micLocked: false });
      if (cmd === "video_lock") setPermissions(room, pid, { cameraLocked: true });
      if (cmd === "video_allow") setPermissions(room, pid, { cameraLocked: false });
      pushHostCommand(room, pid, cmd);
    }
    addEvent(roomCode, `${userName} applied ${action.replace(/_/g, " ")}`);
    return NextResponse.json({ ok: true, count: targets.length });
  }

  if (action === "kick" && targetUserId) {
    if (targetUserId === room.hostId) {
      return NextResponse.json({ error: "Cannot remove host" }, { status: 400 });
    }
    pushHostCommand(room, targetUserId, "kicked");
    room.participants.delete(targetUserId);
    room.coHostIds.delete(targetUserId);
    room.permissions.delete(targetUserId);
    addEvent(roomCode, `${userName} removed a participant`);
    return NextResponse.json({ ok: true });
  }

  if (!targetUserId || targetUserId === room.hostId) {
    return NextResponse.json({ error: "Invalid target" }, { status: 400 });
  }

  if (action === "mute") {
    pushHostCommand(room, targetUserId, "mute");
    addEvent(roomCode, `${userName} muted a participant`);
  } else if (action === "mic_lock") {
    setPermissions(room, targetUserId, { micLocked: true });
    pushHostCommand(room, targetUserId, "mic_lock");
    addEvent(roomCode, `${userName} locked a participant's microphone`);
  } else if (action === "mic_allow") {
    setPermissions(room, targetUserId, { micLocked: false });
    pushHostCommand(room, targetUserId, "mic_allow");
    addEvent(roomCode, `${userName} allowed a participant to unmute`);
  } else if (action === "video_off") {
    pushHostCommand(room, targetUserId, "video_off");
    addEvent(roomCode, `${userName} turned off a participant's camera`);
  } else if (action === "video_lock") {
    setPermissions(room, targetUserId, { cameraLocked: true });
    pushHostCommand(room, targetUserId, "video_lock");
    addEvent(roomCode, `${userName} locked a participant's camera off`);
  } else if (action === "video_allow") {
    setPermissions(room, targetUserId, { cameraLocked: false });
    pushHostCommand(room, targetUserId, "video_allow");
    addEvent(roomCode, `${userName} allowed a participant to use camera`);
  } else if (action === "make_cohost") {
    room.coHostIds.add(targetUserId);
    pushHostCommand(room, targetUserId, "make_cohost");
    addEvent(roomCode, `${userName} made a co-host`);
  } else if (action === "remove_cohost") {
    room.coHostIds.delete(targetUserId);
    pushHostCommand(room, targetUserId, "remove_cohost");
    addEvent(roomCode, `${userName} removed co-host access`);
  } else {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

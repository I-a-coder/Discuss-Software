import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import {
  createCall,
  createMeetingCalls,
  getIncomingCall,
  getOutgoingCall,
  respondToCall,
  cancelCall,
  dismissIncomingForUser,
  dismissOutgoingForUser,
  type CallType,
} from "@/lib/call-store";
import { prisma } from "@/lib/prisma";
import { generateRoomCode, buildMeetingLink } from "@/lib/meeting-utils";
import { getOrCreateRoom } from "@/lib/meeting-store";
import { rateLimit } from "@/lib/rate-limit";

export async function GET() {
  const { session, error } = await requireSession();
  if (error) return error;
  const uid = session!.user.id;
  return NextResponse.json({
    incoming: getIncomingCall(uid),
    outgoing: getOutgoingCall(uid),
  });
}

export async function POST(req: Request) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = (await req.json()) as {
    targetId?: string;
    participantIds?: string[];
    type?: CallType;
    title?: string;
    roomCode?: string;
    meetingLink?: string;
  };

  const {
    targetId,
    participantIds,
    type = "meet",
    title,
    roomCode: existingCode,
    meetingLink: existingLink,
  } = body;

  const callerId = session!.user.id;
  const callerName = session!.user.name || session!.user.email || "Someone";

  // Rate limit: max 8 outgoing calls per minute
  const limited = rateLimit(callerId, { max: 8, windowMs: 60_000, label: "calls" });
  if (limited) return limited;

  if (participantIds?.length && existingCode && existingLink) {
    const callTitle = title || `Group meeting`;
    const callerTitle = title || `Group meeting`;
    const call = createMeetingCalls({
      callerId,
      callerName,
      callerTitle,
      targetIds: participantIds,
      type: "meet",
      title: callTitle,
      roomCode: existingCode,
      meetingLink: existingLink,
    });
    return NextResponse.json({ call, roomCode: existingCode, meetingLink: existingLink });
  }

  if (!targetId) {
    return NextResponse.json({ error: "targetId or participantIds required" }, { status: 400 });
  }

  const roomCode = existingCode || generateRoomCode();
  const meetingLink = existingLink || buildMeetingLink(roomCode);
  let targetName = "Someone";
  if (targetId) {
    const targetUser = await prisma.user.findUnique({ where: { id: targetId }, select: { name: true, email: true } });
    if (targetUser) {
      targetName = targetUser.name || targetUser.email || "Someone";
    }
  }

  // Caller sees: "Calling [target name]" — receiver sees: "[Caller name] is calling you"
  const callType: CallType = type === "audio" ? "audio" : "meet";
  const callerTitle =
    title ||
    (callType === "audio"
      ? `Calling ${targetName}`
      : `Meeting with ${targetName}`);
  const receiverTitle =
    callType === "audio"
      ? `${callerName} is calling you`
      : `${callerName} invited you to a meeting`;

  if (!existingCode) {
    await prisma.meeting.create({
      data: {
        roomCode,
        title: callerTitle,
        meetingLink,
        hostId: callerId,
        organizationId: session!.user.organizationId,
        status: "live",
      },
    });
    const room = getOrCreateRoom(roomCode, callerId);
    if (callType === "audio") room.audioOnly = true;
  }

  const call = createCall({
    callerId,
    callerName,
    callerTitle,
    targetId,
    type: callType,
    title: receiverTitle,
    roomCode,
    meetingLink,
  });

  return NextResponse.json({ call, roomCode, meetingLink });
}

export async function PATCH(req: Request) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await req.json();

  if (body.action === "dismiss") {
    dismissIncomingForUser(session!.user.id);
    return NextResponse.json({ ok: true });
  }
  if (body.action === "dismiss_outgoing") {
    dismissOutgoingForUser(session!.user.id);
    return NextResponse.json({ ok: true });
  }

  const { callId, status } = body as {
    callId: string;
    status: "accepted" | "declined";
  };

  if (!callId || !["accepted", "declined"].includes(status)) {
    return NextResponse.json({ error: "Invalid" }, { status: 400 });
  }

  const ok = respondToCall(callId, status);
  return NextResponse.json({ ok });
}

export async function DELETE() {
  const { session, error } = await requireSession();
  if (error) return error;
  cancelCall(session!.user.id);
  return NextResponse.json({ ok: true });
}

/** Dismiss incoming ring only (joined meeting / declined). */
export async function PUT() {
  const { session, error } = await requireSession();
  if (error) return error;
  dismissIncomingForUser(session!.user.id);
  return NextResponse.json({ ok: true });
}

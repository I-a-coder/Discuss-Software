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

  if (participantIds?.length && existingCode && existingLink) {
    const callTitle = title || `${callerName}'s Meeting`;
    const call = createMeetingCalls({
      callerId,
      callerName,
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
  const callType: CallType = type === "audio" ? "audio" : "meet";
  const callTitle =
    title ||
    (callType === "audio"
      ? `${callerName}'s Phone Call`
      : `${callerName}'s Meeting`);

  if (!existingCode) {
    await prisma.meeting.create({
      data: {
        roomCode,
        title: callTitle,
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
    targetId,
    type: callType,
    title: callTitle,
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

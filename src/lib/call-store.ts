/**
 * In-memory call invitation store.
 * Keyed by the TARGET user's ID → the pending call they should see.
 */

export type CallType = "audio" | "meet";

export type CallInvitation = {
  id: string;
  callerId: string;
  callerName: string;
  targetId: string;
  type: CallType;
  title: string;
  roomCode: string;
  meetingLink: string;
  status: "ringing" | "accepted" | "declined" | "cancelled" | "missed";
  createdAt: number;
  participantCount?: number;
};

const store = new Map<string, CallInvitation>();
const callerStore = new Map<string, CallInvitation>();

const EXPIRY_MS = 300_000; // 5 minutes — meet rings until join/decline

function pruneExpired() {
  const now = Date.now();
  for (const [key, call] of store.entries()) {
    if (now - call.createdAt > EXPIRY_MS) store.delete(key);
  }
  for (const [key, call] of callerStore.entries()) {
    if (now - call.createdAt > EXPIRY_MS) callerStore.delete(key);
  }
}

export function createCall(
  invitation: Omit<CallInvitation, "id" | "status" | "createdAt">
): CallInvitation {
  pruneExpired();
  const call: CallInvitation = {
    ...invitation,
    id: Math.random().toString(36).slice(2),
    status: "ringing",
    createdAt: Date.now(),
  };
  store.set(invitation.targetId, call);
  callerStore.set(invitation.callerId, call);
  return call;
}

export function getIncomingCall(userId: string): CallInvitation | null {
  pruneExpired();
  return store.get(userId) ?? null;
}

export function getOutgoingCall(callerId: string): CallInvitation | null {
  pruneExpired();
  return callerStore.get(callerId) ?? null;
}

export function respondToCall(callId: string, status: "accepted" | "declined"): boolean {
  let matched = false;
  let callerId: string | null = null;

  for (const [targetId, call] of store.entries()) {
    if (call.id !== callId) continue;
    matched = true;
    callerId = call.callerId;
    store.delete(targetId);
  }

  if (!matched || !callerId) return false;

  const callerEntry = callerStore.get(callerId);
  if (callerEntry && callerEntry.id === callId) {
    if (status === "accepted") {
      callerEntry.status = "accepted";
    } else {
      const stillRinging = [...store.values()].some((c) => c.id === callId);
      if (!stillRinging) callerEntry.status = "declined";
    }
  }
  return true;
}

export function cancelCall(callerId: string): void {
  const call = callerStore.get(callerId);
  if (call) {
    for (const [targetId, entry] of store.entries()) {
      if (entry.callerId === callerId && entry.id === call.id) {
        store.delete(targetId);
      }
    }
    callerStore.delete(callerId);
  }
}

/** Clear incoming ring for a user who joined or declined. */
export function dismissIncomingForUser(userId: string): void {
  store.delete(userId);
}

/** Clear outgoing call state for caller after cancel or timeout. */
export function dismissOutgoingForUser(userId: string): void {
  callerStore.delete(userId);
}

/** @deprecated use dismissIncomingForUser or dismissOutgoingForUser */
export function dismissForUser(userId: string): void {
  dismissIncomingForUser(userId);
  dismissOutgoingForUser(userId);
}

export const RING_WAIT_MS = 30_000;

/** Clear all rings tied to a room once the meeting is live with participants. */
export function clearCallsForRoom(roomCode: string): void {
  const code = roomCode.toUpperCase();
  for (const [targetId, call] of store.entries()) {
    if (call.roomCode.toUpperCase() === code) store.delete(targetId);
  }
  for (const [callerId, call] of callerStore.entries()) {
    if (call.roomCode.toUpperCase() === code && call.status === "ringing") {
      call.status = "accepted";
    }
  }
}

export function createMeetingCalls(
  invitation: Omit<CallInvitation, "id" | "status" | "createdAt" | "targetId"> & {
    targetIds: string[];
  }
): CallInvitation {
  pruneExpired();
  const callId = Math.random().toString(36).slice(2);
  const createdAt = Date.now();
  const { targetIds, ...rest } = invitation;

  const callerView: CallInvitation = {
    ...rest,
    targetId: targetIds[0] || "",
    id: callId,
    status: "ringing",
    createdAt,
    participantCount: targetIds.filter((id) => id !== invitation.callerId).length,
  };

  for (const targetId of targetIds) {
    if (targetId === invitation.callerId) continue;
    store.set(targetId, {
      ...rest,
      targetId,
      id: callId,
      status: "ringing",
      createdAt,
    });
  }

  callerStore.set(invitation.callerId, callerView);
  return callerView;
}

/** Ring additional members into an already-live meeting. */
export function ringIntoMeeting(
  invitation: Omit<CallInvitation, "id" | "status" | "createdAt" | "targetId" | "callerId" | "callerName"> & {
    callerId: string;
    callerName: string;
    targetIds: string[];
  }
): void {
  pruneExpired();
  const callId = Math.random().toString(36).slice(2);
  const createdAt = Date.now();
  const { targetIds, ...rest } = invitation;

  for (const targetId of targetIds) {
    if (targetId === invitation.callerId) continue;
    store.set(targetId, {
      ...rest,
      callerId: invitation.callerId,
      callerName: invitation.callerName,
      targetId,
      id: callId,
      status: "ringing",
      createdAt,
    });
  }
}

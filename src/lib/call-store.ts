/**
 * In-memory call invitation store.
 * Keyed by the TARGET user's ID → the pending call they should see.
 */

export type CallType = "audio" | "meet";

export type CallInvitation = {
  id: string;
  callerId: string;
  callerName: string;
  /** For the caller's overlay: "Calling [target name]" */
  callerTitle: string;
  targetId: string;
  type: CallType;
  /** For the receiver's overlay: "[Caller] is calling you" */
  title: string;
  roomCode: string;
  meetingLink: string;
  status: "ringing" | "accepted" | "declined" | "cancelled" | "missed";
  createdAt: number;
  participantCount?: number;
};

const store: Map<string, CallInvitation> = (globalThis as any)._callStore || new Map();
if (!(globalThis as any)._callStore) (globalThis as any)._callStore = store;

const callerStore: Map<string, CallInvitation> = (globalThis as any)._callerStore || new Map();
if (!(globalThis as any)._callerStore) (globalThis as any)._callerStore = callerStore;

/** 1:1 and group rings expire after 15 seconds with no answer. */
export const RING_TIMEOUT_MS = 15_000;
/** General data expiry (5 min) — keeps accepted/declined state readable */
const EXPIRY_MS = 300_000;

function pruneExpired() {
  const now = Date.now();
  for (const [key, call] of store.entries()) {
    if (now - call.createdAt > EXPIRY_MS) store.delete(key);
  }
  for (const [key, call] of callerStore.entries()) {
    if (now - call.createdAt > EXPIRY_MS) callerStore.delete(key);
  }
}

/** Mark any still-ringing calls as missed once 15s elapses. */
function applyRingTimeout() {
  const now = Date.now();
  for (const [targetId, call] of store.entries()) {
    if (call.status === "ringing" && now - call.createdAt > RING_TIMEOUT_MS) {
      store.delete(targetId);
    }
  }
  for (const [callerId, call] of callerStore.entries()) {
    if (call.status === "ringing" && now - call.createdAt > RING_TIMEOUT_MS) {
      call.status = "missed";
    }
  }
}

/** Returns the incoming call for a specific target user if it exists. Used to verify responder identity. */
export function getCallForTarget(userId: string): CallInvitation | null {
  pruneExpired();
  applyRingTimeout();
  return store.get(userId) ?? null;
}

/** Self-prune every 60 seconds so expired entries are cleaned even without API traffic. */
setInterval(() => {
  pruneExpired();
  applyRingTimeout();
}, 60_000);

export function createCall(
  invitation: Omit<CallInvitation, "id" | "status" | "createdAt">
): CallInvitation {
  pruneExpired();
  applyRingTimeout();
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
  applyRingTimeout();
  return store.get(userId) ?? null;
}

export function getOutgoingCall(callerId: string): CallInvitation | null {
  pruneExpired();
  applyRingTimeout();
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
  applyRingTimeout();
  const callId = Math.random().toString(36).slice(2);
  const createdAt = Date.now();
  const { targetIds, ...rest } = invitation;

  const participantCount = targetIds.filter((id) => id !== invitation.callerId).length;

  const callerView: CallInvitation = {
    ...rest,
    targetId: targetIds[0] || "",
    id: callId,
    status: "ringing",
    createdAt,
    participantCount,
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
  invitation: Omit<CallInvitation, "id" | "status" | "createdAt" | "targetId" | "callerId" | "callerName" | "callerTitle"> & {
    callerId: string;
    callerName: string;
    callerTitle: string;
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
      callerTitle: invitation.callerTitle,
      targetId,
      id: callId,
      status: "ringing",
      createdAt,
    });
  }
}

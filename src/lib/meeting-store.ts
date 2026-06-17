/** In-memory live meeting state (dev/single-node). Survives hot reload via globalThis. */

export type MeetingReaction = { emoji: string; at: number };

export type HostCommandAction =
  | "mute"
  | "mic_lock"
  | "mic_allow"
  | "video_off"
  | "video_lock"
  | "video_allow"
  | "make_cohost"
  | "remove_cohost"
  | "kicked";

export type HostCommand = {
  id: string;
  targetUserId: string;
  action: HostCommandAction;
  at: number;
  consumedBy: Set<string>;
};

export type ParticipantPermissions = {
  micLocked: boolean;
  cameraLocked: boolean;
};

export type LiveParticipant = {
  userId: string;
  name: string;
  handRaised: boolean;
  videoOn: boolean;
  audioOn: boolean;
  screenSharing: boolean;
  reactions: MeetingReaction[];
  lastSeen: number;
  isCoHost?: boolean;
};

export type SignalMessage = {
  id: string;
  from: string;
  to: string;
  type: "offer" | "answer" | "ice";
  payload: string;
  at: number;
};

export type ChatLine = {
  userId: string;
  name: string;
  text: string;
  at: number;
  attachmentPath?: string;
  attachmentName?: string;
  attachmentMime?: string;
};

export type LiveMeetingRoom = {
  code: string;
  hostId: string;
  coHostIds: Set<string>;
  participants: Map<string, LiveParticipant>;
  permissions: Map<string, ParticipantPermissions>;
  signals: SignalMessage[];
  chat: ChatLine[];
  events: string[];
  hostCommands: HostCommand[];
  whiteboardData?: string;
  whiteboardUpdatedAt?: number;
  /** Phone/audio calls — camera permanently disabled */
  audioOnly?: boolean;
  ended?: boolean;
};

type StoreGlobal = {
  __yusiMeetingRooms?: Map<string, LiveMeetingRoom>;
};

function rooms(): Map<string, LiveMeetingRoom> {
  const g = globalThis as StoreGlobal;
  if (!g.__yusiMeetingRooms) {
    g.__yusiMeetingRooms = new Map();
  }
  return g.__yusiMeetingRooms;
}

function defaultPermissions(): ParticipantPermissions {
  return { micLocked: false, cameraLocked: false };
}

export function getOrCreateRoom(code: string, hostId: string): LiveMeetingRoom {
  const map = rooms();
  let room = map.get(code);
  if (!room) {
    room = {
      code,
      hostId,
      coHostIds: new Set(),
      participants: new Map(),
      permissions: new Map(),
      signals: [],
      chat: [],
      events: [],
      hostCommands: [],
      audioOnly: false,
    };
    map.set(code, room);
  }
  return room;
}

export function getRoom(code: string): LiveMeetingRoom | undefined {
  return rooms().get(code);
}

export function removeRoom(code: string) {
  rooms().delete(code);
}

export function addEvent(code: string, line: string) {
  const room = rooms().get(code);
  if (room) room.events.push(`[${new Date().toISOString()}] ${line}`);
}

export function isHostOrCoHost(room: LiveMeetingRoom, userId: string): boolean {
  return room.hostId === userId || room.coHostIds.has(userId);
}

export function getPermissions(
  room: LiveMeetingRoom,
  userId: string
): ParticipantPermissions {
  return room.permissions.get(userId) ?? defaultPermissions();
}

export function setPermissions(
  room: LiveMeetingRoom,
  userId: string,
  patch: Partial<ParticipantPermissions>
) {
  const current = getPermissions(room, userId);
  room.permissions.set(userId, { ...current, ...patch });
}

export function pushHostCommand(
  room: LiveMeetingRoom,
  targetUserId: string,
  action: HostCommandAction
): HostCommand {
  const cmd: HostCommand = {
    id: Math.random().toString(36).slice(2),
    targetUserId,
    action,
    at: Date.now(),
    consumedBy: new Set(),
  };
  room.hostCommands.push(cmd);
  if (room.hostCommands.length > 80) {
    room.hostCommands = room.hostCommands.slice(-80);
  }
  return cmd;
}

export function getPendingCommandsForUser(
  room: LiveMeetingRoom,
  userId: string
): HostCommand[] {
  return room.hostCommands.filter(
    (c) => c.targetUserId === userId && !c.consumedBy.has(userId)
  );
}

export function consumeCommand(room: LiveMeetingRoom, commandId: string, userId: string) {
  const cmd = room.hostCommands.find((c) => c.id === commandId);
  if (cmd) cmd.consumedBy.add(userId);
}

/** Host left: promote co-host or signal meeting should end. */
export function handleParticipantLeave(
  room: LiveMeetingRoom,
  userId: string,
  userName: string
): { ended: boolean; newHostId?: string } {
  room.participants.delete(userId);

  if (userId !== room.hostId) {
    addEvent(room.code, `${userName} left the meeting`);
    return { ended: false };
  }

  if (room.coHostIds.size > 0) {
    const newHostId = [...room.coHostIds][0];
    room.coHostIds.delete(newHostId);
    room.hostId = newHostId;
    const promoted = room.participants.get(newHostId);
    addEvent(
      room.code,
      `${userName} left — ${promoted?.name || "Co-host"} is now the host`
    );
    return { ended: false, newHostId };
  }

  room.ended = true;
  addEvent(room.code, `${userName} (host) left — meeting ended`);
  return { ended: true };
}

export function buildTranscript(room: LiveMeetingRoom): string {
  const parts: string[] = [];
  if (room.events.length) {
    parts.push("=== Session events ===\n" + room.events.join("\n"));
  }
  if (room.chat.length) {
    parts.push(
      "=== Chat ===\n" +
        room.chat
          .map((c) => `${c.name}: ${c.text}`)
          .join("\n")
    );
  }
  const hands = [...room.participants.values()].filter((p) => p.handRaised);
  if (hands.length) {
    parts.push(
      "=== Hands raised ===\n" + hands.map((p) => p.name).join(", ")
    );
  }
  return parts.join("\n\n") || "No transcript captured for this session.";
}

import { v4 as uuidv4 } from "uuid";

export function generateRoomCode(): string {
  return uuidv4().split("-")[0].toUpperCase();
}

export function buildMeetingLink(roomCode: string, baseUrl?: string): string {
  const base =
    baseUrl ||
    (typeof process !== "undefined" && process.env.NEXTAUTH_URL) ||
    "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/dashboard/meetings/room/${roomCode}`;
}

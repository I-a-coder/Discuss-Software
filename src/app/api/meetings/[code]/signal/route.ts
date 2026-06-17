import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { getOrCreateRoom } from "@/lib/meeting-store";
import { v4 as uuidv4 } from "uuid";

type Params = { params: Promise<{ code: string }> };

export async function GET(req: Request, { params }: Params) {
  const { session, error } = await requireSession();
  if (error) return error;
  const { code } = await params;
  const roomCode = code.toUpperCase();
  const since = Number(new URL(req.url).searchParams.get("since") || "0");
  const room = getOrCreateRoom(roomCode, session!.user.id);
  const userId = session!.user.id;

  const signals = room.signals.filter(
    (s) =>
      s.at > since &&
      (s.to === userId || s.to === "*" || s.from === userId)
  );

  return NextResponse.json({ signals });
}

export async function POST(req: Request, { params }: Params) {
  const { session, error } = await requireSession();
  if (error) return error;
  const { code } = await params;
  const roomCode = code.toUpperCase();
  const body = await req.json();
  const room = getOrCreateRoom(roomCode, session!.user.id);

  const signal = {
    id: uuidv4(),
    from: session!.user.id,
    to: (body.to as string) || "*",
    type: body.type as "offer" | "answer" | "ice",
    payload: body.payload as string,
    at: Date.now(),
  };

  room.signals.push(signal);
  if (room.signals.length > 200) {
    room.signals = room.signals.slice(-100);
  }

  return NextResponse.json({ ok: true, id: signal.id });
}

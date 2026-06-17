import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-auth";
import { getRoom, getOrCreateRoom } from "@/lib/meeting-store";

type Params = { params: Promise<{ code: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { session, error } = await requireSession();
  if (error) return error;
  const { code } = await params;
  const roomCode = code.toUpperCase();

  const meeting = await prisma.meeting.findUnique({ where: { roomCode } });
  const live = getRoom(roomCode);
  const memoryData = (live as { whiteboardData?: string })?.whiteboardData;

  const updatedAt =
    (live as { whiteboardUpdatedAt?: number })?.whiteboardUpdatedAt ?? 0;

  return NextResponse.json({
    data: meeting?.whiteboardData || memoryData || "[]",
    updatedBy: live?.hostId || meeting?.hostId,
    updatedAt,
  });
}

export async function POST(req: Request, { params }: Params) {
  const { session, error } = await requireSession();
  if (error) return error;
  const { code } = await params;
  const roomCode = code.toUpperCase();
  const { data } = await req.json();

  const room = getOrCreateRoom(roomCode, session!.user.id);
  (room as { whiteboardData?: string }).whiteboardData = JSON.stringify(
    data ?? []
  );
  (room as { whiteboardUpdatedAt?: number }).whiteboardUpdatedAt = Date.now();

  await prisma.meeting.updateMany({
    where: { roomCode },
    data: { whiteboardData: JSON.stringify(data ?? []) },
  });

  return NextResponse.json({ ok: true });
}

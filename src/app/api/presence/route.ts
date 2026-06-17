import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import {
  heartbeat,
  getOnlineUserIds,
  pruneStale,
} from "@/lib/presence-store";

export async function POST() {
  const { session, error } = await requireSession();
  if (error) return error;
  heartbeat(session!.user.id);
  pruneStale();
  return NextResponse.json({ ok: true });
}

export async function GET(req: Request) {
  const { session, error } = await requireSession();
  if (error) return error;
  heartbeat(session!.user.id);
  pruneStale();

  const ids = new URL(req.url).searchParams.get("ids");
  if (!ids) {
    return NextResponse.json({ online: [] as string[] });
  }
  const userIds = ids.split(",").map((s) => s.trim()).filter(Boolean);
  const online = [...getOnlineUserIds(userIds)];
  return NextResponse.json({ online });
}

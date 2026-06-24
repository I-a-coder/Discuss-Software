/**
 * POST /api/calendar-sync/disconnect
 *
 * Body: { provider: "google" | "microsoft" }
 *
 * Removes the stored calendar connection for the current user.
 */

import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { deleteConnection } from "@/lib/calendar/token-store";
import type { CalendarProviderName } from "@/lib/calendar/types";

export async function POST(req: Request) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const provider = body.provider as CalendarProviderName;

  if (provider !== "google" && provider !== "microsoft") {
    return NextResponse.json(
      { error: "provider must be 'google' or 'microsoft'" },
      { status: 400 }
    );
  }

  await deleteConnection(session!.user.id, provider);
  return NextResponse.json({ ok: true });
}

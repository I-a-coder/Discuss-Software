/**
 * GET /api/calendar-sync/status
 *
 * Returns connection state for all providers for the authenticated user.
 * Used by the Settings UI to decide what to render.
 *
 * Response shape:
 * {
 *   connections: {
 *     google:    { connected: boolean; tokenStatus: "ok"|"revoked"|null }
 *     microsoft: { connected: boolean; tokenStatus: "ok"|"revoked"|null }
 *   }
 * }
 */

import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { getAllConnections } from "@/lib/calendar/token-store";

export async function GET() {
  const { session, error } = await requireSession();
  if (error) return error;

  const rows = await getAllConnections(session!.user.id);

  const index = Object.fromEntries(rows.map((r) => [r.provider, r.tokenStatus]));

  return NextResponse.json({
    connections: {
      google: {
        connected:   "google" in index,
        tokenStatus: index["google"] ?? null,
      },
      microsoft: {
        connected:   "microsoft" in index,
        tokenStatus: index["microsoft"] ?? null,
      },
    },
  });
}

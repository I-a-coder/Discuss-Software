/**
 * Calendar sync error types and non-fatal error handler.
 */

import { prisma } from "@/lib/prisma";

/** Thrown when the provider signals a token has been revoked / expired */
export class CalendarTokenRevokedError extends Error {
  constructor(message = "Calendar token revoked or expired") {
    super(message);
    this.name = "CalendarTokenRevokedError";
  }
}

/** General provider API error */
export class CalendarApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(`Calendar API error ${status}: ${message}`);
    this.name = "CalendarApiError";
  }
}

/**
 * Non-fatal error handler — called inside meeting creation/edit/cancel routes.
 *
 * - If the token was revoked, marks it in the DB so the UI can show a reconnect prompt.
 * - All other errors are logged but not re-thrown so the meeting still saves successfully.
 */
export async function handleCalendarError(
  err: unknown,
  userId: string,
  provider: string
): Promise<void> {
  if (err instanceof CalendarTokenRevokedError) {
    console.warn(
      `[calendar] Token revoked for user=${userId} provider=${provider} — marking for reconnect`
    );
    try {
      await prisma.userCalendarConnection.update({
        where: { userId_provider: { userId, provider } },
        data: { tokenStatus: "revoked" },
      });
    } catch {
      // If the connection row is already gone, ignore
    }
    return;
  }

  if (err instanceof CalendarApiError) {
    console.error(
      `[calendar] API error for user=${userId} provider=${provider}: ${err.message}`
    );
    return;
  }

  console.error(
    `[calendar] Unexpected error for user=${userId} provider=${provider}:`,
    err
  );
}

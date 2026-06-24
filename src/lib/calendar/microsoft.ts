/**
 * Microsoft Graph API provider implementation.
 *
 * Uses plain fetch() — no extra SDK. Refreshes the access token on every
 * call using the stored refresh token (MSAL-style token refresh).
 */

import type { CalendarProvider, CalendarEventPayload } from "./types";
import { CalendarTokenRevokedError, CalendarApiError } from "./errors";
import type { StoredConnection } from "./token-store";

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

interface MicrosoftTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  error?: string;
  error_description?: string;
}

/** Exchange a refresh token for a fresh access token. */
async function refreshAccessToken(refreshToken: string): Promise<string> {
  const clientId     = process.env.MICROSOFT_CALENDAR_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CALENDAR_CLIENT_SECRET;
  const tenant       = process.env.MICROSOFT_CALENDAR_TENANT ?? "common";

  if (!clientId || !clientSecret) {
    throw new Error(
      "MICROSOFT_CALENDAR_CLIENT_ID / MICROSOFT_CALENDAR_CLIENT_SECRET not set"
    );
  }

  const body = new URLSearchParams({
    client_id:     clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type:    "refresh_token",
    scope:         "Calendars.ReadWrite offline_access",
  });

  const res = await fetch(
    `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
    { method: "POST", body, headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );

  const data: MicrosoftTokenResponse = await res.json();

  if (data.error) {
    const isRevoked =
      data.error === "invalid_grant" ||
      data.error === "interaction_required" ||
      (data.error_description ?? "").toLowerCase().includes("revoked");
    if (isRevoked) throw new CalendarTokenRevokedError(data.error_description ?? data.error);
    throw new CalendarApiError(res.status, data.error_description ?? data.error);
  }

  return data.access_token;
}

function toMicrosoftDateTime(date: Date, timeZone: string) {
  // Microsoft Graph expects ISO 8601 without trailing Z when timeZone is provided
  return {
    dateTime: date.toISOString().replace("Z", ""),
    timeZone,
  };
}

function mapAttendees(emails: string[]) {
  return emails.map((email) => ({
    emailAddress: { address: email },
    type: "required" as const,
  }));
}

export class MicrosoftCalendarProvider implements CalendarProvider {
  private readonly connection: StoredConnection;

  constructor(connection: StoredConnection) {
    this.connection = connection;
  }

  private async graphRequest(
    method: string,
    path: string,
    body?: unknown
  ): Promise<unknown> {
    const accessToken = await refreshAccessToken(this.connection.refreshToken);

    const res = await fetch(`${GRAPH_BASE}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    // 204 No Content = success with no body
    if (res.status === 204) return null;

    // Treat 401 as revoked — the refresh above already succeeded so this is
    // likely a scope or policy issue
    if (res.status === 401) throw new CalendarTokenRevokedError();

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new CalendarApiError(
        res.status,
        (errBody as { error?: { message?: string } })?.error?.message ?? res.statusText
      );
    }

    return res.json().catch(() => null);
  }

  async createEvent(payload: CalendarEventPayload): Promise<string> {
    const tz = payload.timeZone ?? "UTC";
    const body = {
      subject: payload.title,
      body: {
        contentType: "text",
        content: [
          payload.description,
          `Join: ${payload.joinUrl}`,
        ]
          .filter(Boolean)
          .join("\n\n"),
      },
      start:    toMicrosoftDateTime(payload.startAt, tz),
      end:      toMicrosoftDateTime(payload.endAt,   tz),
      location: { displayName: payload.joinUrl },
      attendees: mapAttendees(payload.attendeeEmails),
      // Microsoft automatically sends calendar invites when attendees are present
    };

    const calendarPath = this.connection.calendarId
      ? `/me/calendars/${this.connection.calendarId}/events`
      : "/me/events";

    const data = (await this.graphRequest("POST", calendarPath, body)) as {
      id?: string;
    };

    if (!data?.id) throw new CalendarApiError(0, "Microsoft Graph returned no event ID");
    return data.id;
  }

  async updateEvent(
    externalEventId: string,
    payload: Partial<CalendarEventPayload>
  ): Promise<void> {
    const tz = payload.timeZone ?? "UTC";
    const patch: Record<string, unknown> = {};

    if (payload.title)       patch.subject   = payload.title;
    if (payload.description) patch.body      = { contentType: "text", content: payload.description };
    if (payload.joinUrl)     patch.location  = { displayName: payload.joinUrl };
    if (payload.startAt)     patch.start     = toMicrosoftDateTime(payload.startAt, tz);
    if (payload.endAt)       patch.end       = toMicrosoftDateTime(payload.endAt,   tz);
    if (payload.attendeeEmails) patch.attendees = mapAttendees(payload.attendeeEmails);

    await this.graphRequest("PATCH", `/me/events/${externalEventId}`, patch);
  }

  async cancelEvent(externalEventId: string): Promise<void> {
    // Graph's /cancel endpoint sends a cancellation message to attendees
    await this.graphRequest("POST", `/me/events/${externalEventId}/cancel`, {
      comment: "This meeting has been cancelled.",
    });
  }
}

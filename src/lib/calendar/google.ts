/**
 * Google Calendar API provider implementation.
 *
 * Uses the `googleapis` package with an OAuth2Client.
 * Refresh tokens are managed automatically — when the access token expires,
 * the client library fetches a new one transparently using the refresh token.
 */

import { google } from "googleapis";
import type { CalendarProvider, CalendarEventPayload } from "./types";
import { CalendarTokenRevokedError, CalendarApiError } from "./errors";
import type { StoredConnection } from "./token-store";

function buildOAuth2Client(connection: StoredConnection) {
  const clientId     = process.env.GOOGLE_CALENDAR_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CALENDAR_CLIENT_ID / GOOGLE_CALENDAR_CLIENT_SECRET not set");
  }

  const oauth2 = new google.auth.OAuth2(clientId, clientSecret);
  oauth2.setCredentials({
    access_token:  connection.accessToken,
    refresh_token: connection.refreshToken,
    expiry_date:   connection.expiresAt.getTime(),
  });
  return oauth2;
}

function toGoogleDateTime(date: Date, timeZone: string) {
  return { dateTime: date.toISOString(), timeZone };
}

function mapAttendees(emails: string[]) {
  return emails.map((email) => ({ email }));
}

function isTokenError(err: unknown): boolean {
  const msg = String(err instanceof Error ? err.message : err).toLowerCase();
  return (
    msg.includes("invalid_grant") ||
    msg.includes("token has been expired") ||
    msg.includes("token has been revoked") ||
    msg.includes("invalid credentials")
  );
}

export class GoogleCalendarProvider implements CalendarProvider {
  private readonly connection: StoredConnection;

  constructor(connection: StoredConnection) {
    this.connection = connection;
  }

  async createEvent(payload: CalendarEventPayload): Promise<string> {
    const tz   = payload.timeZone ?? "UTC";
    const auth = buildOAuth2Client(this.connection);
    const cal  = google.calendar({ version: "v3", auth });

    const description =
      [
        payload.description,
        `\n🔗 Join: ${payload.joinUrl}`,
      ]
        .filter(Boolean)
        .join("\n\n");

    try {
      const res = await cal.events.insert({
        calendarId:  this.connection.calendarId ?? "primary",
        sendUpdates: "all",  // provider sends real calendar invites to attendees
        requestBody: {
          summary:     payload.title,
          description,
          location:    payload.joinUrl,
          start:       toGoogleDateTime(payload.startAt, tz),
          end:         toGoogleDateTime(payload.endAt,   tz),
          attendees:   mapAttendees(payload.attendeeEmails),
          conferenceData: undefined,
        },
      });

      const eventId = res.data.id;
      if (!eventId) throw new CalendarApiError(0, "Google returned no event ID");
      return eventId;
    } catch (err) {
      if (isTokenError(err)) throw new CalendarTokenRevokedError();
      if (err instanceof CalendarTokenRevokedError || err instanceof CalendarApiError) throw err;
      throw new CalendarApiError(0, String(err));
    }
  }

  async updateEvent(
    externalEventId: string,
    payload: Partial<CalendarEventPayload>
  ): Promise<void> {
    const tz   = payload.timeZone ?? "UTC";
    const auth = buildOAuth2Client(this.connection);
    const cal  = google.calendar({ version: "v3", auth });

    const patch: Record<string, unknown> = {};
    if (payload.title)       patch.summary  = payload.title;
    if (payload.description) patch.description = payload.description;
    if (payload.joinUrl)     patch.location   = payload.joinUrl;
    if (payload.startAt)     patch.start      = toGoogleDateTime(payload.startAt, tz);
    if (payload.endAt)       patch.end        = toGoogleDateTime(payload.endAt,   tz);
    if (payload.attendeeEmails) patch.attendees = mapAttendees(payload.attendeeEmails);

    try {
      await cal.events.patch({
        calendarId:  this.connection.calendarId ?? "primary",
        eventId:     externalEventId,
        sendUpdates: "all",
        requestBody: patch,
      });
    } catch (err) {
      if (isTokenError(err)) throw new CalendarTokenRevokedError();
      throw new CalendarApiError(0, String(err));
    }
  }

  async cancelEvent(externalEventId: string): Promise<void> {
    const auth = buildOAuth2Client(this.connection);
    const cal  = google.calendar({ version: "v3", auth });

    try {
      await cal.events.delete({
        calendarId:  this.connection.calendarId ?? "primary",
        eventId:     externalEventId,
        sendUpdates: "all",  // sends cancellation notice to all attendees
      });
    } catch (err: unknown) {
      // 410 Gone = already deleted — treat as success
      const status = (err as { code?: number }).code;
      if (status === 410 || status === 404) return;
      if (isTokenError(err)) throw new CalendarTokenRevokedError();
      throw new CalendarApiError(status ?? 0, String(err));
    }
  }
}

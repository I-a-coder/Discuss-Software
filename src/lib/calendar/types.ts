/**
 * Calendar sync — provider abstraction types.
 *
 * The rest of the app only depends on these types + getCalendarProvider().
 * It never imports Google or Microsoft implementation classes directly.
 */

export interface CalendarEventPayload {
  /** Meeting title shown in the calendar event */
  title: string;
  /** Optional description / agenda */
  description?: string;
  /** Event start time */
  startAt: Date;
  /** Event end time */
  endAt: Date;
  /** Join URL embedded in the event location / description */
  joinUrl: string;
  /** Attendee emails — the provider sends real calendar invites to all of them */
  attendeeEmails: string[];
  /** Organizer's email address */
  organizerEmail: string;
  /** IANA timezone string, defaults to "UTC" */
  timeZone?: string;
}

export interface CalendarProvider {
  /**
   * Create a new calendar event.
   * @returns the external event ID (opaque string from the provider)
   */
  createEvent(payload: CalendarEventPayload): Promise<string>;

  /**
   * Update an existing event. Only supplied fields are changed.
   */
  updateEvent(
    externalEventId: string,
    payload: Partial<CalendarEventPayload>
  ): Promise<void>;

  /**
   * Cancel an event and notify attendees.
   */
  cancelEvent(externalEventId: string): Promise<void>;
}

export type CalendarProviderName = "google" | "microsoft";

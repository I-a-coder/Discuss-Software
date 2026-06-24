/**
 * Calendar sync — provider factory.
 *
 * The rest of the app imports ONLY this file.
 * Provider implementation classes are never imported directly elsewhere.
 */

import type { CalendarProvider } from "./types";
import type { StoredConnection } from "./token-store";
import { GoogleCalendarProvider } from "./google";
import { MicrosoftCalendarProvider } from "./microsoft";

/**
 * Returns the correct CalendarProvider implementation for the given connection.
 */
export function getCalendarProvider(
  connection: StoredConnection
): CalendarProvider {
  switch (connection.provider) {
    case "google":
      return new GoogleCalendarProvider(connection);
    case "microsoft":
      return new MicrosoftCalendarProvider(connection);
    default:
      throw new Error(`Unknown calendar provider: ${connection.provider}`);
  }
}

// Re-export types so callers only need one import path
export type { CalendarProvider, CalendarEventPayload } from "./types";
export type { StoredConnection } from "./token-store";
export {
  getAnyConnection,
  getConnection,
  getAllConnections,
  saveConnection,
  deleteConnection,
  markTokenRevoked,
} from "./token-store";
export { handleCalendarError } from "./errors";

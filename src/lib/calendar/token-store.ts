/**
 * Calendar sync — server-side token store.
 *
 * Refresh tokens and access tokens are encrypted at rest using the same
 * AES-256-GCM key (ENCRYPTION_KEY) used for meeting notes and chat messages.
 * The server decrypts them on demand to call provider APIs.
 */

import { prisma } from "@/lib/prisma";
import { encrypt, decrypt } from "@/lib/encryption";
import type { CalendarProviderName } from "./types";

export interface RawTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  calendarId?: string | null;
}

export interface StoredConnection {
  id: string;
  userId: string;
  provider: CalendarProviderName;
  accessToken: string;   // decrypted
  refreshToken: string;  // decrypted
  expiresAt: Date;
  calendarId: string | null;
  tokenStatus: string;
}

/**
 * Persist (create or update) an OAuth token set for a user + provider.
 * Tokens are encrypted before writing to the database.
 */
export async function saveConnection(
  userId: string,
  provider: CalendarProviderName,
  tokens: RawTokens
): Promise<void> {
  await prisma.userCalendarConnection.upsert({
    where: { userId_provider: { userId, provider } },
    create: {
      userId,
      provider,
      accessToken:  encrypt(tokens.accessToken),
      refreshToken: encrypt(tokens.refreshToken),
      expiresAt:    tokens.expiresAt,
      calendarId:   tokens.calendarId ?? null,
      tokenStatus:  "ok",
    },
    update: {
      accessToken:  encrypt(tokens.accessToken),
      refreshToken: encrypt(tokens.refreshToken),
      expiresAt:    tokens.expiresAt,
      calendarId:   tokens.calendarId ?? null,
      tokenStatus:  "ok",
    },
  });
}

/**
 * Retrieve and decrypt a connection, or null if the user hasn't connected
 * this provider (or the connection has been deleted).
 */
export async function getConnection(
  userId: string,
  provider: CalendarProviderName
): Promise<StoredConnection | null> {
  const row = await prisma.userCalendarConnection.findUnique({
    where: { userId_provider: { userId, provider } },
  });
  if (!row) return null;

  return {
    id:           row.id,
    userId:       row.userId,
    provider:     row.provider as CalendarProviderName,
    accessToken:  decrypt(row.accessToken),
    refreshToken: decrypt(row.refreshToken),
    expiresAt:    row.expiresAt,
    calendarId:   row.calendarId,
    tokenStatus:  row.tokenStatus,
  };
}

/**
 * Return connections for ALL providers for a user (used by the status API).
 */
export async function getAllConnections(
  userId: string
): Promise<{ provider: CalendarProviderName; tokenStatus: string }[]> {
  const rows = await prisma.userCalendarConnection.findMany({
    where: { userId },
    select: { provider: true, tokenStatus: true },
  });
  return rows.map((r) => ({
    provider: r.provider as CalendarProviderName,
    tokenStatus: r.tokenStatus,
  }));
}

/**
 * Return the first connected provider for a user (any provider).
 * Used when we just need "does this user have ANY calendar connected".
 */
export async function getAnyConnection(
  userId: string
): Promise<StoredConnection | null> {
  const row = await prisma.userCalendarConnection.findFirst({
    where: { userId, tokenStatus: "ok" },
  });
  if (!row) return null;

  return {
    id:           row.id,
    userId:       row.userId,
    provider:     row.provider as CalendarProviderName,
    accessToken:  decrypt(row.accessToken),
    refreshToken: decrypt(row.refreshToken),
    expiresAt:    row.expiresAt,
    calendarId:   row.calendarId,
    tokenStatus:  row.tokenStatus,
  };
}

/**
 * Delete a user's connection to a calendar provider.
 */
export async function deleteConnection(
  userId: string,
  provider: CalendarProviderName
): Promise<void> {
  await prisma.userCalendarConnection.deleteMany({
    where: { userId, provider },
  });
}

/**
 * Mark a connection as revoked so the UI prompts reconnection.
 * Called automatically by handleCalendarError when a 401/invalid_grant occurs.
 */
export async function markTokenRevoked(
  userId: string,
  provider: CalendarProviderName
): Promise<void> {
  await prisma.userCalendarConnection.updateMany({
    where: { userId, provider },
    data: { tokenStatus: "revoked" },
  });
}

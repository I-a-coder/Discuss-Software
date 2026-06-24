/**
 * GET /api/calendar-sync/callback?code=...&state=...
 *
 * OAuth callback handler.
 * 1. Validates the HMAC-signed state parameter.
 * 2. Exchanges the authorization code for tokens.
 * 3. Saves encrypted tokens to the database.
 * 4. Redirects to settings with a success flag.
 */

import { NextResponse } from "next/server";
import { createHmac } from "crypto";
import { saveConnection } from "@/lib/calendar/token-store";
import type { CalendarProviderName } from "@/lib/calendar/types";

const APP_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

function verify(stateBase64: string): { userId: string; provider: CalendarProviderName } | null {
  try {
    const secret = process.env.NEXTAUTH_SECRET ?? "dev-secret";
    const { data, sig } = JSON.parse(Buffer.from(stateBase64, "base64url").toString());
    const expected = createHmac("sha256", secret).update(data).digest("hex");
    if (sig !== expected) return null;
    return JSON.parse(data);
  } catch {
    return null;
  }
}

async function exchangeGoogleCode(
  code: string
): Promise<{ accessToken: string; refreshToken: string; expiresAt: Date }> {
  const clientId     = process.env.GOOGLE_CALENDAR_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET!;
  const redirectUri  = `${APP_URL}/api/calendar-sync/callback`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id:     clientId,
      client_secret: clientSecret,
      redirect_uri:  redirectUri,
      grant_type:    "authorization_code",
    }),
  });

  const data = await res.json();
  if (data.error) throw new Error(`Google token error: ${data.error_description ?? data.error}`);

  return {
    accessToken:  data.access_token,
    refreshToken: data.refresh_token,
    expiresAt:    new Date(Date.now() + data.expires_in * 1000),
  };
}

async function exchangeMicrosoftCode(
  code: string
): Promise<{ accessToken: string; refreshToken: string; expiresAt: Date }> {
  const clientId     = process.env.MICROSOFT_CALENDAR_CLIENT_ID!;
  const clientSecret = process.env.MICROSOFT_CALENDAR_CLIENT_SECRET!;
  const tenant       = process.env.MICROSOFT_CALENDAR_TENANT ?? "common";
  const redirectUri  = `${APP_URL}/api/calendar-sync/callback`;

  const res = await fetch(
    `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id:     clientId,
        client_secret: clientSecret,
        redirect_uri:  redirectUri,
        grant_type:    "authorization_code",
        scope:         "Calendars.ReadWrite offline_access",
      }),
    }
  );

  const data = await res.json();
  if (data.error) throw new Error(`Microsoft token error: ${data.error_description ?? data.error}`);

  return {
    accessToken:  data.access_token,
    refreshToken: data.refresh_token,
    expiresAt:    new Date(Date.now() + data.expires_in * 1000),
  };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code  = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthError = searchParams.get("error");

  // User denied access
  if (oauthError) {
    return NextResponse.redirect(
      `${APP_URL}/dashboard/settings?calendarError=${encodeURIComponent(oauthError)}&tab=general`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${APP_URL}/dashboard/settings?calendarError=missing_params&tab=general`
    );
  }

  const statePayload = verify(state);
  if (!statePayload) {
    return NextResponse.redirect(
      `${APP_URL}/dashboard/settings?calendarError=invalid_state&tab=general`
    );
  }

  const { userId, provider } = statePayload;

  try {
    let tokens: { accessToken: string; refreshToken: string; expiresAt: Date };

    if (provider === "google") {
      tokens = await exchangeGoogleCode(code);
    } else {
      tokens = await exchangeMicrosoftCode(code);
    }

    await saveConnection(userId, provider, {
      accessToken:  tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt:    tokens.expiresAt,
    });

    return NextResponse.redirect(
      `${APP_URL}/dashboard/settings?calendarConnected=${provider}&tab=general`
    );
  } catch (err) {
    console.error("[calendar/callback] Token exchange error:", err);
    return NextResponse.redirect(
      `${APP_URL}/dashboard/settings?calendarError=token_exchange_failed&tab=general`
    );
  }
}

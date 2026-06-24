/**
 * GET /api/calendar-sync/connect?provider=google|microsoft
 *
 * Redirects the authenticated user to the OAuth consent screen for
 * the requested calendar provider.
 *
 * A signed `state` parameter (HMAC-SHA256 with NEXTAUTH_SECRET) is included
 * to prevent CSRF on the callback.
 */

import { NextResponse } from "next/server";
import { createHmac, randomBytes } from "crypto";
import { requireSession } from "@/lib/api-auth";

function sign(payload: string): string {
  const secret = process.env.NEXTAUTH_SECRET ?? "dev-secret";
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export async function GET(req: Request) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const provider = searchParams.get("provider");

  if (provider !== "google" && provider !== "microsoft") {
    return NextResponse.json(
      { error: "provider must be 'google' or 'microsoft'" },
      { status: 400 }
    );
  }

  const appUrl   = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const nonce    = randomBytes(16).toString("hex");
  const stateData = JSON.stringify({ userId: session!.user.id, provider, nonce });
  const sig       = sign(stateData);
  const state     = Buffer.from(JSON.stringify({ data: stateData, sig })).toString("base64url");

  const redirectUri = `${appUrl}/api/calendar-sync/callback`;

  let authUrl: string;

  if (provider === "google") {
    const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
    if (!clientId) {
      return NextResponse.json(
        { error: "GOOGLE_CALENDAR_CLIENT_ID not configured" },
        { status: 500 }
      );
    }
    const params = new URLSearchParams({
      client_id:     clientId,
      redirect_uri:  redirectUri,
      response_type: "code",
      scope:         "https://www.googleapis.com/auth/calendar.events",
      access_type:   "offline",
      prompt:        "consent",   // force refresh_token every time
      state,
    });
    authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  } else {
    // Microsoft
    const clientId = process.env.MICROSOFT_CALENDAR_CLIENT_ID;
    const tenant   = process.env.MICROSOFT_CALENDAR_TENANT ?? "common";
    if (!clientId) {
      return NextResponse.json(
        { error: "MICROSOFT_CALENDAR_CLIENT_ID not configured" },
        { status: 500 }
      );
    }
    const params = new URLSearchParams({
      client_id:     clientId,
      redirect_uri:  redirectUri,
      response_type: "code",
      scope:         "Calendars.ReadWrite offline_access",
      response_mode: "query",
      state,
    });
    authUrl = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?${params}`;
  }

  return NextResponse.redirect(authUrl);
}

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { limitByKey } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "local";
    const limit = limitByKey(`signup:${ip}`, { windowMs: 60_000, max: 6 });
    if (!limit.allowed) {
      return NextResponse.json(
        { error: `Too many signup attempts. Try again in ${limit.retryAfterSec}s` },
        { status: 429 }
      );
    }
    const { name, email, password, orgName } = await req.json();
    if (!email || !password || password.length < 6) {
      return NextResponse.json(
        { error: "Email and password (6+ chars) required" },
        { status: 400 }
      );
    }
    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 400 });
    }
    const slug =
      (orgName || name || "team")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .slice(0, 30) +
      "-" +
      Date.now().toString(36);
    const org = await prisma.organization.create({
      data: {
        name: orgName || `${name || "My"}'s Team`,
        slug,
      },
    });
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        passwordHash,
        role: "OWNER",
        organizationId: org.id,
      },
    });
    await prisma.activityLog.create({
      data: {
        action: "ORG_CREATED",
        details: `Organization "${org.name}" created`,
        userId: user.id,
        organizationId: org.id,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Signup failed" }, { status: 500 });
  }
}

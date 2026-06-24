import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { session, error } = await requireSession();
  if (error) return error;
  const { searchParams } = new URL(req.url);
  const lang = searchParams.get("lang");

  if (!lang) {
    return NextResponse.json({ error: "lang required" }, { status: 400 });
  }

  try {
    const cached = await prisma.translationCache.findMany({
      where: { lang },
      select: { key: true, value: true }
    });

    const cacheDict: Record<string, string> = {};
    for (const item of cached) {
      cacheDict[item.key] = item.value;
    }

    return NextResponse.json({ cache: cacheDict });
  } catch (e) {
    console.error("[translate/cache] error:", e);
    return NextResponse.json({ error: "Failed to fetch cache" }, { status: 500 });
  }
}

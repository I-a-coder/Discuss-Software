import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-auth";

export async function GET(req: Request) {
  const { session, error } = await requireSession();
  if (error) return error;
  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope") || "org";
  const where =
    scope === "personal"
      ? { userId: session!.user.id }
      : { organizationId: session!.user.organizationId || undefined };
  const logs = await prisma.activityLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { user: { select: { name: true, email: true } } },
  });
  return NextResponse.json(logs);
}

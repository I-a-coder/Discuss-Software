import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-auth";

export async function GET(req: Request) {
  const { session, error } = await requireSession();
  if (error) return error;
  const q = new URL(req.url).searchParams.get("q")?.trim() || "";
  const qLower = q.toLowerCase();
  const orgId = session!.user.organizationId;
  if (!orgId) return NextResponse.json([]);

  const users = await prisma.user.findMany({
    where: {
      organizationId: orgId,
      NOT: { id: session!.user.id },
      ...(q
        ? {
            OR: [
              { name: { contains: q } },
              { name: { contains: qLower } },
              { email: { contains: q } },
              { email: { contains: qLower } },
            ],
          }
        : {}),
    },
    select: { id: true, name: true, email: true, role: true, image: true },
    take: 20,
    orderBy: { name: "asc" },
  });

  return NextResponse.json(users);
}

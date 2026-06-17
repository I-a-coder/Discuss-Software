import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-auth";

export async function GET(req: Request) {
  const { session, error } = await requireSession();
  if (error) return error;
  const orgId = session!.user.organizationId;
  if (!orgId) return NextResponse.json({ communities: [], threads: [] });

  const communities = await prisma.community.findMany({
    where: { organizationId: orgId },
    include: {
      channels: {
        include: {
          thread: {
            include: {
              messages: {
                orderBy: { createdAt: "desc" },
                take: 1,
                include: { author: { select: { name: true } } },
              },
            },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const dmThreads = await prisma.chatThread.findMany({
    where: {
      type: "dm",
      OR: [{ dmUserAId: session!.user.id }, { dmUserBId: session!.user.id }],
    },
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { author: { select: { name: true } } },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const userIds = new Set<string>();
  dmThreads.forEach((t) => {
    if (t.dmUserAId) userIds.add(t.dmUserAId);
    if (t.dmUserBId) userIds.add(t.dmUserBId);
  });
  const users = await prisma.user.findMany({
    where: { id: { in: [...userIds] } },
    select: { id: true, name: true, email: true, image: true },
  });
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

  return NextResponse.json({
    communities,
    dmThreads: dmThreads.map((t) => {
      const otherId =
        t.dmUserAId === session!.user.id ? t.dmUserBId : t.dmUserAId;
      const other = otherId ? userMap[otherId] : null;
      return {
        ...t,
        otherUser: other,
        displayName: other?.name || other?.email || "Chat",
      };
    }),
  });
}

export async function POST(req: Request) {
  const { session, error } = await requireSession();
  if (error) return error;
  const { type, channelId, targetUserId, name } = await req.json();
  const orgId = session!.user.organizationId;
  if (!orgId) {
    return NextResponse.json({ error: "No organization selected" }, { status: 400 });
  }

  if (type === "dm" && targetUserId) {
    const target = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, organizationId: true },
    });
    if (!target || target.organizationId !== orgId) {
      return NextResponse.json(
        { error: "Direct message target must be in your organization" },
        { status: 403 }
      );
    }
    const a = session!.user.id;
    const b = targetUserId;
    const [dmUserAId, dmUserBId] = a < b ? [a, b] : [b, a];
    const existing = await prisma.chatThread.findUnique({
      where: { dmUserAId_dmUserBId: { dmUserAId, dmUserBId } },
    });
    if (existing) return NextResponse.json(existing);
    const thread = await prisma.chatThread.create({
      data: { type: "dm", dmUserAId, dmUserBId, name: name || null },
    });
    return NextResponse.json(thread);
  }

  return NextResponse.json({ error: "Invalid thread" }, { status: 400 });
}

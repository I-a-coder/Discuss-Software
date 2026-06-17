import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-auth";
import { canPerform } from "@/lib/permissions";
import type { UserRole } from "@/lib/permissions";

export async function GET() {
  const { session, error } = await requireSession();
  if (error) return error;
  const orgId = session!.user.organizationId;
  if (!orgId) return NextResponse.json([]);

  const communities = await prisma.community.findMany({
    where: { organizationId: orgId },
    include: { channels: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(communities);
}

export async function POST(req: Request) {
  const { session, error } = await requireSession();
  if (error) return error;
  const role = session!.user.role as UserRole;
  if (!canPerform(role, "manageCommunities")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { name, description, channelName } = await req.json();
  const orgId = session!.user.organizationId;
  if (!orgId) {
    return NextResponse.json({ error: "No organization" }, { status: 400 });
  }

  const slug = (channelName || "general")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

  const community = await prisma.community.create({
    data: {
      name: name || "New Community",
      description: description || null,
      organizationId: orgId,
      channels: {
        create: {
          name: channelName || "General",
          slug: slug || "general",
        },
      },
    },
    include: { channels: true },
  });

  for (const ch of community.channels) {
    await prisma.chatThread.create({
      data: { type: "channel", channelId: ch.id },
    });
  }

  return NextResponse.json(community);
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-auth";
import { canPerform } from "@/lib/permissions";
import type { UserRole } from "@/lib/permissions";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/chat/communities/[id]/members
 * Body: { email: string }
 *
 * Finds an org member by email and sends them a DM invite to this community.
 * Since communities are org-wide (no separate membership table) this creates
 * a DM thread from the caller to the found user with an invite message.
 */
export async function POST(req: Request, { params }: Params) {
  const { session, error } = await requireSession();
  if (error) return error;

  const role = session!.user.role as UserRole;
  if (!canPerform(role, "manageCommunities")) {
    return NextResponse.json({ error: "Only admins can invite members" }, { status: 403 });
  }

  const { id: communityId } = await params;
  const { email } = await req.json();

  if (!email?.trim()) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const orgId = session!.user.organizationId;
  if (!orgId) {
    return NextResponse.json({ error: "No organisation" }, { status: 400 });
  }

  // Verify the community belongs to this org
  const community = await prisma.community.findFirst({
    where: { id: communityId, organizationId: orgId },
    include: { channels: { take: 1 } },
  });
  if (!community) {
    return NextResponse.json({ error: "Community not found" }, { status: 404 });
  }

  // Find target user in the same organisation
  const targetUser = await prisma.user.findFirst({
    where: { email: email.trim().toLowerCase(), organizationId: orgId },
    select: { id: true, name: true, email: true },
  });
  if (!targetUser) {
    return NextResponse.json(
      { error: "No user with that email found in your organisation." },
      { status: 404 }
    );
  }
  if (targetUser.id === session!.user.id) {
    return NextResponse.json({ error: "You cannot invite yourself." }, { status: 400 });
  }

  const callerId = session!.user.id;
  const callerName = session!.user.name || session!.user.email || "Someone";

  // Get or create a DM thread between caller and target
  const [userA, userB] = [callerId, targetUser.id].sort();
  let thread = await prisma.chatThread.findFirst({
    where: { dmUserAId: userA, dmUserBId: userB },
  });
  if (!thread) {
    thread = await prisma.chatThread.create({
      data: { type: "dm", dmUserAId: userA, dmUserBId: userB },
    });
  }

  // Send invite message as a chat message
  const inviteText =
    `👋 Hi! ${callerName} has invited you to join the **${community.name}** community on Yusi Discuss. ` +
    `Open the Channels tab in Discussion to get started!`;

  await prisma.chatMessage.create({
    data: {
      threadId: thread.id,
      authorId: callerId,
      content: inviteText,
      encrypted: false,
    },
  });

  // Log activity
  await prisma.activityLog.create({
    data: {
      action: "COMMUNITY_INVITE_SENT",
      details: `Invited ${targetUser.email} to ${community.name}`,
      userId: callerId,
      organizationId: orgId,
    },
  });

  return NextResponse.json({
    ok: true,
    invitedUser: { id: targetUser.id, name: targetUser.name, email: targetUser.email },
    thread: { id: thread.id },
  });
}

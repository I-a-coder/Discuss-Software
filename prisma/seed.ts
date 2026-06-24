import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.upsert({
    where: { slug: "yusi-team" },
    update: {},
    create: { name: "Yusi Discuss Team", slug: "yusi-team" },
  });

  const passwordHash = await bcrypt.hash("demo1234", 10);

  const owner = await prisma.user.upsert({
    where: { email: "owner@yusi.com" },
    update: { name: "Sadia Shafiq", role: "OWNER", organizationId: org.id },
    create: {
      email: "owner@yusi.com",
      name: "Sadia Shafiq",
      passwordHash,
      role: "OWNER",
      organizationId: org.id,
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@yusi.com" },
    update: { name: "Ahmed Khan", role: "ADMIN", organizationId: org.id },
    create: {
      email: "admin@yusi.com",
      name: "Ahmed Khan",
      passwordHash,
      role: "ADMIN",
      organizationId: org.id,
    },
  });

  const member = await prisma.user.upsert({
    where: { email: "member@yusi.com" },
    update: { name: "Haya Khan" },
    create: {
      email: "member@yusi.com",
      name: "Haya Khan",
      passwordHash,
      role: "MEMBER",
      organizationId: org.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "guest@yusi.com" },
    update: { name: "Zainab Ali" },
    create: {
      email: "guest@yusi.com",
      name: "Zainab Ali",
      passwordHash,
      role: "GUEST",
      organizationId: org.id,
    },
  });

  const commCount = await prisma.community.count({ where: { organizationId: org.id } });
  if (commCount === 0) {
    const work = await prisma.community.create({
      data: {
        name: "Yusi Technologies Work",
        description: "Main workspace community",
        organizationId: org.id,
        channels: {
          create: [
            { name: "General", slug: "general", mode: "open" },
            {
              name: "Announcements",
              slug: "announcements",
              mode: "announcements",
              ownerId: owner.id,
            },
            { name: "Projects", slug: "projects", mode: "open" },
          ],
        },
      },
      include: { channels: true },
    });
    for (const ch of work.channels) {
      await prisma.chatThread.create({
        data: { type: "channel", channelId: ch.id },
      });
    }
    const generalThread = await prisma.chatThread.findFirst({
      where: { channelId: work.channels.find((c) => c.slug === "general")!.id },
    });
    if (generalThread) {
      await prisma.chatMessage.create({
        data: {
          threadId: generalThread.id,
          authorId: owner.id,
          content: "Welcome to Yusi Discuss network! Search people or open channels to connect.",
          encrypted: false,
        },
      });
    }
  }

  await prisma.channel.updateMany({
    where: {
      slug: "announcements",
      community: { organizationId: org.id },
    },
    data: { mode: "announcements", ownerId: owner.id },
  });

  const msgCount = await prisma.discussionMessage.count();
  if (msgCount === 0) {
    await prisma.discussionMessage.createMany({
      data: [
        {
          content: "Welcome to Yusi Discuss! Start collaborating here.",
          authorId: owner.id,
          channel: "general",
        },
        {
          content: "Project kickoff is scheduled for Friday.",
          authorId: admin.id,
          channel: "general",
        },
      ],
    });
  }

  const taskCount = await prisma.task.count({ where: { organizationId: org.id } });
  let task1 = await prisma.task.findFirst({
    where: { organizationId: org.id, title: "Design onboarding flow" },
  });
  if (taskCount === 0) {
  task1 = await prisma.task.create({
    data: {
      title: "Design onboarding flow",
      description: "Create beginner-friendly screens",
      status: "IN_PROGRESS",
      color: "#FEF3C7",
      dueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      assignees: { create: [{ userId: member.id }] },
      creatorId: owner.id,
      organizationId: org.id,
      comments: {
        create: [{ content: "Use purple brand colors", authorName: "Sam Admin" }],
      },
    },
  });

  await prisma.task.create({
    data: {
      title: "Set up Google login",
      status: "TODO",
      color: "#DBEAFE",
      dueAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      assignees: { create: [{ userId: admin.id }] },
      creatorId: owner.id,
      organizationId: org.id,
    },
  });

  await prisma.task.create({
    data: {
      title: "Review encryption docs",
      status: "REVIEW",
      color: "#D1FAE5",
      assignees: { create: [{ userId: owner.id }, { userId: admin.id }] },
      creatorId: admin.id,
      organizationId: org.id,
    },
  });
  }

  const noteCount = await prisma.personalNote.count({ where: { userId: member.id } });
  if (noteCount === 0) {
  await prisma.personalNote.create({
    data: {
      title: "Ideas",
      content: "Add voice notes in v2",
      userId: member.id,
    },
  });
  }

  const meetingCount = await prisma.meetingNote.count();
  if (meetingCount === 0) {
  await prisma.meetingNote.create({
    data: {
      title: "Sprint Planning",
      content: "Discussed Q2 roadmap and priorities.",
      summary: "Focus on UX polish and security.",
      authorId: admin.id,
    },
  });
  }

  const logCount = await prisma.activityLog.count({ where: { organizationId: org.id } });
  if (logCount === 0 && task1) {
  await prisma.activityLog.createMany({
    data: [
      {
        action: "TASK_CREATED",
        details: `Created task: ${task1.title}`,
        userId: owner.id,
        organizationId: org.id,
      },
      {
        action: "ORG_CREATED",
        details: "Organization workspace initialized",
        organizationId: org.id,
      },
    ],
  });
  }

  console.log("Seed complete. Demo accounts (password: demo1234):");
  console.log("  owner@yusi.com, admin@yusi.com, member@yusi.com, guest@yusi.com");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

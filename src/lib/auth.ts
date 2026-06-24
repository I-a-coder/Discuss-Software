import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import type { UserRole } from "./permissions";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role: UserRole;
      organizationId?: string | null;
      organizationName?: string | null;
    };
  }
  interface User {
    role: UserRole;
    organizationId?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    organizationId?: string | null;
    organizationName?: string | null;
    picture?: string | null;
  }
}

const googleId = process.env.GOOGLE_CLIENT_ID?.trim() || "";
const googleSecret = process.env.GOOGLE_CLIENT_SECRET?.trim() || "";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 }, // 30 days
  pages: {
    signIn: "/login",
    newUser: "/signup",
  },
  providers: [
    ...(googleId && googleSecret
      ? [
          GoogleProvider({
            clientId: googleId,
            clientSecret: googleSecret,
            httpOptions: { timeout: 15000 },
          }),
        ]
      : []),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
          include: { organization: true },
        });
        if (!user?.passwordHash) return null;
        const valid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );
        if (!valid) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role as UserRole,
          organizationId: user.organizationId,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email) {
        let dbUser = await prisma.user.findUnique({
          where: { email: user.email.toLowerCase() },
        });
        if (!dbUser) {
          let org = await prisma.organization.findFirst({
            where: { slug: "yusi-team" },
          });
          if (!org) {
            org = await prisma.organization.findFirst({
              where: { slug: "default-org" },
            });
          }
          if (!org) {
            org = await prisma.organization.create({
              data: { name: "Yusi Discuss Team", slug: "yusi-team" },
            });
          }
          dbUser = await prisma.user.create({
            data: {
              email: user.email.toLowerCase(),
              name: user.name,
              image: user.image,
              role: "MEMBER",
              organizationId: org.id,
            },
          });
          await prisma.activityLog.create({
            data: {
              action: "USER_JOINED",
              details: `${user.name || user.email} joined via Google`,
              userId: dbUser.id,
              organizationId: org.id,
            },
          });
        } else if (user.image && dbUser.image !== user.image) {
          await prisma.user.update({
            where: { id: dbUser.id },
            data: { image: user.image, name: user.name || dbUser.name },
          });
        }
      }
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        const dbUser = await prisma.user.findUnique({
          where: { email: (user.email || token.email || "").toLowerCase() },
          include: { organization: true },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role as UserRole;
          token.organizationId = dbUser.organizationId;
          token.organizationName = dbUser.organization?.name;
          token.picture = dbUser.image;
        }
      }
      if (trigger === "update") {
        if (session?.role) token.role = session.role;
        if (session?.image !== undefined) token.picture = session.image;
        if (session?.name !== undefined) token.name = session.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.organizationId = token.organizationId;
        session.user.organizationName = token.organizationName;
        session.user.image = token.picture ?? session.user.image;
        if (token.name) session.user.name = token.name;
      }
      return session;
    },
  },
};

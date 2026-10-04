import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";

const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  secret: process.env.AUTH_SECRET || (process.env.NODE_ENV === "development" ? "local-development-only-secret" : undefined),
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  providers: [
    ...(googleEnabled ? [Google] : []),
    Credentials({
      id: "credentials",
      name: "Email dan password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const identifier = typeof credentials.email === "string" ? credentials.email.trim().toLowerCase() : "";
        const password = typeof credentials.password === "string" ? credentials.password : "";
        if (!identifier || !password) return null;

        // Identifier boleh email ATAU username (kolom users.username, unique).
        const isEmail = identifier.includes("@");
        const user = await prisma.user.findUnique({
          where: isEmail ? { email: identifier } : { username: identifier },
        });
        if (!user?.password || !user.isActive || user.deletedAt) return null;
        if (!(await verifyPassword(password, user.password))) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          platformRole: user.platformRole,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.id) return false;
      const account = await prisma.user.findUnique({
        where: { id: user.id },
        select: { isActive: true, deletedAt: true },
      });
      // First-time OAuth users may not exist in the adapter database until the
      // login flow completes. Existing disabled/deleted accounts are rejected.
      if (!account) return true;
      return Boolean(account.isActive && !account.deletedAt);
    },
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.platformRole = user.platformRole;
      }

      const userId = typeof token.userId === "string" ? token.userId : token.sub;
      if (userId) {
        const account = await prisma.user.findUnique({
          where: { id: userId },
          select: { platformRole: true, isActive: true, deletedAt: true },
        });
        if (!account?.isActive || account.deletedAt) return null;
        token.userId = userId;
        token.platformRole = account.platformRole;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = typeof token.userId === "string" ? token.userId : token.sub || "";
        session.user.platformRole =
          token.platformRole === "SUPER_ADMIN" ||
          token.platformRole === "SUPPORT" ||
          token.platformRole === "BROKER" ||
          token.platformRole === "MEMBER"
            ? token.platformRole
            : "MEMBER";
      }
      return session;
    },
  },
});

export { googleEnabled };

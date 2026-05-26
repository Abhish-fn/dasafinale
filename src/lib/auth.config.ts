import Google from 'next-auth/providers/google';
import type { NextAuthConfig } from 'next-auth';

export default {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      // On first sign-in, the full auth.ts signIn callback caches dbRole on user
      if (user) {
        token.role = (user as Record<string, unknown>).dbRole as string || 'user';
        token.userId = (user as Record<string, unknown>).dbId as string;
      }
      return token;
    },
    session({ session, token }) {
      session.user.role = token.role as string;
      session.user.id = token.userId as string;
      return session;
    },
  },
} satisfies NextAuthConfig;

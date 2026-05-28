import NextAuth from 'next-auth';
import authConfig from './auth.config';
import dbConnect from './db';
import User from '@/models/User';

const ROLE_REFRESH_INTERVAL_MS = 5 * 60 * 1000; // Re-check role from DB every 5 minutes

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  trustHost: true,
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    ...authConfig.callbacks,
    signIn: async ({ user }) => {
      try {
        await dbConnect();
        let dbUser = await User.findOne({ email: user.email });
        if (!dbUser) {
          dbUser = await User.create({
            name: user.name ?? '',
            email: user.email ?? '',
            image: user.image ?? '',
            provider: 'google',
            role: 'user',
          });
        }
        // Cache DB data on user object — jwt callback reads this, NO second DB call
        (user as Record<string, unknown>).dbId = dbUser._id.toString();
        (user as Record<string, unknown>).dbRole = dbUser.role;
        return true;
      } catch (error) {
        console.error('Auth signIn error:', error);
        return '/login?error=db';
      }
    },
    jwt: async ({ token, user }) => {
      // On first sign-in, cache role from the signIn callback
      if (user) {
        token.role = (user as Record<string, unknown>).dbRole as string || 'user';
        token.userId = (user as Record<string, unknown>).dbId as string;
        token.roleRefreshedAt = Date.now();
      }

      // Periodically re-fetch role from DB so admin changes via mongosh take effect without re-login
      if (token.userId && (!token.roleRefreshedAt || Date.now() - (token.roleRefreshedAt as number) > ROLE_REFRESH_INTERVAL_MS)) {
        try {
          await dbConnect();
          const dbUser = await User.findById(token.userId).select('role').lean();
          if (dbUser) {
            token.role = (dbUser as { role: string }).role;
          }
        } catch (err) {
          console.error('JWT role refresh error:', err);
        }
        token.roleRefreshedAt = Date.now();
      }

      return token;
    },
  },
});

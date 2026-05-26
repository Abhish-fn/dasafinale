import NextAuth from 'next-auth';
import authConfig from './auth.config';
import dbConnect from './db';
import User from '@/models/User';

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
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
  },
});

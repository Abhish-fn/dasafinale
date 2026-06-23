import NextAuth from 'next-auth';
import authConfig from '@/lib/auth.config';

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const isAdmin = (req.auth?.user as unknown as { role?: string })?.role === 'admin';

  const isAdminRoute = nextUrl.pathname.startsWith('/admin');
  const protectedPrefixes = ['/cart', '/wishlist', '/checkout', '/orders', '/account', '/track'];
  const isProtectedRoute = protectedPrefixes.some((prefix) => nextUrl.pathname.startsWith(prefix));

  if (isAdminRoute && !isAdmin) {
    return Response.redirect(new URL('/login', nextUrl));
  }

  if (isProtectedRoute && !isLoggedIn) {
    const loginUrl = new URL('/login', nextUrl);
    loginUrl.searchParams.set('callbackUrl', nextUrl.pathname);
    return Response.redirect(loginUrl);
  }
});

export const config = {
  matcher: [
    '/admin/:path*',
    '/cart/:path*',
    '/wishlist/:path*',
    '/checkout/:path*',
    '/orders/:path*',
    '/account/:path*',
    '/track/:path*',
  ],
};

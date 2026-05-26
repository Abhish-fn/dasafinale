import type { Metadata } from 'next';
import { Inter, Outfit } from 'next/font/google';
import './globals.css';
import Providers from './providers';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'DasaDinusulu — Healthy Snacking, Reimagined',
    template: '%s | DasaDinusulu',
  },
  description:
    'Premium healthy snacks made with millets, seeds, and superfoods. No maida, no refined sugar — just pure, wholesome goodness. Free delivery above ₹499.',
  keywords: ['healthy snacks', 'millet snacks', 'no maida', 'organic', 'DasaDinusulu', 'protein bars', 'superfoods', 'clay pot roasted seeds'],
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://dasadinusulu.com'),
  openGraph: {
    title: 'DasaDinusulu — Healthy Snacking, Reimagined',
    description: 'Premium healthy snacks made with millets, seeds, and superfoods. No maida, no refined sugar.',
    siteName: 'DasaDinusulu',
    locale: 'en_IN',
    type: 'website',
  },
  robots: { index: true, follow: true },
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${outfit.variable}`}>
        <Providers>
          <Navbar />
          <main style={{ minHeight: 'calc(100dvh - 64px)' }}>{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}

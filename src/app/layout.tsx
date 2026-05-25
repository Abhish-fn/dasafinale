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
  title: 'DasaDinusulu — Healthy Snacking, Reimagined',
  description:
    'Premium healthy snacks made with millets, seeds, and superfoods. No maida, no refined sugar — just pure, wholesome goodness.',
  keywords: ['healthy snacks', 'millet snacks', 'no maida', 'organic', 'DasaDinusulu'],
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

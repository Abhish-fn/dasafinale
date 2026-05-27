import type { Metadata } from 'next';
import './globals.css';
import Providers from './providers';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: {
    default: 'Dasa Dinusulu — A Product by VDF',
    template: '%s | Dasa Dinusulu',
  },
  description:
    'Rooted in the rich culinary traditions of Andhra Pradesh, Dasa Dinusulu brings you ten treasured snacks crafted with love, purity, and the finest natural ingredients.',
  keywords: ['healthy snacks', 'Andhra snacks', 'dry fruit laddu', 'roasted snacks', 'DasaDinusulu', 'millet snacks', 'natural ingredients', 'traditional recipes'],
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://dasadinusulu.com'),
  openGraph: {
    title: 'Dasa Dinusulu — A Product by VDF',
    description: 'Ten traditional treasures from Andhra Pradesh. Crafted with love, purity, and the finest natural ingredients.',
    siteName: 'Dasa Dinusulu',
    locale: 'en_IN',
    type: 'website',
  },
  robots: { index: true, follow: true },
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Navbar />
          <main style={{ minHeight: 'calc(100dvh - 64px)' }}>{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}

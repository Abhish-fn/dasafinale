import type { Metadata } from 'next';
import './globals.css';
import Providers from './providers';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: {
    default: 'www.DasaDinusulu.com — A Product by VDF',
    template: '%s | www.DasaDinusulu.com',
  },
  description:
    'Rooted in the rich culinary traditions of Andhra Pradesh, www.DasaDinusulu.com brings you ten treasured snacks crafted with love, purity, and the finest natural ingredients.',
  keywords: ['healthy snacks', 'Andhra snacks', 'dry fruit laddu', 'roasted snacks', 'www.DasaDinusulu.com', 'millet snacks', 'natural ingredients', 'traditional recipes'],
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://dasadinusulu.com'),
  openGraph: {
    title: 'www.DasaDinusulu.com — A Product by VDF',
    description: 'Ten traditional treasures from Andhra Pradesh. Crafted with love, purity, and the finest natural ingredients.',
    siteName: 'www.DasaDinusulu.com',
    locale: 'en_IN',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'DasaDinusulu — Traditional Andhra Snacks' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'www.DasaDinusulu.com — A Product by VDF',
    description: 'Ten traditional treasures from Andhra Pradesh.',
    images: ['/og-image.png'],
  },
  robots: { index: true, follow: true },
  icons: {
    icon: [
      { url: '/favicon.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
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

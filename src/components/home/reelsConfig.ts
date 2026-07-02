/**
 * Instagram Reels Configuration
 *
 * To add/change reels:
 * 1. Download the reel video from Instagram (use IG's "Save" or any downloader)
 * 2. Upload to Cloudinary:  npx tsx scripts/upload-reel.ts ./my-reel.mp4
 * 3. Copy the public_id printed and paste it below as `cloudinaryId`
 * 4. Set your own title, tag, and the original Instagram reel URL
 */

export interface ReelConfig {
  /** Cloudinary public_id (e.g. "reels/black-crapesilk") */
  cloudinaryId: string;
  /** Custom title you write yourself */
  title: string;
  /** Category/tag label shown above the title (e.g. "LIVE COMMERCE") */
  tag: string;
  /** Link to the original Instagram reel */
  instagramUrl: string;
  /** Optional: link to a product/category page on your site */
  shopUrl?: string;
}

/**
 * Your Cloudinary cloud name — reads from env at build time.
 * Falls back to the value in .env (NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME)
 */
export const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? 'dzbjefwms';

export const reels: ReelConfig[] = [
  {
    cloudinaryId: 'reels/dasad',         // ← replace after upload
    title: 'Clay Pot Roasted Dasadinsulu 🌾🔥',       // ← your custom title
    tag: 'LIVE COMMERCE',
    instagramUrl: 'https://www.instagram.com/reel/DUYGpu0Dy8k',
    shopUrl: '/products/CPS001',
  },
  {
    cloudinaryId: 'reels/vegchip',         // ← replace after upload
    title: 'Crispy Vegetable Chips 🥕🥔✨',                          // ← your custom title
    tag: 'LIVE COMMERCE',
    instagramUrl: 'https://www.instagram.com/reel/DYRxogFs2Ff/',
    shopUrl: '/products/HCC002',
  },
  {
    cloudinaryId: 'reels/snack',         // ← replace after upload
    title: 'Multigrain Roasted Mix💪🌱🔥',                          // ← your custom title
    tag: 'LIVE COMMERCE',
    instagramUrl: 'https://www.instagram.com/reel/DZpM2y_sbzM',
    shopUrl: '/products',
  },
];

import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(__dirname, '../public');
const logo = '/home/abhish/.gemini/antigravity/brain/f8f0dadf-112c-4b95-9734-3866432d2970/media__1782970432205.png';

async function generate() {
  const img = sharp(logo);

  // 1. favicon.ico (32x32 PNG, saved as .ico — browsers accept PNG favicons)
  await img.clone().resize(32, 32).png().toFile(resolve(publicDir, 'favicon.png'));

  // 2. icon-192.png (PWA / Android)
  await img.clone().resize(192, 192).png().toFile(resolve(publicDir, 'icon-192.png'));

  // 3. icon-512.png (PWA / splash)
  await img.clone().resize(512, 512).png().toFile(resolve(publicDir, 'icon-512.png'));

  // 4. apple-touch-icon.png (180x180)
  await img.clone().resize(180, 180).png().toFile(resolve(publicDir, 'apple-touch-icon.png'));

  // 5. OG image (1200x630) — logo centered on brand-colored background
  const logoResized = await img.clone().resize(400, 400, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();

  await sharp({
    create: {
      width: 1200,
      height: 630,
      channels: 4,
      background: { r: 107, g: 30, b: 43, alpha: 255 }, // maroon
    },
  })
    .composite([
      {
        input: logoResized,
        left: Math.round((1200 - 400) / 2),
        top: Math.round((630 - 400) / 2),
      },
    ])
    .png()
    .toFile(resolve(publicDir, 'og-image.png'));

  console.log('✅ Generated: favicon.png, icon-192.png, icon-512.png, apple-touch-icon.png, og-image.png');
}

generate().catch(console.error);

/**
 * Upload a downloaded Instagram Reel video to Cloudinary.
 *
 * Usage:
 *   npx tsx scripts/upload-reel.ts <path-to-video.mp4> [optional-public-id]
 *
 * Examples:
 *   npx tsx scripts/upload-reel.ts ./reel1.mp4
 *   npx tsx scripts/upload-reel.ts ./reel1.mp4 reels/black-crapesilk
 *
 * After uploading, copy the public_id printed and paste it into
 * src/components/home/reelsConfig.ts
 */

import 'dotenv/config';
import { v2 as cloudinary } from 'cloudinary';
import path from 'path';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: npx tsx scripts/upload-reel.ts <path-to-video.mp4> [optional-public-id]');
    process.exit(1);
  }

  const customPublicId = process.argv[3];
  const baseName = path.basename(filePath, path.extname(filePath));

  console.log(`\n📤 Uploading "${filePath}" to Cloudinary...\n`);

  try {
    const result = await cloudinary.uploader.upload(filePath, {
      resource_type: 'video',
      folder: 'reels',
      public_id: customPublicId ?? baseName,
      overwrite: true,
      // Optimisation: Cloudinary will auto-generate streaming formats
      eager: [
        { format: 'mp4', video_codec: 'h264', quality: 'auto' },
      ],
      eager_async: true,
    });

    console.log('✅ Upload successful!\n');
    console.log('────────────────────────────────────────');
    console.log(`  Public ID  : ${result.public_id}`);
    console.log(`  URL        : ${result.secure_url}`);
    console.log(`  Duration   : ${result.duration}s`);
    console.log(`  Size       : ${(result.bytes / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Dimensions : ${result.width}×${result.height}`);
    console.log('────────────────────────────────────────');
    console.log('\n📋 Copy this public_id into src/components/home/reelsConfig.ts:');
    console.log(`   cloudinaryId: '${result.public_id}'`);
    console.log();
  } catch (err) {
    console.error('❌ Upload failed:', err);
    process.exit(1);
  }
}

main();

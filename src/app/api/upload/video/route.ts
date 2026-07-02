import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import cloudinary from '@/lib/cloudinary';
import { rateLimit } from '@/lib/rate-limit';

// Increase serverless function timeout for large video uploads
export const maxDuration = 120;

// POST /api/upload/video — Upload video to Cloudinary (Admin only)
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Rate limit: 10 video uploads per minute per admin
    const rl = rateLimit(`upload-video:${session.user.id}`, 10, 60_000);
    if (!rl.success) {
      return NextResponse.json({ error: 'Too many uploads. Try again later.' }, { status: 429 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Allowed: MP4, WebM, MOV' }, { status: 400 });
    }

    // Max 100MB for videos
    if (file.size > 100 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Max 100MB.' }, { status: 400 });
    }

    // Convert to buffer and upload to Cloudinary
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const result = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder: 'reels',
            resource_type: 'video',
            eager_async: true,
          },
          (error, uploadResult) => {
            if (error) reject(error);
            else resolve(uploadResult as { secure_url: string; public_id: string });
          }
        )
        .end(buffer);
    });

    return NextResponse.json({
      url: result.secure_url,
      publicId: result.public_id,
    });
  } catch (error) {
    console.error('POST /api/upload/video error:', error);
    const message = error instanceof Error ? error.message : 'Video upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

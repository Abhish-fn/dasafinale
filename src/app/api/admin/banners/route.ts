import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Banner from '@/models/Banner';
import { auth } from '@/lib/auth';

// GET /api/admin/banners — Get all banners (public: only active, admin: all)
export async function GET() {
  try {
    await dbConnect();
    const banners = await Banner.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json({ banners });
  } catch (error) {
    console.error('GET /api/admin/banners error:', error);
    return NextResponse.json({ error: 'Failed to fetch banners' }, { status: 500 });
  }
}

// POST /api/admin/banners — Create a new banner (Admin only)
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await dbConnect();
    const body = await req.json();
    const { imageUrl, altText } = body;

    if (!imageUrl) {
      return NextResponse.json({ error: 'Image URL is required' }, { status: 400 });
    }

    // Deactivate all existing banners and set new one as active
    await Banner.updateMany({}, { isActive: false });

    const banner = await Banner.create({
      imageUrl,
      altText: altText || 'DasaDinusulu Banner',
      isActive: true,
    });

    return NextResponse.json({ banner }, { status: 201 });
  } catch (error) {
    console.error('POST /api/admin/banners error:', error);
    return NextResponse.json({ error: 'Failed to create banner' }, { status: 500 });
  }
}

// DELETE /api/admin/banners — Delete a banner by ID (Admin only)
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await dbConnect();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Banner ID required' }, { status: 400 });
    }

    await Banner.findByIdAndDelete(id);
    return NextResponse.json({ message: 'Banner deleted' });
  } catch (error) {
    console.error('DELETE /api/admin/banners error:', error);
    return NextResponse.json({ error: 'Failed to delete banner' }, { status: 500 });
  }
}

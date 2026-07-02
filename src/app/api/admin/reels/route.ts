import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Reel from '@/models/Reel';
import { auth } from '@/lib/auth';

// GET /api/admin/reels — Get all reels
export async function GET() {
  try {
    await dbConnect();
    const reels = await Reel.find().sort({ sortOrder: 1, createdAt: -1 }).lean();
    return NextResponse.json({ reels });
  } catch (error) {
    console.error('GET /api/admin/reels error:', error);
    return NextResponse.json({ error: 'Failed to fetch reels' }, { status: 500 });
  }
}

// POST /api/admin/reels — Create a new reel (Admin only)
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await dbConnect();
    const body = await req.json();
    const { cloudinaryId, title, tag, instagramUrl, shopUrl } = body;

    if (!cloudinaryId || !title || !instagramUrl) {
      return NextResponse.json({ error: 'cloudinaryId, title, and instagramUrl are required' }, { status: 400 });
    }

    // Set sortOrder to be last
    const count = await Reel.countDocuments();

    const reel = await Reel.create({
      cloudinaryId,
      title,
      tag: tag || 'LIVE COMMERCE',
      instagramUrl,
      shopUrl: shopUrl || undefined,
      sortOrder: count,
      isActive: true,
    });

    return NextResponse.json({ reel }, { status: 201 });
  } catch (error) {
    console.error('POST /api/admin/reels error:', error);
    return NextResponse.json({ error: 'Failed to create reel' }, { status: 500 });
  }
}

// DELETE /api/admin/reels — Delete a reel by ID (Admin only)
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
      return NextResponse.json({ error: 'Reel ID required' }, { status: 400 });
    }

    await Reel.findByIdAndDelete(id);
    return NextResponse.json({ message: 'Reel deleted' });
  } catch (error) {
    console.error('DELETE /api/admin/reels error:', error);
    return NextResponse.json({ error: 'Failed to delete reel' }, { status: 500 });
  }
}

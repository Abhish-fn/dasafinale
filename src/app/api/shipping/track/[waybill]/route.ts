import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Order from '@/models/Order';
import { auth } from '@/lib/auth';
import { trackShipment, type TrackingResult } from '@/lib/delhivery';

// ---------------------------------------------------------------------------
// In-memory tracking cache (60s TTL per waybill)
// ---------------------------------------------------------------------------

const trackingCache = new Map<
  string,
  { data: TrackingResult; expiresAt: number }
>();
const TRACKING_CACHE_TTL = 60_000; // 60 seconds

// ---------------------------------------------------------------------------
// GET /api/shipping/track/[waybill]
// ---------------------------------------------------------------------------

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ waybill: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { waybill } = await ctx.params;

    if (!waybill || waybill === 'PENDING') {
      return NextResponse.json({ error: 'Invalid waybill' }, { status: 400 });
    }

    await dbConnect();

    // Verify the user owns an order with this waybill (or is admin)
    const query =
      session.user.role === 'admin'
        ? { 'tracking.waybill': waybill }
        : { 'tracking.waybill': waybill, userId: session.user.id };

    const order = await Order.findOne(query).select('_id').lean();
    if (!order) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Check cache
    const cached = trackingCache.get(waybill);
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json(cached.data);
    }

    // Fetch from Delhivery
    const tracking = await trackShipment(waybill);

    // Cache result
    trackingCache.set(waybill, {
      data: tracking,
      expiresAt: Date.now() + TRACKING_CACHE_TTL,
    });

    return NextResponse.json(tracking);
  } catch (error) {
    console.error('GET /api/shipping/track/[waybill] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tracking data' },
      { status: 500 }
    );
  }
}

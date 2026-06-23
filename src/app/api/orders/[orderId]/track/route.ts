import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Order from '@/models/Order';
import { auth } from '@/lib/auth';
import { trackShipment } from '@/lib/delhivery';
import { rateLimit } from '@/lib/rate-limit';

// ---------------------------------------------------------------------------
// GET /api/orders/[orderId]/track
//
// Tracking-only endpoint with graceful degradation.
// Returns live Delhivery tracking when available, falls back to DB
// statusHistory when the carrier API is unreachable.
// Never returns 500 for Delhivery failures — always degrades gracefully.
// ---------------------------------------------------------------------------

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ orderId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit: 20 requests per minute per user
    const rl = rateLimit(`track:${session.user.id}`, 20, 60_000);
    if (!rl.success) {
      console.error('[TRACK] Rate limited', { userId: session.user.id });
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    await dbConnect();
    const { orderId } = await ctx.params;

    // Ownership check: users see only their own orders, admins see all
    const query =
      session.user.role === 'admin'
        ? { orderId }
        : { orderId, userId: session.user.id };

    // Select only tracking and status — this is polled frequently,
    // no need to fetch items/addresses/pricing on every cycle
    const order = await Order.findOne(query)
      .select('status tracking')
      .lean();

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const fallbackHistory = order.tracking?.statusHistory || [];

    // No waybill or PENDING — return DB fallback immediately, no Delhivery call
    if (!order.tracking?.waybill || order.tracking.waybill === 'PENDING') {
      return NextResponse.json({
        tracking: null,
        fallback: fallbackHistory,
        status: order.status,
      });
    }

    // Attempt live tracking from Delhivery
    try {
      const tracking = await trackShipment(order.tracking.waybill);
      return NextResponse.json({
        tracking,
        fallback: [],
        status: order.status,
      });
    } catch (error) {
      // Delhivery failed — log with structured context, return DB fallback
      console.error('[TRACK] Delhivery fetch failed', {
        orderId,
        waybill: order.tracking.waybill,
        error: error instanceof Error ? error.message : String(error),
      });

      return NextResponse.json({
        tracking: null,
        fallback: fallbackHistory,
        status: order.status,
        degraded: true,
      });
    }
  } catch (error) {
    console.error('[TRACK] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tracking data' },
      { status: 500 }
    );
  }
}


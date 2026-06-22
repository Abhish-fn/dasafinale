import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Order from '@/models/Order';
import { createAndAssignShipment } from '@/lib/delhivery';

// ---------------------------------------------------------------------------
// POST /api/cron/retry-shipments — Retry failed shipment creation
//
// Runs every 15 minutes via external cron trigger.
// Finds paid/confirmed orders without waybill, older than 5 min, max 3 retries.
// Auth: Bearer CRON_SECRET
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);

    // Find orders that should have a shipment but don't
    const stuckOrders = await Order.find({
      'payment.status': 'paid',
      status: { $in: ['confirmed', 'placed'] },
      'tracking.waybill': { $exists: false },
      createdAt: { $lt: fiveMinAgo },
      $or: [
        { 'delhivery.retryCount': { $exists: false } },
        { 'delhivery.retryCount': { $lt: 3 } },
      ],
    })
      .select('_id orderId')
      .limit(20)
      .lean();

    if (stuckOrders.length === 0) {
      return NextResponse.json({ retried: 0, message: 'No stuck orders found' });
    }

    console.log(
      `[CRON] Retrying shipment creation for ${stuckOrders.length} orders`
    );

    let retriedCount = 0;

    for (const order of stuckOrders) {
      try {
        // Increment retry count
        await Order.updateOne(
          { _id: order._id },
          { $inc: { 'delhivery.retryCount': 1 } }
        );

        // Attempt shipment creation (idempotent)
        await createAndAssignShipment(order._id.toString());
        retriedCount++;
      } catch (error) {
        console.error(
          `[CRON] Failed to retry shipment for order ${order.orderId}:`,
          error
        );
      }
    }

    return NextResponse.json({
      retried: retriedCount,
      total: stuckOrders.length,
      message: `Retried ${retriedCount}/${stuckOrders.length} orders`,
    });
  } catch (error) {
    console.error('[CRON] Retry shipments error:', error);
    return NextResponse.json(
      { error: 'Cron job failed' },
      { status: 500 }
    );
  }
}

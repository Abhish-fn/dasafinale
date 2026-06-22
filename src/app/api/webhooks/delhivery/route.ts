import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import dbConnect from '@/lib/db';
import Order from '@/models/Order';
import { sendShippingUpdate } from '@/lib/email';

// ---------------------------------------------------------------------------
// Delhivery status → our order status mapping
// ---------------------------------------------------------------------------

const STATUS_MAP: Record<string, string> = {
  Manifested: 'confirmed',
  'Picked Up': 'packed',
  'In Transit': 'shipped',
  'Out For Delivery': 'out_for_delivery',
  Delivered: 'delivered',
  RTO: 'cancelled',
  Cancelled: 'cancelled',
};

// Statuses that trigger email notification
const EMAIL_STATUSES = ['shipped', 'out_for_delivery', 'delivered'];

// ---------------------------------------------------------------------------
// POST /api/webhooks/delhivery — Delhivery push webhook (HMAC verified)
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-delhivery-signature');
    const webhookSecret = process.env.DELHIVERY_WEBHOOK_SECRET;

    if (!signature || !webhookSecret) {
      console.error('[DELHIVERY WEBHOOK] Missing signature or webhook secret');
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    // Verify HMAC-SHA256 signature
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (expectedSignature !== signature) {
      console.error('[DELHIVERY WEBHOOK] Invalid signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    const payload = JSON.parse(rawBody);
    await dbConnect();

    // Delhivery sends individual updates or batch — handle both
    const updates = Array.isArray(payload) ? payload : [payload];

    for (const update of updates) {
      const waybill = update.waybill || update.Waybill || update.awb;
      const delhiveryStatus =
        update.status || update.Status?.Status || update.current_status;
      const location =
        update.location || update.Status?.StatusLocation || '';
      const note = update.instructions || update.remark || '';

      if (!waybill || !delhiveryStatus) continue;

      // Map Delhivery status to our status
      const ourStatus = STATUS_MAP[delhiveryStatus];
      if (!ourStatus) {
        console.log(
          `[DELHIVERY WEBHOOK] Unmapped status: ${delhiveryStatus} for waybill ${waybill}`
        );
        // Still record the raw status update even if unmapped
        await Order.updateOne(
          { 'tracking.waybill': waybill },
          {
            $set: {
              'tracking.delhiveryStatus': delhiveryStatus,
              'delhivery.rawStatus': delhiveryStatus,
              'delhivery.lastSyncAt': new Date(),
            },
            $push: {
              'tracking.statusHistory': {
                status: delhiveryStatus,
                timestamp: new Date(),
                note: note || `Delhivery: ${delhiveryStatus}`,
                location,
              },
            },
          }
        );
        continue;
      }

      // Update order status + tracking
      const order = await Order.findOneAndUpdate(
        { 'tracking.waybill': waybill },
        {
          $set: {
            status: ourStatus,
            'tracking.delhiveryStatus': delhiveryStatus,
            'delhivery.rawStatus': delhiveryStatus,
            'delhivery.lastSyncAt': new Date(),
          },
          $push: {
            'tracking.statusHistory': {
              status: ourStatus,
              timestamp: new Date(),
              note: note || `Delhivery: ${delhiveryStatus}`,
              location,
            },
          },
        },
        { new: true }
      );

      if (!order) {
        console.warn(
          `[DELHIVERY WEBHOOK] Order not found for waybill: ${waybill}`
        );
        continue;
      }

      // Send email for significant status changes (non-blocking)
      if (EMAIL_STATUSES.includes(ourStatus)) {
        const User = (await import('@/models/User')).default;
        const user = await User.findById(order.userId).select('email');
        if (user?.email) {
          sendShippingUpdate(order.orderId, user.email, ourStatus).catch(
            console.error
          );
        }
      }
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('[DELHIVERY WEBHOOK] Error:', error);
    // Return 200 to avoid Delhivery retrying on our processing errors
    return NextResponse.json({ status: 'ok' });
  }
}

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
const EMAIL_STATUSES = new Set(['shipped', 'out_for_delivery', 'delivered']);

// ---------------------------------------------------------------------------
// POST /api/webhooks/delhivery — Delhivery push webhook
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-delhivery-signature');
    const webhookSecret = process.env.DELHIVERY_WEBHOOK_SECRET;

    if (!signature || !webhookSecret) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    // Constant-time signature verification
    const sigBuffer = Buffer.from(signature);
    const secretBuffer = Buffer.from(webhookSecret);
    if (sigBuffer.length !== secretBuffer.length || !crypto.timingSafeEqual(sigBuffer, secretBuffer)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const payload = JSON.parse(rawBody);
    await dbConnect();

    const updates = Array.isArray(payload) ? payload : [payload];

    for (const update of updates) {
      const waybill = update.waybill || update.Waybill || update.awb;
      const delhiveryStatus =
        update.status || update.Status?.Status || update.current_status;
      const location =
        update.location || update.Status?.StatusLocation || '';
      const note = update.instructions || update.remark || '';

      if (!waybill || !delhiveryStatus) continue;

      const ourStatus = STATUS_MAP[delhiveryStatus];

      if (!ourStatus) {
        // Unmapped status — record only if rawStatus actually changed
        await Order.updateOne(
          {
            'tracking.waybill': waybill,
            'delhivery.rawStatus': { $ne: delhiveryStatus },
          } as Record<string, unknown>,
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

      // Idempotent: only update if order status is actually different
      const order = await Order.findOneAndUpdate(
        {
          'tracking.waybill': waybill,
          status: { $ne: ourStatus },
        } as Record<string, unknown>,
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
        { returnDocument: 'after' }
      );

      // No match = status unchanged or order not found — skip
      if (!order) continue;

      // Fire-and-forget email (only runs once per actual status change)
      if (EMAIL_STATUSES.has(ourStatus)) {
        const User = (await import('@/models/User')).default;
        const user = await User.findById(order.userId).select('email').lean();
        if (user?.email) {
          sendShippingUpdate(order.orderId, user.email as string, ourStatus).catch(console.error);
        }
      }
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('[DELHIVERY WEBHOOK] Error:', error);
    return NextResponse.json({ status: 'ok' });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Order from '@/models/Order';
import Product from '@/models/Product';
import Coupon from '@/models/Coupon';
import CouponUsage from '@/models/CouponUsage';

// POST /api/cron/expire-orders — Expire unpaid orders and release stock
// Protected by CRON_SECRET header
export async function POST(req: NextRequest) {
  try {
    const cronSecret = req.headers.get('x-cron-secret');
    if (cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    // Find expired unpaid orders
    const expiredOrders = await Order.find({
      expiresAt: { $lte: new Date() },
      paymentProcessed: false,
      'payment.status': 'pending',
    });

    let released = 0;

    for (const order of expiredOrders) {
      // Release stock
      for (const item of order.items) {
        await Product.updateOne(
          { _id: item.productId },
          { $inc: { stock: item.quantity } }
        );
      }

      // Release coupon
      if (order.coupon?.code) {
        await Coupon.updateOne(
          { code: order.coupon.code },
          { $inc: { reservedCount: -1 } }
        );
        await CouponUsage.updateOne(
          { orderId: order._id, status: 'reserved' },
          { $set: { status: 'released' } }
        );
      }

      // Mark order as expired/cancelled
      order.payment.status = 'failed';
      order.payment.failureReason = 'Payment timeout — order expired';
      order.status = 'cancelled';
      await order.save();

      released++;
    }

    return NextResponse.json({
      message: `Expired ${released} orders`,
      released,
    });
  } catch (error) {
    console.error('Cron expire-orders error:', error);
    return NextResponse.json({ error: 'Failed to expire orders' }, { status: 500 });
  }
}

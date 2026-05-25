import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import dbConnect from '@/lib/db';
import Order from '@/models/Order';
import Product from '@/models/Product';
import Coupon from '@/models/Coupon';
import CouponUsage from '@/models/CouponUsage';
import { auth } from '@/lib/auth';
import { verifyPaymentSchema } from '@/lib/validations';
import { sanitize } from '@/lib/sanitize';
import { sendOrderConfirmation } from '@/lib/email';

// POST /api/checkout/verify-payment — Verify Razorpay payment (idempotent)
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const body = sanitize(await req.json());
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = verifyPaymentSchema.parse(body);

    // 1. Find the order
    const order = await Order.findOne({
      'payment.razorpayOrderId': razorpayOrderId,
      userId: session.user.id,
    });
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // 2. Idempotency check — if already processed, return success
    if (order.paymentProcessed) {
      return NextResponse.json({
        success: true,
        orderId: order.orderId,
        message: 'Payment already verified',
      });
    }

    // 3. Verify Razorpay signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      // Mark as failed
      order.payment.status = 'failed';
      order.payment.failureReason = 'Invalid signature';
      await order.save();

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

      return NextResponse.json({ error: 'Payment verification failed' }, { status: 400 });
    }

    // 4. Update order — mark as paid (idempotent via paymentProcessed flag)
    order.payment.razorpayPaymentId = razorpayPaymentId;
    order.payment.razorpaySignature = razorpaySignature;
    order.payment.status = 'paid';
    order.payment.paidAt = new Date();
    order.paymentProcessed = true;
    order.status = 'confirmed';

    // Add to status history
    if (!order.tracking) {
      order.tracking = { statusHistory: [] };
    }
    order.tracking.statusHistory.push({
      status: 'confirmed',
      timestamp: new Date(),
      note: 'Payment verified',
    });

    await order.save();
    // Remove expiry — order is confirmed
    await Order.updateOne({ _id: order._id }, { $unset: { expiresAt: 1 } });

    // 5. Finalize coupon usage
    if (order.coupon?.code) {
      await Coupon.updateOne(
        { code: order.coupon.code },
        { $inc: { usedCount: 1, reservedCount: -1 } }
      );
      await CouponUsage.updateOne(
        { couponId: order.coupon.code, userId: session.user.id, status: 'reserved' },
        { $set: { status: 'used', orderId: order._id, usedAt: new Date() } }
      );
    }

    // 6. Increment sales count
    for (const item of order.items) {
      await Product.updateOne(
        { _id: item.productId },
        { $inc: { salesCount: item.quantity } }
      );
    }

    // 7. Send confirmation email (non-blocking)
    sendOrderConfirmation(order.orderId, session.user.email!).catch(console.error);

    return NextResponse.json({
      success: true,
      orderId: order.orderId,
      message: 'Payment verified successfully',
    });
  } catch (error) {
    console.error('POST /api/checkout/verify-payment error:', error);
    return NextResponse.json({ error: 'Failed to verify payment' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import dbConnect from '@/lib/db';
import Order from '@/models/Order';
import Product from '@/models/Product';
import Coupon from '@/models/Coupon';
import CouponUsage from '@/models/CouponUsage';
import { sendOrderConfirmation } from '@/lib/email';
import { createAndAssignShipment } from '@/lib/delhivery';

// POST /api/webhooks/razorpay — Razorpay webhook handler
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature');
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!signature || !webhookSecret) {
      console.warn('[Razorpay Webhook] Missing signature or webhook secret');
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (expectedSignature !== signature) {
      console.warn('[Razorpay Webhook] Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const event = JSON.parse(rawBody);
    console.log(`[Razorpay Webhook] Received event: ${event.event}`, {
      paymentId: event.payload?.payment?.entity?.id,
      orderId: event.payload?.payment?.entity?.order_id,
    });
    await dbConnect();

    switch (event.event) {
      case 'payment.captured': {
        const payment = event.payload.payment.entity;
        const razorpayOrderId = payment.order_id;

        const order = await Order.findOne({ 'payment.razorpayOrderId': razorpayOrderId });
        if (!order || order.paymentProcessed) break; // Idempotent

        order.payment.razorpayPaymentId = payment.id;
        order.payment.status = 'paid';
        order.payment.method = payment.method;
        order.payment.paidAt = new Date();
        order.paymentProcessed = true;
        order.status = 'confirmed';

        if (!order.tracking) order.tracking = { statusHistory: [] };
        order.tracking.statusHistory.push({
          status: 'confirmed',
          timestamp: new Date(),
          note: 'Payment captured via webhook',
        });

        await order.save();
        await Order.updateOne({ _id: order._id }, { $unset: { expiresAt: 1 } });

        // Finalize coupon
        if (order.coupon?.code) {
          await Coupon.updateOne(
            { code: order.coupon.code },
            { $inc: { usedCount: 1, reservedCount: -1 } }
          );
          await CouponUsage.updateOne(
            { orderId: order._id, status: 'reserved' },
            { $set: { status: 'used', usedAt: new Date() } }
          );
        }

        // Increment sales (guarded by paymentProcessed check above)
        for (const item of order.items) {
          await Product.updateOne(
            { _id: item.productId },
            { $inc: { 'variants.$[v].salesCount': item.quantity } },
            { arrayFilters: [{ 'v._id': item.variantId }] }
          );
        }

        // Email (non-blocking)
        const User = (await import('@/models/User')).default;
        const user = await User.findById(order.userId).select('email');
        if (user?.email) {
          sendOrderConfirmation(order.orderId, user.email).catch(console.error);
        }

        // Create Delhivery shipment (non-blocking, idempotent)
        createAndAssignShipment(order._id.toString()).catch(console.error);
        break;
      }

      case 'payment.failed': {
        const payment = event.payload.payment.entity;
        const razorpayOrderId = payment.order_id;

        const order = await Order.findOne({ 'payment.razorpayOrderId': razorpayOrderId });
        if (!order || order.paymentProcessed) break;

        order.payment.status = 'failed';
        order.payment.failureReason = payment.error_description || 'Payment failed';
        await order.save();

        // Release stock (idempotent via stockReleased flag — safe against webhook retries)
        if (!order.stockReleased) {
          for (const item of order.items) {
            await Product.updateOne(
              { _id: item.productId },
              { $inc: { 'variants.$[v].stock': item.quantity } },
              { arrayFilters: [{ 'v._id': item.variantId }] }
            );
          }
          order.stockReleased = true;
          await order.save();
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
        break;
      }
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ status: 'ok' }); // Always 200 to avoid retries
  }
}

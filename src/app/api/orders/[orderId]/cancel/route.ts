import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Order from '@/models/Order';
import Product from '@/models/Product';
import Coupon from '@/models/Coupon';
import CouponUsage from '@/models/CouponUsage';
import { auth } from '@/lib/auth';
import { sendOrderCancelled } from '@/lib/email';
import { getRazorpay } from '@/lib/razorpay';

// POST /api/orders/[orderId]/cancel — Cancel an order (user or admin)
export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ orderId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const { orderId } = await ctx.params;

    const query = session.user.role === 'admin'
      ? { orderId }
      : { orderId, userId: session.user.id };

    const order = await Order.findOne(query);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Only allow cancel for certain statuses
    const cancellable = ['placed', 'confirmed'];
    if (!cancellable.includes(order.status)) {
      return NextResponse.json(
        { error: `Cannot cancel order with status "${order.status}". Only placed/confirmed orders can be cancelled.` },
        { status: 400 }
      );
    }

    // Initiate Razorpay refund if payment was captured
    let refundId: string | undefined;
    if (order.payment.status === 'paid' && order.payment.razorpayPaymentId) {
      try {
        const refund = await getRazorpay().payments.refund(order.payment.razorpayPaymentId, {
          amount: order.pricing.total, // Full refund (amount in paisa)
          speed: 'normal',
          notes: {
            orderId: order.orderId,
            reason: `Cancelled by ${session.user.role === 'admin' ? 'admin' : 'customer'}`,
          },
        });
        refundId = refund.id;
        order.payment.status = 'refunded';
        console.log(`[Refund] Initiated refund ${refund.id} for order ${order.orderId}`);
      } catch (refundError) {
        console.error(`[Refund] Failed for order ${order.orderId}:`, refundError);
        return NextResponse.json(
          { error: 'Failed to initiate refund. Please try again or contact support.' },
          { status: 500 }
        );
      }
    }

    // Update status
    order.status = 'cancelled';
    if (!order.tracking) order.tracking = { statusHistory: [] };
    order.tracking.statusHistory.push({
      status: 'cancelled',
      timestamp: new Date(),
      note: `Cancelled by ${session.user.role === 'admin' ? 'admin' : 'customer'}${refundId ? `. Refund ID: ${refundId}` : ''}`,
    });

    // Release stock + reverse salesCount (idempotent via stockReleased flag)
    if (!order.stockReleased) {
      for (const item of order.items) {
        await Product.updateOne(
          { _id: item.productId },
          { $inc: { 'variants.$[v].stock': item.quantity, 'variants.$[v].salesCount': -item.quantity } },
          { arrayFilters: [{ 'v._id': item.variantId }] }
        );
      }
      order.stockReleased = true;
    }

    await order.save();

    // Release coupon
    if (order.coupon?.code) {
      await Coupon.updateOne(
        { code: order.coupon.code },
        { $inc: { usedCount: -1 } }
      );
      await CouponUsage.updateOne(
        { orderId: order._id },
        { $set: { status: 'released' } }
      );
    }

    // Send email (non-blocking)
    const User = (await import('@/models/User')).default;
    const user = await User.findById(order.userId).select('email');
    if (user?.email) {
      sendOrderCancelled(order.orderId, user.email).catch(console.error);
    }

    return NextResponse.json({
      success: true,
      message: 'Order cancelled',
      refundInitiated: !!refundId,
      refundId,
    });
  } catch (error) {
    console.error('POST /api/orders/[orderId]/cancel error:', error);
    return NextResponse.json({ error: 'Failed to cancel order' }, { status: 500 });
  }
}

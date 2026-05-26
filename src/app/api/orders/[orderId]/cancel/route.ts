import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Order from '@/models/Order';
import Product from '@/models/Product';
import Coupon from '@/models/Coupon';
import CouponUsage from '@/models/CouponUsage';
import { auth } from '@/lib/auth';
import { sendOrderCancelled } from '@/lib/email';

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

    // Update status
    order.status = 'cancelled';
    if (!order.tracking) order.tracking = { statusHistory: [] };
    order.tracking.statusHistory.push({
      status: 'cancelled',
      timestamp: new Date(),
      note: `Cancelled by ${session.user.role === 'admin' ? 'admin' : 'customer'}`,
    });
    await order.save();

    // Release stock
    for (const item of order.items) {
      await Product.updateOne(
        { _id: item.productId },
        { $inc: { stock: item.quantity, salesCount: -item.quantity } }
      );
    }

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

    return NextResponse.json({ success: true, message: 'Order cancelled' });
  } catch (error) {
    console.error('POST /api/orders/[orderId]/cancel error:', error);
    return NextResponse.json({ error: 'Failed to cancel order' }, { status: 500 });
  }
}

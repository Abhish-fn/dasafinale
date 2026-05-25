import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Order from '@/models/Order';
import { auth } from '@/lib/auth';
import { orderUpdateSchema } from '@/lib/validations';
import { sanitize } from '@/lib/sanitize';
import { sendShippingUpdate } from '@/lib/email';

// GET /api/orders/[orderId] — Order detail
export async function GET(
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

    // Admin can see any order, users can only see their own
    const query = session.user.role === 'admin'
      ? { orderId }
      : { orderId, userId: session.user.id };

    const order = await Order.findOne(query).lean();
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({ order });
  } catch (error) {
    console.error('GET /api/orders/[orderId] error:', error);
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 });
  }
}

// PUT /api/orders/[orderId] — Update order status/tracking (Admin)
export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ orderId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await dbConnect();
    const { orderId } = await ctx.params;
    const body = sanitize(await req.json());
    const parsed = orderUpdateSchema.parse(body);

    const order = await Order.findOne({ orderId });
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Update status
    if (parsed.status) {
      order.status = parsed.status;
      if (!order.tracking) order.tracking = { statusHistory: [] };
      order.tracking.statusHistory.push({
        status: parsed.status,
        timestamp: new Date(),
        note: parsed.statusNote || '',
      });
    }

    // Update tracking info
    if (parsed.tracking) {
      if (!order.tracking) order.tracking = { statusHistory: [] };
      if (parsed.tracking.carrier) order.tracking.carrier = parsed.tracking.carrier;
      if (parsed.tracking.trackingId) order.tracking.trackingId = parsed.tracking.trackingId;
      if (parsed.tracking.trackingUrl) order.tracking.trackingUrl = parsed.tracking.trackingUrl;
      if (parsed.tracking.estimatedDelivery) order.tracking.estimatedDelivery = new Date(parsed.tracking.estimatedDelivery);
    }

    await order.save();

    // Send email for shipping updates (non-blocking)
    if (parsed.status && ['shipped', 'out_for_delivery', 'delivered'].includes(parsed.status)) {
      const User = (await import('@/models/User')).default;
      const user = await User.findById(order.userId).select('email');
      if (user?.email) {
        sendShippingUpdate(order.orderId, user.email, parsed.status).catch(console.error);
      }
    }

    return NextResponse.json({ order });
  } catch (error) {
    console.error('PUT /api/orders/[orderId] error:', error);
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}

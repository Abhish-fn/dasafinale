import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Order from '@/models/Order';
import { auth } from '@/lib/auth';
import { createAndAssignShipment, cancelShipment } from '@/lib/delhivery';

// ---------------------------------------------------------------------------
// POST /api/admin/orders/[orderId]/shipment — Manual create/retry shipment
// ---------------------------------------------------------------------------

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ orderId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await dbConnect();
    const { orderId } = await ctx.params;

    const order = await Order.findOne({ orderId });
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.payment.status !== 'paid') {
      return NextResponse.json(
        { error: 'Order is not paid' },
        { status: 400 }
      );
    }

    // If there's already a real waybill (not PENDING), don't re-create
    if (order.tracking?.waybill && order.tracking.waybill !== 'PENDING') {
      return NextResponse.json({
        success: true,
        message: 'Shipment already exists',
        waybill: order.tracking.waybill,
      });
    }

    // Reset retry count and clear any PENDING sentinel for manual retry
    await Order.updateOne(
      { _id: order._id },
      {
        $set: { 'delhivery.retryCount': 0 },
        $unset: { 'tracking.waybill': 1 },
      }
    );

    // Attempt shipment creation
    await createAndAssignShipment(order._id.toString());

    // Re-fetch to get the updated waybill
    const updated = await Order.findById(order._id)
      .select('tracking.waybill')
      .lean();

    const waybill = updated?.tracking?.waybill;
    if (waybill && waybill !== 'PENDING') {
      return NextResponse.json({
        success: true,
        message: 'Shipment created successfully',
        waybill,
      });
    }

    return NextResponse.json(
      { error: 'Shipment creation failed — check server logs' },
      { status: 500 }
    );
  } catch (error) {
    console.error('POST /api/admin/orders/[orderId]/shipment error:', error);
    return NextResponse.json(
      { error: 'Failed to create shipment' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/admin/orders/[orderId]/shipment — Cancel shipment
// ---------------------------------------------------------------------------

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ orderId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await dbConnect();
    const { orderId } = await ctx.params;

    const order = await Order.findOne({ orderId });
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const waybill = order.tracking?.waybill;
    if (!waybill || waybill === 'PENDING') {
      return NextResponse.json(
        { error: 'No active shipment to cancel' },
        { status: 400 }
      );
    }

    const cancelled = await cancelShipment(waybill);

    if (cancelled) {
      await Order.updateOne(
        { _id: order._id },
        {
          $unset: { 'tracking.waybill': 1 },
          $set: {
            'tracking.delhiveryStatus': 'Cancelled',
            'delhivery.rawStatus': 'Cancelled',
            'delhivery.lastSyncAt': new Date(),
          },
          $push: {
            'tracking.statusHistory': {
              status: 'shipment_cancelled',
              timestamp: new Date(),
              note: `Shipment ${waybill} cancelled by admin`,
            },
          },
        }
      );

      return NextResponse.json({
        success: true,
        message: `Shipment ${waybill} cancelled`,
      });
    }

    return NextResponse.json(
      { error: 'Failed to cancel shipment with Delhivery' },
      { status: 500 }
    );
  } catch (error) {
    console.error('DELETE /api/admin/orders/[orderId]/shipment error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel shipment' },
      { status: 500 }
    );
  }
}

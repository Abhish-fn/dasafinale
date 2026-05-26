import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Order from '@/models/Order';
import { auth } from '@/lib/auth';

// GET /api/admin/orders — Admin orders list with filters
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await dbConnect();
    const { searchParams } = new URL(req.url);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = { paymentProcessed: true };

    const status = searchParams.get('status');
    if (status) filter.status = status;

    const search = searchParams.get('search');
    if (search) {
      filter.$or = [
        { orderId: { $regex: search, $options: 'i' } },
        { 'shippingAddress.fullName': { $regex: search, $options: 'i' } },
        { 'shippingAddress.phone': { $regex: search, $options: 'i' } },
      ];
    }

    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, parseInt(searchParams.get('limit') || '20'));
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('orderId items pricing status payment.status shippingAddress.fullName shippingAddress.phone createdAt')
        .lean(),
      Order.countDocuments(filter),
    ]);

    return NextResponse.json({
      orders,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('GET /api/admin/orders error:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}

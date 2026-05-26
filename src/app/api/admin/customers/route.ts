import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import Order from '@/models/Order';
import { auth } from '@/lib/auth';

// GET /api/admin/customers — Customer list
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await dbConnect();
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, parseInt(searchParams.get('limit') || '20'));
    const skip = (page - 1) * limit;
    const search = searchParams.get('search');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      User.countDocuments(filter),
    ]);

    // Get order counts per user
    const userIds = users.map((u) => u._id);
    const orderCounts = await Order.aggregate([
      { $match: { userId: { $in: userIds }, paymentProcessed: true } },
      { $group: { _id: '$userId', count: { $sum: 1 }, totalSpent: { $sum: '$pricing.total' } } },
    ]);
    const orderMap = new Map(orderCounts.map((o) => [o._id.toString(), o]));

    const enriched = users.map((u) => {
      const stats = orderMap.get(u._id.toString());
      return { ...u, orderCount: stats?.count || 0, totalSpent: stats?.totalSpent || 0 };
    });

    return NextResponse.json({
      customers: enriched,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('GET /api/admin/customers error:', error);
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 });
  }
}

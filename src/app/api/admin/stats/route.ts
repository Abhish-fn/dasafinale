import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Order from '@/models/Order';
import Product from '@/models/Product';
import User from '@/models/User';
import { auth } from '@/lib/auth';

// GET /api/admin/stats — Dashboard statistics
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await dbConnect();

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [
      totalOrders,
      totalRevenue,
      todayOrders,
      todayRevenue,
      monthRevenue,
      lastMonthRevenue,
      totalCustomers,
      totalProducts,
      lowStockProducts,
      pendingOrders,
      recentOrders,
      topProducts,
      statusBreakdown,
    ] = await Promise.all([
      Order.countDocuments({ paymentProcessed: true }),
      Order.aggregate([
        { $match: { paymentProcessed: true } },
        { $group: { _id: null, total: { $sum: '$pricing.total' } } },
      ]),
      Order.countDocuments({ paymentProcessed: true, createdAt: { $gte: today } }),
      Order.aggregate([
        { $match: { paymentProcessed: true, createdAt: { $gte: today } } },
        { $group: { _id: null, total: { $sum: '$pricing.total' } } },
      ]),
      Order.aggregate([
        { $match: { paymentProcessed: true, createdAt: { $gte: thisMonth } } },
        { $group: { _id: null, total: { $sum: '$pricing.total' } } },
      ]),
      Order.aggregate([
        { $match: { paymentProcessed: true, createdAt: { $gte: lastMonth, $lt: thisMonth } } },
        { $group: { _id: null, total: { $sum: '$pricing.total' } } },
      ]),
      User.countDocuments(),
      Product.countDocuments({ isActive: true }),
      // Low stock: any product where at least one variant has stock <= 10
      Product.countDocuments({ isActive: true, 'variants.stock': { $lte: 10 } }),
      Order.countDocuments({ paymentProcessed: true, status: { $in: ['placed', 'confirmed'] } }),
      Order.find({ paymentProcessed: true })
        .sort({ createdAt: -1 })
        .limit(10)
        .select('orderId items pricing status createdAt shippingAddress.fullName')
        .lean(),
      // Top products: aggregate totalSalesCount from embedded variants
      Product.aggregate([
        { $match: { isActive: true } },
        {
          $addFields: {
            totalSalesCount: { $sum: '$variants.salesCount' },
            minPrice: { $min: '$variants.price' },
            primaryPackagingSize: { $arrayElemAt: ['$variants.packagingSize', 0] },
          },
        },
        { $sort: { totalSalesCount: -1 } },
        { $limit: 5 },
        {
          $project: {
            title: 1,
            productId: 1,
            totalSalesCount: 1,
            minPrice: 1,
            primaryPackagingSize: 1,
            images: 1,
          },
        },
      ]),
      Order.aggregate([
        { $match: { paymentProcessed: true } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    return NextResponse.json({
      overview: {
        totalOrders,
        totalRevenue: totalRevenue[0]?.total || 0,
        todayOrders,
        todayRevenue: todayRevenue[0]?.total || 0,
        monthRevenue: monthRevenue[0]?.total || 0,
        lastMonthRevenue: lastMonthRevenue[0]?.total || 0,
        totalCustomers,
        totalProducts,
        lowStockProducts,
        pendingOrders,
      },
      recentOrders,
      topProducts,
      statusBreakdown: statusBreakdown.reduce(
        (acc: Record<string, number>, item: { _id: string; count: number }) => {
          acc[item._id] = item.count;
          return acc;
        },
        {}
      ),
    });
  } catch (error) {
    console.error('GET /api/admin/stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}

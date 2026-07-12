import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Product from '@/models/Product';

// GET /api/products/featured — Featured products for home page
export async function GET() {
  try {
    await dbConnect();

    // salesCount is per-variant; use aggregation to sum and sort
    const featuredPipeline = (
      filter: Record<string, unknown>,
      sortField: Record<string, 1 | -1>,
      limit: number
    ) => [
      { $match: { isActive: true, ...filter } },
      { $addFields: { totalSalesCount: { $sum: '$variants.salesCount' } } },
      { $sort: sortField },
      { $limit: limit },
    ];

    const [mustTry, bestSellers, newArrivals] = await Promise.all([
      Product.aggregate(featuredPipeline({ isMustTry: true }, { totalSalesCount: -1 }, 4)),
      Product.aggregate(featuredPipeline({ isBestSeller: true }, { totalSalesCount: -1 }, 4)),
      Product.aggregate([
        { $match: { isActive: true } },
        { $sort: { createdAt: -1 } },
        { $limit: 4 },
      ]),
    ]);

    return NextResponse.json({ mustTry, bestSellers, newArrivals });
  } catch (error) {
    console.error('GET /api/products/featured error:', error);
    return NextResponse.json({ mustTry: [], bestSellers: [], newArrivals: [] });
  }
}

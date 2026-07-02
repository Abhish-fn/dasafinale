import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Product from '@/models/Product';

// GET /api/products/featured — Featured products for home page
export async function GET() {
  try {
    await dbConnect();

    const [mustTry, bestSellers, newArrivals] = await Promise.all([
      Product.find({ isActive: true, isMustTry: true })
        .sort({ salesCount: -1 })
        .limit(4)
        .select('title slug images price compareAtPrice category packagingSize isMustTry isBestSeller stock')
        .lean(),
      Product.find({ isActive: true, isBestSeller: true })
        .sort({ salesCount: -1 })
        .limit(4)
        .select('title slug images price compareAtPrice category packagingSize isMustTry isBestSeller stock')
        .lean(),
      Product.find({ isActive: true })
        .sort({ createdAt: -1 })
        .limit(4)
        .select('title slug images price compareAtPrice category packagingSize isMustTry isBestSeller stock')
        .lean(),
    ]);

    return NextResponse.json({ mustTry, bestSellers, newArrivals });
  } catch (error) {
    console.error('GET /api/products/featured error:', error);
    return NextResponse.json({ mustTry: [], bestSellers: [], newArrivals: [] });
  }
}

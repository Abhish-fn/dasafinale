import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Product from '@/models/Product';

// GET /api/products/[productId]/related — Related products
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ productId: string }> }
) {
  try {
    await dbConnect();
    const { productId } = await ctx.params;

    const product = await Product.findOne({
      $or: [{ slug: productId }, { productId }],
      isActive: true,
    }).lean();

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Find related: same category or overlapping tags, exclude self
    // No variantGroup exclusion needed — each document IS a unique product now
    const related = await Product.aggregate([
      {
        $match: {
          isActive: true,
          _id: { $ne: product._id },
          $or: [
            { category: product.category },
            { tags: { $in: product.tags } },
          ],
        },
      },
      { $addFields: { totalSalesCount: { $sum: '$variants.salesCount' } } },
      { $sort: { totalSalesCount: -1 } },
      { $limit: 8 },
    ]);

    return NextResponse.json({ related });
  } catch (error) {
    console.error('GET /api/products/[productId]/related error:', error);
    return NextResponse.json({ error: 'Failed to fetch related products' }, { status: 500 });
  }
}

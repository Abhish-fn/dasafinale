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

    // Find related: same category or overlapping tags, exclude self and variants
    const related = await Product.find({
      isActive: true,
      _id: { $ne: product._id },
      ...(product.variantGroup ? { variantGroup: { $ne: product.variantGroup } } : {}),
      $or: [
        { category: product.category },
        { tags: { $in: product.tags } },
      ],
    })
      .sort({ salesCount: -1 })
      .limit(8)
      .lean();

    return NextResponse.json({ related });
  } catch (error) {
    console.error('GET /api/products/[productId]/related error:', error);
    return NextResponse.json({ error: 'Failed to fetch related products' }, { status: 500 });
  }
}

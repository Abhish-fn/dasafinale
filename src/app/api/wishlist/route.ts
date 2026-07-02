import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Wishlist from '@/models/Wishlist';
import Product from '@/models/Product';
import { auth } from '@/lib/auth';

// GET /api/wishlist
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const wishlist = await Wishlist.findOne({ userId: session.user.id })
      .populate('products.productId', 'title slug images price compareAtPrice packagingSize stock isActive category isMustTry isBestSeller tags')
      .lean();

    if (!wishlist) {
      return NextResponse.json({ products: [] });
    }

    const products = wishlist.products
      .filter((item: Record<string, any>) => item.productId?.isActive)
      .map((item: Record<string, any>) => ({
        _id: item._id,
        product: item.productId,
        addedAt: item.addedAt,
      }));

    return NextResponse.json({ products });
  } catch (error) {
    console.error('GET /api/wishlist error:', error);
    return NextResponse.json({ error: 'Failed to fetch wishlist' }, { status: 500 });
  }
}

// POST /api/wishlist — Add product
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const { productId } = await req.json();

    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    let wishlist = await Wishlist.findOne({ userId: session.user.id });
    if (!wishlist) {
      wishlist = new Wishlist({ userId: session.user.id, products: [] });
    }

    // Check if already in wishlist
    const exists = wishlist.products.some(
      (item: Record<string, any>) => item.productId.toString() === productId
    );
    if (exists) {
      return NextResponse.json({ message: 'Already in wishlist' });
    }

    wishlist.products.push({ productId, addedAt: new Date() });
    await wishlist.save();

    return NextResponse.json({ message: 'Added to wishlist' });
  } catch (error) {
    console.error('POST /api/wishlist error:', error);
    return NextResponse.json({ error: 'Failed to add to wishlist' }, { status: 500 });
  }
}

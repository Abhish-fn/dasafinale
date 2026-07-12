import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import Cart from '@/models/Cart';
import Product from '@/models/Product';
import { auth } from '@/lib/auth';
import { cartItemSchema } from '@/lib/validations';
import { sanitize } from '@/lib/sanitize';

// GET /api/cart — Get cart with populated products (variants are embedded)
export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const session = await auth();

    const sessionId = req.headers.get('x-session-id');
    if (!session?.user && !sessionId) {
      return NextResponse.json({ items: [], total: 0 });
    }

    const query = session?.user
      ? { userId: session.user.id }
      : { sessionId };

    const cart = await Cart.findOne(query)
      .populate('items.productId', 'title slug images variants isActive category productId')
      .lean();

    if (!cart) {
      return NextResponse.json({ items: [], total: 0 });
    }

    // Filter out inactive/deleted products, skip items with missing variantId (stale pre-migration)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items: any[] = [];
    let total = 0;

    for (const item of cart.items as any[]) {
      const product = item.productId;
      if (!product?.isActive) continue;

      // Skip stale cart items missing variantId (pre-migration leftovers)
      if (!item.variantId) {
        console.warn(`[Cart] Skipping cart item with missing variantId for product ${product._id}`);
        continue;
      }

      // Find the specific variant
      const variant = product.variants?.find(
        (v: any) => v._id.toString() === item.variantId.toString()
      );

      if (!variant) {
        console.warn(`[Cart] Variant ${item.variantId} not found in product ${product._id}, skipping`);
        continue;
      }

      // Cap quantity to variant stock
      const quantity = Math.min(item.quantity, variant.stock || 0);

      items.push({
        _id: item._id,
        product,
        variantId: item.variantId,
        quantity,
        addedAt: item.addedAt,
      });

      total += variant.price * quantity;
    }

    return NextResponse.json({ items, total });
  } catch (error) {
    console.error('GET /api/cart error:', error);
    return NextResponse.json({ error: 'Failed to fetch cart' }, { status: 500 });
  }
}

// POST /api/cart — Add item to cart
export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const session = await auth();
    const body = sanitize(await req.json());
    // productId here is the MongoDB _id, NOT the human-readable "CPS001"
    const { productId, variantId, quantity, sessionId } = cartItemSchema.parse(body);

    if (!session?.user && !sessionId) {
      return NextResponse.json({ error: 'Session ID required for guest cart' }, { status: 400 });
    }

    // Validate product exists (productId = MongoDB _id)
    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Find the specific variant within this product
    const variant = product.variants.id(variantId);
    if (!variant) {
      return NextResponse.json({ error: 'Variant not found' }, { status: 404 });
    }
    if (variant.stock < quantity) {
      return NextResponse.json({ error: 'Insufficient stock', available: variant.stock }, { status: 400 });
    }

    const cartQuery = session?.user
      ? { userId: session.user.id }
      : { sessionId };

    let cart = await Cart.findOne(cartQuery);

    if (!cart) {
      cart = new Cart({
        ...(session?.user ? { userId: session.user.id } : { sessionId }),
        items: [],
      });
    }

    // Check if this exact product+variant combo is already in cart
    const existingIndex = cart.items.findIndex(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (item: Record<string, any>) =>
        item.productId.toString() === productId &&
        item.variantId?.toString() === variantId
    );

    if (existingIndex > -1) {
      const newQty = cart.items[existingIndex].quantity + quantity;
      if (newQty > variant.stock) {
        return NextResponse.json({ error: 'Exceeds available stock', available: variant.stock }, { status: 400 });
      }
      cart.items[existingIndex].quantity = newQty;
    } else {
      cart.items.push({
        productId: new mongoose.Types.ObjectId(productId),
        variantId: new mongoose.Types.ObjectId(variantId),
        quantity,
        addedAt: new Date(),
      });
    }


    await cart.save();
    return NextResponse.json({ message: 'Item added to cart', itemCount: cart.items.length });
  } catch (error) {
    console.error('POST /api/cart error:', error);
    return NextResponse.json({ error: 'Failed to add to cart' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import Cart from '@/models/Cart';
import Product from '@/models/Product';
import { auth } from '@/lib/auth';
import { cartItemSchema } from '@/lib/validations';
import { sanitize } from '@/lib/sanitize';

// GET /api/cart — Get cart with populated products
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
      .populate('items.productId', 'title slug images price compareAtPrice packagingSize stock isActive category variantGroup')
      .lean();

    if (!cart) {
      return NextResponse.json({ items: [], total: 0 });
    }

    // Filter out inactive/deleted products and calculate total
    const items = cart.items
      .filter((item: Record<string, any>) => item.productId?.isActive)
      .map((item: Record<string, any>) => ({
        _id: item._id,
        product: item.productId,
        quantity: Math.min(item.quantity, item.productId?.stock || 0),
        addedAt: item.addedAt,
      }));

    const total = items.reduce(
      (sum: number, item: Record<string, any>) => sum + (item.product.price * item.quantity),
      0
    );

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
    const { productId, quantity, sessionId } = cartItemSchema.parse(body);

    if (!session?.user && !sessionId) {
      return NextResponse.json({ error: 'Session ID required for guest cart' }, { status: 400 });
    }

    // Validate product exists and has stock
    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    if (product.stock < quantity) {
      return NextResponse.json({ error: 'Insufficient stock', available: product.stock }, { status: 400 });
    }

    const query = session?.user
      ? { userId: session.user.id }
      : { sessionId };

    let cart = await Cart.findOne(query);

    if (!cart) {
      cart = new Cart({
        ...(session?.user ? { userId: session.user.id } : { sessionId }),
        items: [],
      });
    }

    // Check if product already in cart
    const existingIndex = cart.items.findIndex(
      (item: Record<string, any>) => item.productId.toString() === productId
    );

    if (existingIndex > -1) {
      // Update quantity
      const newQty = cart.items[existingIndex].quantity + quantity;
      if (newQty > product.stock) {
        return NextResponse.json({ error: 'Exceeds available stock', available: product.stock }, { status: 400 });
      }
      cart.items[existingIndex].quantity = newQty;
    } else {
      cart.items.push({ productId: new mongoose.Types.ObjectId(productId), quantity, addedAt: new Date() });
    }

    await cart.save();
    return NextResponse.json({ message: 'Item added to cart', itemCount: cart.items.length });
  } catch (error) {
    console.error('POST /api/cart error:', error);
    return NextResponse.json({ error: 'Failed to add to cart' }, { status: 500 });
  }
}

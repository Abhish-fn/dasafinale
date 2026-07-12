import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import Cart from '@/models/Cart';
import Product from '@/models/Product';
import { auth } from '@/lib/auth';
import { sanitize } from '@/lib/sanitize';

// POST /api/cart/swap-variant — Swap a cart item to a different pack size (variant)
// With embedded variants, this swaps variantId within the same product — productId stays the same.
export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const session = await auth();
    const body = sanitize(await req.json());
    const { itemId, newVariantId } = body as { itemId: string; newVariantId: string };

    if (!itemId || !newVariantId) {
      return NextResponse.json({ error: 'itemId and newVariantId are required' }, { status: 400 });
    }

    const sessionId = req.headers.get('x-session-id');
    if (!session?.user && !sessionId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const cartQuery = session?.user
      ? { userId: session.user.id }
      : { sessionId };

    const cart = await Cart.findOne(cartQuery);
    if (!cart) {
      return NextResponse.json({ error: 'Cart not found' }, { status: 404 });
    }

    // Find the cart item
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cartItem = (cart.items as any[]).find((item) => item._id.toString() === itemId);
    if (!cartItem) {
      return NextResponse.json({ error: 'Cart item not found' }, { status: 404 });
    }

    // Load the product to validate the new variant exists
    const product = await Product.findById(cartItem.productId);
    if (!product || !product.isActive) {
      return NextResponse.json({ error: 'Product not found or inactive' }, { status: 404 });
    }

    const newVariant = product.variants.id(newVariantId);
    if (!newVariant) {
      return NextResponse.json({ error: 'Variant not found in this product' }, { status: 404 });
    }

    // Cap quantity to new variant's stock
    const newQuantity = Math.min(cartItem.quantity, newVariant.stock);
    if (newQuantity === 0) {
      return NextResponse.json({ error: 'New variant is out of stock' }, { status: 400 });
    }

    // Check if the new variant is already in the cart (same product, different item)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existingNewItem = (cart.items as any[]).find(
      (item) =>
        item.productId.toString() === cartItem.productId.toString() &&
        item.variantId?.toString() === newVariantId &&
        item._id.toString() !== itemId
    );

    if (existingNewItem) {
      // Merge: add quantity to existing item, remove the swapped item
      const mergedQty = Math.min(existingNewItem.quantity + newQuantity, newVariant.stock);
      existingNewItem.quantity = mergedQty;
      cart.items = cart.items.filter(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (item: Record<string, any>) => item._id.toString() !== itemId
      );
    } else {
      // Swap the variantId (productId stays the same) and update quantity
      cartItem.variantId = new mongoose.Types.ObjectId(newVariantId);
      cartItem.quantity = newQuantity;
    }

    await cart.save();

    return NextResponse.json({ success: true, message: 'Pack size swapped' });
  } catch (error) {
    console.error('POST /api/cart/swap-variant error:', error);
    return NextResponse.json({ error: 'Failed to swap variant' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import Cart from '@/models/Cart';
import Product from '@/models/Product';
import { auth } from '@/lib/auth';
import { sanitize } from '@/lib/sanitize';

// POST /api/cart/swap-variant — Swap a cart item's product to a different pack size
export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const session = await auth();
    const body = sanitize(await req.json());
    const { itemId, newProductId } = body as { itemId: string; newProductId: string };

    if (!itemId || !newProductId) {
      return NextResponse.json({ error: 'itemId and newProductId are required' }, { status: 400 });
    }

    const sessionId = req.headers.get('x-session-id');
    if (!session?.user && !sessionId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const query = session?.user
      ? { userId: session.user.id }
      : { sessionId };

    const cart = await Cart.findOne(query)
      .populate('items.productId', 'variantGroup')
      .lean();

    if (!cart) {
      return NextResponse.json({ error: 'Cart not found' }, { status: 404 });
    }

    // Find the cart item
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cartItem = cart.items.find((item: any) => item._id.toString() === itemId);
    if (!cartItem) {
      return NextResponse.json({ error: 'Cart item not found' }, { status: 404 });
    }

    // Get the current product's variantGroup
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const currentVG = (cartItem.productId as any)?.variantGroup;

    // Validate the new product exists, is active, and belongs to the same variant group
    const newProduct = await Product.findById(newProductId);
    if (!newProduct || !newProduct.isActive) {
      return NextResponse.json({ error: 'Product not found or inactive' }, { status: 404 });
    }

    if (!currentVG || newProduct.variantGroup !== currentVG) {
      return NextResponse.json({ error: 'Products are not in the same variant group' }, { status: 400 });
    }

    // Cap quantity to new product's stock
    const newQuantity = Math.min(cartItem.quantity, newProduct.stock);
    if (newQuantity === 0) {
      return NextResponse.json({ error: 'New variant is out of stock' }, { status: 400 });
    }

    // Check if the new product is already in the cart
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existingNewItem = cart.items.find((item: any) =>
      item.productId?._id?.toString() === newProductId && item._id.toString() !== itemId
    ) as any;

    if (existingNewItem) {
      // Merge: add quantity to existing item, remove the swapped item
      const mergedQty = Math.min(existingNewItem.quantity + newQuantity, newProduct.stock);
      await Cart.findOneAndUpdate(
        query,
        {
          $set: { [`items.$[existing].quantity`]: mergedQty },
          $pull: { items: { _id: new mongoose.Types.ObjectId(itemId) } },
        },
        {
          arrayFilters: [{ 'existing._id': existingNewItem._id }],
        }
      );
    } else {
      // Swap the productId and update quantity
      await Cart.findOneAndUpdate(
        { ...query, 'items._id': new mongoose.Types.ObjectId(itemId) },
        {
          $set: {
            'items.$.productId': new mongoose.Types.ObjectId(newProductId),
            'items.$.quantity': newQuantity,
          },
        }
      );
    }

    return NextResponse.json({ success: true, message: 'Pack size swapped' });
  } catch (error) {
    console.error('POST /api/cart/swap-variant error:', error);
    return NextResponse.json({ error: 'Failed to swap variant' }, { status: 500 });
  }
}

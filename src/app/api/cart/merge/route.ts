import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import Cart from '@/models/Cart';
import { auth } from '@/lib/auth';

// POST /api/cart/merge — Merge guest cart into user cart on login
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Must be logged in to merge cart' }, { status: 401 });
    }

    await dbConnect();
    const { sessionId } = await req.json();
    if (!sessionId) {
      return NextResponse.json({ message: 'No guest cart to merge' });
    }

    const guestCart = await Cart.findOne({ sessionId });
    if (!guestCart || guestCart.items.length === 0) {
      return NextResponse.json({ message: 'No guest cart to merge' });
    }

    let userCart = await Cart.findOne({ userId: session.user.id });
    if (!userCart) {
      // Transfer the guest cart to the user
      guestCart.userId = new mongoose.Types.ObjectId(session.user.id);
      guestCart.sessionId = null;
      await guestCart.save();
      return NextResponse.json({ message: 'Guest cart transferred', itemCount: guestCart.items.length });
    }

    // Merge: match on productId + variantId pair (not productId alone)
    for (const guestItem of guestCart.items) {
      const existingIndex = userCart.items.findIndex(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (item: Record<string, any>) =>
          item.productId.toString() === guestItem.productId.toString() &&
          item.variantId?.toString() === guestItem.variantId?.toString()
      );

      if (existingIndex > -1) {
        // Keep the higher quantity
        userCart.items[existingIndex].quantity = Math.max(
          userCart.items[existingIndex].quantity,
          guestItem.quantity
        );
      } else {
        userCart.items.push({
          productId: guestItem.productId,
          variantId: guestItem.variantId,
          quantity: guestItem.quantity,
          addedAt: guestItem.addedAt,
        });
      }
    }

    await userCart.save();
    // Clean up guest cart
    await Cart.deleteOne({ sessionId });

    return NextResponse.json({ message: 'Carts merged', itemCount: userCart.items.length });
  } catch (error) {
    console.error('POST /api/cart/merge error:', error);
    return NextResponse.json({ error: 'Failed to merge carts' }, { status: 500 });
  }
}

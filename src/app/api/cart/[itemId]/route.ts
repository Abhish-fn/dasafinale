import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Cart from '@/models/Cart';
import Product from '@/models/Product';
import { auth } from '@/lib/auth';
import { cartUpdateSchema } from '@/lib/validations';
import { sanitize } from '@/lib/sanitize';

// PUT /api/cart/[itemId] — Update item quantity
export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ itemId: string }> }
) {
  try {
    await dbConnect();
    const session = await auth();
    const sessionId = req.headers.get('x-session-id');
    const { itemId } = await ctx.params;
    const body = sanitize(await req.json());
    const { quantity } = cartUpdateSchema.parse(body);

    const query = session?.user
      ? { userId: session.user.id }
      : { sessionId };

    const cart = await Cart.findOne(query);
    if (!cart) {
      return NextResponse.json({ error: 'Cart not found' }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const item = (cart.items as any[]).find(
      (i) => i._id.toString() === itemId
    );
    if (!item) {
      return NextResponse.json({ error: 'Item not found in cart' }, { status: 404 });
    }

    // Validate stock against the specific variant, not the product
    const product = await Product.findById(item.productId);
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    const variant = product.variants.id(item.variantId);
    if (!variant) {
      return NextResponse.json({ error: 'Variant no longer exists' }, { status: 404 });
    }
    if (variant.stock < quantity) {
      return NextResponse.json({ error: 'Insufficient stock', available: variant.stock }, { status: 400 });
    }

    item.quantity = quantity;
    await cart.save();

    return NextResponse.json({ message: 'Quantity updated', quantity });
  } catch (error) {
    console.error('PUT /api/cart/[itemId] error:', error);
    return NextResponse.json({ error: 'Failed to update cart item' }, { status: 500 });
  }
}

// DELETE /api/cart/[itemId] — Remove item from cart
export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ itemId: string }> }
) {
  try {
    await dbConnect();
    const session = await auth();
    const sessionId = req.headers.get('x-session-id');
    const { itemId } = await ctx.params;

    const query = session?.user
      ? { userId: session.user.id }
      : { sessionId };

    const cart = await Cart.findOne(query);
    if (!cart) {
      return NextResponse.json({ error: 'Cart not found' }, { status: 404 });
    }

    cart.items = cart.items.filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (item: Record<string, any>) => item._id.toString() !== itemId
    );
    await cart.save();

    return NextResponse.json({ message: 'Item removed', itemCount: cart.items.length });
  } catch (error) {
    console.error('DELETE /api/cart/[itemId] error:', error);
    return NextResponse.json({ error: 'Failed to remove cart item' }, { status: 500 });
  }
}

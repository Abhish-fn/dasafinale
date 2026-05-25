import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Wishlist from '@/models/Wishlist';
import { auth } from '@/lib/auth';

// DELETE /api/wishlist/[itemId] — Remove from wishlist
export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ itemId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const { itemId } = await ctx.params;

    const wishlist = await Wishlist.findOne({ userId: session.user.id });
    if (!wishlist) {
      return NextResponse.json({ error: 'Wishlist not found' }, { status: 404 });
    }

    wishlist.products = wishlist.products.filter(
      (item: Record<string, any>) => item._id.toString() !== itemId && item.productId.toString() !== itemId
    );
    await wishlist.save();

    return NextResponse.json({ message: 'Removed from wishlist' });
  } catch (error) {
    console.error('DELETE /api/wishlist/[itemId] error:', error);
    return NextResponse.json({ error: 'Failed to remove from wishlist' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Coupon from '@/models/Coupon';
import { auth } from '@/lib/auth';
import { sanitize } from '@/lib/sanitize';

// PUT /api/coupons/[couponId] — Update coupon (Admin)
export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ couponId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    await dbConnect();
    const { couponId } = await ctx.params;
    const body = sanitize(await req.json());
    const coupon = await Coupon.findByIdAndUpdate(couponId, { $set: body }, { new: true });
    if (!coupon) return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
    return NextResponse.json({ coupon });
  } catch (error) {
    console.error('PUT /api/coupons/[couponId] error:', error);
    return NextResponse.json({ error: 'Failed to update coupon' }, { status: 500 });
  }
}

// DELETE /api/coupons/[couponId] — Delete coupon (Admin)
export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ couponId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    await dbConnect();
    const { couponId } = await ctx.params;
    const result = await Coupon.findByIdAndDelete(couponId);
    if (!result) return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
    return NextResponse.json({ message: 'Coupon deleted' });
  } catch (error) {
    console.error('DELETE /api/coupons/[couponId] error:', error);
    return NextResponse.json({ error: 'Failed to delete coupon' }, { status: 500 });
  }
}

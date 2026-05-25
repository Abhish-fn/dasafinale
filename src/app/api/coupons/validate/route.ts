import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Coupon from '@/models/Coupon';
import CouponUsage from '@/models/CouponUsage';
import { auth } from '@/lib/auth';
import { couponValidateSchema } from '@/lib/validations';
import { sanitize } from '@/lib/sanitize';
import { rateLimit } from '@/lib/rate-limit';

// POST /api/coupons/validate — Validate coupon (rate-limited: 5 req/min)
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit: 5 requests per minute per user
    const rl = rateLimit(`coupon:${session.user.id}`, 5, 60_000);
    if (!rl.success) {
      return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 });
    }

    await dbConnect();
    const body = sanitize(await req.json());
    const { code, cartTotal } = couponValidateSchema.parse(body);

    const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });
    if (!coupon) {
      return NextResponse.json({ error: 'Invalid coupon code' }, { status: 404 });
    }

    // Check expiry
    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      return NextResponse.json({ error: 'Coupon has expired' }, { status: 400 });
    }

    // Check usage limit (usedCount + reservedCount against usageLimit)
    if (coupon.usedCount + coupon.reservedCount >= coupon.usageLimit) {
      return NextResponse.json({ error: 'Coupon usage limit reached' }, { status: 400 });
    }

    // Check per-user limit
    const userUsage = await CouponUsage.countDocuments({
      couponId: coupon._id,
      userId: session.user.id,
      status: { $in: ['used', 'reserved'] },
    });
    if (userUsage >= coupon.perUserLimit) {
      return NextResponse.json({ error: 'You have already used this coupon' }, { status: 400 });
    }

    // Check minimum order amount
    if (cartTotal < coupon.minOrderAmount) {
      return NextResponse.json({
        error: `Minimum order of ₹${(coupon.minOrderAmount / 100).toFixed(0)} required`,
      }, { status: 400 });
    }

    // Calculate discount
    let discount = 0;
    if (coupon.discountType === 'percentage') {
      discount = Math.round((cartTotal * coupon.discountValue) / 100);
      if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
        discount = coupon.maxDiscountAmount;
      }
    } else {
      discount = coupon.discountValue;
    }

    // Don't let discount exceed cart total
    discount = Math.min(discount, cartTotal);

    return NextResponse.json({
      valid: true,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discount,
      description: coupon.description,
    });
  } catch (error) {
    console.error('POST /api/coupons/validate error:', error);
    return NextResponse.json({ error: 'Failed to validate coupon' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Coupon from '@/models/Coupon';
import { auth } from '@/lib/auth';
import { couponSchema } from '@/lib/validations';
import { sanitize } from '@/lib/sanitize';

// GET /api/coupons — List all coupons (Admin)
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    await dbConnect();
    const coupons = await Coupon.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json({ coupons });
  } catch (error) {
    console.error('GET /api/coupons error:', error);
    return NextResponse.json({ error: 'Failed to fetch coupons' }, { status: 500 });
  }
}

// POST /api/coupons — Create coupon (Admin)
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    await dbConnect();
    const body = sanitize(await req.json());
    const parsed = couponSchema.parse(body);
    const coupon = await Coupon.create(parsed);
    return NextResponse.json({ coupon }, { status: 201 });
  } catch (error) {
    console.error('POST /api/coupons error:', error);
    return NextResponse.json({ error: 'Failed to create coupon' }, { status: 500 });
  }
}

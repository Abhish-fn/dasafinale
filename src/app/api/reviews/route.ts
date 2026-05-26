import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import Review from '@/models/Review';
import Order from '@/models/Order';
import { auth } from '@/lib/auth';
import { sanitize } from '@/lib/sanitize';
import { z } from 'zod';

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().min(2).max(100),
  comment: z.string().min(5).max(1000),
});

// GET /api/reviews?productId=xxx — Get reviews for a product
export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('productId');

    if (!productId) {
      return NextResponse.json({ error: 'productId required' }, { status: 400 });
    }

    const reviews = await Review.find({ productId: new mongoose.Types.ObjectId(productId) })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    // Calculate stats
    const total = reviews.length;
    const avgRating = total > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / total : 0;
    const distribution = [0, 0, 0, 0, 0]; // 1-5 stars
    reviews.forEach((r) => { distribution[r.rating - 1]++; });

    return NextResponse.json({
      reviews,
      stats: { total, avgRating: Math.round(avgRating * 10) / 10, distribution },
    });
  } catch (error) {
    console.error('GET /api/reviews error:', error);
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
  }
}

// POST /api/reviews — Create a review
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const body = sanitize(await req.json());
    const { rating, title, comment } = reviewSchema.parse(body);
    const { productId } = body;

    if (!productId) {
      return NextResponse.json({ error: 'productId required' }, { status: 400 });
    }

    // Check if user already reviewed
    const existing = await Review.findOne({
      productId: new mongoose.Types.ObjectId(productId),
      userId: new mongoose.Types.ObjectId(session.user.id),
    });
    if (existing) {
      return NextResponse.json({ error: 'You already reviewed this product' }, { status: 409 });
    }

    // Check verified purchase
    const purchased = await Order.findOne({
      userId: session.user.id,
      'items.productId': new mongoose.Types.ObjectId(productId),
      paymentProcessed: true,
      status: { $in: ['confirmed', 'packed', 'shipped', 'out_for_delivery', 'delivered'] },
    });

    const review = await Review.create({
      productId: new mongoose.Types.ObjectId(productId),
      userId: new mongoose.Types.ObjectId(session.user.id),
      userName: session.user.name || 'Anonymous',
      userImage: session.user.image || undefined,
      rating,
      title,
      comment,
      isVerifiedPurchase: !!purchased,
    });

    return NextResponse.json({ review }, { status: 201 });
  } catch (error) {
    console.error('POST /api/reviews error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create review' }, { status: 500 });
  }
}

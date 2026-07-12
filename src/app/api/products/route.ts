import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import Product from '@/models/Product';
import { auth } from '@/lib/auth';
import { productSchema } from '@/lib/validations';
import { sanitize } from '@/lib/sanitize';
import { slugify, getCategoryPrefix } from '@/lib/utils';

// GET /api/products — List with filters, sort, pagination
export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);

    // Build filter query
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {};
    const showAll = searchParams.get('showAll') === 'true';
    if (!showAll) filter.isActive = true;

    const category = searchParams.get('category');
    if (category) filter.category = category;

    const tags = searchParams.get('tags');
    if (tags) filter.tags = { $in: tags.split(',').map((t) => t.trim()) };

    const priceMin = searchParams.get('priceMin');
    const priceMax = searchParams.get('priceMax');
    if (priceMin || priceMax) {
      filter['variants.price'] = {};
      if (priceMin) (filter['variants.price'] as Record<string, number>).$gte = parseInt(priceMin);
      if (priceMax) (filter['variants.price'] as Record<string, number>).$lte = parseInt(priceMax);
    }

    const search = searchParams.get('search');
    if (search) {
      const searchRegex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [
        { title: { $regex: searchRegex } },
        { description: { $regex: searchRegex } },
        { tags: { $regex: searchRegex } },
      ];
    }

    // Pagination
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '12')));
    const skip = (page - 1) * limit;

    // Sort — all paths use aggregation since price/salesCount live inside variants
    const sortParam = searchParams.get('sort') || 'recommended';

    const pipeline: mongoose.PipelineStage[] = [
      { $match: filter },
      {
        $addFields: {
          minPrice: { $min: '$variants.price' },
          totalSalesCount: { $sum: '$variants.salesCount' },
        },
      },
    ];

    switch (sortParam) {
      case 'price_asc':
        pipeline.push({ $sort: { minPrice: 1 } });
        break;
      case 'price_desc':
        pipeline.push({ $sort: { minPrice: -1 } });
        break;
      case 'best_sellers':
        pipeline.push({ $sort: { totalSalesCount: -1 } });
        break;
      case 'must_try':
        pipeline.push({ $sort: { isMustTry: -1, totalSalesCount: -1 } });
        break;
      case 'newest':
        pipeline.push({ $sort: { createdAt: -1 } });
        break;
      case 'recommended':
      default:
        pipeline.push({
          $addFields: {
            score: {
              $add: [
                { $multiply: ['$totalSalesCount', 0.4] },
                { $cond: ['$isMustTry', 30, 0] },
                { $cond: ['$isBestSeller', 20, 0] },
                { $cond: ['$isSpecialItem', 10, 0] },
              ],
            },
          },
        });
        pipeline.push({ $sort: { score: -1 } });
        break;
    }

    pipeline.push({
      $facet: {
        data: [{ $skip: skip }, { $limit: limit }],
        count: [{ $count: 'total' }],
      },
    });

    const result = await Product.aggregate(pipeline);
    const products = result[0].data;
    const total = result[0].count[0]?.total || 0;

    // Get available filter values (for sidebar)
    const [categories, allTags] = await Promise.all([
      Product.distinct('category', { isActive: true }),
      Product.distinct('tags', { isActive: true }),
    ]);

    return NextResponse.json({
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      filters: {
        categories,
        tags: allTags,
      },
    });
  } catch (error) {
    console.error('GET /api/products error:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

// POST /api/products — Create product (Admin only)
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await dbConnect();
    const body = sanitize(await req.json());
    const parsed = productSchema.parse(body);

    // Generate productId
    const prefix = getCategoryPrefix(parsed.category);
    const count = await Product.countDocuments({ category: parsed.category });
    const productId = `${prefix}${String(count + 1).padStart(3, '0')}`;

    // Generate slug
    const slug = slugify(parsed.title);
    // Check uniqueness
    const existing = await Product.findOne({ slug });
    const finalSlug = existing ? `${slug}-${productId.toLowerCase()}` : slug;

    const product = await Product.create({
      ...parsed,
      productId,
      slug: finalSlug,
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    console.error('POST /api/products error:', error);
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation failed', details: error }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}

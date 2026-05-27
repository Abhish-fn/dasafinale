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
    const filter: Record<string, any> = { isActive: true };
    const showAll = searchParams.get('showAll') === 'true';

    const category = searchParams.get('category');
    if (category) filter.category = category;

    const foodType = searchParams.get('foodType');
    if (foodType) filter.foodType = foodType;

    const tags = searchParams.get('tags');
    if (tags) filter.tags = { $in: tags.split(',').map((t) => t.trim()) };

    const priceMin = searchParams.get('priceMin');
    const priceMax = searchParams.get('priceMax');
    if (priceMin || priceMax) {
      filter.price = {};
      if (priceMin) (filter.price as Record<string, number>).$gte = parseInt(priceMin);
      if (priceMax) (filter.price as Record<string, number>).$lte = parseInt(priceMax);
    }

    const search = searchParams.get('search');
    if (search) {
      filter.$text = { $search: search };
    }

    // Pagination
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '12')));
    const skip = (page - 1) * limit;

    // Sort
    const sortParam = searchParams.get('sort') || 'recommended';
    let sortQuery: Record<string, mongoose.SortOrder> = {};

    switch (sortParam) {
      case 'price_asc':
        sortQuery = { price: 1 };
        break;
      case 'price_desc':
        sortQuery = { price: -1 };
        break;
      case 'best_sellers':
        sortQuery = { salesCount: -1 };
        break;
      case 'must_try':
        sortQuery = { isMustTry: -1, salesCount: -1 };
        break;
      case 'newest':
        sortQuery = { createdAt: -1 };
        break;
      case 'recommended':
      default:
        // Use aggregation for weighted sort
        break;
    }

    let products;
    let total: number;

    if (sortParam === 'recommended' && !search) {
      // Weighted recommendation score
      const pipeline: mongoose.PipelineStage[] = [
        { $match: filter },
        {
          $addFields: {
            score: {
              $add: [
                { $multiply: ['$salesCount', 0.4] },
                { $cond: ['$isMustTry', 30, 0] },
                { $cond: ['$isBestSeller', 20, 0] },
                { $cond: ['$isSpecialItem', 10, 0] },
              ],
            },
          },
        },
        { $sort: { score: -1 } },
        {
          $facet: {
            data: [{ $skip: skip }, { $limit: limit }],
            count: [{ $count: 'total' }],
          },
        },
      ];

      const result = await Product.aggregate(pipeline);
      products = result[0].data;
      total = result[0].count[0]?.total || 0;
    } else {
      [products, total] = await Promise.all([
        Product.find(filter).sort(sortQuery).skip(skip).limit(limit).lean(),
        Product.countDocuments(filter),
      ]);
    }

    // Get available filter values (for sidebar)
    const [categories, foodTypes, allTags] = await Promise.all([
      Product.distinct('category', { isActive: true }),
      Product.distinct('foodType', { isActive: true }),
      Product.distinct('tags', { isActive: true }),
    ]);

    // Deduplicate products by variantGroup (skip for admin/showAll)
    // For products sharing the same variantGroup, keep only the cheapest (smallest pack)
    // and attach a variantCount so the card can show "X pack sizes"
    let finalProducts = products;
    if (!showAll) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const variantGroupMap = new Map<string, { product: any; count: number }>();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const deduped: any[] = [];

      for (const p of products) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const vg = (p as any).variantGroup as string | undefined;
        if (vg) {
          const existing = variantGroupMap.get(vg);
          if (existing) {
            existing.count++;
            // Keep the cheaper one (smallest pack)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if ((p as any).price < (existing.product as any).price) {
              existing.product = p;
            }
          } else {
            variantGroupMap.set(vg, { product: p, count: 1 });
          }
        } else {
          deduped.push(p);
        }
      }

      // Append variant group representatives with counts
      for (const { product: rep, count } of variantGroupMap.values()) {
        let totalVariants = count;
        if (count >= 1) {
          const vg = (rep as Record<string, unknown>).variantGroup as string;
          totalVariants = await Product.countDocuments({ variantGroup: vg, isActive: true });
        }
        deduped.push({ ...rep, variantCount: totalVariants > 1 ? totalVariants : undefined });
      }
      finalProducts = deduped;
    }

    return NextResponse.json({
      products: finalProducts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      filters: {
        categories,
        foodTypes,
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

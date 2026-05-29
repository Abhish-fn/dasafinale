import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Product from '@/models/Product';
import { auth } from '@/lib/auth';
import { productUpdateSchema, adminPasswordSchema } from '@/lib/validations';
import { sanitize } from '@/lib/sanitize';
import { slugify } from '@/lib/utils';
import bcrypt from 'bcryptjs';

// GET /api/products/[productId] — Single product + size variants
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ productId: string }> }
) {
  try {
    await dbConnect();
    const { productId } = await ctx.params;

    // Try by productId first, then by slug
    let product = await Product.findOne({ productId, isActive: true }).lean();
    if (!product) {
      product = await Product.findOne({ slug: productId, isActive: true }).lean();
    }
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Fetch size variants (same variantGroup, different _id)
    let variants: typeof product[] = [];
    if (product.variantGroup) {
      variants = await Product.find({
        variantGroup: product.variantGroup,
        isActive: true,
        _id: { $ne: product._id },
      })
        .select('productId slug title packagingSize price images')
        .lean();
    }

    return NextResponse.json({ product, variants });
  } catch (error) {
    console.error('GET /api/products/[productId] error:', error);
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 });
  }
}

// PUT /api/products/[productId] — Update product (Admin only)
export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ productId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await dbConnect();
    const { productId } = await ctx.params;
    const body = sanitize(await req.json());
    const parsed = productUpdateSchema.parse(body);

    // If title changed, regenerate slug
    const updateData: Record<string, unknown> = { ...parsed };
    if (parsed.title) {
      const newSlug = slugify(parsed.title);
      updateData.slug = newSlug;
      // Check slug uniqueness
      const existing = await Product.findOne({
        slug: newSlug,
        productId: { $ne: productId },
      });
      if (existing) {
        updateData.slug = `${newSlug}-${productId.toLowerCase()}`;
      }
    }

    const product = await Product.findOneAndUpdate(
      { productId },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ product });
  } catch (error) {
    console.error('PUT /api/products/[productId] error:', error);
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation failed', details: error }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

// DELETE /api/products/[productId] — Soft-delete (Admin + password)
export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ productId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = sanitize(await req.json());
    const { adminPassword } = adminPasswordSchema.parse(body);

    // Verify admin password
    const hash = process.env.ADMIN_PASSWORD_HASH;
    if (!hash) {
      return NextResponse.json({ error: 'Admin password not configured' }, { status: 500 });
    }

    const isValid = await bcrypt.compare(adminPassword, hash);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid admin password' }, { status: 401 });
    }

    await dbConnect();
    const { productId } = await ctx.params;

    // Soft delete — set isActive to false
    const product = await Product.findOneAndUpdate(
      { productId },
      { $set: { isActive: false } },
      { new: true }
    );

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Product deactivated', productId });
  } catch (error) {
    console.error('DELETE /api/products/[productId] error:', error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}

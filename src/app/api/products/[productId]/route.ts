import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Product from '@/models/Product';
import { auth } from '@/lib/auth';
import { productUpdateSchema } from '@/lib/validations';
import { sanitize } from '@/lib/sanitize';
import { slugify } from '@/lib/utils';

// GET /api/products/[productId] — Single product (variants are embedded)
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

    // Sort variants by price ascending for consistent display
    product.variants.sort((a, b) => a.price - b.price);

    return NextResponse.json({ product });
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
      { returnDocument: 'after', runValidators: true }
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

// DELETE /api/products/[productId] — Hard delete (Admin only)
export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ productId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await dbConnect();
    const { productId } = await ctx.params;

    // 1. Find the product
    const product = await Product.findOne({ productId });
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // 2. Delete images from Cloudinary
    if (product.images && product.images.length > 0) {
      const cloudinary = (await import('@/lib/cloudinary')).default;
      for (const url of product.images) {
        try {
          // Extract public_id from Cloudinary URL
          // URL format: https://res.cloudinary.com/.../upload/v.../dasadinusulu/products/filename.ext
          const parts = url.split('/upload/');
          if (parts[1]) {
            const pathAfterUpload = parts[1].replace(/^v\d+\//, ''); // remove version
            const publicId = pathAfterUpload.replace(/\.[^.]+$/, ''); // remove extension
            await cloudinary.uploader.destroy(publicId);
          }
        } catch (err) {
          console.error(`Failed to delete Cloudinary image: ${url}`, err);
          // Continue deleting other images even if one fails
        }
      }
    }

    const productObjectId = product._id;

    // 3. Delete the product from MongoDB
    await Product.deleteOne({ _id: productObjectId });

    // 4. Remove from all carts (Cart.items[].productId is ObjectId ref)
    const Cart = (await import('@/models/Cart')).default;
    await Cart.updateMany(
      {},
      { $pull: { items: { productId: productObjectId } } }
    );

    // 5. Remove from all wishlists (Wishlist.products[].productId is ObjectId ref)
    const Wishlist = (await import('@/models/Wishlist')).default;
    await Wishlist.updateMany(
      {},
      { $pull: { products: { productId: productObjectId } } }
    );

    // 6. Delete all reviews for this product (Review.productId is ObjectId ref)
    const Review = (await import('@/models/Review')).default;
    await Review.deleteMany({ productId: productObjectId });

    return NextResponse.json({ message: 'Product permanently deleted', productId });
  } catch (error) {
    console.error('DELETE /api/products/[productId] error:', error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}

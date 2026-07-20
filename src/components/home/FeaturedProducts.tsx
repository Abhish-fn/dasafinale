/**
 * FeaturedProducts — Server Component
 *
 * Fetches featured product data directly from the DB (no useEffect, no client JS).
 * The page-level ISR (revalidate=150) handles caching; admin mutations call
 * revalidatePath('/') to bust the cache immediately when featured products change.
 */

import Link from 'next/link';
import dbConnect from '@/lib/db';
import Product from '@/models/Product';
import ProductCard from '@/components/products/ProductCard';
import styles from './FeaturedProducts.module.css';

interface ProductData {
  _id: string;
  productId: string;
  title: string;
  images: string[];
  variants: { _id: string; packagingSize: string; price: number; compareAtPrice?: number; stock: number }[];
  category: string;
  isMustTry?: boolean;
  isBestSeller?: boolean;
  tags?: string[];
}

async function getFeaturedProducts(): Promise<ProductData[]> {
  try {
    await dbConnect();

    const featuredPipeline = (
      filter: Record<string, unknown>,
      sortField: Record<string, 1 | -1>,
      limit: number
    ) => [
      { $match: { isActive: true, ...filter } },
      { $addFields: { totalSalesCount: { $sum: '$variants.salesCount' } } },
      { $sort: sortField },
      { $limit: limit },
    ];

    const [mustTry, bestSellers, newArrivals] = await Promise.all([
      Product.aggregate(featuredPipeline({ isMustTry: true }, { totalSalesCount: -1 }, 4)),
      Product.aggregate(featuredPipeline({ isBestSeller: true }, { totalSalesCount: -1 }, 4)),
      Product.aggregate([
        { $match: { isActive: true } },
        { $sort: { createdAt: -1 } },
        { $limit: 4 },
      ]),
    ]);

    // Merge all, deduplicate by _id, take top 6
    const all = [...bestSellers, ...mustTry, ...newArrivals] as ProductData[];
    const seen = new Set<string>();
    return all
      .filter((p) => {
        const id = String(p._id);
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      })
      .slice(0, 6);
  } catch {
    return [];
  }
}

export default async function FeaturedProducts() {
  const products = await getFeaturedProducts();

  if (products.length === 0) return null;

  return (
    <section
      style={{
        maxWidth: 'var(--max-width)',
        margin: '0 auto',
        padding: 'var(--space-12) var(--space-4) var(--space-4)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--red)' }}>
          Best Sellers
        </h2>
        <Link
          href="/products"
          style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--red)' }}
        >
          View All →
        </Link>
      </div>
      <p style={{ fontSize: 'var(--text-base)', color: 'var(--color-gray-500)', marginBottom: 'var(--space-8)', marginTop: 'calc(-1 * var(--space-4))' }}>
        Handpicked favourites from Andhra&apos;s finest
      </p>

      <div className={styles.featuredGrid}>
        {products.map((product) => (
          <ProductCard key={String(product._id)} product={product} />
        ))}
      </div>
    </section>
  );
}

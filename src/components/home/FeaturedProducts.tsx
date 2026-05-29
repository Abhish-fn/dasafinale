'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ProductCard from '@/components/products/ProductCard';
import { SkeletonCard } from '@/components/ui/Skeleton';

interface ProductData {
  _id: string;
  productId: string;
  title: string;
  images: string[];
  price: number;
  compareAtPrice?: number;
  category: string;
  packagingSize: string;
  stock: number;
  isMustTry?: boolean;
  isBestSeller?: boolean;
  foodType: string;
}

interface FeaturedData {
  mustTry: ProductData[];
  bestSellers: ProductData[];
  newArrivals: ProductData[];
}

export default function FeaturedProducts() {
  const [products, setProducts] = useState<ProductData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/products/featured')
      .then((r) => r.json())
      .then((data: FeaturedData) => {
        // Merge all products, deduplicate by _id, and take the top 6
        const all = [...(data.bestSellers || []), ...(data.mustTry || []), ...(data.newArrivals || [])];
        const seen = new Set<string>();
        const unique = all.filter((p) => {
          if (seen.has(p._id)) return false;
          seen.add(p._id);
          return true;
        });
        setProducts(unique.slice(0, 6));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (!loading && products.length === 0) {
    return null;
  }

  return (
    <section
      style={{
        maxWidth: 'var(--max-width)',
        margin: '0 auto',
        padding: 'var(--space-12) var(--space-4) var(--space-4)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--maroon)' }}>
          Featured Products
        </h2>
        <Link
          href="/products"
          style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--maroon)' }}
        >
          View All →
        </Link>
      </div>
      <p style={{ fontSize: 'var(--text-base)', color: 'var(--color-gray-500)', marginBottom: 'var(--space-8)', marginTop: 'calc(-1 * var(--space-4))' }}>
        Handpicked favourites from Andhra&apos;s finest
      </p>

      <div className="featured-grid">
        <style>{`
          .featured-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: var(--space-4);
          }
          @media (min-width: 768px) {
            .featured-grid {
              grid-template-columns: repeat(6, 1fr);
              gap: var(--space-4);
            }
          }
        `}</style>
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          : products.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))
        }
      </div>
    </section>
  );
}

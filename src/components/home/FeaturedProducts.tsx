'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ProductCard from '@/components/products/ProductCard';
import { SkeletonCard } from '@/components/ui/Skeleton';

interface ProductData {
  _id: string;
  slug: string;
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
  const [data, setData] = useState<FeaturedData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/products/featured')
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const sections = [
    { key: 'mustTry', title: '🔥 Must Try', products: data?.mustTry },
    { key: 'bestSellers', title: '⭐ Best Sellers', products: data?.bestSellers },
    { key: 'newArrivals', title: '✨ New Arrivals', products: data?.newArrivals },
  ].filter((s) => !data || (s.products && s.products.length > 0));

  if (!loading && (!data || sections.every((s) => !s.products?.length))) {
    return null;
  }

  return (
    <div>
      {sections.map((section) => (
        <section
          key={section.key}
          style={{
            maxWidth: 'var(--max-width)',
            margin: '0 auto',
            padding: 'var(--space-12) var(--space-4) var(--space-4)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--maroon)' }}>
              {section.title}
            </h2>
            <Link
              href="/products"
              style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--maroon)' }}
            >
              View All →
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 'var(--space-6)' }}>
            {loading
              ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
              : section.products?.map((product) => (
                  <ProductCard key={product._id} product={product} />
                ))
            }
          </div>
        </section>
      ))}
    </div>
  );
}

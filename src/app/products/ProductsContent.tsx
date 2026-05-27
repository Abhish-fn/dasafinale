'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import ProductCard from '@/components/products/ProductCard';
import ProductFilters from '@/components/products/ProductFilters';
import ProductSort from '@/components/products/ProductSort';
import { SkeletonCard } from '@/components/ui/Skeleton';
import styles from './products.module.css';

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
  tags?: string[];
  foodType: string;
  variantCount?: number;
}

interface FetchResult {
  products: ProductData[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  filters: { categories: string[]; foodTypes: string[]; tags: string[] };
}

export default function ProductsContent() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<FetchResult | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/products?${searchParams.toString()}`);
      if (!res.ok) throw new Error('API error');
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Failed to fetch products:', err);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const currentPage = parseInt(searchParams.get('page') || '1');

  return (
    <div className={styles.content}>
      {data?.filters && (
        <ProductFilters
          categories={data.filters.categories}
          foodTypes={data.filters.foodTypes}
          tags={data.filters.tags}
        />
      )}

      <div>
        <ProductSort total={data?.pagination.total || 0} />

        {loading ? (
          <div className={styles.grid}>
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : data?.products.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>🔍</span>
            <h3 className={styles.emptyTitle}>No products found</h3>
            <p className={styles.emptyDesc}>Try adjusting your filters or search term.</p>
          </div>
        ) : (
          <>
            <div className={styles.grid}>
              {data?.products.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>

            {data && data.pagination.totalPages > 1 && (
              <div className={styles.pagination}>
                {Array.from({ length: data.pagination.totalPages }).map((_, i) => (
                  <a
                    key={i}
                    href={`/products?${new URLSearchParams({ ...Object.fromEntries(searchParams.entries()), page: String(i + 1) }).toString()}`}
                    className={`${styles.pageBtn} ${currentPage === i + 1 ? styles.pageBtnActive : ''}`}
                  >
                    {i + 1}
                  </a>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

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
  tags?: string[];
  variantCount?: number;
}

interface FetchResult {
  products: ProductData[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  filters: { categories: string[]; tags: string[] };
}

export default function ProductsContent() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<FetchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

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

  // Close mobile filters when filters change (user selected something)
  useEffect(() => {
    setMobileFiltersOpen(false);
  }, [searchParams]);

  // Lock body scroll when mobile filters are open
  useEffect(() => {
    if (mobileFiltersOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileFiltersOpen]);

  const currentPage = parseInt(searchParams.get('page') || '1');

  const activeFilterCount = [
    searchParams.get('category'),
    searchParams.get('tags'),
  ].filter(Boolean).length;

  return (
    <div className={styles.content}>
      {/* Desktop sidebar filters */}
      {data?.filters && (
        <ProductFilters
          categories={data.filters.categories}
          tags={data.filters.tags}
        />
      )}

      <div>
        {/* Mobile filter button */}
        <button
          className={styles.mobileFilterBtn}
          onClick={() => setMobileFiltersOpen(true)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="6" x2="20" y2="6" /><line x1="8" y1="12" x2="20" y2="12" /><line x1="12" y1="18" x2="20" y2="18" />
          </svg>
          Filters
          {activeFilterCount > 0 && (
            <span className={styles.filterBadge}>{activeFilterCount}</span>
          )}
        </button>

        {/* Mobile filter overlay */}
        {mobileFiltersOpen && (
          <>
            <div className={styles.filterOverlay} onClick={() => setMobileFiltersOpen(false)} />
            <div className={styles.filterPanel}>
              <div className={styles.filterPanelHeader}>
                <h3 className={styles.filterPanelTitle}>Filters</h3>
                <button
                  className={styles.filterPanelClose}
                  onClick={() => setMobileFiltersOpen(false)}
                  aria-label="Close filters"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              <div className={styles.filterPanelBody}>
                {data?.filters && (
                  <ProductFilters
                    categories={data.filters.categories}
                    tags={data.filters.tags}
                  />
                )}
              </div>
            </div>
          </>
        )}

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

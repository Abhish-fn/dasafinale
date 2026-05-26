'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './ProductSort.module.css';

const sortOptions = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'newest', label: 'Newest First' },
  { value: 'price_asc', label: 'Price: Low → High' },
  { value: 'price_desc', label: 'Price: High → Low' },
  { value: 'best_sellers', label: 'Best Sellers' },
  { value: 'must_try', label: 'Must Try' },
];

interface ProductSortProps {
  total: number;
}

export default function ProductSort({ total }: ProductSortProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeSort = searchParams.get('sort') || 'recommended';
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  function handleSort(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('sort', value);
    params.delete('page');
    router.push(`/products?${params.toString()}`);
  }

  useEffect(() => {
    // Sync external search param changes
    setSearch(searchParams.get('search') || '');
  }, [searchParams]);

  function handleSearch(value: string) {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value.trim()) {
        params.set('search', value.trim());
      } else {
        params.delete('search');
      }
      params.delete('page');
      router.push(`/products?${params.toString()}`);
    }, 400);
  }

  return (
    <div className={styles.sortBar}>
      <div className={styles.searchWrapper}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-gray-400)', flexShrink: 0 }}>
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className={styles.searchInput}
        />
      </div>
      <span className={styles.count}>
        {total} product{total !== 1 ? 's' : ''}
      </span>
      <div className={styles.sortWrapper}>
        <label htmlFor="sort-select" className={styles.label}>Sort by:</label>
        <select
          id="sort-select"
          className={styles.select}
          value={activeSort}
          onChange={(e) => handleSort(e.target.value)}
        >
          {sortOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}


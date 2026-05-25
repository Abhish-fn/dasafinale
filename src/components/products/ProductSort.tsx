'use client';

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

  function handleSort(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('sort', value);
    params.delete('page');
    router.push(`/products?${params.toString()}`);
  }

  return (
    <div className={styles.sortBar}>
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

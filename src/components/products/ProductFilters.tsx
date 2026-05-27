'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import styles from './ProductFilters.module.css';

interface ProductFiltersProps {
  categories: string[];
  foodTypes: string[];
  tags: string[];
}

export default function ProductFilters({ categories, foodTypes, tags }: ProductFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const activeCategory = searchParams.get('category') || '';
  const activeFoodType = searchParams.get('foodType') || '';
  const activeTags = searchParams.get('tags')?.split(',') || [];

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete('page'); // Reset pagination on filter change
    router.push(`/products?${params.toString()}`);
  }

  function toggleTag(tag: string) {
    const params = new URLSearchParams(searchParams.toString());
    const current = params.get('tags')?.split(',').filter(Boolean) || [];
    const updated = current.includes(tag)
      ? current.filter((t) => t !== tag)
      : [...current, tag];
    if (updated.length > 0) {
      params.set('tags', updated.join(','));
    } else {
      params.delete('tags');
    }
    params.delete('page');
    router.push(`/products?${params.toString()}`);
  }

  function clearAll() {
    router.push('/products');
  }

  const hasFilters = activeCategory || activeFoodType || activeTags.length > 0;

  return (
    <aside className={styles.filters}>
      <div className={styles.header}>
        <h3 className={styles.title}>Filters</h3>
        {hasFilters && (
          <button className={styles.clearBtn} onClick={clearAll}>
            Clear All
          </button>
        )}
      </div>

      {/* Category */}
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Category</h4>
        <div className={styles.options}>
          {categories.map((cat) => (
            <button
              key={cat}
              className={cn(styles.option, activeCategory === cat && styles.active)}
              onClick={() => updateFilter('category', activeCategory === cat ? '' : cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Food Type */}
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Type</h4>
        <div className={styles.options}>
          {foodTypes.map((ft) => (
            <button
              key={ft}
              className={cn(styles.option, activeFoodType === ft && styles.active)}
              onClick={() => updateFilter('foodType', activeFoodType === ft ? '' : ft)}
            >
              {ft}
            </button>
          ))}
        </div>
      </div>

    </aside>
  );
}

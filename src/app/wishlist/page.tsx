'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useWishlist } from '@/context/WishlistContext';
import ProductCard from '@/components/products/ProductCard';
import styles from './wishlist.module.css';

export default function WishlistPage() {
  const { data: session } = useSession();
  const { items, loading } = useWishlist();

  if (!session?.user) {
    return (
      <div className={styles.container}>
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>💝</div>
          <h2 className={styles.emptyTitle}>Sign in to view your wishlist</h2>
          <p className={styles.emptyDesc}>Save your favorite snacks and come back to them anytime.</p>
          <Link href="/login" className={styles.shopBtn}>Sign In</Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <h1 className={styles.pageTitle}>My Wishlist</h1>
        <div className={styles.grid}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{ height: 320, background: 'var(--color-gray-100)', borderRadius: 'var(--radius-xl)', animation: 'pulse 2s ease-in-out infinite' }} />
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>💝</div>
          <h2 className={styles.emptyTitle}>Your wishlist is empty</h2>
          <p className={styles.emptyDesc}>Browse our products and tap the heart icon to save items here.</p>
          <Link href="/products" className={styles.shopBtn}>Browse Products</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.pageTitle}>My Wishlist ({items.length})</h1>
      <div className={styles.grid}>
        {items.map((item) => (
          <ProductCard key={item._id} product={item.product as Parameters<typeof ProductCard>[0]['product']} />
        ))}
      </div>
    </div>
  );
}

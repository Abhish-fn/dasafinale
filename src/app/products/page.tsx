import { Suspense } from 'react';
import type { Metadata } from 'next';
import ProductsContent from './ProductsContent';
import styles from './products.module.css';

export const metadata: Metadata = {
  title: 'Products — www.DasaDinusulu.com',
  description: 'Browse our collection of healthy snacks made with millets, seeds, and superfoods. Filter by category, type, and more.',
};

export default function ProductsPage() {
  return (
    <>
      <section className={styles.pageHeader}>
        <div className={styles.headerContainer}>
          <h1 className={styles.pageTitle}>Our Products</h1>
          <p className={styles.pageSubtitle}>
            Discover healthy snacks crafted with care — from clay pot roasted seeds to millet granola.
          </p>
        </div>
      </section>
      <Suspense>
        <ProductsContent />
      </Suspense>
    </>
  );
}

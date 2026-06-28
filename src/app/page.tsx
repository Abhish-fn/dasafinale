import Link from 'next/link';
import Image from 'next/image';
import FeaturedProducts from '@/components/home/FeaturedProducts';
import IngredientsOrbit from '@/components/home/IngredientsOrbit';
import styles from './page.module.css';

const categories = [
  { name: 'Dry Fruit Laddu', emoji: '🍯', slug: 'Dry Fruit Laddu' },
  { name: 'Roasted Snacks', emoji: '🥜', slug: 'Roasted Snacks' },
  { name: 'Dry Fruits & Nuts', emoji: '🫘', slug: 'Dry Fruits & Nuts' },
  { name: 'Millet Snacks', emoji: '🌾', slug: 'Millet Snacks' },
  { name: 'Seeds & Powders', emoji: '🌿', slug: 'Seeds & Powders' },
  { name: 'Traditional Sweets', emoji: '🍪', slug: 'Premium Healthy Sweets' },
];

export default function HomePage() {
  return (
    <>
      {/* Hero Banner */}
      <section className={styles.heroBanner}>
        <div className={styles.heroBannerImageWrap}>
          <Image
            src="/images/hbanner.png"
            alt="DasaDinusulu – Clay Pot Roasted Trusted Goodness. Wholesome, Crunchy, Delicious. 100% Natural, Trusted Quality, No Added Preservatives, Rich in Nutrients, Protein Packed."
            fill
            priority
            sizes="100vw"
            className={styles.heroBannerImage}
          />
        </div>
        <div className={styles.heroBannerOverlay}>
          <div className={styles.heroBannerCta}>
            <Link href="/products" className={styles.ctaPrimary}>
              Shop Now →
            </Link>
            <Link href="/about" className={styles.ctaSecondary}>
              Our Story
            </Link>
          </div>
        </div>
      </section>

      {/* Ingredients Orbit */}
      <IngredientsOrbit />

      {/* Featured Products */}
      <FeaturedProducts />

      {/* Categories Section */}
      <section className={styles.categories}>
        <div className={styles.sectionContainer}>
          <h2 className={styles.sectionTitle}>Our Categories</h2>
          <p className={styles.sectionSubtitle}>
            Handpicked favourites from Andhra&apos;s finest traditions.
          </p>
          <div className={styles.categoriesGrid}>
            {categories.map((cat, i) => (
              <Link
                key={cat.slug}
                href={`/products?category=${encodeURIComponent(cat.slug)}`}
                className={`${styles.categoryCard} ${styles[`cat${i}`]}`}
              >
                <span className={styles.categoryEmoji}>{cat.emoji}</span>
                <span className={styles.categoryName}>{cat.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className={styles.ctaBanner}>
        <h2 className={styles.ctaBannerTitle}>Ready to taste tradition?</h2>
        <p className={styles.ctaBannerSubtitle}>
          Free shipping on orders above ₹499. Start your wellness journey today.
        </p>
        <Link href="/products" className={styles.ctaBannerBtn}>
          Shop Now →
        </Link>
      </section>
    </>
  );
}

import Link from 'next/link';
import FeaturedProducts from '@/components/home/FeaturedProducts';
import styles from './page.module.css';

const values = [
  {
    icon: '🌿',
    title: '100% Natural',
    desc: 'No artificial colors, preservatives, or chemicals. Pure goodness in every bite.',
  },
  {
    icon: '🏠',
    title: 'Homemade Style',
    desc: 'Traditional recipes passed down through generations of Andhra heritage.',
  },
  {
    icon: '✅',
    title: 'Quality Tested',
    desc: 'Every batch tested for purity, freshness, and exceptional taste.',
  },
];

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
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContainer}>
          <div>
            <span className={styles.heroBadge}>🌿 Ten Traditional Treasures</span>
            <h1 className={styles.heroTitle}>
              Dasa Dinusulu
              <br />
              <span className={styles.heroTitleAccent}>Ten Traditional Treasures</span>
            </h1>
            <p className={styles.heroSubtitle}>
              Rooted in the rich culinary traditions of Andhra Pradesh,
              crafted with love, purity, and the finest natural ingredients.
            </p>
            <div className={styles.heroActions}>
              <Link href="/products" className={styles.ctaPrimary}>
                Shop Now →
              </Link>
              <Link href="/about" className={styles.ctaSecondary}>
                Our Story
              </Link>
            </div>
          </div>

          <div className={styles.heroVisual}>
            <div className={styles.heroCircles}>
              <div className={`${styles.circle} ${styles.circle1}`} />
              <div className={`${styles.circle} ${styles.circle2}`} />
              <div className={`${styles.circle} ${styles.circle3}`} />
              <span className={`${styles.circleEmoji} ${styles.emoji1}`}>🍯</span>
              <span className={`${styles.circleEmoji} ${styles.emoji2}`}>🥜</span>
              <span className={`${styles.circleEmoji} ${styles.emoji3}`}>🌾</span>
              <span className={`${styles.circleEmoji} ${styles.emoji4}`}>🌿</span>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className={styles.values}>
        <div className={styles.sectionContainer}>
          <h2 className={styles.sectionTitle}>Why Choose Us</h2>
          <p className={styles.sectionSubtitle}>
            From wholesome dry fruit laddus to crunchy roasted seeds — each product is a celebration of health and heritage.
          </p>
          <div className={styles.valuesGrid}>
            {values.map((v) => (
              <div key={v.title} className={styles.valueCard}>
                <span className={styles.valueIcon}>{v.icon}</span>
                <h3 className={styles.valueTitle}>{v.title}</h3>
                <p className={styles.valueDesc}>{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

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

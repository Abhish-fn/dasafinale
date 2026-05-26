import Link from 'next/link';
import styles from './page.module.css';

const values = [
  {
    icon: '🌾',
    title: 'Millet Based',
    desc: 'Our snacks use nutrient-rich millets as the primary ingredient, giving you sustained energy without the crash.',
  },
  {
    icon: '🚫',
    title: 'No Maida',
    desc: 'Absolutely zero refined flour. We use whole grains, seeds, and natural ingredients only — nothing artificial.',
  },
  {
    icon: '🍯',
    title: 'No Refined Sugar',
    desc: 'Sweetened naturally with jaggery, dates, and honey. Better taste, better health, better you.',
  },
];

const categories = [
  { name: 'Clay Pot Seeds & Superfoods', emoji: '🫘', slug: 'Clay Pot Roasted Seeds & Superfoods' },
  { name: 'Protein & Energy', emoji: '💪', slug: 'Protein & Energy Snacks' },
  { name: 'Palm Jaggery Biscuits', emoji: '🍪', slug: 'Palm Jaggery Millet Biscuits' },
  { name: 'Traditional Snacks', emoji: '🌾', slug: 'Traditional Millet Savoury Snacks' },
  { name: 'Chips & Crisps', emoji: '🥔', slug: 'Healthy Chips & Crisps' },
  { name: 'Premium Sweets', emoji: '🍯', slug: 'Premium Healthy Sweets' },
];

export default function HomePage() {
  return (
    <>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContainer}>
          <div>
            <span className={styles.heroBadge}>🌿 100% Natural Ingredients</span>
            <h1 className={styles.heroTitle}>
              Healthy Snacking,
              <br />
              <span className={styles.heroTitleAccent}>Reimagined.</span>
            </h1>
            <p className={styles.heroSubtitle}>
              Discover our range of millet-based snacks, clay pot roasted seeds,
              trail mixes, and more. No maida, no refined sugar — just pure,
              wholesome goodness.
            </p>
            <div className={styles.heroActions}>
              <Link href="/products" className={styles.ctaPrimary}>
                Shop Now →
              </Link>
              <Link href="/products" className={styles.ctaSecondary}>
                Explore Collection
              </Link>
            </div>
          </div>

          <div className={styles.heroVisual}>
            <div className={styles.heroCircles}>
              <div className={`${styles.circle} ${styles.circle1}`} />
              <div className={`${styles.circle} ${styles.circle2}`} />
              <div className={`${styles.circle} ${styles.circle3}`} />
              <span className={`${styles.circleEmoji} ${styles.emoji1}`}>🌾</span>
              <span className={`${styles.circleEmoji} ${styles.emoji2}`}>🥜</span>
              <span className={`${styles.circleEmoji} ${styles.emoji3}`}>🍪</span>
              <span className={`${styles.circleEmoji} ${styles.emoji4}`}>🌿</span>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className={styles.values}>
        <div className={styles.sectionContainer}>
          <h2 className={styles.sectionTitle}>Why DasaDinusulu?</h2>
          <p className={styles.sectionSubtitle}>
            We believe snacking should be both delicious and nutritious. Here&apos;s what makes us different.
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

      {/* Categories Section */}
      <section className={styles.categories}>
        <div className={styles.sectionContainer}>
          <h2 className={styles.sectionTitle}>Explore Our Collection</h2>
          <p className={styles.sectionSubtitle}>
            From crunchy seeds to chewy bars — find your perfect healthy snack.
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
        <h2 className={styles.ctaBannerTitle}>Ready to snack healthy?</h2>
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

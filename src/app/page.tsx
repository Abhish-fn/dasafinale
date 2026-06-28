import Link from 'next/link';
import Image from 'next/image';
import FeaturedProducts from '@/components/home/FeaturedProducts';
import IngredientsOrbit from '@/components/home/IngredientsOrbit';
import styles from './page.module.css';
/* eslint-disable @next/next/no-img-element */

const categories = [
  { name: 'Roasted Seeds', slug: 'Clay Pot Roasted Seeds & Superfoods', image: '/images/categories/RoastedSeeds.jpg' },
  { name: 'Healthy Chips',  slug: 'Healthy Chips & Crisps',             image: '/images/categories/HealthyChips.jpg' },
  { name: 'Jaggery Biscuits', slug: 'Palm Jaggery Millet Biscuits',     image: '/images/categories/JaggeryBiscuits.png' },
  { name: 'Healthy Sweets', slug: 'Premium Healthy Sweets',             image: '/images/categories/Healthy Sweets.jpg' },
  { name: 'Protein Snacks', slug: 'Protein & Energy Snacks',            image: '/images/categories/Proteinseeds.png' },
  { name: 'Millet Snacks',  slug: 'Traditional Millet Savoury Snacks',  image: '/images/categories/MilletSnacks.png' },
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
            {categories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/products?category=${encodeURIComponent(cat.slug)}`}
                className={styles.categoryCard}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={cat.image}
                  alt={cat.name}
                  loading="lazy"
                  className={styles.categoryBgImage}
                />
                <div className={styles.categoryOverlay} />
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

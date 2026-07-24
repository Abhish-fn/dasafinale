import Link from 'next/link';
import Image from 'next/image';
import FeaturedProducts from '@/components/home/FeaturedProducts';
import IngredientsOrbit from '@/components/home/IngredientsOrbit';
import InstagramReels from '@/components/home/InstagramReels';
import dbConnect from '@/lib/db';
import Banner from '@/models/Banner';
import styles from './page.module.css';
/* eslint-disable @next/next/no-img-element */

const categories = [
  { name: 'Roasted Seeds', slug: 'Clay Pot Roasted Seeds & Superfoods', image: '/images/categories/RoastedSeeds.webp' },
  { name: 'Healthy Chips',  slug: 'Healthy Chips & Crisps',             image: '/images/categories/HealthyChips.webp' },
  { name: 'Jaggery Biscuits', slug: 'Palm Jaggery Millet Biscuits',     image: '/images/categories/JaggeryBiscuits.webp' },
  { name: 'Healthy Sweets', slug: 'Premium Healthy Sweets',             image: '/images/categories/HealthySweets.webp' },
  { name: 'Protein Snacks', slug: 'Protein & Energy Snacks',            image: '/images/categories/Proteinseeds.webp' },
  { name: 'Millet Snacks',  slug: 'Traditional Millet Savoury Snacks',  image: '/images/categories/MilletSnacks.webp' },
];

async function getActiveBanner() {
  try {
    await dbConnect();
    // 1. Prefer an explicitly active banner
    const active = await Banner.findOne({ isActive: true }).lean();
    if (active) {
      return { imageUrl: active.imageUrl as string, altText: (active.altText as string) || 'DasaDinusulu Banner' };
    }
    // 2. Fall back to the most recently uploaded banner (any state)
    const latest = await Banner.findOne().sort({ createdAt: -1 }).lean();
    if (latest) {
      return { imageUrl: latest.imageUrl as string, altText: (latest.altText as string) || 'DasaDinusulu Banner' };
    }
  } catch {
    // DB unreachable — show blank banner
  }
  return null;
}

export const dynamic = 'force-dynamic';


export default async function HomePage() {
  const banner = await getActiveBanner();

  return (
    <>
      {/* Hero Banner */}
      <section className={styles.heroBanner}>
        <div className={styles.heroBannerImageWrap}>
          {banner && (
            <Image
              src={banner.imageUrl}
              alt={banner.altText}
              fill
              priority
              sizes="100vw"
              className={styles.heroBannerImage}
            />
          )}
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

      {/* Free Shipping Strip */}
      <div className={styles.shippingStrip}>
        🚚 FREE Shipping Above ₹1,499 For Orders in AP &amp; Telangana
      </div>

      {/* Ingredients Orbit */}
      <IngredientsOrbit />

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

      {/* Featured Products */}
      <FeaturedProducts />

      {/* Instagram Reels */}
      <InstagramReels />

      {/* CTA Banner */}
      <section className={styles.ctaBanner}>
        <h2 className={styles.ctaBannerTitle}>Ready to taste tradition?</h2>
        <p className={styles.ctaBannerSubtitle}>
          Free shipping on orders above ₹1499. Start your wellness journey today.
        </p>
        <Link href="/products" className={styles.ctaBannerBtn}>
          Shop Now →
        </Link>
      </section>
    </>
  );
}

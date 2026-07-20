/**
 * IngredientsOrbit — Server Component
 *
 * The orbit structure, rings, pot, and layout are all static server-rendered HTML.
 * Per-ingredient image error handling is delegated to the tiny SeedBadge client
 * component — the only JS that ships to the browser for this section.
 *
 * [PLACEHOLDER LIST — confirm real ingredients with client before shipping]
 */

/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import SeedBadge from './SeedBadge';
import styles from './IngredientsOrbit.module.css';

type Ingredient = {
  name: string;
  image: string;
  accent: string;
  initial: string;
  zoom?: number;
};

const INGREDIENTS: Ingredient[] = [
  { name: 'Watermelon Seeds',       image: '/images/ingredients/Watermelon.webp', accent: '#D9BD93', initial: 'W', zoom: 3.2 },
  { name: 'Corn',                   image: '/images/ingredients/Corn.webp',        accent: '#C9A14A', initial: 'C', zoom: 2.4 },
  { name: 'Moong',                  image: '/images/ingredients/Moong.webp',       accent: '#9C8456', initial: 'M', zoom: 3.0 },
  { name: 'Peanuts',                image: '/images/ingredients/Peanuts.webp',     accent: '#C9BC95', initial: 'P', zoom: 2.6 },
  { name: 'Bajra',                  image: '/images/ingredients/Bajra.webp',       accent: '#BDB29C', initial: 'B', zoom: 4.5 },
  { name: 'Soya',                   image: '/images/ingredients/Soya.webp',        accent: '#C99A3D', initial: 'S', zoom: 2.6 },
  { name: 'Kunkudu (Moth Beans)',   image: '/images/ingredients/Kunkudu.webp',     accent: '#8B4A3A', initial: 'K', zoom: 2.4 },
  { name: 'masoor',                 image: '/images/ingredients/Masoor.webp',      accent: '#D8CDB2', initial: 'A', zoom: 3.2 },
  { name: 'Pumpkin Seeds',          image: '/images/ingredients/Pumpkin.webp',     accent: '#5C6B3D', initial: 'P', zoom: 2.8 },
  { name: 'HorseGram (Ulavalu)',    image: '/images/ingredients/Ulavalu.webp',     accent: '#D9A833', initial: 'H', zoom: 2.6 },
];

/**
 * Pre-compute left/top % for each seed badge on the orbit circle.
 * angle = i × 36°  |  left = 50 + 44·sin(angle)  |  top = 50 − 44·cos(angle)
 */
function getSeedPosition(index: number) {
  const angleRad = (index * 36 * Math.PI) / 180;
  return {
    left: `${(50 + 44 * Math.sin(angleRad)).toFixed(2)}%`,
    top: `${(50 - 44 * Math.cos(angleRad)).toFixed(2)}%`,
  };
}

export default function DasaDinusuluHero() {
  return (
    <section className={styles.heroSection} id="hero-orbit">
      <div className={styles.heroLayout}>
        {/* Left column — copy */}
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>
            <span className={styles.eyebrowDot} />
            Clay-pot roasted &middot; Andhra tradition
          </span>

          <h1 className={styles.heroTitle}>
            Ten seeds.
            <br />
            One <em>clay pot.</em>
            <br />
            One snack.
          </h1>

          <p className={styles.heroSubtitle}>
            Dasa Dinusulu is slow-roasted over an open flame in traditional
            clay pots — almonds, jaggery, flax, pumpkin, oats, ragi, millets,
            sesame, sunflower and coconut, brought together the way Andhra
            grandmothers always made it.
          </p>

          <div className={styles.heroCtas}>
            <Link href="/products" className={styles.ctaPrimary}>
              Shop Dasa Dinusulu →
            </Link>
            <Link href="/about" className={styles.ctaSecondary}>
              See the roasting process
            </Link>
          </div>

          <div className={styles.trustRow}>
            <span className={styles.trustItem}>
              <span className={styles.trustNum}>10</span>
              <span className={styles.trustLabel}>seeds &amp; grains</span>
            </span>
            <span className={styles.trustItem}>
              <span className={styles.trustNum}>100%</span>
              <span className={styles.trustLabel}>clay-pot roasted</span>
            </span>
            <span className={styles.trustItem}>
              <span className={styles.trustNum}>0</span>
              <span className={styles.trustLabel}>preservatives</span>
            </span>
          </div>
        </div>

        {/* Right column — radial orbit diagram */}
        <div className={styles.radialWrap}>
          <div className={styles.ringOuter} />
          <div className={styles.ringInner} />

          <div className={styles.potCenter}>
            <img
              src="/images/Dasadinusulu.png"
              alt="Dasa Dinusulu"
              loading="lazy"
              style={{
                width: '90%',
                height: '90%',
                objectFit: 'cover',
                borderRadius: '50%',
              }}
            />
          </div>

          {/* Each badge is a tiny client component for onError handling only */}
          {INGREDIENTS.map((seed, i) => {
            const pos = getSeedPosition(i);
            return (
              <SeedBadge
                key={seed.name}
                name={seed.name}
                image={seed.image}
                accent={seed.accent}
                initial={seed.initial}
                zoom={seed.zoom}
                left={pos.left}
                top={pos.top}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
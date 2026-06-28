'use client';

/* eslint-disable @next/next/no-img-element */

import { useState, useCallback } from 'react';
import Link from 'next/link';
import styles from './IngredientsOrbit.module.css';

/* ---------------------------------------------------------------
   10 ingredients in fixed order around the orbit.
   [PLACEHOLDER LIST — confirm real ingredients with client before
   shipping; this matches the approved mockup, not a final product spec]
   `accent` drives the badge's pale tint + dotted ring + pill dot.
   `zoom` overrides how far the image is scaled in to fill the badge —
   see --seed-zoom in the CSS. Calibrated per-photo against the actual
   grain/kernel size in each image (dense piles of tiny grains like
   Bajra need much more zoom than chunky pieces like Kunkudu or Corn).
   Treat these as a starting point — confirm by eye once live, since
   judging exact size from a still image isn't pixel-perfect.
   --------------------------------------------------------------- */
type Ingredient = {
  name: string;
  image: string;
  accent: string;
  initial: string;
  zoom?: number;
};

const INGREDIENTS: Ingredient[] = [
  { name: 'Watermelon Seeds',  image: '/images/ingredients/Watermelon.png',         accent: '#D9BD93', initial: 'W', zoom: 3.2 },
  { name: 'Corn',              image: '/images/ingredients/Corn.png',         accent: '#C9A14A', initial: 'C', zoom: 2.4 },
  { name: 'Moong',             image: '/images/ingredients/Moong.png',      accent: '#9C8456', initial: 'M', zoom: 3.0 },
  { name: 'Peanuts',           image: '/images/ingredients/Peanuts.png',            accent: '#C9BC95', initial: 'P', zoom: 2.6 },
  { name: 'Bajra',             image: '/images/ingredients/Bajra.png',          accent: '#BDB29C', initial: 'B', zoom: 4.5 },
  { name: 'Soya',              image: '/images/ingredients/Soya.png',         accent: '#C99A3D', initial: 'S', zoom: 2.6 },
  { name: 'Kunkudu (Moth Beans)', image: '/images/ingredients/Kunkudu.png',            accent: '#8B4A3A', initial: 'K', zoom: 2.4 },
  { name: 'masoor',            image: '/images/ingredients/Masoor.png',         accent: '#D8CDB2', initial: 'A', zoom: 3.2 },
  { name: 'Pumpkin Seeds',     image: '/images/ingredients/Pumpkin.png',   accent: '#5C6B3D', initial: 'P', zoom: 2.8 },
  { name: 'HorseGram (Ulavalu)',image: '/images/ingredients/Ulavalu.png', accent: '#D9A833', initial: 'H', zoom: 2.6 },
];

/**
 * Pre-compute left/top % for each seed badge on the orbit circle.
 * angle = i × 36°  |  left = 50 + 44·sin(angle)  |  top = 50 − 44·cos(angle)
 *
 * Positioned with absolute left/top + a fixed pixel negative margin
 * (half the badge's own width/height) for centering — NOT
 * transform: translate(-50%,-50%), which resolves as a percentage of
 * the badge's own box rather than the container, and silently throws
 * the whole ring off if the badge size ever changes.
 */
function getSeedPosition(index: number) {
  const angleRad = (index * 36 * Math.PI) / 180;
  return {
    left: `${(50 + 44 * Math.sin(angleRad)).toFixed(2)}%`,
    top: `${(50 - 44 * Math.cos(angleRad)).toFixed(2)}%`,
  };
}

export default function DasaDinusuluHero() {
  /* Track which ingredient images failed to load (e.g. a real 404) →
     fall back to the initial letter. Deliberately NOT tracking a
     "loaded" state to fade images in via onLoad: on a fresh SSR page
     load, the browser can finish downloading an <img> before React
     finishes hydrating and attaches the onLoad listener. The load
     event fires into the void, a JS-gated opacity gets stuck at 0
     forever (image technically loaded, but invisible — only the
     letter shows). Letting the <img> render normally, with no
     JS-controlled visibility, sidesteps that race entirely. */
  const [broken, setBroken] = useState<Set<number>>(new Set());

  const onImgError = useCallback((i: number) => {
    setBroken((prev) => {
      const next = new Set(prev);
      next.add(i);
      return next;
    });
  }, []);

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

          {INGREDIENTS.map((seed, i) => {
            const pos = getSeedPosition(i);
            const showImage = seed.image && !broken.has(i);

            return (
              <div
                key={seed.name}
                className={styles.seed}
                style={
                  {
                    left: pos.left,
                    top: pos.top,
                    '--seed-accent': seed.accent,
                    ...(seed.zoom !== undefined && { '--seed-zoom': seed.zoom }),
                  } as React.CSSProperties
                }
              >
                <div className={styles.seedCircle}>
                  {showImage ? (
                    <img
                      src={seed.image!}
                      alt={seed.name}
                      className={styles.seedImg}
                      loading="lazy"
                      onError={() => onImgError(i)}
                    />
                  ) : (
                    <span className={styles.seedInitial}>{seed.initial}</span>
                  )}
                </div>
                <span className={styles.seedName}>{seed.name}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
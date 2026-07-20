'use client';

/**
 * SeedBadge — Client Component
 *
 * Handles per-ingredient image load errors (the only reason IngredientsOrbit
 * previously needed 'use client'). The orbit structure, rings, and layout
 * are all server-rendered; only this small badge component ships client JS.
 */

import { useState, useCallback } from 'react';
import styles from './IngredientsOrbit.module.css';

interface SeedBadgeProps {
  name: string;
  image: string;
  accent: string;
  initial: string;
  zoom?: number;
  left: string;
  top: string;
}

export default function SeedBadge({ name, image, accent, initial, zoom, left, top }: SeedBadgeProps) {
  const [broken, setBroken] = useState(false);

  const onError = useCallback(() => setBroken(true), []);

  const showImage = image && !broken;

  return (
    <div
      className={styles.seed}
      style={
        {
          left,
          top,
          '--seed-accent': accent,
          ...(zoom !== undefined && { '--seed-zoom': zoom }),
        } as React.CSSProperties
      }
    >
      <div className={styles.seedCircle}>
        {showImage ? (
          <img
            src={image}
            alt={name}
            className={styles.seedImg}
            loading="lazy"
            onError={onError}
          />
        ) : (
          <span className={styles.seedInitial}>{initial}</span>
        )}
      </div>
      <span className={styles.seedName}>{name}</span>
    </div>
  );
}

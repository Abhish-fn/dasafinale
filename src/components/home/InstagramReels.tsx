'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { reels, CLOUD_NAME } from './reelsConfig';
import styles from './InstagramReels.module.css';

/**
 * Build the Cloudinary video URL from a public_id.
 * Uses auto quality + auto format for optimal delivery.
 */
function cloudinaryVideoUrl(publicId: string): string {
  return `https://res.cloudinary.com/${CLOUD_NAME}/video/upload/q_auto,f_auto/${publicId}.mp4`;
}

/**
 * Individual reel card — renders a <video> that autoplays muted and loops.
 */
function ReelCard({
  reel,
}: {
  reel: (typeof reels)[number];
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // IntersectionObserver: play only when visible, pause when off-screen
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {
            /* autoplay blocked — silently ignore */
          });
        } else {
          video.pause();
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  const videoSrc = cloudinaryVideoUrl(reel.cloudinaryId);

  return (
    <div className={styles.reelCard}>
      {/* Video background */}
      <video
        ref={videoRef}
        className={styles.reelVideo}
        src={videoSrc}
        muted
        loop
        playsInline
        preload="metadata"
        aria-label={reel.title}
      />

      {/* Gradient overlay */}
      <div className={styles.reelOverlay} />

      {/* Play indicator on hover */}
      <div className={styles.reelPlayIndicator}>
        <svg className={styles.reelPlayIcon} viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z" />
        </svg>
      </div>

      {/* Content */}
      <div className={styles.reelContent}>
        <span className={styles.reelTag}>{reel.tag}</span>
        <h3 className={styles.reelTitle}>{reel.title}</h3>
        <div className={styles.reelFooter}>
          <a
            href={reel.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.reelExplore}
          >
            Explore Now →
          </a>
          {reel.shopUrl && (
            <Link href={reel.shopUrl} className={styles.reelShopBtn}>
              Shop
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Instagram Reels section for the homepage.
 * Displays 3 reel videos from Cloudinary with autoplay/muted/loop.
 *
 * To configure reels, edit: src/components/home/reelsConfig.ts
 */
export default function InstagramReels() {
  // Don't render if no reels configured or all are still placeholder
  if (reels.length === 0) return null;

  return (
    <section className={styles.reelsSection} id="instagram-reels">
      {/* Header */}
      <div className={styles.reelsHeader}>
        <span className={styles.reelsLabel}>I N S T A G R A M</span>
        <h2 className={styles.reelsTitle}>Follow Our Stories</h2>
        <p className={styles.reelsHandle}>
          <a
            href="https://www.instagram.com/snacksbazar_/"
            target="_blank"
            rel="noopener noreferrer"
          >
            @snacksbazar_
          </a>
        </p>
        <div className={styles.reelsDivider} />
      </div>

      {/* Reel Cards Grid */}
      <div className={styles.reelsGrid}>
        {reels.map((reel) => (
          <ReelCard key={reel.cloudinaryId} reel={reel} />
        ))}
      </div>
    </section>
  );
}

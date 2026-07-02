'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { reels as staticReels, CLOUD_NAME, type ReelConfig } from './reelsConfig';
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
  reel: ReelConfig;
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
    <a
      href={reel.instagramUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={styles.reelCard}
    >
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
          <span className={styles.reelExplore}>
            Explore Now →
          </span>
          {reel.shopUrl && (
            <Link
              href={reel.shopUrl}
              className={styles.reelShopBtn}
              onClick={(e) => e.stopPropagation()}
            >
              Shop
            </Link>
          )}
        </div>
      </div>
    </a>
  );
}

/**
 * Instagram Reels section for the homepage.
 * Fetches reels from DB, falls back to static config.
 */
export default function InstagramReels() {
  const [reels, setReels] = useState<ReelConfig[]>(staticReels);

  useEffect(() => {
    async function fetchReels() {
      try {
        const res = await fetch('/api/admin/reels');
        if (!res.ok) return;
        const data = await res.json();
        if (data.reels && data.reels.length > 0) {
          setReels(data.reels.filter((r: { isActive: boolean }) => r.isActive).map((r: { cloudinaryId: string; title: string; tag: string; instagramUrl: string; shopUrl?: string }) => ({
            cloudinaryId: r.cloudinaryId,
            title: r.title,
            tag: r.tag,
            instagramUrl: r.instagramUrl,
            shopUrl: r.shopUrl,
          })));
        }
      } catch {
        // Use static fallback
      }
    }
    fetchReels();
  }, []);

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

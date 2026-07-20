'use client';

/**
 * ReelsGrid — Client Component
 *
 * Receives reel data from the server-rendered InstagramReels parent.
 * Only this thin client shell (IntersectionObserver + video play/pause) ships to the browser.
 */

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { type ReelConfig, CLOUD_NAME } from './reelsConfig';
import styles from './InstagramReels.module.css';

function cloudinaryVideoUrl(publicId: string): string {
  return `https://res.cloudinary.com/${CLOUD_NAME}/video/upload/q_auto,f_auto/${publicId}.mp4`;
}

function ReelCard({ reel }: { reel: ReelConfig }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => { /* autoplay blocked — ignore */ });
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

      <div className={styles.reelOverlay} />

      <div className={styles.reelPlayIndicator}>
        <svg className={styles.reelPlayIcon} viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z" />
        </svg>
      </div>

      <div className={styles.reelContent}>
        <span className={styles.reelTag}>{reel.tag}</span>
        <h3 className={styles.reelTitle}>{reel.title}</h3>
        <div className={styles.reelFooter}>
          <span className={styles.reelExplore}>Explore Now →</span>
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

export default function ReelsGrid({ reels }: { reels: ReelConfig[] }) {
  return (
    <div className={styles.reelsGrid}>
      {reels.map((reel) => (
        <ReelCard key={reel.cloudinaryId} reel={reel} />
      ))}
    </div>
  );
}

/**
 * InstagramReels — Server Component
 *
 * Fetches reel data directly from the DB at request/revalidation time.
 * Falls back to static config if the DB returns nothing.
 * Only the ReelsGrid client component (video play/pause) ships JS to the browser.
 */

import dbConnect from '@/lib/db';
import Reel from '@/models/Reel';
import { reels as staticReels, type ReelConfig } from './reelsConfig';
import ReelsGrid from './ReelsGrid';
import styles from './InstagramReels.module.css';

async function getReels(): Promise<ReelConfig[]> {
  try {
    await dbConnect();
    const dbReels = await Reel.find({ isActive: true })
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();

    if (dbReels.length > 0) {
      return dbReels.map((r) => ({
        cloudinaryId: r.cloudinaryId,
        title: r.title,
        tag: r.tag,
        instagramUrl: r.instagramUrl,
        shopUrl: r.shopUrl,
      }));
    }
  } catch {
    // fall through to static fallback
  }

  return staticReels;
}

export default async function InstagramReels() {
  const reels = await getReels();

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

      {/* Video cards — client component handles IntersectionObserver */}
      <ReelsGrid reels={reels} />
    </section>
  );
}

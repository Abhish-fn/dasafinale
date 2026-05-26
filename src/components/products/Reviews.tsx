'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { useToast } from '@/components/ui/Toast';
import styles from './Reviews.module.css';

interface Review {
  _id: string;
  userName: string;
  userImage?: string;
  rating: number;
  title: string;
  comment: string;
  isVerifiedPurchase: boolean;
  createdAt: string;
}

interface ReviewStats {
  total: number;
  avgRating: number;
  distribution: number[];
}

function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <span className={styles.reviewStars}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} style={{ fontSize: size, opacity: i <= rating ? 1 : 0.3 }}>★</span>
      ))}
    </span>
  );
}

export default function ProductReviews({ productId }: { productId: string }) {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats>({ total: 0, avgRating: 0, distribution: [0, 0, 0, 0, 0] });
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/reviews?productId=${productId}`)
      .then((r) => r.json())
      .then((data) => {
        setReviews(data.reviews || []);
        if (data.stats) setStats(data.stats);
      })
      .catch(console.error);
  }, [productId]);

  const handleSubmit = async () => {
    if (!title.trim() || !comment.trim()) {
      toast('Please fill in all fields', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, rating, title, comment }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast('Review submitted!', 'success');
      setShowForm(false);
      setTitle('');
      setComment('');
      setRating(5);
      // Re-fetch
      const refreshRes = await fetch(`/api/reviews?productId=${productId}`);
      const refreshData = await refreshRes.json();
      setReviews(refreshData.reviews || []);
      if (refreshData.stats) setStats(refreshData.stats);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to submit', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.reviewsSection}>
      <h2 className={styles.reviewsTitle}>Reviews & Ratings</h2>

      {stats.total > 0 && (
        <div className={styles.reviewStats}>
          <div className={styles.ratingBig}>
            <div className={styles.ratingNumber}>{stats.avgRating}</div>
            <div className={styles.ratingStars}><Stars rating={Math.round(stats.avgRating)} size={18} /></div>
            <div className={styles.ratingCount}>{stats.total} review{stats.total !== 1 ? 's' : ''}</div>
          </div>
          <div className={styles.distribution}>
            {[5, 4, 3, 2, 1].map((star) => {
              const count = stats.distribution[star - 1];
              const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
              return (
                <div key={star} className={styles.distRow}>
                  <span className={styles.distLabel}>{star}</span>
                  <span style={{ fontSize: 12 }}>★</span>
                  <div className={styles.distBar}>
                    <div className={styles.distFill} style={{ width: `${pct}%` }} />
                  </div>
                  <span className={styles.distCount}>{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {session?.user && !showForm && (
        <button className={styles.writeBtn} onClick={() => setShowForm(true)}>
          ✏️ Write a Review
        </button>
      )}

      {showForm && (
        <div className={styles.formCard}>
          <h3 className={styles.formTitle}>Write your review</h3>
          <div className={styles.starPicker}>
            {[1, 2, 3, 4, 5].map((i) => (
              <button key={i} className={styles.starBtn} onClick={() => setRating(i)}
                style={{ color: i <= rating ? '#f59e0b' : '#d6d3d1' }}>
                ★
              </button>
            ))}
          </div>
          <input
            className={styles.formInput}
            placeholder="Review title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
          />
          <textarea
            className={styles.formInput}
            placeholder="Share your experience..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            maxLength={1000}
            style={{ resize: 'vertical' }}
          />
          <div className={styles.formActions}>
            <button className={styles.cancelBtn} onClick={() => setShowForm(false)}>Cancel</button>
            <button className={styles.submitBtn} onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        </div>
      )}

      {reviews.length === 0 ? (
        <div className={styles.emptyReviews}>
          <p>No reviews yet. Be the first to review this product!</p>
        </div>
      ) : (
        <div className={styles.reviewList}>
          {reviews.map((review) => (
            <div key={review._id} className={styles.reviewCard}>
              <div className={styles.reviewHeader}>
                <div className={styles.reviewAvatar}>
                  {review.userImage ? (
                    <Image src={review.userImage} alt="" fill sizes="36px" />
                  ) : (
                    <span className={styles.reviewAvatarLetter}>
                      {review.userName.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className={styles.reviewMeta}>
                  <div className={styles.reviewName}>
                    {review.userName}
                    {review.isVerifiedPurchase && (
                      <span className={styles.verifiedBadge}>✓ Verified</span>
                    )}
                  </div>
                  <div className={styles.reviewDate}>
                    {new Date(review.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                </div>
                <Stars rating={review.rating} />
              </div>
              <div className={styles.reviewTitle}>{review.title}</div>
              <div className={styles.reviewComment}>{review.comment}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

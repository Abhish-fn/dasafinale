'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { useToast } from '@/components/ui/Toast';
import styles from '../admin.module.css';

interface Banner {
  _id: string;
  imageUrl: string;
  altText: string;
  isActive: boolean;
  createdAt: string;
}

interface Reel {
  _id: string;
  cloudinaryId: string;
  title: string;
  tag: string;
  instagramUrl: string;
  shopUrl?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? 'dzbjefwms';

export default function AdminContentPage() {
  const { toast } = useToast();

  // --- Banner State ---
  const [banners, setBanners] = useState<Banner[]>([]);
  const [bannerLoading, setBannerLoading] = useState(true);
  const [bannerUploading, setBannerUploading] = useState(false);

  const bannerFileRef = useRef<HTMLInputElement>(null);

  // --- Reel State ---
  const [reels, setReels] = useState<Reel[]>([]);
  const [reelLoading, setReelLoading] = useState(true);
  const [reelUploading, setReelUploading] = useState(false);
  const [reelSaving, setReelSaving] = useState(false);
  const [reelTitle, setReelTitle] = useState('');
  const [reelTag, setReelTag] = useState('LIVE COMMERCE');
  const [reelInstagramUrl, setReelInstagramUrl] = useState('');
  const [reelShopUrl, setReelShopUrl] = useState('');
  const [reelCloudinaryId, setReelCloudinaryId] = useState('');
  const [reelVideoPreview, setReelVideoPreview] = useState('');
  const reelFileRef = useRef<HTMLInputElement>(null);

  // --- Fetch ---
  const fetchBanners = useCallback(async () => {
    setBannerLoading(true);
    try {
      const res = await fetch('/api/admin/banners');
      const data = await res.json();
      setBanners(data.banners || []);
    } catch { /* empty */ } finally { setBannerLoading(false); }
  }, []);

  const fetchReels = useCallback(async () => {
    setReelLoading(true);
    try {
      const res = await fetch('/api/admin/reels');
      const data = await res.json();
      setReels(data.reels || []);
    } catch { /* empty */ } finally { setReelLoading(false); }
  }, []);

  useEffect(() => { fetchBanners(); fetchReels(); }, [fetchBanners, fetchReels]);

  // --- Banner Upload ---
  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBannerUploading(true);
    try {
      // 1. Upload image to Cloudinary
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await fetch('/api/upload/banner', { method: 'POST', body: formData });
      if (!uploadRes.ok) {
        if (uploadRes.status === 413) throw new Error('File too large for server. Ask your developer to increase nginx client_max_body_size.');
        let errMsg = 'Upload failed';
        try { const d = await uploadRes.json(); errMsg = d.error || errMsg; } catch { /* HTML response */ }
        throw new Error(errMsg);
      }
      const uploadData = await uploadRes.json();

      // 2. Save banner to DB
      const res = await fetch('/api/admin/banners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: uploadData.url }),
      });
      if (!res.ok) throw new Error('Failed to save banner');

      toast('Banner updated!', 'success');

      fetchBanners();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to upload banner', 'error');
    } finally {
      setBannerUploading(false);
      if (bannerFileRef.current) bannerFileRef.current.value = '';
    }
  };

  const handleDeleteBanner = async (id: string) => {
    if (!confirm('Delete this banner?')) return;
    try {
      await fetch(`/api/admin/banners?id=${id}`, { method: 'DELETE' });
      toast('Banner deleted', 'success');
      fetchBanners();
    } catch {
      toast('Failed to delete', 'error');
    }
  };

  // --- Reel Video Upload ---
  const handleReelVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setReelUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload/video', { method: 'POST', body: formData });
      if (!res.ok) {
        if (res.status === 413) throw new Error('Video too large for server. Ask your developer to increase nginx client_max_body_size.');
        let errMsg = 'Upload failed';
        try { const d = await res.json(); errMsg = d.error || errMsg; } catch { /* HTML response from nginx */ }
        throw new Error(errMsg);
      }
      const data = await res.json();
      setReelCloudinaryId(data.publicId);
      setReelVideoPreview(`https://res.cloudinary.com/${CLOUD_NAME}/video/upload/q_auto,f_auto/${data.publicId}.mp4`);
      toast('Video uploaded! Fill in the details below.', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to upload video', 'error');
    } finally {
      setReelUploading(false);
      if (reelFileRef.current) reelFileRef.current.value = '';
    }
  };

  const handleSaveReel = async () => {
    if (!reelCloudinaryId) { toast('Upload a video first', 'error'); return; }
    if (!reelTitle.trim()) { toast('Title is required', 'error'); return; }
    if (!reelInstagramUrl.trim()) { toast('Instagram URL is required', 'error'); return; }

    setReelSaving(true);
    try {
      const res = await fetch('/api/admin/reels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cloudinaryId: reelCloudinaryId,
          title: reelTitle,
          tag: reelTag || 'LIVE COMMERCE',
          instagramUrl: reelInstagramUrl,
          shopUrl: reelShopUrl ? `/products/${reelShopUrl.trim()}` : undefined,
        }),
      });
      if (!res.ok) throw new Error('Failed to save reel');

      toast('Reel added!', 'success');
      setReelTitle('');
      setReelTag('LIVE COMMERCE');
      setReelInstagramUrl('');
      setReelShopUrl('');
      setReelCloudinaryId('');
      setReelVideoPreview('');
      fetchReels();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to save reel', 'error');
    } finally {
      setReelSaving(false);
    }
  };

  const handleDeleteReel = async (id: string) => {
    if (!confirm('Delete this reel?')) return;
    try {
      await fetch(`/api/admin/reels?id=${id}`, { method: 'DELETE' });
      toast('Reel deleted', 'success');
      fetchReels();
    } catch {
      toast('Failed to delete', 'error');
    }
  };

  const activeBanner = banners.find(b => b.isActive);

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-2xl)', fontWeight: 700, marginBottom: 'var(--space-6)' }}>
        Content Manager
      </h1>

      {/* ===== BANNER SECTION ===== */}
      <div className={styles.sectionCard} style={{ marginBottom: 'var(--space-8)' }}>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-lg)', fontWeight: 600, marginBottom: 'var(--space-4)', color: 'var(--red)' }}>
          🖼️ Hero Banner
        </h2>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)', marginBottom: 'var(--space-4)' }}>
          Upload a new banner image. The latest upload becomes the active banner on the homepage.
        </p>

        {/* Current Active Banner */}
        {activeBanner && (
          <div style={{ marginBottom: 'var(--space-4)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '2px solid rgba(198, 40, 40,0.2)', position: 'relative', aspectRatio: '16/5' }}>
            <Image src={activeBanner.imageUrl} alt={activeBanner.altText} fill sizes="100vw" style={{ objectFit: 'cover' }} />
            <div style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(34,197,94,0.9)', color: 'white', fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--radius-sm)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Active
            </div>
            <button
              onClick={() => handleDeleteBanner(activeBanner._id)}
              style={{
                position: 'absolute', top: 8, right: 8,
                background: 'rgba(239,68,68,0.9)', color: 'white', border: 'none',
                borderRadius: 'var(--radius-full)', width: 28, height: 28,
                cursor: 'pointer', fontSize: '14px', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#dc2626'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.9)'; }}
              title="Delete active banner (will revert to default)"
            >
              ×
            </button>
          </div>
        )}

        {/* Upload Button */}
        <button
          onClick={() => bannerFileRef.current?.click()}
          disabled={bannerUploading}
          style={{
            width: '100%',
            padding: 'var(--space-6)',
            border: '2px dashed var(--color-gray-300)',
            borderRadius: 'var(--radius-lg)',
            background: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 'var(--space-2)',
            color: 'var(--color-gray-500)',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--maroon)'; e.currentTarget.style.color = 'var(--maroon)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-gray-300)'; e.currentTarget.style.color = 'var(--color-gray-500)'; }}
        >
          {bannerUploading ? (
            <>
              <span className={styles.spinner} />
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>Uploading banner...</span>
              <span style={{ fontSize: 'var(--text-xs)' }}>Please wait</span>
            </>
          ) : (
            <>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>Upload New Banner</span>
              <span style={{ fontSize: 'var(--text-xs)' }}>JPEG, PNG, WebP — Max 5MB</span>
            </>
          )}
        </button>
        <input
          ref={bannerFileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          style={{ display: 'none' }}
          onChange={handleBannerUpload}
        />

        {/* Banner History */}
        {banners.length > 1 && (
          <div style={{ marginTop: 'var(--space-5)' }}>
            <label className={styles.formLabel} style={{ marginBottom: 'var(--space-3)' }}>Previous Banners</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--space-3)' }}>
              {banners.filter(b => !b.isActive).map((banner) => (
                <div key={banner._id} style={{ position: 'relative', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--color-gray-200)', aspectRatio: '16/9' }}>
                  <Image src={banner.imageUrl} alt={banner.altText} fill sizes="200px" style={{ objectFit: 'cover' }} />
                  <button
                    onClick={() => handleDeleteBanner(banner._id)}
                    style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(239,68,68,0.9)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', width: 24, height: 24, cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}
                  >
                    ×
                  </button>
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.6)', color: 'white', fontSize: '10px', padding: '4px 8px' }}>
                    {new Date(banner.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ===== REELS SECTION ===== */}
      <div className={styles.sectionCard}>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-lg)', fontWeight: 600, marginBottom: 'var(--space-4)', color: 'var(--red)' }}>
          🎬 Instagram Reels
        </h2>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)', marginBottom: 'var(--space-4)' }}>
          Upload videos and link them to Instagram. These appear on the homepage.
        </p>

        {/* Add New Reel Form */}
        <div style={{
          padding: 'var(--space-5)',
          background: 'rgba(198, 40, 40,0.03)',
          border: '1.5px dashed rgba(198, 40, 40,0.2)',
          borderRadius: 'var(--radius-xl)',
          marginBottom: 'var(--space-6)',
        }}>
          <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--red)', marginBottom: 'var(--space-4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            ✨ Add New Reel
          </h3>

          {/* Video Upload */}
          <div style={{ marginBottom: 'var(--space-4)' }}>
            {reelVideoPreview ? (
              <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div style={{ width: 160, aspectRatio: '9/16', borderRadius: 'var(--radius-lg)', overflow: 'hidden', position: 'relative', background: 'black', flexShrink: 0 }}>
                  <video
                    src={reelVideoPreview}
                    muted
                    loop
                    autoPlay
                    playsInline
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(34,197,94,0.9)', color: 'white', fontSize: '9px', fontWeight: 700, padding: '2px 6px', borderRadius: 'var(--radius-sm)' }}>
                    ✓ Uploaded
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-500)', marginBottom: 'var(--space-1)' }}>Cloudinary ID</div>
                  <code style={{ fontSize: 'var(--text-xs)', background: 'var(--color-gray-100)', padding: '4px 8px', borderRadius: 'var(--radius-sm)', display: 'block', wordBreak: 'break-all' }}>
                    {reelCloudinaryId}
                  </code>
                </div>
              </div>
            ) : (
              <button
                onClick={() => reelFileRef.current?.click()}
                disabled={reelUploading}
                style={{
                  width: '100%',
                  padding: 'var(--space-6)',
                  border: '2px dashed var(--color-gray-300)',
                  borderRadius: 'var(--radius-lg)',
                  background: 'transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  color: 'var(--color-gray-500)',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--red)'; e.currentTarget.style.color = 'var(--red)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-gray-300)'; e.currentTarget.style.color = 'var(--color-gray-500)'; }}
              >
                {reelUploading ? (
                  <>
                    <span className={styles.spinner} />
                    <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>Uploading video...</span>
                    <span style={{ fontSize: 'var(--text-xs)' }}>This may take a moment for large files</span>
                  </>
                ) : (
                  <>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                    </svg>
                    <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>Upload Video</span>
                    <span style={{ fontSize: 'var(--text-xs)' }}>MP4, WebM, MOV — Max 100MB</span>
                  </>
                )}
              </button>
            )}
            <input
              ref={reelFileRef}
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              style={{ display: 'none' }}
              onChange={handleReelVideoUpload}
            />
          </div>

          {/* Reel Details */}
          <div className={styles.formRow}>
            <div className={styles.formGroup} style={{ flex: '2 1 200px' }}>
              <label className={styles.formLabel}>Title *</label>
              <input className={styles.formInput} value={reelTitle} onChange={(e) => setReelTitle(e.target.value)} placeholder="e.g. Clay Pot Roasted Snacks 🌾🔥" />
            </div>
            <div className={styles.formGroup} style={{ flex: '1 1 120px' }}>
              <label className={styles.formLabel}>Tag</label>
              <input className={styles.formInput} value={reelTag} onChange={(e) => setReelTag(e.target.value)} placeholder="LIVE COMMERCE" />
            </div>
          </div>

          <div className={styles.formRow} style={{ marginTop: 'var(--space-3)' }}>
            <div className={styles.formGroup} style={{ flex: '1 1 200px' }}>
              <label className={styles.formLabel}>Instagram URL *</label>
              <input className={styles.formInput} value={reelInstagramUrl} onChange={(e) => setReelInstagramUrl(e.target.value)} placeholder="https://www.instagram.com/reel/..." />
            </div>
            <div className={styles.formGroup} style={{ flex: '1 1 200px' }}>
              <label className={styles.formLabel}>Product ID</label>
              <input className={styles.formInput} value={reelShopUrl} onChange={(e) => setReelShopUrl(e.target.value)} placeholder="e.g. CPS001" />
            </div>
          </div>

          <button
            className={`${styles.actionBtn} ${styles.actionPrimary}`}
            style={{ marginTop: 'var(--space-4)', padding: 'var(--space-3) var(--space-6)' }}
            onClick={handleSaveReel}
            disabled={reelSaving || !reelCloudinaryId}
          >
            {reelSaving ? 'Saving...' : '🎬 Add Reel'}
          </button>
        </div>

        {/* Existing Reels */}
        {reelLoading ? (
          <div className={styles.empty}>Loading reels...</div>
        ) : reels.length === 0 ? (
          <div className={styles.empty}>No reels yet. Upload your first one above!</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 'var(--space-4)' }}>
            {reels.map((reel) => (
              <div key={reel._id} style={{
                borderRadius: 'var(--radius-xl)',
                overflow: 'hidden',
                border: '1px solid var(--color-gray-200)',
                background: 'white',
                position: 'relative',
              }}>
                {/* Video Thumbnail */}
                <div style={{ aspectRatio: '9/16', background: 'black', position: 'relative' }}>
                  <video
                    src={`https://res.cloudinary.com/${CLOUD_NAME}/video/upload/q_auto,f_auto/${reel.cloudinaryId}.mp4`}
                    muted
                    loop
                    playsInline
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onMouseEnter={(e) => (e.target as HTMLVideoElement).play()}
                    onMouseLeave={(e) => { (e.target as HTMLVideoElement).pause(); (e.target as HTMLVideoElement).currentTime = 0; }}
                  />
                  <button
                    onClick={() => handleDeleteReel(reel._id)}
                    style={{
                      position: 'absolute', top: 6, right: 6,
                      background: 'rgba(239,68,68,0.9)', color: 'white', border: 'none',
                      borderRadius: 'var(--radius-full)', width: 26, height: 26,
                      cursor: 'pointer', fontSize: '13px', fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    ×
                  </button>
                </div>
                {/* Info */}
                <div style={{ padding: 'var(--space-3)' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
                    {reel.tag}
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, lineHeight: 1.3, marginBottom: 'var(--space-2)' }}>
                    {reel.title}
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                    <a
                      href={reel.instagramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: '10px', color: 'var(--color-primary-600)', fontWeight: 600 }}
                    >
                      📷 Instagram
                    </a>
                    {reel.shopUrl && (
                      <span style={{ fontSize: '10px', color: 'var(--color-gray-400)' }}>
                        🛍️ {reel.shopUrl}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

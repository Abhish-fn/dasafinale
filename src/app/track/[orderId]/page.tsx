'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { formatPrice } from '@/lib/utils';
import styles from '../track.module.css';

// ---------------------------------------------------------------------------
// Feature flag — instant rollback via env var, no code revert needed
// ---------------------------------------------------------------------------

if (process.env.NEXT_PUBLIC_TRACK_PAGE_ENABLED !== 'true') {
  redirect('/orders');
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TrackingResponse {
  tracking: {
    status: string;
    scans: { status: string; statusDateTime: string; location: string; instructions: string }[];
    expectedDelivery: string | null;
    currentLocation: string | null;
    waybill: string;
  } | null;
  fallback: { status: string; timestamp: string; note?: string; location?: string }[];
  status: string;
  degraded?: boolean;
}

interface OrderData {
  orderId: string;
  status: string;
  items: {
    productSnapshot: { title: string; image: string; price: number; packagingSize: string; productId: string };
    quantity: number;
    priceAtOrder: number;
  }[];
  tracking?: {
    carrier?: string;
    trackingUrl?: string;
    estimatedDelivery?: string;
    waybill?: string;
    statusHistory?: { status: string; timestamp: string; note?: string; location?: string }[];
  };
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BASE_INTERVAL = 60_000; // 60s — matches API cache TTL
const MAX_INTERVAL = 480_000; // 8 min cap
const MAX_FAILURES = 5; // circuit breaker threshold

const STATUS_STEPS = ['confirmed', 'packed', 'shipped', 'out_for_delivery', 'delivered'] as const;

const statusMap: Record<string, string> = {
  placed: 'statusPlaced',
  confirmed: 'statusConfirmed',
  packed: 'statusPacked',
  shipped: 'statusShipped',
  out_for_delivery: 'statusOut_for_delivery',
  delivered: 'statusDelivered',
  cancelled: 'statusCancelled',
};

const statusLabels: Record<string, string> = {
  placed: 'Order Placed',
  confirmed: 'Confirmed',
  packed: 'Packed',
  shipped: 'Shipped',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatTimestamp(ts: string): string {
  return new Date(ts).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TrackOrderPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const orderId = params.orderId as string;

  // Core state
  const [order, setOrder] = useState<OrderData | null>(null);
  const [orderLoading, setOrderLoading] = useState(true);
  const [orderError, setOrderError] = useState(false);

  // Tracking state
  const [trackingData, setTrackingData] = useState<TrackingResponse | null>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingDegraded, setTrackingDegraded] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null);
  const [circuitOpen, setCircuitOpen] = useState(false);
  const [retrying, setRetrying] = useState(false);

  // Clipboard
  const [copied, setCopied] = useState(false);

  // Polling refs (don't cause re-renders)
  const failCountRef = useRef(0);
  const intervalRef = useRef(BASE_INTERVAL);
  const timerIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // ---------------------------------------------------------------------------
  // Phase 1: Fetch order data (once)
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!session?.user) return;

    const controller = new AbortController();

    fetch(`/api/orders/${orderId}`, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json();
      })
      .then((d) => {
        if (d.order) {
          setOrder(d.order);
        } else {
          setOrderError(true);
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setOrderError(true);
      })
      .finally(() => setOrderLoading(false));

    return () => controller.abort();
  }, [session?.user, orderId]);

  // ---------------------------------------------------------------------------
  // Phase 2: Fetch tracking data (polls)
  // ---------------------------------------------------------------------------

  const fetchTracking = useCallback(async () => {
    if (!order) return;

    // Terminal states — never poll
    if (['delivered', 'cancelled'].includes(order.status)) return;

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setTrackingLoading(true);

    try {
      const res = await fetch(`/api/orders/${orderId}/track`, {
        signal: controller.signal,
      });

      if (!res.ok) throw new Error(`${res.status}`);

      const data: TrackingResponse = await res.json();
      setTrackingData(data);
      setLastCheckedAt(new Date().toISOString());

      if (data.degraded) {
        // Delhivery unreachable — count as failure for backoff
        failCountRef.current += 1;
        intervalRef.current = Math.min(intervalRef.current * 2, MAX_INTERVAL);
        setTrackingDegraded(true);

        if (failCountRef.current >= MAX_FAILURES) {
          setCircuitOpen(true);
        }
      } else {
        // Success — reset backoff
        failCountRef.current = 0;
        intervalRef.current = BASE_INTERVAL;
        setTrackingDegraded(false);
        setCircuitOpen(false);
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;

      failCountRef.current += 1;
      intervalRef.current = Math.min(intervalRef.current * 2, MAX_INTERVAL);
      setTrackingDegraded(true);
      setLastCheckedAt(new Date().toISOString());

      if (failCountRef.current >= MAX_FAILURES) {
        setCircuitOpen(true);
      }
    } finally {
      setTrackingLoading(false);
    }
  }, [order, orderId]);

  // ---------------------------------------------------------------------------
  // Polling lifecycle: visibility-aware, backoff, circuit breaker
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!order) return;

    // Terminal states — never poll
    if (['delivered', 'cancelled'].includes(order.status)) {
      // Still fetch once for delivered orders to show final state
      fetchTracking();
      return;
    }

    // Initial fetch
    fetchTracking();

    const startPolling = () => {
      stopPolling();
      if (circuitOpen) return; // circuit breaker — stop polling
      timerIdRef.current = setTimeout(() => {
        fetchTracking().then(startPolling);
      }, intervalRef.current);
    };

    const stopPolling = () => {
      if (timerIdRef.current) {
        clearTimeout(timerIdRef.current);
        timerIdRef.current = null;
      }
    };

    const handleVisibility = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        // Tab regained focus — fetch immediately, then resume polling
        fetchTracking().then(startPolling);
      }
    };

    startPolling();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      stopPolling();
      abortControllerRef.current?.abort();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [order, fetchTracking, circuitOpen]);

  // ---------------------------------------------------------------------------
  // Manual retry (resets circuit breaker)
  // ---------------------------------------------------------------------------

  const handleRetry = async () => {
    setRetrying(true);
    failCountRef.current = 0;
    intervalRef.current = BASE_INTERVAL;
    setCircuitOpen(false);
    await fetchTracking();
    setRetrying(false);
  };

  // ---------------------------------------------------------------------------
  // Clipboard
  // ---------------------------------------------------------------------------

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ---------------------------------------------------------------------------
  // Derive display state
  // ---------------------------------------------------------------------------

  const waybill = order?.tracking?.waybill;
  const hasWaybill = waybill && waybill !== 'PENDING';
  const liveTracking = trackingData?.tracking;
  const fallbackHistory = trackingData?.fallback || order?.tracking?.statusHistory || [];
  const displayStatus = trackingData?.status || order?.status || 'placed';
  const isTerminal = ['delivered', 'cancelled'].includes(displayStatus);
  const currentStepIdx = STATUS_STEPS.indexOf(displayStatus as typeof STATUS_STEPS[number]);

  // ---------------------------------------------------------------------------
  // Loading skeleton
  // ---------------------------------------------------------------------------

  if (orderLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.backLink}>← Back to Orders</div>
        <div className={styles.skeleton}>
          <div className={styles.skeletonHero}>
            <div className={styles.skeletonLineLg} />
            <div className={styles.skeletonLine} style={{ width: '45%' }} />
            <div className={styles.skeletonLineSm} />
          </div>
          <div className={styles.skeletonProgress}>
            {STATUS_STEPS.map((s) => (
              <div key={s} className={styles.skeletonDot} />
            ))}
          </div>
          <div className={styles.skeletonLine} />
          <div className={styles.skeletonLine} style={{ width: '70%' }} />
          <div className={styles.skeletonLine} style={{ width: '55%' }} />
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Error state
  // ---------------------------------------------------------------------------

  if (orderError || !order) {
    return (
      <div className={styles.container}>
        <Link href="/orders" className={styles.backLink}>← Back to Orders</Link>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🔍</div>
          <h1 className={styles.emptyTitle}>Order not found</h1>
          <p className={styles.emptyText}>
            This order doesn&apos;t exist or you don&apos;t have access to it.
          </p>
          <Link href="/orders" className={styles.shopBtn}>View All Orders</Link>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className={styles.container}>
      <Link href="/orders" className={styles.backLink}>← Back to Orders</Link>

      {/* Hero Section */}
      <section className={styles.heroSection}>
        <div className={styles.heroHeader}>
          <div className={styles.heroStatusGroup}>
            <h1 className={styles.heroStatus}>
              {statusLabels[displayStatus] || displayStatus.replace(/_/g, ' ')}
            </h1>
            <span
              className={`${styles.heroBadge} ${styles[statusMap[displayStatus] || 'statusPlaced']}`}
              aria-label={`Order status: ${statusLabels[displayStatus] || displayStatus}`}
            >
              {statusLabels[displayStatus] || displayStatus.replace(/_/g, ' ')}
            </span>
          </div>
          <div className={styles.heroMeta}>
            <span className={styles.heroOrderId}>{order.orderId}</span>
            <span className={styles.heroDate}>
              {new Date(order.createdAt).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </span>
          </div>
        </div>

        {/* Carrier Info */}
        {hasWaybill && (
          <div className={styles.carrierInfo}>
            <span className={styles.carrierName}>
              📦 {order.tracking?.carrier || 'Delhivery'}
            </span>
            <span className={styles.waybillCode}>
              AWB: {waybill}
              <button
                className={styles.copyBtn}
                onClick={() => handleCopy(waybill!)}
                aria-label="Copy waybill number"
              >
                {copied ? '✓' : '📋'}
              </button>
              {copied && <span className={styles.copiedFeedback}>Copied!</span>}
            </span>
            {order.tracking?.trackingUrl && (
              <a
                href={order.tracking.trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.trackLink}
              >
                Track on Delhivery →
              </a>
            )}
          </div>
        )}

        {/* Estimated delivery */}
        {(liveTracking?.expectedDelivery || order.tracking?.estimatedDelivery) && (
          <div className={styles.estimatedDelivery}>
            📅 Expected delivery:{' '}
            {new Date(
              liveTracking?.expectedDelivery || order.tracking!.estimatedDelivery!
            ).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </div>
        )}

        {/* Current location */}
        {liveTracking?.currentLocation && (
          <div className={styles.currentLocation}>
            📍 Currently at: <strong>{liveTracking.currentLocation}</strong>
          </div>
        )}
      </section>

      {/* Degraded Notice */}
      {trackingDegraded && (
        <div className={styles.degradedNotice} role="alert">
          <span className={styles.degradedIcon}>⚠️</span>
          <div className={styles.degradedContent}>
            <p className={styles.degradedText}>
              We&apos;re having trouble reaching the carrier — here&apos;s your last known status.
            </p>
            <div className={styles.degradedMeta}>
              {lastCheckedAt && (
                <span className={styles.lastChecked}>
                  Last checked: {timeAgo(lastCheckedAt)}
                </span>
              )}
              <button
                className={styles.retryButton}
                onClick={handleRetry}
                disabled={retrying}
                aria-label="Retry tracking fetch"
              >
                {retrying ? (
                  <span className={styles.retrySpinner} />
                ) : (
                  '↻'
                )}{' '}
                Retry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* No waybill state */}
      {!hasWaybill && !isTerminal && (
        <div className={styles.degradedNotice} style={{ borderColor: 'rgba(59, 130, 246, 0.25)', background: 'rgba(59, 130, 246, 0.06)' }}>
          <span className={styles.degradedIcon}>📦</span>
          <div className={styles.degradedContent}>
            <p className={styles.degradedText} style={{ color: '#1e40af' }}>
              Your order is being prepared for shipment. We&apos;ll update tracking once it&apos;s picked up.
            </p>
          </div>
        </div>
      )}

      {/* Progress Bar */}
      {displayStatus !== 'cancelled' && (
        <section className={styles.progressSection}>
          <h2 className={styles.sectionTitle}>Shipment Progress</h2>
          <div
            className={styles.progressBar}
            role="progressbar"
            aria-valuenow={Math.max(0, currentStepIdx + 1)}
            aria-valuemin={0}
            aria-valuemax={STATUS_STEPS.length}
            aria-label={`Shipment progress: ${statusLabels[displayStatus] || displayStatus}`}
          >
            {STATUS_STEPS.map((step, i) => {
              const isCompleted = i <= currentStepIdx;
              const isActive = i === currentStepIdx;
              return (
                <div key={step} className={styles.progressStep}>
                  <div
                    className={`${styles.progressDot} ${isCompleted ? styles.progressDotCompleted : ''} ${isActive ? styles.progressDotActive : ''}`}
                    aria-hidden="true"
                  >
                    {isCompleted && !isActive ? '✓' : i + 1}
                  </div>
                  {i < STATUS_STEPS.length - 1 && (
                    <div
                      className={`${styles.progressLine} ${i < currentStepIdx ? styles.progressLineCompleted : ''}`}
                      aria-hidden="true"
                    />
                  )}
                  <div className={styles.progressLabel}>
                    {step.replace(/_/g, ' ')}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Tracking Timeline — live region for screen reader updates */}
      <section className={styles.timelineSection} aria-live="polite" aria-atomic="false">
        <div className={styles.timelineHeader}>
          <h2 className={styles.sectionTitle}>
            {liveTracking && !trackingDegraded ? 'Live Tracking' : 'Order Timeline'}
          </h2>
          {trackingLoading && <span className={styles.timelineRefresh}>↻</span>}
        </div>

        {/* Live scans from Delhivery */}
        {liveTracking && !trackingDegraded && liveTracking.scans.length > 0 && (
          <div className={styles.timeline}>
            {liveTracking.scans.map((scan, i) => (
              <div key={i} className={styles.timelineItem}>
                <div className={`${styles.timelineDot} ${i === 0 ? styles.timelineDotActive : ''}`} />
                <div className={styles.timelineStatus}>{scan.status}</div>
                <div className={styles.timelineTime}>
                  {scan.statusDateTime ? formatTimestamp(scan.statusDateTime) : ''}
                </div>
                {scan.location && <div className={styles.timelineNote}>📍 {scan.location}</div>}
                {scan.instructions && <div className={styles.timelineNote}>{scan.instructions}</div>}
              </div>
            ))}
          </div>
        )}

        {/* Fallback: DB statusHistory (when Delhivery unavailable or no waybill) */}
        {(!liveTracking || trackingDegraded) && fallbackHistory.length > 0 && (
          <div className={styles.timeline}>
            {[...fallbackHistory].reverse().map((entry, i) => (
              <div key={i} className={styles.timelineItem}>
                <div className={`${styles.timelineDot} ${i === 0 ? styles.timelineDotActive : ''}`} />
                <div className={styles.timelineStatus}>
                  {entry.status.replace(/_/g, ' ')}
                </div>
                <div className={styles.timelineTime}>
                  {formatTimestamp(entry.timestamp)}
                </div>
                {entry.note && <div className={styles.timelineNote}>{entry.note}</div>}
                {entry.location && <div className={styles.timelineNote}>📍 {entry.location}</div>}
              </div>
            ))}
          </div>
        )}

        {/* Empty timeline */}
        {!liveTracking && fallbackHistory.length === 0 && !trackingLoading && (
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)' }}>
            No tracking updates yet.
          </p>
        )}
      </section>

      {/* Order Summary */}
      <section className={styles.orderSummary}>
        <h2 className={styles.sectionTitle}>Order Summary</h2>
        {order.items.map((item, i) => (
          <div key={i} className={styles.summaryItem}>
            <div className={styles.summaryItemImage}>
              {item.productSnapshot.image && (
                <Image
                  src={item.productSnapshot.image}
                  alt={item.productSnapshot.title}
                  fill
                  sizes="48px"
                />
              )}
            </div>
            <div className={styles.summaryItemInfo}>
              <div className={styles.summaryItemName}>{item.productSnapshot.title}</div>
              <div className={styles.summaryItemMeta}>
                {item.productSnapshot.packagingSize} × {item.quantity}
              </div>
            </div>
            <div className={styles.summaryItemPrice}>
              {formatPrice(item.priceAtOrder * item.quantity)}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

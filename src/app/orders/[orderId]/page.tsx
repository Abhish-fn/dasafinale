'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { formatPrice } from '@/lib/utils';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/components/ui/Toast';
import styles from '../orders.module.css';

interface OrderDetail {
  orderId: string;
  status: string;
  items: {
    productSnapshot: { title: string; image: string; price: number; packagingSize: string; productId: string };
    quantity: number;
    priceAtOrder: number;
  }[];
  shippingAddress: {
    fullName: string; phone: string; addressLine1: string; addressLine2: string;
    city: string; state: string; pincode: string;
  };
  pricing: {
    subtotal: number; discount: number; shippingFee: number; total: number;
    gst?: { basePrice: number; cgst: number; sgst: number; isIntraState: boolean };
  };
  coupon?: { code: string };
  payment: { status: string; method?: string; paidAt?: string };
  tracking?: {
    carrier?: string; trackingId?: string; trackingUrl?: string;
    estimatedDelivery?: string; waybill?: string;
    statusHistory?: { status: string; timestamp: string; note?: string; location?: string }[];
  };
  createdAt: string;
}

const statusMap: Record<string, string> = {
  placed: 'statusPlaced', confirmed: 'statusConfirmed', packed: 'statusPacked',
  shipped: 'statusShipped', out_for_delivery: 'statusOut_for_delivery',
  delivered: 'statusDelivered', cancelled: 'statusCancelled',
};

export default function OrderDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();
  const { addToCart } = useCart();
  const { toast } = useToast();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [liveTracking, setLiveTracking] = useState<{
    status: string;
    scans: { status: string; statusDateTime: string; location: string; instructions: string }[];
    expectedDelivery: string | null;
    currentLocation: string | null;
  } | null>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingDegraded, setTrackingDegraded] = useState(false);

  const BASE_INTERVAL = 60_000;
  const MAX_INTERVAL = 480_000;
  const MAX_FAILURES = 5;

  const failCountRef = useRef(0);
  const intervalMsRef = useRef(BASE_INTERVAL);
  const abortControllerRef = useRef<AbortController | null>(null);
  const pollingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isNew = searchParams.get('new') === 'true';

  useEffect(() => {
    if (!session?.user) return;
    fetch(`/api/orders/${params.orderId}`)
      .then((r) => r.json())
      .then((d) => setOrder(d.order || null))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [session?.user, params.orderId]);

  const fetchTracking = useCallback(async (waybill: string) => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setTrackingLoading(true);
    try {
      const res = await fetch(`/api/shipping/track/${waybill}`, {
        signal: controller.signal,
      });
      if (res.ok) {
        const data = await res.json();
        setLiveTracking(data);
        failCountRef.current = 0;
        intervalMsRef.current = BASE_INTERVAL;
        setTrackingDegraded(false);
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.error('Failed to fetch tracking:', err);
      failCountRef.current += 1;
      intervalMsRef.current = Math.min(intervalMsRef.current * 2, MAX_INTERVAL);
      if (failCountRef.current >= MAX_FAILURES) {
        setTrackingDegraded(true);
      }
    } finally {
      if (!controller.signal.aborted) {
        setTrackingLoading(false);
      }
    }
  }, []);

  // Fetch live tracking with polling, visibility handling, and circuit breaker
  useEffect(() => {
    if (!order?.tracking?.waybill || order.tracking.waybill === 'PENDING') return;
    const waybill = order.tracking.waybill;

    // Delivered/cancelled orders: fetch once, no polling
    const isTerminal = ['delivered', 'cancelled'].includes(order.status);
    const inTransit = ['shipped', 'out_for_delivery'].includes(order.status);

    fetchTracking(waybill);

    if (isTerminal || !inTransit) return;

    const startPolling = () => {
      stopPolling();
      if (failCountRef.current >= MAX_FAILURES) return;
      pollingTimerRef.current = setInterval(() => {
        if (failCountRef.current >= MAX_FAILURES) {
          stopPolling();
          return;
        }
        fetchTracking(waybill);
      }, intervalMsRef.current);
    };

    const stopPolling = () => {
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
        pollingTimerRef.current = null;
      }
    };

    const handleVisibility = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        fetchTracking(waybill);
        startPolling();
      }
    };

    startPolling();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      stopPolling();
      abortControllerRef.current?.abort();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [order?.tracking?.waybill, order?.status, fetchTracking]);

  const handleCancel = async () => {
    if (!order || !confirm('Are you sure you want to cancel this order?')) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/orders/${order.orderId}/cancel`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast('Order cancelled', 'success');
      setOrder({ ...order, status: 'cancelled' });
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to cancel', 'error');
    } finally {
      setCancelling(false);
    }
  };

  const handleReorder = async () => {
    if (!order) return;
    for (const item of order.items) {
      await addToCart(item.productSnapshot.productId, item.quantity);
    }
    toast('Items added to cart!', 'success');
    router.push('/cart');
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div style={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid var(--color-gray-200)', borderTopColor: 'var(--color-primary-500)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className={styles.container}>
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>🔍</div>
          <h2 className={styles.emptyTitle}>Order not found</h2>
          <Link href="/orders" className={styles.shopBtn}>View All Orders</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Link href="/orders" className={styles.backLink}>← Back to Orders</Link>

      {isNew && (
        <div className={styles.successBanner}>
          <div className={styles.successBannerTitle}>🎉 Order Placed Successfully!</div>
          <div className={styles.successBannerText}>
            Thank you for your order. You&apos;ll receive updates via email.
          </div>
        </div>
      )}

      <div className={styles.detailGrid}>
        <div>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
            <div>
              <h1 className={styles.pageTitle} style={{ marginBottom: 'var(--space-1)' }}>Order {order.orderId}</h1>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)' }}>
                Placed {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
            <span className={`${styles.statusBadge} ${styles[statusMap[order.status] || 'statusPlaced']}`} style={{ fontSize: 'var(--text-sm)', padding: 'var(--space-2) var(--space-4)' }}>
              {order.status.replace(/_/g, ' ')}
            </span>
          </div>

          {/* Items */}
          <div className={styles.detailSection}>
            <h2 className={styles.detailSectionTitle}>Items</h2>
            {order.items.map((item, i) => (
              <div key={i} className={styles.detailItem}>
                <div className={styles.detailItemImage}>
                  {item.productSnapshot.image && (
                    <Image src={item.productSnapshot.image} alt={item.productSnapshot.title} fill sizes="64px" />
                  )}
                </div>
                <div className={styles.detailItemInfo}>
                  <div className={styles.detailItemName}>{item.productSnapshot.title}</div>
                  <div className={styles.detailItemMeta}>
                    {item.productSnapshot.packagingSize} × {item.quantity}
                  </div>
                </div>
                <div className={styles.detailItemPrice}>{formatPrice(item.priceAtOrder * item.quantity)}</div>
              </div>
            ))}
          </div>

          {/* Shipment Progress Bar */}
          {order.tracking?.waybill && order.tracking.waybill !== 'PENDING' && (
            <div className={styles.detailSection}>
              <h2 className={styles.detailSectionTitle}>Shipment Progress</h2>
              <div className={styles.progressBar}>
                {['confirmed', 'packed', 'shipped', 'out_for_delivery', 'delivered'].map((step, i) => {
                  const stepOrder = ['confirmed', 'packed', 'shipped', 'out_for_delivery', 'delivered'];
                  const currentIdx = stepOrder.indexOf(order.status);
                  const isCompleted = i <= currentIdx;
                  const isActive = i === currentIdx;
                  return (
                    <div key={step} className={styles.progressStep}>
                      <div className={`${styles.progressDot} ${isCompleted ? styles.progressDotCompleted : ''} ${isActive ? styles.progressDotActive : ''}`}>
                        {isCompleted && !isActive ? '✓' : i + 1}
                      </div>
                      {i < 4 && <div className={`${styles.progressLine} ${i < currentIdx ? styles.progressLineCompleted : ''}`} />}
                      <div className={styles.progressLabel}>{step.replace(/_/g, ' ')}</div>
                    </div>
                  );
                })}
              </div>

              {/* Carrier Info */}
              <div className={styles.carrierBadge}>
                <span className={styles.carrierName}>📦 Shipped via {order.tracking.carrier || 'Delhivery'}</span>
                <span className={styles.waybillCode}>
                  AWB: {order.tracking.waybill}
                  <button
                    className={styles.copyBtn}
                    onClick={() => {
                      navigator.clipboard.writeText(order.tracking?.waybill || '');
                      toast('Waybill copied!', 'success');
                    }}
                  >
                    📋
                  </button>
                </span>
                {order.tracking.trackingUrl && (
                  <a href={order.tracking.trackingUrl} target="_blank" rel="noopener noreferrer" className={styles.trackLink}>
                    Track on Delhivery →
                  </a>
                )}
              </div>

              {order.tracking.estimatedDelivery && (
                <div className={styles.estimatedDelivery}>
                  📅 Expected delivery: {new Date(order.tracking.estimatedDelivery).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              )}
              {liveTracking?.expectedDelivery && !order.tracking.estimatedDelivery && (
                <div className={styles.estimatedDelivery}>
                  📅 Expected delivery: {new Date(liveTracking.expectedDelivery).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              )}
            </div>
          )}

          {/* Degraded tracking notice */}
          {trackingDegraded && !liveTracking && (
            <div className={styles.detailSection}>
              <div style={{
                padding: 'var(--space-4)',
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: 'var(--radius-lg)',
                color: 'var(--color-gray-700)',
                fontSize: 'var(--text-sm)',
              }}>
                ⚠️ We&apos;re having trouble reaching the carrier. Showing your last known status below.
              </div>
            </div>
          )}

          {/* Live Tracking Scans from Delhivery */}
          {liveTracking && liveTracking.scans.length > 0 && (
            <div className={styles.detailSection}>
              <h2 className={styles.detailSectionTitle}>
                Live Tracking
                {trackingLoading && <span className={styles.trackingRefresh}>↻</span>}
              </h2>
              {liveTracking.currentLocation && (
                <div className={styles.currentLocation}>
                  📍 Currently at: <strong>{liveTracking.currentLocation}</strong>
                </div>
              )}
              <div className={styles.timeline}>
                {liveTracking.scans.map((scan, i) => (
                  <div key={i} className={styles.timelineItem}>
                    <div className={`${styles.timelineDot} ${i === 0 ? styles.timelineDotActive : ''}`} />
                    <div className={styles.timelineLine} />
                    <div className={styles.timelineStatus}>{scan.status}</div>
                    <div className={styles.timelineTime}>
                      {scan.statusDateTime ? new Date(scan.statusDateTime).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                    </div>
                    {scan.location && <div className={styles.timelineNote}>📍 {scan.location}</div>}
                    {scan.instructions && <div className={styles.timelineNote}>{scan.instructions}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fallback: Order Timeline from DB (when no live tracking) */}
          {(!liveTracking || trackingDegraded) && order.tracking?.statusHistory && order.tracking.statusHistory.length > 0 && (
            <div className={styles.detailSection}>
              <h2 className={styles.detailSectionTitle}>Order Timeline</h2>
              <div className={styles.timeline}>
                {[...order.tracking.statusHistory].reverse().map((entry, i) => (
                  <div key={i} className={styles.timelineItem}>
                    <div className={`${styles.timelineDot} ${i === 0 ? styles.timelineDotActive : ''}`} />
                    <div className={styles.timelineLine} />
                    <div className={styles.timelineStatus}>{entry.status.replace(/_/g, ' ')}</div>
                    <div className={styles.timelineTime}>
                      {new Date(entry.timestamp).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </div>
                    {entry.note && <div className={styles.timelineNote}>{entry.note}</div>}
                    {entry.location && <div className={styles.timelineNote}>📍 {entry.location}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Shipping Address */}
          <div className={styles.detailSection}>
            <h2 className={styles.detailSectionTitle}>Delivery Address</h2>
            <div className={styles.addressCard}>
              <div className={styles.addressName}>{order.shippingAddress.fullName}</div>
              <div className={styles.addressText}>
                {order.shippingAddress.addressLine1}
                {order.shippingAddress.addressLine2 ? `, ${order.shippingAddress.addressLine2}` : ''}<br />
                {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}
              </div>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)', marginTop: 'var(--space-2)' }}>
                📱 {order.shippingAddress.phone}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className={styles.sidebarCard}>
          <h2 className={styles.detailSectionTitle}>Payment Summary</h2>
          <div className={styles.summaryRow}>
            <span>Subtotal</span>
            <span className={styles.summaryValue}>{formatPrice(order.pricing.subtotal)}</span>
          </div>
          {order.pricing.gst && (
            <>
              <div className={styles.summaryGstRow}>
                <span className={styles.summaryGstLabel}>
                  <span className={styles.gstBadge}>{order.pricing.gst.isIntraState ? 'Intra-State' : 'Inter-State'}</span>
                  Base Price
                </span>
                <span className={styles.summaryGstValue}>{formatPrice(order.pricing.gst.basePrice)}</span>
              </div>
              <div className={styles.summaryGstRow}>
                <span className={styles.summaryGstLabel}>CGST (5%)</span>
                <span className={styles.summaryGstValue}>{formatPrice(order.pricing.gst.cgst)}</span>
              </div>
              {!order.pricing.gst.isIntraState && (
                <div className={styles.summaryGstRow}>
                  <span className={styles.summaryGstLabel}>SGST (5%)</span>
                  <span className={styles.summaryGstValue}>{formatPrice(order.pricing.gst.sgst)}</span>
                </div>
              )}
            </>
          )}
          {order.pricing.discount > 0 && (
            <div className={styles.summaryRow}>
              <span>Discount {order.coupon?.code ? `(${order.coupon.code})` : ''}</span>
              <span className={styles.summaryDiscount}>-{formatPrice(order.pricing.discount)}</span>
            </div>
          )}
          <div className={styles.summaryRow}>
            <span>Shipping</span>
            <span className={styles.summaryValue}>{order.pricing.shippingFee === 0 ? 'FREE' : formatPrice(order.pricing.shippingFee)}</span>
          </div>
          <hr className={styles.summaryDivider} />
          <div className={styles.summaryTotal}>
            <span>Total</span>
            <span>{formatPrice(order.pricing.total)}</span>
          </div>
          <div style={{ marginTop: 'var(--space-4)', fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)' }}>
            <p>Payment: <strong style={{ color: order.payment.status === 'paid' ? 'var(--color-success)' : 'var(--color-gray-900)' }}>{order.payment.status}</strong></p>
            {order.payment.method && <p>Method: {order.payment.method}</p>}
            {order.payment.paidAt && <p>Paid: {new Date(order.payment.paidAt).toLocaleString('en-IN')}</p>}
          </div>

          <div style={{ marginTop: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {['delivered', 'cancelled'].includes(order.status) && (
              <button
                onClick={handleReorder}
                style={{ width: '100%', padding: 'var(--space-3)', fontWeight: 600, color: 'white', background: 'var(--color-primary-500)', borderRadius: 'var(--radius-lg)', cursor: 'pointer', fontSize: 'var(--text-sm)' }}
              >
                🔄 Reorder
              </button>
            )}
            {['placed', 'confirmed'].includes(order.status) && (
              <button
                onClick={handleCancel}
                disabled={cancelling}
                style={{ width: '100%', padding: 'var(--space-3)', fontWeight: 600, color: 'var(--color-error)', background: 'transparent', border: '1.5px solid var(--color-error)', borderRadius: 'var(--radius-lg)', cursor: 'pointer', fontSize: 'var(--text-sm)', opacity: cancelling ? 0.5 : 1 }}
              >
                {cancelling ? 'Cancelling...' : '✕ Cancel Order'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
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
  pricing: { subtotal: number; discount: number; shippingFee: number; total: number };
  coupon?: { code: string };
  payment: { status: string; method?: string; paidAt?: string };
  tracking?: {
    carrier?: string; trackingId?: string; trackingUrl?: string;
    estimatedDelivery?: string;
    statusHistory?: { status: string; timestamp: string; note?: string }[];
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
  const isNew = searchParams.get('new') === 'true';

  useEffect(() => {
    if (!session?.user) return;
    fetch(`/api/orders/${params.orderId}`)
      .then((r) => r.json())
      .then((d) => setOrder(d.order || null))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [session?.user, params.orderId]);

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

          {/* Tracking Timeline */}
          {order.tracking?.statusHistory && order.tracking.statusHistory.length > 0 && (
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
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tracking Info */}
          {order.tracking?.trackingId && (
            <div className={styles.detailSection}>
              <h2 className={styles.detailSectionTitle}>Tracking</h2>
              <div className={styles.addressCard}>
                <p><strong>Carrier:</strong> {order.tracking.carrier || 'N/A'}</p>
                <p><strong>Tracking ID:</strong> {order.tracking.trackingId}</p>
                {order.tracking.trackingUrl && (
                  <p><a href={order.tracking.trackingUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary-600)' }}>Track Shipment →</a></p>
                )}
                {order.tracking.estimatedDelivery && (
                  <p><strong>Expected:</strong> {new Date(order.tracking.estimatedDelivery).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}</p>
                )}
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

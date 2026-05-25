'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { formatPrice } from '@/lib/utils';
import styles from './orders.module.css';

interface OrderSummary {
  _id: string;
  orderId: string;
  items: { productSnapshot: { title: string; image: string }; quantity: number }[];
  pricing: { total: number };
  status: string;
  createdAt: string;
}

const statusMap: Record<string, string> = {
  placed: 'statusPlaced', confirmed: 'statusConfirmed', packed: 'statusPacked',
  shipped: 'statusShipped', out_for_delivery: 'statusOut_for_delivery',
  delivered: 'statusDelivered', cancelled: 'statusCancelled',
};

export default function OrdersPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authStatus === 'unauthenticated') router.push('/login');
  }, [authStatus, router]);

  useEffect(() => {
    if (!session?.user) return;
    fetch('/api/orders')
      .then((r) => r.json())
      .then((d) => setOrders(d.orders || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [session?.user]);

  if (loading) {
    return (
      <div className={styles.container}>
        <h1 className={styles.pageTitle}>My Orders</h1>
        {[1, 2, 3].map((i) => (
          <div key={i} style={{ height: 120, background: 'var(--color-gray-100)', borderRadius: 'var(--radius-xl)', marginBottom: 'var(--space-4)', animation: 'pulse 2s ease-in-out infinite' }} />
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>📦</div>
          <h2 className={styles.emptyTitle}>No orders yet</h2>
          <p className={styles.emptyDesc}>Your order history will appear here.</p>
          <Link href="/products" className={styles.shopBtn}>Browse Products</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.pageTitle}>My Orders ({orders.length})</h1>
      <div className={styles.ordersList}>
        {orders.map((order) => (
          <Link key={order._id} href={`/orders/${order.orderId}`} className={styles.orderCard}>
            <div className={styles.orderHeader}>
              <span className={styles.orderId}>{order.orderId}</span>
              <span className={`${styles.statusBadge} ${styles[statusMap[order.status] || 'statusPlaced']}`}>
                {order.status.replace(/_/g, ' ')}
              </span>
            </div>
            <div className={styles.orderItems}>
              {order.items.slice(0, 4).map((item, i) => (
                <div key={i} className={styles.orderItemThumb}>
                  {item.productSnapshot.image && (
                    <Image src={item.productSnapshot.image} alt={item.productSnapshot.title} fill sizes="48px" />
                  )}
                </div>
              ))}
              {order.items.length > 4 && (
                <div className={styles.orderItemThumb} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-gray-500)' }}>
                  +{order.items.length - 4}
                </div>
              )}
            </div>
            <div className={styles.orderFooter}>
              <span className={styles.orderItemCount}>
                {order.items.reduce((s, i) => s + i.quantity, 0)} items
              </span>
              <span className={styles.orderTotal}>{formatPrice(order.pricing.total)}</span>
            </div>
            <div className={styles.orderDate}>
              {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { formatPrice } from '@/lib/utils';
import styles from './admin.module.css';

interface Stats {
  overview: {
    totalOrders: number; totalRevenue: number; todayOrders: number; todayRevenue: number;
    monthRevenue: number; lastMonthRevenue: number; totalCustomers: number;
    totalProducts: number; lowStockProducts: number; pendingOrders: number;
  };
  recentOrders: { orderId: string; items: { productSnapshot: { title: string } }[]; pricing: { total: number }; status: string; createdAt: string; shippingAddress: { fullName: string } }[];
  topProducts: { title: string; productId: string; totalSalesCount: number; minPrice: number; images: string[]; primaryPackagingSize: string }[];
  statusBreakdown: Record<string, number>;
}

const statusBadge: Record<string, string> = {
  placed: 'badgePlaced', confirmed: 'badgeConfirmed', packed: 'badgePacked',
  shipped: 'badgeShipped', delivered: 'badgeDelivered', cancelled: 'badgeCancelled',
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/stats')
      .then((r) => r.json())
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !stats) {
    return (
      <div>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-2xl)', fontWeight: 700, marginBottom: 'var(--space-6)' }}>Dashboard</h1>
        <div className={styles.statsGrid}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{ height: 100, background: 'var(--color-gray-100)', borderRadius: 'var(--radius-xl)', animation: 'pulse 2s ease-in-out infinite' }} />
          ))}
        </div>
      </div>
    );
  }

  const { overview } = stats;
  const monthGrowth = overview.lastMonthRevenue > 0
    ? Math.round(((overview.monthRevenue - overview.lastMonthRevenue) / overview.lastMonthRevenue) * 100)
    : 0;

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-2xl)', fontWeight: 700, marginBottom: 'var(--space-6)' }}>Dashboard</h1>

      {/* Stats Grid */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Total Revenue</div>
          <div className={styles.statValue}>{formatPrice(overview.totalRevenue)}</div>
          {monthGrowth !== 0 && (
            <div className={`${styles.statChange} ${monthGrowth > 0 ? styles.statUp : styles.statDown}`}>
              {monthGrowth > 0 ? '↑' : '↓'} {Math.abs(monthGrowth)}% vs last month
            </div>
          )}
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Today&apos;s Revenue</div>
          <div className={styles.statValue}>{formatPrice(overview.todayRevenue)}</div>
          <div className={styles.statChange}>{overview.todayOrders} orders today</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Total Orders</div>
          <div className={styles.statValue}>{overview.totalOrders}</div>
          <div className={`${styles.statChange} ${overview.pendingOrders > 0 ? styles.statDown : ''}`}>
            {overview.pendingOrders} pending
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Customers</div>
          <div className={styles.statValue}>{overview.totalCustomers}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Active Products</div>
          <div className={styles.statValue}>{overview.totalProducts}</div>
          {overview.lowStockProducts > 0 && (
            <div className={`${styles.statChange} ${styles.statDown}`}>
              ⚠ {overview.lowStockProducts} low stock
            </div>
          )}
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>This Month</div>
          <div className={styles.statValue}>{formatPrice(overview.monthRevenue)}</div>
        </div>
      </div>

      {/* Two columns: Recent Orders + Top Products */}
      <div className={styles.sectionRow}>
        <div className={styles.sectionCard}>
          <h2 className={styles.sectionTitle}>Recent Orders</h2>
          {stats.recentOrders.length === 0 ? (
            <div className={styles.empty}>No orders yet</div>
          ) : (
            <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentOrders.map((order) => (
                  <tr key={order.orderId}>
                    <td style={{ fontWeight: 600 }}>{order.orderId}</td>
                    <td>{order.shippingAddress?.fullName || '—'}</td>
                    <td>
                      <span className={`${styles.badge} ${styles[statusBadge[order.status] || 'badgePlaced']}`}>
                        {order.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{formatPrice(order.pricing.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>

        <div className={styles.sectionCard}>
          <h2 className={styles.sectionTitle}>Top Products</h2>
          {stats.topProducts.length === 0 ? (
            <div className={styles.empty}>No sales yet</div>
          ) : (
            <div>
              {stats.topProducts.map((product, i) => (
                <div key={product.productId} className={styles.topProduct}>
                  <span className={styles.topProductRank}>{i + 1}</span>
                  <div className={styles.topProductImage}>
                    {product.images[0] && (
                      <Image src={product.images[0]} alt={product.title} fill sizes="40px" />
                    )}
                  </div>
                  <div className={styles.topProductInfo}>
                    <div className={styles.topProductName}>{product.title}</div>
                    <div className={styles.topProductMeta}>{product.totalSalesCount} sold · {formatPrice(product.minPrice)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Order Status Breakdown */}
      <div className={styles.sectionCard}>
        <h2 className={styles.sectionTitle}>Order Status Breakdown</h2>
        <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
          {Object.entries(stats.statusBreakdown).map(([status, count]) => (
            <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <span className={`${styles.badge} ${styles[statusBadge[status] || 'badgePlaced']}`}>
                {status.replace(/_/g, ' ')}
              </span>
              <span style={{ fontWeight: 700, fontSize: 'var(--text-sm)' }}>{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { formatPrice } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import styles from '../admin.module.css';

interface AdminOrder {
  _id: string;
  orderId: string;
  items: { productSnapshot: { title: string }; quantity: number }[];
  pricing: { total: number };
  status: string;
  payment: { status: string };
  shippingAddress: { fullName: string; phone: string };
  createdAt: string;
}

const statuses = ['', 'placed', 'confirmed', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'];
const statusBadge: Record<string, string> = {
  placed: 'badgePlaced', confirmed: 'badgeConfirmed', packed: 'badgePacked',
  shipped: 'badgeShipped', delivered: 'badgeDelivered', cancelled: 'badgeCancelled',
};

export default function AdminOrdersPage() {
  const { toast } = useToast();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      params.set('page', String(page));
      const res = await fetch(`/api/admin/orders?${params}`);
      const data = await res.json();
      setOrders(data.orders || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const updateStatus = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed');
      toast(`Order ${orderId} → ${newStatus}`, 'success');
      fetchOrders();
    } catch {
      toast('Failed to update status', 'error');
    }
  };

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-2xl)', fontWeight: 700, marginBottom: 'var(--space-6)' }}>
        Orders
      </h1>

      <div className={styles.toolbar}>
        <input
          className={styles.searchInput}
          placeholder="Search by order ID, name, or phone..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <select className={styles.filterSelect} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All Statuses</option>
          {statuses.filter(Boolean).map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      <div className={styles.sectionCard}>
        {loading ? (
          <div className={styles.empty}>Loading...</div>
        ) : orders.length === 0 ? (
          <div className={styles.empty}>No orders found</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Total</th>
                <th>Status</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order._id}>
                  <td>
                    <Link href={`/orders/${order.orderId}`} style={{ fontWeight: 600, color: 'var(--color-primary-600)' }}>
                      {order.orderId}
                    </Link>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{order.shippingAddress?.fullName}</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-500)' }}>{order.shippingAddress?.phone}</div>
                  </td>
                  <td>{order.items.reduce((s, i) => s + i.quantity, 0)}</td>
                  <td style={{ fontWeight: 600 }}>{formatPrice(order.pricing.total)}</td>
                  <td>
                    <span className={`${styles.badge} ${styles[statusBadge[order.status] || 'badgePlaced']}`}>
                      {order.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-500)' }}>
                    {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </td>
                  <td>
                    <select
                      className={styles.filterSelect}
                      style={{ fontSize: 'var(--text-xs)', padding: 'var(--space-1) var(--space-2)' }}
                      value={order.status}
                      onChange={(e) => updateStatus(order.orderId, e.target.value)}
                    >
                      {statuses.filter(Boolean).map((s) => (
                        <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {totalPages > 1 && (
          <div className={styles.pagination}>
            <button className={styles.pageBtn} disabled={page <= 1} onClick={() => setPage(page - 1)}>←</button>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)' }}>
              Page {page} of {totalPages}
            </span>
            <button className={styles.pageBtn} disabled={page >= totalPages} onClick={() => setPage(page + 1)}>→</button>
          </div>
        )}
      </div>
    </div>
  );
}

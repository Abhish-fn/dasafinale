'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
  tracking?: { waybill?: string };
  delhivery?: { retryCount?: number };
  createdAt: string;
}

interface OrderDetail {
  orderId: string;
  status: string;
  items: {
    productSnapshot: { title: string; image: string; price: number; packagingSize: string };
    quantity: number;
    priceAtOrder: number;
  }[];
  shippingAddress: {
    fullName: string; phone: string; addressLine1: string; addressLine2?: string;
    city: string; state: string; pincode: string;
  };
  pricing: {
    subtotal: number; discount: number; shippingFee: number; total: number;
    gst?: { basePrice: number; cgst: number; sgst: number; isIntraState: boolean };
  };
  coupon?: { code: string };
  payment: { status: string; method?: string; paidAt?: string };
  tracking?: { waybill?: string; carrier?: string; trackingUrl?: string; estimatedDelivery?: string };
  createdAt: string;
  notes?: string;
}

const statuses = ['', 'placed', 'confirmed', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'];
const dropdownStatuses = ['placed', 'confirmed', 'packed', 'shipped', 'out_for_delivery', 'delivered'];

const statusColors: Record<string, { bg: string; color: string }> = {
  placed: { bg: 'rgba(59,130,246,0.1)', color: '#3b82f6' },
  confirmed: { bg: 'rgba(198, 40, 40,0.1)', color: 'var(--red)' },
  packed: { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b' },
  shipped: { bg: 'rgba(139,92,246,0.1)', color: '#8b5cf6' },
  out_for_delivery: { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b' },
  delivered: { bg: 'rgba(34,197,94,0.1)', color: '#22c55e' },
  cancelled: { bg: 'rgba(239,68,68,0.1)', color: '#ef4444' },
};

export default function AdminOrdersPage() {
  const { toast } = useToast();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [detailOrder, setDetailOrder] = useState<OrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

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

  const createShipment = async (orderId: string) => {
    try {
      toast('Creating shipment...', 'info');
      const res = await fetch(`/api/admin/orders/${orderId}/shipment`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        toast(`Shipment created: ${data.waybill}`, 'success');
        fetchOrders();
      } else {
        toast(data.error || 'Failed to create shipment', 'error');
      }
    } catch {
      toast('Failed to create shipment', 'error');
    }
  };

  const cancelOrder = async (orderId: string) => {
    if (!confirm(`Are you sure you want to cancel order ${orderId}? This will restore stock and cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/orders/${orderId}/cancel`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to cancel order');
      }
      toast(`Order ${orderId} cancelled`, 'success');
      fetchOrders();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to cancel order', 'error');
    }
  };

  const openOrderDetail = async (orderId: string) => {
    setDetailLoading(true);
    setDetailOrder(null);
    try {
      const res = await fetch(`/api/orders/${orderId}`);
      const data = await res.json();
      if (res.ok && data.order) {
        setDetailOrder(data.order);
      } else {
        toast('Failed to load order details', 'error');
      }
    } catch {
      toast('Failed to load order details', 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetailOrder(null);
    setDetailLoading(false);
  };

  // Close on Escape
  useEffect(() => {
    if (!detailOrder && !detailLoading) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeDetail(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  });

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
          <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Total</th>
                <th>Status</th>
                <th>Shipping</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order._id} onClick={() => openOrderDetail(order.orderId)} style={{ cursor: 'pointer' }}>
                  <td>
                    <span style={{ fontWeight: 600 }}>
                      {order.orderId}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{order.shippingAddress?.fullName}</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-500)' }}>{order.shippingAddress?.phone}</div>
                  </td>
                  <td>{order.items.reduce((s, i) => s + i.quantity, 0)}</td>
                  <td style={{ fontWeight: 600 }}>{formatPrice(order.pricing.total)}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    {order.status === 'cancelled' ? (
                      <span style={{
                        fontSize: 'var(--text-xs)', fontWeight: 700, padding: '4px 10px',
                        borderRadius: 'var(--radius-full)', background: 'rgba(239,68,68,0.1)', color: '#ef4444',
                      }}>
                        Cancelled
                      </span>
                    ) : (
                      <select
                        value={order.status}
                        onChange={(e) => updateStatus(order.orderId, e.target.value)}
                        style={{
                          fontSize: 'var(--text-xs)',
                          fontWeight: 600,
                          padding: '4px 8px',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--color-gray-200)',
                          background: 'var(--color-surface)',
                          cursor: 'pointer',
                          textTransform: 'capitalize',
                        }}
                      >
                        {dropdownStatuses.map((s) => (
                          <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    {order.tracking?.waybill && order.tracking.waybill !== 'PENDING' ? (
                      <div>
                        <a
                          href={`https://www.delhivery.com/track/package/${order.tracking.waybill}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: 'var(--text-xs)', fontFamily: 'monospace', color: 'var(--color-primary-600)' }}
                        >
                          {order.tracking.waybill}
                        </a>
                      </div>
                    ) : order.tracking?.waybill === 'PENDING' ? (
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--gold)', fontWeight: 600 }}>Creating...</span>
                    ) : order.payment.status === 'paid' ? (
                      <button
                        onClick={() => createShipment(order.orderId)}
                        style={{
                          fontSize: 'var(--text-xs)', padding: '2px 8px', background: 'var(--red)',
                          color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                        }}
                      >
                        {(order.delhivery?.retryCount || 0) > 0 ? 'Retry' : 'Create'} Shipment
                      </button>
                    ) : (
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-400)' }}>—</span>
                    )}
                  </td>
                  <td style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-500)' }}>
                    {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    {order.status !== 'cancelled' && order.status !== 'delivered' && (
                      <button
                        onClick={() => cancelOrder(order.orderId)}
                        style={{
                          fontSize: '11px', fontWeight: 600, padding: '3px 10px',
                          background: 'rgba(239,68,68,0.08)', color: '#ef4444',
                          border: '1px solid rgba(239,68,68,0.25)', borderRadius: 'var(--radius-sm)',
                          cursor: 'pointer', whiteSpace: 'nowrap',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color = 'white'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.color = '#ef4444'; }}
                      >
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
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

      {/* ===== Order Detail Modal ===== */}
      {(detailOrder || detailLoading) && (
        <div className={styles.modalOverlay} onClick={closeDetail}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
            {detailLoading && !detailOrder ? (
              <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
                <div style={{ width: 36, height: 36, border: '3px solid var(--color-gray-200)', borderTopColor: 'var(--red)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto var(--space-4)' }} />
                <p style={{ color: 'var(--color-gray-500)', fontSize: 'var(--text-sm)' }}>Loading order details…</p>
              </div>
            ) : detailOrder && (
              <>
                <div className={styles.modalHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <h2 className={styles.modalTitle}>Order {detailOrder.orderId}</h2>
                    <span style={{
                      fontSize: 'var(--text-xs)', fontWeight: 700, padding: '2px 10px',
                      borderRadius: 'var(--radius-full)', textTransform: 'capitalize',
                      background: statusColors[detailOrder.status]?.bg || 'var(--color-gray-100)',
                      color: statusColors[detailOrder.status]?.color || 'var(--color-gray-600)',
                    }}>
                      {detailOrder.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <button className={styles.modalClose} onClick={closeDetail} aria-label="Close">✕</button>
                </div>

                <div className={styles.modalBody}>
                  {/* Items */}
                  <div>
                    <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--red)', marginBottom: 'var(--space-3)' }}>Items</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                      {detailOrder.items.map((item, i) => (
                        <div key={i} style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
                          <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'var(--color-gray-100)', flexShrink: 0, position: 'relative' }}>
                            {item.productSnapshot.image && <Image src={item.productSnapshot.image} alt="" fill sizes="44px" />}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 500, fontSize: 'var(--text-sm)', color: 'var(--color-gray-900)' }}>
                              {item.productSnapshot.title}
                              {item.productSnapshot.packagingSize && <span style={{ color: 'var(--color-gray-400)', fontWeight: 400 }}> ({item.productSnapshot.packagingSize})</span>}
                            </div>
                            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-500)' }}>
                              {formatPrice(item.priceAtOrder)} × {item.quantity}
                            </div>
                          </div>
                          <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--color-gray-900)', whiteSpace: 'nowrap' }}>
                            {formatPrice(item.priceAtOrder * item.quantity)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Pricing */}
                  <div style={{ padding: 'var(--space-4)', background: 'rgba(198, 40, 40,0.03)', borderRadius: 'var(--radius-lg)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)', color: 'var(--color-gray-600)', marginBottom: 'var(--space-1)' }}>
                      <span>Subtotal</span><span>{formatPrice(detailOrder.pricing.subtotal)}</span>
                    </div>
                    {detailOrder.pricing.discount > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)', color: '#22c55e', marginBottom: 'var(--space-1)' }}>
                        <span>Discount {detailOrder.coupon?.code ? `(${detailOrder.coupon.code})` : ''}</span>
                        <span>-{formatPrice(detailOrder.pricing.discount)}</span>
                      </div>
                    )}
                    {detailOrder.pricing.gst && (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', color: 'var(--color-gray-500)', marginBottom: 'var(--space-1)', paddingLeft: 'var(--space-2)', borderLeft: '2px solid var(--color-gray-200)' }}>
                          <span>CGST (5%)</span><span>{formatPrice(detailOrder.pricing.gst.cgst)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', color: 'var(--color-gray-500)', marginBottom: 'var(--space-1)', paddingLeft: 'var(--space-2)', borderLeft: '2px solid var(--color-gray-200)' }}>
                          <span>SGST (5%)</span><span>{formatPrice(detailOrder.pricing.gst.sgst)}</span>
                        </div>
                      </>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)', color: 'var(--color-gray-600)', marginBottom: 'var(--space-2)' }}>
                      <span>Shipping</span>
                      <span>{detailOrder.pricing.shippingFee === 0 ? 'FREE' : formatPrice(detailOrder.pricing.shippingFee)}</span>
                    </div>
                    <div style={{ borderTop: '1px solid var(--color-gray-200)', paddingTop: 'var(--space-2)', display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 'var(--text-base)', color: 'var(--red)' }}>
                      <span>Total</span><span>{formatPrice(detailOrder.pricing.total)}</span>
                    </div>
                  </div>

                  {/* Customer & Address */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                    <div>
                      <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--red)', marginBottom: 'var(--space-2)' }}>Customer</h3>
                      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-700)' }}>
                        <div style={{ fontWeight: 600 }}>{detailOrder.shippingAddress.fullName}</div>
                        <div>📱 {detailOrder.shippingAddress.phone}</div>
                      </div>
                    </div>
                    <div>
                      <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--red)', marginBottom: 'var(--space-2)' }}>Delivery Address</h3>
                      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-600)', lineHeight: 1.5 }}>
                        {detailOrder.shippingAddress.addressLine1}
                        {detailOrder.shippingAddress.addressLine2 ? `, ${detailOrder.shippingAddress.addressLine2}` : ''}<br />
                        {detailOrder.shippingAddress.city}, {detailOrder.shippingAddress.state} - {detailOrder.shippingAddress.pincode}
                      </div>
                    </div>
                  </div>

                  {/* Payment & Tracking */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                    <div>
                      <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--red)', marginBottom: 'var(--space-2)' }}>Payment</h3>
                      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-600)' }}>
                        <div>
                          Status: <strong style={{ color: detailOrder.payment.status === 'paid' ? '#22c55e' : 'var(--color-gray-900)' }}>{detailOrder.payment.status}</strong>
                        </div>
                        {detailOrder.payment.method && <div>Method: {detailOrder.payment.method}</div>}
                        {detailOrder.payment.paidAt && <div>Paid: {new Date(detailOrder.payment.paidAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>}
                      </div>
                    </div>
                    {detailOrder.tracking?.waybill && detailOrder.tracking.waybill !== 'PENDING' && (
                      <div>
                        <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--red)', marginBottom: 'var(--space-2)' }}>Tracking</h3>
                        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-600)' }}>
                          <div>📦 {detailOrder.tracking.carrier || 'Delhivery'}</div>
                          <div style={{ fontFamily: 'monospace', fontSize: 'var(--text-xs)' }}>AWB: {detailOrder.tracking.waybill}</div>
                          {detailOrder.tracking.estimatedDelivery && (
                            <div>📅 ETA: {new Date(detailOrder.tracking.estimatedDelivery).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
                          )}
                          {detailOrder.tracking.trackingUrl && (
                            <a href={detailOrder.tracking.trackingUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 'var(--text-xs)', color: 'var(--red)', fontWeight: 600 }}>
                              Track on Delhivery →
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {detailOrder.notes && (
                    <div>
                      <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--red)', marginBottom: 'var(--space-2)' }}>Order Notes</h3>
                      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-600)', fontStyle: 'italic' }}>{detailOrder.notes}</p>
                    </div>
                  )}

                  {/* Footer info */}
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-400)', textAlign: 'right' }}>
                    Placed {new Date(detailOrder.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                <div className={styles.modalFooter}>
                  <Link
                    href={`/orders/${detailOrder.orderId}`}
                    style={{ fontSize: 'var(--text-sm)', color: 'var(--red)', fontWeight: 600, textDecoration: 'none' }}
                  >
                    Open Full Page →
                  </Link>
                  <button
                    onClick={closeDetail}
                    style={{ padding: 'var(--space-2) var(--space-6)', fontWeight: 600, color: 'var(--color-gray-600)', border: '1px solid var(--color-gray-300)', borderRadius: 'var(--radius-lg)', fontSize: 'var(--text-sm)', cursor: 'pointer', background: 'transparent' }}
                  >
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

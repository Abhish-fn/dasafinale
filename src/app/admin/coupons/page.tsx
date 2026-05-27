'use client';

import { useEffect, useState, useCallback } from 'react';
import { formatPrice } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import styles from '../admin.module.css';

interface Coupon {
  _id: string;
  code: string;
  description: string;
  discountType: 'percentage' | 'flat';
  discountValue: number;
  minOrderAmount: number;
  maxDiscountAmount?: number;
  usageLimit: number;
  usedCount: number;
  perUserLimit: number;
  expiresAt?: string;
  isActive: boolean;
}

const emptyForm: {
  code: string; description: string; discountType: 'percentage' | 'flat'; discountValue: number;
  minOrderAmount: number; maxDiscountAmount: number; usageLimit: number; perUserLimit: number;
  expiresAt: string; expiresTime: string; isActive: boolean;
} = {
  code: '', description: '', discountType: 'percentage', discountValue: 0,
  minOrderAmount: 0, maxDiscountAmount: 0, usageLimit: 100, perUserLimit: 1,
  expiresAt: '', expiresTime: '23:59', isActive: true,
};

export default function AdminCouponsPage() {
  const { toast } = useToast();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchCoupons = useCallback(async () => {
    try {
      const res = await fetch('/api/coupons');
      const data = await res.json();
      setCoupons(data.coupons || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCoupons(); }, [fetchCoupons]);

  const handleSave = async () => {
    try {
      const url = editingId ? `/api/coupons/${editingId}` : '/api/coupons';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          // Convert rupee inputs to paise for the API
          discountValue: form.discountType === 'flat' ? Math.round(form.discountValue * 100) : form.discountValue,
          minOrderAmount: Math.round(form.minOrderAmount * 100),
          maxDiscountAmount: form.maxDiscountAmount ? Math.round(form.maxDiscountAmount * 100) : undefined,
          // Combine date + time in local timezone so the coupon works through the full expiry day
          expiresAt: form.expiresAt ? new Date(`${form.expiresAt}T${form.expiresTime || '23:59'}:00`).toISOString() : undefined,
          expiresTime: undefined, // strip from payload
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed');
      }
      toast(editingId ? 'Coupon updated' : 'Coupon created', 'success');
      setShowForm(false);
      setForm(emptyForm);
      setEditingId(null);
      fetchCoupons();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to save coupon', 'error');
    }
  };

  const handleEdit = (coupon: Coupon) => {
    // Extract date and time from the stored ISO datetime
    const expiryDate = coupon.expiresAt ? new Date(coupon.expiresAt) : null;
    const datePart = expiryDate ? `${expiryDate.getFullYear()}-${String(expiryDate.getMonth() + 1).padStart(2, '0')}-${String(expiryDate.getDate()).padStart(2, '0')}` : '';
    const timePart = expiryDate ? `${String(expiryDate.getHours()).padStart(2, '0')}:${String(expiryDate.getMinutes()).padStart(2, '0')}` : '23:59';

    setForm({
      code: coupon.code,
      description: coupon.description,
      discountType: coupon.discountType,
      discountValue: coupon.discountType === 'flat' ? coupon.discountValue / 100 : coupon.discountValue,
      minOrderAmount: coupon.minOrderAmount / 100,
      maxDiscountAmount: coupon.maxDiscountAmount ? coupon.maxDiscountAmount / 100 : 0,
      usageLimit: coupon.usageLimit,
      perUserLimit: coupon.perUserLimit,
      expiresAt: datePart,
      expiresTime: timePart,
      isActive: coupon.isActive,
    });
    setEditingId(coupon._id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this coupon?')) return;
    try {
      await fetch(`/api/coupons/${id}`, { method: 'DELETE' });
      toast('Coupon deleted', 'success');
      fetchCoupons();
    } catch {
      toast('Failed to delete', 'error');
    }
  };

  const toggleActive = async (coupon: Coupon) => {
    try {
      await fetch(`/api/coupons/${coupon._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !coupon.isActive }),
      });
      toast(`Coupon ${coupon.isActive ? 'deactivated' : 'activated'}`, 'success');
      fetchCoupons();
    } catch {
      toast('Failed to update', 'error');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-2xl)', fontWeight: 700 }}>Coupons</h1>
        <button className={`${styles.actionBtn} ${styles.actionPrimary}`} onClick={() => { setShowForm(!showForm); setEditingId(null); setForm(emptyForm); }}>
          + New Coupon
        </button>
      </div>

      {showForm && (
        <div className={styles.sectionCard} style={{ marginBottom: 'var(--space-6)' }}>
          <h2 className={styles.sectionTitle}>{editingId ? 'Edit Coupon' : 'Create Coupon'}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-4)' }}>
            <div>
              <label style={{ fontSize: 'var(--text-sm)', fontWeight: 500, display: 'block', marginBottom: 'var(--space-1)' }}>Code</label>
              <input className={styles.searchInput} style={{ width: '100%' }} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="SAVE10" />
            </div>
            <div>
              <label style={{ fontSize: 'var(--text-sm)', fontWeight: 500, display: 'block', marginBottom: 'var(--space-1)' }}>Type</label>
              <select className={styles.filterSelect} style={{ width: '100%' }} value={form.discountType} onChange={(e) => setForm({ ...form, discountType: e.target.value as 'percentage' | 'flat' })}>
                <option value="percentage">Percentage</option>
                <option value="flat">Flat Amount</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 'var(--text-sm)', fontWeight: 500, display: 'block', marginBottom: 'var(--space-1)' }}>Value {form.discountType === 'percentage' ? '(%)' : '(₹)'}</label>
              <input className={styles.searchInput} style={{ width: '100%' }} type="number" step={form.discountType === 'flat' ? '0.01' : '1'} value={form.discountValue} onChange={(e) => setForm({ ...form, discountValue: Number(e.target.value) })} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: 'var(--text-sm)', fontWeight: 500, display: 'block', marginBottom: 'var(--space-1)' }}>Description</label>
              <input className={styles.searchInput} style={{ width: '100%' }} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Get 10% off on your order" />
            </div>
            <div>
              <label style={{ fontSize: 'var(--text-sm)', fontWeight: 500, display: 'block', marginBottom: 'var(--space-1)' }}>Min Order (₹)</label>
              <input className={styles.searchInput} style={{ width: '100%' }} type="number" step="0.01" value={form.minOrderAmount} onChange={(e) => setForm({ ...form, minOrderAmount: Number(e.target.value) })} />
            </div>
            <div>
              <label style={{ fontSize: 'var(--text-sm)', fontWeight: 500, display: 'block', marginBottom: 'var(--space-1)' }}>Max Discount (₹)</label>
              <input className={styles.searchInput} style={{ width: '100%' }} type="number" step="0.01" value={form.maxDiscountAmount} onChange={(e) => setForm({ ...form, maxDiscountAmount: Number(e.target.value) })} />
            </div>
            <div>
              <label style={{ fontSize: 'var(--text-sm)', fontWeight: 500, display: 'block', marginBottom: 'var(--space-1)' }}>Usage Limit</label>
              <input className={styles.searchInput} style={{ width: '100%' }} type="number" value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: Number(e.target.value) })} />
            </div>
            <div>
              <label style={{ fontSize: 'var(--text-sm)', fontWeight: 500, display: 'block', marginBottom: 'var(--space-1)' }}>Per User Limit</label>
              <input className={styles.searchInput} style={{ width: '100%' }} type="number" value={form.perUserLimit} onChange={(e) => setForm({ ...form, perUserLimit: Number(e.target.value) })} />
            </div>
            <div>
              <label style={{ fontSize: 'var(--text-sm)', fontWeight: 500, display: 'block', marginBottom: 'var(--space-1)' }}>Expiry Date</label>
              <input className={styles.searchInput} style={{ width: '100%' }} type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: 'var(--text-sm)', fontWeight: 500, display: 'block', marginBottom: 'var(--space-1)' }}>Expiry Time (24h)</label>
              <input className={styles.searchInput} style={{ width: '100%' }} type="time" value={form.expiresTime} onChange={(e) => setForm({ ...form, expiresTime: e.target.value })} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', marginTop: 'var(--space-4)' }}>
            <button className={`${styles.actionBtn} ${styles.actionDanger}`} onClick={() => { setShowForm(false); setEditingId(null); setForm(emptyForm); }}>Cancel</button>
            <button className={`${styles.actionBtn} ${styles.actionPrimary}`} onClick={handleSave}>{editingId ? 'Update' : 'Create'}</button>
          </div>
        </div>
      )}

      <div className={styles.sectionCard}>
        {loading ? (
          <div className={styles.empty}>Loading...</div>
        ) : coupons.length === 0 ? (
          <div className={styles.empty}>No coupons yet</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Code</th>
                <th>Discount</th>
                <th>Min Order</th>
                <th>Usage</th>
                <th>Expires</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((c) => (
                <tr key={c._id}>
                  <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>{c.code}</td>
                  <td>
                    {c.discountType === 'percentage' ? `${c.discountValue}%` : formatPrice(c.discountValue)}
                    {c.maxDiscountAmount ? ` (max ${formatPrice(c.maxDiscountAmount)})` : ''}
                  </td>
                  <td>{formatPrice(c.minOrderAmount)}</td>
                  <td>{c.usedCount} / {c.usageLimit}</td>
                  <td style={{ fontSize: 'var(--text-xs)' }}>
                    {c.expiresAt ? new Date(c.expiresAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', hour12: true }) : '—'}
                  </td>
                  <td>
                    <button
                      className={styles.badge}
                      style={{ cursor: 'pointer', background: c.isActive ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: c.isActive ? 'var(--color-success)' : 'var(--color-error)' }}
                      onClick={() => toggleActive(c)}
                    >
                      {c.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                      <button className={`${styles.actionBtn} ${styles.actionPrimary}`} onClick={() => handleEdit(c)}>Edit</button>
                      <button className={`${styles.actionBtn} ${styles.actionDanger}`} onClick={() => handleDelete(c._id)}>Del</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

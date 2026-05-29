'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { formatPrice } from '@/lib/utils';
import styles from '../admin.module.css';

interface Customer {
  _id: string;
  name: string;
  email: string;
  image?: string;
  role: string;
  orderCount: number;
  totalSpent: number;
  createdAt: string;
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      params.set('page', String(page));
      const res = await fetch(`/api/admin/customers?${params}`);
      const data = await res.json();
      setCustomers(data.customers || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-2xl)', fontWeight: 700, marginBottom: 'var(--space-6)' }}>
        Customers
      </h1>

      <div className={styles.toolbar}>
        <input
          className={styles.searchInput}
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      <div className={styles.sectionCard}>
        {loading ? (
          <div className={styles.empty}>Loading...</div>
        ) : customers.length === 0 ? (
          <div className={styles.empty}>No customers found</div>
        ) : (
          <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Email</th>
                <th>Role</th>
                <th>Orders</th>
                <th>Total Spent</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c._id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', overflow: 'hidden', background: 'var(--color-gray-100)', flexShrink: 0, position: 'relative' }}>
                        {c.image ? (
                          <Image src={c.image} alt="" fill sizes="32px" />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--color-primary-600)', background: 'var(--color-primary-50)' }}>
                            {c.name?.[0]?.toUpperCase() || '?'}
                          </div>
                        )}
                      </div>
                      <span style={{ fontWeight: 500 }}>{c.name || '—'}</span>
                    </div>
                  </td>
                  <td style={{ fontSize: 'var(--text-sm)' }}>{c.email}</td>
                  <td>
                    <span className={styles.badge} style={{ background: c.role === 'admin' ? 'rgba(139,92,246,0.1)' : 'var(--color-gray-100)', color: c.role === 'admin' ? '#8b5cf6' : 'var(--color-gray-500)' }}>
                      {c.role}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{c.orderCount}</td>
                  <td style={{ fontWeight: 600 }}>{formatPrice(c.totalSpent)}</td>
                  <td style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-500)' }}>
                    {new Date(c.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
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
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)' }}>Page {page} of {totalPages}</span>
            <button className={styles.pageBtn} disabled={page >= totalPages} onClick={() => setPage(page + 1)}>→</button>
          </div>
        )}
      </div>
    </div>
  );
}

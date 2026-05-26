'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { formatPrice } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import styles from '../admin.module.css';

interface Product {
  _id: string;
  productId: string;
  title: string;
  price: number;
  compareAtPrice?: number;
  category: string;
  stock: number;
  isActive: boolean;
  isMustTry: boolean;
  isBestSeller: boolean;
  salesCount: number;
  images: string[];
  packagingSize: string;
}

const categories = [
  '', 'Clay Pot Roasted Seeds & Superfoods', 'Millet Munchies', 'Trail Mixes',
  'Healthy Cookies', 'Protein Bars', 'Granola',
];

export default function AdminProductsPage() {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [editingStock, setEditingStock] = useState<string | null>(null);
  const [stockValue, setStockValue] = useState('');

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (category) params.set('category', category);
      params.set('limit', '100');
      const res = await fetch(`/api/products?${params}`);
      const data = await res.json();
      setProducts(data.products || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search, category]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const updateProduct = async (productId: string, updates: Record<string, unknown>) => {
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('Failed');
      toast('Product updated', 'success');
      fetchProducts();
    } catch {
      toast('Failed to update', 'error');
    }
  };

  const handleStockSave = async (productId: string) => {
    const stock = parseInt(stockValue);
    if (isNaN(stock) || stock < 0) {
      toast('Invalid stock value', 'error');
      return;
    }
    await updateProduct(productId, { stock });
    setEditingStock(null);
  };

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-2xl)', fontWeight: 700, marginBottom: 'var(--space-6)' }}>
        Products
      </h1>

      <div className={styles.toolbar}>
        <input
          className={styles.searchInput}
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className={styles.filterSelect} value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All Categories</option>
          {categories.filter(Boolean).map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className={styles.sectionCard}>
        {loading ? (
          <div className={styles.empty}>Loading...</div>
        ) : products.length === 0 ? (
          <div className={styles.empty}>No products found</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Sales</th>
                <th>Flags</th>
                <th>Active</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p._id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                      <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'var(--color-gray-100)', flexShrink: 0, position: 'relative' }}>
                        {p.images[0] && <Image src={p.images[0]} alt="" fill sizes="40px" />}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{p.title}</div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-500)' }}>{p.packagingSize}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontSize: 'var(--text-xs)' }}>{p.category}</td>
                  <td style={{ fontWeight: 600 }}>{formatPrice(p.price)}</td>
                  <td>
                    {editingStock === p._id ? (
                      <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
                        <input
                          style={{ width: 60, padding: '2px 4px', border: '1px solid var(--color-gray-300)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-xs)' }}
                          value={stockValue}
                          onChange={(e) => setStockValue(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleStockSave(p.productId)}
                          autoFocus
                        />
                        <button className={`${styles.actionBtn} ${styles.actionPrimary}`} style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => handleStockSave(p.productId)}>✓</button>
                      </div>
                    ) : (
                      <span
                        style={{ cursor: 'pointer', fontWeight: 600, color: p.stock <= 10 ? 'var(--color-error)' : 'inherit' }}
                        onClick={() => { setEditingStock(p._id); setStockValue(String(p.stock)); }}
                        title="Click to edit"
                      >
                        {p.stock} {p.stock <= 10 && '⚠'}
                      </span>
                    )}
                  </td>
                  <td>{p.salesCount}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 'var(--space-1)', flexWrap: 'wrap' }}>
                      <button
                        className={`${styles.badge} ${p.isMustTry ? 'badgeShipped' : ''}`}
                        style={{ cursor: 'pointer', background: p.isMustTry ? 'rgba(232,132,90,0.15)' : 'var(--color-gray-100)', color: p.isMustTry ? 'var(--color-accent-500)' : 'var(--color-gray-400)' }}
                        onClick={() => updateProduct(p.productId, { isMustTry: !p.isMustTry })}
                        title="Toggle Must Try"
                      >🔥</button>
                      <button
                        className={styles.badge}
                        style={{ cursor: 'pointer', background: p.isBestSeller ? 'rgba(107,140,62,0.15)' : 'var(--color-gray-100)', color: p.isBestSeller ? 'var(--color-primary-600)' : 'var(--color-gray-400)' }}
                        onClick={() => updateProduct(p.productId, { isBestSeller: !p.isBestSeller })}
                        title="Toggle Best Seller"
                      >⭐</button>
                    </div>
                  </td>
                  <td>
                    <button
                      className={`${styles.badge}`}
                      style={{ cursor: 'pointer', background: p.isActive ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: p.isActive ? 'var(--color-success)' : 'var(--color-error)' }}
                      onClick={() => updateProduct(p.productId, { isActive: !p.isActive })}
                    >
                      {p.isActive ? 'Active' : 'Hidden'}
                    </button>
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

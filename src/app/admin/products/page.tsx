'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import { formatPrice } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import styles from '../admin.module.css';

interface NutritionInfo {
  calories?: string;
  protein?: string;
  carbs?: string;
  fat?: string;
  fiber?: string;
}

interface Product {
  _id: string;
  productId: string;
  title: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  category: string;
  foodType: string;
  tags: string[];
  stock: number;
  isActive: boolean;
  isMustTry: boolean;
  isBestSeller: boolean;
  isSpecialItem: boolean;
  salesCount: number;
  images: string[];
  packagingSize: string;
  weight: number;
  nutritionInfo?: NutritionInfo;
}

const categories = [
  '', 'Clay Pot Roasted Seeds & Superfoods', 'Protein & Energy Snacks',
  'Palm Jaggery Millet Biscuits', 'Traditional Millet Savoury Snacks',
  'Healthy Chips & Crisps', 'Premium Healthy Sweets',
];

const foodTypes = ['Seeds', 'Superfood', 'Biscuits', 'Snacks', 'Chips', 'Sweets', 'Protein'];

export default function AdminProductsPage() {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');


  // Edit modal state
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState<Partial<Product>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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




  // --- Edit Modal Logic ---
  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setEditForm({
      title: product.title,
      description: product.description,
      price: product.price / 100,
      compareAtPrice: product.compareAtPrice ? product.compareAtPrice / 100 : undefined,
      category: product.category,
      foodType: product.foodType,
      packagingSize: product.packagingSize,
      weight: product.weight,
      stock: product.stock,
      images: [...product.images],
      tags: [...(product.tags || [])],
      isMustTry: product.isMustTry,
      isBestSeller: product.isBestSeller,
      isSpecialItem: product.isSpecialItem,
      nutritionInfo: product.nutritionInfo ? { ...product.nutritionInfo } : {
        calories: '', protein: '', carbs: '', fat: '', fiber: '',
      },
    });
    setTagInput('');
  };

  const closeEditModal = () => {
    setEditingProduct(null);
    setEditForm({});
    setTagInput('');
  };

  const handleEditSave = async () => {
    if (!editingProduct) return;
    setSaving(true);
    try {
      // Build only changed fields, comparing form values (in rupees) against original (converted to rupees)
      const updates: Record<string, unknown> = {};
      const fields: (keyof Product)[] = [
        'title', 'description', 'price', 'compareAtPrice', 'category',
        'foodType', 'packagingSize', 'weight', 'stock', 'images', 'tags',
        'isMustTry', 'isBestSeller', 'isSpecialItem', 'nutritionInfo',
      ];

      // Build original values in the same units as the form (rupees for prices)
      const originalInFormUnits: Record<string, unknown> = { ...editingProduct };
      originalInFormUnits.price = editingProduct.price / 100;
      originalInFormUnits.compareAtPrice = editingProduct.compareAtPrice ? editingProduct.compareAtPrice / 100 : undefined;

      for (const field of fields) {
        const newVal = editForm[field];
        const oldVal = (originalInFormUnits as Record<string, unknown>)[field];
        if (JSON.stringify(newVal) !== JSON.stringify(oldVal)) {
          updates[field] = newVal;
        }
      }

      // Convert price fields from rupees back to paise for the API
      if ('price' in updates) {
        updates.price = Math.round((updates.price as number) * 100);
      }
      if ('compareAtPrice' in updates) {
        updates.compareAtPrice = updates.compareAtPrice ? Math.round((updates.compareAtPrice as number) * 100) : undefined;
      }

      if (Object.keys(updates).length === 0) {
        toast('No changes to save', 'info');
        setSaving(false);
        return;
      }

      const res = await fetch(`/api/products/${editingProduct.productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update');
      }
      toast('Product updated successfully', 'success');
      closeEditModal();
      fetchProducts();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to update', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const currentImages = editForm.images || [];
    if (currentImages.length >= 5) {
      toast('Maximum 5 images allowed', 'error');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      setEditForm((prev) => ({ ...prev, images: [...(prev.images || []), data.url] }));
      toast('Image uploaded', 'success');
    } catch {
      toast('Failed to upload image', 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    setEditForm((prev) => ({
      ...prev,
      images: (prev.images || []).filter((_, i) => i !== index),
    }));
  };

  const addTag = () => {
    const tag = tagInput.trim();
    if (!tag) return;
    const current = editForm.tags || [];
    if (current.includes(tag)) {
      toast('Tag already exists', 'error');
      return;
    }
    if (current.length >= 10) {
      toast('Maximum 10 tags allowed', 'error');
      return;
    }
    setEditForm((prev) => ({ ...prev, tags: [...(prev.tags || []), tag] }));
    setTagInput('');
  };

  const removeTag = (index: number) => {
    setEditForm((prev) => ({
      ...prev,
      tags: (prev.tags || []).filter((_, i) => i !== index),
    }));
  };

  const updateNutrition = (field: keyof NutritionInfo, value: string) => {
    setEditForm((prev) => ({
      ...prev,
      nutritionInfo: { ...(prev.nutritionInfo || {}), [field]: value },
    }));
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
                <th>Actions</th>
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
                    <span style={{ fontWeight: 600, color: p.stock <= 10 ? 'var(--color-error)' : 'inherit' }}>
                      {p.stock} {p.stock <= 10 && '⚠'}
                    </span>
                  </td>
                  <td>{p.salesCount}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 'var(--space-1)', flexWrap: 'wrap' }}>
                      <span
                        className={styles.badge}
                        style={{ background: p.isMustTry ? 'rgba(232,132,90,0.15)' : 'var(--color-gray-100)', color: p.isMustTry ? 'var(--color-accent-500)' : 'var(--color-gray-400)' }}
                      >🔥</span>
                      <span
                        className={styles.badge}
                        style={{ background: p.isBestSeller ? 'rgba(107,30,43,0.15)' : 'var(--color-gray-100)', color: p.isBestSeller ? 'var(--color-primary-600)' : 'var(--color-gray-400)' }}
                      >⭐</span>
                    </div>
                  </td>
                  <td>
                    <span
                      className={styles.badge}
                      style={{ background: p.isActive ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: p.isActive ? 'var(--color-success)' : 'var(--color-error)' }}
                    >
                      {p.isActive ? 'Active' : 'Hidden'}
                    </span>
                  </td>
                  <td>
                    <button
                      className={styles.editBtn}
                      onClick={() => openEditModal(p)}
                      title="Edit product"
                      aria-label={`Edit ${p.title}`}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ===== Edit Product Modal ===== */}
      {editingProduct && (
        <div className={styles.modalOverlay} onClick={closeEditModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Edit Product</h2>
              <button className={styles.modalClose} onClick={closeEditModal} aria-label="Close modal">✕</button>
            </div>

            <div className={styles.modalBody}>
              {/* Title */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Title</label>
                <input
                  className={styles.formInput}
                  value={editForm.title || ''}
                  onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                />
              </div>

              {/* Description */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Description</label>
                <textarea
                  className={styles.formTextarea}
                  rows={3}
                  value={editForm.description || ''}
                  onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>

              {/* Price Row */}
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Price (₹)</label>
                  <input
                    className={styles.formInput}
                    type="number"
                    min={0}
                    step="0.01"
                    value={editForm.price ?? ''}
                    onChange={(e) => setEditForm((f) => ({ ...f, price: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Compare At Price (₹)</label>
                  <input
                    className={styles.formInput}
                    type="number"
                    min={0}
                    step="0.01"
                    value={editForm.compareAtPrice ?? ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditForm((f) => ({ ...f, compareAtPrice: val ? parseFloat(val) : undefined }));
                    }}
                  />
                </div>
              </div>

              {/* Category & Food Type */}
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Category</label>
                  <select
                    className={styles.formSelect}
                    value={editForm.category || ''}
                    onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))}
                  >
                    {categories.filter(Boolean).map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Food Type</label>
                  <select
                    className={styles.formSelect}
                    value={editForm.foodType || ''}
                    onChange={(e) => setEditForm((f) => ({ ...f, foodType: e.target.value }))}
                  >
                    {foodTypes.map((ft) => (
                      <option key={ft} value={ft}>{ft}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Packaging, Weight, Stock */}
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Packaging Size</label>
                  <input
                    className={styles.formInput}
                    value={editForm.packagingSize || ''}
                    onChange={(e) => setEditForm((f) => ({ ...f, packagingSize: e.target.value }))}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Weight (g)</label>
                  <input
                    className={styles.formInput}
                    type="number"
                    min={0}
                    value={editForm.weight ?? ''}
                    onChange={(e) => setEditForm((f) => ({ ...f, weight: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Stock</label>
                  <input
                    className={styles.formInput}
                    type="number"
                    min={0}
                    value={editForm.stock ?? ''}
                    onChange={(e) => setEditForm((f) => ({ ...f, stock: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              </div>

              {/* Tags */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Tags</label>
                <div className={styles.tagContainer}>
                  {(editForm.tags || []).map((tag, i) => (
                    <span key={i} className={styles.tag}>
                      {tag}
                      <button className={styles.tagRemove} onClick={() => removeTag(i)} aria-label={`Remove tag ${tag}`}>×</button>
                    </span>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                  <input
                    className={styles.formInput}
                    placeholder="Add a tag..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                  />
                  <button className={`${styles.actionBtn} ${styles.actionPrimary}`} onClick={addTag} type="button">Add</button>
                </div>
              </div>

              {/* Images */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Images ({(editForm.images || []).length}/5)</label>
                <div className={styles.imageGrid}>
                  {(editForm.images || []).map((img, i) => (
                    <div key={i} className={styles.imageThumb}>
                      <Image src={img} alt={`Product image ${i + 1}`} fill sizes="80px" style={{ objectFit: 'cover' }} />
                      <button className={styles.imageRemove} onClick={() => removeImage(i)} aria-label="Remove image">×</button>
                    </div>
                  ))}
                  {(editForm.images || []).length < 5 && (
                    <button
                      className={styles.imageAdd}
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      {uploading ? (
                        <span className={styles.spinner} />
                      ) : (
                        <>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                          <span style={{ fontSize: '11px', marginTop: '2px' }}>Upload</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  style={{ display: 'none' }}
                  onChange={handleImageUpload}
                />
              </div>

              {/* Nutrition Info */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Nutrition Info</label>
                <div className={styles.formRow}>
                  {(['calories', 'protein', 'carbs', 'fat', 'fiber'] as const).map((field) => (
                    <div key={field} className={styles.formGroup} style={{ flex: '1 1 0' }}>
                      <label className={styles.formLabelSmall}>{field.charAt(0).toUpperCase() + field.slice(1)}</label>
                      <input
                        className={styles.formInput}
                        placeholder="e.g. 120 kcal"
                        value={editForm.nutritionInfo?.[field] || ''}
                        onChange={(e) => updateNutrition(field, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Boolean Flags */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Flags</label>
                <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
                  {([
                    { key: 'isMustTry' as const, label: '🔥 Must Try' },
                    { key: 'isBestSeller' as const, label: '⭐ Best Seller' },
                    { key: 'isSpecialItem' as const, label: '✨ Special Item' },
                  ]).map(({ key, label }) => (
                    <label key={key} className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={!!editForm[key]}
                        onChange={(e) => setEditForm((f) => ({ ...f, [key]: e.target.checked }))}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button className={`${styles.actionBtn} ${styles.actionDanger}`} onClick={closeEditModal}>Cancel</button>
              <button
                className={`${styles.actionBtn} ${styles.actionPrimary}`}
                onClick={handleEditSave}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

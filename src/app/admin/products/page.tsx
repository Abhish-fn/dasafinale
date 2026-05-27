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
  variantGroup?: string;
  weight: number;
  nutritionInfo?: NutritionInfo;
}

// A variant edit row in the modal
interface VariantEdit {
  _id: string; // '' for new variants
  productId: string;
  packagingSize: string;
  price: number; // in rupees (display units)
  compareAtPrice: number;
  stock: number;
  weight: number;
  isNew?: boolean;
}

const categories = [
  '', 'Clay Pot Roasted Seeds & Superfoods', 'Protein & Energy Snacks',
  'Palm Jaggery Millet Biscuits', 'Traditional Millet Savoury Snacks',
  'Healthy Chips & Crisps', 'Premium Healthy Sweets',
];

const foodTypes = ['Seeds', 'Superfood', 'Biscuits', 'Snacks', 'Chips', 'Sweets', 'Protein'];

// Group products by variantGroup for the table display
interface ProductGroup {
  key: string;
  primary: Product;
  variants: Product[]; // other products in the same group (excluding primary)
}

function groupProducts(products: Product[]): (Product | ProductGroup)[] {
  const grouped = new Map<string, Product[]>();
  const standalone: Product[] = [];

  for (const p of products) {
    if (p.variantGroup) {
      const list = grouped.get(p.variantGroup) || [];
      list.push(p);
      grouped.set(p.variantGroup, list);
    } else {
      standalone.push(p);
    }
  }

  const result: (Product | ProductGroup)[] = [];

  // Add grouped products
  for (const [key, list] of grouped.entries()) {
    // Sort by price so cheapest (smallest) comes first
    list.sort((a, b) => a.price - b.price);
    result.push({ key, primary: list[0], variants: list.slice(1) });
  }

  // Add standalone products
  for (const p of standalone) {
    result.push(p);
  }

  return result;
}

function isGroup(item: Product | ProductGroup): item is ProductGroup {
  return 'primary' in item;
}

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

  // Variant editing state — all variants editable in one modal
  const [variantEdits, setVariantEdits] = useState<VariantEdit[]>([]);
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [savingVariant, setSavingVariant] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (category) params.set('category', category);
      params.set('limit', '100');
      params.set('showAll', 'true'); // Admin sees all variants
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

  // --- Fetch all variants for a variant group ---
  const fetchVariantsForModal = useCallback(async (product: Product) => {
    if (!product.variantGroup) {
      // Single product, no group — show just this one
      setVariantEdits([{
        _id: product._id,
        productId: product.productId,
        packagingSize: product.packagingSize,
        price: product.price / 100,
        compareAtPrice: product.compareAtPrice ? product.compareAtPrice / 100 : 0,
        stock: product.stock,
        weight: product.weight,
      }]);
      return;
    }
    setLoadingVariants(true);
    try {
      const res = await fetch(`/api/products/${product.productId}`);
      const data = await res.json();
      if (res.ok) {
        // Build variant edits from current product + its variants
        const allProducts = [data.product, ...(data.variants || [])];
        const edits: VariantEdit[] = allProducts.map((v: Record<string, unknown>) => ({
          _id: v._id as string,
          productId: v.productId as string,
          packagingSize: v.packagingSize as string,
          price: (v.price as number) / 100,
          compareAtPrice: v.compareAtPrice ? (v.compareAtPrice as number) / 100 : 0,
          stock: (v.stock as number) || 0,
          weight: (v.weight as number) || 0,
        }));
        // Sort by price (cheapest first)
        edits.sort((a, b) => a.price - b.price);
        setVariantEdits(edits);
      }
    } catch (err) {
      console.error('Failed to fetch variants:', err);
    } finally {
      setLoadingVariants(false);
    }
  }, []);

  // --- Open Edit Modal (for any product in a group) ---
  const openEditModal = useCallback((product: Product) => {
    setEditingProduct(product);
    setEditForm({
      title: product.title,
      description: product.description,
      price: product.price / 100,
      compareAtPrice: product.compareAtPrice ? product.compareAtPrice / 100 : undefined,
      category: product.category,
      foodType: product.foodType,
      packagingSize: product.packagingSize,
      variantGroup: product.variantGroup || '',
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
    fetchVariantsForModal(product);
  }, [fetchVariantsForModal]);

  const closeEditModal = () => {
    setEditingProduct(null);
    setEditForm({});
    setTagInput('');
    setVariantEdits([]);
  };

  // --- Save: update shared fields on primary product + each variant's individual fields ---
  const handleEditSave = async () => {
    if (!editingProduct) return;
    setSaving(true);
    try {
      // 1. Save shared fields on the primary (editingProduct)
      const updates: Record<string, unknown> = {};
      const fields: (keyof Product)[] = [
        'title', 'description', 'category',
        'foodType', 'images', 'tags',
        'isMustTry', 'isBestSeller', 'isSpecialItem', 'nutritionInfo',
      ];

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

      // 2. Save per-variant fields (packagingSize, price, compareAtPrice, stock, weight)
      // Find the variant edit that matches the primary product
      const primaryEdit = variantEdits.find(v => v._id === editingProduct._id);
      if (primaryEdit) {
        // Include per-variant fields in the primary save
        if (primaryEdit.packagingSize !== editingProduct.packagingSize) updates.packagingSize = primaryEdit.packagingSize;
        if (Math.round(primaryEdit.price * 100) !== editingProduct.price) updates.price = Math.round(primaryEdit.price * 100);
        const origCompare = editingProduct.compareAtPrice ? editingProduct.compareAtPrice / 100 : 0;
        if (primaryEdit.compareAtPrice !== origCompare) {
          updates.compareAtPrice = primaryEdit.compareAtPrice ? Math.round(primaryEdit.compareAtPrice * 100) : undefined;
        }
        if (primaryEdit.stock !== editingProduct.stock) updates.stock = primaryEdit.stock;
        if (primaryEdit.weight !== editingProduct.weight) updates.weight = primaryEdit.weight;
      } else {
        // Fallback: use form values
        if (JSON.stringify(editForm.price) !== JSON.stringify(editingProduct.price / 100)) {
          updates.price = Math.round((editForm.price as number) * 100);
        }
        if (JSON.stringify(editForm.compareAtPrice) !== JSON.stringify(editingProduct.compareAtPrice ? editingProduct.compareAtPrice / 100 : undefined)) {
          updates.compareAtPrice = editForm.compareAtPrice ? Math.round((editForm.compareAtPrice as number) * 100) : undefined;
        }
        if (editForm.packagingSize !== editingProduct.packagingSize) updates.packagingSize = editForm.packagingSize;
        if (editForm.stock !== editingProduct.stock) updates.stock = editForm.stock;
        if (editForm.weight !== editingProduct.weight) updates.weight = editForm.weight;
      }

      if (Object.keys(updates).length > 0) {
        const res = await fetch(`/api/products/${editingProduct.productId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to update primary product');
        }
      }

      // 3. Save other existing variants (non-primary, non-new)
      for (const ve of variantEdits) {
        if (ve._id === editingProduct._id || ve.isNew) continue;
        // Find the original product data to compare
        const original = products.find(p => p._id === ve._id);
        if (!original) continue;

        const vUpdates: Record<string, unknown> = {};
        if (ve.packagingSize !== original.packagingSize) vUpdates.packagingSize = ve.packagingSize;
        if (Math.round(ve.price * 100) !== original.price) vUpdates.price = Math.round(ve.price * 100);
        const origComp = original.compareAtPrice ? original.compareAtPrice / 100 : 0;
        if (ve.compareAtPrice !== origComp) {
          vUpdates.compareAtPrice = ve.compareAtPrice ? Math.round(ve.compareAtPrice * 100) : undefined;
        }
        if (ve.stock !== original.stock) vUpdates.stock = ve.stock;
        if (ve.weight !== original.weight) vUpdates.weight = ve.weight;

        if (Object.keys(vUpdates).length > 0) {
          const res = await fetch(`/api/products/${ve.productId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(vUpdates),
          });
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || `Failed to update variant ${ve.packagingSize}`);
          }
        }
      }

      // 4. Create new variants
      for (const ve of variantEdits) {
        if (!ve.isNew) continue;
        const variantGroup = editingProduct.variantGroup ||
          editingProduct.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

        // Set variantGroup on parent if it doesn't have one
        if (!editingProduct.variantGroup) {
          await fetch(`/api/products/${editingProduct.productId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ variantGroup }),
          });
          editingProduct.variantGroup = variantGroup;
        }

        const res = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: editingProduct.title,
            description: editingProduct.description,
            category: editingProduct.category,
            foodType: editingProduct.foodType,
            tags: editingProduct.tags || [],
            images: editingProduct.images || [],
            nutritionInfo: editingProduct.nutritionInfo,
            isMustTry: false,
            isBestSeller: false,
            isSpecialItem: false,
            variantGroup,
            packagingSize: ve.packagingSize,
            price: Math.round(ve.price * 100),
            compareAtPrice: ve.compareAtPrice ? Math.round(ve.compareAtPrice * 100) : undefined,
            stock: ve.stock,
            weight: ve.weight,
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to create variant');
        }
      }

      toast('All changes saved!', 'success');
      closeEditModal();
      fetchProducts();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  // --- Variant edit helpers ---
  const updateVariantEdit = (index: number, field: keyof VariantEdit, value: string | number) => {
    setVariantEdits(prev => prev.map((v, i) => i === index ? { ...v, [field]: value } : v));
  };

  const addNewVariant = () => {
    setVariantEdits(prev => [...prev, {
      _id: `new-${Date.now()}`,
      productId: '',
      packagingSize: '',
      price: 0,
      compareAtPrice: 0,
      stock: 0,
      weight: 0,
      isNew: true,
    }]);
  };

  const removeNewVariant = (index: number) => {
    setVariantEdits(prev => prev.filter((_, i) => i !== index));
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
    if (current.includes(tag)) { toast('Tag already exists', 'error'); return; }
    if (current.length >= 10) { toast('Maximum 10 tags allowed', 'error'); return; }
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

  const groupedItems = groupProducts(products);

  // --- Render a product row in the table ---
  const renderProductRow = (p: Product, isVariant: boolean, isLast: boolean) => (
    <tr key={p._id} style={isVariant ? { background: 'rgba(107,140,62,0.03)' } : undefined}>
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', paddingLeft: isVariant ? 'var(--space-6)' : 0 }}>
          {isVariant && (
            <span style={{ color: 'var(--color-gray-300)', fontSize: '14px', marginLeft: '-20px' }}>└</span>
          )}
          <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'var(--color-gray-100)', flexShrink: 0, position: 'relative' }}>
            {p.images[0] && <Image src={p.images[0]} alt="" fill sizes="40px" />}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{p.title}</div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-500)', display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
              {p.packagingSize}
              {p.variantGroup && !isVariant && (
                <span className={styles.badge} style={{ background: 'rgba(107,140,62,0.15)', color: 'var(--color-primary-600)', fontSize: '10px' }}>
                  📦 {p.variantGroup}
                </span>
              )}
              {isVariant && (
                <span style={{ fontSize: '10px', color: 'var(--color-gray-400)' }}>variant</span>
              )}
            </div>
          </div>
        </div>
      </td>
      <td style={{ fontSize: 'var(--text-xs)' }}>{isVariant ? '' : p.category}</td>
      <td style={{ fontWeight: 600 }}>{formatPrice(p.price)}</td>
      <td>
        <span style={{ fontWeight: 600, color: p.stock <= 10 ? 'var(--color-error)' : 'inherit' }}>
          {p.stock} {p.stock <= 10 && '⚠'}
        </span>
      </td>
      <td>{isVariant ? '' : p.salesCount}</td>
      <td>
        {!isVariant && (
          <div style={{ display: 'flex', gap: 'var(--space-1)', flexWrap: 'wrap' }}>
            <span className={styles.badge} style={{ background: p.isMustTry ? 'rgba(232,132,90,0.15)' : 'var(--color-gray-100)', color: p.isMustTry ? 'var(--color-accent-500)' : 'var(--color-gray-400)' }}>🔥</span>
            <span className={styles.badge} style={{ background: p.isBestSeller ? 'rgba(107,30,43,0.15)' : 'var(--color-gray-100)', color: p.isBestSeller ? 'var(--color-primary-600)' : 'var(--color-gray-400)' }}>⭐</span>
          </div>
        )}
      </td>
      <td>
        <span className={styles.badge} style={{ background: p.isActive ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: p.isActive ? 'var(--color-success)' : 'var(--color-error)' }}>
          {p.isActive ? 'Active' : 'Hidden'}
        </span>
      </td>
      <td>
        <button className={styles.editBtn} onClick={() => openEditModal(p)} title="Edit product" aria-label={`Edit ${p.title}`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
      </td>
    </tr>
  );

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-2xl)', fontWeight: 700, marginBottom: 'var(--space-6)' }}>
        Products
      </h1>

      <div className={styles.toolbar}>
        <input className={styles.searchInput} placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} />
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
              {groupedItems.map((item) => {
                if (isGroup(item)) {
                  const allInGroup = [item.primary, ...item.variants];
                  return allInGroup.map((p, idx) =>
                    renderProductRow(p, idx > 0, idx === allInGroup.length - 1)
                  );
                }
                return renderProductRow(item, false, false);
              })}
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
                <input className={styles.formInput} value={editForm.title || ''} onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))} />
              </div>

              {/* Description */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Description</label>
                <textarea className={styles.formTextarea} rows={3} value={editForm.description || ''} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} />
              </div>

              {/* Category & Food Type */}
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Category</label>
                  <select className={styles.formSelect} value={editForm.category || ''} onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))}>
                    {categories.filter(Boolean).map((c) => (<option key={c} value={c}>{c}</option>))}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Food Type</label>
                  <select className={styles.formSelect} value={editForm.foodType || ''} onChange={(e) => setEditForm((f) => ({ ...f, foodType: e.target.value }))}>
                    {foodTypes.map((ft) => (<option key={ft} value={ft}>{ft}</option>))}
                  </select>
                </div>
              </div>

              {/* ===== VARIANTS SECTION ===== */}
              <div style={{
                padding: 'var(--space-4)',
                background: 'rgba(107,140,62,0.04)',
                border: '1px solid rgba(107,140,62,0.15)',
                borderRadius: 'var(--radius-xl)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
                  <label className={styles.formLabel} style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--maroon)' }}>
                    📦 Pack Size Variants
                  </label>
                  {editingProduct?.variantGroup && (
                    <span style={{ fontSize: '10px', padding: '2px 8px', background: 'rgba(107,140,62,0.15)', borderRadius: 'var(--radius-full)', color: 'var(--color-gray-600)', fontWeight: 600 }}>
                      Group: {editingProduct.variantGroup}
                    </span>
                  )}
                </div>

                {loadingVariants ? (
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-500)', padding: 'var(--space-3)', textAlign: 'center' }}>
                    Loading variants...
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    {variantEdits.map((ve, idx) => (
                      <div key={ve._id} style={{
                        padding: 'var(--space-3)',
                        background: ve.isNew ? 'rgba(107,30,43,0.03)' : (ve._id === editingProduct._id ? 'rgba(107,30,43,0.06)' : 'white'),
                        border: ve.isNew ? '1.5px dashed var(--maroon)' : (ve._id === editingProduct._id ? '1px solid rgba(107,30,43,0.15)' : '1px solid var(--color-gray-200)'),
                        borderRadius: 'var(--radius-lg)',
                        position: 'relative',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                          <span style={{
                            fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.05em',
                            color: ve.isNew ? 'var(--maroon)' : (ve._id === editingProduct._id ? 'var(--maroon)' : 'var(--color-gray-500)'),
                          }}>
                            {ve.isNew ? '✨ New Variant' : (ve._id === editingProduct._id ? 'Primary' : 'Variant')}
                          </span>
                          {ve.isNew && (
                            <button
                              onClick={() => removeNewVariant(idx)}
                              style={{ fontSize: '12px', color: 'var(--color-error)', cursor: 'pointer', background: 'none', border: 'none', fontWeight: 600 }}
                            >
                              ✕ Remove
                            </button>
                          )}
                        </div>
                        <div className={styles.formRow}>
                          <div className={styles.formGroup}>
                            <label className={styles.formLabelSmall}>Packaging Size</label>
                            <input
                              className={styles.formInput}
                              value={ve.packagingSize}
                              placeholder="e.g. 250g"
                              onChange={(e) => updateVariantEdit(idx, 'packagingSize', e.target.value)}
                            />
                          </div>
                          <div className={styles.formGroup}>
                            <label className={styles.formLabelSmall}>Weight (g)</label>
                            <input
                              className={styles.formInput}
                              type="number" min={0}
                              value={ve.weight || ''}
                              onChange={(e) => updateVariantEdit(idx, 'weight', parseFloat(e.target.value) || 0)}
                            />
                          </div>
                        </div>
                        <div className={styles.formRow} style={{ marginTop: 'var(--space-2)' }}>
                          <div className={styles.formGroup}>
                            <label className={styles.formLabelSmall}>Price (₹)</label>
                            <input
                              className={styles.formInput}
                              type="number" min={0} step="0.01"
                              value={ve.price || ''}
                              onChange={(e) => updateVariantEdit(idx, 'price', parseFloat(e.target.value) || 0)}
                            />
                          </div>
                          <div className={styles.formGroup}>
                            <label className={styles.formLabelSmall}>Compare At Price (₹)</label>
                            <input
                              className={styles.formInput}
                              type="number" min={0} step="0.01"
                              value={ve.compareAtPrice || ''}
                              onChange={(e) => updateVariantEdit(idx, 'compareAtPrice', parseFloat(e.target.value) || 0)}
                            />
                          </div>
                          <div className={styles.formGroup}>
                            <label className={styles.formLabelSmall}>Stock</label>
                            <input
                              className={styles.formInput}
                              type="number" min={0}
                              value={ve.stock || ''}
                              onChange={(e) => updateVariantEdit(idx, 'stock', parseInt(e.target.value) || 0)}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add new variant button */}
                <button
                  onClick={addNewVariant}
                  style={{
                    width: '100%', padding: 'var(--space-3)', marginTop: 'var(--space-3)',
                    border: '2px dashed var(--color-gray-300)', borderRadius: 'var(--radius-md)',
                    background: 'transparent', color: 'var(--color-gray-500)',
                    fontSize: 'var(--text-sm)', fontWeight: 600, cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--maroon)'; e.currentTarget.style.color = 'var(--maroon)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-gray-300)'; e.currentTarget.style.color = 'var(--color-gray-500)'; }}
                >
                  + Add New Pack Size Variant
                </button>
                <div style={{ fontSize: '10px', color: 'var(--color-gray-500)', marginTop: 'var(--space-2)' }}>
                  New variants inherit title, description, category, images, and tags from the primary product.
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
                  <input className={styles.formInput} placeholder="Add a tag..." value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }} />
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
                    <button className={styles.imageAdd} onClick={() => fileInputRef.current?.click()} disabled={uploading}>
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
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" style={{ display: 'none' }} onChange={handleImageUpload} />
              </div>

              {/* Nutrition Info */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Nutrition Info</label>
                <div className={styles.formRow}>
                  {(['calories', 'protein', 'carbs', 'fat', 'fiber'] as const).map((field) => (
                    <div key={field} className={styles.formGroup} style={{ flex: '1 1 0' }}>
                      <label className={styles.formLabelSmall}>{field.charAt(0).toUpperCase() + field.slice(1)}</label>
                      <input className={styles.formInput} placeholder="e.g. 120 kcal" value={editForm.nutritionInfo?.[field] || ''} onChange={(e) => updateNutrition(field, e.target.value)} />
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
                      <input type="checkbox" checked={!!editForm[key]} onChange={(e) => setEditForm((f) => ({ ...f, [key]: e.target.checked }))} />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button className={`${styles.actionBtn} ${styles.actionDanger}`} onClick={closeEditModal}>Cancel</button>
              <button className={`${styles.actionBtn} ${styles.actionPrimary}`} onClick={handleEditSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save All Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

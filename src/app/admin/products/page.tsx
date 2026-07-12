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

interface Variant {
  _id: string;
  packagingSize: string;
  weight: number;
  price: number;
  compareAtPrice?: number;
  stock: number;
  salesCount: number;
}

interface Product {
  _id: string;
  productId: string; // human-readable "CPS001"
  title: string;
  description: string;
  category: string;
  tags: string[];
  isActive: boolean;
  isMustTry: boolean;
  isBestSeller: boolean;
  isSpecialItem: boolean;
  images: string[];
  variants: Variant[];
  nutritionInfo?: NutritionInfo;
  hsnCode?: string;
}

// A variant row in the edit/add modal (display units: rupees, not paisa)
interface VariantEditRow {
  _id: string; // existing variant _id, or 'new-xxx' for new ones
  packagingSize: string;
  price: number; // in rupees
  compareAtPrice: number; // in rupees (0 = not set)
  stock: number;
  weight: number;
  isNew?: boolean;
}

const categories = [
  '', 'Clay Pot Roasted Seeds & Superfoods', 'Protein & Energy Snacks',
  'Palm Jaggery Millet Biscuits', 'Traditional Millet Savoury Snacks',
  'Healthy Chips & Crisps', 'Premium Healthy Sweets',
];

const categoryDisplayNames: Record<string, string> = {
  'Clay Pot Roasted Seeds & Superfoods': 'Roasted Seeds',
  'Healthy Chips & Crisps': 'Healthy Chips',
  'Palm Jaggery Millet Biscuits': 'Jaggery Biscuits',
  'Premium Healthy Sweets': 'Healthy Sweets',
  'Protein & Energy Snacks': 'Protein Snacks',
  'Traditional Millet Savoury Snacks': 'Millet Snacks',
};

// Compress image on client side before uploading
function compressImage(file: File, maxSize = 1200, quality = 0.85): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxSize || height > maxSize) {
        const ratio = Math.min(maxSize / width, maxSize / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas not supported')); return; }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error('Compression failed')); return; }
          const compressed = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          resolve(compressed);
        },
        'image/jpeg',
        quality
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load image')); };
    img.src = url;
  });
}

// Helper: get the primary (cheapest) variant
function primaryVariant(p: Product): Variant | undefined {
  if (!p.variants || p.variants.length === 0) return undefined;
  return [...p.variants].sort((a, b) => a.price - b.price)[0];
}

// Helper: total sales across all variants
function totalSales(p: Product): number {
  return (p.variants || []).reduce((sum, v) => sum + (v.salesCount || 0), 0);
}

// Helper: check if any variant is low stock
function hasLowStock(p: Product): boolean {
  return (p.variants || []).some(v => v.stock <= 10);
}

export default function AdminProductsPage() {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'active' | 'hidden'>('active');

  // Edit modal state
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState<Partial<Product>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Add product modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState<{
    title: string; description: string; category: string;
    images: string[]; tags: string[];
    isMustTry: boolean; isBestSeller: boolean; isSpecialItem: boolean;
    nutritionInfo: NutritionInfo;
    hsnCode: string;
  }>({
    title: '', description: '', category: categories[1] || '',
    images: [], tags: [],
    isMustTry: false, isBestSeller: false, isSpecialItem: false,
    nutritionInfo: { calories: '', protein: '', carbs: '', fat: '', fiber: '' },
    hsnCode: '',
  });
  const [addVariants, setAddVariants] = useState<VariantEditRow[]>([{
    _id: 'new-1', packagingSize: '', price: 0, compareAtPrice: 0, stock: 0, weight: 0, isNew: true,
  }]);
  const [addTagInput, setAddTagInput] = useState('');
  const [addSaving, setAddSaving] = useState(false);
  const [addUploading, setAddUploading] = useState(false);
  const addFileInputRef = useRef<HTMLInputElement>(null);

  // Variant editing in edit modal
  const [variantEdits, setVariantEdits] = useState<VariantEditRow[]>([]);

  // Inline stock editing state — keyed by "productId:variantId"
  const [stockEdits, setStockEdits] = useState<Record<string, number>>({});
  const [savingStock, setSavingStock] = useState<string | null>(null);

  const stockKey = (p: Product, v: Variant) => `${p._id}:${v._id}`;
  const getStockValue = (p: Product, v: Variant) => stockEdits[stockKey(p, v)] !== undefined ? stockEdits[stockKey(p, v)] : v.stock;
  const setStockEdit = (p: Product, v: Variant, val: number) =>
    setStockEdits(prev => ({ ...prev, [stockKey(p, v)]: Math.max(0, val) }));

  const saveStock = async (p: Product, v: Variant) => {
    const key = stockKey(p, v);
    const newStock = stockEdits[key];
    if (newStock === undefined || newStock === v.stock) return;
    setSavingStock(key);
    try {
      // Update only this variant's stock within the embedded array
      const updatedVariants = p.variants.map(vr =>
        vr._id === v._id ? { ...vr, stock: newStock } : vr
      );
      const res = await fetch(`/api/products/${p.productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variants: updatedVariants }),
      });
      if (!res.ok) throw new Error('Failed');
      toast(`Stock updated to ${newStock}`, 'success');
      setStockEdits(prev => { const n = { ...prev }; delete n[key]; return n; });
      fetchProducts();
    } catch {
      toast('Failed to update stock', 'error');
    } finally {
      setSavingStock(null);
    }
  };

  // Toggle active/hidden
  const [toggleConfirm, setToggleConfirm] = useState<Product | null>(null);
  const [togglingActive, setTogglingActive] = useState(false);

  const confirmToggleActive = async () => {
    if (!toggleConfirm) return;
    setTogglingActive(true);
    try {
      const res = await fetch(`/api/products/${toggleConfirm.productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !toggleConfirm.isActive }),
      });
      if (!res.ok) throw new Error('Failed');
      toast(`Product ${toggleConfirm.isActive ? 'hidden' : 'activated'}!`, 'success');
      setToggleConfirm(null);
      fetchProducts();
    } catch {
      toast('Failed to update product', 'error');
    } finally {
      setTogglingActive(false);
    }
  };

  // Delete product
  const [deleteConfirm, setDeleteConfirm] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/products/${deleteConfirm.productId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed');
      }
      toast('Product permanently deleted', 'success');
      setDeleteConfirm(null);
      fetchProducts();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to delete product', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (category) params.set('category', category);
      params.set('limit', '100');
      params.set('showAll', 'true');
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

  // --- Open Edit Modal ---
  const openEditModal = useCallback((product: Product) => {
    setEditingProduct(product);
    setEditForm({
      title: product.title,
      description: product.description,
      category: product.category,
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
    // Build variant edit rows from embedded variants (convert paisa → rupees)
    const sorted = [...product.variants].sort((a, b) => a.price - b.price);
    setVariantEdits(sorted.map(v => ({
      _id: v._id,
      packagingSize: v.packagingSize,
      price: v.price / 100,
      compareAtPrice: v.compareAtPrice ? v.compareAtPrice / 100 : 0,
      stock: v.stock,
      weight: v.weight,
    })));
  }, []);

  const closeEditModal = () => {
    setEditingProduct(null);
    setEditForm({});
    setTagInput('');
    setVariantEdits([]);
  };

  // --- Save product with embedded variants ---
  const handleEditSave = async () => {
    if (!editingProduct) return;
    setSaving(true);
    try {
      // Build updates object — only changed fields
      const updates: Record<string, unknown> = {};
      const fields: (keyof Product)[] = [
        'title', 'description', 'category',
        'images', 'tags',
        'isMustTry', 'isBestSeller', 'isSpecialItem', 'nutritionInfo',
      ];

      for (const field of fields) {
        const newVal = editForm[field];
        const oldVal = editingProduct[field];
        if (JSON.stringify(newVal) !== JSON.stringify(oldVal)) {
          updates[field] = newVal;
        }
      }

      // Build the full variants array (convert rupees → paisa)
      const newVariants = variantEdits.map(ve => ({
        ...(ve.isNew ? {} : { _id: ve._id }),
        packagingSize: ve.packagingSize,
        weight: ve.weight,
        price: Math.round(ve.price * 100),
        compareAtPrice: ve.compareAtPrice ? Math.round(ve.compareAtPrice * 100) : undefined,
        stock: ve.stock,
      }));

      // Always send variants if any variant was edited or added/removed
      const origVariantsSorted = [...editingProduct.variants].sort((a, b) => a.price - b.price);
      const origForCompare = origVariantsSorted.map(v => ({
        _id: v._id,
        packagingSize: v.packagingSize,
        weight: v.weight,
        price: v.price,
        compareAtPrice: v.compareAtPrice || undefined,
        stock: v.stock,
      }));
      const newForCompare = newVariants.map(v => ({
        _id: (v as Record<string, unknown>)._id,
        packagingSize: v.packagingSize,
        weight: v.weight,
        price: v.price,
        compareAtPrice: v.compareAtPrice || undefined,
        stock: v.stock,
      }));
      if (JSON.stringify(origForCompare) !== JSON.stringify(newForCompare)) {
        updates.variants = newVariants;
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
        throw new Error(data.error || 'Failed to save');
      }

      toast('Product saved!', 'success');
      closeEditModal();
      fetchProducts();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  // --- Variant edit helpers ---
  const updateVariantEdit = (index: number, field: keyof VariantEditRow, value: string | number) => {
    setVariantEdits(prev => prev.map((v, i) => i === index ? { ...v, [field]: value } : v));
  };

  const addNewVariant = () => {
    setVariantEdits(prev => [...prev, {
      _id: `new-${Date.now()}`,
      packagingSize: '',
      price: 0,
      compareAtPrice: 0,
      stock: 0,
      weight: 0,
      isNew: true,
    }]);
  };

  const removeVariant = (index: number) => {
    setVariantEdits(prev => {
      if (prev.length <= 1) {
        toast('Product must have at least one variant', 'error');
        return prev;
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const currentImages = editForm.images || [];
    if (currentImages.length >= 5) { toast('Maximum 5 images allowed', 'error'); return; }
    setUploading(true);
    try {
      const compressed = await compressImage(file);
      const formData = new FormData();
      formData.append('file', compressed);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setEditForm((prev) => ({ ...prev, images: [...(prev.images || []), data.url] }));
      toast('Image uploaded', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to upload image', 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    setEditForm((prev) => ({ ...prev, images: (prev.images || []).filter((_, i) => i !== index) }));
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
    setEditForm((prev) => ({ ...prev, tags: (prev.tags || []).filter((_, i) => i !== index) }));
  };

  const updateNutrition = (field: keyof NutritionInfo, value: string) => {
    setEditForm((prev) => ({ ...prev, nutritionInfo: { ...(prev.nutritionInfo || {}), [field]: value } }));
  };

  // --- Add Product Modal ---
  const openAddModal = () => {
    setAddForm({
      title: '', description: '', category: categories[1] || '',
      images: [], tags: [],
      isMustTry: false, isBestSeller: false, isSpecialItem: false,
      nutritionInfo: { calories: '', protein: '', carbs: '', fat: '', fiber: '' },
      hsnCode: '',
    });
    setAddVariants([{
      _id: 'new-1', packagingSize: '', price: 0, compareAtPrice: 0, stock: 0, weight: 0, isNew: true,
    }]);
    setAddTagInput('');
    setShowAddModal(true);
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setAddTagInput('');
  };

  const handleAddImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const currentImages = addForm.images || [];
    if (currentImages.length >= 5) { toast('Maximum 5 images allowed', 'error'); return; }
    setAddUploading(true);
    try {
      const compressed = await compressImage(file);
      const formData = new FormData();
      formData.append('file', compressed);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setAddForm((prev) => ({ ...prev, images: [...prev.images, data.url] }));
      toast('Image uploaded', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to upload image', 'error');
    } finally {
      setAddUploading(false);
      if (addFileInputRef.current) addFileInputRef.current.value = '';
    }
  };

  const removeAddImage = (index: number) => {
    setAddForm((prev) => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
  };

  const addAddTag = () => {
    const tag = addTagInput.trim();
    if (!tag) return;
    if (addForm.tags.includes(tag)) { toast('Tag already exists', 'error'); return; }
    if (addForm.tags.length >= 10) { toast('Maximum 10 tags allowed', 'error'); return; }
    setAddForm((prev) => ({ ...prev, tags: [...prev.tags, tag] }));
    setAddTagInput('');
  };

  const removeAddTag = (index: number) => {
    setAddForm((prev) => ({ ...prev, tags: prev.tags.filter((_, i) => i !== index) }));
  };

  const updateAddNutrition = (field: keyof NutritionInfo, value: string) => {
    setAddForm((prev) => ({ ...prev, nutritionInfo: { ...prev.nutritionInfo, [field]: value } }));
  };

  const handleCreateProduct = async () => {
    if (!addForm.title?.trim()) { toast('Title is required', 'error'); return; }
    if (!addForm.description?.trim() || addForm.description.length < 10) { toast('Description must be at least 10 characters', 'error'); return; }
    if (addVariants.length === 0) { toast('At least one variant is required', 'error'); return; }
    for (const v of addVariants) {
      if (!v.packagingSize.trim()) { toast('All variants need a packaging size', 'error'); return; }
      if (v.price <= 0) { toast('All variants need a price > 0', 'error'); return; }
      if (v.weight <= 0) { toast('All variants need a weight > 0', 'error'); return; }
    }

    setAddSaving(true);
    try {
      const payload = {
        title: addForm.title,
        description: addForm.description,
        category: addForm.category,
        images: addForm.images,
        tags: addForm.tags,
        isMustTry: addForm.isMustTry,
        isBestSeller: addForm.isBestSeller,
        isSpecialItem: addForm.isSpecialItem,
        nutritionInfo: addForm.nutritionInfo,
        hsnCode: addForm.hsnCode,
        variants: addVariants.map(v => ({
          packagingSize: v.packagingSize,
          weight: v.weight,
          price: Math.round(v.price * 100),
          compareAtPrice: v.compareAtPrice ? Math.round(v.compareAtPrice * 100) : undefined,
          stock: v.stock,
        })),
      };

      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create product');
      }
      toast('Product created successfully!', 'success');
      closeAddModal();
      fetchProducts();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to create product', 'error');
    } finally {
      setAddSaving(false);
    }
  };

  const filteredProducts = visibilityFilter === 'all' ? products : products.filter(p => visibilityFilter === 'active' ? p.isActive : !p.isActive);

  // --- Render a variant row for the table ---
  const renderVariantRow = (p: Product, v: Variant, vIdx: number, isLast: boolean) => {
    const key = stockKey(p, v);
    return (
      <tr key={`${p._id}-${v._id}`} style={vIdx > 0 ? { background: 'rgba(107,140,62,0.03)' } : undefined}>
        <td>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', paddingLeft: vIdx > 0 ? 'var(--space-6)' : 0 }}>
            {vIdx > 0 && (
              <span style={{ color: 'var(--color-gray-300)', fontSize: '14px', marginLeft: '-20px' }}>└</span>
            )}
            {vIdx === 0 ? (
              <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'var(--color-gray-100)', flexShrink: 0, position: 'relative' }}>
                {p.images[0] && <Image src={p.images[0]} alt="" fill sizes="40px" />}
              </div>
            ) : (
              <div style={{ width: 40 }} />
            )}
            <div>
              {vIdx === 0 && <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{p.title}</div>}
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-500)', display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                {v.packagingSize}
                {vIdx > 0 && (
                  <span style={{ fontSize: '10px', color: 'var(--color-gray-400)' }}>variant</span>
                )}
                {vIdx === 0 && p.variants.length > 1 && (
                  <span className={styles.badge} style={{ background: 'rgba(107,140,62,0.15)', color: 'var(--color-primary-600)', fontSize: '10px' }}>
                    📦 {p.variants.length} sizes
                  </span>
                )}
              </div>
            </div>
          </div>
        </td>
        <td style={{ fontSize: 'var(--text-xs)', fontFamily: 'monospace', color: 'var(--color-gray-600)', letterSpacing: '0.02em' }}>{vIdx === 0 ? p.productId : ''}</td>
        <td style={{ fontSize: 'var(--text-xs)' }}>{vIdx === 0 ? p.category : ''}</td>
        <td style={{ fontWeight: 600 }}>{formatPrice(v.price)}</td>
        <td>
          <span style={{ fontWeight: 600, color: v.stock <= 10 ? 'var(--color-error)' : 'inherit' }}>
            {v.stock} {v.stock <= 10 && '⚠'}
          </span>
        </td>
        <td>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={() => setStockEdit(p, v, getStockValue(p, v) - 1)}
              style={{
                width: 28, height: 28, borderRadius: 'var(--radius-md)', border: '1px solid var(--color-gray-300)',
                background: 'white', cursor: 'pointer', fontSize: '16px', fontWeight: 700, color: 'var(--color-gray-600)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
              disabled={getStockValue(p, v) <= 0}
            >−</button>
            <input
              type="number"
              min={0}
              value={getStockValue(p, v)}
              onChange={(e) => setStockEdit(p, v, parseInt(e.target.value) || 0)}
              style={{
                width: 56, height: 28, textAlign: 'center', border: '1px solid var(--color-gray-300)',
                borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', fontWeight: 600,
                background: stockEdits[key] !== undefined ? 'rgba(198, 40, 40,0.04)' : 'white',
              }}
            />
            <button
              onClick={() => setStockEdit(p, v, getStockValue(p, v) + 1)}
              style={{
                width: 28, height: 28, borderRadius: 'var(--radius-md)', border: '1px solid var(--color-gray-300)',
                background: 'white', cursor: 'pointer', fontSize: '16px', fontWeight: 700, color: 'var(--color-gray-600)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >+</button>
            <button
              onClick={() => saveStock(p, v)}
              disabled={stockEdits[key] === undefined || savingStock === key}
              style={{
                padding: '4px 10px', fontSize: 'var(--text-xs)', fontWeight: 600,
                borderRadius: 'var(--radius-md)', cursor: 'pointer',
                border: '1px solid var(--color-gray-200)',
                background: stockEdits[key] !== undefined ? 'var(--red)' : 'var(--color-gray-100)',
                color: stockEdits[key] !== undefined ? 'white' : 'var(--color-gray-400)',
                transition: 'all var(--transition-fast)',
                opacity: savingStock === key ? 0.6 : 1,
              }}
            >
              {savingStock === key ? '...' : 'Save'}
            </button>
          </div>
        </td>
        <td>{v.salesCount || 0}</td>
        <td>
          {vIdx === 0 && (
            <div style={{ display: 'flex', gap: 'var(--space-1)', flexWrap: 'wrap' }}>
              <span className={styles.badge} style={{ background: p.isMustTry ? 'rgba(232,132,90,0.15)' : 'var(--color-gray-100)', color: p.isMustTry ? 'var(--color-accent-500)' : 'var(--color-gray-400)' }}>🔥</span>
              <span className={styles.badge} style={{ background: p.isBestSeller ? 'rgba(198, 40, 40,0.15)' : 'var(--color-gray-100)', color: p.isBestSeller ? 'var(--color-primary-600)' : 'var(--color-gray-400)' }}>⭐</span>
            </div>
          )}
        </td>
        <td>
          {vIdx === 0 && (
            <button
              onClick={() => setToggleConfirm(p)}
              className={styles.badge}
              style={{
                background: p.isActive ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                color: p.isActive ? 'var(--color-success)' : 'var(--color-error)',
                cursor: 'pointer', border: 'none',
              }}
            >
              {p.isActive ? 'Active' : 'Hidden'}
            </button>
          )}
        </td>
        <td>
          {vIdx === 0 && (
            <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
              <button className={styles.editBtn} onClick={() => openEditModal(p)} title="Edit product" aria-label={`Edit ${p.title}`}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
              <button className={styles.editBtn} onClick={() => setDeleteConfirm(p)} title="Delete product" aria-label={`Delete ${p.title}`}
                style={{ color: 'var(--color-error)' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </div>
          )}
        </td>
      </tr>
    );
  };

  // --- Variant editor section used in both edit and add modals ---
  const renderVariantEditor = (
    variants: VariantEditRow[],
    setVariants: (fn: (prev: VariantEditRow[]) => VariantEditRow[]) => void,
    canRemoveExisting = false
  ) => (
    <div style={{
      padding: 'var(--space-4)',
      background: 'rgba(107,140,62,0.04)',
      border: '1px solid rgba(107,140,62,0.15)',
      borderRadius: 'var(--radius-xl)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
        <label className={styles.formLabel} style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--red)' }}>
          📦 Pack Size Variants
        </label>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {variants.map((ve, idx) => (
          <div key={ve._id} style={{
            padding: 'var(--space-3)',
            background: ve.isNew ? 'rgba(198, 40, 40,0.03)' : 'white',
            border: ve.isNew ? '1.5px dashed var(--red)' : '1px solid var(--color-gray-200)',
            borderRadius: 'var(--radius-lg)',
            position: 'relative',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
              <span style={{
                fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.05em',
                color: ve.isNew ? 'var(--red)' : 'var(--color-gray-500)',
              }}>
                {ve.isNew ? '✨ New Variant' : `Variant ${idx + 1}`}
              </span>
              {(ve.isNew || canRemoveExisting) && variants.length > 1 && (
                <button
                  onClick={() => setVariants(prev => prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx))}
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
                  onChange={(e) => setVariants(prev => prev.map((v, i) => i === idx ? { ...v, packagingSize: e.target.value } : v))}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabelSmall}>Weight (g)</label>
                <input
                  className={styles.formInput}
                  type="number" min={0}
                  value={ve.weight || ''}
                  onChange={(e) => setVariants(prev => prev.map((v, i) => i === idx ? { ...v, weight: parseFloat(e.target.value) || 0 } : v))}
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
                  onChange={(e) => setVariants(prev => prev.map((v, i) => i === idx ? { ...v, price: parseFloat(e.target.value) || 0 } : v))}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabelSmall}>Compare At Price (₹)</label>
                <input
                  className={styles.formInput}
                  type="number" min={0} step="0.01"
                  value={ve.compareAtPrice || ''}
                  onChange={(e) => setVariants(prev => prev.map((v, i) => i === idx ? { ...v, compareAtPrice: parseFloat(e.target.value) || 0 } : v))}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabelSmall}>Stock</label>
                <input
                  className={styles.formInput}
                  type="number" min={0}
                  value={ve.stock || ''}
                  onChange={(e) => setVariants(prev => prev.map((v, i) => i === idx ? { ...v, stock: parseInt(e.target.value) || 0 } : v))}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={() => setVariants(prev => [...prev, {
          _id: `new-${Date.now()}`, packagingSize: '', price: 0, compareAtPrice: 0, stock: 0, weight: 0, isNew: true,
        }])}
        style={{
          width: '100%', padding: 'var(--space-3)', marginTop: 'var(--space-3)',
          border: '2px dashed var(--color-gray-300)', borderRadius: 'var(--radius-md)',
          background: 'transparent', color: 'var(--color-gray-500)',
          fontSize: 'var(--text-sm)', fontWeight: 600, cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--red)'; e.currentTarget.style.color = 'var(--red)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-gray-300)'; e.currentTarget.style.color = 'var(--color-gray-500)'; }}
      >
        + Add New Pack Size Variant
      </button>
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-2xl)', fontWeight: 700 }}>
          Products
        </h1>
        <button
          className={`${styles.actionBtn} ${styles.actionPrimary}`}
          style={{ padding: 'var(--space-2) var(--space-4)', fontSize: 'var(--text-sm)' }}
          onClick={openAddModal}
        >
          + Add Product
        </button>
      </div>

      <div className={styles.toolbar}>
        <input className={styles.searchInput} placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className={styles.filterSelect} value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All Categories</option>
          {categories.filter(Boolean).map((c) => (
            <option key={c} value={c}>{categoryDisplayNames[c] || c}</option>
          ))}
        </select>
        <select className={styles.filterSelect} value={visibilityFilter} onChange={(e) => setVisibilityFilter(e.target.value as 'all' | 'active' | 'hidden')}>
          <option value="all">All Products</option>
          <option value="active">Active Only</option>
          <option value="hidden">Hidden Only</option>
        </select>
      </div>

      <div className={styles.sectionCard}>
        {loading ? (
          <div className={styles.empty}>Loading...</div>
        ) : products.length === 0 ? (
          <div className={styles.empty}>No products found</div>
        ) : (
          <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Product</th>
                <th>ID</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Update</th>
                <th>Sales</th>
                <th>Flags</th>
                <th>Active</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => {
                // Render one row per variant, grouped under the product
                const sorted = [...product.variants].sort((a, b) => a.price - b.price);
                return sorted.map((v, vIdx) =>
                  renderVariantRow(product, v, vIdx, vIdx === sorted.length - 1)
                );
              })}
            </tbody>
          </table>
          </div>
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
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Title</label>
                <input className={styles.formInput} value={editForm.title || ''} onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Description</label>
                <textarea className={styles.formTextarea} rows={3} value={editForm.description || ''} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Category</label>
                <select className={styles.formSelect} value={editForm.category || ''} onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))}>
                  {categories.filter(Boolean).map((c) => (<option key={c} value={c}>{categoryDisplayNames[c] || c}</option>))}
                </select>
              </div>

              {renderVariantEditor(variantEdits, setVariantEdits, true)}

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

      {/* ===== Add Product Modal ===== */}
      {showAddModal && (
        <div className={styles.modalOverlay} onClick={closeAddModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Add New Product</h2>
              <button className={styles.modalClose} onClick={closeAddModal} aria-label="Close modal">✕</button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Title *</label>
                <input className={styles.formInput} value={addForm.title} onChange={(e) => setAddForm((f) => ({ ...f, title: e.target.value }))} placeholder="Product name" />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Description *</label>
                <textarea className={styles.formTextarea} rows={3} value={addForm.description} onChange={(e) => setAddForm((f) => ({ ...f, description: e.target.value }))} placeholder="Product description (min 10 characters)" />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Category *</label>
                <select className={styles.formSelect} value={addForm.category} onChange={(e) => setAddForm((f) => ({ ...f, category: e.target.value }))}>
                  {categories.filter(Boolean).map((c) => (<option key={c} value={c}>{categoryDisplayNames[c] || c}</option>))}
                </select>
              </div>

              {renderVariantEditor(addVariants, setAddVariants)}

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Tags</label>
                <div className={styles.tagContainer}>
                  {addForm.tags.map((tag, i) => (
                    <span key={i} className={styles.tag}>
                      {tag}
                      <button className={styles.tagRemove} onClick={() => removeAddTag(i)} aria-label={`Remove tag ${tag}`}>×</button>
                    </span>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                  <input className={styles.formInput} placeholder="Add a tag..." value={addTagInput} onChange={(e) => setAddTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addAddTag(); } }} />
                  <button className={`${styles.actionBtn} ${styles.actionPrimary}`} onClick={addAddTag} type="button">Add</button>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Images ({addForm.images.length}/5)</label>
                <div className={styles.imageGrid}>
                  {addForm.images.map((img, i) => (
                    <div key={i} className={styles.imageThumb}>
                      <Image src={img} alt={`Product image ${i + 1}`} fill sizes="80px" style={{ objectFit: 'cover' }} />
                      <button className={styles.imageRemove} onClick={() => removeAddImage(i)} aria-label="Remove image">×</button>
                    </div>
                  ))}
                  {addForm.images.length < 5 && (
                    <button className={styles.imageAdd} onClick={() => addFileInputRef.current?.click()} disabled={addUploading}>
                      {addUploading ? (
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
                <input ref={addFileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" style={{ display: 'none' }} onChange={handleAddImageUpload} />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Nutrition Info</label>
                <div className={styles.formRow}>
                  {(['calories', 'protein', 'carbs', 'fat', 'fiber'] as const).map((field) => (
                    <div key={field} className={styles.formGroup} style={{ flex: '1 1 0' }}>
                      <label className={styles.formLabelSmall}>{field.charAt(0).toUpperCase() + field.slice(1)}</label>
                      <input className={styles.formInput} placeholder="e.g. 120 kcal" value={addForm.nutritionInfo[field] || ''} onChange={(e) => updateAddNutrition(field, e.target.value)} />
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Flags</label>
                <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
                  {([
                    { key: 'isMustTry' as const, label: '🔥 Must Try' },
                    { key: 'isBestSeller' as const, label: '⭐ Best Seller' },
                    { key: 'isSpecialItem' as const, label: '✨ Special Item' },
                  ]).map(({ key, label }) => (
                    <label key={key} className={styles.checkboxLabel}>
                      <input type="checkbox" checked={addForm[key]} onChange={(e) => setAddForm((f) => ({ ...f, [key]: e.target.checked }))} />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button className={`${styles.actionBtn} ${styles.actionDanger}`} onClick={closeAddModal}>Cancel</button>
              <button className={`${styles.actionBtn} ${styles.actionPrimary}`} onClick={handleCreateProduct} disabled={addSaving}>
                {addSaving ? 'Creating...' : 'Create Product'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toggle Active Confirmation Modal */}
      {toggleConfirm && (
        <div className={styles.modalOverlay} onClick={() => setToggleConfirm(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                {toggleConfirm.isActive ? 'Hide Product?' : 'Activate Product?'}
              </h2>
              <button className={styles.modalClose} onClick={() => setToggleConfirm(null)}>✕</button>
            </div>
            <div className={styles.modalBody} style={{ textAlign: 'center', gap: 'var(--space-3)' }}>
              <div style={{ fontSize: '40px' }}>{toggleConfirm.isActive ? '🙈' : '✅'}</div>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-600)', lineHeight: 1.6 }}>
                {toggleConfirm.isActive
                  ? <>Are you sure you want to hide <strong>{toggleConfirm.title}</strong>? It will no longer appear on the store.</>
                  : <>Activate <strong>{toggleConfirm.title}</strong>? It will be visible on the store again.</>
                }
              </p>
            </div>
            <div className={styles.modalFooter}>
              <button
                className={`${styles.actionBtn}`}
                style={{ border: '1px solid var(--color-gray-300)', color: 'var(--color-gray-600)', background: 'transparent' }}
                onClick={() => setToggleConfirm(null)}
              >Cancel</button>
              <button
                className={`${styles.actionBtn}`}
                style={{
                  background: toggleConfirm.isActive ? 'var(--color-error)' : 'var(--color-success)',
                  color: 'white', border: 'none',
                }}
                onClick={confirmToggleActive}
                disabled={togglingActive}
              >
                {togglingActive ? 'Updating...' : toggleConfirm.isActive ? 'Yes, Hide It' : 'Yes, Activate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Product Confirmation Modal */}
      {deleteConfirm && (
        <div className={styles.modalOverlay} onClick={() => setDeleteConfirm(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Delete Product?</h2>
              <button className={styles.modalClose} onClick={() => setDeleteConfirm(null)}>✕</button>
            </div>
            <div className={styles.modalBody} style={{ textAlign: 'center', gap: 'var(--space-3)' }}>
              <div style={{ fontSize: '40px' }}>🗑️</div>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-600)', lineHeight: 1.6 }}>
                Permanently delete <strong>{deleteConfirm.title}</strong> ({deleteConfirm.variants.map(v => v.packagingSize).join(', ')})?
              </p>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-error)', fontWeight: 600 }}>
                This will remove its images, reviews, and clear it from all carts & wishlists. This action cannot be undone.
              </p>
            </div>
            <div className={styles.modalFooter}>
              <button
                className={`${styles.actionBtn}`}
                style={{ border: '1px solid var(--color-gray-300)', color: 'var(--color-gray-600)', background: 'transparent' }}
                onClick={() => setDeleteConfirm(null)}
              >Cancel</button>
              <button
                className={`${styles.actionBtn}`}
                style={{ background: 'var(--color-error)', color: 'white', border: 'none' }}
                onClick={confirmDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Yes, Delete Forever'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

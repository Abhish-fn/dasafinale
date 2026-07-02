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

const categoryDisplayNames: Record<string, string> = {
  'Clay Pot Roasted Seeds & Superfoods': 'Roasted Seeds',
  'Healthy Chips & Crisps': 'Healthy Chips',
  'Palm Jaggery Millet Biscuits': 'Jaggery Biscuits',
  'Premium Healthy Sweets': 'Healthy Sweets',
  'Protein & Energy Snacks': 'Protein Snacks',
  'Traditional Millet Savoury Snacks': 'Millet Snacks',
};


// Compress image on client side before uploading to avoid server body size limits
function compressImage(file: File, maxSize = 1200, quality = 0.85): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      // Scale down if either dimension exceeds maxSize
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
  const [addForm, setAddForm] = useState<Partial<Product>>({
    title: '', description: '', category: categories[1],
    packagingSize: '', weight: 0, price: 0, compareAtPrice: undefined,
    stock: 0, images: [], tags: [],
    isMustTry: false, isBestSeller: false, isSpecialItem: false,
    nutritionInfo: { calories: '', protein: '', carbs: '', fat: '', fiber: '' },
  });
  const [addTagInput, setAddTagInput] = useState('');
  const [addSaving, setAddSaving] = useState(false);
  const [addUploading, setAddUploading] = useState(false);
  const addFileInputRef = useRef<HTMLInputElement>(null);

  // Variant editing state — all variants editable in one modal
  const [variantEdits, setVariantEdits] = useState<VariantEdit[]>([]);
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [savingVariant, setSavingVariant] = useState(false);

  // Inline stock editing state
  const [stockEdits, setStockEdits] = useState<Record<string, number>>({});
  const [savingStock, setSavingStock] = useState<string | null>(null);

  const getStockValue = (p: Product) => stockEdits[p._id] !== undefined ? stockEdits[p._id] : p.stock;
  const setStockEdit = (id: string, val: number) => setStockEdits(prev => ({ ...prev, [id]: Math.max(0, val) }));

  const saveStock = async (p: Product) => {
    const newStock = getStockValue(p);
    if (newStock === p.stock) return;
    setSavingStock(p._id);
    try {
      const res = await fetch(`/api/products/${p.productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock: newStock }),
      });
      if (!res.ok) throw new Error('Failed');
      toast(`Stock updated to ${newStock}`, 'success');
      setStockEdits(prev => { const n = { ...prev }; delete n[p._id]; return n; });
      fetchProducts();
    } catch {
      toast('Failed to update stock', 'error');
    } finally {
      setSavingStock(null);
    }
  };

  // Toggle active/hidden with confirmation
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

  // Delete product with confirmation
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
        'images', 'tags',
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

        // Use editForm.images (current form state) so freshly-uploaded images are included
        const sharedImages = editForm.images?.length ? editForm.images : editingProduct.images || [];

        const res = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: editingProduct.title,
            description: editingProduct.description,
            category: editingProduct.category,
            tags: editingProduct.tags || [],
            images: sharedImages,
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

      // 5. Sync images to all sibling variants:
      //    - Always if images were changed in this save
      //    - Also if a sibling currently has no images (backfills existing empty variants)
      const currentImages = (updates.images as string[] | undefined) ?? editForm.images ?? editingProduct.images ?? [];
      const imagesChanged = updates.images !== undefined;
      if (currentImages.length > 0 && editingProduct.variantGroup) {
        for (const ve of variantEdits) {
          if (ve._id === editingProduct._id || ve.isNew) continue;
          const siblingProduct = products.find(p => p._id === ve._id);
          const siblingHasNoImages = !siblingProduct?.images?.length;
          if (imagesChanged || siblingHasNoImages) {
            await fetch(`/api/products/${ve.productId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ images: currentImages }),
            });
          }
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

  // --- Add Product Modal Logic ---
  const openAddModal = () => {
    setAddForm({
      title: '', description: '', category: categories[1],
      packagingSize: '', weight: 0, price: 0, compareAtPrice: undefined,
      stock: 0, images: [], tags: [],
      isMustTry: false, isBestSeller: false, isSpecialItem: false,
      nutritionInfo: { calories: '', protein: '', carbs: '', fat: '', fiber: '' },
    });
    setAddTagInput('');
    setShowAddModal(true);
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setAddForm({});
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
      setAddForm((prev) => ({ ...prev, images: [...(prev.images || []), data.url] }));
      toast('Image uploaded', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to upload image', 'error');
    } finally {
      setAddUploading(false);
      if (addFileInputRef.current) addFileInputRef.current.value = '';
    }
  };

  const removeAddImage = (index: number) => {
    setAddForm((prev) => ({ ...prev, images: (prev.images || []).filter((_, i) => i !== index) }));
  };

  const addAddTag = () => {
    const tag = addTagInput.trim();
    if (!tag) return;
    const current = addForm.tags || [];
    if (current.includes(tag)) { toast('Tag already exists', 'error'); return; }
    if (current.length >= 10) { toast('Maximum 10 tags allowed', 'error'); return; }
    setAddForm((prev) => ({ ...prev, tags: [...(prev.tags || []), tag] }));
    setAddTagInput('');
  };

  const removeAddTag = (index: number) => {
    setAddForm((prev) => ({ ...prev, tags: (prev.tags || []).filter((_, i) => i !== index) }));
  };

  const updateAddNutrition = (field: keyof NutritionInfo, value: string) => {
    setAddForm((prev) => ({ ...prev, nutritionInfo: { ...(prev.nutritionInfo || {}), [field]: value } }));
  };

  const handleCreateProduct = async () => {
    if (!addForm.title?.trim()) { toast('Title is required', 'error'); return; }
    if (!addForm.description?.trim() || (addForm.description?.trim().length || 0) < 10) { toast('Description must be at least 10 characters', 'error'); return; }
    if (!addForm.packagingSize?.trim()) { toast('Packaging size is required', 'error'); return; }
    if (!addForm.price || addForm.price <= 0) { toast('Price must be greater than 0', 'error'); return; }
    if (!addForm.weight || addForm.weight <= 0) { toast('Weight must be greater than 0', 'error'); return; }

    setAddSaving(true);
    try {
      const payload = {
        title: addForm.title,
        description: addForm.description,
        category: addForm.category,
        packagingSize: addForm.packagingSize,
        weight: addForm.weight,
        price: Math.round((addForm.price as number) * 100),
        compareAtPrice: addForm.compareAtPrice ? Math.round((addForm.compareAtPrice as number) * 100) : undefined,
        stock: addForm.stock || 0,
        images: addForm.images || [],
        tags: addForm.tags || [],
        isMustTry: addForm.isMustTry || false,
        isBestSeller: addForm.isBestSeller || false,
        isSpecialItem: addForm.isSpecialItem || false,
        nutritionInfo: addForm.nutritionInfo,
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
  const groupedItems = groupProducts(filteredProducts);

  // --- Render a product row in the table ---
  const renderProductRow = (p: Product, isVariant: boolean, isLast: boolean, fallbackImage?: string) => {
    const displayImage = p.images[0] || fallbackImage;
    return (
    <tr key={p._id} style={isVariant ? { background: 'rgba(107,140,62,0.03)' } : undefined}>
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', paddingLeft: isVariant ? 'var(--space-6)' : 0 }}>
          {isVariant && (
            <span style={{ color: 'var(--color-gray-300)', fontSize: '14px', marginLeft: '-20px' }}>└</span>
          )}
          <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'var(--color-gray-100)', flexShrink: 0, position: 'relative' }}>
            {displayImage && <Image src={displayImage} alt="" fill sizes="40px" />}
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
      <td style={{ fontSize: 'var(--text-xs)', fontFamily: 'monospace', color: 'var(--color-gray-600)', letterSpacing: '0.02em' }}>{p.productId}</td>
      <td style={{ fontSize: 'var(--text-xs)' }}>{isVariant ? '' : p.category}</td>
      <td style={{ fontWeight: 600 }}>{formatPrice(p.price)}</td>
      <td>
        <span style={{ fontWeight: 600, color: p.stock <= 10 ? 'var(--color-error)' : 'inherit' }}>
          {p.stock} {p.stock <= 10 && '⚠'}
        </span>
      </td>
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={() => setStockEdit(p._id, getStockValue(p) - 1)}
            style={{
              width: 28, height: 28, borderRadius: 'var(--radius-md)', border: '1px solid var(--color-gray-300)',
              background: 'white', cursor: 'pointer', fontSize: '16px', fontWeight: 700, color: 'var(--color-gray-600)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            disabled={getStockValue(p) <= 0}
          >−</button>
          <input
            type="number"
            min={0}
            value={getStockValue(p)}
            onChange={(e) => setStockEdit(p._id, parseInt(e.target.value) || 0)}
            style={{
              width: 56, height: 28, textAlign: 'center', border: '1px solid var(--color-gray-300)',
              borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', fontWeight: 600,
              background: stockEdits[p._id] !== undefined ? 'rgba(198, 40, 40,0.04)' : 'white',
            }}
          />
          <button
            onClick={() => setStockEdit(p._id, getStockValue(p) + 1)}
            style={{
              width: 28, height: 28, borderRadius: 'var(--radius-md)', border: '1px solid var(--color-gray-300)',
              background: 'white', cursor: 'pointer', fontSize: '16px', fontWeight: 700, color: 'var(--color-gray-600)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >+</button>
          <button
            onClick={() => saveStock(p)}
            disabled={stockEdits[p._id] === undefined || savingStock === p._id}
            style={{
              padding: '4px 10px', fontSize: 'var(--text-xs)', fontWeight: 600,
              borderRadius: 'var(--radius-md)', cursor: 'pointer',
              border: '1px solid var(--color-gray-200)',
              background: stockEdits[p._id] !== undefined ? 'var(--red)' : 'var(--color-gray-100)',
              color: stockEdits[p._id] !== undefined ? 'white' : 'var(--color-gray-400)',
              transition: 'all var(--transition-fast)',
              opacity: savingStock === p._id ? 0.6 : 1,
            }}
          >
            {savingStock === p._id ? '...' : 'Save'}
          </button>
        </div>
      </td>
      <td>{p.salesCount}</td>
      <td>
        {!isVariant && (
          <div style={{ display: 'flex', gap: 'var(--space-1)', flexWrap: 'wrap' }}>
            <span className={styles.badge} style={{ background: p.isMustTry ? 'rgba(232,132,90,0.15)' : 'var(--color-gray-100)', color: p.isMustTry ? 'var(--color-accent-500)' : 'var(--color-gray-400)' }}>🔥</span>
            <span className={styles.badge} style={{ background: p.isBestSeller ? 'rgba(198, 40, 40,0.15)' : 'var(--color-gray-100)', color: p.isBestSeller ? 'var(--color-primary-600)' : 'var(--color-gray-400)' }}>⭐</span>
          </div>
        )}
      </td>
      <td>
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
      </td>
      <td>
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
      </td>
    </tr>
    );
  };

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
              {groupedItems.map((item) => {
                if (isGroup(item)) {
                  const allInGroup = [item.primary, ...item.variants];
                  const primaryImage = item.primary.images[0];
                  return allInGroup.map((p, idx) =>
                    renderProductRow(p, idx > 0, idx === allInGroup.length - 1, primaryImage)
                  );
                }
                return renderProductRow(item, false, false);
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

              {/* Category */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Category</label>
                <select className={styles.formSelect} value={editForm.category || ''} onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))}>
                  {categories.filter(Boolean).map((c) => (<option key={c} value={c}>{categoryDisplayNames[c] || c}</option>))}
                </select>
              </div>

              {/* ===== VARIANTS SECTION ===== */}
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
                        background: ve.isNew ? 'rgba(198, 40, 40,0.03)' : (ve._id === editingProduct._id ? 'rgba(198, 40, 40,0.06)' : 'white'),
                        border: ve.isNew ? '1.5px dashed var(--red)' : (ve._id === editingProduct._id ? '1px solid rgba(198, 40, 40,0.15)' : '1px solid var(--color-gray-200)'),
                        borderRadius: 'var(--radius-lg)',
                        position: 'relative',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                          <span style={{
                            fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.05em',
                            color: ve.isNew ? 'var(--red)' : (ve._id === editingProduct._id ? 'var(--red)' : 'var(--color-gray-500)'),
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
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--red)'; e.currentTarget.style.color = 'var(--red)'; }}
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

      {/* ===== Add Product Modal ===== */}
      {showAddModal && (
        <div className={styles.modalOverlay} onClick={closeAddModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Add New Product</h2>
              <button className={styles.modalClose} onClick={closeAddModal} aria-label="Close modal">✕</button>
            </div>

            <div className={styles.modalBody}>
              {/* Title */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Title *</label>
                <input className={styles.formInput} value={addForm.title || ''} onChange={(e) => setAddForm((f) => ({ ...f, title: e.target.value }))} placeholder="Product name" />
              </div>

              {/* Description */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Description *</label>
                <textarea className={styles.formTextarea} rows={3} value={addForm.description || ''} onChange={(e) => setAddForm((f) => ({ ...f, description: e.target.value }))} placeholder="Product description (min 10 characters)" />
              </div>

              {/* Category */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Category *</label>
                <select className={styles.formSelect} value={addForm.category || ''} onChange={(e) => setAddForm((f) => ({ ...f, category: e.target.value }))}>
                  {categories.filter(Boolean).map((c) => (<option key={c} value={c}>{categoryDisplayNames[c] || c}</option>))}
                </select>
              </div>

              {/* Packaging, Weight, Stock */}
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Packaging Size *</label>
                  <input className={styles.formInput} value={addForm.packagingSize || ''} onChange={(e) => setAddForm((f) => ({ ...f, packagingSize: e.target.value }))} placeholder="e.g. 250g" />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Weight (g) *</label>
                  <input className={styles.formInput} type="number" min={0} value={addForm.weight ?? ''} onChange={(e) => setAddForm((f) => ({ ...f, weight: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Stock</label>
                  <input className={styles.formInput} type="number" min={0} value={addForm.stock ?? ''} onChange={(e) => setAddForm((f) => ({ ...f, stock: parseInt(e.target.value) || 0 }))} />
                </div>
              </div>

              {/* Price Row */}
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Price (₹) *</label>
                  <input className={styles.formInput} type="number" min={0} step="0.01" value={addForm.price ?? ''} onChange={(e) => setAddForm((f) => ({ ...f, price: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Compare At Price (₹)</label>
                  <input className={styles.formInput} type="number" min={0} step="0.01" value={addForm.compareAtPrice ?? ''} onChange={(e) => { const val = e.target.value; setAddForm((f) => ({ ...f, compareAtPrice: val ? parseFloat(val) : undefined })); }} />
                </div>
              </div>

              {/* Tags */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Tags</label>
                <div className={styles.tagContainer}>
                  {(addForm.tags || []).map((tag, i) => (
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

              {/* Images */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Images ({(addForm.images || []).length}/5)</label>
                <div className={styles.imageGrid}>
                  {(addForm.images || []).map((img, i) => (
                    <div key={i} className={styles.imageThumb}>
                      <Image src={img} alt={`Product image ${i + 1}`} fill sizes="80px" style={{ objectFit: 'cover' }} />
                      <button className={styles.imageRemove} onClick={() => removeAddImage(i)} aria-label="Remove image">×</button>
                    </div>
                  ))}
                  {(addForm.images || []).length < 5 && (
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

              {/* Nutrition Info */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Nutrition Info</label>
                <div className={styles.formRow}>
                  {(['calories', 'protein', 'carbs', 'fat', 'fiber'] as const).map((field) => (
                    <div key={field} className={styles.formGroup} style={{ flex: '1 1 0' }}>
                      <label className={styles.formLabelSmall}>{field.charAt(0).toUpperCase() + field.slice(1)}</label>
                      <input className={styles.formInput} placeholder="e.g. 120 kcal" value={addForm.nutritionInfo?.[field] || ''} onChange={(e) => updateAddNutrition(field, e.target.value)} />
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
                      <input type="checkbox" checked={!!addForm[key]} onChange={(e) => setAddForm((f) => ({ ...f, [key]: e.target.checked }))} />
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
              >
                Cancel
              </button>
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
                Permanently delete <strong>{deleteConfirm.title}</strong> ({deleteConfirm.packagingSize})?
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
              >
                Cancel
              </button>
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

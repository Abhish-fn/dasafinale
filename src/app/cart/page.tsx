'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/context/CartContext';
import { formatPrice, calculateShippingFee } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import styles from './cart.module.css';

interface VariantOption {
  _id: string;
  packagingSize: string;
  price: number;
  stock: number;
  slug: string;
}

export default function CartPage() {
  const { items, total, loading, updateQuantity, removeItem, swapVariant } = useCart();
  const { toast } = useToast();

  // Track which items have their variant selector open
  // Cache of fetched variants per variantGroup
  const [variantCache, setVariantCache] = useState<Record<string, VariantOption[]>>({});
  const [swapping, setSwapping] = useState<string | null>(null);

  const shipping = calculateShippingFee(total);
  const grandTotal = total + shipping;

  const fetchVariants = useCallback(async (variantGroup: string, currentProductSlug: string) => {
    if (variantCache[variantGroup]) return;
    try {
      const res = await fetch(`/api/products/${currentProductSlug}`);
      const data = await res.json();
      if (res.ok) {
        const allVariants: VariantOption[] = [
          {
            _id: data.product._id,
            packagingSize: data.product.packagingSize,
            price: data.product.price,
            stock: data.product.stock,
            slug: data.product.slug,
          },
          ...(data.variants || []).map((v: VariantOption & { productId: string }) => ({
            _id: v._id,
            packagingSize: v.packagingSize,
            price: v.price,
            stock: v.stock,
            slug: v.slug,
          })),
        ].sort((a, b) => a.price - b.price);
        setVariantCache((prev) => ({ ...prev, [variantGroup]: allVariants }));
      }
    } catch (err) {
      console.error('Failed to fetch variants:', err);
    }
  }, [variantCache]);

  // Auto-fetch variants for all cart items that have a variantGroup
  useEffect(() => {
    for (const item of items) {
      if (item.product.variantGroup && !variantCache[item.product.variantGroup]) {
        fetchVariants(item.product.variantGroup, item.product.slug);
      }
    }
  }, [items, fetchVariants, variantCache]);

  const handleSwapVariant = async (itemId: string, newProductId: string) => {
    setSwapping(itemId);
    try {
      await swapVariant(itemId, newProductId);
      toast('Pack size updated!', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to change pack size', 'error');
    } finally {
      setSwapping(null);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <h1 className={styles.pageTitle}>Your Cart</h1>
        <div className={styles.layout}>
          <div className={styles.itemsList}>
            {[1, 2, 3].map((i) => (
              <div key={i} className={styles.cartItem} style={{ height: 120, background: 'var(--color-gray-50)', animation: 'pulse 2s ease-in-out infinite' }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>🛒</div>
          <h2 className={styles.emptyTitle}>Your cart is empty</h2>
          <p className={styles.emptyDesc}>Looks like you haven&apos;t added any snacks yet!</p>
          <Link href="/products" className={styles.shopBtn}>Browse Products</Link>
        </div>
      </div>
    );
  }

  const categoryEmojis: Record<string, string> = {
    'Clay Pot Roasted Seeds & Superfoods': '🫘',
    'Protein & Energy Snacks': '💪',
    'Palm Jaggery Millet Biscuits': '🍪',
    'Traditional Millet Savoury Snacks': '🌾',
    'Healthy Chips & Crisps': '🥔',
    'Premium Healthy Sweets': '🍯',
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.pageTitle}>Your Cart ({items.length})</h1>
      <div className={styles.layout}>
        <div className={styles.itemsList}>
          {items.map((item) => {
            const hasVariants = !!item.product.variantGroup;
            const variants = item.product.variantGroup ? variantCache[item.product.variantGroup] : undefined;

            return (
              <div key={item._id} className={styles.cartItem}>
                {/* Column 1: Product Image */}
                <Link href={`/products/${item.product.slug}`} className={styles.itemImage}>
                  {item.product.images?.[0] ? (
                    <Image src={item.product.images[0]} alt={item.product.title} fill sizes="88px" />
                  ) : (
                    <div className={styles.imagePlaceholder}>
                      {categoryEmojis[item.product.category] || '🌿'}
                    </div>
                  )}
                </Link>

                {/* Column 2: Title + Controls */}
                <div className={styles.itemContent}>
                  <Link href={`/products/${item.product.slug}`} className={styles.itemTitle}>
                    {item.product.title}
                  </Link>

                  <div className={styles.itemControls}>
                    {/* Variant Toggle Pills */}
                    {hasVariants && variants && variants.length > 1 ? (
                      <div className={styles.variantToggle}>
                        {variants.map((v) => (
                          <button
                            key={v._id}
                            className={`${styles.variantPill} ${v._id === item.product._id ? styles.variantPillActive : ''}`}
                            disabled={v._id === item.product._id || v.stock === 0 || swapping === item._id}
                            onClick={() => handleSwapVariant(item._id, v._id)}
                            title={v.stock === 0 ? 'Out of stock' : `${v.packagingSize} — ${formatPrice(v.price)}`}
                          >
                            {v.packagingSize}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <span className={styles.itemSize}>{item.product.packagingSize}</span>
                    )}

                    {/* Quantity Selector */}
                    <div className={styles.quantitySelector}>
                      <button
                        className={styles.qtyBtn}
                        onClick={() => updateQuantity(item._id, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                      >−</button>
                      <span className={styles.qtyValue}>{item.quantity}</span>
                      <button
                        className={styles.qtyBtn}
                        onClick={() => updateQuantity(item._id, item.quantity + 1)}
                        disabled={item.quantity >= item.product.stock}
                      >+</button>
                    </div>
                  </div>
                </div>

                {/* Column 3: Remove + Price */}
                <div className={styles.itemRight}>
                  <button className={styles.removeBtn} onClick={() => removeItem(item._id)} aria-label="Remove item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                  <div style={{ textAlign: 'right' }}>
                    <div className={styles.itemPrice}>{formatPrice(item.product.price * item.quantity)}</div>
                    {item.quantity > 1 && (
                      <div className={styles.unitPrice}>{formatPrice(item.product.price)} each</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className={styles.summary}>
          <h2 className={styles.summaryTitle}>Order Summary</h2>
          <div className={styles.summaryRow}>
            <span>Subtotal ({items.length} items)</span>
            <span className={styles.summaryValue}>{formatPrice(total)}</span>
          </div>
          <div className={styles.summaryRow}>
            <span>Shipping</span>
            <span className={styles.summaryValue}>
              {shipping === 0 ? 'FREE' : formatPrice(shipping)}
            </span>
          </div>
          <hr className={styles.summaryDivider} />
          <div className={styles.summaryTotal}>
            <span>Total</span>
            <span>{formatPrice(grandTotal)}</span>
          </div>
          <Link href="/checkout" className={styles.checkoutBtn}>
            Proceed to Checkout →
          </Link>
          {shipping > 0 && (
            <p className={styles.freeShipping}>
              Add {formatPrice(49900 - total)} more for free shipping!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

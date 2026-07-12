'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/context/CartContext';
import { formatPrice } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';

import styles from './cart.module.css';

export default function CartPage() {
  const { items, total, loading, updateQuantity, removeItem, swapVariant } = useCart();
  const { toast } = useToast();


  // Helper: get the variant data for a cart item
  const getVariant = (item: typeof items[0]) => {
    return item.product.variants?.find(v => v._id === item.variantId);
  };

  const handleSwapVariant = async (itemId: string, newVariantId: string) => {
    try {
      await swapVariant(itemId, newVariantId);
      toast('Pack size updated!', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to change pack size', 'error');
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
            const variant = getVariant(item);
            if (!variant) return null;

            const hasMultipleVariants = item.product.variants.length > 1;
            const sortedVariants = [...item.product.variants].sort((a, b) => a.price - b.price);

            return (
              <div key={item._id} className={styles.cartItem}>
                {/* Column 1: Product Image */}
                <Link href={`/products/${item.product.productId}`} className={styles.itemImage}>
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
                  <Link href={`/products/${item.product.productId}`} className={styles.itemTitle}>
                    {item.product.title}
                  </Link>

                  <div className={styles.itemControls}>
                    {/* Variant Toggle Pills */}
                    {hasMultipleVariants ? (
                      <div className={styles.variantToggle}>
                        {sortedVariants.map((v) => (
                          <button
                            key={v._id}
                            className={`${styles.variantPill} ${v._id === item.variantId ? styles.variantPillActive : ''}`}
                            disabled={v._id === item.variantId || v.stock === 0}
                            onClick={() => handleSwapVariant(item._id, v._id)}
                            title={v.stock === 0 ? 'Out of stock' : `${v.packagingSize} — ${formatPrice(v.price)}`}
                          >
                            {v.packagingSize}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <span className={styles.itemSize}>{variant.packagingSize}</span>
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
                        disabled={item.quantity >= variant.stock}
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
                    <div className={styles.itemPrice}>{formatPrice(variant.price * item.quantity)}</div>
                    {item.quantity > 1 && (
                      <div className={styles.unitPrice}>{formatPrice(variant.price)} each</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className={styles.summary}>
          <h2 className={styles.summaryTitle}>Order Summary</h2>
          <div className={styles.summaryItemsList}>
            {items.map((item) => {
              const variant = getVariant(item);
              if (!variant) return null;
              return (
                <div key={item._id} className={styles.summaryItemRow}>
                  <span className={styles.summaryItemName}>
                    {item.product.title}{variant.packagingSize ? ` (${variant.packagingSize})` : ''}
                    {item.quantity > 1 && <span className={styles.summaryItemQty}> ×{item.quantity}</span>}
                  </span>
                  <span className={styles.summaryItemPrice}>{formatPrice(variant.price * item.quantity)}</span>
                </div>
              );
            })}
          </div>
          <hr className={styles.summaryDivider} />
          <div className={styles.summaryRow}>
            <span>Subtotal</span>
            <span className={styles.summaryValue}>{formatPrice(total)}</span>
          </div>
          <div className={styles.summaryRow} style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-400)' }}>
            <span>Shipping</span>
            <span>calculated at checkout</span>
          </div>
          <hr className={styles.summaryDivider} />
          <div className={styles.summaryTotal}>
            <span>Total</span>
            <span>{formatPrice(total)}</span>
          </div>
          <Link href="/checkout" className={styles.checkoutBtn}>
            Proceed to Checkout →
          </Link>
        </div>
      </div>
    </div>
  );
}

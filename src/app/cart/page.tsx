'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/context/CartContext';
import { formatPrice, calculateShippingFee } from '@/lib/utils';
import styles from './cart.module.css';

export default function CartPage() {
  const { items, total, loading, updateQuantity, removeItem } = useCart();

  const shipping = calculateShippingFee(total);
  const grandTotal = total + shipping;

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
    'Millet Munchies': '🌾',
    'Trail Mixes': '🥜',
    'Healthy Cookies': '🍪',
    'Protein Bars': '💪',
    'Granola': '🥣',
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.pageTitle}>Your Cart ({items.length})</h1>
      <div className={styles.layout}>
        <div className={styles.itemsList}>
          {items.map((item) => (
            <div key={item._id} className={styles.cartItem}>
              <Link href={`/products/${item.product.slug}`} className={styles.itemImage}>
                {item.product.images?.[0] ? (
                  <Image src={item.product.images[0]} alt={item.product.title} fill sizes="100px" />
                ) : (
                  <div className={styles.imagePlaceholder}>
                    {categoryEmojis[item.product.category] || '🌿'}
                  </div>
                )}
              </Link>
              <div className={styles.itemInfo}>
                <Link href={`/products/${item.product.slug}`} className={styles.itemTitle}>
                  {item.product.title}
                </Link>
                <span className={styles.itemSize}>{item.product.packagingSize}</span>
                <div className={styles.itemBottom}>
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
                  <span className={styles.itemPrice}>{formatPrice(item.product.price * item.quantity)}</span>
                </div>
              </div>
              <button className={styles.removeBtn} onClick={() => removeItem(item._id)} aria-label="Remove item">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </div>
          ))}
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

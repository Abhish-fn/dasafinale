'use client';

import Link from 'next/link';
import Image from 'next/image';
import { formatPrice } from '@/lib/utils';
import { useWishlist } from '@/context/WishlistContext';
import { useSession } from 'next-auth/react';
import styles from './ProductCard.module.css';

interface ProductCardProps {
  product: {
    _id: string;
    productId: string;
    title: string;
    images: string[];
    price: number;
    compareAtPrice?: number;
    category: string;
    packagingSize: string;
    stock: number;
    isMustTry?: boolean;
    isBestSeller?: boolean;
    tags?: string[];
    foodType: string;
    variantCount?: number;
  };
}

export default function ProductCard({ product }: ProductCardProps) {
  const { data: session } = useSession();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const wishlisted = session?.user ? isInWishlist(product._id) : false;

  const discount = product.compareAtPrice
    ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
    : 0;

  const categoryEmojis: Record<string, string> = {
    'Clay Pot Roasted Seeds & Superfoods': '🫘',
    'Protein & Energy Snacks': '💪',
    'Palm Jaggery Millet Biscuits': '🍪',
    'Traditional Millet Savoury Snacks': '🌾',
    'Healthy Chips & Crisps': '🥜',
    'Premium Healthy Sweets': '🍬',
  };

  return (
    <Link href={`/products/${product.productId}`} className={styles.card}>
      <div className={styles.imageWrapper}>
        {product.images[0] ? (
          <Image
            src={product.images[0]}
            alt={product.title}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className={styles.image}
            loading="lazy"
          />
        ) : (
          <div className={styles.placeholder}>
            {categoryEmojis[product.category] || '🌿'}
          </div>
        )}

        <div className={styles.badges}>
          {product.isMustTry && <span className={`${styles.badge} ${styles.mustTry}`}>Must Try</span>}
          {product.isBestSeller && <span className={`${styles.badge} ${styles.bestSeller}`}>Best Seller</span>}
          {discount > 0 && <span className={`${styles.badge} ${styles.discount}`}>{discount}% OFF</span>}
        </div>

        <button
          className={`${styles.wishlistBtn} ${wishlisted ? styles.wishlisted : ''}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (session?.user) toggleWishlist(product._id);
          }}
          aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill={wishlisted ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>
      </div>

      <div className={styles.body}>
        <div className={styles.category}>{product.foodType}</div>
        <h3 className={styles.title}>{product.title}</h3>
        <div className={styles.size}>{product.packagingSize}</div>

        <div className={styles.priceRow}>
          <span className={styles.price}>{formatPrice(product.price)}</span>
          {product.compareAtPrice && product.compareAtPrice > product.price && (
            <>
              <span className={styles.comparePrice}>{formatPrice(product.compareAtPrice)}</span>
              <span className={styles.discountPercent}>{discount}% off</span>
            </>
          )}
        </div>

        {product.stock === 0 && <div className={styles.outOfStock}>Out of Stock</div>}

        {product.variantCount && product.variantCount > 1 && (
          <div className={styles.packSizes}>
            📦 {product.variantCount} pack sizes
          </div>
        )}

        {product.tags && product.tags.length > 0 && (
          <div className={styles.tags}>
            {product.tags.slice(0, 3).map((tag) => (
              <span key={tag} className={styles.tag}>{tag}</span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}

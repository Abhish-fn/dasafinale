'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { formatPrice } from '@/lib/utils';
import { useWishlist } from '@/context/WishlistContext';
import { useCart } from '@/context/CartContext';
import { useSession } from 'next-auth/react';
import { useToast } from '@/components/ui/Toast';
import styles from './ProductCard.module.css';

interface ProductVariant {
  _id: string;
  packagingSize: string;
  price: number;
  compareAtPrice?: number;
  stock: number;
}

interface ProductCardProps {
  product: {
    _id: string;
    productId: string;
    title: string;
    images: string[];
    category: string;
    variants: ProductVariant[];
    isMustTry?: boolean;
    isBestSeller?: boolean;
    tags?: string[];
  };
}

const categoryDisplayNames: Record<string, string> = {
  'Clay Pot Roasted Seeds & Superfoods': 'Roasted Seeds',
  'Healthy Chips & Crisps': 'Healthy Chips',
  'Palm Jaggery Millet Biscuits': 'Jaggery Biscuits',
  'Premium Healthy Sweets': 'Healthy Sweets',
  'Protein & Energy Snacks': 'Protein Snacks',
  'Traditional Millet Savoury Snacks': 'Millet Snacks',
};

export default function ProductCard({ product }: ProductCardProps) {
  const { data: session } = useSession();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { addToCart } = useCart();
  const { toast } = useToast();
  const wishlisted = session?.user ? isInWishlist(product._id) : false;
  const [adding, setAdding] = useState(false);
  const router = useRouter();

  // Sort variants by price ascending
  const sortedVariants = [...(product.variants || [])].sort((a, b) => a.price - b.price);
  const cheapestInStock = sortedVariants.find(v => v.stock > 0) || sortedVariants[0];

  // Selected variant state — defaults to cheapest in-stock
  const [selectedVariantId, setSelectedVariantId] = useState(cheapestInStock?._id);
  const selectedVariant = sortedVariants.find(v => v._id === selectedVariantId) || sortedVariants[0];

  if (!selectedVariant) return null;

  const discount = selectedVariant.compareAtPrice
    ? Math.round(((selectedVariant.compareAtPrice - selectedVariant.price) / selectedVariant.compareAtPrice) * 100)
    : 0;

  // Product is out of stock only if ALL variants are out of stock
  const allOutOfStock = sortedVariants.every(v => v.stock === 0);
  const selectedOutOfStock = selectedVariant.stock === 0;

  const categoryEmojis: Record<string, string> = {
    'Clay Pot Roasted Seeds & Superfoods': '🫘',
    'Protein & Energy Snacks': '💪',
    'Palm Jaggery Millet Biscuits': '🍪',
    'Traditional Millet Savoury Snacks': '🌾',
    'Healthy Chips & Crisps': '🥜',
    'Premium Healthy Sweets': '🍬',
  };

  const handleVariantSelect = (e: React.MouseEvent, variantId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedVariantId(variantId);
  };

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (selectedOutOfStock || adding) return;
    setAdding(true);
    try {
      await addToCart(product._id, selectedVariant._id);
      toast(`${selectedVariant.packagingSize} added to cart!`, 'success');
    } catch {
      toast('Failed to add to cart', 'error');
    } finally {
      setAdding(false);
    }
  };

  const handleBuyNow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (selectedOutOfStock) return;
    router.push(`/checkout?buyNow=true&productId=${product.productId}&variantId=${selectedVariant._id}&quantity=1`);
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
        <div className={styles.category}>{categoryDisplayNames[product.category] || product.category}</div>
        <h3 className={styles.title}>{product.title}</h3>
        {/* Variant selector pills */}
        {sortedVariants.length > 1 ? (
          <div className={styles.variantSelector}>
            {sortedVariants.map((v) => (
              <button
                key={v._id}
                className={`${styles.variantPill} ${v._id === selectedVariantId ? styles.variantPillActive : ''} ${v.stock === 0 ? styles.variantPillOos : ''}`}
                onClick={(e) => handleVariantSelect(e, v._id)}
                disabled={v.stock === 0}
                title={v.stock === 0 ? 'Out of stock' : `${v.packagingSize} — ${formatPrice(v.price)}`}
              >
                {v.packagingSize}
              </button>
            ))}
          </div>
        ) : (
          <div className={styles.size}>{selectedVariant.packagingSize}</div>
        )}

        <div className={styles.priceRow}>
          <span className={styles.price}>{formatPrice(selectedVariant.price)}</span>
          {selectedVariant.compareAtPrice && selectedVariant.compareAtPrice > selectedVariant.price && (
            <>
              <span className={styles.comparePrice}>{formatPrice(selectedVariant.compareAtPrice)}</span>
              <span className={styles.discountPercent}>{discount}% off</span>
            </>
          )}
        </div>

        {allOutOfStock && <div className={styles.outOfStock}>Out of Stock</div>}

        <div className={styles.cardActions}>
          <button
            className={styles.addToCartBtn}
            onClick={handleAddToCart}
            disabled={selectedOutOfStock || adding}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M9 12l2 2 4-4" />
            </svg>
            {adding ? 'Adding...' : selectedOutOfStock ? 'Out of Stock' : 'Add to Cart'}
          </button>
          <button
            className={styles.buyNowBtn}
            onClick={handleBuyNow}
            disabled={selectedOutOfStock}
            title="Buy Now"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </button>
        </div>

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

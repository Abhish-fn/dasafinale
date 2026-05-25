'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { formatPrice } from '@/lib/utils';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { useToast } from '@/components/ui/Toast';
import ProductCard from '@/components/products/ProductCard';
import styles from './productDetail.module.css';

interface Variant {
  productId: string;
  slug: string;
  title: string;
  packagingSize: string;
  price: number;
  images: string[];
}

interface ProductDetail {
  _id: string;
  productId: string;
  slug: string;
  title: string;
  description: string;
  images: string[];
  price: number;
  compareAtPrice?: number;
  category: string;
  foodType: string;
  tags: string[];
  packagingSize: string;
  stock: number;
  isMustTry?: boolean;
  isBestSeller?: boolean;
  nutritionInfo?: {
    calories?: string;
    protein?: string;
    carbs?: string;
    fat?: string;
    fiber?: string;
  };
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { toast } = useToast();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [related, setRelated] = useState<ProductDetail[]>([]);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);

  useEffect(() => {
    async function fetchProduct() {
      setLoading(true);
      try {
        const [productRes, relatedRes] = await Promise.all([
          fetch(`/api/products/${params.productId}`),
          fetch(`/api/products/${params.productId}/related`),
        ]);
        const productData = await productRes.json();
        const relatedData = await relatedRes.json();

        if (!productRes.ok) {
          router.push('/products');
          return;
        }

        setProduct(productData.product);
        setVariants(productData.variants || []);
        setRelated(relatedData.related || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchProduct();
  }, [params.productId, router]);

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.productGrid}>
          <div style={{ aspectRatio: '1', background: 'var(--color-gray-100)', borderRadius: 'var(--radius-xl)', animation: 'pulse 2s ease-in-out infinite' }} />
          <div>
            <div style={{ height: '2rem', width: '60%', background: 'var(--color-gray-100)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)' }} />
            <div style={{ height: '3rem', width: '40%', background: 'var(--color-gray-100)', borderRadius: 'var(--radius-md)' }} />
          </div>
        </div>
      </div>
    );
  }

  if (!product) return null;

  const discount = product.compareAtPrice
    ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
    : 0;

  const categoryEmojis: Record<string, string> = {
    'Clay Pot Roasted Seeds & Superfoods': '🫘',
    'Millet Munchies': '🌾',
    'Trail Mixes': '🥜',
    'Healthy Cookies': '🍪',
    'Protein Bars': '💪',
    'Granola': '🥣',
  };

  const stockStatus =
    product.stock === 0 ? 'outOfStock' :
    product.stock <= 10 ? 'lowStock' : 'inStock';

  const stockText =
    product.stock === 0 ? 'Out of Stock' :
    product.stock <= 10 ? `Only ${product.stock} left!` : 'In Stock';

  return (
    <div className={styles.container}>
      <div className={styles.productGrid}>
        {/* Image Gallery */}
        <div className={styles.gallery}>
          <div className={styles.mainImage}>
            {product.images[selectedImage] ? (
              <Image
                src={product.images[selectedImage]}
                alt={product.title}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
              />
            ) : (
              <div className={styles.imagePlaceholder}>
                {categoryEmojis[product.category] || '🌿'}
              </div>
            )}
          </div>
          {product.images.length > 1 && (
            <div className={styles.thumbs}>
              {product.images.map((img, i) => (
                <button
                  key={i}
                  className={`${styles.thumb} ${i === selectedImage ? styles.thumbActive : ''}`}
                  onClick={() => setSelectedImage(i)}
                >
                  <Image src={img} alt="" fill sizes="72px" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className={styles.info}>
          <div className={styles.breadcrumb}>
            <Link href="/">Home</Link>
            <span>/</span>
            <Link href="/products">Products</Link>
            <span>/</span>
            <span>{product.category}</span>
          </div>

          <div className={styles.badgesRow}>
            {product.isMustTry && <span className={`${styles.badge} ${styles.mustTry}`}>🔥 Must Try</span>}
            {product.isBestSeller && <span className={`${styles.badge} ${styles.bestSeller}`}>⭐ Best Seller</span>}
          </div>

          <h1 className={styles.title}>{product.title}</h1>
          <p className={styles.sizeLabel}>{product.packagingSize}</p>

          <div className={styles.priceBlock}>
            <span className={styles.price}>{formatPrice(product.price)}</span>
            {product.compareAtPrice && product.compareAtPrice > product.price && (
              <>
                <span className={styles.comparePrice}>{formatPrice(product.compareAtPrice)}</span>
                <span className={styles.discountBadge}>{discount}% off</span>
              </>
            )}
          </div>

          {/* Size Variants */}
          {variants.length > 0 && (
            <div className={styles.variantsSection}>
              <div className={styles.variantsLabel}>Size</div>
              <div className={styles.variantsList}>
                <button className={`${styles.variantBtn} ${styles.variantBtnActive}`}>
                  {product.packagingSize} — {formatPrice(product.price)}
                </button>
                {variants.map((v) => (
                  <Link
                    key={v.productId}
                    href={`/products/${v.slug}`}
                    className={styles.variantBtn}
                  >
                    {v.packagingSize} — {formatPrice(v.price)}
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className={`${styles.stockInfo} ${styles[stockStatus]}`}>
            {stockText}
          </div>

          {/* Actions */}
          <div className={styles.actions}>
            <div className={styles.quantitySelector}>
              <button
                className={styles.qtyBtn}
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
              >
                −
              </button>
              <span className={styles.qtyValue}>{quantity}</span>
              <button
                className={styles.qtyBtn}
                onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                disabled={quantity >= product.stock}
              >
                +
              </button>
            </div>
            <button
              className={styles.addToCartBtn}
              disabled={product.stock === 0 || addingToCart}
              onClick={async () => {
                try {
                  setAddingToCart(true);
                  await addToCart(product._id, quantity);
                  toast(`${product.title} added to cart!`, 'success');
                } catch (err) {
                  toast(err instanceof Error ? err.message : 'Failed to add to cart', 'error');
                } finally {
                  setAddingToCart(false);
                }
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
              {addingToCart ? 'Adding...' : product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
            </button>
            <button
              className={`${styles.wishlistBtn} ${session?.user && isInWishlist(product._id) ? styles.wishlisted : ''}`}
              aria-label={session?.user && isInWishlist(product._id) ? 'Remove from wishlist' : 'Add to wishlist'}
              onClick={() => {
                if (session?.user) {
                  toggleWishlist(product._id);
                  toast(isInWishlist(product._id) ? 'Removed from wishlist' : 'Added to wishlist!', 'success');
                } else {
                  toast('Sign in to save to wishlist', 'info');
                }
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill={session?.user && isInWishlist(product._id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </button>
          </div>

          {/* Description */}
          <div className={styles.description}>
            <h2 className={styles.descTitle}>About this product</h2>
            <p className={styles.descText}>{product.description}</p>
          </div>

          {/* Nutrition Info */}
          {product.nutritionInfo && Object.values(product.nutritionInfo).some(Boolean) && (
            <div className={styles.nutrition}>
              <h3 className={styles.descTitle}>Nutrition Facts</h3>
              <div className={styles.nutritionGrid}>
                {product.nutritionInfo.calories && (
                  <div className={styles.nutriCard}>
                    <div className={styles.nutriValue}>{product.nutritionInfo.calories}</div>
                    <div className={styles.nutriLabel}>Calories</div>
                  </div>
                )}
                {product.nutritionInfo.protein && (
                  <div className={styles.nutriCard}>
                    <div className={styles.nutriValue}>{product.nutritionInfo.protein}</div>
                    <div className={styles.nutriLabel}>Protein</div>
                  </div>
                )}
                {product.nutritionInfo.carbs && (
                  <div className={styles.nutriCard}>
                    <div className={styles.nutriValue}>{product.nutritionInfo.carbs}</div>
                    <div className={styles.nutriLabel}>Carbs</div>
                  </div>
                )}
                {product.nutritionInfo.fat && (
                  <div className={styles.nutriCard}>
                    <div className={styles.nutriValue}>{product.nutritionInfo.fat}</div>
                    <div className={styles.nutriLabel}>Fat</div>
                  </div>
                )}
                {product.nutritionInfo.fiber && (
                  <div className={styles.nutriCard}>
                    <div className={styles.nutriValue}>{product.nutritionInfo.fiber}</div>
                    <div className={styles.nutriLabel}>Fiber</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tags */}
          {product.tags.length > 0 && (
            <div className={styles.tagsList}>
              {product.tags.map((tag) => (
                <span key={tag} className={styles.tagItem}>{tag}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Related Products */}
      {related.length > 0 && (
        <div className={styles.relatedSection}>
          <h2 className={styles.relatedTitle}>You might also like</h2>
          <div className={styles.relatedGrid}>
            {related.slice(0, 4).map((p) => (
              <ProductCard key={p._id} product={p as Parameters<typeof ProductCard>[0]['product']} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

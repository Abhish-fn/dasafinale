'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useSession } from 'next-auth/react';

interface WishlistProduct {
  _id: string;
  productId: string;
  title: string;
  slug: string;
  images: string[];
  price: number;
  compareAtPrice?: number;
  packagingSize: string;
  stock: number;
  category: string;
  isMustTry?: boolean;
  isBestSeller?: boolean;
  tags?: string[];
}

interface WishlistItem {
  _id: string;
  product: WishlistProduct;
  addedAt: string;
}

interface WishlistContextValue {
  items: WishlistItem[];
  loading: boolean;
  isInWishlist: (productId: string) => boolean;
  toggleWishlist: (productId: string) => Promise<void>;
  refreshWishlist: () => Promise<void>;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function useWishlist(): WishlistContextValue {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider');
  return ctx;
}

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWishlist = useCallback(async () => {
    if (!session?.user) {
      setItems([]);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch('/api/wishlist');
      const data = await res.json();
      setItems(data.products || []);
    } catch (err) {
      console.error('Failed to fetch wishlist:', err);
    } finally {
      setLoading(false);
    }
  }, [session?.user]);

  useEffect(() => {
    if (status !== 'loading') {
      fetchWishlist();
    }
  }, [fetchWishlist, status]);

  const isInWishlist = useCallback(
    (productId: string) => items.some((item) => item.product._id === productId),
    [items]
  );

  const toggleWishlist = useCallback(
    async (productId: string) => {
      if (!session?.user) return;

      const existing = items.find((item) => item.product._id === productId);
      if (existing) {
        await fetch(`/api/wishlist/${existing._id}`, { method: 'DELETE' });
      } else {
        await fetch('/api/wishlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId }),
        });
      }
      await fetchWishlist();
    },
    [session?.user, items, fetchWishlist]
  );

  return (
    <WishlistContext.Provider value={{ items, loading, isInWishlist, toggleWishlist, refreshWishlist: fetchWishlist }}>
      {children}
    </WishlistContext.Provider>
  );
}

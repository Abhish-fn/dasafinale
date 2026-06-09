'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useSession } from 'next-auth/react';

interface CartProduct {
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
  variantGroup?: string;
}

interface CartItem {
  _id: string;
  product: CartProduct;
  quantity: number;
}

interface CartContextValue {
  items: CartItem[];
  total: number;
  itemCount: number;
  loading: boolean;
  addToCart: (productId: string, quantity?: number) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  swapVariant: (itemId: string, newProductId: string) => Promise<void>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}

function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem('dd_session_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('dd_session_id', id);
  }
  return id;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [items, setItems] = useState<CartItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchCart = useCallback(async () => {
    try {
      const headers: Record<string, string> = {};
      if (!session?.user) {
        headers['x-session-id'] = getSessionId();
      }
      const res = await fetch('/api/cart', { headers });
      const data = await res.json();
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Failed to fetch cart:', err);
    } finally {
      setLoading(false);
    }
  }, [session?.user]);

  // Fetch cart on mount and when auth changes
  useEffect(() => {
    if (status !== 'loading') {
      fetchCart();
    }
  }, [fetchCart, status]);

  // Merge guest cart on login
  useEffect(() => {
    if (session?.user && typeof window !== 'undefined') {
      const sessionId = localStorage.getItem('dd_session_id');
      if (sessionId) {
        fetch('/api/cart/merge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        })
          .then(() => {
            localStorage.removeItem('dd_session_id');
            fetchCart();
          })
          .catch(console.error);
      }
    }
  }, [session?.user, fetchCart]);

  const addToCart = useCallback(async (productId: string, quantity = 1) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const body: Record<string, unknown> = { productId, quantity };
    if (!session?.user) {
      headers['x-session-id'] = getSessionId();
      body.sessionId = getSessionId();
    }
    const res = await fetch('/api/cart', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to add to cart');
    }
    await fetchCart();
  }, [session?.user, fetchCart]);

  const updateQuantity = useCallback(async (itemId: string, quantity: number) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (!session?.user) {
      headers['x-session-id'] = getSessionId();
    }
    await fetch(`/api/cart/${itemId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ quantity }),
    });
    await fetchCart();
  }, [session?.user, fetchCart]);

  const removeItem = useCallback(async (itemId: string) => {
    const headers: Record<string, string> = {};
    if (!session?.user) {
      headers['x-session-id'] = getSessionId();
    }
    await fetch(`/api/cart/${itemId}`, {
      method: 'DELETE',
      headers,
    });
    await fetchCart();
  }, [session?.user, fetchCart]);

  const swapVariant = useCallback(async (itemId: string, newProductId: string) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (!session?.user) {
      headers['x-session-id'] = getSessionId();
    }
    const res = await fetch('/api/cart/swap-variant', {
      method: 'POST',
      headers,
      body: JSON.stringify({ itemId, newProductId }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to swap variant');
    }
    await fetchCart();
  }, [session?.user, fetchCart]);

  const itemCount = items.length;

  return (
    <CartContext.Provider value={{ items, total, itemCount, loading, addToCart, updateQuantity, removeItem, swapVariant, refreshCart: fetchCart }}>
      {children}
    </CartContext.Provider>
  );
}

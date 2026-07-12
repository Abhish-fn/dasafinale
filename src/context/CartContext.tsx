'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useSession } from 'next-auth/react';

interface CartVariant {
  _id: string;
  packagingSize: string;
  price: number;
  compareAtPrice?: number;
  stock: number;
  weight: number;
}

interface CartProduct {
  _id: string;
  productId: string; // human-readable "CPS001"
  title: string;
  slug: string;
  images: string[];
  category: string;
  variants: CartVariant[];
}

interface CartItem {
  _id: string;
  product: CartProduct;
  variantId: string;
  quantity: number;
}

interface CartContextValue {
  items: CartItem[];
  total: number;
  itemCount: number;
  loading: boolean;
  addToCart: (productId: string, variantId: string, quantity?: number) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  swapVariant: (itemId: string, newVariantId: string) => Promise<void>;
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

  // addToCart takes the MongoDB _id of the product and the variant _id
  const addToCart = useCallback(async (productId: string, variantId: string, quantity = 1) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const body: Record<string, unknown> = { productId, variantId, quantity };
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

  // Helper: compute total from items
  const computeTotal = useCallback((cartItems: CartItem[]) => {
    return cartItems.reduce((sum, item) => {
      const variant = item.product.variants.find(v => v._id === item.variantId);
      return sum + (variant?.price || 0) * item.quantity;
    }, 0);
  }, []);

  const updateQuantity = useCallback(async (itemId: string, quantity: number) => {
    // Optimistic: update local state immediately
    const prevItems = items;
    const prevTotal = total;
    const optimistic = items.map(item =>
      item._id === itemId ? { ...item, quantity } : item
    );
    setItems(optimistic);
    setTotal(computeTotal(optimistic));

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (!session?.user) headers['x-session-id'] = getSessionId();
      const res = await fetch(`/api/cart/${itemId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ quantity }),
      });
      if (!res.ok) throw new Error('Failed');
      // Background reconcile with server
      fetchCart();
    } catch {
      // Revert on failure
      setItems(prevItems);
      setTotal(prevTotal);
    }
  }, [items, total, session?.user, fetchCart, computeTotal]);

  const removeItem = useCallback(async (itemId: string) => {
    // Optimistic: remove from local state immediately
    const prevItems = items;
    const prevTotal = total;
    const optimistic = items.filter(item => item._id !== itemId);
    setItems(optimistic);
    setTotal(computeTotal(optimistic));

    try {
      const headers: Record<string, string> = {};
      if (!session?.user) headers['x-session-id'] = getSessionId();
      const res = await fetch(`/api/cart/${itemId}`, {
        method: 'DELETE',
        headers,
      });
      if (!res.ok) throw new Error('Failed');
      fetchCart();
    } catch {
      setItems(prevItems);
      setTotal(prevTotal);
    }
  }, [items, total, session?.user, fetchCart, computeTotal]);

  // swapVariant: optimistic update swaps the variantId locally
  const swapVariant = useCallback(async (itemId: string, newVariantId: string) => {
    const prevItems = items;
    const prevTotal = total;
    const optimistic = items.map(item =>
      item._id === itemId ? { ...item, variantId: newVariantId } : item
    );
    setItems(optimistic);
    setTotal(computeTotal(optimistic));

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (!session?.user) headers['x-session-id'] = getSessionId();
      const res = await fetch('/api/cart/swap-variant', {
        method: 'POST',
        headers,
        body: JSON.stringify({ itemId, newVariantId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to swap variant');
      }
      fetchCart();
    } catch {
      setItems(prevItems);
      setTotal(prevTotal);
    }
  }, [items, total, session?.user, fetchCart, computeTotal]);

  const itemCount = items.length;

  return (
    <CartContext.Provider value={{ items, total, itemCount, loading, addToCart, updateQuantity, removeItem, swapVariant, refreshCart: fetchCart }}>
      {children}
    </CartContext.Provider>
  );
}

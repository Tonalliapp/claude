import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';
import type { Restaurant, TableInfo, MenuProduct, CartItem } from '@/types';

interface CartContextType {
  slug: string;
  mesa: number;
  restaurant: Restaurant | null;
  table: TableInfo | null;
  items: CartItem[];
  activeOrderId: string | null;
  setSession: (restaurant: Restaurant, table: TableInfo | null) => void;
  setActiveOrderId: (id: string | null) => void;
  addItem: (product: MenuProduct) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  updateItemNotes: (productId: string, notes: string) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | null>(null);

function getStorageKey(slug: string, mesa: number) {
  return `tonalli_order_${slug}_${mesa}`;
}

export function CartProvider({ slug, mesa, children }: { slug: string; mesa: number; children: ReactNode }) {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [table, setTable] = useState<TableInfo | null>(null);
  const [items, setItems] = useState<CartItem[]>([]);
  const [activeOrderId, setActiveOrderIdState] = useState<string | null>(() => {
    if (!slug || !mesa) return null;
    return localStorage.getItem(getStorageKey(slug, mesa));
  });

  const setSession = useCallback((r: Restaurant, t: TableInfo | null) => {
    setRestaurant(r);
    if (t) setTable(t);
  }, []);

  const setActiveOrderId = useCallback((id: string | null) => {
    setActiveOrderIdState(id);
    if (id) {
      localStorage.setItem(getStorageKey(slug, mesa), id);
    } else {
      localStorage.removeItem(getStorageKey(slug, mesa));
    }
  }, [slug, mesa]);

  const addItem = useCallback((product: MenuProduct) => {
    setItems(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        if (existing.quantity >= 10) return prev;
        return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { product, quantity: 1 }];
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems(prev => prev.filter(i => i.product.id !== productId));
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems(prev => prev.filter(i => i.product.id !== productId));
    } else {
      setItems(prev => prev.map(i => i.product.id === productId ? { ...i, quantity: Math.min(quantity, 10) } : i));
    }
  }, []);

  const updateItemNotes = useCallback((productId: string, notes: string) => {
    setItems(prev => prev.map(i => i.product.id === productId ? { ...i, notes } : i));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const totalItems = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items]);
  const totalPrice = useMemo(() => items.reduce((sum, i) => sum + Number(i.product.price) * i.quantity, 0), [items]);

  const value = useMemo(() => ({
    slug, mesa, restaurant, table, items, activeOrderId,
    setSession, setActiveOrderId, addItem, removeItem, updateQuantity, updateItemNotes, clearCart,
    totalItems, totalPrice,
  }), [slug, mesa, restaurant, table, items, activeOrderId, setSession, setActiveOrderId, addItem, removeItem, updateQuantity, updateItemNotes, clearCart, totalItems, totalPrice]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}

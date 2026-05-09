import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";

export interface CartItem {
  priceId: string;
  productId: string;
  name: string;
  unitAmount: number;
  quantity: number;
}

interface CartContextValue {
  items: CartItem[];
  isOpen: boolean;
  totalCount: number;
  totalCents: number;
  addItem: (item: Omit<CartItem, "quantity">, qty?: number) => void;
  removeItem: (priceId: string) => void;
  setQuantity: (priceId: string, qty: number) => void;
  clear: () => void;
  openCart: () => void;
  closeCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "bwf_cart_v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
      if (raw) setItems(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {}
  }, [items]);

  const addItem = useCallback((item: Omit<CartItem, "quantity">, qty: number = 1) => {
    setItems((prev) => {
      const i = prev.findIndex((p) => p.priceId === item.priceId);
      if (i >= 0) {
        const next = [...prev];
        next[i] = { ...next[i], quantity: Math.min(10, next[i].quantity + qty) };
        return next;
      }
      return [...prev, { ...item, quantity: qty }];
    });
    setIsOpen(true);
  }, []);

  const removeItem = useCallback((priceId: string) => {
    setItems((prev) => prev.filter((p) => p.priceId !== priceId));
  }, []);

  const setQuantity = useCallback((priceId: string, qty: number) => {
    setItems((prev) =>
      prev
        .map((p) => (p.priceId === priceId ? { ...p, quantity: Math.max(0, Math.min(10, qty)) } : p))
        .filter((p) => p.quantity > 0),
    );
  }, []);

  const clear = useCallback(() => setItems([]), []);
  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  const totalCount = items.reduce((s, i) => s + i.quantity, 0);
  const totalCents = items.reduce((s, i) => s + i.unitAmount * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, isOpen, totalCount, totalCents, addItem, removeItem, setQuantity, clear, openCart, closeCart }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
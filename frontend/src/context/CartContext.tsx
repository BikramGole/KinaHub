import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, RotateCcw, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ProductType } from '../lib/products';
import { price, productImage } from '../lib/products';

export interface CartItem {
  product: ProductType;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  totalCount: number;
  totalPrice: number;
  addToCart: (product: ProductType, quantity?: number) => void;
  removeFromCart: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | null>(null);

const CART_KEY = 'kinahub_cart';

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const stored = localStorage.getItem(CART_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Persist to localStorage on every change
  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  }, [items]);

  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce(
    (sum, item) => sum + price(item.product) * item.quantity,
    0
  );

  const [toast, setToast] = useState<{ id: number; product: ProductType } | null>(null);
  const toastTimerRef = useRef<NodeJS.Timeout>();

  const addToCart = useCallback((product: ProductType, quantity = 1) => {
    import('../lib/audio').then(m => m.playAddToCartSound());

    setItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: Math.min(item.quantity + quantity, product.stock) }
            : item
        );
      }
      return [...prev, { product, quantity: Math.min(quantity, product.stock) }];
    });

    const id = Date.now();
    setToast({ id, product });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, 5000);
  }, []);

  const removeFromCart = useCallback((productId: number) => {
    import('../lib/audio').then(m => m.playRemoveFromCartSound());
    setItems((prev) => prev.filter((item) => item.product.id !== productId));
  }, []);

  const updateQuantity = useCallback((productId: number, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((item) => item.product.id !== productId));
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        item.product.id === productId
          ? { ...item, quantity: Math.min(quantity, item.product.stock) }
          : item
      )
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  return (
    <CartContext.Provider
      value={{ items, totalCount, totalPrice, addToCart, removeFromCart, updateQuantity, clearCart }}
    >
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 sm:bottom-6 sm:right-6">
        <AnimatePresence>
          {toast && (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex w-full max-w-sm items-center gap-3 rounded-lg border border-border bg-background p-3 shadow-lg"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent/10">
                <Check className="h-5 w-5 text-accent" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-primary">Added to cart</p>
                <p className="truncate text-xs text-secondary">{toast.product.name}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    removeFromCart(toast.product.id);
                    setToast(null);
                  }}
                  className="flex items-center gap-1 rounded border border-border bg-surface px-2 py-1 text-xs font-semibold text-secondary transition-colors hover:border-accent hover:text-accent"
                >
                  <RotateCcw className="h-3 w-3" />
                  Undo
                </button>
                <Link
                  to="/cart"
                  onClick={() => setToast(null)}
                  className="rounded bg-accent px-2 py-1 text-xs font-semibold text-accent-foreground transition-colors hover:bg-accent/90"
                >
                  View
                </Link>
                <button onClick={() => setToast(null)} className="text-secondary hover:text-primary">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}

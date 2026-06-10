import { createContext, useContext, useState, useEffect, useCallback, useRef, Component } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, RotateCcw, X, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ProductType } from '../lib/products';
import { price } from '../lib/products';

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

class ToastErrorBoundary extends Component<{ children: ReactNode; fallback?: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('[Cart Toast ErrorBoundary]', error);
  }

  handleRetry = () => this.setState({ hasError: false });

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="fixed bottom-4 right-4 z-50 rounded-lg border border-border bg-background p-3 shadow-lg max-w-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-red-100">
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-primary">Cart notification error</p>
              <button onClick={this.handleRetry} className="text-xs text-accent hover:underline mt-1">Dismiss</button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const CartContext = createContext<CartContextType | null>(null);

const CART_KEY = 'kinahub_cart';

function normalizeProductForCart(product: ProductType): ProductType {
  return {
    ...product,
    store: product.store ?? null,
    brand: product.brand ?? null,
    category: product.category ?? {
      id: 0,
      name: 'Uncategorized',
      slug: 'uncategorized',
    },
    description: product.description || '',
    specifications: product.specifications || '',
    specs: Array.isArray(product.specs) ? product.specs : [],
    price: String(product.price ?? 0),
    discount_price: product.discount_price ?? null,
    stock: typeof product.stock === 'number' ? product.stock : 1,
    rating: String(product.rating ?? 0),
    tag: product.tag ?? null,
    is_featured: Boolean(product.is_featured),
    is_active: Boolean(product.is_active),
    images: Array.isArray(product.images) ? product.images : [],
  };
}

function normalizeCartItem(item: unknown): CartItem | null {
  if (!item || typeof item !== 'object') return null;

  const candidate = item as Partial<CartItem> & { product?: Partial<ProductType> | null };
  const product = candidate.product;

  if (!product || typeof product !== 'object') return null;
  if (typeof product.id !== 'number' || !product.slug || !product.name) return null;
  if (typeof candidate.quantity !== 'number' || !Number.isFinite(candidate.quantity) || candidate.quantity <= 0) return null;

  return {
    product: normalizeProductForCart(product as ProductType),
    quantity: Math.max(1, Math.floor(candidate.quantity)),
  };
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const stored = localStorage.getItem(CART_KEY);
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed.map(normalizeCartItem).filter(Boolean) as CartItem[] : [];
    } catch {
      return [];
    }
  });

  // Persist to localStorage on every change
  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(items));
    } catch (e) {
      // Handle quota exceeded or other storage errors
      console.warn('[Cart] Failed to persist to localStorage:', e);
      if (e instanceof DOMException && e.name === 'QuotaExceededError') {
        // Try to clear old data and retry
        try {
          localStorage.removeItem(CART_KEY);
          localStorage.setItem(CART_KEY, JSON.stringify(items));
        } catch {
          // Give up on persistence
        }
      }
    }
  }, [items]);

  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => {
    const itemPrice = price(item.product);
    const validPrice = Number.isFinite(itemPrice) ? itemPrice : 0;
    return sum + validPrice * item.quantity;
  }, 0);

  const [toast, setToast] = useState<{ id: number; product: ProductType } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const addToCart = useCallback((product: ProductType, quantity = 1) => {
    try {
      if (!product || typeof product.id !== 'number' || !product.slug) {
        console.warn('[Cart] Invalid product passed to addToCart:', product);
        return;
      }

      import('../lib/audio').then(m => m.playAddToCartSound?.()).catch(() => {});

      const normalizedProduct = normalizeProductForCart(product);

      setItems((prev) => {
        try {
          const existing = prev.find((item) => item.product.id === normalizedProduct.id);
          if (existing) {
            return prev.map((item) =>
              item.product.id === normalizedProduct.id
                ? { ...item, quantity: Math.min(item.quantity + quantity, normalizedProduct.stock || 1) }
                : item
            );
          }
          return [...prev, { product: normalizedProduct, quantity: Math.min(quantity, normalizedProduct.stock || 1) }];
        } catch (e) {
          console.error('[Cart] Error in setItems reducer:', e);
          return prev;
        }
      });

      const id = Date.now();
      setToast({ id, product: normalizedProduct });
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => {
        setToast((current) => (current?.id === id ? null : current));
      }, 5000);
    } catch (e) {
      console.error('[Cart] Unexpected error in addToCart:', e);
    }
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
          {toast && toast.product && (
            <ToastErrorBoundary fallback={<div className="fixed bottom-4 right-4 z-50" />}>
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
                  <p className="truncate text-xs text-secondary">{toast.product.name || 'Product'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (toast.product?.id) removeFromCart(toast.product.id);
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
            </ToastErrorBoundary>
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

import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Send, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../context/CartContext';
import { useTranslation } from '../i18n/LocaleContext';
import { askOpenRouter, cartAiOverview } from '../lib/ai';
import { Link } from 'react-router-dom';
import { API, productImage, price, formatPrice } from '../lib/products';
import type { ProductType } from '../lib/products';
import type { CartItem } from '../context/CartContext';

interface ChatMessage {
  role: 'assistant' | 'user';
  text: string;
}

// Replaced starter prompts array with t() calls inside the component

const MOBILE_DOCK_KEY = 'kinahub-ai-mobile-dock';
const LAUNCHER_SIZE = 48;
const MOBILE_GAP = 16;
const MOBILE_BOTTOM_OFFSET = 88;

export function aiChatReply(message: string, items: CartItem[]) {
  const input = message.toLowerCase();
  const cart = cartAiOverview(items);

  if (input.includes('cart') || input.includes('checkout') || input.includes('delivery') || input.includes('summarize') || input.includes('summary')) {
    const summary = cart.map((item) => item.body).join(' ');
    const productTags = items.map(i => `[PRODUCT:${i.product.slug}]`).join('\n');
    return items.length > 0 ? `${summary}\n\n${productTags}` : summary;
  }
  return "";
}

export default function AiAssistantWidget() {
  const { items } = useCart();
  const { t, locale } = useTranslation();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [catalog, setCatalog] = useState<ProductType[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [showBadge, setShowBadge] = useState(false);
  const prevItemsRef = useRef(items.length);
  const [launcherPosition, setLauncherPosition] = useState({ x: 0, y: 0 });
  const dragState = useRef({
    dragging: false,
    pointerId: -1,
    offsetX: 0,
    offsetY: 0,
    moved: false,
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = window.localStorage.getItem('kinahub-ai-messages');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        // ignore
      }
    }
    return [
      {
        role: 'assistant',
        text: t('ai.widget.greeting', { defaultValue: 'Ask me about products, delivery, seller stores, checkout, or your cart.' }),
      },
    ];
  });

  useEffect(() => {
    window.localStorage.setItem('kinahub-ai-messages', JSON.stringify(messages));
  }, [messages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-scroll when loading state changes (for typing indicator)
  useEffect(() => {
    if (loading) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [loading]);

  const cartHint = useMemo(() => cartAiOverview(items)[0]?.body, [items]);

  useEffect(() => {
    if (items.length > prevItemsRef.current) {
      setShowBadge(true);
      const timer = setTimeout(() => setShowBadge(false), 3000);
      prevItemsRef.current = items.length;
      return () => clearTimeout(timer);
    }
    prevItemsRef.current = items.length;
  }, [items]);

  useEffect(() => {
    const mobileQuery = window.matchMedia('(max-width: 639px)');

    function syncMobileState() {
      setIsMobile(mobileQuery.matches);
    }

    syncMobileState();
    mobileQuery.addEventListener('change', syncMobileState);

    // Fetch product catalog for AI context
    fetch(`${API}/items/`)
      .then(res => res.json())
      .then(data => {
        // Handle paginated responses (e.g. { results: [...] }) or direct arrays
        const items = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
        setCatalog(items);
      })
      .catch(() => setCatalog([]));

    return () => mobileQuery.removeEventListener('change', syncMobileState);
  }, []);

  useEffect(() => {
    if (!isMobile) return;

    const stored = window.localStorage.getItem(MOBILE_DOCK_KEY);
    if (stored) {
      try {
        const next = JSON.parse(stored) as { x: number; y: number };
        if (typeof next.x === 'number' && typeof next.y === 'number') {
          setLauncherPosition(clampLauncher(next.x, next.y));
          return;
        }
      } catch {
        // Ignore malformed storage.
      }
    }

    setLauncherPosition(getDefaultMobileDock());
  }, [isMobile]);

  useEffect(() => {
    if (!isMobile) return;

    function handleResize() {
      setLauncherPosition((current) => clampLauncher(current.x, current.y));
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobile]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    
    const newMessages: ChatMessage[] = [
      ...messages,
      { role: 'user', text: trimmed },
    ];
    setMessages(newMessages);
    setMessage('');

    // Fast-path for common offline queries
    const fastReply = aiChatReply(trimmed, items);
    if (fastReply) {
      setMessages(current => [
        ...current,
        { role: 'assistant', text: fastReply },
      ]);
      return;
    }

    setLoading(true);

    try {
      const replyText = await askOpenRouter(newMessages, items, locale, catalog);
      setMessages(current => [
        ...current,
        { role: 'assistant', text: replyText },
      ]);
    } catch (e) {
      console.error("AI Error:", e);
      setMessages(current => [
        ...current,
        { role: 'assistant', text: t('ai.widget.error', { defaultValue: 'Sorry, something went wrong. Please try again.' }) },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    sendMessage(message);
  }

  function resetConversation() {
    setMessages([
      {
        role: 'assistant',
        text: t('ai.widget.greeting', { defaultValue: 'Ask me about products, delivery, seller stores, checkout, or your cart.' }),
      },
    ]);
    setMessage('');
  }

  function clampLauncher(x: number, y: number) {
    const maxX = Math.max(window.innerWidth - LAUNCHER_SIZE - MOBILE_GAP, MOBILE_GAP);
    const maxY = Math.max(window.innerHeight - LAUNCHER_SIZE - MOBILE_GAP, MOBILE_GAP);
    return {
      x: Math.min(Math.max(x, MOBILE_GAP), maxX),
      y: Math.min(Math.max(y, MOBILE_GAP), maxY),
    };
  }

  function getDefaultMobileDock() {
    return clampLauncher(window.innerWidth - LAUNCHER_SIZE - MOBILE_GAP, window.innerHeight - LAUNCHER_SIZE - MOBILE_BOTTOM_OFFSET);
  }

  function handlePointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    if (!isMobile || event.pointerType !== 'touch') return;
    const rect = event.currentTarget.getBoundingClientRect();
    dragState.current = {
      dragging: true,
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    if (!isMobile || !dragState.current.dragging || dragState.current.pointerId !== event.pointerId) return;
    event.preventDefault();
    const next = clampLauncher(event.clientX - dragState.current.offsetX, event.clientY - dragState.current.offsetY);
    dragState.current.moved = dragState.current.moved || Math.abs(next.x - launcherPosition.x) > 2 || Math.abs(next.y - launcherPosition.y) > 2;
    setLauncherPosition(next);
  }

  function endDrag(event: React.PointerEvent<HTMLButtonElement>) {
    if (!isMobile || dragState.current.pointerId !== event.pointerId) return;
    dragState.current.dragging = false;
    dragState.current.pointerId = -1;
    window.localStorage.setItem(MOBILE_DOCK_KEY, JSON.stringify(launcherPosition));
  }

  function handleLauncherClick() {
    if (isMobile && dragState.current.moved) {
      dragState.current.moved = false;
      return;
    }
    setOpen((current) => !current);
  }

  // Build a lookup of all known products (catalog + cart items)
  const allProducts = useMemo(() => {
    const map = new Map<string, ProductType>();
    // 1. Load cart items (which might have stale data from localStorage)
    for (const ci of items) {
      const p = ci.product;
      if (p.slug) map.set(p.slug, p);
    }
    // 2. Overwrite with fresh catalog data fetched from the API
    for (const p of catalog) {
      if (p.slug) map.set(p.slug, p);
    }
    return map;
  }, [catalog, items]);

  const starterPrompts = [
    t('ai.widget.promptSummarize', { defaultValue: 'Summarize my cart' }),
    t('ai.widget.promptDeals', { defaultValue: 'Find best deals' }),
    t('ai.widget.promptDelivery', { defaultValue: 'Explain delivery' }),
    t('ai.widget.promptSellers', { defaultValue: 'How sellers work' })
  ];

  const renderMessage = (text: string) => {
    // Basic markdown for **bold** and [PRODUCT:slug]
    const parts = text.split(/(\*\*.*?\*\*|\[PRODUCT:[a-zA-Z0-9_-]+\])/g);

    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="font-bold">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('[PRODUCT:') && part.endsWith(']')) {
        const slug = part.slice(9, -1);
        const product = allProducts.get(slug);
        if (!product) return null;

        // Check if this item is in the cart to show quantity
        const cartItem = items.find(ci => ci.product.slug === slug);

        return (
          <Link
            key={index}
            to={`/product/${product.slug}`}
            className="my-2 flex items-center gap-3 rounded-lg border border-border bg-background p-2 transition-colors hover:border-accent hover:bg-surface"
          >
            <img 
              src={productImage(product)} 
              alt={product.name}
              className="h-12 w-12 rounded-md object-cover" 
            />
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-semibold text-primary">{product.name}</p>
              <p className="text-xs font-bold text-accent">
                {formatPrice(price(product))}
                {cartItem ? ` × ${cartItem.quantity}` : ''}
              </p>
            </div>
          </Link>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={handleLauncherClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={endDrag}
        style={
          isMobile
            ? {
                left: launcherPosition.x,
                top: launcherPosition.y,
                right: 'auto',
                bottom: 'auto',
              }
            : undefined
        }
        className={`group fixed z-[60] flex h-14 w-14 items-center justify-center transition-all active:scale-95 ${
          isMobile ? 'touch-none' : 'hover:scale-110 bottom-24 right-4 sm:bottom-6 sm:right-6'
        }`}
        aria-label="Open AI assistant"
      >
        <div className="relative z-10 flex h-full w-full items-center justify-center overflow-hidden rounded-full border border-accent/40 bg-accent shadow-lg shadow-black/20">
          <img 
            src="/kinu-mascot-transparent.svg" 
            alt="Kinu AI" 
            className="h-full w-full object-cover scale-[1.35] translate-y-1 transition-transform duration-500 ease-out group-hover:scale-[1.25] group-hover:translate-y-1.5" 
          />
        </div>
        
        {/* Discord-style notification/status badge */}
        <AnimatePresence>
          {showBadge && (
            <motion.div 
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="absolute -top-0.5 -right-0.5 z-30 h-4 w-4 rounded-full border-2 border-background bg-red-500 shadow-sm" 
            />
          )}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.button
              type="button"
              aria-label="Close AI assistant"
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px] sm:bg-transparent sm:backdrop-blur-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, y: 36 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 36 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="fixed inset-x-0 bottom-16 z-50 flex max-h-[calc(100svh-8rem)] flex-col overflow-hidden rounded-t-3xl border border-border bg-surface shadow-2xl shadow-black/35 sm:inset-auto sm:bottom-24 sm:right-6 sm:left-auto sm:block sm:w-[420px] sm:rounded-lg sm:max-h-none"
            >
              <div className="flex justify-center pt-2 sm:hidden">
                <span className="h-1.5 w-12 rounded-full bg-border" />
              </div>

              <div className="flex items-start justify-between gap-3 border-b border-border bg-background px-4 py-3 sm:px-4 sm:py-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent/10">
                    <img src="/kinu-mascot-transparent.svg" alt="Kinu AI" className="h-8 w-8 object-contain drop-shadow-sm" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-primary">{t('ai.widget.title', { defaultValue: 'Kinu AI' })}</p>
                    <p className="text-xs text-secondary">{t('ai.widget.subtitle', { defaultValue: 'Local commerce assistant' })}</p>
                    <p className="mt-1 inline-flex items-center rounded-full border border-accent/20 bg-accent/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent">
                      {t('ai.widget.ready', { defaultValue: 'Ready' })}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={resetConversation}
                    className="rounded-md px-2 py-1 text-xs font-semibold text-secondary hover:bg-surface hover:text-primary"
                  >
                    {t('ai.widget.newChat', { defaultValue: 'New chat' })}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="flex h-9 w-9 items-center justify-center rounded-md text-secondary hover:bg-surface hover:text-primary"
                    aria-label="Close AI assistant"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex min-h-0 flex-1 flex-col sm:h-[560px] sm:min-h-0 sm:max-h-[min(72vh,44rem)]">
                <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3" ref={messagesEndRef}>
                  {cartHint && (
                    <div className="rounded-md border border-accent/30 bg-accent/10 p-3 text-sm leading-6 text-primary">
                      {cartHint}
                    </div>
                  )}
                  {messages.map((item, index) => (
                    <div
                      key={`${item.role}-${index}`}
                      className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-6 whitespace-pre-wrap break-words ${
                        item.role === 'assistant'
                          ? 'mr-auto border border-border bg-background text-primary selection:bg-accent/20'
                          : 'ml-auto bg-accent text-background selection:bg-background/30 selection:text-background'
                      }`}
                    >
                      {renderMessage(item.text)}
                    </div>
                  )                  )}
                  {loading && (
                    <div className="mr-auto rounded-2xl border border-border bg-background px-4 py-3 text-primary">
                      <div className="flex items-center gap-1">
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-secondary [animation-delay:-0.3s]"></span>
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-secondary [animation-delay:-0.15s]"></span>
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-secondary"></span>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="shrink-0 border-t border-border bg-background/95 px-3 py-2.5 pb-[calc(env(safe-area-inset-bottom)+0.9rem)] backdrop-blur-sm sm:bg-background/70 sm:pb-3">
                  <div className="scrollbar-hide mb-2.5 flex gap-2 overflow-x-auto pb-1">
                    {starterPrompts.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => sendMessage(prompt)}
                        className="shrink-0 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-secondary hover:border-accent hover:text-primary"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                  <form onSubmit={submit} className="flex items-center gap-2">
                    <input
                      value={message}
                      onChange={(event) => setMessage(event.target.value)}
                      placeholder={t('ai.widget.placeholder', { defaultValue: 'Ask KinaHub AI' })}
                      className="h-11 min-w-0 flex-1 rounded-full border border-border bg-background px-4 text-sm text-primary outline-none focus:border-accent"
                    />
                    <button
                      type="submit"
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-background transition-transform hover:scale-105 active:scale-95"
                      aria-label="Send message"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </form>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

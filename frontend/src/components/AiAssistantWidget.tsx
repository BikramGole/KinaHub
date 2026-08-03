import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Send, X, ShoppingCart, Check } from 'lucide-react';

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

const ORDINAL_MAP: Record<string, number> = {
  first: 0, '1st': 0, '1': 0,
  second: 1, '2nd': 1, '2': 1,
  third: 2, '3rd': 2, '3': 2,
  fourth: 3, '4th': 3, '4': 3,
  fifth: 4, '5th': 4, '5': 4,
};

function resolveOrdinalPick(text: string, count: number): number | null {
  if (!/(add|put|include|order|buy|cart)/i.test(text)) return null;
  const lower = text.toLowerCase();
  if (/\blast\b/.test(lower) && count > 0) return count - 1;
  for (const [word, index] of Object.entries(ORDINAL_MAP)) {
    if (new RegExp(`\\b${word}\\b`).test(lower) && index < count) return index;
  }
  return null;
}

const ADD_STOP_WORDS = new Set([
  'add', 'put', 'include', 'throw', 'my', 'cart', 'bag', 'to', 'the', 'a', 'an',
  'buy', 'bought', 'purchase', 'order', 'please', 'for', 'and', 'of', 'in', 'me',
  'want', 'need', 'get', 'i', 'it', 'one', 'that', 'this', 'product', 'item',
]);

function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !ADD_STOP_WORDS.has(w));
}

function findProductInCatalog(query: string, catalog: ProductType[]): ProductType | undefined {
  const q = query.toLowerCase();

  // 1. Exact product name present in the query (e.g. "add MacBook Air M3 to my cart")
  const exact = catalog.find((p) => p.name && q.includes(p.name.toLowerCase()));
  if (exact) return exact;

  // 2. Word-overlap scoring (e.g. "macbook" → "MacBook Air M3", "iphone" → "iPhone 16 Pro Max")
  const tokens = tokenize(q);
  if (tokens.length === 0) return undefined;

  let best: ProductType | undefined;
  let bestScore = 0;
  for (const product of catalog) {
    if (!product.name) continue;
    const name = product.name.toLowerCase();
    const nameWords = new Set(name.split(/[^a-z0-9]+/).filter((w) => w.length > 1));
    const description = (product.description || '').toLowerCase();
    let score = 0;
    for (const token of tokens) {
      if (nameWords.has(token)) score += 3;
      else if (name.startsWith(token) || name.includes(` ${token}`)) score += 2;
      else if (name.includes(token)) score += 1;
      else if (description.includes(token)) score += 0.5;
    }
    if (score > bestScore) {
      bestScore = score;
      best = product;
    }
  }
  return bestScore >= 3 ? best : undefined;
}

export default function AiAssistantWidget() {
  const { items, addToCart } = useCart();
  const { t, locale } = useTranslation();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [catalog, setCatalog] = useState<ProductType[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [showBadge, setShowBadge] = useState(false);
  const prevItemsRef = useRef(items.length);
  const pendingAddRef = useRef<string | null>(null);
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
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 100);
  }, [messages, open]); // Also scroll when opening the chat widget

  // Auto-scroll when loading state changes (for typing indicator)
  useEffect(() => {
    if (loading) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 100);
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

    // Fast-path for founder questions (guaranteed answer + photo)
    const founderIntent = /(who|about|tell).*(bikram|founder|creator)|founder of|who (made|created|built|started) (this|kinahub|you|kina)|who founded|who are you/i.test(trimmed);
    if (founderIntent) {
      setMessages(current => [
        ...current,
        {
          role: 'assistant',
          text: `${t('ai.widget.founderReply', { defaultValue: 'KinaHub was founded by **Bikram Gole** as his Class 10 OJT school project, built with Django. He is a minimalist builder from Nepal who runs Linux from Scratch and writes C++, Python, and Bash. His other projects include Ytdaily, BinodLivestock, Snapcode, and RVX-UltraLock.' })}\n\n[IMAGE:founder]`,
        },
      ]);
      return;
    }

    // Spoken confirmation of a pending "add to cart" offer
    const confirmIntent = /^(yes|yeah|yep|yup|sure|ok|okay|k|alright|fine|go ahead|do it|add it|confirm|confirmed|correct|right|yes please|ok add|okay add)/i.test(trimmed);
    const denyIntent = /^(no|nope|nah|cancel|never ?mind|not now|stop|dont|don't|quit|skip)/i.test(trimmed);
    if (confirmIntent && pendingAddRef.current) {
      const product = allProducts.get(pendingAddRef.current);
      pendingAddRef.current = null;
      if (product) {
        addToCart(product, 1);
        setMessages(current => [
          ...current,
          {
            role: 'assistant',
            text: `${t('ai.widget.addedReply', { defaultValue: 'Done!' })} **${product.name}** ${t('ai.widget.addedToCart', { defaultValue: 'is in your cart.' })}\n\n[PRODUCT:${product.slug}]`,
          },
        ]);
        return;
      }
    }
    if (denyIntent && pendingAddRef.current) {
      pendingAddRef.current = null;
      setMessages(current => [
        ...current,
        { role: 'assistant', text: t('ai.widget.deniedReply', { defaultValue: 'No problem — nothing added.' }) },
      ]);
      return;
    }
    if (!confirmIntent && !denyIntent) {
      pendingAddRef.current = null;
    }

    // Offline fast-path: "add the second one" style references against the last AI suggestions
    const lastAssistant = messages[messages.length - 1];
    if (lastAssistant?.role === 'assistant') {
      const tagSlugs = [...lastAssistant.text.matchAll(/\[PRODUCT:([a-zA-Z0-9_-]+)\]/g)].map((match) => match[1]);
      if (tagSlugs.length > 0) {
        const pick = resolveOrdinalPick(trimmed, tagSlugs.length);
        if (pick !== null) {
          const product = allProducts.get(tagSlugs[pick]);
          if (product) {
            setMessages(current => [
              ...current,
              {
                role: 'assistant',
                text: `${t('ai.widget.confirmAdd', { defaultValue: 'Sure! Shall I add' })} **${product.name}** ${t('ai.widget.confirmAddToCart', { defaultValue: 'to your cart?' })}\n\n[ADD_TO_CART:${product.slug}]`,
              },
            ]);
            return;
          }
        }
      }
    }

    // Offline fast-path: add-to-cart intent against the loaded catalog
    const addIntent = /(add|put|include|throw).*(cart|bag)|(cart|bag).*(add|put|include)|buy|purchase|order/i.test(trimmed);
    if (addIntent && catalog.length > 0) {
      const found = findProductInCatalog(trimmed, catalog);
      if (found) {
        setMessages(current => [
          ...current,
          {
            role: 'assistant',
            text: `${t('ai.widget.confirmAdd', { defaultValue: 'Sure! Shall I add' })} **${found.name}** ${t('ai.widget.confirmAddToCart', { defaultValue: 'to your cart?' })}\n\n[ADD_TO_CART:${found.slug}]`,
          },
        ]);
        return;
      }
    }

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
    t('ai.widget.promptFounder', { defaultValue: 'Who made you?' }),
    t('ai.widget.promptSummarize', { defaultValue: 'Summarize my cart' }),
    t('ai.widget.promptDeals', { defaultValue: 'Find best deals' }),
    t('ai.widget.promptDelivery', { defaultValue: 'Explain delivery' }),
    t('ai.widget.promptSellers', { defaultValue: 'How sellers work' })
  ];

  const renderMessage = (text: string) => {
    // Basic markdown for **bold**, [PRODUCT:slug], [ADD_TO_CART:slug] and [IMAGE:key]
    const parts = text.split(/(\*\*.*?\*\*|\[PRODUCT:[a-zA-Z0-9_-]+\]|\[ADD_TO_CART:[a-zA-Z0-9_-]+\]|\[IMAGE:[a-z]+\])/g);

    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="font-bold">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('[IMAGE:') && part.endsWith(']')) {
        const key = part.slice(7, -1);
        if (key === 'founder') {
          return (
            <div key={index} className="my-2 overflow-hidden rounded-lg border border-border mx-auto max-w-[180px]">
              <img
                src="/founder/Bikram.jpeg"
                alt="Bikram Gole"
                className="aspect-[2/3] w-full object-cover"
              />
            </div>
          );
        }
        return null;
      }
      if (part.startsWith('[ADD_TO_CART:') && part.endsWith(']')) {
        const slug = part.slice(14, -1);
        const product = allProducts.get(slug);
        if (!product) return null;

        // Check if this item is in the cart to show quantity
        const cartItem = items.find(ci => ci.product.slug === slug);

        return (
          <div
            key={index}
            className="my-2 flex items-center gap-3 rounded-lg border border-border bg-background p-2"
          >
            <img 
              src={productImage(product)} 
              alt={product.name}
              className="h-12 w-12 rounded-md object-cover" 
            />
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-semibold text-primary">{product.name}</p>
              <p className="text-xs font-bold text-accent">{formatPrice(price(product))}</p>
            </div>
            <button
              type="button"
              onClick={() => addToCart(product, 1)}
              className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                cartItem
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-accent text-background hover:bg-orange-600'
              }`}
              aria-label={`${t('ai.widget.addToCart', { defaultValue: 'Add to cart' })} ${product.name}`}
            >
              {cartItem ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  {t('ai.widget.addedToCart', { defaultValue: 'Added' })}
                  {cartItem.quantity > 1 ? ` × ${cartItem.quantity}` : ''}
                </>
              ) : (
                <>
                  <ShoppingCart className="h-3.5 w-3.5" />
                  {t('ai.widget.addToCart', { defaultValue: 'Add to cart' })}
                </>
              )}
            </button>
          </div>
        );
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
        {showBadge && (
          <div className="absolute -top-0.5 -right-0.5 z-30 h-4 w-4 rounded-full border-2 border-background bg-red-500 shadow-sm" />
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close AI assistant"
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px] sm:bg-transparent sm:backdrop-blur-0"
            onClick={() => setOpen(false)}
          />

          <div className="anim-slide-up fixed inset-x-0 bottom-16 z-50 flex max-h-[calc(100svh-8rem)] flex-col overflow-hidden rounded-t-3xl border border-border bg-surface shadow-2xl shadow-black/35 sm:inset-auto sm:bottom-24 sm:right-6 sm:left-auto sm:block sm:w-[420px] sm:rounded-lg sm:max-h-none"
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
                <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
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
          </div>
        </>
      )}
    </>
  );
}

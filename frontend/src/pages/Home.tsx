import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BadgePercent, Truck, ShieldCheck, RefreshCw, Flame, Star, Tag, Sparkles, ChevronLeft, ChevronRight, Store, Clock, TrendingUp, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ProductCard from '../components/ProductCard';
import AiInsightPanel from '../components/AiInsightPanel';
import { API, formatPrice, price, productImage } from '../lib/products';
import { marketAiOverview } from '../lib/ai';
import { getCategoryIcon } from '../lib/categoryIcons';
import { categoryDescription, categoryName } from '../lib/categoryText';
import type { CategoryType, ProductType } from '../lib/products';
import { useTranslation } from '../i18n/LocaleContext';
import Seo from '../components/Seo';

const quickLinks = ['mobiles', 'fashion', 'groceries', 'gaming', 'appliances', 'books'];

// Horizontal scrollable product row
function ProductRow({ products }: { products: ProductType[] }) {
  const rowRef = useRef<HTMLDivElement>(null);
  const scroll = (dir: 'left' | 'right') => {
    if (rowRef.current) rowRef.current.scrollBy({ left: dir === 'left' ? -360 : 360, behavior: 'smooth' });
  };
  return (
    <div className="relative group">
      <button
        onClick={() => scroll('left')}
        className="absolute -left-4 top-1/2 z-10 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:border-accent"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <div
        ref={rowRef}
        className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide scroll-smooth"
        style={{ scrollbarWidth: 'none' }}
      >
        {products.map((product) => (
          <div key={product.id} className="shrink-0 w-[220px] sm:w-[240px]">
            <ProductCard product={product} compact />
          </div>
        ))}
      </div>
      <button
        onClick={() => scroll('right')}
        className="absolute -right-4 top-1/2 z-10 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:border-accent"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

// Section header component
function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  linkTo,
  linkLabel,
  badge,
}: {
  icon?: React.ElementType;
  title: string;
  subtitle?: string;
  linkTo?: string;
  linkLabel?: string;
  badge?: string;
}) {
  return (
    <div className="mb-5 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        {Icon && (
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-accent/10 text-accent">
            <Icon className="h-5 w-5" />
          </span>
        )}
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black tracking-tight sm:text-2xl">{title}</h2>
            {badge && (
              <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent">
                {badge}
              </span>
            )}
          </div>
          {subtitle && <p className="text-xs text-secondary mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {linkTo && (
        <Link to={linkTo} className="flex items-center gap-1 text-sm font-semibold text-accent hover:underline shrink-0">
          {linkLabel || 'View all'} <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}

// Deal card for discounted products
function DealCard({ product }: { product: ProductType }) {
  const original = parseFloat(product.price as unknown as string);
  const discounted = parseFloat((product.discount_price || product.price) as unknown as string);
  const pct = original > 0 ? Math.round(((original - discounted) / original) * 100) : 0;

  return (
    <Link
      to={`/product/${product.slug}`}
      className="group flex gap-3 rounded-lg border border-border bg-surface p-3 transition-all hover:border-accent hover:shadow-md"
    >
      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-md bg-muted">
        <img
          src={productImage(product)}
          alt={product.name}
          className="h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm font-semibold text-primary leading-snug">{product.name}</p>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-base font-black text-accent">{formatPrice(price(product))}</span>
          {product.discount_price && (
            <span className="text-xs text-secondary line-through">{formatPrice(original)}</span>
          )}
        </div>
        {pct > 0 && (
          <span className="mt-1 inline-block rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-bold text-accent">
            -{pct}% OFF
          </span>
        )}
      </div>
    </Link>
  );
}

export default function Home() {
  const { t } = useTranslation();
  const [products, setProducts] = useState<ProductType[]>([]);
  const [newestProducts, setNewestProducts] = useState<ProductType[]>([]);
  const [dealsProducts, setDealsProducts] = useState<ProductType[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<ProductType[]>([]);
  const [techProducts, setTechProducts] = useState<ProductType[]>([]);
  const [fashionProducts, setFashionProducts] = useState<ProductType[]>([]);
  const [groceryProducts, setGroceryProducts] = useState<ProductType[]>([]);
  const [booksProducts, setBooksProducts] = useState<ProductType[]>([]);
  const [categories, setCategories] = useState<CategoryType[]>([]);
  const [heroReady, setHeroReady] = useState(false);
  const [heroIndex, setHeroIndex] = useState(0);

  const trustBadges = [
    { Icon: Truck, title: t('home.badgeFastDelivery', { defaultValue: 'Fast local delivery' }), copy: t('home.badgeFastCopy', { defaultValue: 'From nearby seller stores' }) },
    { Icon: BadgePercent, title: t('home.badgeDailyDeals', { defaultValue: 'Shop-owned products' }), copy: t('home.badgeDailyCopy', { defaultValue: 'Every item belongs to a store' }) },
    { Icon: ShieldCheck, title: t('home.badgeChecked', { defaultValue: 'Seller CRM included' }), copy: t('home.badgeCheckedCopy', { defaultValue: 'Stores manage catalog and orders' }) },
  ];

  useEffect(() => {
    // Random hero/main products
    fetch(`${API}/items/?random=true`)
      .then((r) => r.json())
      .then((data: ProductType[]) => {
        setProducts(data.slice(0, 30));
        setTimeout(() => setHeroReady(true), 600);
      })
      .catch(() => setHeroReady(true));

    // Newest arrivals
    fetch(`${API}/items/?sort=newest&limit=16`)
      .then((r) => r.json())
      .then((data: ProductType[]) => setNewestProducts(data.slice(0, 16)))
      .catch(() => {});

    // Deals (price_low approximation via discount filter through random + filter client-side)
    fetch(`${API}/items/?random=true&limit=40`)
      .then((r) => r.json())
      .then((data: ProductType[]) => {
        const discounted = data.filter((p) => p.discount_price && parseFloat(p.discount_price as unknown as string) < parseFloat(p.price as unknown as string));
        setDealsProducts(discounted.slice(0, 12));
      })
      .catch(() => {});

    // Category-specific rows
    fetch(`${API}/items/?category=laptops&limit=10`)
      .then((r) => r.json())
      .then((data: ProductType[]) => setTechProducts(data.slice(0, 10)))
      .catch(() => {});

    fetch(`${API}/items/?category=fashion&limit=10`)
      .then((r) => r.json())
      .then((data: ProductType[]) => setFashionProducts(data.slice(0, 10)))
      .catch(() => {});

    fetch(`${API}/items/?category=groceries&limit=10`)
      .then((r) => r.json())
      .then((data: ProductType[]) => setGroceryProducts(data.slice(0, 10)))
      .catch(() => {});

    fetch(`${API}/items/?category=books&limit=10`)
      .then((r) => r.json())
      .then((data: ProductType[]) => setBooksProducts(data.slice(0, 10)))
      .catch(() => {});

    // Categories
    fetch(`${API}/categories/`)
      .then((r) => r.json())
      .then((data: CategoryType[]) => setCategories([...data].sort((a, b) => a.name.localeCompare(b.name))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (products.length === 0) return;

    const immediateFeatured = products.filter((product) => product.is_featured).slice(0, 8);
    if (immediateFeatured.length > 0) {
      setFeaturedProducts(immediateFeatured);
    }

    const timer = window.setTimeout(() => {
      fetch(`${API}/items/?featured=true&limit=12`)
        .then((r) => r.json())
        .then((data: ProductType[]) => {
          const next = Array.isArray(data) ? data.slice(0, 12) : [];
          setFeaturedProducts(next.length > 0 ? next : immediateFeatured);
        })
        .catch(() => {
          if (immediateFeatured.length > 0) setFeaturedProducts(immediateFeatured);
        });
    }, 900);

    return () => window.clearTimeout(timer);
  }, [products]);

  // Rotate hero product
  useEffect(() => {
    if (products.length === 0) return;
    const interval = setInterval(() => {
      setHeroReady(false);
      setTimeout(() => {
        setHeroIndex((prev) => (prev + 1) % products.length);
        setHeroReady(true);
      }, 300);
    }, 30000);
    return () => clearInterval(interval);
  }, [products.length]);

  const heroProduct = products[heroIndex];
  const otherProducts = products.filter((_, idx) => idx !== heroIndex);
  const flashDeals = otherProducts.slice(0, 4);
  const dailyPicks = otherProducts.slice(4, 12);
  const trendingProducts = otherProducts.slice(12, 20);
  const recommendedProducts = otherProducts.slice(20, 29);

  return (
    <div className="min-h-screen">
      <Seo
        title="KinaHub"
        description="Shop products from local seller stores with marketplace checkout, seller CRM, and delivery support."
      />

      {/* ── Hero ── */}
      <section className="bg-background border-b border-border">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg border border-border bg-surface p-5 text-primary shadow-sm sm:p-6"
          >
            <div className="mb-5 flex gap-2 overflow-x-auto pb-1 sm:mb-6 sm:flex-wrap sm:overflow-visible sm:pb-0">
              {quickLinks.map((slug) => (
                <Link
                  key={slug}
                  to={`/products?category=${slug}`}
                  className="shrink-0 rounded-full border border-border bg-muted px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:border-accent hover:bg-accent hover:text-background"
                >
                  {categoryName(t, slug, slug)}
                </Link>
              ))}
            </div>
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-accent">
              <Flame className="h-4 w-4" />
              {t('home.flashPicks', { defaultValue: 'Flash picks' })}
            </p>
            <h1 className="max-w-2xl text-2xl font-black tracking-tight sm:text-4xl lg:text-5xl">
              {t('home.heroTitle', { defaultValue: 'Deals first. Products everywhere.' })}
            </h1>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/products"
                className="inline-flex items-center gap-2 rounded-md bg-accent px-5 py-3 font-semibold text-background transition-colors hover:bg-orange-600"
              >
                {t('home.shopNow', { defaultValue: 'Shop now' })} <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/products?random=true"
                className="inline-flex items-center gap-2 rounded-md border border-border px-5 py-3 font-semibold text-primary transition-colors hover:border-accent hover:bg-surface"
              >
                {t('home.randomFeed', { defaultValue: 'Random feed' })} <RefreshCw className="h-4 w-4" />
              </Link>
            </div>
          </motion.div>

          <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
            <AnimatePresence mode="wait">
              {heroProduct && heroReady ? (
                <motion.div
                  key="hero"
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                >
                  <Link to={`/product/${heroProduct.slug}`} className="group block">
                    <div className="aspect-[5/4] overflow-hidden rounded-md bg-muted">
                      <img
                        src={productImage(heroProduct)}
                        alt={heroProduct.name}
                        fetchPriority="high"
                        loading="eager"
                        decoding="sync"
                        className="h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                    <div className="pt-4">
                      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                        <span className="font-semibold text-accent">{heroProduct.tag || categoryName(t, heroProduct.category.slug, heroProduct.category.name)}</span>
                        <span className="text-secondary">{heroProduct.stock} {t('home.leftInStock', { defaultValue: 'left' })}</span>
                      </div>
                      <h2 className="line-clamp-1 text-xl font-bold sm:text-2xl">{heroProduct.name}</h2>
                      {heroProduct.store?.name && (
                        <p className="mt-1 text-sm font-medium text-secondary">
                          {t('products.soldBy', { defaultValue: 'Sold by' })} {heroProduct.store.name}
                        </p>
                      )}
                      <div className="mt-2 flex items-baseline gap-3">
                        <span className="text-2xl font-black text-primary">{formatPrice(price(heroProduct))}</span>
                        {heroProduct.discount_price && (
                          <span className="text-sm text-secondary line-through">{formatPrice(heroProduct.price)}</span>
                        )}
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ) : (
                <motion.div
                  key="skeleton"
                  initial={{ opacity: 0.6 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="animate-pulse"
                >
                  <div className="aspect-[5/4] rounded-md bg-muted/60" />
                  <div className="pt-4 space-y-3">
                    <div className="flex justify-between">
                      <div className="h-4 w-24 rounded bg-muted/60" />
                      <div className="h-4 w-16 rounded bg-muted/60" />
                    </div>
                    <div className="h-7 w-3/4 rounded bg-muted/60" />
                    <div className="h-4 w-1/2 rounded bg-muted/60" />
                    <div className="h-8 w-1/3 rounded bg-muted/60" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* ── AI Insight ── */}
      {products.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <AiInsightPanel title="AI shopping overview" insights={marketAiOverview(products)} />
        </section>
      )}

      {/* ── Trust Badges ── */}
      <section className="border-b border-border bg-muted/40">
        <div className="mx-auto grid max-w-7xl grid-cols-1 divide-y divide-border px-4 sm:px-6 md:grid-cols-3 md:divide-x md:divide-y-0 lg:px-8">
          {trustBadges.map(({ Icon, title, copy }) => (
            <div key={title} className="flex items-center gap-4 py-5 md:px-6">
              <span className="flex h-11 w-11 items-center justify-center rounded-md bg-accent/10 text-accent">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <p className="font-semibold text-primary">{title}</p>
                <p className="text-sm text-secondary">{copy}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Flash Deals (4 cards) ── */}
      {flashDeals.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <SectionHeader
            icon={Zap}
            title={t('home.flashDeals', { defaultValue: 'Flash deals' })}
            subtitle="Limited-time prices from local stores"
            linkTo="/products"
            linkLabel="More deals"
            badge="HOT"
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {flashDeals.map((product) => (
              <ProductCard key={product.id} product={product} compact />
            ))}
          </div>
        </section>
      )}

      {/* ── Deals & Discounts compact list ── */}
      {dealsProducts.length > 0 && (
        <section className="border-y border-border bg-muted/30">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <SectionHeader
              icon={Tag}
              title="Deals & Discounts"
              subtitle="Products with the biggest savings right now"
              linkTo="/products?sort=price_low"
              linkLabel="All deals"
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {dealsProducts.slice(0, 9).map((product) => (
                <DealCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Shop by Category ── */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <SectionHeader
          title={t('home.shopByCategory', { defaultValue: 'Shop by category' })}
          subtitle={t('home.categorySubtitle', { defaultValue: 'Browse products listed by local stores.' })}
          linkTo="/products"
          linkLabel={t('home.viewAll', { defaultValue: 'View all' })}
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {categories.map((category) => (
            <Link
              key={category.id}
              to={`/products?category=${category.slug}`}
              className="rounded-lg border border-border bg-surface p-4 transition-colors hover:border-accent hover:bg-muted"
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-primary">{categoryName(t, category.slug, category.name)}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-secondary">{categoryDescription(t, category.slug, category.description || '')}</p>
                </div>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-background text-accent">
                  {(() => {
                    const Icon = getCategoryIcon(category.slug);
                    return <Icon className="h-5 w-5" aria-hidden="true" />;
                  })()}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── New Arrivals (horizontal scroll) ── */}
      {newestProducts.length > 0 && (
        <section className="border-t border-border bg-muted/20">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <SectionHeader
              icon={Clock}
              title="New Arrivals"
              subtitle="The latest products added to the marketplace"
              linkTo="/products?sort=newest"
              linkLabel="See all new"
              badge="NEW"
            />
            <ProductRow products={newestProducts} />
          </div>
        </section>
      )}

      {/* ── Featured Picks ── */}
      {featuredProducts.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <SectionHeader
            icon={Star}
            title="Featured Products"
            subtitle="Handpicked by stores for you"
            linkTo="/products?featured=true"
            linkLabel="All featured"
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featuredProducts.slice(0, 8).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* ── Daily Picks (random) ── */}
      {dailyPicks.length > 0 && (
        <section className="border-t border-border bg-muted/20">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <SectionHeader
              icon={Sparkles}
              title={t('home.justForToday', { defaultValue: 'Just for today' })}
              subtitle="Freshly randomised for you every visit"
              badge="DAILY"
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {dailyPicks.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Tech / Laptops Row ── */}
      {techProducts.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <SectionHeader
            icon={getCategoryIcon('laptops')}
            title="Tech & Laptops"
            subtitle="Top computing gear from New Road Tech"
            linkTo="/products?category=laptops"
            linkLabel="Shop tech"
          />
          <ProductRow products={techProducts} />
        </section>
      )}

      {/* ── Trending Now ── */}
      {trendingProducts.length > 0 && (
        <section className="border-t border-border bg-muted/20">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <SectionHeader
              icon={TrendingUp}
              title={t('home.trendingNow', { defaultValue: 'Trending Now' })}
              subtitle="What everyone is buying this week"
              linkTo="/products?sort=popular"
              linkLabel={t('home.viewAll', { defaultValue: 'View all' })}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {trendingProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Fashion Row ── */}
      {fashionProducts.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <SectionHeader
            icon={getCategoryIcon('fashion')}
            title="Fashion & Style"
            subtitle="Clothes, accessories & more from Thamel Style House"
            linkTo="/products?category=fashion"
            linkLabel="Shop fashion"
          />
          <ProductRow products={fashionProducts} />
        </section>
      )}

      {/* ── Grocery Row ── */}
      {groceryProducts.length > 0 && (
        <section className="border-t border-border bg-muted/20">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <SectionHeader
              icon={getCategoryIcon('groceries')}
              title="Groceries & Fresh Produce"
              subtitle="Daily essentials from Barat Kirana Pasal"
              linkTo="/products?category=groceries"
              linkLabel="Shop groceries"
            />
            <ProductRow products={groceryProducts} />
          </div>
        </section>
      )}

      {/* ── Books Row ── */}
      {booksProducts.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <SectionHeader
            icon={getCategoryIcon('books')}
            title="Books & Stationery"
            subtitle="Study guides, novels, and school supplies"
            linkTo="/products?category=books"
            linkLabel="Browse books"
          />
          <ProductRow products={booksProducts} />
        </section>
      )}

      {/* ── Recommended for You ── */}
      {recommendedProducts.length > 0 && (
        <section className="border-t border-border bg-muted/20">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <SectionHeader
              icon={Sparkles}
              title={t('home.recommendedForYou', { defaultValue: 'Recommended for you' })}
              subtitle="AI-curated picks based on your browsing"
              badge="AI"
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
              {recommendedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Store Directory Banner ── */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-border bg-gradient-to-br from-accent/10 via-surface to-muted/60 p-8 text-center">
          <Store className="mx-auto mb-3 h-10 w-10 text-accent" />
          <h2 className="text-2xl font-black tracking-tight">Browse by Store</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-secondary">
            Explore dedicated stores — from groceries and tech to fashion and sports gear.
          </p>
          <Link
            to="/products"
            className="mt-5 inline-flex items-center gap-2 rounded-md bg-accent px-6 py-3 font-bold text-background transition-colors hover:bg-orange-600"
          >
            Explore all stores <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>


    </div>
  );
}

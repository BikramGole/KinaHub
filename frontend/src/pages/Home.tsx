import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BadgePercent, Truck, ShieldCheck, RefreshCw, Flame } from 'lucide-react';
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

export default function Home() {
  const { t } = useTranslation();
  const [products, setProducts] = useState<ProductType[]>([]);
  const [categories, setCategories] = useState<CategoryType[]>([]);
  const [heroReady, setHeroReady] = useState(false);
  const [heroIndex, setHeroIndex] = useState(0);

  const trustBadges = [
    { Icon: Truck, title: t('home.badgeFastDelivery', { defaultValue: 'Fast local delivery' }), copy: t('home.badgeFastCopy', { defaultValue: 'From nearby seller stores' }) },
    { Icon: BadgePercent, title: t('home.badgeDailyDeals', { defaultValue: 'Shop-owned products' }), copy: t('home.badgeDailyCopy', { defaultValue: 'Every item belongs to a store' }) },
    { Icon: ShieldCheck, title: t('home.badgeChecked', { defaultValue: 'Seller CRM included' }), copy: t('home.badgeCheckedCopy', { defaultValue: 'Stores manage catalog and orders' }) },
  ];

  useEffect(() => {
    fetch(`${API}/items/?random=true`)
      .then((response) => response.json())
      .then((data: ProductType[]) => {
        setProducts(data.slice(0, 30));
        // Give the hero image a short preload window without making the page feel blocked.
        setTimeout(() => {
          setHeroReady(true);
        }, 600);
      })
      .catch(() => {
        setHeroReady(true); // Still show hero even if fetch fails
      });

    fetch(`${API}/categories/`)
      .then((response) => response.json())
      .then((data: CategoryType[]) => setCategories(data))
      .catch(() => {});
  }, []);

  // Automatically rotate the hero product every 30 seconds
  useEffect(() => {
    if (products.length === 0) return;
    
    const interval = setInterval(() => {
      setHeroReady(false); // fade out
      setTimeout(() => {
        setHeroIndex((prev) => (prev + 1) % products.length);
        setHeroReady(true); // fade in
      }, 300); // Wait for fade out animation before changing image
    }, 30000);
    
    return () => clearInterval(interval);
  }, [products.length]);

  const heroProduct = products[heroIndex];
  
  // To avoid duplicates, we'll exclude the current hero product from the rest of the layout
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
                        className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
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

      {products.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <AiInsightPanel title="AI shopping overview" insights={marketAiOverview(products)} />
        </section>
      )}

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

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black tracking-tight">{t('home.shopByCategory', { defaultValue: 'Shop by category' })}</h2>
            <p className="text-sm text-secondary">{t('home.categorySubtitle', { defaultValue: 'All product types in one place.' })}</p>
          </div>
          <Link to="/products" className="hidden text-sm font-semibold text-accent hover:underline sm:block">
            {t('home.viewAll', { defaultValue: 'View all' })}
          </Link>
        </div>

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

      {flashDeals.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="text-2xl font-black tracking-tight">{t('home.flashDeals', { defaultValue: 'Flash deals' })}</h2>
            <Link to="/products" className="text-sm font-semibold text-accent hover:underline">
              {t('home.moreDeals', { defaultValue: 'More deals' })}
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {flashDeals.map((product) => (
              <ProductCard key={product.id} product={product} compact />
            ))}
          </div>
        </section>
      )}

      {dailyPicks.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="text-2xl font-black tracking-tight">{t('home.justForToday', { defaultValue: 'Just for today' })}</h2>
            <span className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-secondary">{t('home.randomized', { defaultValue: 'Randomized from DB' })}</span>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4">
            {dailyPicks.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {trendingProducts.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="text-2xl font-black tracking-tight">{t('home.trendingNow', { defaultValue: 'Trending Now' })}</h2>
            <Link to="/products?sort=popular" className="text-sm font-semibold text-accent hover:underline">
              {t('home.viewAll', { defaultValue: 'View all' })}
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4">
            {trendingProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {recommendedProducts.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="text-2xl font-black tracking-tight">{t('home.recommendedForYou', { defaultValue: 'Recommended for you' })}</h2>
            <span className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-secondary">AI Curated</span>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
            {recommendedProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* Explore More Button Section */}
      <section className="mx-auto max-w-7xl px-4 pb-20 pt-4 sm:px-6 lg:px-8 flex justify-center">
        <Link
          to="/products"
          className="inline-flex items-center gap-2 rounded-md bg-accent px-8 py-3.5 font-bold text-background transition-colors hover:bg-orange-600"
        >
          {t('home.exploreMore', { defaultValue: 'Explore all products' })}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    </div>
  );
}

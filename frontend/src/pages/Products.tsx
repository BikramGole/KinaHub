import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowUpDown, Filter, Search, Shuffle, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import ProductCard from '../components/ProductCard';
import ProductCardSkeleton from '../components/ProductCardSkeleton';
import { API } from '../lib/products';
import { getCategoryIcon } from '../lib/categoryIcons';
import { categoryDescription, categoryName } from '../lib/categoryText';
import type { CategoryType, ProductType } from '../lib/products';
import { useTranslation } from '../i18n/LocaleContext';
import Seo from '../components/Seo';

export default function Products() {
  const { t } = useTranslation();
  const [products, setProducts] = useState<ProductType[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(12);
  const [categories, setCategories] = useState<CategoryType[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [priceMin, setPriceMin] = useState(searchParams.get('price_min') || '');
  const [priceMax, setPriceMax] = useState(searchParams.get('price_max') || '');
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const hasMore = visibleCount < products.length;
  const displayedProducts = useMemo(() => products.slice(0, visibleCount), [products, visibleCount]);

  const categoryFilter = searchParams.get('category');
  const query = searchParams.get('q');
  const refresh = searchParams.get('refresh');
  const sort = searchParams.get('sort') || '';

  const categoryTitle = useMemo(() => {
    if (!categoryFilter) return t('products.allProducts', { defaultValue: 'All products' });
    const category = categories.find((item) => item.slug === categoryFilter);
    return category ? categoryName(t, category.slug, category.name) : t('products.title', { defaultValue: 'Products' });
  }, [categories, categoryFilter, t]);

  const currentSortLabel = useMemo(
    () => sortOptions(t).find((option) => option.value === sort)?.label || t('products.sortBy', { defaultValue: 'Sort by' }),
    [sort, t]
  );

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (categoryFilter) count += 1;
    if (sort) count += 1;
    if (priceMin.trim()) count += 1;
    if (priceMax.trim()) count += 1;
    return count;
  }, [categoryFilter, priceMax, priceMin, sort]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (categoryFilter) params.set('category', categoryFilter);
    if (query) params.set('q', query);
    if (priceMin.trim()) params.set('price_min', priceMin.trim());
    if (priceMax.trim()) params.set('price_max', priceMax.trim());
    if (sort) params.set('sort', sort);
    else if (refresh) params.set('random', 'true');
    else if (!query && !categoryFilter) params.set('sort', 'featured');

    setLoading(true);
    setVisibleCount(12);
    fetch(`${API}/items/?${params.toString()}`)
      .then((response) => response.json())
      .then(setProducts)
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [categoryFilter, query, priceMax, priceMin, sort, refresh]);

  useEffect(() => {
    fetch(`${API}/categories/`)
      .then((response) => response.json())
      .then(setCategories)
      .catch(() => {});
  }, []);

  useEffect(() => {
    setSearch(query || '');
  }, [query]);

  useEffect(() => {
    setPriceMin(searchParams.get('price_min') || '');
    setPriceMax(searchParams.get('price_max') || '');
  }, [searchParams]);

  useEffect(() => {
    const target = sentinelRef.current;
    if (!target || loading || products.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          if (visibleCount >= products.length) {
            // Endless Doomscrolling Loop: Append a shuffled version of the products
            const shuffled = [...products.slice(0, 40)].sort(() => Math.random() - 0.5).map(p => ({
              ...p,
              // Variable ratio reward: occasionally inject a secret deal
              tag: Math.random() > 0.85 ? 'SECRET DEAL 🔥' : (Math.random() > 0.8 ? 'HOT 🚨' : p.tag),
              // Randomize ID so React doesn't complain about duplicate keys in loop
              id: p.id + Math.floor(Math.random() * 10000000)
            }));
            setProducts(prev => [...prev, ...shuffled]);
          }
          setVisibleCount((count) => count + 12);
        }
      },
      { rootMargin: '600px 0px 800px 0px', threshold: 0.01 }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [loading, products, visibleCount]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = new URLSearchParams(searchParams);
    if (search.trim()) next.set('q', search.trim());
    else next.delete('q');
    setSearchParams(next);
  }

  function updateFilters(updates: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value && value.trim()) next.set(key, value.trim());
      else next.delete(key);
    });
    next.delete('refresh');
    next.delete('random');
    setSearchParams(next);
  }

  function randomize() {
    const next = new URLSearchParams(searchParams);
    next.set('refresh', Date.now().toString());
    next.delete('sort');
    next.set('random', 'true');
    setSearchParams(next);
  }

  function clearFilters() {
    const next = new URLSearchParams(searchParams);
    next.delete('category');
    next.delete('sort');
    next.delete('price_min');
    next.delete('price_max');
    next.delete('refresh');
    next.delete('random');
    setSearchParams(next);
    setPriceMin('');
    setPriceMax('');
  }

  function applyPriceRange() {
    updateFilters({
      price_min: priceMin,
      price_max: priceMax,
    });
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Seo
        title={query ? `Search results for ${query}` : categoryTitle}
        description="Browse KinaHub products by category, price, rating, seller store, and search."
      />
      <div className="mb-4 rounded-lg border border-border bg-surface p-4 sm:mb-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">{categoryTitle}</h1>
            <p className="mt-1 text-sm text-secondary">{products.length} {t('products.showingRandom', { defaultValue: 'products showing in random order' })}</p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <form onSubmit={submitSearch} className="relative min-w-0">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t('products.searchPlaceholder', { defaultValue: 'Search products' })}
                className="h-11 w-full rounded-md border border-border bg-background pl-10 pr-3 text-base text-primary outline-none transition-colors focus:border-accent"
              />
            </form>
            <button
              type="button"
              onClick={() => setFiltersOpen((current) => !current)}
              className={`inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border px-4 text-sm font-semibold transition-colors sm:w-auto ${filtersOpen || activeFilterCount > 0 ? 'border-accent bg-accent/10 text-accent' : 'border-border bg-background text-primary hover:border-accent'}`}
              aria-expanded={filtersOpen}
            >
              <Filter className="h-4 w-4" />
              {t('products.openFilters', { defaultValue: 'Filters' })}
              {activeFilterCount > 0 && (
                <span className="ml-1 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-background">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {filtersOpen && (
          <motion.section
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-6 rounded-lg border border-border bg-surface p-4 shadow-sm"
          >
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-bold">
                  <Filter className="h-4 w-4 text-accent" />
                  {t('products.categoriesTitle', { defaultValue: 'Categories' })}
                </h2>
                <p className="mt-1 text-sm text-secondary">{t('products.filter', { defaultValue: 'Filter' })} products by category, price, and sort order.</p>
              </div>
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-sm font-semibold text-secondary hover:border-accent hover:text-primary"
              >
                <X className="h-4 w-4" />
                {t('products.closeFilters', { defaultValue: 'Close filters' })}
              </button>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-lg border border-border bg-background p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Filter className="h-4 w-4 text-accent" />
                  <h3 className="font-bold">{t('products.categoriesTitle', { defaultValue: 'Categories' })}</h3>
                </div>
                <div className="grid max-h-[34vh] grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3 lg:grid-cols-4">
                  <button
                    type="button"
                    onClick={() => updateFilters({ category: null })}
                    className={`flex items-center gap-2 rounded-md border px-3 py-2 text-left text-sm font-medium transition-colors ${!categoryFilter ? 'border-accent bg-accent text-background' : 'border-border bg-surface text-secondary hover:border-accent hover:text-primary'}`}
                  >
                    <span className={`flex h-8 w-8 items-center justify-center rounded-md ${!categoryFilter ? 'bg-background/15 text-background' : 'bg-muted text-accent'}`}>
                      {(() => {
                        const Icon = getCategoryIcon('all');
                        return <Icon className="h-4 w-4" aria-hidden="true" />;
                      })()}
                    </span>
                    <span>{t('products.allCategory', { defaultValue: 'All' })}</span>
                  </button>
                  {categories.map((category) => {
                    const Icon = getCategoryIcon(category.slug);
                    const active = categoryFilter === category.slug;

                    return (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => updateFilters({ category: active ? null : category.slug })}
                        className={`flex items-start gap-2 rounded-md border px-3 py-2 text-left transition-colors ${active ? 'border-accent bg-accent text-background' : 'border-border bg-surface text-secondary hover:border-accent hover:text-primary'}`}
                      >
                        <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${active ? 'bg-background/15 text-background' : 'bg-muted text-accent'}`}>
                          <Icon className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold">{categoryName(t, category.slug, category.name)}</span>
                          <span className={`mt-0.5 line-clamp-2 text-xs ${active ? 'text-background/80' : 'text-secondary'}`}>
                            {categoryDescription(t, category.slug, category.description || '')}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-lg border border-border bg-background p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <ArrowUpDown className="h-4 w-4 text-accent" />
                    <h3 className="font-bold">{t('products.sortBy', { defaultValue: 'Sort by' })}</h3>
                  </div>
                  <label className="relative block">
                    <span className="sr-only">{t('products.sortAria', { defaultValue: 'Sort products' })}</span>
                    <ArrowUpDown className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary" />
                    <select
                      value={sort}
                      onChange={(event) => updateFilters({ sort: event.target.value || null })}
                      className="h-11 w-full appearance-none rounded-md border border-border bg-surface pl-10 pr-9 text-sm font-semibold text-primary outline-none transition-colors focus:border-accent"
                      aria-label={t('products.sortAria', { defaultValue: 'Sort products' })}
                    >
                      {sortOptions(t).map((option) => (
                        <option key={option.value || 'default'} value={option.value}>
                          {option.value ? t(`products.sort_${option.value}`, { defaultValue: option.label }) : t('products.sortBy', { defaultValue: 'Sort by' })}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="rounded-lg border border-border bg-background p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="flex h-4 w-4 items-center justify-center text-accent">$</span>
                    <h3 className="font-bold">{t('products.priceRange', { defaultValue: 'Price range' })}</h3>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-secondary">
                        {t('products.minPrice', { defaultValue: 'Min price' })}
                      </span>
                      <input
                        value={priceMin}
                        onChange={(event) => setPriceMin(event.target.value)}
                        inputMode="numeric"
                        placeholder="0"
                        className="h-11 w-full rounded-md border border-border bg-surface px-3 text-sm text-primary outline-none transition-colors focus:border-accent"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-secondary">
                        {t('products.maxPrice', { defaultValue: 'Max price' })}
                      </span>
                      <input
                        value={priceMax}
                        onChange={(event) => setPriceMax(event.target.value)}
                        inputMode="numeric"
                        placeholder="250000"
                        className="h-11 w-full rounded-md border border-border bg-surface px-3 text-sm text-primary outline-none transition-colors focus:border-accent"
                      />
                    </label>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={applyPriceRange}
                      className="inline-flex h-10 items-center gap-2 rounded-md bg-accent px-4 text-sm font-semibold text-background transition-colors hover:bg-orange-600"
                    >
                      {t('products.applyFilters', { defaultValue: 'Apply filters' })}
                    </button>
                    <button
                      type="button"
                      onClick={randomize}
                      className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-semibold text-primary transition-colors hover:border-accent"
                    >
                      <Shuffle className="h-4 w-4" />
                      {t('products.shuffle', { defaultValue: 'Shuffle' })}
                    </button>
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="inline-flex h-10 items-center gap-2 rounded-md border border-border px-4 text-sm font-semibold text-secondary transition-colors hover:border-accent hover:text-primary"
                    >
                      {t('products.clearFilters', { defaultValue: 'Clear filters' })}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <section>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm text-secondary">
            <p>
              {t('products.showing', { defaultValue: 'Showing' })} <span className="font-semibold text-primary">{products.length}</span> {t('products.productsWord', { defaultValue: 'products' })}
              {sort && (
                <>
                  {' '}
                  {t('products.sortedBy', { defaultValue: 'sorted by' })} <span className="font-semibold text-primary">{currentSortLabel}</span>
                </>
              )}
            </p>
          </div>
          {loading ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
              {[...Array(8)].map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : products.length > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
                {displayedProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
              <div ref={sentinelRef} className="h-12" aria-hidden="true" />
              {hasMore && (
                <div className="mt-4 flex justify-center">
                  <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-xs font-semibold text-secondary">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
                    {t('products.loadingMore', { defaultValue: 'Loading more products...' })}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-lg border border-border bg-surface p-10 text-center">
              <h2 className="text-xl font-bold">{t('products.noProducts', { defaultValue: 'No products found' })}</h2>
              <p className="mt-2 text-sm text-secondary">{t('products.tryAnother', { defaultValue: 'Try another category or search.' })}</p>
            </div>
          )}
      </section>
    </div>
  );
}

function sortOptions(t: (key: string, options?: Record<string, string | number> & { defaultValue?: string }) => string) {
  return [
    { value: '', label: t('products.sortBy', { defaultValue: 'Sort by' }) },
    { value: 'featured', label: t('products.sort_featured', { defaultValue: 'Featured first' }) },
    { value: 'price_low', label: t('products.sort_price_low', { defaultValue: 'Price: Low to high' }) },
    { value: 'price_high', label: t('products.sort_price_high', { defaultValue: 'Price: High to low' }) },
    { value: 'rating_high', label: t('products.sort_rating_high', { defaultValue: 'Rating: High to low' }) },
    { value: 'rating_low', label: t('products.sort_rating_low', { defaultValue: 'Rating: Low to high' }) },
    { value: 'newest', label: t('products.sort_newest', { defaultValue: 'Newest' }) },
    { value: 'oldest', label: t('products.sort_oldest', { defaultValue: 'Oldest' }) },
    { value: 'name_az', label: t('products.sort_name_az', { defaultValue: 'Name: A to Z' }) },
    { value: 'name_za', label: t('products.sort_name_za', { defaultValue: 'Name: Z to A' }) },
  ];
}

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Bot, RefreshCw, Search, Sparkles } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import ProductCardSkeleton from '../components/ProductCardSkeleton';
import AiInsightPanel from '../components/AiInsightPanel';
import { API } from '../lib/products';
import type { ProductType } from '../lib/products';
import { aiShoppingShortcuts, marketAiOverview } from '../lib/ai';
import { useTranslation } from '../i18n/LocaleContext';

export default function AiShopping() {
  const { t } = useTranslation();
  const [products, setProducts] = useState<ProductType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/items/?random=true`)
      .then((response) => response.json())
      .then((data: ProductType[]) => setProducts(Array.isArray(data) ? data : []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  const shortcuts = useMemo(() => aiShoppingShortcuts(products).slice(0, 4), [products]);
  const searchIdeas = useMemo(() => {
    const ideas = [
      products.find((product) => product.brand?.name && product.category?.name)?.brand?.name,
      products.find((product) => product.store?.name)?.store?.name,
      products.find((product) => product.category?.name)?.category?.name,
      products.find((product) => product.name)?.name,
    ].filter(Boolean) as string[];

    return Array.from(new Set(ideas)).slice(0, 4);
  }, [products]);

  const featured = products.slice(0, 8);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="rounded-lg border border-border bg-surface p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-accent">
              <Bot className="h-4 w-4" />
              {t('ai.eyebrow', { defaultValue: 'KinaHub AI' })}
            </p>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
              {t('ai.title', { defaultValue: 'Shopping navigation that feels specific' })}
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-7 text-secondary">
              {t('ai.subtitle', {
                defaultValue:
                  'Use AI to jump to the right products, stores, and filters faster. It points you toward specific local sellers instead of generic marketplace noise.',
              })}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link to="/products" className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-background hover:bg-orange-600">
              {t('ai.openProducts', { defaultValue: 'Open products' })} <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/products?sort=price_low" className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2.5 text-sm font-semibold text-primary hover:border-accent">
              <Sparkles className="h-4 w-4" />
              {t('ai.priceRadar', { defaultValue: 'Price radar' })}
            </Link>
            <Link to="/products?sort=rating_high" className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2.5 text-sm font-semibold text-primary hover:border-accent">
              <RefreshCw className="h-4 w-4" />
              {t('ai.bestRated', { defaultValue: 'Best rated' })}
            </Link>
          </div>
        </div>
      </div>

      {products.length > 0 && (
        <section className="mt-6">
          <AiInsightPanel title={t('ai.insightTitle', { defaultValue: 'AI shopping overview' })} insights={marketAiOverview(products)} />
        </section>
      )}

      <section className="mt-6 rounded-lg border border-border bg-surface p-5 shadow-sm sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <Search className="h-4 w-4 text-accent" />
          <h2 className="text-lg font-bold">{t('ai.searchIdeasTitle', { defaultValue: 'Specific search ideas' })}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {searchIdeas.length > 0 ? (
            searchIdeas.map((idea) => (
              <Link
                key={idea}
                to={`/products?q=${encodeURIComponent(idea)}`}
                className="rounded-full border border-border bg-background px-3 py-2 text-sm font-medium text-secondary transition-colors hover:border-accent hover:text-primary"
              >
                {idea}
              </Link>
            ))
          ) : (
            <p className="text-sm text-secondary">{t('ai.loadingIdeas', { defaultValue: 'Loading product ideas...' })}</p>
          )}
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-border bg-surface p-5 shadow-sm sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" />
          <h2 className="text-lg font-bold">{t('ai.shortcutsTitle', { defaultValue: 'AI shortcuts' })}</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {shortcuts.map((shortcut) => (
            <Link
              key={shortcut.title}
              to={shortcut.href}
              className="rounded-lg border border-border bg-background p-4 transition-colors hover:border-accent hover:bg-accent/5"
            >
              <p className="text-sm font-bold text-primary">{shortcut.title}</p>
              <p className="mt-2 text-sm leading-6 text-secondary">{shortcut.body}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-accent">
                {shortcut.action} <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-border bg-surface p-5 shadow-sm sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">{t('ai.featuredTitle', { defaultValue: 'Suggested products' })}</h2>
            <p className="mt-1 text-sm text-secondary">{t('ai.featuredCopy', { defaultValue: 'These are pulled from the live catalog and can be opened directly.' })}</p>
          </div>
          <Link to="/products" className="text-sm font-semibold text-accent hover:underline">
            {t('ai.viewCatalog', { defaultValue: 'View catalog' })}
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {[...Array(8)].map((_, index) => (
              <ProductCardSkeleton key={index} />
            ))}
          </div>
        ) : featured.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {featured.map((product) => (
              <ProductCard key={product.id} product={product} compact />
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-border bg-background p-4 text-sm text-secondary">
            {t('ai.noProducts', { defaultValue: 'No products loaded yet.' })}
          </div>
        )}
      </section>
    </div>
  );
}

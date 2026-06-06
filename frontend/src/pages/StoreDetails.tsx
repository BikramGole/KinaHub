import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Mail, MapPin, Package, Phone, Store } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import { API as PRODUCTS_API } from '../lib/products';
import type { ProductType, StoreType } from '../lib/products';
import { API_BASE } from '../lib/api';
import { useTranslation } from '../i18n/LocaleContext';
import { useTheme } from '../context/ThemeContext';

export default function StoreDetails() {
  const { slug } = useParams();
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [store, setStore] = useState<StoreType | null>(null);
  const [products, setProducts] = useState<ProductType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;

    setLoading(true);
    Promise.all([
      fetch(`${API_BASE}/sellers/stores/${slug}/`).then((response) => {
        if (!response.ok) throw new Error('Store not found');
        return response.json() as Promise<StoreType>;
      }),
      fetch(`${PRODUCTS_API}/items/?store=${encodeURIComponent(slug)}&sort=featured`).then((response) => response.json() as Promise<ProductType[]>),
    ])
      .then(([storeData, productData]) => {
        setStore(storeData);
        setProducts(productData);
      })
      .catch(() => {
        setStore(null);
        setProducts([]);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  const mapQuery = useMemo(() => {
    const location = store?.address || store?.area || store?.name || 'Kathmandu Nepal';
    return encodeURIComponent(location);
  }, [store]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8 animate-pulse">
        {/* Banner Skeleton */}
        <div className="mb-8 h-48 w-full rounded-2xl bg-muted/60 sm:h-64 md:h-80 lg:h-96"></div>
        {/* Store Info Skeleton */}
        <div className="-mt-16 sm:-mt-20 md:-mt-24 px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div className="flex items-end gap-4 sm:gap-6">
              <div className="h-24 w-24 sm:h-32 sm:w-32 rounded-xl bg-muted border-4 border-background"></div>
              <div className="mb-2">
                <div className="h-6 sm:h-8 w-48 rounded bg-muted/60 mb-2"></div>
                <div className="h-4 sm:h-5 w-32 rounded bg-muted/60"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:py-24">
        <h1 className="text-xl font-bold sm:text-2xl">{t('store.notFound', { defaultValue: 'Store not found' })}</h1>
        <Link to="/products" className="mt-4 inline-block font-semibold text-accent hover:underline">
          {t('products.backToProducts', { defaultValue: 'Back to products' })}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <Link to="/products" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-secondary hover:text-primary">
        <ArrowLeft className="h-4 w-4" />
        {t('products.backToProducts', { defaultValue: 'Back to products' })}
      </Link>

      <section className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
        {store.banner_url ? (
          <img src={store.banner_url} alt="" className="h-40 w-full object-cover sm:h-52" />
        ) : (
          <div className="h-28 bg-gradient-to-br from-accent/20 via-surface to-background sm:h-40" />
        )}
        <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1fr_340px]">
          <div className="flex gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-accent">
              {store.logo_url ? <img src={store.logo_url} alt="" className="h-full w-full rounded-lg object-cover" /> : <Store className="h-7 w-7" />}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-accent">{t('store.localSeller', { defaultValue: 'Local seller store' })}</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-primary sm:text-4xl">{store.name}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-secondary sm:text-base">{store.description}</p>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-background p-4">
            <h2 className="mb-3 font-bold">{t('store.shopInfo', { defaultValue: 'Shop info' })}</h2>
            <div className="space-y-3 text-sm">
              {(store.area || store.address) && (
                <p className="flex items-start gap-2 text-secondary">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  <span>{store.address || store.area}</span>
                </p>
              )}
              {store.support_phone && (
                <p className="flex items-center gap-2 text-secondary">
                  <Phone className="h-4 w-4 shrink-0 text-accent" />
                  <span>{store.support_phone}</span>
                </p>
              )}
              {store.support_email && (
                <p className="flex items-center gap-2 text-secondary">
                  <Mail className="h-4 w-4 shrink-0 text-accent" />
                  <span>{store.support_email}</span>
                </p>
              )}
              <p className="flex items-center gap-2 text-secondary">
                <Package className="h-4 w-4 shrink-0 text-accent" />
                <span>{products.length} {t('store.productsListed', { defaultValue: 'products listed' })}</span>
              </p>
            </div>
            <a
              href={store.map_url || `https://www.google.com/maps/search/?api=1&query=${mapQuery}`}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-semibold text-primary transition-colors hover:border-accent hover:text-accent"
            >
              {t('store.openMap', { defaultValue: 'Open map' })}
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div>
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black tracking-tight sm:text-2xl">{t('store.storeProducts', { defaultValue: 'Store products' })}</h2>
              <p className="text-sm text-secondary">{t('store.fulfilledByStore', { defaultValue: 'Products listed and fulfilled by this seller.' })}</p>
            </div>
            <Link to={`/products?store=${store.slug}`} className="hidden text-sm font-semibold text-accent hover:underline sm:block">
              {t('home.viewAll', { defaultValue: 'View all' })}
            </Link>
          </div>
          {products.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-surface p-10 text-center">
              <h2 className="text-xl font-bold">{t('store.noProducts', { defaultValue: 'No products yet' })}</h2>
            </div>
          )}
        </div>

        <aside className="lg:sticky lg:top-28 lg:h-fit">
          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <iframe
              title={`${store.name} map`}
              src={`https://maps.google.com/maps?q=${mapQuery}&output=embed`}
              className={`h-72 w-full border-0 transition-all ${theme === 'dark' ? 'invert hue-rotate-180 brightness-75 contrast-125' : ''}`}
              loading="lazy"
            />
          </div>
        </aside>
      </section>
    </div>
  );
}

import { Link } from 'react-router-dom';
import { ShoppingBag, Star, Store } from 'lucide-react';
import { formatPrice, price, productImage } from '../lib/products';
import type { ProductType } from '../lib/products';
import { useTranslation } from '../i18n/LocaleContext';
import { categoryName } from '../lib/categoryText';

interface ProductCardProps {
  product: ProductType;
  compact?: boolean;
}

export default function ProductCard({ product, compact = false }: ProductCardProps) {
  const { t } = useTranslation();
  const image = productImage(product);
  const hasDiscount = Boolean(product.discount_price);
  const discountPercent = hasDiscount
    ? Math.round(((Number(product.price) - Number(product.discount_price)) / Number(product.price)) * 100)
    : 0;

  return (
    <Link to={`/product/${product.slug}`} className="group block h-full">
      <article className="h-full overflow-hidden rounded-lg border border-border bg-surface card-lift-effect hover:border-accent">
        <div className="relative aspect-[5/4] overflow-hidden bg-muted">
          {image ? (
            <img
              src={image}
              alt={product.name}
              className="h-full w-full object-cover object-center transition-transform duration-300 ease-out group-hover:scale-110"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-secondary">{t('products.noImage', { defaultValue: 'No image' })}</div>
          )}
          {product.tag && (
            <span className="absolute left-3 top-3 rounded bg-accent px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-background shadow-sm">
              {product.tag}
            </span>
          )}
          {discountPercent > 0 && (
            <span className="absolute right-3 top-3 rounded bg-sale px-2 py-1 text-[11px] font-semibold text-background shadow-sm">
              -{discountPercent}%
            </span>
          )}
        </div>

        <div className={`${compact ? 'p-3' : 'p-3 sm:p-4'} flex min-h-[132px] flex-col sm:min-h-[168px]`}>
          <div className="mb-2 flex items-center justify-between gap-3 text-xs text-secondary">
            <span className="truncate uppercase tracking-wide">{categoryName(t, product.category.slug, product.category.name)}</span>
            <span className="flex shrink-0 items-center gap-1 transition-transform duration-300 hover:scale-110">
              <Star className="h-3.5 w-3.5 fill-warning text-warning" />
              {Number(product.rating).toFixed(1)}
            </span>
          </div>

          <h3 className="line-clamp-2 min-h-[40px] text-[13px] font-semibold leading-5 text-primary sm:text-sm group-hover:text-accent transition-colors duration-200">
            {product.name}
          </h3>
          {product.store?.name && (
            <p className="mt-1 flex min-w-0 items-center gap-1.5 text-xs font-medium text-secondary">
              <Store className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden="true" />
              <span className="truncate">{t('products.soldBy', { defaultValue: 'Sold by' })} {product.store.name}</span>
            </p>
          )}
          <p className="mt-1 hidden text-xs leading-5 text-secondary sm:line-clamp-2">{product.description}</p>

          <div className="mt-auto flex items-end justify-between gap-2 pt-3 sm:gap-3 sm:pt-4">
            <div className="min-w-0">
              {hasDiscount && (
                <p className="text-xs text-secondary line-through">{formatPrice(product.price)}</p>
              )}
              <p className="text-sm font-bold text-primary sm:text-base">{formatPrice(price(product))}</p>
            </div>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-background transition-all duration-300 group-hover:bg-accent group-hover:shadow-lg group-hover:-translate-y-1 sm:h-9 sm:w-9 btn-press-effect">
              <ShoppingBag className="h-3.5 w-3.5 sm:h-4 sm:w-4 icon-hover-effect" />
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}

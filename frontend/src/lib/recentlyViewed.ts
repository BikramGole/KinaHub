import type { ProductType } from './products';

const RECENTLY_VIEWED_KEY = 'kinahub_recently_viewed';
const MAX_RECENTLY_VIEWED = 12;

export function getRecentlyViewedProducts() {
  if (typeof window === 'undefined') return [];

  try {
    const parsed = JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY) || '[]') as ProductType[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addRecentlyViewedProduct(product: ProductType) {
  if (typeof window === 'undefined') return;

  const current = getRecentlyViewedProducts().filter((item) => item.slug !== product.slug);
  const next = [product, ...current].slice(0, MAX_RECENTLY_VIEWED);
  localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(next));
}

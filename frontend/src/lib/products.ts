import { API_BASE } from './api';

import { getCurrentLocale } from '../i18n/localeStore';

export const API = `${API_BASE}/products`;

export interface ProductImageType {
  id: number;
  image_url: string;
  alt_text: string;
  is_primary: boolean;
  order: number;
}

export interface CategoryType {
  id: number;
  name: string;
  slug: string;
  description?: string;
}

export interface BrandType {
  id: number;
  name: string;
  slug: string;
}

export interface SpecType {
  key: string;
  value: string;
}

export interface ProductType {
  id: number;
  name: string;
  slug: string;
  store?: {
    id: number;
    name: string;
    slug: string;
    support_email?: string;
    support_phone?: string;
  } | null;
  category: CategoryType;
  brand: BrandType | null;
  description: string;
  specifications: string;
  specs: SpecType[];
  price: string;
  discount_price: string | null;
  stock: number;
  rating: string;
  tag: string | null;
  is_featured: boolean;
  is_active: boolean;
  images: ProductImageType[];
  reviews?: ReviewType[];
  review_count?: number;
  average_rating?: number;
}

export interface ReviewType {
  id: number;
  product: number;
  name: string;
  rating: number;
  title: string;
  comment: string;
  image_url?: string;
  video_url?: string;
  is_verified_purchase: boolean;
  created_at: string;
  updated_at: string;
}

export interface StoreType {
  id: number;
  name: string;
  slug: string;
  description: string;
  logo_url: string;
  banner_url: string;
  address: string;
  area: string;
  map_url: string;
  support_email: string;
  support_phone: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function productImage(product: ProductType) {
  return product.images.find((image) => image.is_primary)?.image_url || product.images[0]?.image_url || '';
}

export function price(product: ProductType) {
  return Number(product.discount_price || product.price);
}

export function formatPrice(value: number | string) {
  const locale = getCurrentLocale() === 'np' ? 'ne-NP' : 'en-US';
  const prefix = getCurrentLocale() === 'np' ? 'रु' : 'Rs.';
  return `${prefix} ${Number(value).toLocaleString(locale)}`;
}

export function formatNumber(value: number | string) {
  const locale = getCurrentLocale() === 'np' ? 'ne-NP' : 'en-US';
  return Number(value).toLocaleString(locale);
}

export function formatDate(value: string, options: Intl.DateTimeFormatOptions = {}) {
  const locale = getCurrentLocale() === 'np' ? 'ne-NP' : 'en-US';
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: options.timeStyle,
    ...options,
  }).format(new Date(value));
}

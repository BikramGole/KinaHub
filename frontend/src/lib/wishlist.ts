import { API_BASE } from './api';
import type { ProductType } from './products';

export interface WishlistResponse {
  id: number;
  products: ProductType[];
  count: number;
  created_at: string;
}

async function wishlistRequest<T>(path: string, token: string | null, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}/wishlist/${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      typeof (data as { detail?: unknown }).detail === 'string'
        ? (data as { detail: string }).detail
        : 'Wishlist request failed'
    );
  }
  return res.json() as Promise<T>;
}

export function getWishlist(token: string | null) {
  return wishlistRequest<WishlistResponse>('', token);
}

export function addToWishlist(token: string | null, productSlug: string) {
  return wishlistRequest<WishlistResponse>('add/', token, {
    method: 'POST',
    body: JSON.stringify({ product_slug: productSlug }),
  });
}

export function removeFromWishlist(token: string | null, productSlug: string) {
  return wishlistRequest<WishlistResponse>('remove/', token, {
    method: 'POST',
    body: JSON.stringify({ product_slug: productSlug }),
  });
}

export function clearWishlist(token: string | null) {
  return wishlistRequest<WishlistResponse>('clear/', token, { method: 'POST' });
}

export async function isInWishlist(token: string | null, productSlug: string): Promise<boolean> {
  const data = await wishlistRequest<{ in_wishlist: boolean }>(
    `check/?product=${encodeURIComponent(productSlug)}`,
    token
  );
  return data.in_wishlist;
}

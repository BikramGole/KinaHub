import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Camera, Check, Film, Mail, MessageCircle, Minus, Plus, ShieldCheck, ShoppingBag, Star, Store, Truck, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API, formatDate, formatPrice, price, productImage } from '../lib/products';
import type { ProductType, ReviewType } from '../lib/products';
import { useCart } from '../context/CartContext';
import { useTranslation } from '../i18n/LocaleContext';
import { categoryName } from '../lib/categoryText';
import AiInsightPanel from '../components/AiInsightPanel';
import { productAiSummary } from '../lib/ai';
import Seo from '../components/Seo';
import ProductCard from '../components/ProductCard';
import { addRecentlyViewedProduct, getRecentlyViewedProducts } from '../lib/recentlyViewed';
import { useAuth } from '../context/AuthContext';

export default function ProductDetails() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const [product, setProduct] = useState<ProductType | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [reviews, setReviews] = useState<ReviewType[]>([]);
  const [similarProducts, setSimilarProducts] = useState<ProductType[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<ProductType[]>([]);
  const [reviewLoading, setReviewLoading] = useState(true);
  const [similarLoading, setSimilarLoading] = useState(true);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [reviewForm, setReviewForm] = useState({
    name: '',
    rating: 5,
    title: '',
    comment: '',
    image_url: '',
    video_url: '',
  });
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState<string | null>(null);

  // Initialize active image when product loads
  useEffect(() => {
    if (product) {
      setActiveImage(productImage(product));
    }
  }, [product]);

  function handleAddToCart() {
    if (!product) return;
    addToCart(product, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  useEffect(() => {
    if (!slug) return;

    setLoading(true);
    setReviewLoading(true);
    setSimilarLoading(true);
    fetch(`${API}/items/${slug}/`)
      .then((response) => {
        if (!response.ok) throw new Error('Product not found');
        return response.json();
      })
      .then((data: ProductType) => setProduct(data))
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (!product) return;

    addRecentlyViewedProduct(product);
    setRecentlyViewed(getRecentlyViewedProducts().filter((item) => item.slug !== product.slug).slice(0, 4));
  }, [product]);

  useEffect(() => {
    if (!slug || !product) return;

    const loadRelated = window.setTimeout(() => {
      fetch(`${API}/reviews/?product=${encodeURIComponent(slug)}`)
        .then((response) => response.json())
        .then((data: ReviewType[]) => setReviews(Array.isArray(data) ? data : []))
        .catch(() => setReviews([]))
        .finally(() => setReviewLoading(false));

      fetch(`${API}/items/${slug}/similar/`)
        .then((response) => response.json())
        .then((data: ProductType[]) => setSimilarProducts(Array.isArray(data) ? data : []))
        .catch(() => setSimilarProducts([]))
        .finally(() => setSimilarLoading(false));
    }, 120);

    return () => window.clearTimeout(loadRelated);
  }, [slug, product]);

  const reviewStats = useMemo(() => {
    if (!reviews.length) {
      return {
        average: Number(product?.average_rating || product?.rating || 0),
        count: Number(product?.review_count || 0),
      };
    }

    const average = reviews.reduce((sum, review) => sum + Number(review.rating), 0) / reviews.length;
    return {
      average,
      count: reviews.length,
    };
  }, [product?.average_rating, product?.rating, product?.review_count, reviews]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8 animate-pulse">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:gap-12">
          {/* Image skeleton */}
          <div className="aspect-square w-full rounded-xl bg-muted/60"></div>
          {/* Info skeleton */}
          <div className="flex flex-col pt-4">
            <div className="mb-2 h-4 w-32 rounded bg-muted/60"></div>
            <div className="mb-4 h-8 w-3/4 rounded bg-muted/60 sm:h-10"></div>
            <div className="mb-6 h-6 w-1/4 rounded bg-muted/60"></div>
            <div className="mb-8 space-y-2">
              <div className="h-4 w-full rounded bg-muted/60"></div>
              <div className="h-4 w-full rounded bg-muted/60"></div>
              <div className="h-4 w-2/3 rounded bg-muted/60"></div>
            </div>
            <div className="mt-8 flex gap-4">
              <div className="h-12 w-32 rounded-lg bg-muted/60"></div>
              <div className="h-12 flex-1 rounded-lg bg-muted/60"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:py-24">
        <h2 className="text-xl font-bold sm:text-2xl">{t('products.notFound', { defaultValue: 'Product not found' })}</h2>
        <Link to="/products" className="mt-4 inline-block font-semibold text-accent hover:underline">
          {t('products.backToProducts', { defaultValue: 'Back to products' })}
        </Link>
      </div>
    );
  }

  const image = activeImage || (product ? productImage(product) : null);
  const subtotal = product ? price(product) * quantity : 0;

  async function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!product) return;

    const comment = reviewForm.comment.trim();
    const name = reviewForm.name.trim();
    if (!name || !comment) {
      setReviewError(t('products.reviewRequired', { defaultValue: 'Add your name and review first.' }));
      return;
    }

    setReviewError('');
    setReviewSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('product', product.slug);
      formData.append('name', name);
      formData.append('rating', reviewForm.rating.toString());
      formData.append('title', reviewForm.title.trim());
      formData.append('comment', comment);

      const imgFile = imageInputRef.current?.files?.[0];
      if (imgFile) formData.append('image', imgFile);

      const vidFile = videoInputRef.current?.files?.[0];
      if (vidFile) formData.append('video', vidFile);

      const response = await fetch(`${API}/reviews/`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to submit review');
      }

      const created = (await response.json()) as ReviewType;
      setReviews((current) => [created, ...current]);
      setReviewForm({ name: '', rating: 5, title: '', comment: '', image_url: '', video_url: '' });
      setImagePreview(null);
      setVideoPreview(null);
    } catch {
      setReviewError(t('products.reviewSubmitError', { defaultValue: 'Could not submit review right now.' }));
    } finally {
      setReviewSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pb-28 pt-6 sm:px-6 sm:py-8 lg:px-8">
      <Seo
        title={product.name}
        description={product.description}
        image={image || undefined}
        type="product"
      />
      <Link to="/products" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-secondary hover:text-primary sm:mb-6">
        <ArrowLeft className="h-4 w-4" />
        {t('products.backToProducts', { defaultValue: 'Back to products' })}
      </Link>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_440px] lg:gap-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="self-start rounded-lg border border-border bg-surface p-4 shadow-sm sm:p-5 lg:p-4 flex flex-col md:flex-row gap-4"
        >
          {product.images && product.images.length > 1 && (
            <div className="flex order-2 md:order-1 md:flex-col gap-2 overflow-x-auto md:overflow-y-auto md:max-h-[500px] pb-2 md:pb-0 scrollbar-thin md:w-20 shrink-0">
              {product.images.map((img) => (
                <button
                  key={img.id}
                  onClick={() => setActiveImage(img.image_url)}
                  className={`relative aspect-square w-16 md:w-full shrink-0 overflow-hidden rounded-md border-2 transition-all ${activeImage === img.image_url ? 'border-accent' : 'border-transparent hover:border-border'}`}
                >
                  <img src={img.image_url} alt={img.alt_text || product.name} className="h-full w-full object-cover object-center" loading="lazy" decoding="async" />
                </button>
              ))}
            </div>
          )}
          <div className="aspect-[4/3] w-full order-1 md:order-2 overflow-hidden rounded-md bg-muted">
            {image ? (
              <img src={image} alt={product.name} className="h-full w-full object-cover object-center" loading="eager" fetchPriority="high" decoding="async" />
            ) : (
              <div className="flex h-full items-center justify-center text-secondary">{t('products.noImage', { defaultValue: 'No image' })}</div>
            )}
          </div>
        </motion.div>

        <aside className="lg:sticky lg:top-28 lg:h-fit">
          <div className="rounded-lg border border-border bg-surface p-5 shadow-sm sm:p-6">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="rounded bg-accent/10 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-accent">
                {categoryName(t, product.category.slug, product.category.name)}
              </span>
              {product.tag && (
                <span className="rounded bg-muted px-2 py-1 text-xs font-semibold text-secondary">{product.tag}</span>
              )}
              <span className="ml-auto flex items-center gap-1 text-sm font-semibold text-primary">
                <Star className="h-4 w-4 fill-warning text-warning" />
                {Number(product.rating).toFixed(1)}
              </span>
            </div>

            <p className="mb-2 text-sm text-secondary">{product.brand?.name || t('products.localShopProduct', { defaultValue: 'Local shop product' })}</p>
            <h1 className="text-xl font-black tracking-tight sm:text-3xl">{product.name}</h1>
            {product.store?.name && (
              <div className="mt-4 rounded-md border border-border bg-background p-3">
                <Link to={`/store/${product.store.slug}`} className="flex items-start gap-3 transition-colors hover:bg-accent/5 cursor-pointer -mx-3 -mt-3 p-3 rounded-t-md">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent/10 text-accent">
                    <Store className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-secondary">{t('products.sellerStore', { defaultValue: 'Seller store' })}</p>
                    <p className="truncate font-bold text-primary">{product.store.name}</p>
                    <p className="text-xs text-secondary">{t('products.platformDelivery', { defaultValue: 'Ordered through KinaHub, fulfilled by this local shop.' })}</p>
                  </div>
                </Link>
                {(product.store.support_email || product.store.support_phone) && (
                  <div className="mt-2 flex flex-wrap gap-2 border-t border-border pt-3">
                    <span className="text-xs font-semibold text-secondary w-full">Contact Seller:</span>
                    {product.store.support_phone && (
                      <a href={`tel:${product.store.support_phone}`} className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:border-accent hover:text-accent">
                        <MessageCircle className="h-3 w-3" /> Call
                      </a>
                    )}
                    {product.store.support_email && (
                      <a href={`mailto:${product.store.support_email}`} className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:border-accent hover:text-accent">
                        <Mail className="h-3 w-3" /> Email
                      </a>
                    )}
                  </div>
                )}
              </div>
            )}
            <p className="mt-4 leading-7 text-secondary">{product.description}</p>

            <div className="mt-4">
              <AiInsightPanel title="Product AI summary" insights={productAiSummary(product)} compact />
            </div>

            <div className="mt-6 flex items-baseline gap-3">
              <span className="text-2xl font-black text-primary sm:text-3xl">{formatPrice(price(product))}</span>
              {product.discount_price && (
                <span className="text-sm text-secondary line-through">{formatPrice(product.price)}</span>
              )}
            </div>

            <div className="mt-6 flex items-center justify-between rounded-md bg-background p-3">
              <span className="text-sm font-semibold">{product.stock > 0 ? `${product.stock} ${t('products.inStock', { defaultValue: 'in stock' })}` : t('products.outOfStock', { defaultValue: 'Out of stock' })}</span>
              <div className="flex items-center rounded-md border border-border bg-surface">
                <button
                  type="button"
                  onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                  className="flex h-9 w-9 items-center justify-center text-secondary hover:text-primary"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-10 text-center text-sm font-bold">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((value) => Math.min(product.stock || 1, value + 1))}
                  className="flex h-9 w-9 items-center justify-center text-secondary hover:text-primary"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handleAddToCart}
              disabled={product.stock === 0}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-accent px-5 py-4 font-bold text-background transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <AnimatePresence mode="wait" initial={false}>
                {added ? (
                  <motion.span
                    key="added"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="flex items-center gap-2"
                  >
                    <Check className="h-5 w-5" /> {t('products.addedToCart', { defaultValue: 'Added to cart!' })}
                  </motion.span>
                ) : (
                  <motion.span
                    key="add"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="flex items-center gap-2"
                  >
                    <ShoppingBag className="h-5 w-5" />
                    {product.stock === 0 ? t('products.outOfStock', { defaultValue: 'Out of stock' }) : `${t('products.addToCart', { defaultValue: 'Add to cart' })} — ${formatPrice(subtotal)}`}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
            {added && (
              <button
                type="button"
                onClick={() => navigate('/cart')}
                className="mt-2 w-full rounded-md border border-accent py-3 text-sm font-semibold text-accent hover:bg-accent/10 transition-colors"
              >
                {t('products.viewCart', { defaultValue: 'View Cart →' })}
              </button>
            )}

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-md border border-border p-3">
                <Truck className="mb-2 h-5 w-5 text-accent" />
                <p className="text-sm font-semibold">{t('products.fastDelivery', { defaultValue: 'Fast delivery' })}</p>
                <p className="text-xs text-secondary">{t('products.localShipping', { defaultValue: 'Local shipping options' })}</p>
              </div>
              <div className="rounded-md border border-border p-3">
                <ShieldCheck className="mb-2 h-5 w-5 text-accent" />
                <p className="text-sm font-semibold">{t('products.protectedOrder', { defaultValue: 'Protected order' })}</p>
                <p className="text-xs text-secondary">{t('products.warrantyListed', { defaultValue: 'Warranty where listed' })}</p>
              </div>
            </div>
          </div>

          {product.specs.length > 0 && (
            <div className="mt-4 rounded-lg border border-border bg-surface p-5 shadow-sm sm:p-6">
              <h2 className="mb-4 font-bold">{t('products.details', { defaultValue: 'Details' })}</h2>
              <dl className="space-y-3">
                {product.specs.map((spec) => (
                  <div key={spec.key} className="flex gap-4 text-sm">
                    <dt className="w-28 shrink-0 font-semibold text-primary">{spec.key}</dt>
                    <dd className="text-secondary">{spec.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </aside>
      </div>

      {recentlyViewed.length > 0 && (
        <section className="mt-8 rounded-lg border border-border bg-surface p-5 shadow-sm sm:mt-10 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black tracking-tight">
                {t('products.recentlyViewed', { defaultValue: 'Recently viewed' })}
              </h2>
              <p className="mt-1 text-sm text-secondary">
                {t('products.recentlyViewedHint', { defaultValue: 'Jump back to products you checked earlier.' })}
              </p>
            </div>
            <Link to="/products" className="text-sm font-semibold text-accent hover:underline">
              {t('products.browseAll', { defaultValue: 'Browse all' })}
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {recentlyViewed.map((item) => (
              <ProductCard key={item.slug} product={item} compact />
            ))}
          </div>
        </section>
      )}

      <section className="mt-8 rounded-lg border border-border bg-surface p-5 shadow-sm sm:mt-10 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black tracking-tight">{t('products.reviewsTitle', { defaultValue: 'Ratings & reviews' })}</h2>
            <p className="mt-1 text-sm text-secondary">
              {reviewStats.count > 0
                ? `${reviewStats.count} ${t('products.reviewsWord', { defaultValue: 'reviews' })} · ${reviewStats.average.toFixed(1)} / 5`
                : t('products.noReviewsYet', { defaultValue: 'No reviews yet. Be the first to leave one.' })}
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-2">
            <Star className="h-4 w-4 fill-warning text-warning" />
            <span className="font-semibold">{reviewStats.average.toFixed(1)}</span>
            <span className="text-sm text-secondary">({reviewStats.count})</span>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
          {user ? (
            <form onSubmit={submitReview} className="rounded-lg border border-border bg-background p-4">
              <h3 className="text-base font-bold">{t('products.writeReview', { defaultValue: 'Write a review' })}</h3>
            <div className="mt-4 grid gap-3">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold">{t('products.yourName', { defaultValue: 'Your name' })}</span>
                <input
                  value={reviewForm.name}
                  onChange={(event) => setReviewForm((current) => ({ ...current, name: event.target.value }))}
                  className="h-11 w-full rounded-md border border-border bg-surface px-3 text-base outline-none focus:border-accent"
                  placeholder={t('auth.namePlaceholder', { defaultValue: 'Ram Shah' })}
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold">{t('products.rating', { defaultValue: 'Rating' })}</span>
                <select
                  value={reviewForm.rating}
                  onChange={(event) => setReviewForm((current) => ({ ...current, rating: Number(event.target.value) }))}
                  className="h-11 w-full rounded-md border border-border bg-surface px-3 text-base outline-none focus:border-accent"
                >
                  {[5, 4, 3, 2, 1].map((value) => (
                    <option key={value} value={value}>
                      {value} / 5
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold">{t('products.reviewTitle', { defaultValue: 'Title' })}</span>
                <input
                  value={reviewForm.title}
                  onChange={(event) => setReviewForm((current) => ({ ...current, title: event.target.value }))}
                  className="h-11 w-full rounded-md border border-border bg-surface px-3 text-base outline-none focus:border-accent"
                  placeholder={t('products.reviewTitlePlaceholder', { defaultValue: 'Short summary' })}
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold">{t('products.reviewComment', { defaultValue: 'Review' })}</span>
                <textarea
                  value={reviewForm.comment}
                  onChange={(event) => setReviewForm((current) => ({ ...current, comment: event.target.value }))}
                  className="min-h-32 w-full rounded-md border border-border bg-surface px-3 py-3 text-base outline-none focus:border-accent"
                  placeholder={t('products.reviewCommentPlaceholder', { defaultValue: 'Tell others what you thought about the product.' })}
                />
              </label>

              {/* Media attachment section */}
              <div className="space-y-3">
                <span className="block text-sm font-semibold">Attachments (optional)</span>
                <div className="flex flex-wrap gap-3">
                  {/* Image attach */}
                  <div className="flex-1 min-w-[200px]">
                    <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border bg-surface px-3 py-2.5 text-sm text-secondary hover:border-accent hover:text-accent transition-colors">
                      <Camera className="h-4 w-4 shrink-0" />
                      <span className="truncate">{imagePreview ? 'Image attached' : 'Add photo'}</span>
                      <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const url = URL.createObjectURL(file);
                            setImagePreview(url);
                            setReviewForm(c => ({ ...c, image_url: url }));
                          }
                        }}
                      />
                    </label>
                    {imagePreview && (
                      <div className="relative mt-2 inline-block">
                        <img src={imagePreview} alt="Preview" className="h-20 w-20 rounded-md object-cover border border-border" />
                        <button type="button" onClick={() => { setImagePreview(null); setReviewForm(c => ({ ...c, image_url: '' })); if (imageInputRef.current) imageInputRef.current.value = ''; }} className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow-sm hover:bg-red-600">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                  {/* Video attach */}
                  <div className="flex-1 min-w-[200px]">
                    <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border bg-surface px-3 py-2.5 text-sm text-secondary hover:border-accent hover:text-accent transition-colors">
                      <Film className="h-4 w-4 shrink-0" />
                      <span className="truncate">{videoPreview ? 'Video attached' : 'Add video (max 2 min)'}</span>
                      <input
                        ref={videoInputRef}
                        type="file"
                        accept="video/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const url = URL.createObjectURL(file);
                          // Validate duration <= 2 minutes
                          const vid = document.createElement('video');
                          vid.preload = 'metadata';
                          vid.onloadedmetadata = () => {
                            URL.revokeObjectURL(vid.src);
                            if (vid.duration > 120) {
                              setReviewError('Video must be under 2 minutes.');
                              if (videoInputRef.current) videoInputRef.current.value = '';
                              return;
                            }
                            setReviewError('');
                            const objUrl = URL.createObjectURL(file);
                            setVideoPreview(objUrl);
                            setReviewForm(c => ({ ...c, video_url: objUrl }));
                          };
                          vid.src = url;
                        }}
                      />
                    </label>
                    {videoPreview && (
                      <div className="relative mt-2 inline-block">
                        <video src={videoPreview} className="h-20 w-32 rounded-md object-cover border border-border" muted />
                        <button type="button" onClick={() => { setVideoPreview(null); setReviewForm(c => ({ ...c, video_url: '' })); if (videoInputRef.current) videoInputRef.current.value = ''; }} className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow-sm hover:bg-red-600">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={reviewSubmitting}
                className="inline-flex h-11 items-center justify-center rounded-md bg-accent px-4 text-sm font-semibold text-background transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {reviewSubmitting ? t('common.saving', { defaultValue: 'Saving...' }) : t('products.submitReview', { defaultValue: 'Submit review' })}
              </button>
              {reviewError && <p className="text-sm text-red-500">{reviewError}</p>}
            </div>
          </form>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-background p-8 text-center">
              <MessageCircle className="mb-3 h-8 w-8 text-secondary" />
              <h3 className="text-base font-bold">{t('products.writeReview', { defaultValue: 'Write a review' })}</h3>
              <p className="mt-2 text-sm text-secondary">
                {t('products.loginToReview', { defaultValue: 'You must be logged in to leave a review.' })}
              </p>
              <Link to="/login" className="mt-4 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-background transition-colors hover:bg-orange-600">
                {t('auth.switchToLogin', { defaultValue: 'Login' })}
              </Link>
            </div>
          )}

          <div className="space-y-3">
            {reviewLoading ? (
              <div className="rounded-lg border border-border bg-background p-4 text-sm text-secondary">
                {t('common.loading', { defaultValue: 'Loading...' })}
              </div>
            ) : reviews.length > 0 ? (
              reviews.map((review) => (
                <article key={review.id} className="rounded-lg border border-border bg-background p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-primary">{review.name}</p>
                      <p className="text-xs text-secondary">{formatDate(review.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-1 text-warning">
                      <Star className="h-4 w-4 fill-current" />
                      <span className="text-sm font-semibold text-primary">{review.rating}.0</span>
                    </div>
                  </div>
                  {review.title && <h4 className="mt-3 font-semibold text-primary">{review.title}</h4>}
                  <p className="mt-2 leading-7 text-secondary">{review.comment}</p>
                  {(review.image_url || review.video_url) && (
                    <div className="mt-4 flex gap-2 overflow-x-auto pb-2 snap-x hide-scrollbar">
                      {review.video_url && (
                        <div className="relative h-48 w-32 shrink-0 snap-center overflow-hidden rounded-md bg-black">
                          <video src={review.video_url} className="h-full w-full object-cover" controls playsInline loop muted />
                        </div>
                      )}
                      {review.image_url && (
                        <div className="relative h-48 w-32 shrink-0 snap-center overflow-hidden rounded-md bg-muted">
                  <img src={review.image_url} alt="Review attachment" className="h-full w-full object-cover" loading="lazy" decoding="async" />
                        </div>
                      )}
                    </div>
                  )}
                </article>
              ))
            ) : (
              <div className="rounded-lg border border-border bg-background p-4 text-sm text-secondary">
                {t('products.noReviewsYet', { defaultValue: 'No reviews yet. Be the first to leave one.' })}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mt-8 rounded-lg border border-border bg-surface p-5 shadow-sm sm:mt-10 sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black tracking-tight">
              {t('products.similarProducts', { defaultValue: 'Similar products' })}
            </h2>
            <p className="mt-1 text-sm text-secondary">
              {t('products.similarProductsHint', { defaultValue: 'Recommended by category, brand, store, and price.' })}
            </p>
          </div>
          <Link to="/products" className="text-sm font-semibold text-accent hover:underline">
            {t('products.browseAll', { defaultValue: 'Browse all' })}
          </Link>
        </div>

        {similarLoading ? (
          <div className="mt-6 rounded-lg border border-border bg-background p-4 text-sm text-secondary">
            {t('common.loading', { defaultValue: 'Loading...' })}
          </div>
        ) : similarProducts.length > 0 ? (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
            {similarProducts.map((item) => (
              <Link key={item.id} to={`/product/${item.slug}`} className="group overflow-hidden rounded-lg border border-border bg-background transition-colors hover:border-accent hover:bg-accent/5">
                <div className="aspect-[4/3] overflow-hidden bg-muted">
                  <img src={productImage(item)} alt={item.name} className="h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-105" loading="lazy" decoding="async" />
                </div>
                <div className="p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-secondary">
                    {item.store?.name || t('products.localShopProduct', { defaultValue: 'Local shop product' })}
                  </p>
                  <h3 className="mt-1 line-clamp-2 text-sm font-bold text-primary">{item.name}</h3>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <span className="text-sm font-black text-primary">{formatPrice(price(item))}</span>
                    <span className="flex items-center gap-1 text-xs font-semibold text-secondary">
                      <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                      {Number(item.average_rating ?? item.rating).toFixed(1)}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-lg border border-border bg-background p-4 text-sm text-secondary">
            {t('products.noSimilarProducts', { defaultValue: 'No similar products found right now.' })}
          </div>
        )}
      </section>

      <div className="fixed inset-x-0 bottom-16 z-40 border-t border-border bg-surface/95 px-4 py-3 shadow-[0_-8px_24px_rgba(0,0,0,0.12)] backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-primary">{product.name}</p>
            <p className="text-sm font-black text-accent">{formatPrice(subtotal)}</p>
          </div>
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={product.stock === 0}
            className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-bold text-background transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={product.stock === 0 ? t('products.outOfStock', { defaultValue: 'Out of stock' }) : t('products.addToCart', { defaultValue: 'Add to cart' })}
          >
            <ShoppingBag className="h-4 w-4" />
            {product.stock === 0 ? t('products.outOfStock', { defaultValue: 'Out of stock' }) : t('products.addToCart', { defaultValue: 'Add to cart' })}
          </button>
        </div>
      </div>
    </div>
  );
}

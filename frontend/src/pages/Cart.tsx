import { useCart } from '../context/CartContext';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, ShoppingBag, ArrowRight, Minus, Plus, Box } from 'lucide-react';
import { price, productImage, formatPrice } from '../lib/products';
import { useTranslation } from '../i18n/LocaleContext';
import { categoryName } from '../lib/categoryText';
import AiInsightPanel from '../components/AiInsightPanel';
import { cartAiOverview } from '../lib/ai';

export default function Cart() {
  const { items, totalCount, totalPrice, updateQuantity, removeFromCart, clearCart } = useCart();
  const navigate = useNavigate();
  const { t } = useTranslation();

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:py-32">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-border bg-surface sm:h-24 sm:w-24">
          <ShoppingBag className="h-8 w-8 text-secondary sm:h-10 sm:w-10" />
        </div>
        <h2 className="mb-3 text-xl font-bold tracking-tight sm:text-2xl">{t('cart.emptyTitle', { defaultValue: 'Your cart is empty' })}</h2>
        <p className="mb-8 text-secondary">{t('cart.emptyCopy', { defaultValue: 'Browse products and add what you need.' })}</p>
        <Link
          to="/products"
          className="inline-block rounded-lg bg-accent px-8 py-3 font-semibold text-background transition-colors hover:bg-orange-600"
        >
          {t('cart.browseCatalog', { defaultValue: 'Browse Catalog' })}
        </Link>
      </div>
    );
  }

  const shipping = 150;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <div className="mb-8 flex items-start justify-between gap-4 sm:mb-10">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {t('cart.title', { defaultValue: 'Cart' })} <span className="text-base font-normal text-secondary sm:text-lg">({totalCount} {totalCount === 1 ? t('cart.item', { defaultValue: 'item' }) : t('cart.items', { defaultValue: 'items' })})</span>
        </h1>
        <button
          type="button"
          onClick={clearCart}
          className="text-sm text-red-400 hover:text-red-300 font-medium transition-colors"
        >
          {t('cart.clearAll', { defaultValue: 'Clear all' })}
        </button>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row lg:gap-12">
        {/* Cart Items */}
        <div className="space-y-4 lg:w-2/3 lg:space-y-6">
          <AnimatePresence initial={false}>
            {items.map(({ product, quantity }) => {
              const image = productImage(product);
              const itemTotal = price(product) * quantity;

              return (
                <motion.div
                  key={product.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.25 }}
                  className="group relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-border bg-surface p-4 sm:p-5 md:flex-row md:gap-6 lg:p-6"
                >
                  {/* Product Image */}
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-background sm:h-24 sm:w-24 md:h-32 md:w-32">
                    {image ? (
                      <img src={image} alt={product.name} className="h-full w-full object-cover" />
                    ) : (
                      <Box className="h-8 w-8 text-secondary/30" />
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 flex flex-col">
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div>
                        <p className="mb-1 text-xs font-bold uppercase tracking-wider text-accent">
                          {product.brand?.name || 'KinaHub'}
                        </p>
                        <h3 className="text-lg font-semibold sm:text-xl">{product.name}</h3>
                        <p className="text-sm text-secondary">{product.category ? categoryName(t, product.category.slug, product.category.name) : ''}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFromCart(product.id)}
                        className="text-secondary hover:text-red-400 p-2 rounded-lg hover:bg-background transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="mt-auto flex items-end justify-between gap-3">
                      <div className="flex items-center gap-1 bg-background border border-border rounded-lg p-1">
                        <button
                          type="button"
                          onClick={() => updateQuantity(product.id, quantity - 1)}
                          className="w-8 h-8 flex items-center justify-center text-secondary hover:text-primary transition-colors"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-8 text-center text-sm font-medium">{quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(product.id, quantity + 1)}
                          className="w-8 h-8 flex items-center justify-center text-secondary hover:text-primary transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <span className="text-base font-bold sm:text-lg">{formatPrice(itemTotal)}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Order Summary */}
        <div className="lg:w-1/3">
          <div className="sticky top-28 rounded-2xl border border-border bg-surface p-5 sm:p-6">
            <div className="mb-5">
              <AiInsightPanel title="Cart AI brief" insights={cartAiOverview(items)} compact />
            </div>
            <h2 className="mb-6 text-xl font-bold">{t('cart.orderSummary', { defaultValue: 'Order summary' })}</h2>

            <div className="space-y-4 mb-6 text-sm">
              <div className="flex justify-between">
                <span className="text-secondary">{t('cart.subtotal', { defaultValue: 'Subtotal' })}</span>
                <span className="font-medium">{formatPrice(totalPrice)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary">{t('cart.shippingEstimate', { defaultValue: 'Shipping estimate' })}</span>
                <span className="font-medium">{formatPrice(shipping)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary">{t('cart.tax', { defaultValue: 'Tax' })}</span>
                <span className="font-medium text-secondary">{t('cart.calculatedAtCheckout', { defaultValue: 'Calculated at checkout' })}</span>
              </div>
            </div>

            <div className="border-t border-border pt-4 mb-8">
              <div className="flex justify-between items-end">
                <span className="font-bold">{t('cart.total', { defaultValue: 'Total' })}</span>
                <span className="text-2xl font-bold text-accent">{formatPrice(totalPrice + shipping)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/checkout')}
              className="w-full bg-accent text-background font-semibold py-4 rounded-xl hover:bg-orange-600 transition-colors flex items-center justify-center gap-2 group"
            >
          {t('cart.proceedToCheckout', { defaultValue: 'Proceed to checkout' })} <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
      </div>
    </div>
  );
}

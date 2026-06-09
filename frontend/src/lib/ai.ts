import type { CartItem } from '../context/CartContext';
import type { ProductType } from './products';
import { formatPrice, price, API } from './products';

export interface AiInsight {
  title: string;
  body: string;
  action?: string;
  href?: string;
}

export interface AiShortcut {
  title: string;
  body: string;
  href: string;
  action: string;
}

function productStore(product?: ProductType | null) {
  return product?.store?.name || 'local seller';
}

function discountPercent(product: ProductType) {
  if (!product.discount_price) return 0;
  return Math.round(((Number(product.price) - Number(product.discount_price)) / Number(product.price)) * 100);
}

export function productAiSummary(product: ProductType): AiInsight[] {
  const discount = discountPercent(product);
  const stockTone = product.stock > 20 ? 'healthy stock' : product.stock > 0 ? 'limited stock' : 'currently unavailable';
  const valueLine = discount > 0
    ? `${discount}% off right now, so it is a better value than usual.`
    : `No active discount, but the current price is ${formatPrice(price(product))}.`;

  return [
    {
      title: 'AI overview',
      body: `${product.name} is a ${product.category.name.toLowerCase()} item from ${productStore(product)}. ${valueLine}`,
    },
    {
      title: 'Buy signal',
      body: `Rating is ${Number(product.rating).toFixed(1)} with ${stockTone}. Good pick if you want this from a nearby seller instead of waiting for platform stock.`,
    },
    {
      title: 'Smart next step',
      body: `Add it with essentials from the same seller to keep delivery simpler.`,
      action: 'View seller store',
      href: product.store?.slug ? `/store/${product.store.slug}` : undefined,
    },
  ];
}

export function marketAiOverview(products: ProductType[]): AiInsight[] {
  const discounted = products
    .filter((product) => discountPercent(product) > 0)
    .sort((a, b) => discountPercent(b) - discountPercent(a))[0];
  const topRated = [...products].sort((a, b) => Number(b.rating) - Number(a.rating))[0];
  const stores = new Set(products.map((product) => product.store?.name).filter(Boolean));

  return [
    {
      title: 'AI market scan',
      body: stores.size > 1
        ? `${stores.size} local stores are active in this feed, so products are coming from sellers, not platform inventory.`
        : 'This feed is focused on products from nearby seller stores.',
    },
    {
      title: 'Best value now',
      body: discounted
        ? `${discounted.name} has the strongest visible discount at ${discountPercent(discounted)}% off.`
        : 'No major discount detected in this batch, so sort by rating or price before buying.',
      action: discounted ? 'Open deal' : 'Browse products',
      href: discounted ? `/product/${discounted.slug}` : '/products',
    },
    {
      title: 'Top confidence pick',
      body: topRated
        ? `${topRated.name} leads this batch with a ${Number(topRated.rating).toFixed(1)} rating from ${productStore(topRated)}.`
        : 'Add products to the feed and the assistant will rank them here.',
      action: topRated ? 'View product' : undefined,
      href: topRated ? `/product/${topRated.slug}` : undefined,
    },
  ];
}

export function cartAiOverview(items: CartItem[]): AiInsight[] {
  if (items.length === 0) {
    return [
      {
        title: 'AI cart planner',
        body: 'Add groceries, daily essentials, or electronics and I will summarize delivery, seller grouping, and value.',
        action: 'Start shopping',
        href: '/products',
      },
    ];
  }

  const stores = new Set(items.map((item) => item.product.store?.name || 'local seller'));
  const total = items.reduce((sum, item) => sum + price(item.product) * item.quantity, 0);
  const highest = [...items].sort((a, b) => price(b.product) * b.quantity - price(a.product) * a.quantity)[0];

  return [
    {
      title: 'AI cart overview',
      body: `${items.length} product type${items.length === 1 ? '' : 's'} from ${stores.size} seller${stores.size === 1 ? '' : 's'} with subtotal ${formatPrice(total)}.`,
    },
    {
      title: 'Delivery hint',
      body: stores.size > 1
        ? 'This may split into multiple seller fulfillments. Keep essentials from one shop when you want faster delivery.'
        : 'Single-seller cart. This is usually easier for delivery and seller confirmation.',
    },
    {
      title: 'Highest cart impact',
      body: highest ? `${highest.product.name} contributes the most to this cart total.` : 'Cart value is balanced.',
    },
  ];
}

export function sellerAiOverview(summary: {
  products: number;
  active_products: number;
  orders: number;
  units_sold: number;
  revenue: string;
  top_products: Array<{ name: string; stock: number; order_count: number }>;
} | null): AiInsight[] {
  if (!summary) {
    return [
      {
        title: 'AI CRM brief',
        body: 'Seller metrics will appear here after the dashboard data loads.',
      },
    ];
  }

  const topProduct = summary.top_products[0];
  const lowStock = summary.top_products.filter((product) => product.stock <= 5);

  return [
    {
      title: 'AI CRM brief',
      body: `${summary.active_products}/${summary.products} products are active, with ${summary.orders} orders and ${summary.units_sold} units sold.`,
    },
    {
      title: 'Revenue read',
      body: `Recorded revenue is ${formatPrice(summary.revenue || 0)}. Focus today: keep active products stocked and visible.`,
    },
    {
      title: lowStock.length ? 'Stock alert' : 'Growth suggestion',
      body: lowStock.length
        ? `${lowStock.length} top product${lowStock.length === 1 ? '' : 's'} are near low stock. Refill before pushing deals.`
        : topProduct
          ? `${topProduct.name} is your strongest listed product. Keep it featured and bundle nearby items.`
          : 'Add products first, then the CRM assistant can recommend stock and offer actions.',
    },
  ];
}

export function aiShoppingShortcuts(products: ProductType[]): AiShortcut[] {
  if (products.length === 0) {
    return [
      {
        title: 'Start with categories',
        body: 'Open the product feed and use category filters for faster discovery.',
        href: '/products',
        action: 'Browse products',
      },
    ];
  }

  const topRated = [...products].sort((a, b) => Number(b.rating) - Number(a.rating))[0];
  const cheapest = [...products]
    .filter((product) => product.stock > 0)
    .sort((a, b) => price(a) - price(b))[0];
  const biggestDeal = [...products]
    .filter((product) => product.discount_price)
    .sort((a, b) => Number(b.discount_price) - Number(a.discount_price))[0];
  const store = products.find((product) => product.store?.slug)?.store;

  return [
    {
      title: 'Top rated',
      body: topRated
        ? `${topRated.name} is the strongest rating signal in the current catalog.`
        : 'Ratings will show here once products are loaded.',
      href: topRated ? `/product/${topRated.slug}` : '/products',
      action: topRated ? 'Open product' : 'Browse catalog',
    },
    {
      title: 'Lowest price',
      body: cheapest
        ? `${cheapest.name} is the cheapest in-stock option right now.`
        : 'No in-stock item found for price comparison.',
      href: cheapest ? `/product/${cheapest.slug}` : '/products?sort=price_low',
      action: cheapest ? 'Open product' : 'Sort by price',
    },
    {
      title: 'Deal radar',
      body: biggestDeal
        ? `${biggestDeal.name} has one of the clearest discount signals in this feed.`
        : 'No obvious discount signal in this batch.',
      href: biggestDeal ? `/product/${biggestDeal.slug}` : '/products?sort=featured',
      action: biggestDeal ? 'Open deal' : 'Browse deals',
    },
    {
      title: 'Store context',
      body: store
        ? `Browse more from ${store.name} to keep delivery simpler and shop locally.`
        : 'Open a store page to see banner, location, and its full catalog.',
      href: store ? `/store/${store.slug}` : '/products',
      action: store ? 'View store' : 'Browse stores',
    },
  ];
}

// Basic offline AI fallback
export function aiChatReply(message: string, items: CartItem[]): string | null {
  const input = message.toLowerCase();
  const cart = cartAiOverview(items);

  if (input.includes('cart') || input.includes('checkout') || input.includes('delivery') || input.includes('summary') || input.includes('summarize')) {
    const summary = cart.map((item) => item.body).join(' ');
    const productTags = items.map(i => `[PRODUCT:${i.product.slug}]`).join('\n');
    return items.length > 0 ? `${summary}\n\n${productTags}` : summary;
  }
  if (input.includes('deal') || input.includes('discount') || input.includes('cheap')) {
    return 'Use product filters for price low-to-high and check products with sale badges. I can also compare the items already in your cart.';
  }
  if (input.includes('seller') || input.includes('shop') || input.includes('store')) {
    return 'Open any product seller card to see that store profile, map area, and all products from that shop.';
  }
  if (input.includes('payment')) {
    return 'Checkout supports COD, wallets, QR, card-style entry, and local delivery methods. Choose the method first and fill the matching details.';
  }

  return null;
}

// Ordered by preference — will try each until one succeeds
const FREE_MODELS = [
  'google/gemini-2.5-flash:free',
  'meta-llama/llama-3-8b-instruct:free',
  'google/gemma-2-9b-it:free',
  'openai/gpt-oss-20b:free',
];

export async function askOpenRouter(
  chatHistory: { role: 'assistant' | 'user'; text: string }[],
  items: CartItem[],
  locale: string = 'en',
  catalog: Partial<ProductType>[] = []
): Promise<string> {
  const lastMessage = chatHistory[chatHistory.length - 1]?.text || '';
  
  const cartContext = items.length === 0
    ? "The user's cart is currently empty."
    : `The user currently has the following items in their cart:\n${items.map(i => `- ${i.quantity}x ${i.product.name} (${formatPrice(price(i.product))} each) (Slug: ${i.product.slug})`).join('\n')}\n\nIMPORTANT: When summarizing or talking about items in the cart, you MUST include the exact tag [PRODUCT:slug] for each item so the UI can render a clickable product card with its photo.`;

  const catalogList = Array.isArray(catalog) ? catalog : [];
  const catalogContext = catalogList.length === 0
    ? ""
    : `\nHere are some products available in the store:\n${catalogList.slice(0, 100).map(p => `- ${p.name} (Price: Rs. ${p.price || p.discount_price}, Slug: ${p.slug})`).join('\n')}\n\nIMPORTANT: If you recommend a product from this list, you MUST include the exact tag [PRODUCT:slug] (e.g. [PRODUCT:samsung-t7-shield]) in your message so the UI can render a clickable card.`;

  let languageInstruction = "Reply entirely in English.";
  if (locale === 'np') {
    languageInstruction = "Reply in a mix of Nepali script and Roman Nepali (e.g. using common Roman Nepali words like 'khana' for food, 'saman' for goods, 'paisa' for money). Make it sound natural to a Nepali speaker.";
  }

  const messages = [
    {
      role: 'system',
      content: `You are KinaHub AI, a helpful and knowledgeable local commerce shopping assistant for a Nepali e-commerce platform called Kina. ${languageInstruction} Keep your answers brief (2-4 sentences max), friendly, and highly relevant to e-commerce. You can use markdown like **bold** for emphasis.\n${cartContext}${catalogContext}`
    },
    ...chatHistory.map(msg => ({
      role: msg.role,
      content: msg.text
    }))
  ];

  for (const model of FREE_MODELS) {
    try {
      const response = await fetch(`${API}/ai/chat/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ model, messages })
      });

      if (response.status === 501) {
         // Server doesn't have API key configured, fallback to basic offline AI
         return aiChatReply(lastMessage, items) || 'I can help compare products, explain your cart, suggest seller grouping, and guide checkout. Ask about deals, delivery, sellers, or payment.';
      }

      if (response.status === 429 || response.status === 404) {
        console.warn(`Model ${model} unavailable (${response.status}), trying next...`);
        continue;
      }

      if (!response.ok) {
        console.error(`Backend AI error for ${model}:`, await response.text());
        continue;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (content) return content;
    } catch (error) {
      console.error(`Fetch error for ${model}:`, error);
      continue;
    }
  }

  return aiChatReply(lastMessage, items) || "Sorry, all AI models are temporarily busy. Please try again in a moment!";
}

import { useEffect, useState } from 'react';
import { apiRequest } from '../lib/api';
import { formatPrice } from '../lib/products';
import { deliveryLabel, orderStatusLabel, orderStatuses, paymentLabel } from '../lib/orders';
import type { OrderType } from '../lib/orders';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../i18n/LocaleContext';

interface OrdersPageProps {
  mode: 'customer' | 'seller' | 'admin';
}

function mockOrder(id: number, customerEmail: string, status: OrderType['status'], items: Array<[string, number]>, total: number, payment = 'cod', delivery = 'delivery'): OrderType {
  return {
    id,
    customer_email: customerEmail,
    status,
    payment_method: payment,
    delivery_method: delivery,
    delivery_fee: '60',
    promo_code: '',
    discount_amount: '0',
    total_price: String(total),
    shipping_address: 'Kathmandu, Nepal',
    customer_note: '',
    items: items.map(([name, quantity], i) => ({
      id: i + 1,
      product: {
        id: i + 1,
        name,
        slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        category: { id: 1, name: 'Demo', slug: 'demo' },
        brand: null,
        description: '',
        specifications: '',
        specs: [],
        price: '0',
        discount_price: null,
        stock: 10,
        rating: '0',
        tag: null,
        is_featured: false,
        is_active: true,
        images: [],
      },
      quantity,
      price: String(total),
    })),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

const DEMO_SELLER_ORDERS: OrderType[] = [
  mockOrder(1001, 'ram.shah@gmail.com', 'pending', [['Set Thakali', 2], ['Fresh Milk 1L', 1]], 1790),
  mockOrder(1002, 'sita.rai@outlook.com', 'processing', [['Basmati Rice 5kg', 1], ['Mustang Honey', 1]], 1450),
  mockOrder(1003, 'anjali.pokharel@gmail.com', 'shipped', [['Pashmina Scarf', 1]], 1450, 'esewa'),
  mockOrder(1004, 'nischal.kc@gmail.com', 'delivered', [['Dal Bhat Power Set', 3]], 990, 'cod', 'pickup'),
];

const DEMO_CUSTOMER_ORDERS: OrderType[] = [
  mockOrder(1001, 'demo.customer@kinahub.local', 'delivered', [['Set Thakali', 2]], 1790),
  mockOrder(1002, 'demo.customer@kinahub.local', 'shipped', [['Mustang Honey', 1]], 660),
];

const DEMO_ADMIN_ORDERS: OrderType[] = DEMO_SELLER_ORDERS;

export default function OrdersPage({ mode }: OrdersPageProps) {
  const { token, isDemo } = useAuth();
  const { t } = useTranslation();
  const [orders, setOrders] = useState<OrderType[]>([]);
  const [error, setError] = useState('');

  function loadOrders() {
    apiRequest<OrderType[]>('/orders/', { token })
      .then(setOrders)
      .catch(() => setError(t('common.errorRequest', { defaultValue: 'Request failed' })));
  }

  useEffect(() => {
    if (isDemo) {
      setOrders(mode === 'customer' ? DEMO_CUSTOMER_ORDERS : mode === 'seller' ? DEMO_SELLER_ORDERS : DEMO_ADMIN_ORDERS);
      setError('');
      return;
    }
    loadOrders();
  }, [token, isDemo, mode]);

  async function updateStatus(orderId: number, status: string) {
    setError('');
    if (isDemo) {
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: status as OrderType['status'] } : o)));
      return;
    }
    try {
      await apiRequest<OrderType>(`/orders/${orderId}/status/`, {
        token,
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      loadOrders();
    } catch (err) {
      setError(t('common.errorRequest', { defaultValue: 'Request failed' }));
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-border bg-surface p-4 sm:p-6">
        <h1 className="text-2xl font-black tracking-tight">
          {mode === 'customer' ? t('dashboard.orderHistory', { defaultValue: 'Order history' }) : mode === 'seller' ? t('dashboard.orderFulfillment', { defaultValue: 'Order fulfillment' }) : t('dashboard.platformOrders', { defaultValue: 'Platform orders' })}
        </h1>
        <p className="mt-2 text-secondary">
          {mode === 'customer'
            ? t('dashboard.orderHistoryDescription', { defaultValue: 'Track purchases and payment status.' })
            : t('dashboard.orderFulfillmentDescription', { defaultValue: 'Review orders, payment method, fulfillment status, and customer contact.' })}
        </p>
        {isDemo && (
          <p className="mt-3 rounded-md bg-accent/10 px-3 py-2 text-xs font-semibold text-accent">
            {t('dashboard.demoNotice', { defaultValue: 'Demo mode: sample data shown, nothing is saved. Everything resets on refresh.' })}
          </p>
        )}
      </section>

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <section className="rounded-lg border border-border bg-surface p-4 sm:p-6">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] text-left text-sm">
            <thead className="text-secondary">
              <tr>
                <th className="py-2">{t('dashboard.order', { defaultValue: 'Order' })}</th>
                <th className="py-2">{t('dashboard.customer', { defaultValue: 'Customer' })}</th>
                <th className="py-2">{t('dashboard.items', { defaultValue: 'Items' })}</th>
                <th className="py-2">{t('dashboard.payment', { defaultValue: 'Payment' })}</th>
                <th className="py-2">{t('dashboard.delivery', { defaultValue: 'Delivery' })}</th>
                <th className="py-2">{t('dashboard.promo', { defaultValue: 'Promo' })}</th>
                <th className="py-2">{t('dashboard.total', { defaultValue: 'Total' })}</th>
                <th className="py-2">{t('dashboard.status', { defaultValue: 'Status' })}</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-t border-border align-top">
                  <td className="py-3 font-semibold">#{order.id}</td>
                  <td className="py-3">{order.customer_email}</td>
                  <td className="py-3">
                    <div className="space-y-1">
                      {order.items.map((item) => (
                        <p key={item.id}>{item.product.name} x{item.quantity}</p>
                      ))}
                    </div>
                  </td>
                  <td className="py-3">{paymentLabel(order.payment_method)}</td>
                  <td className="py-3">{deliveryLabel(order.delivery_method)}</td>
                  <td className="py-3">
                    {order.promo_code ? (
                      <div>
                        <p className="font-semibold uppercase">{order.promo_code}</p>
                        <p className="text-xs text-secondary">- {formatPrice(order.discount_amount)}</p>
                      </div>
                    ) : (
                      <span className="text-secondary">{t('common.none', { defaultValue: 'None' })}</span>
                    )}
                  </td>
                  <td className="py-3 font-semibold">{formatPrice(order.total_price)}</td>
                  <td className="py-3">
                    {mode === 'customer' ? (
                      <span className="rounded-full bg-muted px-2 py-1 text-xs font-semibold capitalize">{orderStatusLabel(order.status)}</span>
                    ) : (
                      <select
                        value={order.status}
                        onChange={(event) => updateStatus(order.id, event.target.value)}
                        className="rounded-md border border-border bg-background px-2 py-2 text-base capitalize outline-none focus:border-accent"
                      >
                        {orderStatuses.map((status) => (
                          <option key={status} value={status}>{orderStatusLabel(status)}</option>
                        ))}
                      </select>
                    )}
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr className="border-t border-border">
                  <td className="py-6 text-secondary" colSpan={8}>{t('dashboard.noOrders', { defaultValue: 'No orders yet.' })}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

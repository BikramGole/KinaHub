import { useEffect, useState } from 'react';
import { Package, ShoppingBag, TrendingUp, Warehouse } from 'lucide-react';
import { apiRequest } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { formatPrice } from '../lib/products';
import { useTranslation } from '../i18n/LocaleContext';
import AiInsightPanel from '../components/AiInsightPanel';
import { sellerAiOverview } from '../lib/ai';

interface SellerSummary {
  store: { name: string } | null;
  products: number;
  active_products: number;
  orders: number;
  units_sold: number;
  revenue: string;
  top_products: Array<{ id: number; name: string; stock: number; order_count: number }>;
}

export default function SellerDashboard() {
  const { token, deleteAccount } = useAuth();
  const { t } = useTranslation();
  const [summary, setSummary] = useState<SellerSummary | null>(null);

  useEffect(() => {
    apiRequest<SellerSummary>('/sellers/profiles/dashboard/', { token })
      .then(setSummary)
      .catch(() => setSummary(null));
  }, [token]);

  const cards = [
    { label: t('dashboard.products', { defaultValue: 'Products' }), value: summary?.products || 0, icon: Package },
    { label: t('dashboard.activeProducts', { defaultValue: 'Active products' }), value: summary?.active_products || 0, icon: Warehouse },
    { label: t('dashboard.orders', { defaultValue: 'Orders' }), value: summary?.orders || 0, icon: ShoppingBag },
    { label: t('dashboard.revenue', { defaultValue: 'Revenue' }), value: formatPrice(summary?.revenue || 0), icon: TrendingUp },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-border bg-surface p-4 sm:p-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">{t('dashboard.sellerCrm', { defaultValue: 'Seller CRM' })}</p>
        <h1 className="mt-2 text-2xl font-black tracking-tight">{summary?.store?.name || t('dashboard.storeDashboard', { defaultValue: 'Store dashboard' })}</h1>
        <p className="mt-2 text-secondary">{t('dashboard.sellerDescription', { defaultValue: 'Manage catalog, inventory, orders, customer records, and sales performance.' })}</p>
      </section>

      <AiInsightPanel title="AI CRM overview" insights={sellerAiOverview(summary)} />

      <div className="grid gap-4 md:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-lg border border-border bg-surface p-4 sm:p-5">
              <Icon className="h-5 w-5 text-accent" />
              <p className="mt-4 text-sm text-secondary">{card.label}</p>
              <p className="mt-1 text-2xl font-black">{card.value}</p>
            </div>
          );
        })}
      </div>

      <section className="rounded-lg border border-border bg-surface p-4 sm:p-6">
        <h2 className="text-lg font-bold">{t('dashboard.topProducts', { defaultValue: 'Top products' })}</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="text-secondary">
              <tr>
                <th className="py-2">{t('dashboard.product', { defaultValue: 'Product' })}</th>
                <th className="py-2">{t('dashboard.stock', { defaultValue: 'Stock' })}</th>
                <th className="py-2">{t('dashboard.orders', { defaultValue: 'Orders' })}</th>
              </tr>
            </thead>
            <tbody>
              {(summary?.top_products || []).map((product) => (
                <tr key={product.id} className="border-t border-border">
                  <td className="py-3 font-semibold">{product.name}</td>
                  <td className="py-3">{product.stock}</td>
                  <td className="py-3">{product.order_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 sm:p-6 mt-8">
        <h2 className="text-lg font-bold text-red-600 mb-2">Danger Zone</h2>
        <p className="text-sm text-secondary mb-4">Once you delete your account, there is no going back. Please be certain.</p>
        <button
          onClick={() => {
            if (window.confirm("Are you sure you want to permanently delete your account? This action cannot be undone.")) {
              deleteAccount().catch((err: any) => alert("Failed to delete account: " + err.message));
            }
          }}
          className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
        >
          Delete Account
        </button>
      </div>
    </div>
  );
}

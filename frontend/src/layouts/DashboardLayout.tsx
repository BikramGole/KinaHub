import { Link, NavLink, Outlet } from 'react-router-dom';
import { BarChart3, Bell, ClipboardList, LayoutDashboard, Package, Settings, Sparkles, Store, Ticket, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from '../components/ThemeToggle';
import { useTranslation } from '../i18n/LocaleContext';
import { useTheme } from '../context/ThemeContext';

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const role = user?.effective_role || 'customer';

  const roleNav = {
    customer: [
      { to: '/dashboard', label: t('dashboard.navAccount', { defaultValue: 'Account' }), icon: LayoutDashboard },
      { to: '/ai', label: t('dashboard.navAI', { defaultValue: 'AI' }), icon: Sparkles },
      { to: '/dashboard/orders', label: t('dashboard.navOrders', { defaultValue: 'Orders' }), icon: ClipboardList },
      { to: '/dashboard/tickets', label: t('dashboard.navSupport', { defaultValue: 'Support' }), icon: Ticket },
    ],
    seller: [
      { to: '/seller', label: t('dashboard.navDashboard', { defaultValue: 'Dashboard' }), icon: BarChart3 },
      { to: '/ai', label: t('dashboard.navAI', { defaultValue: 'AI' }), icon: Sparkles },
      { to: '/seller/products', label: t('dashboard.navProducts', { defaultValue: 'Products' }), icon: Package },
      { to: '/seller/orders', label: t('dashboard.navOrders', { defaultValue: 'Orders' }), icon: ClipboardList },
      { to: '/seller/customers', label: t('dashboard.navCustomers', { defaultValue: 'Customers' }), icon: Users },
    ],
    admin: [
      { to: '/admin', label: t('dashboard.navOverview', { defaultValue: 'Overview' }), icon: LayoutDashboard },
      { to: '/ai', label: t('dashboard.navAI', { defaultValue: 'AI' }), icon: Sparkles },
      { to: '/admin/users', label: t('dashboard.navUsers', { defaultValue: 'Users' }), icon: Users },
      { to: '/admin/orders', label: t('dashboard.navOrders', { defaultValue: 'Orders' }), icon: ClipboardList },
      { to: '/admin/crm', label: t('dashboard.navCrm', { defaultValue: 'CRM' }), icon: Bell },
      { to: '/admin/settings', label: t('dashboard.navSettings', { defaultValue: 'Settings' }), icon: Settings },
    ],
  };

  const nav = roleNav[role];

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-surface">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center">
            <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-border bg-background shadow-sm md:h-11 md:w-11">
              <img
                src={theme === 'dark' ? '/logo-dark.png' : '/logo-light.png'}
                alt="KinaHub"
                className="h-[132%] w-[132%] object-cover object-center"
              />
            </span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden text-secondary sm:inline">{user?.email}</span>
            <ThemeToggle />
            <button type="button" onClick={logout} className="font-semibold text-accent">
              {t('dashboard.logout', { defaultValue: 'Logout' })}
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[240px_1fr] lg:px-8">
        <aside className="rounded-lg border border-border bg-surface p-3 lg:sticky lg:top-20 lg:h-fit">
          <div className="mb-3 flex items-center gap-2 px-3 py-2 text-sm font-bold uppercase text-secondary">
            <Store className="h-4 w-4" />
            {t(`dashboard.role${role.charAt(0).toUpperCase() + role.slice(1)}`, { defaultValue: role })}
          </div>
          <nav className="grid gap-1">
            {nav.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
                      isActive ? 'bg-accent text-background' : 'text-secondary hover:bg-background hover:text-primary'
                    }`
                  }
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
        </aside>

        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

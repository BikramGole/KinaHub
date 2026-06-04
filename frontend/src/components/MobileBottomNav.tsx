import { NavLink } from 'react-router-dom';
import { Home, Search, ShoppingBag, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useTranslation } from '../i18n/LocaleContext';

export default function MobileBottomNav() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { totalCount } = useCart();
  const accountPath = user ? '/dashboard' : '/login';

  const itemClass = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors btn-press-effect group ${
      isActive ? 'text-accent' : 'text-secondary hover:text-primary'
    }`;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface/95 px-3 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 shadow-[0_-8px_24px_rgba(0,0,0,0.12)] backdrop-blur md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-4">
        <NavLink to="/" className={itemClass}>
          <Home className="h-5 w-5 icon-hover-effect group-hover:scale-110" />
          {t('nav.home', { defaultValue: 'Home' })}
        </NavLink>
        <NavLink to="/products" className={itemClass}>
          <Search className="h-5 w-5 icon-hover-effect group-hover:scale-110" />
          {t('nav.shop', { defaultValue: 'Shop' })}
        </NavLink>
        <NavLink to="/cart" className={itemClass}>
          <span className="relative">
            <ShoppingBag className="h-5 w-5 icon-hover-effect group-hover:scale-110" />
            {totalCount > 0 && (
              <span className="absolute -right-2 -top-2 rounded-full bg-accent px-1.5 text-[10px] font-bold text-background transition-transform duration-200 group-hover:scale-110">
                {totalCount}
              </span>
            )}
          </span>
          {t('nav.cart', { defaultValue: 'Cart' })}
        </NavLink>
        <NavLink to={accountPath} className={itemClass}>
          <User className="h-5 w-5 icon-hover-effect group-hover:scale-110" />
          {t('nav.account', { defaultValue: 'Account' })}
        </NavLink>
      </div>
    </nav>
  );
}

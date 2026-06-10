import { useTranslation } from '../i18n/LocaleContext';
import { Mail, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Footer() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { theme } = useTheme();
  const accountLink = user ? '/dashboard' : '/login';
  const accountLabel = user ? t('footer.account', { defaultValue: 'Dashboard' }) : t('footer.login', { defaultValue: 'Login' });
  const secondaryAccountLink = user ? '/dashboard/orders' : '/register';
  const secondaryAccountLabel = user ? t('footer.orders', { defaultValue: 'Orders' }) : t('footer.register', { defaultValue: 'Register' });

  return (
    <footer className="mt-12 border-t border-border bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div>
            <Link to="/" className="mb-4 flex items-center gap-2">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-background shadow-sm md:h-12 md:w-12">
                <img
                  src={theme === 'dark' ? '/logo-dark.png' : '/logo-light.png'}
                  alt="KinaHub Logo"
                  className="h-[132%] w-[132%] object-cover object-center"
                />
              </span>
              <span className="text-xl font-black tracking-tight">KinaHub</span>
            </Link>
            <p className="text-sm leading-6 text-secondary">{t('footer.description', { defaultValue: 'Products, deals, delivery, checkout.' })}</p>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide">{t('footer.shopTitle', { defaultValue: 'Shop' })}</h3>
            <ul className="space-y-2 text-sm text-secondary">
              <li><Link to="/products" className="hover:text-primary">{t('footer.allProducts', { defaultValue: 'All products' })}</Link></li>
              <li><Link to="/products?category=mobiles" className="hover:text-primary">{t('footer.mobiles', { defaultValue: 'Mobiles' })}</Link></li>
              <li><Link to="/products?category=fashion" className="hover:text-primary">{t('footer.fashion', { defaultValue: 'Fashion' })}</Link></li>
              <li><Link to="/products?category=groceries" className="hover:text-primary">{t('footer.groceries', { defaultValue: 'Groceries' })}</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide">{t('footer.ordersTitle', { defaultValue: 'Orders' })}</h3>
            <ul className="space-y-2 text-sm text-secondary">
              <li><Link to="/cart" className="hover:text-primary">{t('footer.cart', { defaultValue: 'Cart' })}</Link></li>
              <li><Link to={accountLink} className="hover:text-primary">{accountLabel}</Link></li>
              <li><Link to={secondaryAccountLink} className="hover:text-primary">{secondaryAccountLabel}</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide">{t('footer.contactTitle', { defaultValue: 'Contact' })}</h3>
            <ul className="space-y-3 text-sm text-secondary">
              <li className="flex items-center gap-2"><MapPin className="h-4 w-4 text-accent" /> {t('footer.location', { defaultValue: 'Kathmandu, Nepal' })}</li>
              <li className="flex items-center gap-2">
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0 text-accent"
                  fill="currentColor"
                >
                  <path d="M12 2C6.48 2 2 6.58 2 12.26c0 4.54 2.87 8.39 6.84 9.76.5.09.68-.22.68-.48 0-.24-.01-.87-.01-1.71-2.78.62-3.37-1.36-3.37-1.36-.45-1.17-1.11-1.48-1.11-1.48-.91-.64.07-.63.07-.63 1 .07 1.53 1.05 1.53 1.05.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.64-1.37-2.22-.26-4.56-1.13-4.56-5.03 0-1.11.38-2.02 1-2.73-.1-.26-.44-1.31.1-2.72 0 0 .84-.27 2.75 1.04A9.2 9.2 0 0 1 12 6.84c.85 0 1.71.12 2.51.35 1.91-1.31 2.75-1.04 2.75-1.04.54 1.41.2 2.46.1 2.72.62.71 1 1.62 1 2.73 0 3.91-2.35 4.77-4.58 5.02.36.32.69.94.69 1.9 0 1.37-.01 2.48-.01 2.82 0 .26.18.58.69.48A10.27 10.27 0 0 0 22 12.26C22 6.58 17.52 2 12 2Z" />
                </svg>
                <a
                  href="https://github.com/DevXtechnic/"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-primary"
                >
                  {t('footer.github', { defaultValue: 'github.com/DevXtechnic' })}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-accent" />
                <a href="mailto:kinahubofficial@gmail.com" className="hover:text-primary">
                  {t('footer.email', { defaultValue: 'kinahubofficial@gmail.com' })}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col sm:flex-row justify-between border-t border-border pt-6 text-sm text-secondary">
          <span>&copy; {new Date().getFullYear()} KinaHub.</span>
          <Link to="/privacy" className="mt-2 sm:mt-0 hover:text-primary">{t('footer.privacyPolicy', { defaultValue: 'Privacy Policy' })}</Link>
        </div>
      </div>
    </footer>
  );
}

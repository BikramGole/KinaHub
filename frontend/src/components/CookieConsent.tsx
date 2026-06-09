import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../i18n/LocaleContext';

export default function CookieConsent() {
  const [show, setShow] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    const consent = localStorage.getItem('kinahub-cookie-consent');
    if (!consent) {
      // Small delay to not immediately block the UI on first load
      const timer = setTimeout(() => setShow(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('kinahub-cookie-consent', 'true');
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6"
        >
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 rounded-xl border border-border bg-surface/95 p-4 backdrop-blur-md shadow-2xl sm:flex-row sm:p-6">
            <div className="flex-1 text-sm text-secondary text-center sm:text-left">
              <span className="font-semibold text-primary block sm:inline">{t('cookies.title', { defaultValue: 'We use cookies.' })}</span>{' '}
              {t('cookies.message', { defaultValue: 'This website uses cookies to enhance your browsing experience, analyze site traffic, and serve personalized content. By continuing to use our site, you consent to our use of cookies.' })}{' '}
              <Link to="/privacy" className="font-semibold text-accent hover:underline">
                {t('cookies.learnMore', { defaultValue: 'Learn more' })}
              </Link>
            </div>
            <div className="flex w-full shrink-0 gap-3 sm:w-auto">
              <button
                onClick={handleAccept}
                className="flex-1 whitespace-nowrap rounded-lg bg-accent px-6 py-2.5 text-sm font-bold text-accent-foreground transition-all hover:bg-accent/90 active:scale-95 sm:flex-none"
              >
                {t('cookies.accept', { defaultValue: 'Accept All' })}
              </button>
              <button
                onClick={() => setShow(false)}
                className="flex items-center justify-center rounded-lg border border-border p-2.5 text-secondary hover:bg-background hover:text-primary active:scale-95 sm:hidden"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <button
              onClick={() => setShow(false)}
              className="absolute -right-2 -top-2 hidden items-center justify-center rounded-full border border-border bg-background p-1.5 text-secondary shadow-sm hover:text-primary sm:flex"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

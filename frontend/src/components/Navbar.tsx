import { useState, useEffect, useRef } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, Search, ShoppingBag, Sparkles, User, X } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';
import { useTheme } from '../context/ThemeContext';
import { API_BASE } from '../lib/api';
import { useTranslation } from '../i18n/LocaleContext';

function SearchBar({ mobile = false, onSearch }: { mobile?: boolean; onSearch?: () => void }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (search.trim().length > 1) {
        fetch(`${API_BASE}/products/suggestions/?q=${encodeURIComponent(search.trim())}`)
          .then((res) => res.json())
          .then((data: { suggestions: string[] }) => {
            setSuggestions(data.suggestions || []);
            setFocusedIndex(-1);
            setIsOpen(true);
          })
          .catch(() => { setSuggestions([]); setFocusedIndex(-1); });
      } else {
        setSuggestions([]);
        setFocusedIndex(-1);
        setIsOpen(false);
      }
    }, 200);
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setFocusedIndex(-1);
        if (mobile) setMobileExpanded(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mobile]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        event.preventDefault();
        if (mobile) setMobileExpanded(true);
        // Timeout allows mobile input to render if just expanded
        setTimeout(() => inputRef.current?.focus(), 10);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mobile]);

  function submitSearch(event: FormEvent<HTMLFormElement> | string) {
    if (typeof event !== 'string') event.preventDefault();
    const query = typeof event === 'string' ? event : search;
    if (!query.trim()) return;
    
    navigate(`/products?q=${encodeURIComponent(query.trim())}`);
    setIsOpen(false);
    setFocusedIndex(-1);
    if (mobile) setMobileExpanded(false);
    if (onSearch) onSearch();
  }

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex((prev) => (prev > -1 ? prev - 1 : -1));
    } else if (e.key === 'Enter' && focusedIndex >= 0) {
      e.preventDefault();
      setSearch(suggestions[focusedIndex]);
      submitSearch(suggestions[focusedIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setFocusedIndex(-1);
    }
  };

  const renderSuggestions = () => {
    if (!isOpen || suggestions.length === 0) return null;
    return (
      <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-md border border-border bg-surface shadow-xl">
        <ul className="max-h-[70vh] overflow-y-auto py-1">
          {suggestions.map((suggestion, index) => (
            <li key={index}>
              <button
                type="button"
                onClick={() => {
                  setSearch(suggestion);
                  submitSearch(suggestion);
                }}
                className={`w-full text-left flex items-center gap-3 px-4 py-2.5 transition-colors text-sm font-medium text-primary ${
                  index === focusedIndex ? 'bg-accent/10' : 'hover:bg-accent/5'
                }`}
              >
                <Search className="h-4 w-4 text-secondary shrink-0" />
                <span className="truncate capitalize">{suggestion}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  if (mobile) {
    return (
      <div ref={containerRef} className="flex w-full justify-end md:hidden">
        {!mobileExpanded ? (
          <button
            type="button"
            onClick={() => setMobileExpanded(true)}
            className="flex h-11 w-11 items-center justify-center rounded-md border border-border text-secondary hover:text-primary btn-press-effect"
            aria-label={t('nav.searchProducts', { defaultValue: 'Search products' })}
          >
            <Search className="h-5 w-5" />
          </button>
        ) : (
          <div className="relative w-full">
            <form onSubmit={submitSearch}>
              <div className="flex items-center gap-2 rounded-md border border-border bg-background px-3">
                <Search className="h-4 w-4 shrink-0 text-secondary" />
                <input
                  ref={inputRef}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  onFocus={() => {
                    if (suggestions.length > 0) setIsOpen(true);
                  }}
                  onKeyDown={handleInputKeyDown}
                  className="h-11 min-w-0 flex-1 bg-transparent text-base outline-none"
                  placeholder={t('nav.searchProducts', { defaultValue: 'Search products' })}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setSuggestions([]);
                    setIsOpen(false);
                    setFocusedIndex(-1);
                    setMobileExpanded(false);
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-secondary hover:text-primary btn-press-effect"
                  aria-label={t('nav.closeMenu', { defaultValue: 'Close search' })}
                >
                  <X className="h-4 w-4 icon-hover-effect" />
                </button>
              </div>
            </form>
            {renderSuggestions()}
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative hidden min-w-0 flex-1 md:block">
      <form onSubmit={submitSearch}>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary" />
          <input
            ref={inputRef}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onFocus={() => {
              if (suggestions.length > 0) setIsOpen(true);
            }}
            onKeyDown={handleInputKeyDown}
            className="h-11 w-full rounded-md border border-border bg-background pl-10 pr-12 text-base outline-none transition-colors focus:border-accent"
            placeholder={t('nav.searchProducts', { defaultValue: 'Search products' })}
          />
          <div className="pointer-events-none absolute right-3 top-1/2 flex -translate-y-1/2 items-center">
            <kbd className="hidden rounded border border-border bg-muted px-2 py-0.5 text-xs font-semibold text-secondary sm:block">
              /
            </kbd>
          </div>
        </div>
      </form>
      {renderSuggestions()}
    </div>
  );
}

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { totalCount } = useCart();
  const { user } = useAuth();
  const { theme } = useTheme();
  const { t, locale, setLocale } = useTranslation();

  function closeMenu() {
    setMenuOpen(false);
  }

  function toggleLanguage() {
    setLocale(locale === 'en' ? 'np' : 'en');
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center gap-3 md:h-16 md:gap-4">
          <Link 
            to="/" 
            className="flex shrink-0 items-center h-full py-2"
            onClick={(e) => {
              if (location.pathname === '/') {
                e.preventDefault();
                window.location.reload();
              }
            }}
          >
            <img
              src={theme === 'dark' ? '/logo_navbar-dark.png' : '/logo_navbar-light.png'}
              alt="KinaHub Logo"
              className="h-full w-auto object-contain"
            />
          </Link>

          {/* Desktop search bar (hidden on mobile) */}
          <SearchBar />

          {/* ── Desktop nav ── */}
          <div className="ml-auto hidden items-center gap-5 md:flex">
            <button onClick={toggleLanguage} className="text-xs font-bold text-secondary hover:text-primary transition-colors">
              {locale === 'en' ? 'EN | NP' : 'NP | EN'}
            </button>
            <Link to="/ai" className="inline-flex items-center gap-2 text-sm font-semibold text-secondary hover:text-primary group">
              <Sparkles className="h-4 w-4 icon-hover-effect group-hover:text-accent" />
              {t('nav.ai', { defaultValue: 'AI' })}
            </Link>
            <Link to="/products" className="text-sm font-semibold text-secondary hover:text-primary">
              {t('nav.products', { defaultValue: 'Products' })}
            </Link>
            <ThemeToggle />
            <Link to={user ? '/dashboard' : '/register'} className="text-secondary hover:text-primary group">
              <User className="h-5 w-5 icon-hover-effect" />
            </Link>
            <Link to="/cart" className="relative text-secondary hover:text-primary group">
              <ShoppingBag className="h-5 w-5 icon-hover-effect group-hover:text-accent" />
              {totalCount > 0 && (
                <span className="absolute -right-2 -top-2 rounded-full bg-accent px-1.5 text-[10px] font-bold text-background transition-transform duration-200 group-hover:scale-110">
                  {totalCount}
                </span>
              )}
            </Link>
          </div>

          {/* ── Mobile: inline search bar + hamburger only ── */}
          <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-2 md:hidden">
            {/* Inline search field on mobile (always visible, no icon-only toggle) */}
            <div className="min-w-0 flex-1">
              <SearchBar mobile />
            </div>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-border text-secondary hover:text-primary btn-press-effect"
              aria-label={menuOpen ? t('nav.closeMenu', { defaultValue: 'Close menu' }) : t('nav.openMenu', { defaultValue: 'Open menu' })}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* ── Mobile hamburger drawer ── */}
        {menuOpen && (
          <div className="border-t border-border pb-4 pt-3 md:hidden">
            {/* Nav links */}
            <div className="space-y-0.5">
              <Link onClick={closeMenu} to="/" className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold text-primary hover:bg-muted transition-colors">
                {t('nav.home', { defaultValue: 'Home' })}
              </Link>
              <Link onClick={closeMenu} to="/products" className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold text-primary hover:bg-muted transition-colors">
                {t('nav.products', { defaultValue: 'Products' })}
              </Link>
              <Link onClick={closeMenu} to="/ai" className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold text-primary hover:bg-muted transition-colors">
                <Sparkles className="h-4 w-4 text-accent" />
                {t('nav.ai', { defaultValue: 'AI' })}
              </Link>
              <Link onClick={closeMenu} to="/cart" className="flex items-center justify-between rounded-lg px-3 py-3 text-sm font-semibold text-primary hover:bg-muted transition-colors">
                <span className="flex items-center gap-3">
                  <ShoppingBag className="h-4 w-4" />
                  {t('nav.cart', { defaultValue: 'Cart' })}
                </span>
                {totalCount > 0 && (
                  <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold text-background">
                    {totalCount}
                  </span>
                )}
              </Link>
              <Link onClick={closeMenu} to={user ? '/dashboard' : '/login'} className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold text-primary hover:bg-muted transition-colors">
                <User className="h-4 w-4" />
                {user ? t('nav.dashboard', { defaultValue: 'Dashboard' }) : t('nav.login', { defaultValue: 'Login' })}
              </Link>
              {!user && (
                <Link onClick={closeMenu} to="/register" className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold text-primary hover:bg-muted transition-colors">
                  {t('nav.register', { defaultValue: 'Register' })}
                </Link>
              )}
            </div>

            {/* Divider */}
            <div className="my-3 h-px bg-border" />

            {/* Settings row: theme + language */}
            <div className="flex items-center justify-between px-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-secondary">
                {t('nav.settings', { defaultValue: 'Settings' })}
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleLanguage}
                  className="rounded-md border border-border px-3 py-1.5 text-xs font-bold text-secondary hover:border-accent hover:text-primary transition-colors"
                >
                  {locale === 'en' ? 'EN | NP' : 'NP | EN'}
                </button>
                <ThemeToggle />
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

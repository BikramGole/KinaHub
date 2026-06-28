# KinaHub — Project Wiki

## Stack
- **Backend:** Django 6 + Django REST Framework, SQLite/PostgreSQL, Cloudinary (media), Gunicorn
- **Frontend:** React 19 + TypeScript, Vite, Tailwind CSS 4, React Router 7
- **Deployment:** Backend on Render, Frontend on Vercel
- **Error Tracking:** Sentry (sentry-sdk on backend, @sentry/react on frontend)

## Backend Structure (`backend/`)
- `core/` — Django project root: `settings.py`, `urls.py`, `wsgi.py`, `asgi.py`
- `users/` — User auth (Google OAuth, JWT, email OTP), profiles
- `products/` — Product CRUD, categories, search, pricing
- `orders/` — Order management, checkout
- `sellers/` — Seller dashboard, store management
- `crm/` — CRM module, admin dashboard
- `wishlist/` — User wishlists
- `templates/` — Email templates (welcome, promo, password reset, OTP)

## Frontend Structure (`frontend/src/`)
- `App.tsx` — Root with routes
- `pages/` — Home, Products, ProductDetails, Cart, Checkout, Login, Register, AiShopping, DashboardHome, SellerDashboard, SellerProducts, AdminDashboard, AdminUsersPage, CRMPage, OrdersPage, StoreDetails, TermsOfService, PrivacyPolicy
- `components/` — Navbar, Footer, ProductCard, CartContext, AiAssistantWidget, AiInsightPanel, CookieConsent, ErrorBoundary, GoogleAuthButton, MobileBottomNav, ProductCardSkeleton, ProtectedRoute, ScrollToTop, Seo, ThemeToggle
- `context/` — AuthContext, CartContext, ThemeContext
- `lib/` — api.ts, audio.ts, ai.ts, products.ts, checkout.ts, orders.ts, googleAuth.ts, recentlyViewed.ts, categoryIcons.ts
- `hooks/` — Custom React hooks
- `i18n/` — Internationalization (localeStore.ts, LocaleContext.tsx)
- `layouts/` — RootLayout, DashboardLayout

## Key Conventions
- Django backend uses function-based views (not class-based), decorated with `@api_view` and `@permission_classes`
- Frontend uses functional components with hooks
- API base path: `/api/`
- Frontend API calls go through `lib/api.ts` (axios instance)
- Authentication: JWT tokens stored in localStorage, Google OAuth supported
- Media files: Cloudinary for production, local `/media/` for development
- Error pages: 404.html, 500.html in templates
- Python requirements in `requirements.txt`, Node deps in `frontend/package.json`

## Workflows
- `.github/workflows/opencode-autofix.yml` — Auto-fix Sentry errors via OpenCode
- `.github/workflows/sentry-event-checker.yml` — Polls Sentry API for new issues

## Common Fixes
- Sentry init must come after DEBUG definition in settings.py
- urls.py uses f-strings for URL patterns
- Render free tier: cold start ~45s, HTTPS may return 502/500 briefly after wake

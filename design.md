# KinaHub — System Design Document

> **Version:** 1.0  
> **Last Updated:** June 2026  
> **Stack:** Django 6.0 + DRF 3.17 — React 19 + TypeScript + Vite — PostgreSQL (Neon) — Cloudinary

---

## 1. Architecture Overview

```
┌────────────────────────────────────────────────────────┐
│                    Frontend (Vercel)                    │
│  React 19 · TypeScript · Vite · Tailwind CSS 4         │
│  React Router 7 · Framer Motion                        │
│  kinahub.vercel.app                                    │
└────────────────────┬───────────────────────────────────┘
                     │ HTTPS / JSON
                     ▼
┌────────────────────────────────────────────────────────┐
│                    Backend (Render)                     │
│  Django 6.0 · DRF 3.17 · Gunicorn · Whitenoise         │
│  kinahub-ot0t.onrender.com                              │
└───────┬──────────┬──────────┬──────────┬───────────────┘
        │          │          │          │
        ▼          ▼          ▼          ▼
   ┌────────┐ ┌────────┐ ┌────────┐ ┌────────────┐
   │Postgres│ │Cloudin.│ │Sentry  │ │ OpenRouter │
   │(Neon)  │ │(Media) │ │(Errors)│ │ (AI Chat)  │
   └────────┘ └────────┘ └────────┘ └────────────┘
```

### Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Auth | JWT + OTP 2FA + Google OAuth | Stateless, no session store needed; 2FA via email OTP; social login convenience |
| API Style | Function-based views + `@api_view` | Simpler than CBVs for this scope; easier to read and maintain |
| Frontend state | Context API (no Redux) | Small state surface (auth, cart, theme); Context is sufficient and simpler |
| Cart persistence | localStorage | Guest users can cart without an account; no server-side cart needed |
| Media storage | Cloudinary | Offloads image serving/resizing; cheaper than serving from Django |
| Caching | LocMemCache + Cache-Control headers | Self-contained, no Redis dependency; public caching for anonymous traffic |
| AI | Client-side heuristics + OpenRouter proxy | Offline fallback for common queries; backend proxy hides API key |

---

## 2. Data Model & Relationships

```
┌─────────────┐       ┌────────────────┐       ┌──────────────┐
│    User     │──1:1──│ CustomerProfile│       │  Category    │
│ (email,pwd, │       │ (lifetime_val) │       │ (name,slug)  │
│  role,OTP)  │       └────────────────┘       └──────┬───────┘
└──────┬──────┘                                      │
       │1:N                                           │1:N
       ▼                                              ▼
┌─────────────┐       ┌────────────────┐       ┌──────────────┐
│   Address   │       │  SellerProfile │──1:1──│    Store     │
│(type, city, │       │(business_name, │       │(name, area,  │
│ is_default) │       │ status)        │       │ delivery_zone│
└─────────────┘       └───────┬────────┘       └──────┬───────┘
                              │                        │1:N
                              │                        ▼
                              │                 ┌──────────────┐
                              │                 │   Product    │
                              │1:N              │(price,stock, │
                              │                 │ delivery_fee)│
                              │                 └──────┬───────┘
                              │                        │1:N
                              │                        ▼
                              │                 ┌──────────────┐
                              │                 │ ProductImage │
                              │                 │(url,primary) │
                              │                 └──────────────┘
┌─────────────┐       ┌────────────────┐
│    Order    │──1:N──│   OrderItem    │
│(status,     │       │(quantity,price)│
│ delivery_fee│       └────────────────┘
│ total_price)│
└──────┬──────┘
       │1:1
       ▼
┌─────────────┐
│   Payment   │
│(method,     │
│ status, amt)│
└─────────────┘

┌──────────────┐    ┌─────────────┐    ┌──────────────┐     ┌───────────┐
│ Lead         │    │   Ticket    │1:N│   Message    │     │Wishlist   │
│(name,source, │    │(subject,pr) │───│(sender,body) │ 1:1 │(products  │
│ status)      │    │ status)     │   └──────────────┘     │ M2M)      │
└──────────────┘    └──────┬──────┘                        └───────────┘
                           │1:N
                           ▼
┌──────────────┐    ┌──────────────┐
│  ActivityLog │    │ Notification │
│(actor,verb,  │    │(type,title,  │
│ target, meta)│    │ is_read)     │
└──────────────┘    └──────────────┘
```

### Key Relationships

| Parent | Child | Cardinality | Cascade |
|--------|-------|-------------|---------|
| User | Address | 1:N | CASCADE |
| User | Order | 1:N | CASCADE |
| User | CustomerProfile | 1:1 | CASCADE |
| User | SellerProfile | 1:1 | CASCADE |
| Product | ProductImage | 1:N | CASCADE |
| Product | Review | 1:N | CASCADE |
| Product | Inventory | 1:1 | — |
| Product | Wishlist | N:M (through M2M) | — |
| Store | Product | 1:N | SET_NULL |
| Category | Product | 1:N | CASCADE |
| Order | OrderItem | 1:N | CASCADE |
| Order | Payment | 1:1 | CASCADE |
| Ticket | Message | 1:N | CASCADE |

---

## 3. API Design

### Authentication Flow

```
Register ──> User Created ──> OTP sent ──> /verify-2fa ──> JWT tokens
   │                                                              │
   │ Google OAuth:                                                │
   └──> /auth/google/ ──> validate token ──> find/create user ──> JWT
                                                                   │
Login ──> /token/ ──> email+password ──> OTP sent ──> /verify-2fa
```

### Authentication Flow
1. **Register**: `POST /api/auth/register/` → user created, OTP sent, returns `require_2fa: true`
2. **Verify OTP**: `POST /api/token/verify-2fa/` → returns JWT access + refresh tokens
3. **Login**: `POST /api/token/` → validates credentials, sends OTP
4. **Google OAuth**: `POST /api/auth/google/` → verifies token with Google API, creates/logs in user
5. **Token Refresh**: `POST /api/token/refresh/` → new access token
6. **Token lifetime**: Access = 1 day | Refresh = 7 days (not rotated)

### RBAC Model

| Role | Access |
|------|--------|
| `customer` | Own orders, cart, wishlist, profile |
| `seller` | All customer + own store, products, seller dashboard |
| `admin` | All + CRM, user management, admin dashboard |
| `is_staff` | Maps to `admin` role via `effective_role` property |

- **Permission enforcement**: User's `effective_role` property checks `is_staff`/`is_superuser` first, then `role` field
- Seller registration requires `seller_code = "mafia"` (configurable via `SELLER_REGISTRATION_CODE` env var)
- Unauthenticated users can browse products, view stores, and add to cart (localStorage)

### Request Flow (e.g., Product Listing)

```
GET /api/products/items/?category=laptops&price_max=100000&sort=rating_high

1. Django → CorsMiddleware (adds CORS headers)
2. → CommonMiddleware (redirects, ETags)
3. → Auth (JWTAuthentication, optional)
4. → View (homepage_data or ProductViewSet)
5.   → Filter products by category, price range
6.   → Sort by requested field
7.   → Add Cache-Control headers (anonymous: public, 300s)
8.   → Serialize with ProductSerializer
9.   → Return JSON response
```

---

## 4. Business Logic

### Delivery Fee Calculation

```
Input: customer address + product store area
  │
  ├── Resolve address to zone (core/inner/middle/outer/remote)
  │
  ├── Resolve store area to zone (origin)
  │
  ├── Same zone? → Free (Rs 0)
  │
  ├── Different zones?
  │   └── base_fee = max(zone_base_fee, product.base_delivery_fee)
  │
  ├── Category surcharges:
  │   Electronics +Rs30 | Furniture +Rs80
  │   Appliances +Rs50 | Beverages +Rs15
  │
  ├── Time multipliers:
  │   Peak (11-14, 18-21) → 1.2x
  │   Night (21-6) → +Rs50 flat
  │
  ├── Clamp: min Rs35, max Rs400
  │
  ├── Free delivery if order > Rs 2,500
  │
  └── Heavy order (>5 items): +Rs25
```

**Zone boundary map**: 100+ Kathmandu areas mapped to 5 zones hardcoded in `orders/utils.py`

### Product Recommendations (Similar Products)

Scoring algorithm that evaluates candidates on 6 weighted dimensions:

| Signal | Weight | Notes |
|--------|--------|-------|
| Same category | +60 | Highest signal |
| Same brand | +30 | |
| Same store | +20 | Cross-sell within store |
| Price proximity | up to +20 | Closer price = higher score |
| Rating | up to +12 | `rating * 2.5` |
| Featured | +5 | |
| Category + Brand combo | +8 | Secondary match bonus |

Returns top 12; falls back to highest-rated if <6 candidates

### Promo Codes

| Code | Effect | Hardcoded |
|------|--------|-----------|
| `aura10` | 10% off | Yes (orders/views.py) |
| `balensarkar12` | 12% off | Yes |

### AI Features

**Three AI interaction modes:**

| Mode | Implementation | When Used |
|------|---------------|-----------|
| **Backend Chat** | Proxies to OpenRouter API; returns formatted text with `[PRODUCT:slug]` tags | User chats via AI Shopping page |
| **Frontend Heuristics** | JS-side scoring for best value, confidence picks, cart optimization | Product page insight panels, dashboard widgets |
| **Offline Fallback** | Rule-based responses for common queries (cart, checkout, delivery) | When OpenRouter is unavailable |

**AI Insight Panel** (`productAiSummary`): Generates automated 'buy signal' for products based on rating stock price value.

---

## 5. Frontend Architecture

### Component Tree

```
<App>
  <AuthProvider>
    <ThemeProvider>
      <CartProvider>
        <ScrollToTop />
        <Routes>
          <RootLayout>
            <Navbar />
            <AiAssistantWidget />         ← Floats on all pages
            <MobileBottomNav />
            <Outlet />
            <Footer />
            <CookieConsent />
          </RootLayout>
          <DashboardLayout>
            <Sidebar />
            <Outlet />
          </DashboardLayout>
        </Routes>
      </CartProvider>
    </ThemeProvider>
  </AuthProvider>
</App>
```

### State Management

| State | Mechanism | Persistence |
|-------|-----------|-------------|
| Auth | Context + localStorage | JWT tokens, user object |
| Cart | Context + localStorage | Cart items, quantities |
| Theme | Context + localStorage | `light`/`dark` |
| Locale | Context + localStorage | `en`/`np` |
| Product data | React Query? (fetch) | In-memory |
| Recently viewed | localStorage | Array of product slugs |

### Key Frontend Packages

| Package | Purpose |
|---------|---------|
| `react-router-dom` v7 | Routing |
| `@react-oauth/google` | Google One Tap login |
| `framer-motion` | Animations |
| `react-helmet-async` | SEO meta tags |
| `react-hot-toast` | Notifications |
| `@sentry/react` | Error tracking |
| `react-icons` | Icon library |

---

## 6. Deployment Architecture

```
┌──────────────────────────────────────────────┐
│                 Render (Backend)              │
│  Web Service (Gunicorn + Django)              │
│  ● 2 workers, 90s timeout                    │
│  ● Preload app (--preload)                   │
│  ● Keep-alive 5s                             │
│  ● Auto-migrate + seed on deploy             │
│                                               │
│  Cron Job (every 10 min):                    │
│  ● Pings /ping/ to prevent cold start        │
└──────────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────┐
│              Vercel (Frontend)                │
│  Static SPA via Vite build                   │
│  ● Edge CDN                                  │
│  ● Preview deployments per branch            │
│  ● API proxy configurable via VITE_API_URL   │
└──────────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────┐
│                Neon (Database)                │
│  PostgreSQL 16                               │
│  ● conn_max_age=600, health_checks=True      │
│  ● Connection pooling via PgBouncer          │
└──────────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────┐
│            Cloudinary (Media)                 │
│  Image upload/resize/delivery                │
│  ● Fallback to local /media/ in dev          │
└──────────────────────────────────────────────┘
```

### Caching Strategy

| Layer | Type | TTL | Notes |
|-------|------|-----|-------|
| Homepage | LocMemCache (Django) | 15 min | Entire response cached |
| Categories | LocMemCache | 60 min | Rarely changes |
| Brands | LocMemCache | 60 min | Rarely changes |
| Product list | HTTP Cache-Control | 300s + 600s stale-while-revalidate | Anonymous only |
| Frontend assets | Vercel CDN | Permanent (content-hashed) | |

### Seed / Warmup Sequence

On each deploy (via `start.sh` / `render.yaml`):
1. `migrate —no-input`
2. `seed_all`
3. `restore_images`
4. `warmup_cache`

---

## 7. Security Considerations

### Current Implementation

| Measure | Status | Notes |
|---------|--------|-------|
| JWT auth | ✅ | 1 day access, 7 day refresh |
| Email OTP 2FA | ✅ | 6-digit, 5-min expiry |
| Google OAuth | ✅ | Token verified against Google API |
| CORS | ✅ | Whitelist of known origins |
| XSS filters | ✅ | `SECURE_BROWSER_XSS_FILTER = True` |
| Content-Type nosniff | ✅ | |
| X-Frame-Options | ✅ | `DENY` |
| Session/CSRF cookies | ✅ | `HttpOnly` |
| Sentry error tracking | ✅ | |
| Rate limiting | ✅ | 1000/day anonymous, 10000/day authenticated |

### Known Risks

| Risk | Location | Impact | Recommendation |
|------|----------|--------|----------------|
| `exec()` in production | `run-seed` view | Remote code execution | Remove or gate behind DEBUG |
| Seller code hardcoded | `settings.py` | Default `"mafia"` easily guessed | Change in production env |
| Secrets in settings | `settings.py` | Cloudinary secret, email password, Google client ID | Move to env-only, remove fallbacks |
| No SSL enforcement | Settings | No HSTS, no secure cookies | Add `SECURE_SSL_REDIRECT` + `SESSION_COOKIE_SECURE` |
| Debug endpoint exposed | `run-seed` | Data manipulation | Disable in production |
| No password complexity | Registration | Weak passwords allowed | Add `AUTH_PASSWORD_VALIDATORS` |

---

## 8. Monitoring & Pipeline

### Sentry Integration
- **Backend**: `sentry_sdk.init()` with `DjangoIntegration()`, 0.1 traces/profiles sample rate
- **Frontend**: `@sentry/react` with browser tracing, 0.1 session replays
- **Auto-fix pipeline**: Polls Sentry every 5 min, creates GitHub issue → AI fixes → creates PR → auto-merges

### GitHub Actions

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `opencode-autofix.yml` | Schedule (every 5 min) | Polls Sentry for unresolved issues, runs 3-tier AI fix, creates PR with auto-merge |
| `sentry-event-checker.yml` | Schedule (every 5 min) | Creates GitHub issues for new Sentry errors, auto-ignores infrastructure noise |

### Error Handling Philosophy
- Backend: Returns JSON with `error`/`detail` keys, appropriate HTTP status codes
- Frontend: Error boundary catches render errors, Sentry captures exceptions, toast notifications for user-facing errors
- Network errors: Retry logic in API client, timeout after 15s

---

## 9. Scaling Considerations

| Bottleneck | Current | Future Strategy |
|-----------|---------|-----------------|
| Database | Single Neon instance | Read replicas, connection pooling |
| Cache | LocMem (per-process) | Redis/Memcached for shared cache |
| Search | Django ORM `__icontains` | PostgreSQL full-text search → Elasticsearch |
| Image serving | Cloudinary | Already offloaded |
| Background tasks | None | Celery for email, notifications, order processing |
| File storage | Cloudinary | Already offloaded |
| API rate limiting | DRF throttling | Redis-backed rate limiting |
| Cold start | Render free tier | Upgrade to paid Render (always-on) |

---

## 10. Development Workflow

```bash
# Local setup
git clone https://github.com/BikramGole/KinaHub.git
cd KinaHub
cp backend/.env.example backend/.env    # Set DB, secrets, API keys
./start.sh                               # Starts Django (8000) + Vite (5173)

# Backend
cd backend
source venv/bin/activate
python manage.py runserver

# Frontend
cd frontend
npm run dev

# Deploy
git push main          # Auto-deploys: Vercel (frontend) + Render (backend)
```

### Environment Variables (.env)

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SECRET_KEY` | Yes | Django secret |
| `SENTRY_DSN` | Yes | Sentry error tracking |
| `SENTRY_AUTH_TOKEN` | Yes | Sentry API (for pipeline) |
| `OPENROUTER_API_KEY` | Yes | AI chat |
| `GOOGLE_API_KEY` | Yes | AI fallback |
| `OPENCODE_API_KEY` | Yes | Auto-fix pipeline |
| `GH_PAT` | Yes | GitHub API for pipeline |
| `CLOUDINARY_URL` | No | Media storage |
| `EMAIL_HOST_PASSWORD` | No | Email sending |
| `GOOGLE_OAUTH2_CLIENT_ID` | No | Google login |
| `SELLER_REGISTRATION_CODE` | Yes | Seller signup code |
| `FRONTEND_URL` | No | CORS allowed origin |

---

## 11. Directory Map

```
KinaHub/
├── backend/
│   ├── core/           # Django project (settings, urls, wsgi)
│   ├── users/          # Auth, profiles, addresses
│   ├── products/       # Products, categories, brands, reviews
│   ├── orders/         # Orders, payments, delivery calculation
│   ├── sellers/        # Seller profiles, stores
│   ├── crm/            # CRM: leads, tickets, activity log
│   ├── wishlist/       # User wishlists (model only)
│   ├── media/          # Local media (dev fallback)
│   ├── templates/      # Email templates
│   ├── manage.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/      # Route pages (15+)
│   │   ├── components/ # Reusable UI components
│   │   ├── context/    # Auth, Cart, Theme providers
│   │   ├── lib/        # API client, AI logic, helpers
│   │   ├── hooks/      # Custom hooks
│   │   └── i18n/       # Internationalization
│   ├── package.json
│   └── vite.config.ts
├── .github/workflows/  # CI/CD pipelines
├── render.yaml         # Render deployment config
└── AGENTS.md           # Project conventions
```

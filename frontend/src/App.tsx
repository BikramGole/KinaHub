import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import RootLayout from './layouts/RootLayout';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LocaleProvider } from './i18n/LocaleContext';
import ProtectedRoute from './components/ProtectedRoute';
import ScrollToTop from './components/ScrollToTop';
import CookieConsent from './components/CookieConsent';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'dummy-client-id';

const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Products = lazy(() => import('./pages/Products'));
const Cart = lazy(() => import('./pages/Cart'));
const ProductDetails = lazy(() => import('./pages/ProductDetails'));
const Checkout = lazy(() => import('./pages/Checkout'));
const DashboardLayout = lazy(() => import('./layouts/DashboardLayout'));
const DashboardHome = lazy(() => import('./pages/DashboardHome'));
const SellerDashboard = lazy(() => import('./pages/SellerDashboard'));
const SellerProducts = lazy(() => import('./pages/SellerProducts'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const CRMPage = lazy(() => import('./pages/CRMPage'));
const OrdersPage = lazy(() => import('./pages/OrdersPage'));
const AdminUsersPage = lazy(() => import('./pages/AdminUsersPage'));
const StoreDetails = lazy(() => import('./pages/StoreDetails'));
const AiShopping = lazy(() => import('./pages/AiShopping'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));

function RouteFallback() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-48 rounded bg-muted" />
        <div className="h-40 rounded-lg bg-muted" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="h-48 rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
    <LocaleProvider>
      <ThemeProvider>
      <AuthProvider>
        <CartProvider>
          <BrowserRouter>
            <ScrollToTop />
            <CookieConsent />
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/" element={<RootLayout />}>
                  <Route index element={<Home />} />
                  <Route path="login" element={<Login />} />
                  <Route path="register" element={<Register />} />
                  <Route path="products" element={<Products />} />
                  <Route path="product/:slug" element={<ProductDetails />} />
                  <Route path="store/:slug" element={<StoreDetails />} />
                  <Route path="ai" element={<AiShopping />} />
                  <Route path="cart" element={<Cart />} />
                  <Route path="checkout" element={<Checkout />} />
                  <Route path="privacy" element={<PrivacyPolicy />} />
                  <Route path="terms" element={<TermsOfService />} />
                </Route>

                <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
                  <Route path="/dashboard" element={<DashboardHome />} />
                  <Route path="/dashboard/orders" element={<OrdersPage mode="customer" />} />
                  <Route path="/dashboard/tickets" element={<CRMPage />} />
                </Route>

                <Route element={<ProtectedRoute roles={['seller', 'admin']}><DashboardLayout /></ProtectedRoute>}>
                  <Route path="/seller" element={<SellerDashboard />} />
                  <Route path="/seller/products" element={<SellerProducts />} />
                  <Route path="/seller/orders" element={<OrdersPage mode="seller" />} />
                  <Route path="/seller/customers" element={<CRMPage />} />
                </Route>

                <Route element={<ProtectedRoute roles={['admin']}><DashboardLayout /></ProtectedRoute>}>
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/admin/users" element={<AdminUsersPage />} />
                  <Route path="/admin/orders" element={<OrdersPage mode="admin" />} />
                  <Route path="/admin/crm" element={<CRMPage />} />
                  <Route path="/admin/settings" element={<AdminDashboard />} />
                </Route>
              </Routes>
            </Suspense>
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
    </LocaleProvider>
    </GoogleOAuthProvider>
  );
}

export default App;

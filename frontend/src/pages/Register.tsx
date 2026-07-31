import { useState, useRef } from 'react';
import type { FormEvent } from 'react';

import { Store, Mail, Lock, User, ArrowRight, Loader2, X, ShieldCheck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import GoogleAuthButton from '../components/GoogleAuthButton';
import { HAS_GOOGLE_OAUTH } from '../lib/googleAuth';
import { useTranslation } from '../i18n/LocaleContext';

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

export default function Register() {
  const navigate = useNavigate();
  const { register, verifyOTP, loginWithGoogle } = useAuth();
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'customer' | 'seller'>('customer');
  const [otpCode, setOtpCode] = useState('');
  const [userId, setUserId] = useState<number | null>(null);
  const [requires2FA, setRequires2FA] = useState(false);
  const [googleSellerModalOpen, setGoogleSellerModalOpen] = useState(false);
  const [googleSellerBusinessName, setGoogleSellerBusinessName] = useState('');
  const [googleSellerCode, setGoogleSellerCode] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const businessInfoRef = useRef({ businessName: '', sellerCode: '' });

  const sellerGoogleLogin = useGoogleLogin({
    flow: 'implicit',
    onSuccess: async (tokenResponse) => {
      const { businessName, sellerCode } = businessInfoRef.current;
      setIsSubmitting(true);
      setError('');
      try {
        await loginWithGoogle(tokenResponse.access_token, 'seller', businessName, sellerCode);
        navigate('/seller');
      } catch (err: any) {
        setError(err.message || 'Google sign-up failed');
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  async function handleGoogleSuccess(accessToken: string, businessName?: string, sellerCode?: string) {
    setIsSubmitting(true);
    setError('');
    try {
      const user = await loginWithGoogle(
        accessToken, 
        role, 
        businessName,
        sellerCode
      );
      navigate(user.effective_role === 'seller' ? '/seller' : '/dashboard');
    } catch (err: any) {
      setError(err.message || 'Google sign-up failed');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleGoogleClick(accessToken?: string) {
    if (role === 'seller') {
      setGoogleSellerModalOpen(true);
      return;
    }
    handleGoogleSuccess(accessToken || '');
  }

  function handleDemoClick() {
    if (role === 'seller') {
      setGoogleSellerModalOpen(true);
      return;
    }
    handleGoogleSuccess('__local_demo__');
  }

  async function confirmGoogleSellerBusiness() {
    const nextBusinessName = googleSellerBusinessName.trim();
    const nextSellerCode = googleSellerCode.trim();
    if (!nextBusinessName) {
      setError('Please enter your business name before continuing with Google.');
      return;
    }
    if (!nextSellerCode) {
      setError('Please enter your seller code before continuing with Google.');
      return;
    }

    setGoogleSellerModalOpen(false);
    businessInfoRef.current = { businessName: nextBusinessName, sellerCode: nextSellerCode };
    sellerGoogleLogin();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      if (requires2FA && userId) {
        const user = await verifyOTP(userId, otpCode);
        navigate(user.effective_role === 'seller' ? '/seller' : '/dashboard');
      } else {
        const result = await register({
          name,
          email,
          password,
          role,
        });
        if ('require_2fa' in result && result.require_2fa) {
          setRequires2FA(true);
          setUserId(result.user_id);
          return;
        }
        const user = result as any;
        navigate(user.effective_role === 'seller' ? '/seller' : '/dashboard');
      }
    } catch (err: any) {
      setError(err.message || t('auth.registerFailed', { defaultValue: 'Registration failed' }));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-start justify-center px-4 py-6 relative overflow-hidden bg-background sm:items-center sm:py-10">
      <div className="pointer-events-none absolute -top-40 -left-40 h-[480px] w-[480px] rounded-full bg-accent/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-[480px] w-[480px] rounded-full bg-orange-400/10 blur-3xl" />

      <div className="anim-fade-in-up relative z-10 w-full max-w-6xl grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,440px)] lg:gap-14 lg:items-stretch">
        {/* ── Left: full-bleed video rectangle ── */}
        <div className="hidden lg:block relative min-h-[600px] overflow-hidden rounded-2xl border border-border shadow-xl">
          <video
            src="/demo/KinaHub_Demo.mp4"
            className="absolute inset-0 h-full w-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            aria-label="KinaHub demo video"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/30" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent/20 via-transparent to-transparent" />

          <div className="relative flex h-full flex-col justify-between p-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex items-center justify-center rounded-xl bg-white/15 p-2 backdrop-blur-md">
                  <Store className="h-5 w-5 text-white" />
                </span>
                <span className="text-lg font-extrabold tracking-tight text-white">KinaHub</span>
              </div>
              <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
                </span>
                {t('auth.demoLive', { defaultValue: 'Live demo' })}
              </span>
            </div>

            <div>
              <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                {t('auth.demoTagline', { defaultValue: 'Buy local. Sell smart.' })}
              </h2>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-white/80">
                {t('auth.registerVideoCopy', { defaultValue: 'Groceries, electronics, and local stores — delivered to your door in minutes.' })}
              </p>
              <div className="mt-6 flex items-center gap-4">
                <div className="flex -space-x-2">
                  {['from-amber-400 to-orange-500', 'from-sky-400 to-blue-500', 'from-emerald-400 to-teal-500'].map((grad, i) => (
                    <span key={i} className={`inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-black/40 bg-gradient-to-br ${grad} text-[10px] font-bold text-white`}>
                      {['RS', 'SM', 'AP'][i]}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-white/85">
                  <ShieldCheck className="h-4 w-4 text-green-400" />
                  {t('auth.demoTrusted', { defaultValue: 'Trusted by 500+ Nepali shoppers' })}
                </div>
              </div>
              <div className="mt-6 grid max-w-md grid-cols-3 gap-3">
                {[
                  { value: '500+', label: t('auth.statShoppers', { defaultValue: 'Shoppers' }) },
                  { value: '50+', label: t('auth.statSellers', { defaultValue: 'Local stores' }) },
                  { value: '10k+', label: t('auth.statOrders', { defaultValue: 'Orders delivered' }) },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-center backdrop-blur-md">
                    <p className="text-lg font-bold tracking-tight text-white">{stat.value}</p>
                    <p className="mt-0.5 text-[10px] text-white/70">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Right: phone-style form card ── */}
        <div className="flex items-center justify-center py-2">
          <div className="w-full max-w-[400px] rounded-2xl border border-border bg-surface p-6 shadow-xl sm:p-8">
            <div className="text-center mb-8">
              <Link to="/" className="inline-flex items-center justify-center p-3 rounded-lg bg-accent text-background mb-6">
                <Store className="w-7 h-7" />
              </Link>
              <h1 className="text-2xl font-bold tracking-tight mb-2 sm:text-3xl">{t('auth.registerTitle', { defaultValue: 'Create account' })}</h1>
              <p className="text-secondary text-sm">{t('auth.registerCopy', { defaultValue: 'Save addresses and track orders.' })}</p>
            </div>

          <form className="space-y-5" onSubmit={submit}>
            {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            {!requires2FA ? (
              <>
                <div className="grid grid-cols-2 gap-2 rounded-lg bg-background p-1">
                  {(['customer', 'seller'] as const).map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setRole(item)}
                      className={`rounded-md px-3 py-2 text-sm font-semibold capitalize ${role === item ? 'bg-accent text-background' : 'text-secondary'}`}
                    >
                      {t(`auth.role${item === 'customer' ? 'Customer' : 'Seller'}`, { defaultValue: item })}
                    </button>
                  ))}
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-secondary uppercase tracking-wider pl-1">{t('auth.name', { defaultValue: 'Name' })}</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-secondary" />
                    </div>
                    <input 
                      type="text" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl pl-11 pr-4 py-3.5 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all duration-300 text-base"
                      placeholder={t('auth.namePlaceholder', { defaultValue: 'Ram Shah' })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-secondary uppercase tracking-wider pl-1">{t('auth.email', { defaultValue: 'Email' })}</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-secondary" />
                    </div>
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl pl-11 pr-4 py-3.5 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all duration-300 text-base"
                      placeholder={t('auth.emailPlaceholder', { defaultValue: 'ram.shah@example.com' })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-secondary uppercase tracking-wider pl-1">{t('auth.password', { defaultValue: 'Password' })}</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-secondary" />
                    </div>
                    <input 
                      type="password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl pl-11 pr-4 py-3.5 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all duration-300 text-base"
                      placeholder={t('auth.passwordPlaceholder', { defaultValue: '••••••••' })}
                      required
                    />
                  </div>
                </div>


              </>
            ) : (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-secondary uppercase tracking-wider pl-1">{t('auth.verificationCode', { defaultValue: 'Verification Code' })}</label>
                <p className="text-xs text-secondary mb-3 pl-1">A 6-digit code has been sent to {email}.</p>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-secondary" />
                  </div>
                  <input 
                    type="text" 
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\s+/g, ''))}
                    className="w-full bg-background border border-border rounded-xl pl-11 pr-4 py-3.5 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all duration-300 text-base tracking-[0.5em] font-mono"
                    placeholder="••••••"
                    maxLength={6}
                    required
                  />
                </div>
              </div>
            )}

            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full bg-primary text-background font-semibold py-4 rounded-xl hover:bg-gray-200 disabled:opacity-70 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 group mt-8 relative overflow-hidden"
            >
              <span className="relative z-10 flex items-center gap-2">
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                {requires2FA ? t('auth.verify', { defaultValue: 'Verify Code' }) : t('auth.signup', { defaultValue: 'Create account' })} 
                {!isSubmitting && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
              </span>
            </button>
          </form>

          {!requires2FA && (
            <>
              <div className="flex items-center gap-4 mt-8">
                <div className="flex-1 h-px bg-border"></div>
                <span className="text-xs text-secondary uppercase tracking-wider">or</span>
                <div className="flex-1 h-px bg-border"></div>
              </div>

              {role === 'seller' && HAS_GOOGLE_OAUTH ? (
                <button
                  type="button"
                  onClick={() => setGoogleSellerModalOpen(true)}
                  disabled={isSubmitting}
                  className="w-full mt-4 flex items-center justify-center gap-3 bg-background border border-border rounded-xl py-3.5 hover:bg-card transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  <GoogleIcon />
                  <span className="font-medium text-secondary">Continue with Google</span>
                </button>
              ) : (
                <GoogleAuthButton
                  label="Continue with Google"
                  demoLabel="Continue with demo account"
                  disabled={isSubmitting}
                  onGoogleToken={handleGoogleClick}
                  onDemoClick={handleDemoClick}
                  className="w-full mt-4 flex items-center justify-center gap-3 bg-background border border-border rounded-xl py-3.5 hover:bg-card transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                />
              )}
            </>
          )}

          <div className="mt-8 text-center">
            <p className="text-sm text-secondary">
              {t('auth.haveAccount', { defaultValue: 'Already have an account?' })} <Link to="/login" className="text-accent hover:underline ml-1">{t('auth.switchToLogin', { defaultValue: 'Login' })}</Link>
            </p>
          </div>
          </div>
        </div>
      </div>

      {googleSellerModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="seller-google-title"
        >
          <div className="anim-scale-in w-full max-w-md rounded-lg border border-border bg-surface p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="seller-google-title" className="text-lg font-bold">
                  {t('auth.businessName', { defaultValue: 'Business name' })}
                </h2>
                <p className="mt-1 text-sm text-secondary">
                  Enter your store name before continuing with Google sign-up.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setGoogleSellerModalOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-secondary hover:text-primary"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-secondary pl-1">
                  {t('auth.businessName', { defaultValue: 'Business name' })}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Store className="h-5 w-5 text-secondary" />
                  </div>
                  <input
                    type="text"
                    value={googleSellerBusinessName}
                    onChange={(e) => setGoogleSellerBusinessName(e.target.value)}
                    placeholder={t('auth.businessNamePlaceholder', { defaultValue: 'Your Store Pvt. Ltd.' })}
                    className="w-full rounded-xl border border-border bg-background py-3.5 pl-11 pr-4 text-base focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                    autoFocus
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-secondary pl-1">
                  {t('auth.sellerCode', { defaultValue: 'Seller code' })}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-secondary" />
                  </div>
                  <input
                    type="password"
                    value={googleSellerCode}
                    onChange={(e) => setGoogleSellerCode(e.target.value)}
                    placeholder={t('auth.sellerCodePlaceholder', { defaultValue: 'Enter invitation code' })}
                    className="w-full rounded-xl border border-border bg-background py-3.5 pl-11 pr-4 text-base focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setGoogleSellerModalOpen(false)}
                className="rounded-xl border border-border px-4 py-3 text-sm font-semibold text-secondary hover:text-primary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmGoogleSellerBusiness()}
                className="rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-background hover:bg-orange-600"
              >
                Continue with Google
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

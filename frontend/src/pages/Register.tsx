import { useState } from 'react';
import type { FormEvent } from 'react';
import { motion } from 'framer-motion';
import { Store, Mail, Lock, User, ArrowRight, Loader2, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import GoogleAuthButton from '../components/GoogleAuthButton';
import { useTranslation } from '../i18n/LocaleContext';

export default function Register() {
  const navigate = useNavigate();
  const { register, verifyOTP, loginWithGoogle } = useAuth();
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'customer' | 'seller'>('customer');
  const [businessName, setBusinessName] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [userId, setUserId] = useState<number | null>(null);
  const [requires2FA, setRequires2FA] = useState(false);
  const [googleSellerModalOpen, setGoogleSellerModalOpen] = useState(false);
  const [googleSellerBusinessName, setGoogleSellerBusinessName] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleGoogleSuccess(accessToken: string) {
    setIsSubmitting(true);
    setError('');
    try {
      const user = await loginWithGoogle(accessToken, role, role === 'seller' ? businessName : undefined);
      navigate(user.effective_role === 'seller' ? '/seller' : '/dashboard');
    } catch (err: any) {
      setError(err.message || 'Google sign-up failed');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDemoGoogleClick() {
    if (role === 'seller') {
      setGoogleSellerBusinessName(businessName.trim());
      setGoogleSellerModalOpen(true);
      return;
    }
    await handleGoogleSuccess('__local_demo__');
  }

  async function confirmGoogleSellerBusiness() {
    const nextBusinessName = googleSellerBusinessName.trim();
    if (!nextBusinessName) {
      setError('Please enter your business name before continuing with Google.');
      return;
    }

    setGoogleSellerModalOpen(false);
    setBusinessName(nextBusinessName);
    await handleGoogleSuccess('__local_demo__');
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
          business_name: role === 'seller' ? businessName : undefined,
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
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md p-6 bg-surface border border-border rounded-lg shadow-xl sm:p-8"
      >
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

              {role === 'seller' && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-secondary uppercase tracking-wider pl-1">{t('auth.businessName', { defaultValue: 'Business name' })}</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Store className="h-5 w-5 text-secondary" />
                    </div>
                    <input
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl pl-11 pr-4 py-3.5 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all duration-300 text-base"
                      placeholder={t('auth.businessNamePlaceholder', { defaultValue: 'Your Store Pvt. Ltd.' })}
                      required
                    />
                  </div>
                </div>
              )}
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

            <GoogleAuthButton
              label="Continue with Google"
              demoLabel="Continue with demo account"
              disabled={isSubmitting}
              onGoogleToken={handleGoogleSuccess}
              onDemoClick={handleDemoGoogleClick}
              className="w-full mt-4 flex items-center justify-center gap-3 bg-background border border-border rounded-xl py-3.5 hover:bg-card transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            />
          </>
        )}

        <div className="mt-8 text-center">
          <p className="text-sm text-secondary">
            {t('auth.haveAccount', { defaultValue: 'Already have an account?' })} <Link to="/login" className="text-accent hover:underline ml-1">{t('auth.switchToLogin', { defaultValue: 'Login' })}</Link>
          </p>
        </div>
      </motion.div>

      {googleSellerModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="seller-google-title"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-md rounded-lg border border-border bg-surface p-5 shadow-2xl"
          >
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

            <div className="mt-5 space-y-2">
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
          </motion.div>
        </div>
      )}
    </div>
  );
}

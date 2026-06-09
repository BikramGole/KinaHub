import { useState } from 'react';
import type { FormEvent } from 'react';
import { motion } from 'framer-motion';
import { Store, Mail, Lock, User, ArrowRight, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
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
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const googleLoginTrigger = useGoogleLogin({
    flow: 'implicit',
    onSuccess: async (tokenResponse) => {
      setIsSubmitting(true);
      setError('');
      try {
        const user = await loginWithGoogle(tokenResponse.access_token, role, role === 'seller' ? businessName : undefined);
        navigate(user.effective_role === 'seller' ? '/seller' : '/dashboard');
      } catch (err: any) {
        setError(err.message || 'Google sign-up failed');
      } finally {
        setIsSubmitting(false);
      }
    },
    onError: () => setError('Google sign-up was cancelled'),
  });

  function handleGoogleClick() {
    if (role === 'seller' && !businessName.trim()) {
      setError('Please enter your business name before continuing with Google.');
      return;
    }
    setError('');
    googleLoginTrigger();
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

            <button
              type="button"
              onClick={handleGoogleClick}
              disabled={isSubmitting}
              className="w-full mt-4 flex items-center justify-center gap-3 bg-background border border-border rounded-xl py-3.5 hover:bg-card transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <svg width="20" height="20" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              <span className="font-medium text-secondary">Continue with Google</span>
            </button>
          </>
        )}

        <div className="mt-8 text-center">
          <p className="text-sm text-secondary">
            {t('auth.haveAccount', { defaultValue: 'Already have an account?' })} <Link to="/login" className="text-accent hover:underline ml-1">{t('auth.switchToLogin', { defaultValue: 'Login' })}</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

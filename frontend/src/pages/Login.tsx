import { useState } from 'react';
import type { FormEvent } from 'react';
import { motion } from 'framer-motion';
import { Store, Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import GoogleAuthButton from '../components/GoogleAuthButton';
import { useTranslation } from '../i18n/LocaleContext';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginWithGoogle, verifyOTP } = useAuth();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [userId, setUserId] = useState<number | null>(null);
  const [requires2FA, setRequires2FA] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState<'request' | 'verify'>('request');
  const [resetEmail, setResetEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [forgotMessage, setForgotMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleGoogleSuccess(accessToken: string) {
    setIsSubmitting(true);
    setError('');
    try {
      const user = await loginWithGoogle(accessToken);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from || (user.effective_role === 'seller' ? '/seller' : user.effective_role === 'admin' ? '/admin' : '/dashboard'));
    } catch (err: any) {
      setError(err.message || 'Google login failed');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDemoGoogleLogin() {
    await handleGoogleSuccess('__local_demo__');
  }

  async function requestReset() {
    setIsSubmitting(true);
    setError('');
    setForgotMessage('');
    try {
      await fetchResetEmail(resetEmail.trim());
      setForgotStep('verify');
      setForgotMessage('Reset code sent. Check your email.');
    } catch (err: any) {
      setError(err.message || 'Password reset request failed');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function confirmReset() {
    setIsSubmitting(true);
    setError('');
    try {
      await confirmResetPassword(resetEmail.trim(), resetOtp.trim(), resetPassword);
      setForgotMessage('Password changed. You can log in now.');
      setForgotOpen(false);
      setForgotStep('request');
      setResetOtp('');
      setResetPassword('');
    } catch (err: any) {
      setError(err.message || 'Password reset failed');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function fetchResetEmail(email: string) {
    await fetch('/api/auth/password-reset/request/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    }).then(async (response) => {
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Password reset request failed');
      }
    });
  }

  async function confirmResetPassword(email: string, otp_code: string, new_password: string) {
    await fetch('/api/auth/password-reset/confirm/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp_code, new_password }),
    }).then(async (response) => {
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Password reset failed');
      }
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      if (requires2FA && userId) {
        const user = await verifyOTP(userId, otpCode);
        const from = (location.state as { from?: string } | null)?.from;
        navigate(from || (user.effective_role === 'seller' ? '/seller' : user.effective_role === 'admin' ? '/admin' : '/dashboard'));
      } else {
        const result = await login(email, password);
        if ('require_2fa' in result && result.require_2fa) {
          setRequires2FA(true);
          setUserId(result.user_id);
          return;
        }
        const user = result as any;
        const from = (location.state as { from?: string } | null)?.from;
        navigate(from || (user.effective_role === 'seller' ? '/seller' : user.effective_role === 'admin' ? '/admin' : '/dashboard'));
      }
    } catch (err: any) {
      setError(err.message || t('auth.loginFailed', { defaultValue: 'Login failed' }));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-start justify-center px-4 py-6 relative overflow-hidden bg-background sm:items-center sm:py-10">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md p-6 bg-surface border border-border rounded-lg shadow-xl sm:p-8"
      >
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center justify-center p-3 rounded-lg bg-accent text-background mb-6">
             <Store className="w-7 h-7" />
          </Link>
          <h1 className="text-2xl font-bold tracking-tight mb-2 sm:text-3xl">{t('auth.loginTitle', { defaultValue: 'Login' })}</h1>
          <p className="text-secondary text-sm">{t('auth.loginCopy', { defaultValue: 'Track orders and manage your account.' })}</p>
        </div>

        <form className="space-y-5" onSubmit={submit}>
          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          {!requires2FA ? (
            <>
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
                    placeholder={t('auth.emailPlaceholder', { defaultValue: 'you@example.com' })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center pl-1 pr-1">
                  <label className="text-xs font-semibold text-secondary uppercase tracking-wider">{t('auth.password', { defaultValue: 'Password' })}</label>
                  <button type="button" onClick={() => setForgotOpen(true)} className="text-xs text-accent hover:underline">{t('auth.resetPassword', { defaultValue: 'Forgot password?' })}</button>
                </div>
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
              <button 
                type="button"
                onClick={() => { setRequires2FA(false); setOtpCode(''); }}
                className="text-xs text-accent hover:underline mt-2 inline-block pl-1"
              >
                Go back to login
              </button>
            </div>
          )}

          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full bg-primary text-background font-semibold py-4 rounded-xl hover:bg-gray-200 disabled:opacity-70 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 group mt-8 relative overflow-hidden"
          >
            <span className="relative z-10 flex items-center gap-2">
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              {requires2FA ? t('auth.verify', { defaultValue: 'Verify Code' }) : t('auth.signin', { defaultValue: 'Sign in' })} 
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
              onDemoClick={handleDemoGoogleLogin}
              className="w-full mt-4 flex items-center justify-center gap-3 bg-background border border-border rounded-xl py-3.5 hover:bg-card transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            />
          </>
        )}

        <div className="mt-8 text-center">
          <p className="text-sm text-secondary">
            {t('auth.noAccount', { defaultValue: 'New here?' })} <Link to="/register" className="text-accent hover:underline ml-1">{t('auth.switchToRegister', { defaultValue: 'Create account' })}</Link>
          </p>
        </div>

        {forgotOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="w-full max-w-md rounded-lg border border-border bg-surface p-5 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold">Reset password</h2>
                  <p className="mt-1 text-sm text-secondary">We’ll email a reset code to your account.</p>
                </div>
                <button type="button" onClick={() => setForgotOpen(false)} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-secondary hover:text-primary" aria-label="Close">×</button>
              </div>

              <div className="mt-5 space-y-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold">Email</span>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-accent"
                    placeholder="you@example.com"
                  />
                </label>

                {forgotStep === 'verify' && (
                  <>
                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold">Reset OTP</span>
                      <input
                        type="text"
                        value={resetOtp}
                        onChange={(e) => setResetOtp(e.target.value.replace(/\s+/g, ''))}
                        className="w-full rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-accent"
                        placeholder="123456"
                        maxLength={6}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold">New password</span>
                      <input
                        type="password"
                        value={resetPassword}
                        onChange={(e) => setResetPassword(e.target.value)}
                        className="w-full rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-accent"
                        placeholder="••••••••"
                      />
                    </label>
                  </>
                )}

                {forgotMessage && <p className="text-sm text-secondary">{forgotMessage}</p>}
                {error && <p className="text-sm text-red-600">{error}</p>}
              </div>

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setForgotOpen(false)} className="rounded-xl border border-border px-4 py-3 text-sm font-semibold text-secondary hover:text-primary">Cancel</button>
                {forgotStep === 'request' ? (
                  <button type="button" onClick={() => void requestReset()} className="rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-background hover:bg-orange-600" disabled={isSubmitting}>Send code</button>
                ) : (
                  <button type="button" onClick={() => void confirmReset()} className="rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-background hover:bg-orange-600" disabled={isSubmitting}>Reset password</button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

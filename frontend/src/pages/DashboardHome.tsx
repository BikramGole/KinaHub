import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../i18n/LocaleContext';
import { AlertTriangle, Lock, Loader2, X } from 'lucide-react';
import type { Role } from '../context/AuthContext';

export default function DashboardHome() {
  const { user } = useAuth();

  if (user?.effective_role === 'seller') return <Navigate to="/seller" replace />;
  if (user?.effective_role === 'admin') return <Navigate to="/admin" replace />;
  return <CustomerDashboard />;
}

function CustomerDashboard() {
  const { user, requestDeleteAccount, confirmDeleteAccount } = useAuth();
  const { t } = useTranslation();
  const roleKey = ((user?.effective_role || 'customer').charAt(0).toUpperCase() + (user?.effective_role || 'customer').slice(1)) as Capitalize<Role>;

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteStep, setDeleteStep] = useState<'confirm' | 'otp'>('confirm');
  const [otpCode, setOtpCode] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  async function handleRequestOTP() {
    setDeleteError('');
    setDeleteLoading(true);
    try {
      await requestDeleteAccount();
      setDeleteStep('otp');
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to send verification code.');
    } finally {
      setDeleteLoading(false);
    }
  }

  async function handleConfirmDelete() {
    if (!otpCode.trim()) {
      setDeleteError('Please enter the verification code.');
      return;
    }
    setDeleteError('');
    setDeleteLoading(true);
    try {
      await confirmDeleteAccount(otpCode.trim());
      // User is logged out automatically after this
    } catch (err: any) {
      setDeleteError(err.message || 'Invalid or expired verification code.');
      setDeleteLoading(false);
    }
  }

  function closeDeleteModal() {
    setShowDeleteModal(false);
    setDeleteStep('confirm');
    setOtpCode('');
    setDeleteError('');
    setDeleteLoading(false);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-border bg-surface p-4 sm:p-6">
        <h1 className="text-2xl font-black tracking-tight">{t('dashboard.customerAccount', { defaultValue: 'Customer account' })}</h1>
        <p className="mt-2 text-secondary">{t('dashboard.customerDescription', { defaultValue: 'Profile, orders, saved addresses, wishlist, and support live here.' })}</p>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-border bg-surface p-4 sm:p-5">
          <p className="text-sm text-secondary">{t('dashboard.email', { defaultValue: 'Email' })}</p>
          <p className="mt-2 font-bold">{user?.email}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4 sm:p-5">
          <p className="text-sm text-secondary">{t('dashboard.role', { defaultValue: 'Role' })}</p>
          <p className="mt-2 font-bold capitalize">{t(`dashboard.role${roleKey}`, { defaultValue: user?.effective_role || 'customer' })}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4 sm:p-5">
          <p className="text-sm text-secondary">{t('dashboard.orders', { defaultValue: 'Orders' })}</p>
          <p className="mt-2 font-bold">{t('dashboard.ordersConnected', { defaultValue: 'Orders sync automatically.' })}</p>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 sm:p-6 mt-8">
        <h2 className="text-lg font-bold text-red-600 mb-2">Danger Zone</h2>
        <p className="text-sm text-secondary mb-4">Once you delete your account, there is no going back. All data, orders, and reviews will be permanently removed.</p>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
        >
          Delete Account
        </button>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={closeDeleteModal}>
          <div
            className="relative w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeDeleteModal}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-secondary hover:bg-muted hover:text-primary transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            {deleteStep === 'confirm' ? (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600">
                    <AlertTriangle className="h-5 w-5" />
                  </span>
                  <h3 className="text-xl font-bold text-primary">Delete Account</h3>
                </div>
                <p className="text-sm text-secondary leading-relaxed mb-2">
                  You are about to permanently delete your account <strong className="text-primary">{user?.email}</strong>.
                </p>
                <p className="text-sm text-secondary leading-relaxed mb-6">
                  A 6-digit verification code will be sent to your email to confirm this action. This cannot be undone.
                </p>

                {deleteError && (
                  <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{deleteError}</p>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={closeDeleteModal}
                    className="flex-1 rounded-lg border border-border bg-background py-2.5 text-sm font-semibold text-primary hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRequestOTP}
                    disabled={deleteLoading}
                    className="flex-1 rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {deleteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Send Code
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600">
                    <Lock className="h-5 w-5" />
                  </span>
                  <h3 className="text-xl font-bold text-primary">Enter Verification Code</h3>
                </div>
                <p className="text-sm text-secondary leading-relaxed mb-6">
                  A 6-digit code has been sent to <strong className="text-primary">{user?.email}</strong>. Enter it below to permanently delete your account.
                </p>

                {deleteError && (
                  <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{deleteError}</p>
                )}

                <input
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••••"
                  className="mb-6 w-full rounded-xl border border-border bg-background px-4 py-3.5 text-center text-2xl font-mono tracking-[0.5em] outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                  autoFocus
                />

                <div className="flex gap-3">
                  <button
                    onClick={() => { setDeleteStep('confirm'); setOtpCode(''); setDeleteError(''); }}
                    className="flex-1 rounded-lg border border-border bg-background py-2.5 text-sm font-semibold text-primary hover:bg-muted transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleConfirmDelete}
                    disabled={deleteLoading || otpCode.length < 6}
                    className="flex-1 rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {deleteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Delete Permanently
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

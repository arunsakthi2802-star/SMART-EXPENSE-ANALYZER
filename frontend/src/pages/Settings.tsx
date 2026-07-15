import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import {
  Settings as SettingsIcon,
  ShieldAlert,
  Database,
  Lock,
  CheckCircle,
  AlertCircle,
  Mail
} from 'lucide-react';

export const Settings: React.FC = () => {
  const { toggleTheme, theme } = useTheme();
  const { user, logout, refreshUser } = useAuth();
  
  // Settings preferences
  const [currency, setCurrency] = useState('USD');
  const [language, setLanguage] = useState('en');
  const [emailNotif, setEmailNotif] = useState(true);
  const [budgetAlerts, setBudgetAlerts] = useState(true);
  const [weeklySum, setWeeklySum] = useState(true);

  // Change password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const handleVerifyEmail = async () => {
    setFeedback(null);
    setVerifying(true);
    try {
      await api.post('/auth/verify-email');
      setFeedback('Email verified successfully!');
      setIsSuccess(true);
      await refreshUser();
    } catch (err: any) {
      setFeedback(err.response?.data?.detail || 'Failed to verify email');
      setIsSuccess(false);
    } finally {
      setVerifying(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await api.get('/settings');
      const s = response.data;
      setCurrency(s.currency);
      setLanguage(s.language);
      setEmailNotif(s.email_notifications);
      setBudgetAlerts(s.budget_alerts);
      setWeeklySum(s.weekly_summaries);
      if (s.currency) {
        localStorage.setItem('user_currency', s.currency);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSavePreferences = async () => {
    setFeedback(null);
    try {
      await api.put('/settings', {
        currency,
        language,
        email_notifications: emailNotif,
        budget_alerts: budgetAlerts,
        weekly_summaries: weeklySum,
      });
      localStorage.setItem('user_currency', currency);
      setFeedback('Preferences saved successfully!');
      setIsSuccess(true);
      // Reload UI to apply new currency symbol globally
      window.location.reload();
    } catch (err) {
      setFeedback('Failed to save settings');
      setIsSuccess(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (newPassword !== confirmPassword) {
      setFeedback('Passwords do not match');
      setIsSuccess(false);
      return;
    }

    try {
      await api.post('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setFeedback('Password updated successfully!');
      setIsSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setFeedback(err.response?.data?.detail || 'Failed to update password');
      setIsSuccess(false);
    }
  };

  const handleBackupExport = () => {
    api.get('/settings/backup', { responseType: 'blob' }).then((response) => {
      const fileUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = fileUrl;
      link.setAttribute('download', 'smart_expense_backup.json');
      document.body.appendChild(link);
      link.click();
      link.remove();
    });
  };

  const handleRestoreImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm('WARNING: Restoring will overwrite all current transactions and budgets. Proceed?')) return;

    setRestoring(true);
    setFeedback(null);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post('/settings/restore', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setFeedback(response.data.message || 'Data restored successfully!');
      setIsSuccess(true);
    } catch (err: any) {
      setFeedback(err.response?.data?.detail || 'Restore failed');
      setIsSuccess(false);
    } finally {
      setRestoring(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('CRITICAL WARNING: This will permanently delete your account profile and purge your transactions data. Are you sure?')) return;
    try {
      await api.delete('/settings/account');
      logout();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">
          Preferences & Settings
        </h2>
        <p className="text-xs text-slate-450 dark:text-slate-400 mt-0.5">
          Configure currency displays, download database backups, and manage credential tokens.
        </p>
      </div>

      {feedback && (
        <div className={`flex items-center gap-2 rounded-xl p-3.5 text-xs font-semibold ${
          isSuccess ? 'bg-emerald-50 text-emerald-650 dark:bg-emerald-950/20 dark:text-emerald-450' : 'bg-red-50 text-red-500 dark:bg-red-950/20'
        }`}>
          {isSuccess ? <CheckCircle className="h-4.5 w-4.5" /> : <AlertCircle className="h-4.5 w-4.5" />}
          <span>{feedback}</span>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        
        {/* Preference Settings */}
        <div className="glass-panel rounded-3xl p-6 shadow-lg space-y-4">
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <SettingsIcon className="h-5 w-5 text-brand-500" />
            <span>General Customization</span>
          </h3>

          {/* Theme */}
          <div>
            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
              Theme Select
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => theme === 'light' && toggleTheme()}
                className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all ${
                  theme === 'dark'
                    ? 'bg-brand-500 text-white shadow'
                    : 'bg-slate-100 text-slate-500 hover:text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                Dark Mode
              </button>
              <button
                onClick={() => theme === 'dark' && toggleTheme()}
                className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all ${
                  theme === 'light'
                    ? 'bg-brand-500 text-white shadow'
                    : 'bg-slate-100 text-slate-500 hover:text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                Light Mode
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Currency select */}
            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                Primary Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white text-slate-800 px-3.5 py-2.5 text-xs dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 focus:border-brand-500 outline-none"
              >
                <option value="USD" className="bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-100">USD ($)</option>
                <option value="EUR" className="bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-100">EUR (€)</option>
                <option value="INR" className="bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-100">INR (₹)</option>
                <option value="GBP" className="bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-100">GBP (£)</option>
              </select>
            </div>

            {/* Language */}
            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                Preferred Language
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white text-slate-800 px-3.5 py-2.5 text-xs dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 focus:border-brand-500 outline-none"
              >
                <option value="en" className="bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-100">English</option>
                <option value="es" className="bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-100">Español</option>
                <option value="fr" className="bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-100">Français</option>
              </select>
            </div>
          </div>

          {/* Checklist Toggles */}
          <div className="space-y-3 pt-2">
            <label className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={emailNotif}
                onChange={(e) => setEmailNotif(e.target.checked)}
                className="rounded border-slate-300 text-brand-500"
              />
              <span>Send weekly email budget statement summaries</span>
            </label>
            <label className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={budgetAlerts}
                onChange={(e) => setBudgetAlerts(e.target.checked)}
                className="rounded border-slate-300 text-brand-500"
              />
              <span>Trigger dashboard notifications on overspending thresholds</span>
            </label>
          </div>

          <button
            onClick={handleSavePreferences}
            className="w-full rounded-xl bg-brand-500 py-2.5 text-xs font-bold text-white shadow-md shadow-brand-500/10 hover:bg-brand-600 transition-colors"
          >
            Save Preferences
          </button>
        </div>

        {/* Change password */}
        <div className="glass-panel rounded-3xl p-6 shadow-lg">
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-4">
            <Lock className="h-5 w-5 text-brand-500" />
            <span>Update Account Credentials</span>
          </h3>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                Current Password
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-transparent px-3.5 py-2 text-xs dark:border-slate-800 focus:border-brand-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                New Password
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-transparent px-3.5 py-2 text-xs dark:border-slate-800 focus:border-brand-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                Confirm Password
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-transparent px-3.5 py-2 text-xs dark:border-slate-800 focus:border-brand-500 outline-none"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-xl bg-slate-800 py-2.5 text-xs font-bold text-white dark:bg-slate-700 hover:bg-slate-900 transition-colors"
            >
              Update Password
            </button>
          </form>
        </div>

        {/* Email Verification Panel */}
        <div className="glass-panel rounded-3xl p-6 shadow-lg space-y-4">
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Mail className="h-5 w-5 text-brand-500" />
            <span>Email Verification</span>
          </h3>
          <p className="text-xs text-slate-550 dark:text-slate-450 leading-relaxed">
            Registered Email: <strong className="text-slate-700 dark:text-slate-200">{user?.email}</strong>
          </p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Status:</span>
            {user?.is_verified ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400">
                <CheckCircle className="h-3.5 w-3.5" /> Verified
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-600 dark:bg-amber-950/30 dark:text-amber-400">
                <AlertCircle className="h-3.5 w-3.5" /> Unverified
              </span>
            )}
          </div>
          {!user?.is_verified && (
            <button
              onClick={handleVerifyEmail}
              disabled={verifying}
              className="w-full rounded-xl bg-brand-500 py-2.5 text-xs font-bold text-white shadow-md shadow-brand-500/10 hover:bg-brand-600 disabled:opacity-50 transition-colors"
            >
              {verifying ? 'Verifying...' : 'Verify Email Address'}
            </button>
          )}
        </div>

        {/* Database & backup settings */}
        <div className="glass-panel rounded-3xl p-6 shadow-lg space-y-4">
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Database className="h-5 w-5 text-emerald-500" />
            <span>Database Backup & Restores</span>
          </h3>
          <p className="text-xs text-slate-550 dark:text-slate-400 leading-relaxed">
            Download your entire financial history including category limits and savings milestones as a single encrypted JSON backup file. Import it back to restore details.
          </p>
          
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              onClick={handleBackupExport}
              className="flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-850 dark:bg-transparent dark:text-slate-350 dark:hover:bg-slate-850 transition-colors"
            >
              <span>Download Backup</span>
            </button>

            <input
              type="file"
              id="json-restore-file"
              accept=".json"
              onChange={handleRestoreImport}
              className="hidden"
            />
            <label
              htmlFor="json-restore-file"
              className="flex cursor-pointer items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-850 dark:bg-transparent dark:text-slate-350 dark:hover:bg-slate-850 transition-colors"
            >
              <span>{restoring ? 'Restoring...' : 'Restore JSON'}</span>
            </label>
          </div>
        </div>

        {/* Account Deletion Panel */}
        <div className="glass-panel rounded-3xl p-6 shadow-lg border-red-100 dark:border-red-950/20 bg-red-50/10 dark:bg-red-950/5 space-y-4">
          <h3 className="text-base font-bold text-red-500 flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-red-500" />
            <span>Danger Zone</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Deleting your account profile is permanent. All transactions history, budget entries, categories and uploaded receipts links will be purged.
          </p>
          <button
            onClick={handleDeleteAccount}
            className="w-full rounded-xl bg-red-500 py-2.5 text-xs font-bold text-white hover:bg-red-600 transition-colors"
          >
            Permanently Delete Account
          </button>
        </div>

      </div>

    </div>
  );
};

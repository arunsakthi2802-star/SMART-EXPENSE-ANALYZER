import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { User, Mail, Lock, Sparkles, ShieldCheck } from 'lucide-react';

export const Register: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'user' | 'business'>('user');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }
    if (!/[A-Z]/.test(password)) {
      setError('Password must contain at least one uppercase letter');
      return;
    }
    if (!/[a-z]/.test(password)) {
      setError('Password must contain at least one lowercase letter');
      return;
    }
    if (!/\d/.test(password)) {
      setError('Password must contain at least one number');
      return;
    }

    setLoading(true);

    try {
      await register(name, email, password, role);
      navigate('/');
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      if (typeof detail === 'string') {
        setError(detail);
      } else if (Array.isArray(detail)) {
        const messages = detail.map((d: any) => d.msg).join(', ');
        setError(messages);
      } else {
        setError('Failed to create account. Email might be in use.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-brand-950/20 font-sans transition-colors duration-300">
      
      {/* Background blurs */}
      <div className="absolute top-1/4 left-1/4 h-72 w-72 rounded-full bg-brand-500/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 h-72 w-72 rounded-full bg-emerald-500/10 blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md rounded-3xl border border-slate-200/50 bg-white/75 p-8 shadow-2xl dark:border-slate-800/40 dark:bg-slate-900/60 backdrop-blur-xl animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex flex-col items-center mb-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand-600 to-brand-400 text-white shadow-lg shadow-brand-500/20 mb-3">
            <Sparkles className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-800 dark:text-white uppercase tracking-wider">
            Create Account
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Get started with AI-driven budget automation
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 dark:bg-red-950/20 p-3 text-center text-xs font-semibold text-red-500">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* User Account Tier selector */}
          <div>
            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
              Account Category
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setRole('user')}
                className={`flex-1 rounded-xl border py-2.5 text-xs font-bold transition-all ${
                  role === 'user'
                    ? 'border-brand-500 bg-brand-50/50 text-brand-600 dark:bg-brand-950/20 dark:text-brand-400'
                    : 'border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-700'
                }`}
              >
                Individual
              </button>
              <button
                type="button"
                onClick={() => setRole('business')}
                className={`flex-1 rounded-xl border py-2.5 text-xs font-bold transition-all ${
                  role === 'business'
                    ? 'border-brand-500 bg-brand-50/50 text-brand-600 dark:bg-brand-950/20 dark:text-brand-400'
                    : 'border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-700'
                }`}
              >
                Business
              </button>
            </div>
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
              Full Name
            </label>
            <div className="relative">
              <input
                type="text"
                required
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-transparent py-2.5 pl-10 pr-4 text-sm dark:border-slate-800 focus:border-brand-500 outline-none"
              />
              <User className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                required
                placeholder="john@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-transparent py-2.5 pl-10 pr-4 text-sm dark:border-slate-800 focus:border-brand-500 outline-none"
              />
              <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type="password"
                required
                placeholder="Min 8 chars, 1 uppercase, 1 number"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-transparent py-2.5 pl-10 pr-4 text-sm dark:border-slate-800 focus:border-brand-500 outline-none"
              />
              <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
            </div>
            {/* Password strength hints */}
            {password.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                {[
                  { label: '8+ chars', ok: password.length >= 8 },
                  { label: 'Uppercase', ok: /[A-Z]/.test(password) },
                  { label: 'Lowercase', ok: /[a-z]/.test(password) },
                  { label: 'Number', ok: /\d/.test(password) },
                ].map(({ label, ok }) => (
                  <span key={label} className={`text-[10px] font-semibold ${ ok ? 'text-emerald-500' : 'text-slate-400 dark:text-slate-600' }`}>
                    {ok ? '✓' : '○'} {label}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type="password"
                required
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-transparent py-2.5 pl-10 pr-4 text-sm dark:border-slate-800 focus:border-brand-500 outline-none"
              />
              <ShieldCheck className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
            </div>
          </div>

          {/* Action Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-brand-500 py-3 text-xs font-bold text-white shadow-md shadow-brand-500/10 hover:bg-brand-600 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>

        </form>

        <p className="mt-6 text-center text-xs text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="font-bold text-brand-500 hover:underline">
            Login here
          </Link>
        </p>
      </div>
    </div>
  );
};

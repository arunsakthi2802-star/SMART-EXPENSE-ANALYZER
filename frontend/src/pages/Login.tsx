import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Lock, Eye, EyeOff, Sparkles } from 'lucide-react';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
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

    setLoading(true);

    try {
      await login(email, password);
      if (rememberMe) {
        localStorage.setItem('remembered_email', email);
      } else {
        localStorage.removeItem('remembered_email');
      }
      navigate('/');
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      if (typeof detail === 'string') {
        setError(detail);
      } else if (Array.isArray(detail)) {
        const messages = detail.map((d: any) => d.msg).join(', ');
        setError(messages);
      } else {
        setError('Invalid email or password');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    // Simulated Google Login for UI flow
    setLoading(true);
    setTimeout(() => {
      // Create mockup credentials
      localStorage.setItem('token', 'mockup-google-jwt-token-val');
      window.location.reload();
    }, 1000);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-brand-950/20 font-sans transition-colors duration-300">
      
      {/* Visual background elements */}
      <div className="absolute top-1/4 left-1/4 h-72 w-72 rounded-full bg-brand-500/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 h-72 w-72 rounded-full bg-emerald-500/10 blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md rounded-3xl border border-slate-200/50 bg-white/75 p-8 shadow-2xl dark:border-slate-800/40 dark:bg-slate-900/60 backdrop-blur-xl animate-in zoom-in-95 duration-200">
        
        {/* Logo */}
        <div className="flex flex-col items-center mb-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand-600 to-brand-400 text-white shadow-lg shadow-brand-500/20 mb-3">
            <Sparkles className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-800 dark:text-white uppercase tracking-wider">
            budgetIQ
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Access your secure personal finance dashboard
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 dark:bg-red-950/20 p-3 text-center text-xs font-semibold text-red-500">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-transparent py-2.5 pl-10 pr-4 text-sm dark:border-slate-800 focus:border-brand-500 outline-none"
              />
              <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-transparent py-2.5 pl-10 pr-10 text-sm dark:border-slate-800 focus:border-brand-500 outline-none"
              />
              <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Remember me & Forgot Password */}
          <div className="flex items-center justify-between text-xs">
            <label className="flex items-center gap-2 text-slate-500 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-slate-350 text-brand-500 focus:ring-brand-500 dark:border-slate-800"
              />
              <span>Remember me</span>
            </label>
            <Link to="/forgot-password" className="font-bold text-brand-500 hover:underline">
              Forgot Password?
            </Link>
          </div>

          {/* Action Login */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-brand-500 py-3 text-xs font-bold text-white shadow-md shadow-brand-500/10 hover:bg-brand-600 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Logging in...' : 'Sign In'}
          </button>

          {/* Divider */}
          <div className="relative flex items-center justify-center my-4">
            <div className="w-full border-t border-slate-200 dark:border-slate-800" />
            <span className="absolute bg-white px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest dark:bg-slate-900">
              Or Connect With
            </span>
          </div>

          {/* Google Login button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-xs font-bold hover:bg-slate-100 dark:border-slate-850 dark:bg-transparent dark:hover:bg-slate-800 transition-colors"
          >
            <svg className="h-4.5 w-4.5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.69c-.29 1.5-.1.38-1.14 2.37v2.53h6.61c3.87-3.56 6.08-8.8 6.08-14.75z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-6.61-2.53c-1.83 1.25-4.18 2-6.61 2-5.07 0-9.35-3.44-10.89-8.07H.21v2.61C2.19 19.84 6.74 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M1.11 12.49A14.24 14.24 0 0 1 1.11 7.5V4.89H.21a11.988 11.988 0 0 0 0 9.21l1.1-.92c-.1-.38-.2-.79-.2-1.2z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.96 1.19 15.24 0 12 0 6.74 0 2.19 4.16.21 8.89l1.1 2.61c1.54-4.63 5.82-8.07 10.89-8.07z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-500">
          Don't have an account?{' '}
          <Link to="/register" className="font-bold text-brand-500 hover:underline">
            Register now
          </Link>
        </p>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Lock, Eye, EyeOff, Sparkles, Users } from 'lucide-react';

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

          <button
            type="button"
            disabled={loading}
            onClick={async () => {
              setEmail('test@budgetiq.com');
              setPassword('Test@1234');
              setError(null);
              setLoading(true);
              try {
                await login('test@budgetiq.com', 'Test@1234');
                navigate('/');
              } catch (err: any) {
                const detail = err.response?.data?.detail;
                if (typeof detail === 'string') setError(detail);
                else setError('Invalid email or password');
              } finally {
                setLoading(false);
              }
            }}
            className="w-full rounded-xl bg-slate-800 py-3 text-xs font-bold text-white shadow-md hover:bg-slate-700 disabled:opacity-50 transition-colors mt-2"
          >
            Sign in as Test User
          </button>


        </form>

        <p className="mt-6 text-center text-xs text-slate-500">
          Don't have an account?{' '}
          <Link to="/register" className="font-bold text-brand-500 hover:underline">
            Register now
          </Link>
        </p>

        {/* Developer Team Button */}
        <div className="mt-5 pt-5 border-t border-slate-200/60 dark:border-slate-700/40">
          <Link
            to="/developers"
            className="group flex w-full items-center justify-center gap-2.5 rounded-xl
              border border-violet-400/40 dark:border-violet-500/30
              bg-gradient-to-r from-violet-50 to-fuchsia-50
              dark:from-violet-950/40 dark:to-fuchsia-950/30
              px-4 py-2.5 text-xs font-bold
              text-violet-600 dark:text-violet-400
              hover:from-violet-100 hover:to-fuchsia-100
              dark:hover:from-violet-900/50 dark:hover:to-fuchsia-900/40
              hover:border-violet-500/60
              hover:shadow-md hover:shadow-violet-500/15
              transition-all duration-200"
          >
            <Users className="h-3.5 w-3.5 transition-transform duration-300 group-hover:scale-110" />
            Meet Our Developer Team
            <span className="ml-auto flex gap-0.5 opacity-50 group-hover:opacity-100 transition-opacity">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
              <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-400" />
              <span className="h-1.5 w-1.5 rounded-full bg-pink-400" />
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
};

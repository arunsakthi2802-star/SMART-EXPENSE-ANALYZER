import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  ArrowRightLeft,
  Target,
  BarChart3,
  FileDown,
  Brain,
  Settings,
  LogOut,
  Sparkles,
  Users
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/', name: 'Dashboard', icon: LayoutDashboard },
    { to: '/transactions', name: 'Transactions', icon: ArrowRightLeft },
    { to: '/budgets', name: 'Budgets & Goals', icon: Target },
    { to: '/analytics', name: 'Analytics', icon: BarChart3 },
    { to: '/ai-insights', name: 'AI Insights', icon: Brain },
    { to: '/reports', name: 'Reports', icon: FileDown },
    { to: '/settings', name: 'Settings', icon: Settings },
    { to: '/developers', name: 'Developers', icon: Users },
  ];

  return (
    <>
      {/* Mobile Sidebar backdrop overlay */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`fixed bottom-0 top-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200/60 bg-white/85 dark:border-slate-800/40 dark:bg-brand-950/90 backdrop-blur-xl transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center gap-2.5 px-6 border-b border-slate-200/50 dark:border-slate-800/40">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-600 to-brand-400 text-white shadow-lg shadow-brand-500/25">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold bg-gradient-to-r from-brand-600 to-brand-400 bg-clip-text text-transparent dark:from-white dark:to-slate-200">
              budgetIQ
            </h1>
          </div>
        </div>

        {/* Links Navigation */}
        <nav className="flex-1 space-y-1.5 px-4 py-6 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setIsOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3.5 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-brand-500 text-white shadow-md shadow-brand-500/10'
                    : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
                }`
              }
            >
              <item.icon className="h-5 w-5" />
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>

        {/* Profile Footer Panel */}
        <div className="border-t border-slate-200/50 dark:border-slate-800/40 p-4">
          <div className="flex items-center gap-3 rounded-xl p-2 bg-slate-50 dark:bg-slate-800/30">
            <div className="h-10 w-10 overflow-hidden rounded-full border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-brand-500">
              {user?.profile_picture ? (
                <img
                  src={user.profile_picture.startsWith('/') ? `/api/v1${user.profile_picture}` : user.profile_picture}
                  alt={user.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                user?.name.charAt(0).toUpperCase()
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-semibold truncate text-slate-800 dark:text-slate-200">
                {user?.name}
              </h4>
              <p className="text-[10px] text-slate-400 truncate uppercase tracking-wider">
                {user?.role} Account
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800 hover:text-red-500 transition-colors"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

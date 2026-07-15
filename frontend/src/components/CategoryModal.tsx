import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { X, AlertCircle } from 'lucide-react';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CategoryModal: React.FC<CategoryModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [icon, setIcon] = useState('Tag');
  const [color, setColor] = useState('#4F46E5');
  const [budgetLimit, setBudgetLimit] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setType('expense');
      setIcon('Tag');
      setColor('#4F46E5');
      setBudgetLimit('');
      setError(null);
    }
  }, [isOpen]);

  const presetColors = [
    '#4F46E5', // Indigo
    '#EF4444', // Red
    '#3B82F6', // Blue
    '#10B981', // Green
    '#F59E0B', // Amber
    '#8B5CF6', // Violet
    '#EC4899', // Pink
    '#06B6D4', // Cyan
    '#14B8A6', // Teal
  ];

  const presetIcons = [
    'Tag',
    'Utensils',
    'ShoppingBag',
    'Plane',
    'HeartPulse',
    'GraduationCap',
    'Gamepad2',
    'Fuel',
    'FileText',
    'Home',
    'TrendingUp',
    'Briefcase',
    'Store',
    'Laptop',
    'Percent',
    'LineChart',
    'Key'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Category name is required');
      return;
    }

    const budgetNum = budgetLimit ? parseFloat(budgetLimit) : undefined;
    if (budgetNum !== undefined && (isNaN(budgetNum) || budgetNum <= 0)) {
      setError('Budget limit must be a positive number');
      return;
    }

    const payload = {
      name: name.trim(),
      type,
      icon,
      color,
      budget_limit: budgetNum,
    };

    try {
      await api.post('/categories', payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create category');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-md rounded-3xl border border-slate-200/50 bg-white/95 p-6 shadow-2xl dark:border-slate-800/40 dark:bg-slate-900/95 backdrop-blur-xl animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">
            Create Custom Category
          </h2>
          <button
            onClick={onClose}
            className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 dark:bg-red-950/20 p-3 text-xs font-semibold text-red-500">
            <AlertCircle className="h-4.5 w-4.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          
          {/* Type */}
          <div className="flex rounded-2xl bg-slate-100 p-1 dark:bg-slate-800/50">
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all ${
                type === 'expense'
                  ? 'bg-white text-brand-600 shadow-md dark:bg-slate-700 dark:text-white'
                  : 'text-slate-500 hover:text-slate-950 dark:text-slate-400'
              }`}
            >
              Expense Category
            </button>
            <button
              type="button"
              onClick={() => setType('income')}
              className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all ${
                type === 'income'
                  ? 'bg-white text-emerald-600 shadow-md dark:bg-slate-700 dark:text-white'
                  : 'text-slate-500 hover:text-slate-950 dark:text-slate-400'
              }`}
            >
              Income Category
            </button>
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
              Category Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Subscriptions, Side Gig"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-transparent px-3.5 py-2.5 text-sm dark:border-slate-800 focus:border-brand-500 outline-none"
            />
          </div>

          {/* Optional Initial Budget */}
          {type === 'expense' && (
            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                Initial Budget Limit ($) (Optional)
              </label>
              <input
                type="number"
                placeholder="e.g. 200"
                value={budgetLimit}
                onChange={(e) => setBudgetLimit(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-transparent px-3.5 py-2.5 text-sm dark:border-slate-800 focus:border-brand-500 outline-none"
              />
            </div>
          )}

          {/* Color preset list */}
          <div>
            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
              Theme Color
            </label>
            <div className="flex flex-wrap gap-2 mt-1">
              {presetColors.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  style={{ backgroundColor: c }}
                  className={`h-7 w-7 rounded-full border-2 transition-all ${
                    color === c ? 'border-slate-900 dark:border-white scale-110' : 'border-transparent'
                  }`}
                />
              ))}
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-7 w-7 rounded cursor-pointer"
              />
            </div>
          </div>

          {/* Icon preset list */}
          <div>
            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
              Icon Representative
            </label>
            <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto mt-1 border border-slate-100 p-2 rounded-xl dark:border-slate-800">
              {presetIcons.map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIcon(i)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    icon === i
                      ? 'border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-950/20 dark:text-brand-400'
                      : 'border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-brand-500 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-brand-500/10 hover:bg-brand-600 transition-colors"
            >
              Create Category
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Category } from '../types';
import { X, AlertCircle } from 'lucide-react';

interface BudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const BudgetModal: React.FC<BudgetModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<string>('');
  const [limitAmount, setLimitAmount] = useState<string>('');
  const [alertThreshold, setAlertThreshold] = useState<string>('80');
  const [period, setPeriod] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await api.get('/categories?type=expense');
        setCategories(response.data);
      } catch (err) {
        console.error(err);
      }
    };
    if (isOpen) {
      fetchCategories();
      // Default to current year-month
      setPeriod(new Date().toISOString().slice(0, 7));
      setLimitAmount('');
      setCategoryId('');
      setAlertThreshold('80');
      setError(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const limitNum = parseFloat(limitAmount);
    if (isNaN(limitNum) || limitNum <= 0) {
      setError('Limit amount must be a positive number');
      return;
    }

    const thresholdNum = parseFloat(alertThreshold) / 100;
    if (isNaN(thresholdNum) || thresholdNum <= 0 || thresholdNum > 1) {
      setError('Alert threshold must be between 1% and 100%');
      return;
    }

    const payload = {
      category_id: categoryId || null,
      limit_amount: limitNum,
      period,
      alert_threshold: thresholdNum,
    };

    try {
      await api.post('/budgets', payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to configure budget limit');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-md rounded-3xl border border-slate-200/50 bg-white/95 p-6 shadow-2xl dark:border-slate-800/40 dark:bg-slate-900/95 backdrop-blur-xl animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">
            Set Budget Limit
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
          
          {/* Target Scope */}
          <div>
            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
              Budget Target Category
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white text-slate-800 px-3.5 py-2.5 text-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 focus:border-brand-500 outline-none"
            >
              <option value="" className="bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-100">Overall Monthly Budget (All categories)</option>
              {categories.map((c) => {
                const val = c.id || (c as any)._id || c.name;
                return (
                  <option key={val} value={val} className="bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-100">
                    {c.name}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Limit */}
            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                Spend Limit ($) *
              </label>
              <input
                type="number"
                step="1"
                required
                placeholder="1000"
                value={limitAmount}
                onChange={(e) => setLimitAmount(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-transparent px-3.5 py-2.5 text-sm dark:border-slate-800 focus:border-brand-500 outline-none"
              />
            </div>

            {/* Target month period */}
            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                Target Period *
              </label>
              <input
                type="month"
                required
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-transparent px-3.5 py-2.5 text-sm dark:border-slate-800 focus:border-brand-500 outline-none"
              />
            </div>
          </div>

          {/* Threshold alert */}
          <div>
            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
              Warning Alert Trigger (%)
            </label>
            <input
              type="number"
              min="10"
              max="100"
              required
              value={alertThreshold}
              onChange={(e) => setAlertThreshold(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-transparent px-3.5 py-2.5 text-sm dark:border-slate-800 focus:border-brand-500 outline-none"
            />
            <span className="text-[10px] text-slate-400 dark:text-slate-500">
              Fires a dashboard notification when category spending crosses this percent of budget.
            </span>
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
              Apply Budget
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

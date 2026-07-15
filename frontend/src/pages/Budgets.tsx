import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Budget, SavingsGoal } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import {
  Target,
  Plus,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Trash2,
  Calendar,
  Sparkles,
  X,
  AlertCircle
} from 'lucide-react';
import { CategoryModal } from '../components/CategoryModal';

interface BudgetsProps {
  onOpenBudgetModal: () => void;
  refreshTrigger: boolean;
}

export const Budgets: React.FC<BudgetsProps> = ({
  onOpenBudgetModal,
  refreshTrigger,
}) => {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  
  // New Goal fields
  const [goalName, setGoalName] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalCurrent, setGoalCurrent] = useState('0');
  const [goalDate, setGoalDate] = useState('');
  const [goalError, setGoalError] = useState<string | null>(null);

  // Edit Goal progress fields
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [newProgressAmount, setNewProgressAmount] = useState('');

  const fetchBudgetsAndGoals = async () => {
    try {
      const bRes = await api.get('/budgets');
      setBudgets(bRes.data);
      const gRes = await api.get('/budgets/goals');
      setGoals(gRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchBudgetsAndGoals();
  }, [refreshTrigger]);

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    setGoalError(null);

    const targetNum = parseFloat(goalTarget);
    const currentNum = parseFloat(goalCurrent);
    if (isNaN(targetNum) || targetNum <= 0) {
      setGoalError('Target amount must be a positive number');
      return;
    }

    try {
      await api.post('/budgets/goals', {
        name: goalName,
        target_amount: targetNum,
        current_amount: currentNum,
        target_date: new Date(goalDate).toISOString(),
      });
      fetchBudgetsAndGoals();
      setShowGoalModal(false);
      setGoalName('');
      setGoalTarget('');
      setGoalCurrent('0');
      setGoalDate('');
    } catch (err: any) {
      setGoalError(err.response?.data?.detail || 'Failed to save savings goal');
    }
  };

  const handleUpdateProgress = async (goal: SavingsGoal) => {
    const progressNum = parseFloat(newProgressAmount);
    if (isNaN(progressNum) || progressNum < 0) return;
    try {
      await api.put(`/budgets/goals/${goal.id}`, {
        current_amount: progressNum,
      });
      setEditingGoalId(null);
      setNewProgressAmount('');
      fetchBudgetsAndGoals();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteGoal = async (id: string) => {
    if (!window.confirm('Delete this savings goal?')) return;
    try {
      await api.delete(`/budgets/goals/${id}`);
      fetchBudgetsAndGoals();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* Top Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">
            Budgets & Savings Targets
          </h2>
          <p className="text-xs text-slate-450 dark:text-slate-400 mt-0.5">
            Configure category spend constraints and map cash reserves to milestones.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCategoryModal(true)}
            className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-850 dark:bg-transparent dark:text-slate-350 dark:hover:bg-slate-800 transition-colors"
          >
            <Plus className="h-4 w-4 text-brand-500" />
            <span>New Category</span>
          </button>
          <button
            onClick={() => setShowGoalModal(true)}
            className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-850 dark:bg-transparent dark:text-slate-350 dark:hover:bg-slate-800 transition-colors"
          >
            <Sparkles className="h-4 w-4 text-emerald-500" />
            <span>Create Savings Goal</span>
          </button>
          <button
            onClick={onOpenBudgetModal}
            className="flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-brand-500/10 hover:bg-brand-600 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Adjust Budgets</span>
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        
        {/* Left Column: Budget Limits progress */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="glass-panel rounded-3xl p-6 shadow-lg">
            <h3 className="text-base font-bold text-slate-800 dark:text-white mb-5 flex items-center gap-2">
              <Target className="h-5 w-5 text-brand-500" />
              <span>Category Budget Limits</span>
            </h3>

            {budgets.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No active budget limits set for this period. Click 'Adjust Budgets' to set limits.
              </div>
            ) : (
              <div className="space-y-6">
                {budgets.map((b) => {
                  const percent = Math.min(100, (b.current_spend / b.limit_amount) * 100);
                  const isExceeded = b.current_spend >= b.limit_amount;
                  const isWarning = b.current_spend >= b.limit_amount * b.alert_threshold;
                  
                  return (
                    <div key={b.id} className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-3 w-3 rounded-full shrink-0"
                            style={{ backgroundColor: b.category_detail?.color || '#4F46E5' }}
                          />
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {b.category_detail?.name || 'Overall Monthly Budget'}
                          </span>
                        </div>
                        <div className="text-slate-500 dark:text-slate-400">
                          <strong className="text-slate-700 dark:text-slate-200">
                            {formatCurrency(b.current_spend)}
                          </strong>{' '}
                          / {formatCurrency(b.limit_amount)}
                        </div>
                      </div>

                      {/* Progress Line bar */}
                      <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          style={{ width: `${percent}%` }}
                          className={`h-full rounded-full transition-all duration-500 ${
                            isExceeded ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-brand-500'
                          }`}
                        />
                      </div>

                      <div className="flex justify-between text-[10px] font-medium">
                        <span className="text-slate-400">
                          {percent.toFixed(0)}% spent
                        </span>
                        {isExceeded ? (
                          <span className="text-red-500 flex items-center gap-0.5">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Overrun!
                          </span>
                        ) : isWarning ? (
                          <span className="text-amber-500">
                            Close to limit
                          </span>
                        ) : (
                          <span className="text-slate-400">
                            Safe margin
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Savings Advice Card */}
          <div className="glass-panel rounded-3xl p-6 bg-brand-50/20 border-brand-100 dark:bg-brand-950/10 dark:border-brand-900 shadow-md">
            <h3 className="text-sm font-bold text-brand-600 dark:text-brand-400 mb-2.5 flex items-center gap-1.5">
              <Lightbulb className="h-4.5 w-4.5" />
              <span>Budget Optimizer Insights</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Based on your priority tags, you could potentially save up to <strong>$150.00</strong> this month by reducing 'low-priority' luxury expenses on Entertainment and Shopping. Try configuring warning notifications to trigger at 75% for custom categories to prevent end-of-month budget shocks.
            </p>
          </div>

        </div>

        {/* Right Column: Savings Goals targets */}
        <div className="space-y-6">
          
          <div className="glass-panel rounded-3xl p-6 shadow-lg">
            <h3 className="text-base font-bold text-slate-800 dark:text-white mb-5 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
              <span>Active Savings Goals</span>
            </h3>

            {goals.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No active savings goals. Set your first goal target above.
              </div>
            ) : (
              <div className="space-y-5">
                {goals.map((g) => {
                  const percent = Math.min(100, (g.current_amount / g.target_amount) * 100);
                  const isEditing = editingGoalId === g.id;

                  return (
                    <div key={g.id} className="border-b border-slate-50 pb-4 dark:border-slate-800 last:border-0 last:pb-0 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {g.name}
                          </h4>
                          <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Calendar className="h-3 w-3" />
                            <span>Target: {formatDate(g.target_date)}</span>
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteGoal(g.id)}
                          className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-red-500 dark:hover:bg-slate-800"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Bar indicator */}
                      <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          style={{ width: `${percent}%` }}
                          className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        />
                      </div>

                      <div className="flex justify-between items-center text-[10px]">
                        <span className="font-semibold text-slate-500 dark:text-slate-400">
                          {formatCurrency(g.current_amount)} / {formatCurrency(g.target_amount)}
                        </span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {percent.toFixed(0)}%
                        </span>
                      </div>

                      {/* Progress editor panel */}
                      <div className="pt-1.5">
                        {isEditing ? (
                          <div className="flex gap-2">
                            <input
                              type="number"
                              placeholder="New total"
                              value={newProgressAmount}
                              onChange={(e) => setNewProgressAmount(e.target.value)}
                              className="w-full rounded-lg border border-slate-200 bg-transparent px-2.5 py-1 text-xs dark:border-slate-800 outline-none"
                            />
                            <button
                              onClick={() => handleUpdateProgress(g)}
                              className="rounded-lg bg-emerald-500 px-2.5 text-xs font-bold text-white hover:bg-emerald-600"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingGoalId(null)}
                              className="rounded-lg bg-slate-100 px-2 text-xs font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingGoalId(g.id);
                              setNewProgressAmount(g.current_amount.toString());
                            }}
                            className="text-[10px] font-bold text-brand-500 hover:underline"
                          >
                            Update balance
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Savings Goal Form Dialog Modal */}
      {showGoalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-md rounded-3xl border border-slate-200/50 bg-white/95 p-6 shadow-2xl dark:border-slate-800/40 dark:bg-slate-900/95 backdrop-blur-xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                New Savings Goal
              </h2>
              <button
                onClick={() => setShowGoalModal(false)}
                className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {goalError && (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 dark:bg-red-950/20 p-3 text-xs font-semibold text-red-500">
                <AlertCircle className="h-4.5 w-4.5 shrink-0" />
                <span>{goalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateGoal} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                  Goal Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Travel Fund, New Laptop"
                  value={goalName}
                  onChange={(e) => setGoalName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-transparent px-3.5 py-2.5 text-sm dark:border-slate-800 focus:border-brand-500 outline-none"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                    Target ($) *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="1000"
                    value={goalTarget}
                    onChange={(e) => setGoalTarget(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-transparent px-3.5 py-2.5 text-sm dark:border-slate-800 focus:border-brand-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                    Current Savings ($)
                  </label>
                  <input
                    type="number"
                    value={goalCurrent}
                    onChange={(e) => setGoalCurrent(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-transparent px-3.5 py-2.5 text-sm dark:border-slate-800 focus:border-brand-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                  Target Accomplish Date *
                </label>
                <input
                  type="date"
                  required
                  value={goalDate}
                  onChange={(e) => setGoalDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-transparent px-3.5 py-2.5 text-sm dark:border-slate-800 focus:border-brand-500 outline-none"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowGoalModal(false)}
                  className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-brand-500 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-brand-500/10 hover:bg-brand-600"
                >
                  Create Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showCategoryModal && (
        <CategoryModal
          isOpen={showCategoryModal}
          onClose={() => setShowCategoryModal(false)}
          onSuccess={fetchBudgetsAndGoals}
        />
      )}
      
    </div>
  );
};

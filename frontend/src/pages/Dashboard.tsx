import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { StatCard } from '../components/StatCard';
import { DashboardSkeleton } from '../components/SkeletonLoader';
import { formatCurrency } from '../utils/formatters';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Brain,
  Activity,
  PlusCircle,
  Plus,
  ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

ChartJS.register(ArcElement, Tooltip, Legend);

interface DashboardData {
  net_balance: number;
  today_income: number;
  today_expense: number;
  monthly_income: number;
  monthly_expense: number;
  budget_limit: number;
  budget_remaining: number;
  total_saved_goals: number;
  top_categories: Array<{
    category_name: string;
    color: string;
    icon: string;
    amount: number;
  }>;
  recent_transactions: Array<{
    id: string;
    type: 'income' | 'expense';
    amount: number;
    date: string;
    category_name: string;
    color: string;
    description: string;
  }>;
  health_score: number;
  health_grade: string;
}

export const Dashboard: React.FC<{ refreshTrigger?: boolean }> = ({ refreshTrigger }) => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchDashboardData = async () => {
    try {
      const response = await api.get('/dashboard');
      setData(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [refreshTrigger]);

  if (loading || !data) {
    return <DashboardSkeleton />;
  }

  // Chart Setup
  const doughnutData = {
    labels: data.top_categories.map((c) => c.category_name),
    datasets: [
      {
        data: data.top_categories.map((c) => c.amount),
        backgroundColor: data.top_categories.map((c) => c.color || '#4F46E5'),
        borderWidth: 0,
        hoverOffset: 4,
      },
    ],
  };

  const doughnutOptions = {
    cutout: '70%',
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => ` ${formatCurrency(context.raw)}`,
        },
      },
    },
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-600 via-indigo-600 to-brand-400 p-6 text-white shadow-xl">
        <div className="relative z-10 flex flex-col justify-between md:flex-row md:items-center gap-4">
          <div>
            <h2 className="text-xl font-extrabold tracking-wide md:text-2xl">
              Take Control of Your Spending 🚀
            </h2>
            <p className="text-xs text-brand-100 mt-1 max-w-xl leading-relaxed">
              Track budgets, view intelligent anomaly alerts, and get actionable recommendations powered by financial AI.
            </p>
          </div>
          <button
            onClick={() => navigate('/ai-insights')}
            className="flex w-fit items-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-brand-600 shadow-md hover:bg-slate-55 transition-colors shrink-0"
          >
            <Brain className="h-4 w-4" />
            <span>Generate AI Report</span>
          </button>
        </div>
        {/* Decorative design elements */}
        <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-white/10 blur-2xl pointer-events-none" />
      </div>

      {/* Metric Cards Grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Net Balance"
          value={formatCurrency(data.net_balance)}
          subValue="Cumulative Savings"
          icon={Wallet}
          iconColor="text-brand-500"
          iconBg="bg-brand-50 dark:bg-brand-950/20"
        />
        <StatCard
          title="Monthly Income"
          value={formatCurrency(data.monthly_income)}
          subValue="Salary & Side Income"
          icon={ArrowUpRight}
          iconColor="text-emerald-500"
          iconBg="bg-emerald-50 dark:bg-emerald-950/20"
        />
        <StatCard
          title="Monthly Expenses"
          value={formatCurrency(data.monthly_expense)}
          subValue="Shopping, Bills & Rent"
          icon={ArrowDownRight}
          iconColor="text-red-500"
          iconBg="bg-red-50 dark:bg-red-950/20"
        />
        <StatCard
          title="Budget Remaining"
          value={data.budget_limit > 0 ? formatCurrency(data.budget_remaining) : 'N/A'}
          subValue={data.budget_limit > 0 ? `${formatCurrency(data.budget_limit)} Limit` : 'No Budget set'}
          icon={ShieldCheck}
          iconColor="text-blue-500"
          iconBg="bg-blue-50 dark:bg-blue-950/20"
        />
      </div>

      {/* Main Layout Area */}
      <div className="grid gap-6 lg:grid-cols-3">
        
        {/* Left column: Health score & top categories */}
        <div className="space-y-6 lg:col-span-2">
          
          {/* Health score card */}
          <div className="glass-panel flex flex-col md:flex-row items-center gap-6 rounded-3xl p-6 shadow-lg">
            
            {/* Visual dial */}
            <div className="relative flex h-32 w-32 items-center justify-center shrink-0">
              <div className="absolute h-full w-full rounded-full border-4 border-slate-100 dark:border-slate-800" />
              <svg className="absolute h-full w-full -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="60"
                  stroke={data.health_score >= 70 ? '#10B981' : data.health_score >= 40 ? '#F59E0B' : '#EF4444'}
                  strokeWidth="6"
                  fill="transparent"
                  strokeDasharray={2 * Math.PI * 60}
                  strokeDashoffset={2 * Math.PI * 60 * (1 - data.health_score / 100)}
                  strokeLinecap="round"
                />
              </svg>
              <div className="text-center">
                <span className="text-3xl font-extrabold text-slate-800 dark:text-white">
                  {data.health_score}
                </span>
                <p className="text-[10px] text-slate-400 font-medium">HEALTH INDEX</p>
              </div>
            </div>

            {/* Assessment info */}
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-brand-500" />
                <h3 className="text-base font-bold text-slate-800 dark:text-white">
                  Financial Health: {data.health_grade}
                </h3>
              </div>
              <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                Your financial score is calculated dynamically based on your budget compliance rate, savings ratio, and priority allocation.
              </p>
              <button
                onClick={() => navigate('/ai-insights')}
                className="text-xs font-bold text-brand-500 hover:text-brand-600 flex items-center gap-1 mt-2"
              >
                <span>Read detailed insights</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

          </div>

          {/* Category distribution */}
          <div className="glass-panel rounded-3xl p-6 shadow-lg">
            <h3 className="text-base font-bold text-slate-800 dark:text-white mb-5">
              Category Spending Breakdown
            </h3>
            {data.top_categories.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No expense transactions logged this month.
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 items-center">
                <div className="relative mx-auto h-40 w-40">
                  <Doughnut data={doughnutData} options={doughnutOptions} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xs text-slate-400">Total Spent</span>
                    <span className="text-base font-extrabold text-slate-800 dark:text-white mt-0.5">
                      {formatCurrency(data.monthly_expense)}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  {data.top_categories.map((c) => (
                    <div key={c.category_name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 rounded-full shrink-0"
                          style={{ backgroundColor: c.color }}
                        />
                        <span className="font-semibold text-slate-600 dark:text-slate-400 truncate max-w-[120px]">
                          {c.category_name}
                        </span>
                      </div>
                      <span className="font-bold text-slate-800 dark:text-white">
                        {formatCurrency(c.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Right column: Recent ledger & Quick actions */}
        <div className="space-y-6">
          
          {/* Quick actions */}
          <div className="glass-panel rounded-3xl p-6 shadow-lg">
            <h3 className="text-base font-bold text-slate-800 dark:text-white mb-4">
              Quick Actions
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => navigate('/transactions')}
                className="flex flex-col items-center justify-center rounded-2xl border border-slate-100 bg-slate-50/50 p-4 text-center dark:border-slate-800/30 dark:bg-slate-800/20 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"
              >
                <PlusCircle className="h-6 w-6 text-brand-500 mb-1.5" />
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-350">
                  Transactions
                </span>
              </button>
              <button
                onClick={() => navigate('/budgets')}
                className="flex flex-col items-center justify-center rounded-2xl border border-slate-100 bg-slate-50/50 p-4 text-center dark:border-slate-800/30 dark:bg-slate-800/20 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"
              >
                <PlusCircle className="h-6 w-6 text-emerald-500 mb-1.5" />
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-350">
                  Set Budget
                </span>
              </button>
            </div>
          </div>

          {/* Recent list */}
          <div className="glass-panel rounded-3xl p-6 shadow-lg flex-1">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-800 dark:text-white">
                Recent Transactions
              </h3>
              <button
                onClick={() => navigate('/transactions')}
                className="text-xs font-bold text-brand-500 hover:underline"
              >
                View all
              </button>
            </div>

            <div className="space-y-4">
              {data.recent_transactions.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  No recent activities recorded.
                </div>
              ) : (
                data.recent_transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between border-b border-slate-50 pb-3 dark:border-slate-800 last:border-0 last:pb-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-xl text-white font-bold shrink-0 text-xs"
                        style={{ backgroundColor: tx.color }}
                      >
                        {tx.category_name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-semibold truncate text-slate-800 dark:text-slate-200">
                          {tx.description}
                        </h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {tx.date} • {tx.category_name}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-xs font-extrabold shrink-0 ${
                        tx.type === 'income' ? 'text-emerald-500' : 'text-slate-800 dark:text-white'
                      }`}
                    >
                      {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

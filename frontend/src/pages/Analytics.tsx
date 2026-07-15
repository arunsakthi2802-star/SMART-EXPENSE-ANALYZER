import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { formatCurrency } from '../utils/formatters';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { TrendingUp, Award, Clock, DollarSign, Calendar } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface AnalyticsData {
  summary: {
    average_spending: number;
    highest_spending: number;
    lowest_spending: number;
    total_income: number;
    total_expense: number;
  };
  trends: Array<{
    label: string;
    income: number;
    expense: number;
    savings: number;
  }>;
  expense_distribution: Array<{
    name: string;
    color: string;
    value: number;
  }>;
  cumulative_cashflow: Array<{
    date: string;
    balance: number;
  }>;
  peak_spending_days: Array<{
    day: string;
    amount: number;
  }>;
  payment_method_distribution: Array<{
    method: string;
    amount: number;
  }>;
}

export const Analytics: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [daysFrame, setDaysFrame] = useState(90);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await api.get('/analytics', { params: { days: daysFrame } });
      setData(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [daysFrame]);

  if (loading || !data) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-6 w-32 bg-slate-200 dark:bg-slate-800 rounded" />
        <div className="grid gap-5 md:grid-cols-3">
          <div className="glass-panel h-80 rounded-2xl md:col-span-2" />
          <div className="glass-panel h-80 rounded-2xl" />
        </div>
      </div>
    );
  }

  // 1. Income vs Expense Trend Bar Chart config
  const barChartData = {
    labels: data.trends.map((t) => t.label),
    datasets: [
      {
        label: 'Income',
        data: data.trends.map((t) => t.income),
        backgroundColor: '#10B981',
        borderRadius: 8,
      },
      {
        label: 'Expense',
        data: data.trends.map((t) => t.expense),
        backgroundColor: '#4F46E5',
        borderRadius: 8,
      },
    ],
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: { color: '#9CA3AF', font: { family: 'Inter' } },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#9CA3AF' } },
      y: { ticks: { color: '#9CA3AF' } },
    },
  };

  // 2. Cumulative Cash Flow Area Chart config
  const areaChartData = {
    labels: data.cumulative_cashflow.map((c) => c.date),
    datasets: [
      {
        fill: true,
        label: 'Balance Growth',
        data: data.cumulative_cashflow.map((c) => c.balance),
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 1,
      },
    ],
  };

  const areaChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#9CA3AF', maxRotation: 45 } },
      y: { ticks: { color: '#9CA3AF' } },
    },
  };

  // 3. Peak Days Line Chart config
  const peakChartData = {
    labels: data.peak_spending_days.map((p) => p.day),
    datasets: [
      {
        label: 'Spent Amount ($)',
        data: data.peak_spending_days.map((p) => p.amount),
        borderColor: '#EF4444',
        backgroundColor: 'transparent',
        tension: 0.3,
        borderWidth: 3,
        pointBackgroundColor: '#EF4444',
      },
    ],
  };

  const peakChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#9CA3AF' } },
      y: { ticks: { color: '#9CA3AF' } },
    },
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">
            Visual Analytics Hub
          </h2>
          <p className="text-xs text-slate-450 dark:text-slate-400 mt-0.5">
            Audit cash flow trajectories, peak spending days, and category allocations.
          </p>
        </div>

        {/* Time selector */}
        <select
          value={daysFrame}
          onChange={(e) => setDaysFrame(parseInt(e.target.value))}
          className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-600 dark:border-slate-850 dark:bg-slate-900 dark:text-slate-100 focus:border-brand-500 outline-none w-fit"
        >
          <option value="30" className="bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-100">Last 30 Days</option>
          <option value="90" className="bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-100">Last 90 Days</option>
          <option value="180" className="bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-100">Last 6 Months</option>
          <option value="365" className="bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-100">Last 1 Year</option>
        </select>
      </div>

      {/* Summary grid */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="glass-panel flex items-center gap-4 rounded-2xl p-5 shadow">
          <div className="h-10 w-10 rounded-xl bg-brand-50 dark:bg-brand-950/20 text-brand-500 flex items-center justify-center">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Average Spent / Transaction
            </span>
            <h4 className="text-lg font-extrabold text-slate-800 dark:text-white mt-0.5">
              {formatCurrency(data.summary.average_spending)}
            </h4>
          </div>
        </div>

        <div className="glass-panel flex items-center gap-4 rounded-2xl p-5 shadow">
          <div className="h-10 w-10 rounded-xl bg-red-50 dark:bg-red-950/20 text-red-500 flex items-center justify-center">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Highest Spending Invoice
            </span>
            <h4 className="text-lg font-extrabold text-slate-800 dark:text-white mt-0.5">
              {formatCurrency(data.summary.highest_spending)}
            </h4>
          </div>
        </div>

        <div className="glass-panel flex items-center gap-4 rounded-2xl p-5 shadow">
          <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 flex items-center justify-center">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Lowest Transaction Entry
            </span>
            <h4 className="text-lg font-extrabold text-slate-800 dark:text-white mt-0.5">
              {formatCurrency(data.summary.lowest_spending)}
            </h4>
          </div>
        </div>
      </div>

      {/* Charts section */}
      <div className="grid gap-6 lg:grid-cols-3">
        
        {/* Trend Bar */}
        <div className="glass-panel rounded-3xl p-6 shadow-lg lg:col-span-2">
          <h3 className="text-sm font-bold text-slate-850 dark:text-slate-200 mb-4">
            Income vs Expense Monthly Trend
          </h3>
          <div className="h-72">
            <Bar data={barChartData} options={barChartOptions} />
          </div>
        </div>

        {/* Peak spending days Line */}
        <div className="glass-panel rounded-3xl p-6 shadow-lg">
          <h3 className="text-sm font-bold text-slate-850 dark:text-slate-200 mb-4 flex items-center gap-1">
            <Clock className="h-4 w-4 text-red-500" />
            <span>Peak Spending Days</span>
          </h3>
          <div className="h-72">
            <Line data={peakChartData} options={peakChartOptions} />
          </div>
        </div>

        {/* Cash Flow Area */}
        <div className="glass-panel rounded-3xl p-6 shadow-lg lg:col-span-2">
          <h3 className="text-sm font-bold text-slate-850 dark:text-slate-200 mb-4 flex items-center gap-1.5">
            <Calendar className="h-4.5 w-4.5 text-blue-500" />
            <span>Cumulative Account Balance Growth</span>
          </h3>
          <div className="h-72">
            {data.cumulative_cashflow.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-slate-400">
                Log transactions over multiple days to trace cash flow growth.
              </div>
            ) : (
              <Line data={areaChartData} options={areaChartOptions} />
            )}
          </div>
        </div>

        {/* Payment Methods Breakdown */}
        <div className="glass-panel rounded-3xl p-6 shadow-lg">
          <h3 className="text-sm font-bold text-slate-850 dark:text-slate-200 mb-5">
            Payment Methods Share
          </h3>
          <div className="space-y-4">
            {data.payment_method_distribution.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No method details logged.
              </div>
            ) : (
              data.payment_method_distribution.map((pm) => (
                <div key={pm.method} className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-500 dark:text-slate-400">{pm.method}</span>
                    <span className="font-bold text-slate-850 dark:text-white">{formatCurrency(pm.amount)}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-850 overflow-hidden">
                    <div
                      style={{
                        width: `${Math.min(100, (pm.amount / data.summary.total_expense) * 100)}%`,
                      }}
                      className="h-full bg-brand-500 rounded-full"
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
};

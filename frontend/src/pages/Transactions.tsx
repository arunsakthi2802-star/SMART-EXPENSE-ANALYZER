import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Transaction, Category } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { TableSkeleton } from '../components/SkeletonLoader';
import {
  Search,
  Plus,
  Trash2,
  Copy,
  Edit2,
  Upload,
  Download,
  Filter,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  Brain,
  Lightbulb
} from 'lucide-react';

interface TransactionsProps {
  onOpenAddModal: () => void;
  onEditTransaction: (tx: Transaction) => void;
  refreshTrigger: boolean;
  onRefreshCompleted: () => void;
}

export const Transactions: React.FC<TransactionsProps> = ({
  onOpenAddModal,
  onEditTransaction,
  refreshTrigger,
  onRefreshCompleted,
}) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  
  // AI Insights State
  const [aiTip, setAiTip] = useState<string | null>(null);
  const [aiScore, setAiScore] = useState<number | null>(null);
  const [anomalyCount, setAnomalyCount] = useState<number>(0);
  
  // Filtering & Pagination State
  const [search, setSearch] = useState('');
  const [type, setType] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [skip, setSkip] = useState(0);
  const limit = 15;
  
  // Multi select for bulk actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const response = await api.get('/transactions', {
        params: {
          search: search || undefined,
          type: type || undefined,
          category_id: categoryId || undefined,
          payment_method: paymentMethod || undefined,
          skip,
          limit,
        },
      });
      setTransactions(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAIStats = async () => {
    try {
      const [healthRes, anomalyRes] = await Promise.all([
        api.get('/ai/health-score'),
        api.get('/ai/anomalies')
      ]);
      if (healthRes.data) {
        setAiScore(healthRes.data.score);
        if (healthRes.data.recommendations && healthRes.data.recommendations.length > 0) {
          setAiTip(healthRes.data.recommendations[0]);
        }
      }
      if (anomalyRes.data) {
        setAnomalyCount(anomalyRes.data.length);
      }
    } catch (e) {
      console.error('Failed to fetch AI insights for Transactions:', e);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories');
      setCategories(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTransactions();
    fetchAIStats();
  }, [search, type, categoryId, paymentMethod, skip, refreshTrigger]);

  useEffect(() => {
    fetchCategories();
    fetchAIStats();
  }, []);

  // Reset skip when filters change
  useEffect(() => {
    setSkip(0);
  }, [search, type, categoryId, paymentMethod]);

  useEffect(() => {
    if (refreshTrigger) {
      fetchTransactions();
      fetchAIStats();
      onRefreshCompleted();
    }
  }, [refreshTrigger]);

  const handleSelectRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === transactions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(transactions.map((t) => t.id));
    }
  };

  const handleDelete = async (tx: Transaction) => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) return;
    try {
      await api.delete(`/transactions/${tx.type}/${tx.id}`);
      fetchTransactions();
    } catch (err) {
      console.error(err);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Delete ${selectedIds.length} transactions?`)) return;
    try {
      await api.post('/transactions/bulk-delete', { ids: selectedIds });
      setSelectedIds([]);
      fetchTransactions();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDuplicate = async (tx: Transaction) => {
    try {
      await api.post(`/transactions/duplicate/${tx.type}/${tx.id}`);
      fetchTransactions();
    } catch (err) {
      console.error(err);
    }
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setImporting(true);
    setFeedback(null);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post('/transactions/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setFeedback(response.data.message || 'Import successful');
      fetchTransactions();
    } catch (err: any) {
      setFeedback(err.response?.data?.detail || 'CSV Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleExportCSV = () => {
    let url = '/transactions/export';
    if (type) url += `?type=${type}`;
    
    // Trigger browser file download directly
    api.get(url, { responseType: 'blob' }).then((response) => {
      const downloadUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', 'transactions_ledger.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    });
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* AI Assistant Quick Insights Banner */}
      {(aiScore !== null || anomalyCount > 0) && (
        <div className="grid gap-4 md:grid-cols-3">
          {/* Health Score Card */}
          {aiScore !== null && (
            <div className="glass-panel rounded-2xl p-4 flex items-center gap-3.5 border-brand-100/50 dark:border-brand-900/30 bg-gradient-to-br from-brand-55/5 to-transparent">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500 dark:bg-brand-500/20">
                <Brain className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">AI Health Score</span>
                <span className="text-xl font-black text-slate-800 dark:text-white mt-0.5 block">{aiScore} <span className="text-xs font-semibold text-slate-450">/ 100</span></span>
              </div>
            </div>
          )}

          {/* AI Recommendation Card */}
          {aiTip && (
            <div className="glass-panel rounded-2xl p-4 flex items-center gap-3.5 md:col-span-2">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
                <Lightbulb className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">AI Recommendation</span>
                <p className="text-xs text-slate-655 dark:text-slate-350 mt-1 line-clamp-1 leading-snug">
                  {aiTip}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Top action header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">
            Transactions Ledger
          </h2>
          <p className="text-xs text-slate-450 dark:text-slate-400 mt-0.5">
            Log income, audit expenditures, duplicate entries, and export/import csv data.
          </p>
        </div>

        {/* Import/Export Action triggers */}
        <div className="flex flex-wrap gap-2">
          <input
            type="file"
            id="csv-file-import"
            accept=".csv"
            onChange={handleImportCSV}
            className="hidden"
          />
          <label
            htmlFor="csv-file-import"
            className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-850 dark:bg-transparent dark:text-slate-350 dark:hover:bg-slate-800 transition-colors"
          >
            <Upload className="h-4 w-4" />
            <span>{importing ? 'Importing...' : 'Import CSV'}</span>
          </label>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-850 dark:bg-transparent dark:text-slate-350 dark:hover:bg-slate-800 transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-1.5 rounded-xl bg-brand-500 px-4.5 py-2.5 text-xs font-bold text-white shadow-md shadow-brand-500/10 hover:bg-brand-600 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Add Record</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div className="flex items-center gap-2 rounded-xl bg-brand-50 dark:bg-brand-950/20 p-3 text-xs font-semibold text-brand-650 dark:text-brand-400">
          <AlertCircle className="h-4.5 w-4.5 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Query Filter Grid */}
      <div className="glass-panel rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-2 dark:border-slate-800">
          <Filter className="h-4 w-4 text-brand-500" />
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-350 uppercase tracking-wider">
            Ledger Filters
          </h3>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {/* Search text query */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search description, merchant..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-transparent py-2 pl-9 pr-3.5 text-xs dark:border-slate-800 outline-none focus:border-brand-500"
            />
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          </div>

          {/* Type Filter */}
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white text-slate-800 px-3.5 py-2 text-xs dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 outline-none focus:border-brand-500"
          >
            <option value="" className="bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-100">All Transactions</option>
            <option value="expense" className="bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-100">Expenses Only</option>
            <option value="income" className="bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-100">Incomes Only</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white text-slate-800 px-3.5 py-2 text-xs dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 outline-none focus:border-brand-500"
          >
            <option value="" className="bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-100">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id} className="bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-100">
                {c.name} ({c.type})
              </option>
            ))}
          </select>

          {/* Method Filter */}
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white text-slate-800 px-3.5 py-2 text-xs dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 outline-none focus:border-brand-500"
          >
            <option value="" className="bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-100">All Payment Methods</option>
            <option value="Cash" className="bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-100">Cash</option>
            <option value="Card" className="bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-100">Debit / Credit Card</option>
            <option value="UPI" className="bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-100">UPI</option>
            <option value="Bank Transfer" className="bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-100">Bank Transfer</option>
          </select>

          {/* Refresh Action */}
          <button
            onClick={fetchTransactions}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:border-slate-850 dark:bg-transparent dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Reset filters</span>
          </button>
        </div>
      </div>

      {/* Ledger Table */}
      {loading ? (
        <TableSkeleton />
      ) : (
        <div className="glass-panel overflow-hidden rounded-2xl shadow-lg">
          
          {/* Bulk actions menu */}
          {selectedIds.length > 0 && (
            <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800 px-6 py-3 border-b border-slate-200 dark:border-slate-700">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-350">
                Selected <strong>{selectedIds.length}</strong> items
              </span>
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-1.5 rounded-lg bg-red-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-600 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete Selected</span>
              </button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-brand-950/20 text-slate-400 uppercase font-bold tracking-wider">
                  <th className="px-6 py-4 w-12 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === transactions.length && transactions.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-slate-300 dark:border-slate-850 text-brand-500"
                    />
                  </th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Transaction / Merchant</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Method</th>
                  <th className="px-6 py-4 text-right">Amount</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                      No matching records found.
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => (
                    <tr
                      key={tx.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors group"
                    >
                      <td className="px-6 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(tx.id)}
                          onChange={() => handleSelectRow(tx.id)}
                          className="rounded border-slate-300 dark:border-slate-850 text-brand-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-500 dark:text-slate-400">
                        {formatDate(tx.date)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {tx.merchant_name || 'N/A'}
                        </div>
                        {tx.description && (
                          <div className="text-[10px] text-slate-400 mt-0.5 max-w-[200px] truncate">
                            {tx.description}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-bold text-[10px]"
                          style={{
                            backgroundColor: `${tx.category_detail?.color || '#9CA3AF'}20`,
                            color: tx.category_detail?.color || '#9CA3AF',
                          }}
                        >
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: tx.category_detail?.color || '#9CA3AF' }}
                          />
                          {tx.category_detail?.name || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-500 dark:text-slate-400">
                        {tx.payment_method}
                      </td>
                      <td
                        className={`px-6 py-4 whitespace-nowrap text-right font-extrabold ${
                          tx.type === 'income' ? 'text-emerald-500' : 'text-slate-800 dark:text-white'
                        }`}
                      >
                        {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleDuplicate(tx)}
                            className="rounded-lg p-1.5 text-slate-450 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-brand-500 transition-colors"
                            title="Duplicate"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => onEditTransaction(tx)}
                            className="rounded-lg p-1.5 text-slate-450 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-white transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(tx)}
                            className="rounded-lg p-1.5 text-slate-450 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-red-500 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 px-6 py-4">
            <span className="text-[11px] text-slate-450 dark:text-slate-450">
              Displaying page <strong>{Math.floor(skip / limit) + 1}</strong>
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setSkip((prev) => Math.max(0, prev - limit))}
                disabled={skip === 0}
                className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-850 dark:bg-transparent dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Prev</span>
              </button>
              <button
                onClick={() => setSkip((prev) => prev + limit)}
                disabled={transactions.length < limit}
                className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-850 dark:bg-transparent dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
              >
                <span>Next</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

        </div>
      )}
      
    </div>
  );
};

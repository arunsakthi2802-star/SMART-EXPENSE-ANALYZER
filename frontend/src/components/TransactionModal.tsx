import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Category, Transaction } from '../types';
import { X, Upload, Check, AlertCircle } from 'lucide-react';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  transactionToEdit?: Transaction | null;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  transactionToEdit,
}) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [tags, setTags] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('Cash');
  const [merchantName, setMerchantName] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [priority, setPriority] = useState<string>('medium');
  const [recurringRule, setRecurringRule] = useState<string>('none');
  const [receiptUrl, setReceiptUrl] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch Categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await api.get('/categories');
        setCategories(response.data);
      } catch (err) {
        console.error(err);
      }
    };
    if (isOpen) fetchCategories();
  }, [isOpen]);

  // Set form state if editing
  useEffect(() => {
    if (transactionToEdit) {
      setType(transactionToEdit.type);
      setAmount(transactionToEdit.amount.toString());
      setDate(new Date(transactionToEdit.date).toISOString().slice(0, 16));
      setCategoryId(transactionToEdit.category_id);
      setDescription(transactionToEdit.description);
      setTags(transactionToEdit.tags.join(', '));
      setPaymentMethod(transactionToEdit.payment_method);
      setMerchantName(transactionToEdit.merchant_name);
      setLocation(transactionToEdit.location);
      setPriority(transactionToEdit.priority);
      setRecurringRule(transactionToEdit.recurring_rule);
      setReceiptUrl(transactionToEdit.receipt_url);
    } else {
      setType('expense');
      setAmount('');
      setDate(new Date().toISOString().slice(0, 16));
      setCategoryId('');
      setDescription('');
      setTags('');
      setPaymentMethod('Cash');
      setMerchantName('');
      setLocation('');
      setPriority('medium');
      setRecurringRule('none');
      setReceiptUrl('');
    }
    setError(null);
  }, [transactionToEdit, isOpen]);

  // Trigger category prediction on description change (AI Feature!)
  const handleDescriptionBlur = async () => {
    if (transactionToEdit || !description || categoryId) return;
    try {
      const response = await api.get('/ai/predict-category', {
        params: { description, merchant: merchantName, tx_type: type }
      });
      if (response.data.category_id) {
        setCategoryId(response.data.category_id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    setError(null);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await api.post('/transactions/upload-receipt', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setReceiptUrl(response.data.receipt_url);
      
      // Auto-fill transaction fields from AI receipt analysis
      const analysis = response.data.analysis;
      if (analysis) {
        if (analysis.amount) {
          setAmount(analysis.amount.toString());
        }
        if (analysis.merchant_name) {
          setMerchantName(analysis.merchant_name);
        }
        if (analysis.description) {
          setDescription(analysis.description);
        }
        if (analysis.date) {
          try {
            setDate(new Date(analysis.date).toISOString().slice(0, 16));
          } catch {
            setDate(analysis.date);
          }
        }
        if (analysis.category_name) {
          const matchedCat = categories.find(
            (c) => c.name.toLowerCase() === analysis.category_name.toLowerCase()
          );
          if (matchedCat) {
            setCategoryId(matchedCat.id);
          }
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Receipt upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const amtNum = parseFloat(amount);
    if (isNaN(amtNum) || amtNum <= 0) {
      setError('Amount must be a positive number');
      return;
    }

    if (!categoryId) {
      // category is optional — skip validation
    }

    const payload = {
      type,
      amount: amtNum,
      date: new Date(date).toISOString(),
      category_id: categoryId,
      description,
      tags: tags.split(',').map((t) => t.trim()).filter((t) => t.length > 0),
      payment_method: paymentMethod,
      merchant_name: merchantName,
      location,
      receipt_url: receiptUrl,
      recurring_rule: recurringRule,
      priority,
    };

    try {
      if (transactionToEdit) {
        await api.put(`/transactions/${transactionToEdit.type}/${transactionToEdit.id}`, payload);
      } else {
        await api.post('/transactions', payload);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save transaction');
    }
  };

  if (!isOpen) return null;

  const filteredCategories = categories.filter((c) => c.type === type);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl rounded-3xl border border-slate-200/50 bg-white/95 p-6 shadow-2xl dark:border-slate-800/40 dark:bg-slate-900/95 backdrop-blur-xl animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">
            {transactionToEdit ? 'Edit Transaction' : 'New Transaction'}
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          
          {/* Transaction Type Selector */}
          <div className="flex rounded-2xl bg-slate-100 p-1 dark:bg-slate-800/50">
            <button
              type="button"
              onClick={() => { setType('expense'); setCategoryId(''); }}
              className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all ${
                type === 'expense'
                  ? 'bg-white text-brand-600 shadow-md dark:bg-slate-700 dark:text-white'
                  : 'text-slate-500 hover:text-slate-950 dark:text-slate-400'
              }`}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => { setType('income'); setCategoryId(''); }}
              className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all ${
                type === 'income'
                  ? 'bg-white text-emerald-600 shadow-md dark:bg-slate-700 dark:text-white'
                  : 'text-slate-500 hover:text-slate-950 dark:text-slate-400'
              }`}
            >
              Income
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            
            {/* Amount */}
            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                Amount *
              </label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-transparent px-3.5 py-2.5 text-sm dark:border-slate-800 focus:border-brand-500 outline-none"
              />
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                Date & Time
              </label>
              <input
                type="datetime-local"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-transparent px-3.5 py-2.5 text-sm dark:border-slate-800 focus:border-brand-500 outline-none"
              />
            </div>
            
            {/* Category */}
            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                Category
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white text-slate-800 px-3.5 py-2.5 text-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 focus:border-brand-500 outline-none"
              >
                <option value="" className="bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-100">Select Category</option>
                {filteredCategories.map((c) => {
                  const val = c.id || (c as any)._id || c.name;
                  return (
                    <option key={val} value={val} className="bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-100">
                      {c.name}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Merchant */}
            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                Merchant / Payer
              </label>
              <input
                type="text"
                placeholder="e.g. Starbucks, MyCorp"
                value={merchantName}
                onChange={(e) => setMerchantName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-transparent px-3.5 py-2.5 text-sm dark:border-slate-800 focus:border-brand-500 outline-none"
              />
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white text-slate-800 px-3.5 py-2.5 text-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 focus:border-brand-500 outline-none"
              >
                <option value="Cash" className="bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-100">Cash</option>
                <option value="Card" className="bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-100">Debit / Credit Card</option>
                <option value="UPI" className="bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-100">UPI</option>
                <option value="Bank Transfer" className="bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-100">Bank Transfer</option>
              </select>
            </div>

            {/* Priority (for Expense) */}
            {type === 'expense' ? (
              <div>
                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white text-slate-800 px-3.5 py-2.5 text-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 focus:border-brand-500 outline-none"
                >
                  <option value="low" className="bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-100">Low (Discretionary)</option>
                  <option value="medium" className="bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-100">Medium</option>
                  <option value="high" className="bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-100">High (Essential)</option>
                </select>
              </div>
            ) : (
              <div />
            )}

            {/* Recurring Rule */}
            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                Recurring Frequency
              </label>
              <select
                value={recurringRule}
                onChange={(e) => setRecurringRule(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white text-slate-800 px-3.5 py-2.5 text-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 focus:border-brand-500 outline-none"
              >
                <option value="none" className="bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-100">One Time</option>
                <option value="daily" className="bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-100">Daily</option>
                <option value="weekly" className="bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-100">Weekly</option>
                <option value="monthly" className="bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-100">Monthly</option>
                <option value="yearly" className="bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-100">Yearly</option>
              </select>
            </div>

            {/* Location */}
            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                Location
              </label>
              <input
                type="text"
                placeholder="e.g. San Francisco, NY"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-transparent px-3.5 py-2.5 text-sm dark:border-slate-800 focus:border-brand-500 outline-none"
              />
            </div>
            
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
              Description
            </label>
            <textarea
              rows={2}
              placeholder="Provide a short description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={handleDescriptionBlur}
              className="w-full rounded-xl border border-slate-200 bg-transparent px-3.5 py-2.5 text-sm dark:border-slate-800 focus:border-brand-500 outline-none resize-none"
            />
            {!transactionToEdit && (
              <span className="text-[10px] text-slate-400 dark:text-slate-500">
                AI Tip: Leave Category empty; description keywords will predict it automatically.
              </span>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Tags */}
            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                Tags (Comma-separated)
              </label>
              <input
                type="text"
                placeholder="e.g. work, travel, holiday"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-transparent px-3.5 py-2.5 text-sm dark:border-slate-800 focus:border-brand-500 outline-none"
              />
            </div>

            {/* Receipt Upload */}
            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                Receipt Attachment
              </label>
              <div className="relative">
                <input
                  type="file"
                  id="receipt-file"
                  accept="image/*,application/pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <label
                  htmlFor="receipt-file"
                  className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm dark:border-slate-800 dark:bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <span className="text-slate-400 truncate max-w-xs">
                    {uploading ? 'Uploading...' : receiptUrl ? 'Receipt uploaded' : 'Select Receipt file'}
                  </span>
                  {receiptUrl ? (
                    <Check className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
                  ) : (
                    <Upload className="h-4.5 w-4.5 text-slate-400 shrink-0" />
                  )}
                </label>
              </div>
            </div>
          </div>

          {/* Form Actions */}
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
              disabled={uploading}
              className="rounded-xl bg-brand-500 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-brand-500/10 hover:bg-brand-600 disabled:opacity-50 transition-colors"
            >
              {transactionToEdit ? 'Save Changes' : 'Add Transaction'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

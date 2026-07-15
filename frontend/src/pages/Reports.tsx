import React, { useState } from 'react';
import api from '../utils/api';
import {
  FileText,
  Download,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';

export const Reports: React.FC = () => {
  const [format, setFormat] = useState<'pdf' | 'excel'>('pdf');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setDownloading(true);

    try {
      const response = await api.get('/reports/export', {
        params: {
          format,
          start_date: startDate ? new Date(startDate).toISOString() : undefined,
          end_date: endDate ? new Date(endDate).toISOString() : undefined,
        },
        responseType: 'blob',
      });

      const extension = format === 'pdf' ? 'pdf' : 'xlsx';
      const mime = format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

      const file = new Blob([response.data], { type: mime });
      const fileUrl = window.URL.createObjectURL(file);
      
      const link = document.createElement('a');
      link.href = fileUrl;
      link.setAttribute('download', `financial_statement_${new Date().toISOString().slice(0, 10)}.${extension}`);
      document.body.appendChild(link);
      
      link.click();
      link.remove();
    } catch (err: any) {
      setError('No transactions found in this date range to export.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">
          Financial Statements & Reports
        </h2>
        <p className="text-xs text-slate-450 dark:text-slate-400 mt-0.5">
          Generate print-ready statement PDFs or analytical spreadsheets for tax or auditing.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        
        {/* Export settings form */}
        <div className="glass-panel rounded-3xl p-6 shadow-lg">
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-brand-500" />
            <span>Generate Custom Statement</span>
          </h3>

          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 dark:bg-red-950/20 p-3 text-xs font-semibold text-red-500">
              <AlertCircle className="h-4.5 w-4.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleDownload} className="space-y-4">
            
            {/* Format selection */}
            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                Export Format
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setFormat('pdf')}
                  className={`flex-1 flex flex-col items-center justify-center rounded-2xl border p-4 text-center transition-all ${
                    format === 'pdf'
                      ? 'border-brand-500 bg-brand-50/50 text-brand-600 dark:bg-brand-950/20 dark:text-brand-400'
                      : 'border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-700'
                  }`}
                >
                  <FileText className="h-6 w-6 mb-1.5" />
                  <span className="text-xs font-bold">PDF Document</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormat('excel')}
                  className={`flex-1 flex flex-col items-center justify-center rounded-2xl border p-4 text-center transition-all ${
                    format === 'excel'
                      ? 'border-brand-500 bg-brand-50/50 text-brand-600 dark:bg-brand-950/20 dark:text-brand-400'
                      : 'border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-700'
                  }`}
                >
                  <FileSpreadsheet className="h-6 w-6 mb-1.5" />
                  <span className="text-xs font-bold">Excel Sheet</span>
                </button>
              </div>
            </div>

            {/* Date ranges */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                  Start Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-transparent px-3.5 py-2.5 text-xs dark:border-slate-800 focus:border-brand-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                  End Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-transparent px-3.5 py-2.5 text-xs dark:border-slate-800 focus:border-brand-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Download button */}
            <button
              type="submit"
              disabled={downloading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand-500 py-3 text-xs font-bold text-white shadow-md shadow-brand-500/10 hover:bg-brand-600 disabled:opacity-50 transition-colors"
            >
              <Download className="h-4.5 w-4.5" />
              <span>{downloading ? 'Downloading...' : 'Generate and Download'}</span>
            </button>
          </form>
        </div>

        {/* Info panel */}
        <div className="glass-panel rounded-3xl p-6 shadow-lg bg-brand-50/10 border-brand-100/50 dark:bg-brand-950/5 dark:border-brand-900/20 space-y-4">
          <h3 className="text-sm font-bold text-slate-850 dark:text-slate-200">
            Statement Metadata
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            The reports include total aggregates, category divisions, transaction priorities, and cumulative savings rates. Choose **Excel Sheet** if you want to perform manual analysis or pivot queries on the data. Choose **PDF Document** for sharing or printing a stylized statement.
          </p>
        </div>

      </div>

    </div>
  );
};

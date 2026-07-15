import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { formatCurrency } from '../utils/formatters';
import {
  Brain,
  TrendingUp,
  AlertTriangle,
  Lightbulb
} from 'lucide-react';

interface ForecastItem {
  category_name: string;
  predicted_amount: number;
  color: string;
  icon: string;
}

interface AnomalyItem {
  transaction_id: string;
  amount: number;
  date: string;
  category_name: string;
  color: string;
  merchant_name: string;
  reason: string;
  confidence: number;
}

interface HealthScoreReport {
  score: number;
  savings_rate_percent: number;
  breakdown: {
    savings_score: number;
    budget_compliance_score: number;
    priority_score: number;
  };
  recommendations: string[];
}

export const AIInsights: React.FC = () => {
  const [health, setHealth] = useState<HealthScoreReport | null>(null);
  const [forecasts, setForecasts] = useState<ForecastItem[]>([]);
  const [anomalies, setAnomalies] = useState<AnomalyItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAIInsights = async () => {
    setLoading(true);
    try {
      const [hRes, fRes, aRes] = await Promise.all([
        api.get('/ai/health-score'),
        api.get('/ai/forecast-spending'),
        api.get('/ai/anomalies'),
      ]);
      setHealth(hRes.data);
      setForecasts(fRes.data);
      setAnomalies(aRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAIInsights();
  }, []);

  if (loading || !health) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-6 w-32 bg-slate-200 dark:bg-slate-800 rounded" />
        <div className="glass-panel h-48 rounded-3xl" />
        <div className="grid gap-5 md:grid-cols-2">
          <div className="glass-panel h-80 rounded-2xl" />
          <div className="glass-panel h-80 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <Brain className="h-6 w-6 text-brand-500" />
          <span>AI Financial Insights</span>
        </h2>
        <p className="text-xs text-slate-450 dark:text-slate-400 mt-0.5">
          Predict future expenditures, identify transaction anomalies, and view recommendations.
        </p>
      </div>

      {/* Health Score Overview */}
      <div className="glass-panel rounded-3xl p-6 shadow-lg border-brand-100/50 dark:border-brand-900/30 bg-gradient-to-br from-white via-white to-brand-50/10 dark:from-brand-950/20 dark:to-brand-950/10">
        <div className="grid gap-6 md:grid-cols-3 items-center">
          
          {/* Dial */}
          <div className="flex flex-col items-center justify-center border-b border-slate-100 md:border-b-0 md:border-r pb-6 md:pb-0 md:pr-6 dark:border-slate-800">
            <span className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              Financial Score
            </span>
            <div className="relative flex h-28 w-28 items-center justify-center mt-3">
              <div className="absolute h-full w-full rounded-full border-4 border-slate-100 dark:border-slate-800" />
              <div className="text-center">
                <span className="text-4xl font-extrabold text-slate-850 dark:text-white">
                  {health.score}
                </span>
                <p className="text-[9px] font-bold text-slate-400">/ 100</p>
              </div>
            </div>
          </div>

          {/* Details / Advice */}
          <div className="md:col-span-2 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Financial Health Indicators & Recommendations
              </h3>
              <p className="text-xs text-slate-500 mt-1 dark:text-slate-450">
                Active savings rate stands at <strong>{health.savings_rate_percent}%</strong> this period.
              </p>
            </div>
            
            <div className="space-y-2">
              {health.recommendations.map((rec, idx) => (
                <div key={idx} className="flex gap-2 text-xs">
                  <div className="mt-0.5">
                    <Lightbulb className="h-4 w-4 text-amber-500 shrink-0" />
                  </div>
                  <span className="text-slate-655 dark:text-slate-350">{rec}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Predictions & Anomalies row */}
      <div className="grid gap-6 md:grid-cols-2">
        
        {/* Spending predictions */}
        <div className="glass-panel rounded-3xl p-6 shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-brand-500" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Next Month's Spend Predictions
            </h3>
          </div>

          {forecasts.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Log transactions to enable predictive analytics model forecasting.
            </div>
          ) : (
            <div className="space-y-4">
              {forecasts.map((f) => (
                <div key={f.category_name} className="flex items-center justify-between border-b border-slate-50 pb-3 dark:border-slate-800/50 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: f.color }}
                    />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate max-w-[150px]">
                      {f.category_name}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-extrabold text-slate-800 dark:text-white">
                      {formatCurrency(f.predicted_amount)}
                    </span>
                    <span className="block text-[9px] text-slate-450">predicted</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Anomalous transactions alerts */}
        <div className="glass-panel rounded-3xl p-6 shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Detected Expense Anomalies
            </h3>
          </div>

          {anomalies.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No anomalous spending patterns detected in your recent transaction history.
            </div>
          ) : (
            <div className="space-y-4">
              {anomalies.map((a) => (
                <div key={a.transaction_id} className="rounded-xl border border-slate-100 p-3 bg-slate-50/20 dark:border-slate-800/40 dark:bg-slate-800/10 space-y-2.5">
                  <div className="flex justify-between text-xs items-start">
                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[180px]">
                        {a.merchant_name}
                      </h4>
                      <p className="text-[10px] text-slate-400">{a.date} • {a.category_name}</p>
                    </div>
                    <span className="font-extrabold text-red-500 shrink-0">
                      {formatCurrency(a.amount)}
                    </span>
                  </div>
                  <p className="text-[10px] leading-snug text-slate-500 dark:text-slate-400">
                    {a.reason}
                  </p>
                  <div className="flex justify-between items-center text-[9px] font-bold text-slate-400">
                    <span>Anomaly Confidence Score</span>
                    <span className="text-red-500">{a.confidence}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
};

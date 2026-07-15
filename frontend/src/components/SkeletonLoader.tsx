import React from 'react';

export const CardSkeleton: React.FC = () => {
  return (
    <div className="glass-panel flex flex-col justify-between rounded-2xl p-5 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2.5 flex-1">
          <div className="h-3 w-16 bg-slate-200 dark:bg-slate-800 rounded" />
          <div className="h-6 w-28 bg-slate-200 dark:bg-slate-800 rounded" />
        </div>
        <div className="h-11 w-11 bg-slate-200 dark:bg-slate-800 rounded-xl" />
      </div>
      <div className="h-3 w-32 bg-slate-200 dark:bg-slate-800 rounded mt-4" />
    </div>
  );
};

export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* 4 Cards */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
      {/* Visual Chart area */}
      <div className="grid gap-5 md:grid-cols-3">
        <div className="glass-panel h-80 rounded-2xl p-5 animate-pulse md:col-span-2 bg-slate-50 dark:bg-brand-950/20" />
        <div className="glass-panel h-80 rounded-2xl p-5 animate-pulse bg-slate-50 dark:bg-brand-950/20" />
      </div>
    </div>
  );
};

export const TableSkeleton: React.FC = () => {
  return (
    <div className="glass-panel rounded-2xl p-5 animate-pulse space-y-4">
      <div className="flex items-center justify-between">
        <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded" />
        <div className="h-8 w-24 bg-slate-200 dark:bg-slate-800 rounded-xl" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex gap-4 items-center border-t border-slate-100 dark:border-slate-800 pt-3">
            <div className="h-8 w-8 bg-slate-200 dark:bg-slate-800 rounded-lg" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-1/3 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="h-2.5 w-1/4 bg-slate-200 dark:bg-slate-800 rounded" />
            </div>
            <div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
};

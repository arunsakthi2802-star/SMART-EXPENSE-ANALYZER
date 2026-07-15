import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  subValue?: string;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subValue,
  icon: Icon,
  iconColor,
  iconBg,
  trend,
}) => {
  return (
    <div className="glass-panel flex flex-col justify-between rounded-2xl p-5 shadow-lg shadow-slate-100/10 dark:shadow-black/20 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            {title}
          </span>
          <h3 className="text-2xl font-extrabold text-slate-800 dark:text-white mt-1">
            {value}
          </h3>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconBg} ${iconColor}`}>
          <Icon className="h-5.5 w-5.5" />
        </div>
      </div>
      {(trend || subValue) && (
        <div className="flex items-center gap-1.5 mt-4 text-[11px] font-medium">
          {trend ? (
            <>
              <span className={trend.isPositive ? 'text-emerald-500' : 'text-red-500'}>
                {trend.value}
              </span>
              <span className="text-slate-400">vs last month</span>
            </>
          ) : (
            <span className="text-slate-400 dark:text-slate-500">{subValue}</span>
          )}
        </div>
      )}
    </div>
  );
};

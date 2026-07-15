export interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'business' | 'admin';
  is_verified: boolean;
  profile_picture?: string;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  icon: string;
  color: string;
  user_id?: string;
  budget_limit?: number;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: 'income' | 'expense';
  amount: number;
  date: string;
  category_id: string;
  category_detail?: {
    id: string;
    name: string;
    icon: string;
    color: string;
    type: string;
  };
  description: string;
  tags: string[];
  payment_method: string;
  merchant_name: string;
  location: string;
  receipt_url: string;
  recurring_rule: string;
  priority: 'low' | 'medium' | 'high';
  created_at: string;
  updated_at: string;
}

export interface Budget {
  id: string;
  user_id: string;
  category_id?: string;
  category_detail?: {
    id: string;
    name: string;
    icon: string;
    color: string;
  };
  limit_amount: number;
  current_spend: number;
  period: string;
  alert_threshold: number;
  created_at: string;
}

export interface SavingsGoal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationAlert {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'budget_exceeded' | 'upcoming_bill' | 'savings_goal' | 'low_balance' | 'security_alert' | 'info';
  is_read: boolean;
  created_at: string;
}

export interface UserSettings {
  id: string;
  user_id: string;
  currency: string;
  theme: 'dark' | 'light';
  language: string;
  email_notifications: boolean;
  budget_alerts: boolean;
  weekly_summaries: boolean;
  updated_at: string;
}

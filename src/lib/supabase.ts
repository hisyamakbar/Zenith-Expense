import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project-url.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type User = {
  id: string;
  email?: string;
  default_currency_code: string;
  subscription_tier: 'basic' | 'pro';
  llm_uses_today: number;
  last_llm_reset_date: string;
  created_at: string;
};

export type Currency = {
  code: string;
  name: string;
  symbol: string;
  decimal_places: number;
};

export type Category = {
  id: number;
  user_id: string | null;
  name: string;
  is_default: boolean;
  created_at: string;
};

export type Expense = {
  id: number;
  user_id: string;
  category_id: number;
  item_service: string;
  amount: number;
  currency_code: string;
  expense_date: string;
  note?: string;
  created_at: string;
  category?: Category;
  // Fields for preserving conversion data at time of creation
  converted_amount?: number; // Amount in default currency at time of creation
  conversion_rate?: number; // Exchange rate used at time of creation
  conversion_date?: string; // Date when conversion was done
  manual_conversion?: boolean; // Whether conversion was manually adjusted
};

export type RecurringExpense = {
  id: number;
  user_id: string;
  category_id: number;
  item_service: string;
  amount: number;
  currency_code: string;
  frequency: string;
  start_date: string;
  next_due_date: string;
  end_date?: string;
  created_at: string;
};
/*
  # Create users table and related database objects

  1. New Tables
    - `users`
      - `id` (uuid, primary key, references auth.users)
      - `email` (text)
      - `default_currency_code` (text, default 'USD')
      - `subscription_tier` (text, default 'basic')
      - `llm_uses_today` (integer, default 0)
      - `last_llm_reset_date` (timestamp, default now())
      - `created_at` (timestamp, default now())
    - `currencies`
      - `code` (text, primary key)
      - `name` (text)
      - `symbol` (text)
      - `decimal_places` (integer, default 2)
    - `categories`
      - `id` (bigint, primary key)
      - `user_id` (uuid, nullable for default categories)
      - `name` (text)
      - `is_default` (boolean, default false)
      - `created_at` (timestamp, default now())
    - `expenses`
      - `id` (bigint, primary key)
      - `user_id` (uuid, references users)
      - `category_id` (bigint, references categories)
      - `item_service` (text)
      - `amount` (numeric)
      - `currency_code` (text, references currencies)
      - `expense_date` (date)
      - `note` (text, nullable)
      - `converted_amount` (numeric, nullable)
      - `conversion_rate` (numeric, nullable)
      - `conversion_date` (timestamp, nullable)
      - `manual_conversion` (boolean, default false)
      - `created_at` (timestamp, default now())
    - `recurring_expenses`
      - `id` (bigint, primary key)
      - `user_id` (uuid, references users)
      - `category_id` (bigint, references categories)
      - `item_service` (text)
      - `amount` (numeric)
      - `currency_code` (text, references currencies)
      - `frequency` (text)
      - `start_date` (date)
      - `next_due_date` (date)
      - `end_date` (date, nullable)
      - `created_at` (timestamp, default now())

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Allow public read access to currencies and default categories

  3. Default Data
    - Insert common currencies (USD, EUR, GBP, etc.)
    - Insert default expense categories
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  default_currency_code text DEFAULT 'USD',
  subscription_tier text DEFAULT 'basic' CHECK (subscription_tier IN ('basic', 'pro')),
  llm_uses_today integer DEFAULT 0,
  last_llm_reset_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create currencies table
CREATE TABLE IF NOT EXISTS currencies (
  code text PRIMARY KEY,
  name text NOT NULL,
  symbol text NOT NULL,
  decimal_places integer DEFAULT 2
);

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id bigint NOT NULL REFERENCES categories(id),
  item_service text NOT NULL,
  amount numeric(12,2) NOT NULL,
  currency_code text NOT NULL REFERENCES currencies(code),
  expense_date date NOT NULL,
  note text,
  converted_amount numeric(12,2),
  conversion_rate numeric(10,6),
  conversion_date timestamptz,
  manual_conversion boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create recurring_expenses table
CREATE TABLE IF NOT EXISTS recurring_expenses (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id bigint NOT NULL REFERENCES categories(id),
  item_service text NOT NULL,
  amount numeric(12,2) NOT NULL,
  currency_code text NOT NULL REFERENCES currencies(code),
  frequency text NOT NULL,
  start_date date NOT NULL,
  next_due_date date NOT NULL,
  end_date date,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_expenses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can read own profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- RLS Policies for currencies table (public read access)
CREATE POLICY "Anyone can read currencies"
  ON currencies
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- RLS Policies for categories table
CREATE POLICY "Users can read all categories"
  ON categories
  FOR SELECT
  TO authenticated
  USING (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY "Users can insert own categories"
  ON categories
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own categories"
  ON categories
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own categories"
  ON categories
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for expenses table
CREATE POLICY "Users can read own expenses"
  ON expenses
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own expenses"
  ON expenses
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own expenses"
  ON expenses
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own expenses"
  ON expenses
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for recurring_expenses table
CREATE POLICY "Users can read own recurring expenses"
  ON recurring_expenses
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own recurring expenses"
  ON recurring_expenses
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own recurring expenses"
  ON recurring_expenses
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own recurring expenses"
  ON recurring_expenses
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Insert default currencies
INSERT INTO currencies (code, name, symbol, decimal_places) VALUES
  ('USD', 'US Dollar', '$', 2),
  ('EUR', 'Euro', '€', 2),
  ('GBP', 'British Pound', '£', 2),
  ('JPY', 'Japanese Yen', '¥', 0),
  ('CAD', 'Canadian Dollar', 'C$', 2),
  ('AUD', 'Australian Dollar', 'A$', 2),
  ('CHF', 'Swiss Franc', 'CHF', 2),
  ('CNY', 'Chinese Yuan', '¥', 2),
  ('INR', 'Indian Rupee', '₹', 2),
  ('KRW', 'South Korean Won', '₩', 0)
ON CONFLICT (code) DO NOTHING;

-- Insert default categories
INSERT INTO categories (user_id, name, is_default) VALUES
  (NULL, 'Food & Dining', true),
  (NULL, 'Transportation', true),
  (NULL, 'Shopping', true),
  (NULL, 'Entertainment', true),
  (NULL, 'Bills & Utilities', true),
  (NULL, 'Healthcare', true),
  (NULL, 'Education', true),
  (NULL, 'Travel', true),
  (NULL, 'Personal Care', true),
  (NULL, 'Gifts & Donations', true),
  (NULL, 'Business', true),
  (NULL, 'Other', true)
ON CONFLICT DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category_id ON expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_recurring_expenses_user_id ON recurring_expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
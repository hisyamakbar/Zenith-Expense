/*
  # Create users table for user profiles

  1. New Tables
    - `users`
      - `id` (uuid, primary key, references auth.users)
      - `email` (text, unique)
      - `default_currency_code` (text, default 'USD')
      - `subscription_tier` (text, default 'basic')
      - `llm_uses_today` (integer, default 0)
      - `last_llm_reset_date` (date, default current date)
      - `created_at` (timestamp with time zone)

  2. Security
    - Enable RLS on `users` table
    - Add policies for authenticated users to manage their own data
*/

-- Create the users table
CREATE TABLE IF NOT EXISTS public.users (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email text UNIQUE,
  default_currency_code text NOT NULL DEFAULT 'USD',
  subscription_tier text NOT NULL DEFAULT 'basic',
  llm_uses_today integer NOT NULL DEFAULT 0,
  last_llm_reset_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Create an index on email for faster lookups
CREATE INDEX IF NOT EXISTS users_email_idx ON public.users(email);
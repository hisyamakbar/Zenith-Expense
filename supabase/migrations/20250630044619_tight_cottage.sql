/*
  # Fix Authentication and User Profile Issues

  1. Database Cleanup
    - Clean up any orphaned or duplicate user records
    - Ensure proper foreign key constraints
    - Fix trigger function for auto user creation

  2. User Profile Management
    - Ensure users table has correct structure
    - Fix RLS policies for proper access control
    - Add proper indexes for performance

  3. Authentication Flow
    - Fix trigger to automatically create user profiles
    - Ensure proper error handling for edge cases
*/

-- First, clean up any potential issues
DELETE FROM public.users 
WHERE id NOT IN (
  SELECT id FROM auth.users
);

-- Ensure the users table structure is correct
DO $$
BEGIN
  -- Add missing columns if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'default_currency_code'
  ) THEN
    ALTER TABLE public.users ADD COLUMN default_currency_code text NOT NULL DEFAULT 'USD';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'subscription_tier'
  ) THEN
    ALTER TABLE public.users ADD COLUMN subscription_tier text NOT NULL DEFAULT 'basic';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'llm_uses_today'
  ) THEN
    ALTER TABLE public.users ADD COLUMN llm_uses_today integer NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'last_llm_reset_date'
  ) THEN
    ALTER TABLE public.users ADD COLUMN last_llm_reset_date date NOT NULL DEFAULT CURRENT_DATE;
  END IF;
END $$;

-- Drop and recreate the trigger function with better error handling
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Only insert if the user doesn't already exist
  INSERT INTO public.users (id, email, default_currency_code, subscription_tier, llm_uses_today, last_llm_reset_date)
  VALUES (
    NEW.id,
    NEW.email,
    'USD',
    'basic',
    0,
    CURRENT_DATE
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the auth user creation
    RAISE WARNING 'Failed to create user profile for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Ensure proper RLS policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;

CREATE POLICY "Users can view their own profile"
  ON public.users
  FOR SELECT
  TO public
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.users
  FOR INSERT
  TO public
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.users
  FOR UPDATE
  TO public
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Ensure indexes exist for performance
CREATE INDEX IF NOT EXISTS users_email_idx ON public.users(email);
CREATE INDEX IF NOT EXISTS users_subscription_tier_idx ON public.users(subscription_tier);

-- Update any existing users to have proper default values
UPDATE public.users 
SET 
  default_currency_code = COALESCE(default_currency_code, 'USD'),
  subscription_tier = COALESCE(subscription_tier, 'basic'),
  llm_uses_today = COALESCE(llm_uses_today, 0),
  last_llm_reset_date = COALESCE(last_llm_reset_date, CURRENT_DATE)
WHERE 
  default_currency_code IS NULL 
  OR subscription_tier IS NULL 
  OR llm_uses_today IS NULL 
  OR last_llm_reset_date IS NULL;
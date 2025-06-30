/*
  # Fix User Profile Schema and Authentication Issues

  1. Database Schema Fixes
    - Ensure users table has proper constraints and relationships
    - Add proper indexes for performance
    - Fix any potential duplicate user issues

  2. Authentication Setup
    - Prepare for proper user profile creation
    - Ensure proper foreign key relationships

  3. Data Cleanup
    - Remove any duplicate or orphaned user records
    - Ensure data integrity
*/

-- First, let's clean up any potential duplicate or orphaned user records
DELETE FROM public.users 
WHERE id NOT IN (
  SELECT id FROM auth.users
);

-- Ensure the users table has the correct structure and constraints
DO $$
BEGIN
  -- Check if the foreign key constraint exists, if not add it
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'users_id_fkey' 
    AND table_name = 'users'
  ) THEN
    ALTER TABLE public.users 
    ADD CONSTRAINT users_id_fkey 
    FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Ensure proper indexes exist
CREATE INDEX IF NOT EXISTS users_email_idx ON public.users(email);

-- Create a function to automatically create user profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, default_currency_code, subscription_tier, llm_uses_today, last_llm_reset_date)
  VALUES (
    NEW.id,
    NEW.email,
    'USD',
    'basic',
    0,
    CURRENT_DATE
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the trigger if it exists and recreate it
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger to automatically create user profile when auth user is created
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Ensure RLS policies are correct
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;

-- Recreate RLS policies
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
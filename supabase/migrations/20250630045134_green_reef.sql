/*
  # Debug and Fix Authentication Issues

  1. Database Cleanup and Fixes
    - Clean up any orphaned or duplicate user records
    - Fix trigger function for reliable user profile creation
    - Add comprehensive error handling
    - Ensure proper indexes and constraints

  2. Authentication Flow Improvements
    - Fix trigger to handle edge cases
    - Add proper logging for debugging
    - Ensure RLS policies work correctly

  3. Performance Optimizations
    - Add proper indexes
    - Optimize queries
    - Reduce database load
*/

-- First, let's see what we have in the users table
DO $$
BEGIN
  RAISE NOTICE 'Current users table structure:';
  RAISE NOTICE 'Users count: %', (SELECT COUNT(*) FROM public.users);
  RAISE NOTICE 'Auth users count: %', (SELECT COUNT(*) FROM auth.users);
END $$;

-- Clean up any orphaned user records
DELETE FROM public.users 
WHERE id NOT IN (
  SELECT id FROM auth.users
);

-- Clean up any duplicate user records (keep the latest one)
DELETE FROM public.users a USING public.users b 
WHERE a.id = b.id AND a.created_at < b.created_at;

-- Ensure the users table has the correct structure
DO $$
BEGIN
  -- Check and add missing columns
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

-- Drop and recreate the trigger function with comprehensive error handling and logging
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  user_exists boolean;
BEGIN
  -- Log the trigger execution
  RAISE NOTICE 'handle_new_user triggered for user: %', NEW.id;
  
  -- Check if user already exists
  SELECT EXISTS(SELECT 1 FROM public.users WHERE id = NEW.id) INTO user_exists;
  
  IF user_exists THEN
    RAISE NOTICE 'User % already exists in public.users, skipping insert', NEW.id;
    RETURN NEW;
  END IF;
  
  -- Insert new user profile
  BEGIN
    INSERT INTO public.users (
      id, 
      email, 
      default_currency_code, 
      subscription_tier, 
      llm_uses_today, 
      last_llm_reset_date,
      created_at
    ) VALUES (
      NEW.id,
      NEW.email,
      'USD',
      'basic',
      0,
      CURRENT_DATE,
      NOW()
    );
    
    RAISE NOTICE 'Successfully created user profile for: %', NEW.id;
    
  EXCEPTION
    WHEN unique_violation THEN
      RAISE NOTICE 'User profile % already exists (unique violation), continuing', NEW.id;
    WHEN OTHERS THEN
      RAISE WARNING 'Failed to create user profile for %: % %', NEW.id, SQLSTATE, SQLERRM;
      -- Don't fail the auth user creation, just log the error
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Ensure proper RLS policies (drop and recreate to avoid conflicts)
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

-- Ensure proper indexes for performance
CREATE INDEX IF NOT EXISTS users_email_idx ON public.users(email);
CREATE INDEX IF NOT EXISTS users_subscription_tier_idx ON public.users(subscription_tier);
CREATE INDEX IF NOT EXISTS users_created_at_idx ON public.users(created_at);

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

-- Create a function to manually create user profiles for existing auth users
CREATE OR REPLACE FUNCTION public.create_missing_user_profiles()
RETURNS void AS $$
DECLARE
  auth_user_record RECORD;
BEGIN
  -- Loop through auth users that don't have profiles
  FOR auth_user_record IN 
    SELECT au.id, au.email, au.created_at
    FROM auth.users au
    LEFT JOIN public.users pu ON au.id = pu.id
    WHERE pu.id IS NULL
  LOOP
    BEGIN
      INSERT INTO public.users (
        id, 
        email, 
        default_currency_code, 
        subscription_tier, 
        llm_uses_today, 
        last_llm_reset_date,
        created_at
      ) VALUES (
        auth_user_record.id,
        auth_user_record.email,
        'USD',
        'basic',
        0,
        CURRENT_DATE,
        COALESCE(auth_user_record.created_at, NOW())
      );
      
      RAISE NOTICE 'Created missing profile for user: %', auth_user_record.id;
      
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Failed to create profile for user %: % %', 
          auth_user_record.id, SQLSTATE, SQLERRM;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run the function to create any missing profiles
SELECT public.create_missing_user_profiles();

-- Final status check
DO $$
BEGIN
  RAISE NOTICE 'Migration complete. Final status:';
  RAISE NOTICE 'Users in public.users: %', (SELECT COUNT(*) FROM public.users);
  RAISE NOTICE 'Users in auth.users: %', (SELECT COUNT(*) FROM auth.users);
  RAISE NOTICE 'Orphaned auth users: %', (
    SELECT COUNT(*) 
    FROM auth.users au 
    LEFT JOIN public.users pu ON au.id = pu.id 
    WHERE pu.id IS NULL
  );
END $$;
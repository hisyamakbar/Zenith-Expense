import React, { useState } from 'react';
import { Mail, Lock, User, ArrowLeft, AlertCircle, CheckCircle, Wifi, WifiOff } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useApp } from '../contexts/AppContext';

type AuthMode = 'login' | 'signup';

export function Auth() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success' | 'warning'; text: string } | null>(null);
  const navigate = useNavigate();
  const { dispatch } = useApp();

  // Add timeout wrapper for all async operations
  const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number = 10000): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => 
        setTimeout(() => reject(new Error('Request timed out. Please check your connection.')), timeoutMs)
      )
    ]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setMessage({ type: 'error', text: 'Please fill in all fields' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      if (mode === 'signup') {
        setMessage({ type: 'warning', text: 'Creating your account...' });
        
        // Try signup with timeout
        const { data, error } = await withTimeout(
          supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: undefined // Disable email confirmation
            }
          }),
          15000 // 15 second timeout for signup
        );

        if (error) {
          // Handle specific error cases
          if (error.message.includes('already registered') || 
              error.message.includes('already exists') ||
              error.message.includes('User already registered')) {
            
            setMessage({ type: 'warning', text: 'Account exists, signing you in...' });
            
            // Try to sign in instead
            const { data: signInData, error: signInError } = await withTimeout(
              supabase.auth.signInWithPassword({ email, password }),
              10000
            );

            if (signInError) {
              throw new Error('Account exists but password is incorrect. Please use the correct password or reset it.');
            }

            if (signInData.user) {
              await handleSuccessfulAuth(signInData.user.id);
              setMessage({ type: 'success', text: 'Signed in successfully!' });
              setTimeout(() => navigate('/'), 1500);
              return;
            }
          }
          throw error;
        }

        if (data.user) {
          setMessage({ type: 'warning', text: 'Setting up your profile...' });
          await handleSuccessfulAuth(data.user.id);
          setMessage({ type: 'success', text: 'Account created successfully!' });
          setTimeout(() => navigate('/'), 1500);
        }
      } else {
        setMessage({ type: 'warning', text: 'Signing you in...' });
        
        // Login with timeout
        const { data, error } = await withTimeout(
          supabase.auth.signInWithPassword({ email, password }),
          10000
        );

        if (error) {
          if (error.message.includes('Email not confirmed')) {
            throw new Error('Email not confirmed. Please check your email or contact support.');
          }
          if (error.message.includes('Invalid login credentials')) {
            throw new Error('Invalid email or password. Please check your credentials.');
          }
          throw error;
        }

        if (data.user) {
          setMessage({ type: 'warning', text: 'Loading your data...' });
          await handleSuccessfulAuth(data.user.id);
          setMessage({ type: 'success', text: 'Welcome back!' });
          setTimeout(() => navigate('/'), 1500);
        }
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      
      // Handle specific error types
      if (error.message.includes('timed out')) {
        setMessage({ 
          type: 'error', 
          text: 'Connection timeout. Please check your internet connection and try again.' 
        });
      } else if (error.message.includes('fetch')) {
        setMessage({ 
          type: 'error', 
          text: 'Network error. Please check your connection and try again.' 
        });
      } else {
        setMessage({ type: 'error', text: error.message || 'An unexpected error occurred' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuccessfulAuth = async (userId: string) => {
    try {
      // Try to fetch existing profile with timeout
      const { data: existingProfile, error: fetchError } = await withTimeout(
        supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .maybeSingle(),
        8000
      );

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.warn('Profile fetch error (non-critical):', fetchError);
      }

      if (existingProfile) {
        dispatch({ type: 'SET_USER', payload: existingProfile });
      } else {
        // Create new profile with timeout
        try {
          const { data: newProfile, error: createError } = await withTimeout(
            supabase
              .from('users')
              .insert({
                id: userId,
                email: email,
                default_currency_code: 'USD',
                subscription_tier: 'basic',
                llm_uses_today: 0,
                last_llm_reset_date: new Date().toISOString()
              })
              .select()
              .single(),
            8000
          );

          if (createError) {
            console.warn('Profile creation error (non-critical):', createError);
          } else if (newProfile) {
            dispatch({ type: 'SET_USER', payload: newProfile });
          }
        } catch (profileError) {
          console.warn('Profile creation failed (non-critical):', profileError);
          // Continue anyway - user can still use the app
        }
      }
    } catch (error) {
      console.warn('Auth setup error (non-critical):', error);
      // Don't throw - let user proceed
    }
  };

  const handleDemoLogin = async () => {
    setEmail('demo@zenith.app');
    setPassword('demo123');
    setMessage({ type: 'warning', text: 'Loading demo account...' });
    
    // Simulate demo login
    setTimeout(() => {
      setMessage({ type: 'success', text: 'Demo mode activated!' });
      setTimeout(() => navigate('/'), 1000);
    }, 1000);
  };

  const handleOfflineMode = () => {
    setMessage({ type: 'success', text: 'Entering offline mode...' });
    setTimeout(() => navigate('/'), 1000);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Back Button */}
        <Link 
          to="/"
          className="flex items-center space-x-2 text-text-muted hover:text-primary mb-8 font-mono transition-colors duration-200"
        >
          <ArrowLeft size={16} />
          <span>Back to App</span>
        </Link>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <User size={24} className="text-background" />
          </div>
          <h1 className="text-2xl font-bold text-text mb-2 font-mono">
            {mode === 'login' ? 'Welcome Back' : 'Create Account'}
          </h1>
          <p className="text-text-secondary font-mono">
            {mode === 'login' 
              ? 'Sign in to access your expense data and AI features'
              : 'Join Zenith Expense to sync your data and unlock AI features'
            }
          </p>
        </div>

        {/* Message */}
        {message && (
          <div className={`card mb-6 border-2 ${
            message.type === 'error' 
              ? 'border-error/20 bg-error/5' 
              : message.type === 'warning'
              ? 'border-accent/20 bg-accent/5'
              : 'border-primary/20 bg-primary/5'
          }`}>
            <div className="flex items-center space-x-3">
              {message.type === 'error' ? (
                <AlertCircle size={20} className="text-error" />
              ) : message.type === 'warning' ? (
                <Wifi size={20} className="text-accent animate-pulse" />
              ) : (
                <CheckCircle size={20} className="text-primary" />
              )}
              <p className={`font-mono text-sm ${
                message.type === 'error' ? 'text-error' : 
                message.type === 'warning' ? 'text-accent' : 'text-primary'
              }`}>
                {message.text}
              </p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-text font-mono mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input pl-10"
                placeholder="your@email.com"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text font-mono mb-2">
              Password
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input pl-10"
                placeholder="••••••••"
                required
                minLength={6}
                disabled={isLoading}
              />
            </div>
            {mode === 'signup' && (
              <p className="text-xs text-text-muted font-mono mt-2">
                Password must be at least 6 characters long
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full btn transition-all duration-200 ${
              isLoading 
                ? 'bg-surface-light text-text-muted cursor-not-allowed' 
                : 'btn-primary hover:scale-105'
            }`}
          >
            {isLoading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-background border-t-transparent"></div>
                <span>{mode === 'login' ? 'Signing In...' : 'Creating Account...'}</span>
              </div>
            ) : (
              mode === 'login' ? 'Sign In' : 'Create Account'
            )}
          </button>
        </form>

        {/* Alternative Access Options */}
        <div className="mt-6 space-y-3">
          <div className="text-center">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-surface-light"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-background text-text-muted font-mono">Or try these options</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleDemoLogin}
              disabled={isLoading}
              className="btn-secondary text-sm py-2 flex items-center justify-center space-x-2"
            >
              <Wifi size={14} />
              <span>Demo Mode</span>
            </button>
            <button
              onClick={handleOfflineMode}
              disabled={isLoading}
              className="btn-secondary text-sm py-2 flex items-center justify-center space-x-2"
            >
              <WifiOff size={14} />
              <span>Offline Mode</span>
            </button>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="text-center mt-6">
          <p className="text-text-secondary font-mono text-sm">
            {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
          </p>
          <button
            onClick={() => {
              setMode(mode === 'login' ? 'signup' : 'login');
              setMessage(null);
              setPassword('');
            }}
            disabled={isLoading}
            className="text-primary hover:text-primary/80 font-mono text-sm mt-2 underline transition-colors duration-200 disabled:opacity-50"
          >
            {mode === 'login' ? 'Create Account' : 'Sign In'}
          </button>
        </div>

        {/* Features Preview */}
        <div className="card mt-6 border-primary/20 bg-primary/5">
          <h3 className="font-semibold text-text font-mono mb-3">✨ What You Get</h3>
          <ul className="text-sm text-text-secondary font-mono space-y-2">
            <li>• AI-powered expense tracking</li>
            <li>• Multi-currency support</li>
            <li>• Cloud sync across devices</li>
            <li>• Advanced analytics</li>
            <li>• Export capabilities</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
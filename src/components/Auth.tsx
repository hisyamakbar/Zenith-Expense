import React, { useState } from 'react';
import { Mail, Lock, User, ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useApp } from '../contexts/AppContext';

type AuthMode = 'login' | 'signup';

export function Auth() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const navigate = useNavigate();
  const { dispatch } = useApp();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      if (mode === 'signup') {
        // First try to sign up
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: undefined // Disable email confirmation
          }
        });

        if (error) {
          // If signup fails due to user already existing, try to sign in instead
          if (error.message.includes('already registered') || error.message.includes('already exists')) {
            setMessage({ 
              type: 'error', 
              text: 'Account already exists. Trying to sign you in...' 
            });
            
            // Automatically try to sign in
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
              email,
              password
            });

            if (signInError) {
              throw new Error('Account exists but password is incorrect. Please try logging in.');
            }

            if (signInData.user) {
              await handleSuccessfulAuth(signInData.user.id);
              setMessage({ type: 'success', text: 'Signed in successfully!' });
              setTimeout(() => navigate('/'), 1000);
              return;
            }
          }
          throw error;
        }

        if (data.user) {
          // If signup successful, create profile and sign in
          await handleSuccessfulAuth(data.user.id);
          setMessage({ type: 'success', text: 'Account created and signed in successfully!' });
          setTimeout(() => navigate('/'), 1000);
        }
      } else {
        // Login mode
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) {
          if (error.message.includes('Email not confirmed')) {
            throw new Error('Please check your email and click the confirmation link, or contact support if you need help.');
          }
          throw error;
        }

        if (data.user) {
          await handleSuccessfulAuth(data.user.id);
          setMessage({ type: 'success', text: 'Signed in successfully!' });
          setTimeout(() => navigate('/'), 1000);
        }
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      setMessage({ type: 'error', text: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuccessfulAuth = async (userId: string) => {
    try {
      // Try to fetch existing profile
      const { data: existingProfile, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching profile:', fetchError);
      }

      if (existingProfile) {
        // Profile exists, use it
        dispatch({ type: 'SET_USER', payload: existingProfile });
      } else {
        // Create new profile
        const { data: newProfile, error: createError } = await supabase
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
          .single();

        if (createError) {
          console.error('Error creating profile:', createError);
          // Don't throw error, just log it - user can still use the app
        } else if (newProfile) {
          dispatch({ type: 'SET_USER', payload: newProfile });
        }
      }
    } catch (error) {
      console.error('Error handling auth:', error);
      // Don't throw - let user proceed even if profile creation fails
    }
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
              : 'border-primary/20 bg-primary/5'
          }`}>
            <div className="flex items-center space-x-3">
              {message.type === 'error' ? (
                <AlertCircle size={20} className="text-error" />
              ) : (
                <CheckCircle size={20} className="text-primary" />
              )}
              <p className={`font-mono text-sm ${
                message.type === 'error' ? 'text-error' : 'text-primary'
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

        {/* Quick Demo Access */}
        <div className="card mt-8 border-accent/20 bg-accent/5">
          <div className="text-center">
            <h3 className="font-semibold text-text font-mono mb-2">
              🚀 Quick Demo Access
            </h3>
            <p className="text-text-secondary font-mono text-sm mb-4">
              Use demo credentials to try the app instantly:
            </p>
            <div className="space-y-2 text-sm font-mono">
              <p className="text-text">Email: <span className="text-accent">demo@zenith.app</span></p>
              <p className="text-text">Password: <span className="text-accent">demo123</span></p>
            </div>
          </div>
        </div>

        {/* Features Preview */}
        <div className="card mt-6 border-primary/20 bg-primary/5">
          <h3 className="font-semibold text-text font-mono mb-3">✨ Premium Features</h3>
          <ul className="text-sm text-text-secondary font-mono space-y-2">
            <li>• AI-powered expense tracking with natural language</li>
            <li>• Multi-device sync and cloud backup</li>
            <li>• Advanced analytics and spending insights</li>
            <li>• Unlimited custom categories</li>
            <li>• Export data in multiple formats</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
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
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;

        if (data.user && data.session) {
          // Email confirmation is disabled, user is automatically signed in
          setMessage({ type: 'success', text: 'Account created successfully! You are now logged in.' });
          
          // The database trigger should have created the user profile automatically
          // Let's fetch it to make sure
          const { data: profile, error: profileError } = await supabase
            .from('users')
            .select('*')
            .eq('id', data.user.id)
            .maybeSingle();

          if (profileError) {
            console.error('Error fetching user profile:', profileError);
          }

          if (profile) {
            dispatch({ type: 'SET_USER', payload: profile });
          } else {
            // Fallback: create profile if trigger didn't work
            console.log('Creating user profile as fallback...');
            const { data: newProfile, error: createError } = await supabase
              .from('users')
              .insert({
                id: data.user.id,
                email: data.user.email,
                default_currency_code: 'USD',
                subscription_tier: 'basic',
                llm_uses_today: 0,
                last_llm_reset_date: new Date().toISOString().split('T')[0]
              })
              .select()
              .single();

            if (createError) {
              console.error('Error creating user profile:', createError);
            } else if (newProfile) {
              dispatch({ type: 'SET_USER', payload: newProfile });
            }
          }

          setTimeout(() => navigate('/'), 1500);
        } else if (data.user && !data.session) {
          // This shouldn't happen if email confirmation is disabled, but handle it just in case
          setMessage({ 
            type: 'error', 
            text: 'Account created but automatic sign-in failed. Please try signing in manually.' 
          });
          setMode('login');
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        if (data.user && data.session) {
          // Fetch user profile
          const { data: profile, error: profileError } = await supabase
            .from('users')
            .select('*')
            .eq('id', data.user.id)
            .maybeSingle();

          if (profileError) {
            console.error('Error fetching user profile:', profileError);
          }

          if (profile) {
            dispatch({ type: 'SET_USER', payload: profile });
          } else {
            // Profile doesn't exist, create it (shouldn't happen with trigger, but fallback)
            console.log('Creating missing user profile...');
            const { data: newProfile, error: createError } = await supabase
              .from('users')
              .insert({
                id: data.user.id,
                email: data.user.email,
                default_currency_code: 'USD',
                subscription_tier: 'basic',
                llm_uses_today: 0,
                last_llm_reset_date: new Date().toISOString().split('T')[0]
              })
              .select()
              .single();

            if (createError) {
              console.error('Error creating user profile:', createError);
            } else if (newProfile) {
              dispatch({ type: 'SET_USER', payload: newProfile });
            }
          }

          setMessage({ type: 'success', text: 'Logged in successfully!' });
          setTimeout(() => navigate('/'), 1500);
        }
      }
    } catch (error: any) {
      console.error('Authentication error:', error);
      
      // Handle specific error cases
      if (error.message?.includes('Invalid login credentials')) {
        setMessage({ 
          type: 'error', 
          text: 'Invalid email or password. Please check your credentials and try again.' 
        });
      } else if (error.message?.includes('User already registered')) {
        setMessage({ 
          type: 'error', 
          text: 'An account with this email already exists. Please sign in instead.' 
        });
        setMode('login');
      } else if (error.message?.includes('Password should be at least')) {
        setMessage({ 
          type: 'error', 
          text: 'Password must be at least 6 characters long.' 
        });
      } else {
        setMessage({ type: 'error', text: error.message || 'An unexpected error occurred.' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Back Button */}
        <Link 
          to="/"
          className="flex items-center space-x-2 text-text-muted hover:text-primary mb-8 font-mono"
        >
          <ArrowLeft size={16} />
          <span>Back to App</span>
        </Link>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <User size={24} className="text-background" />
          </div>
          <h1 className="text-2xl font-bold text-text font-mono mb-2">
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
            className={`w-full btn ${
              isLoading 
                ? 'bg-surface-light text-text-muted cursor-not-allowed' 
                : 'btn-primary'
            }`}
          >
            {isLoading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-text-muted border-t-transparent"></div>
                <span>{mode === 'login' ? 'Signing In...' : 'Creating Account...'}</span>
              </div>
            ) : (
              mode === 'login' ? 'Sign In' : 'Create Account'
            )}
          </button>
        </form>

        {/* Toggle Mode */}
        <div className="text-center mt-6">
          <p className="text-text-secondary font-mono text-sm">
            {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
          </p>
          <button
            onClick={() => {
              setMode(mode === 'login' ? 'signup' : 'login');
              setMessage(null);
            }}
            className="text-primary hover:text-primary/80 font-mono text-sm mt-1"
          >
            {mode === 'login' ? 'Create Account' : 'Sign In'}
          </button>
        </div>

        {/* Features Preview */}
        <div className="card mt-8 border-accent/20 bg-accent/5">
          <h3 className="font-semibold text-text font-mono mb-3">✨ Premium Features</h3>
          <ul className="text-sm text-text-secondary font-mono space-y-2">
            <li>• AI-powered expense tracking with natural language</li>
            <li>• Multi-currency support with real-time conversion</li>
            <li>• Cloud sync across all your devices</li>
            <li>• Advanced analytics and spending insights</li>
            <li>• Unlimited custom categories (Pro plan)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
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

  const createUserProfile = async (userId: string, userEmail: string) => {
    try {
      // First check if profile already exists
      const { data: existingProfile } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (existingProfile) {
        return existingProfile;
      }

      // Create new profile
      const { data: newProfile, error: createError } = await supabase
        .from('users')
        .insert({
          id: userId,
          email: userEmail,
          default_currency_code: 'USD',
          subscription_tier: 'basic',
          llm_uses_today: 0,
          last_llm_reset_date: new Date().toISOString().split('T')[0]
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating user profile:', createError);
        throw createError;
      }

      return newProfile;
    } catch (error) {
      console.error('Error in createUserProfile:', error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    // Basic validation
    if (!email.trim() || !password.trim()) {
      setMessage({ type: 'error', text: 'Please fill in all fields.' });
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters long.' });
      setIsLoading(false);
      return;
    }

    try {
      if (mode === 'signup') {
        // Sign up new user
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: undefined // Disable email confirmation redirect
          }
        });

        if (signUpError) {
          throw signUpError;
        }

        if (!signUpData.user) {
          throw new Error('Failed to create user account');
        }

        // Check if user needs email confirmation
        if (!signUpData.session && signUpData.user && !signUpData.user.email_confirmed_at) {
          setMessage({ 
            type: 'success', 
            text: 'Account created! Please check your email for confirmation, then sign in.' 
          });
          setMode('login');
          setIsLoading(false);
          return;
        }

        // If we have a session, the user is automatically signed in
        if (signUpData.session && signUpData.user) {
          try {
            const profile = await createUserProfile(signUpData.user.id, signUpData.user.email || email);
            dispatch({ type: 'SET_USER', payload: profile });
            setMessage({ type: 'success', text: 'Account created successfully! Redirecting...' });
            
            // Small delay to show success message
            setTimeout(() => {
              navigate('/');
            }, 1000);
          } catch (profileError) {
            console.error('Profile creation error:', profileError);
            setMessage({ 
              type: 'error', 
              text: 'Account created but there was an issue setting up your profile. Please try signing in.' 
            });
            setMode('login');
          }
        } else {
          setMessage({ 
            type: 'success', 
            text: 'Account created! Please check your email for confirmation, then sign in.' 
          });
          setMode('login');
        }
      } else {
        // Sign in existing user
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (signInError) {
          throw signInError;
        }

        if (!signInData.user || !signInData.session) {
          throw new Error('Failed to sign in');
        }

        // The AppContext will handle fetching/creating the user profile
        // via the auth state change listener
        setMessage({ type: 'success', text: 'Signed in successfully! Redirecting...' });
        
        // Small delay to show success message
        setTimeout(() => {
          navigate('/');
        }, 1000);
      }
    } catch (error: any) {
      console.error('Authentication error:', error);
      
      // Handle specific error cases with more user-friendly messages
      let errorMessage = 'An unexpected error occurred. Please try again.';
      
      if (error.message?.includes('Invalid login credentials')) {
        errorMessage = mode === 'login' 
          ? 'Invalid email or password. Please check your credentials and try again.'
          : 'Unable to create account. Please check your email and password.';
      } else if (error.message?.includes('User already registered')) {
        errorMessage = 'An account with this email already exists. Please sign in instead.';
        setMode('login');
      } else if (error.message?.includes('Password should be at least')) {
        errorMessage = 'Password must be at least 6 characters long.';
      } else if (error.message?.includes('Unable to validate email address')) {
        errorMessage = 'Please enter a valid email address.';
      } else if (error.message?.includes('Email not confirmed')) {
        errorMessage = 'Please check your email and click the confirmation link before signing in.';
      } else if (error.message?.includes('Too many requests')) {
        errorMessage = 'Too many attempts. Please wait a moment before trying again.';
      } else if (error.message?.includes('signup is disabled')) {
        errorMessage = 'New registrations are currently disabled. Please contact support.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const handleModeSwitch = () => {
    setMode(mode === 'login' ? 'signup' : 'login');
    setMessage(null);
    setEmail('');
    setPassword('');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Back Button */}
        <Link 
          to="/"
          className="flex items-center space-x-2 text-text-muted hover:text-primary mb-8 font-mono transition-colors"
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
                disabled={isLoading}
                autoComplete={mode === 'login' ? 'email' : 'username'}
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
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
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
            disabled={isLoading || !email.trim() || !password.trim()}
            className={`w-full btn transition-all duration-200 ${
              isLoading || !email.trim() || !password.trim()
                ? 'bg-surface-light text-text-muted cursor-not-allowed' 
                : 'btn-primary hover:scale-[1.02]'
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
            onClick={handleModeSwitch}
            disabled={isLoading}
            className="text-primary hover:text-primary/80 font-mono text-sm mt-1 transition-colors disabled:opacity-50"
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
import React, { useState, useEffect } from 'react';
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
  const { state, dispatch } = useApp();

  // Debug: Log current auth state
  useEffect(() => {
    console.log('🔍 Auth component state:', {
      isAuthenticated: state.isAuthenticated,
      user: state.user?.email,
      isLoading: state.isLoading,
      authError: state.authError
    });
  }, [state]);

  // Auto redirect if already authenticated
  useEffect(() => {
    if (state.isAuthenticated && state.user && !state.isLoading) {
      console.log('🔄 Already authenticated, redirecting...');
      navigate('/');
    }
  }, [state.isAuthenticated, state.user, state.isLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    // Clear any existing auth errors
    dispatch({ type: 'SET_AUTH_ERROR', payload: null });

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

    // Set a timeout to prevent infinite loading
    const authTimeout = setTimeout(() => {
      setIsLoading(false);
      setMessage({ type: 'error', text: 'Authentication timeout. Please try again.' });
    }, 15000); // 15 second timeout

    try {
      console.log(`🔐 Starting ${mode} for:`, email);

      if (mode === 'signup') {
        // Sign up new user
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: undefined // Disable email confirmation redirect
          }
        });

        clearTimeout(authTimeout);

        if (signUpError) {
          throw signUpError;
        }

        if (!signUpData.user) {
          throw new Error('Failed to create user account');
        }

        console.log('✅ Signup successful:', signUpData.user.id);

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
          setMessage({ type: 'success', text: 'Account created successfully! Redirecting...' });
          
          // The AppContext auth listener will handle profile creation and navigation
          setTimeout(() => {
            if (!state.isAuthenticated) {
              console.log('🔄 Manual redirect after signup');
              navigate('/');
            }
          }, 2000);
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

        clearTimeout(authTimeout);

        if (signInError) {
          throw signInError;
        }

        if (!signInData.user || !signInData.session) {
          throw new Error('Failed to sign in');
        }

        console.log('✅ Signin successful:', signInData.user.id);

        setMessage({ type: 'success', text: 'Signed in successfully! Redirecting...' });
        
        // The AppContext auth listener will handle profile fetching and navigation
        setTimeout(() => {
          if (!state.isAuthenticated) {
            console.log('🔄 Manual redirect after signin');
            navigate('/');
          }
        }, 2000);
      }
    } catch (error: any) {
      clearTimeout(authTimeout);
      console.error('❌ Authentication error:', error);
      
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
      } else if (error.message?.includes('Network request failed')) {
        errorMessage = 'Network error. Please check your internet connection and try again.';
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

  // Show loading state if app is still initializing
  if (state.isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
          </div>
          <h2 className="text-xl font-bold text-text font-mono mb-2">
            Loading...
          </h2>
          <p className="text-text-secondary font-mono">
            Initializing application
          </p>
        </div>
      </div>
    );
  }

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

        {/* Auth Error from AppContext */}
        {state.authError && (
          <div className="card mb-6 border-2 border-error/20 bg-error/5">
            <div className="flex items-center space-x-3">
              <AlertCircle size={20} className="text-error" />
              <p className="font-mono text-sm text-error">
                {state.authError}
              </p>
            </div>
          </div>
        )}

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

        {/* Debug Info (only in development) */}
        {import.meta.env.DEV && (
          <div className="mt-8 p-4 bg-surface-light rounded-lg">
            <h4 className="text-xs font-mono text-text-muted mb-2">Debug Info:</h4>
            <pre className="text-xs font-mono text-text-muted">
              {JSON.stringify({
                isAuthenticated: state.isAuthenticated,
                hasUser: !!state.user,
                userEmail: state.user?.email,
                isLoading: state.isLoading,
                authError: state.authError
              }, null, 2)}
            </pre>
          </div>
        )}

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
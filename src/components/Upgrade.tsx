import React, { useState } from 'react';
import { 
  Sparkles, 
  Check, 
  ArrowLeft, 
  Zap, 
  Shield, 
  BarChart3,
  Users,
  Download,
  Clock
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { STRIPE_PRODUCTS } from '../stripe-config';
import { supabase } from '../lib/supabase';

export function Upgrade() {
  const { state } = useApp();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const proProduct = STRIPE_PRODUCTS.find(p => p.name === 'Pro');

  const handleUpgrade = async () => {
    if (!state.isAuthenticated || !proProduct) {
      setError('Please sign in to upgrade your account');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session found');
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          price_id: proProduct.priceId,
          mode: proProduct.mode,
          success_url: `${window.location.origin}/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${window.location.origin}/upgrade`,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const { url } = await response.json();
      
      if (url) {
        window.location.href = url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error: any) {
      console.error('Upgrade error:', error);
      setError(error.message || 'Failed to start upgrade process');
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    {
      icon: Zap,
      title: 'Unlimited AI Interactions',
      description: 'No daily limits on AI-powered expense tracking and insights',
      basic: '3 per day',
      pro: 'Unlimited'
    },
    {
      icon: BarChart3,
      title: 'Advanced Analytics',
      description: 'Detailed spending patterns, trends, and predictive insights',
      basic: 'Basic charts',
      pro: 'Advanced analytics'
    },
    {
      icon: Users,
      title: 'Custom Categories',
      description: 'Create unlimited custom expense categories for better organization',
      basic: '2 custom',
      pro: 'Unlimited'
    },
    {
      icon: Shield,
      title: 'Priority Support',
      description: 'Get help faster with priority customer support',
      basic: 'Community',
      pro: 'Priority support'
    },
    {
      icon: Download,
      title: 'Data Export',
      description: 'Export your data in multiple formats (CSV, PDF, Excel)',
      basic: 'Not available',
      pro: 'Full export'
    },
    {
      icon: Clock,
      title: 'Early Access',
      description: 'Be the first to try new features and improvements',
      basic: 'Standard releases',
      pro: 'Early access'
    }
  ];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <Link 
          to="/"
          className="flex items-center space-x-2 text-text-muted hover:text-primary mb-8 font-mono"
        >
          <ArrowLeft size={16} />
          <span>Back to Dashboard</span>
        </Link>

        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Sparkles size={32} className="text-background" />
          </div>
          <h1 className="text-3xl font-bold text-text font-mono mb-4">
            Upgrade to Pro
          </h1>
          <p className="text-text-secondary font-mono text-lg max-w-2xl mx-auto">
            Unlock the full potential of Zenith Expense with unlimited AI interactions, 
            advanced analytics, and premium features.
          </p>
        </div>

        {/* Current Plan Status */}
        {state.isAuthenticated && (
          <div className="card mb-8 border-accent/20 bg-accent/5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-text font-mono">Current Plan</h3>
                <p className="text-text-secondary font-mono text-sm">
                  {state.user?.subscription_tier === 'pro' ? 'Pro Plan - You have access to all features!' : 'Basic Plan'}
                </p>
              </div>
              <div className="text-right">
                {state.user?.subscription_tier === 'basic' && (
                  <p className="text-accent font-mono text-sm">
                    {state.user.llm_uses_today}/3 AI interactions today
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="card mb-8 border-error/20 bg-error/5">
            <p className="text-error font-mono">{error}</p>
          </div>
        )}

        {/* Pricing Card */}
        {proProduct && state.user?.subscription_tier !== 'pro' && (
          <div className="card mb-8 border-primary/20 bg-primary/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-accent text-background px-4 py-1 text-xs font-mono font-bold">
              RECOMMENDED
            </div>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-text font-mono mb-2">Pro Plan</h2>
              <div className="flex items-baseline justify-center space-x-2">
                <span className="text-4xl font-bold text-primary font-mono">
                  ${proProduct.price}
                </span>
                <span className="text-text-secondary font-mono">
                  /{proProduct.mode === 'subscription' ? 'month' : 'one-time'}
                </span>
              </div>
              <p className="text-text-secondary font-mono text-sm mt-2">
                {proProduct.description}
              </p>
            </div>

            <button
              onClick={handleUpgrade}
              disabled={isLoading || !state.isAuthenticated}
              className={`w-full btn ${
                isLoading || !state.isAuthenticated
                  ? 'bg-surface-light text-text-muted cursor-not-allowed'
                  : 'btn-primary'
              }`}
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-background border-t-transparent"></div>
                  <span>Processing...</span>
                </div>
              ) : !state.isAuthenticated ? (
                'Sign In to Upgrade'
              ) : (
                'Upgrade to Pro'
              )}
            </button>

            {!state.isAuthenticated && (
              <p className="text-center text-text-muted font-mono text-xs mt-3">
                <Link to="/auth" className="text-primary hover:text-primary/80 underline">
                  Sign in
                </Link> to upgrade your account
              </p>
            )}
          </div>
        )}

        {/* Features Comparison */}
        <div className="card">
          <h2 className="text-xl font-bold text-text font-mono mb-6 text-center">
            Feature Comparison
          </h2>
          
          <div className="space-y-6">
            {features.map((feature, index) => (
              <div key={index} className="border-b border-surface-light pb-6 last:border-b-0">
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <feature.icon size={20} className="text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-text font-mono mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-text-secondary font-mono text-sm mb-4">
                      {feature.description}
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-surface-light rounded-lg">
                        <p className="text-text-muted font-mono text-xs mb-1">Basic</p>
                        <p className="text-text font-mono text-sm">{feature.basic}</p>
                      </div>
                      <div className="text-center p-3 bg-primary/10 rounded-lg border border-primary/20">
                        <p className="text-primary font-mono text-xs mb-1">Pro</p>
                        <p className="text-text font-mono text-sm font-semibold">{feature.pro}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="card mt-8">
          <h2 className="text-xl font-bold text-text font-mono mb-6">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-text font-mono mb-2">
                Can I cancel anytime?
              </h3>
              <p className="text-text-secondary font-mono text-sm">
                Yes, you can cancel your subscription at any time. You'll continue to have access 
                to Pro features until the end of your current billing period.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-text font-mono mb-2">
                What happens to my data if I downgrade?
              </h3>
              <p className="text-text-secondary font-mono text-sm">
                Your data is always safe. If you downgrade, you'll keep all your existing data 
                but will be limited to Basic plan features.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-text font-mono mb-2">
                Is my payment information secure?
              </h3>
              <p className="text-text-secondary font-mono text-sm">
                Absolutely. We use Stripe for secure payment processing. We never store your 
                payment information on our servers.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
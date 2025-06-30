import React, { useState } from 'react';
import { 
  Sparkles, 
  Check, 
  ArrowLeft, 
  Zap, 
  BarChart3, 
  FolderOpen, 
  HeadphonesIcon,
  Download,
  CreditCard
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
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session');
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
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    {
      icon: Zap,
      title: 'Unlimited AI Interactions',
      description: 'No daily limits on AI assistant usage',
      basic: '3 per day',
      pro: 'Unlimited'
    },
    {
      icon: BarChart3,
      title: 'Advanced Analytics',
      description: 'Detailed spending insights and trends',
      basic: 'Basic stats',
      pro: 'Full analytics'
    },
    {
      icon: FolderOpen,
      title: 'Custom Categories',
      description: 'Create unlimited expense categories',
      basic: '2 custom',
      pro: 'Unlimited'
    },
    {
      icon: HeadphonesIcon,
      title: 'Priority Support',
      description: '24/7 customer support with priority response',
      basic: 'Community',
      pro: 'Priority'
    },
    {
      icon: Download,
      title: 'Data Export',
      description: 'Export your data in multiple formats',
      basic: false,
      pro: true
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
          <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Sparkles size={32} className="text-accent" />
          </div>
          <h1 className="text-3xl font-bold text-text font-mono mb-4">
            Upgrade to Pro
          </h1>
          <p className="text-text-secondary font-mono text-lg max-w-2xl mx-auto">
            Unlock the full potential of Zenith Expense with unlimited AI interactions, 
            advanced analytics, and premium features.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="card border-error/20 bg-error/5 mb-8">
            <p className="text-error font-mono text-sm">{error}</p>
          </div>
        )}

        {/* Current Plan Status */}
        {state.isAuthenticated && (
          <div className="card mb-8 border-primary/20 bg-primary/5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-text font-mono">Current Plan</h3>
                <p className="text-text-secondary font-mono text-sm">
                  {state.user?.subscription_tier === 'pro' ? 'Pro Plan' : 'Basic Plan'}
                </p>
              </div>
              {state.user?.subscription_tier === 'basic' && (
                <div className="text-right">
                  <p className="text-sm text-text-secondary font-mono">
                    AI Interactions Today
                  </p>
                  <p className="text-lg font-bold text-text font-mono">
                    {state.user.llm_uses_today}/3
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Pricing Card */}
        {proProduct && (
          <div className="card mb-8 border-accent/20 bg-accent/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-accent text-background px-4 py-1 text-xs font-mono font-bold">
              RECOMMENDED
            </div>
            
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-text font-mono mb-2">Pro Plan</h2>
              <div className="flex items-baseline justify-center space-x-2">
                <span className="text-4xl font-bold text-text font-mono">
                  ${proProduct.price.toFixed(2)}
                </span>
                <span className="text-text-secondary font-mono">
                  /{proProduct.mode === 'subscription' ? 'month' : 'one-time'}
                </span>
              </div>
              <p className="text-text-secondary font-mono text-sm mt-2">
                {proProduct.description}
              </p>
            </div>

            {state.isAuthenticated ? (
              <button
                onClick={handleUpgrade}
                disabled={isLoading || state.user?.subscription_tier === 'pro'}
                className={`w-full btn flex items-center justify-center space-x-2 ${
                  state.user?.subscription_tier === 'pro'
                    ? 'bg-surface-light text-text-muted cursor-not-allowed'
                    : isLoading
                    ? 'bg-surface-light text-text-muted cursor-not-allowed'
                    : 'btn-accent'
                }`}
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-text-muted border-t-transparent"></div>
                    <span>Processing...</span>
                  </>
                ) : state.user?.subscription_tier === 'pro' ? (
                  <>
                    <Check size={16} />
                    <span>Current Plan</span>
                  </>
                ) : (
                  <>
                    <CreditCard size={16} />
                    <span>Upgrade Now</span>
                  </>
                )}
              </button>
            ) : (
              <Link to="/auth" className="btn-accent w-full text-center">
                Sign Up to Upgrade
              </Link>
            )}
          </div>
        )}

        {/* Feature Comparison */}
        <div className="card">
          <h3 className="text-xl font-bold text-text font-mono mb-6 text-center">
            Feature Comparison
          </h3>
          
          <div className="space-y-6">
            {features.map((feature, index) => (
              <div key={index} className="border-b border-surface-light pb-6 last:border-b-0">
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <feature.icon size={20} className="text-primary" />
                  </div>
                  
                  <div className="flex-1">
                    <h4 className="font-semibold text-text font-mono mb-1">
                      {feature.title}
                    </h4>
                    <p className="text-text-secondary font-mono text-sm mb-3">
                      {feature.description}
                    </p>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-surface-light rounded-lg">
                        <p className="text-xs text-text-muted font-mono mb-1">Basic</p>
                        <p className="font-mono text-sm">
                          {typeof feature.basic === 'boolean' 
                            ? (feature.basic ? '✓' : '✗')
                            : feature.basic
                          }
                        </p>
                      </div>
                      
                      <div className="text-center p-3 bg-accent/10 rounded-lg border border-accent/20">
                        <p className="text-xs text-accent font-mono mb-1">Pro</p>
                        <p className="font-mono text-sm text-accent font-semibold">
                          {typeof feature.pro === 'boolean' 
                            ? (feature.pro ? '✓' : '✗')
                            : feature.pro
                          }
                        </p>
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
          <h3 className="text-lg font-bold text-text font-mono mb-6">
            Frequently Asked Questions
          </h3>
          
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-text font-mono mb-2">
                Can I cancel anytime?
              </h4>
              <p className="text-text-secondary font-mono text-sm">
                Yes, you can cancel your subscription at any time. You'll continue to have Pro access until the end of your billing period.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold text-text font-mono mb-2">
                What happens to my data if I downgrade?
              </h4>
              <p className="text-text-secondary font-mono text-sm">
                Your data is always safe. If you downgrade, you'll just have limited access to Pro features, but all your expenses and categories remain intact.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold text-text font-mono mb-2">
                Is my payment information secure?
              </h4>
              <p className="text-text-secondary font-mono text-sm">
                Absolutely. We use Stripe for secure payment processing and never store your payment information on our servers.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
import React, { useEffect, useState } from 'react';
import { CheckCircle, ArrowRight, Sparkles } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { supabase } from '../lib/supabase';

export function SubscriptionSuccess() {
  const [searchParams] = useSearchParams();
  const { state, dispatch } = useApp();
  const [isLoading, setIsLoading] = useState(true);
  const [subscriptionData, setSubscriptionData] = useState<any>(null);

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    const fetchSubscriptionData = async () => {
      if (!state.user) return;

      try {
        // Fetch the latest subscription data
        const { data, error } = await supabase
          .from('stripe_user_subscriptions')
          .select('*')
          .maybeSingle();

        if (error) {
          console.error('Error fetching subscription:', error);
        } else if (data) {
          setSubscriptionData(data);
          
          // Update user profile with new subscription tier
          const { error: updateError } = await supabase
            .from('users')
            .update({ subscription_tier: 'pro' })
            .eq('id', state.user.id);

          if (!updateError) {
            dispatch({ 
              type: 'SET_USER', 
              payload: { ...state.user, subscription_tier: 'pro' } 
            });
          }
        }
      } catch (error) {
        console.error('Error processing subscription:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubscriptionData();
  }, [state.user, dispatch]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-text-secondary font-mono">Processing your subscription...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-2xl text-center animate-fade-in">
        {/* Success Icon */}
        <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={40} className="text-background" />
        </div>

        {/* Header */}
        <h1 className="text-3xl font-bold text-text font-mono mb-4">
          Welcome to Pro! 🎉
        </h1>
        <p className="text-text-secondary font-mono text-lg mb-8">
          Your subscription has been activated successfully. You now have access to all premium features.
        </p>

        {/* Subscription Details */}
        {subscriptionData && (
          <div className="card mb-8 text-left">
            <h2 className="text-lg font-semibold text-text font-mono mb-4 flex items-center space-x-2">
              <Sparkles size={20} className="text-primary" />
              <span>Subscription Details</span>
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-text-secondary font-mono">Plan:</span>
                <span className="text-text font-mono font-semibold">Pro</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary font-mono">Status:</span>
                <span className="text-primary font-mono font-semibold capitalize">
                  {subscriptionData.subscription_status}
                </span>
              </div>
              {subscriptionData.current_period_end && (
                <div className="flex justify-between">
                  <span className="text-text-secondary font-mono">Next Billing:</span>
                  <span className="text-text font-mono">
                    {new Date(subscriptionData.current_period_end * 1000).toLocaleDateString()}
                  </span>
                </div>
              )}
              {sessionId && (
                <div className="flex justify-between">
                  <span className="text-text-secondary font-mono">Session ID:</span>
                  <span className="text-text font-mono text-xs">
                    {sessionId.substring(0, 20)}...
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Features Unlocked */}
        <div className="card mb-8 text-left">
          <h2 className="text-lg font-semibold text-text font-mono mb-4">
            🚀 Features Unlocked
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <CheckCircle size={16} className="text-primary" />
                <span className="text-text font-mono text-sm">Unlimited AI interactions</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle size={16} className="text-primary" />
                <span className="text-text font-mono text-sm">Advanced expense analytics</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle size={16} className="text-primary" />
                <span className="text-text font-mono text-sm">Unlimited custom categories</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <CheckCircle size={16} className="text-primary" />
                <span className="text-text font-mono text-sm">Priority customer support</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle size={16} className="text-primary" />
                <span className="text-text font-mono text-sm">Data export & backup</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle size={16} className="text-primary" />
                <span className="text-text font-mono text-sm">Early access to new features</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link 
            to="/assistant"
            className="btn-primary flex items-center justify-center space-x-2"
          >
            <Sparkles size={16} />
            <span>Try AI Assistant</span>
          </Link>
          <Link 
            to="/"
            className="btn-secondary flex items-center justify-center space-x-2"
          >
            <span>Go to Dashboard</span>
            <ArrowRight size={16} />
          </Link>
        </div>

        {/* Support */}
        <div className="mt-8 text-center">
          <p className="text-text-muted font-mono text-sm">
            Need help getting started? 
            <Link to="/settings" className="text-primary hover:text-primary/80 ml-1 underline">
              Contact Support
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
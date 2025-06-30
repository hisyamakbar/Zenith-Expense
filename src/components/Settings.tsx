import React, { useState, useEffect } from 'react';
import { 
  User, 
  CreditCard, 
  Shield, 
  Trash2, 
  LogOut, 
  Bell,
  Moon,
  Globe,
  HelpCircle,
  ExternalLink,
  Crown
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { supabase } from '../lib/supabase';

export function Settings() {
  const { state, dispatch } = useApp();
  const [subscriptionData, setSubscriptionData] = useState<any>(null);
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(false);

  useEffect(() => {
    const fetchSubscriptionData = async () => {
      if (!state.isAuthenticated) return;

      setIsLoadingSubscription(true);
      try {
        const { data, error } = await supabase
          .from('stripe_user_subscriptions')
          .select('*')
          .maybeSingle();

        if (error) {
          console.error('Error fetching subscription:', error);
        } else {
          setSubscriptionData(data);
        }
      } catch (error) {
        console.error('Error fetching subscription data:', error);
      } finally {
        setIsLoadingSubscription(false);
      }
    };

    fetchSubscriptionData();
  }, [state.isAuthenticated]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    dispatch({ type: 'SET_USER', payload: null });
  };

  const handleAccountReset = () => {
    if (window.confirm('This will permanently delete all your data and reset your account. This action cannot be undone. Are you sure?')) {
      // In a real app, this would call the API to delete all user data
      console.log('Account reset requested');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text font-mono">Settings</h1>
        <p className="text-text-secondary font-mono">
          Manage your account and app preferences
        </p>
      </div>

      {/* Account Section */}
      <div className="card">
        <h2 className="text-lg font-semibold text-text font-mono mb-4 flex items-center space-x-2">
          <User size={20} />
          <span>Account</span>
        </h2>
        
        {state.isAuthenticated ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-surface-light">
              <div>
                <p className="font-medium text-text font-mono">Email</p>
                <p className="text-sm text-text-secondary font-mono">
                  {state.user?.email || 'Not provided'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-between py-3 border-b border-surface-light">
              <div>
                <p className="font-medium text-text font-mono">Subscription</p>
                <p className="text-sm text-text-secondary font-mono">
                  {state.user?.subscription_tier === 'pro' ? 'Pro Plan' : 'Basic Plan'}
                  {isLoadingSubscription && ' (Loading...)'}
                </p>
                {subscriptionData && subscriptionData.subscription_status && (
                  <p className="text-xs text-text-muted font-mono">
                    Status: {subscriptionData.subscription_status}
                  </p>
                )}
              </div>
              {state.user?.subscription_tier === 'basic' && (
                <Link to="/upgrade" className="btn-accent flex items-center space-x-2">
                  <Crown size={16} />
                  <span>Upgrade to Pro</span>
                </Link>
              )}
            </div>
            
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-text font-mono">Default Currency</p>
                <p className="text-sm text-text-secondary font-mono">
                  {state.defaultCurrency}
                </p>
              </div>
              <p className="text-xs text-text-muted font-mono">
                Cannot be changed
              </p>
            </div>

            {/* Subscription Details */}
            {subscriptionData && state.user?.subscription_tier === 'pro' && (
              <div className="card border-primary/20 bg-primary/5">
                <h3 className="font-semibold text-text font-mono mb-3 flex items-center space-x-2">
                  <CreditCard size={16} />
                  <span>Subscription Details</span>
                </h3>
                <div className="space-y-2 text-sm">
                  {subscriptionData.current_period_end && (
                    <div className="flex justify-between">
                      <span className="text-text-secondary font-mono">Next Billing:</span>
                      <span className="text-text font-mono">
                        {new Date(subscriptionData.current_period_end * 1000).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {subscriptionData.payment_method_brand && subscriptionData.payment_method_last4 && (
                    <div className="flex justify-between">
                      <span className="text-text-secondary font-mono">Payment Method:</span>
                      <span className="text-text font-mono">
                        {subscriptionData.payment_method_brand.toUpperCase()} ****{subscriptionData.payment_method_last4}
                      </span>
                    </div>
                  )}
                  {subscriptionData.cancel_at_period_end && (
                    <div className="flex justify-between">
                      <span className="text-text-secondary font-mono">Status:</span>
                      <span className="text-error font-mono">Cancels at period end</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-text-secondary font-mono mb-4">
              Sign up to sync your data and access AI features
            </p>
            <Link to="/auth" className="btn-primary">
              Sign Up / Log In
            </Link>
          </div>
        )}
      </div>

      {/* Preferences Section */}
      <div className="card">
        <h2 className="text-lg font-semibold text-text font-mono mb-4 flex items-center space-x-2">
          <Moon size={20} />
          <span>Preferences</span>
        </h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-surface-light">
            <div className="flex items-center space-x-3">
              <Bell size={16} className="text-text-muted" />
              <div>
                <p className="font-medium text-text font-mono">Notifications</p>
                <p className="text-sm text-text-secondary font-mono">
                  Spending alerts and reminders
                </p>
              </div>
            </div>
            <div className="w-12 h-6 bg-surface-light rounded-full relative cursor-pointer">
              <div className="w-5 h-5 bg-primary rounded-full absolute top-0.5 left-6 transition-transform duration-200"></div>
            </div>
          </div>
          
          <div className="flex items-center justify-between py-3 border-b border-surface-light">
            <div className="flex items-center space-x-3">
              <Globe size={16} className="text-text-muted" />
              <div>
                <p className="font-medium text-text font-mono">Auto Currency Detection</p>
                <p className="text-sm text-text-secondary font-mono">
                  Detect currency from location
                </p>
              </div>
            </div>
            <div className="w-12 h-6 bg-surface-light rounded-full relative cursor-pointer">
              <div className="w-5 h-5 bg-surface rounded-full absolute top-0.5 left-0.5 transition-transform duration-200"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Support Section */}
      <div className="card">
        <h2 className="text-lg font-semibold text-text font-mono mb-4 flex items-center space-x-2">
          <HelpCircle size={20} />
          <span>Support</span>
        </h2>
        
        <div className="space-y-3">
          <button className="w-full text-left p-3 hover:bg-surface-light rounded-lg transition-colors duration-200">
            <p className="font-medium text-text font-mono">Help Center</p>
            <p className="text-sm text-text-secondary font-mono">
              FAQ and documentation
            </p>
          </button>
          
          <button className="w-full text-left p-3 hover:bg-surface-light rounded-lg transition-colors duration-200">
            <p className="font-medium text-text font-mono">Contact Support</p>
            <p className="text-sm text-text-secondary font-mono">
              Get help from our team
            </p>
          </button>
          
          <button className="w-full text-left p-3 hover:bg-surface-light rounded-lg transition-colors duration-200">
            <p className="font-medium text-text font-mono">Privacy Policy</p>
            <p className="text-sm text-text-secondary font-mono">
              How we protect your data
            </p>
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      {state.isAuthenticated && (
        <div className="card border-error/20 bg-error/5">
          <h2 className="text-lg font-semibold text-error font-mono mb-4 flex items-center space-x-2">
            <Shield size={20} />
            <span>Danger Zone</span>
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-error/20">
              <div>
                <p className="font-medium text-text font-mono">Reset Account</p>
                <p className="text-sm text-text-secondary font-mono">
                  Delete all data and reset currency selection
                </p>
              </div>
              <button
                onClick={handleAccountReset}
                className="btn bg-error/10 text-error hover:bg-error/20 border border-error/20"
              >
                <Trash2 size={16} className="mr-2" />
                Reset
              </button>
            </div>
            
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-text font-mono">Sign Out</p>
                <p className="text-sm text-text-secondary font-mono">
                  Sign out of your account
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="btn-secondary"
              >
                <LogOut size={16} className="mr-2" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* App Info */}
      <div className="card">
        <div className="text-center py-4">
          <p className="text-text-secondary font-mono text-sm">
            Zenith Expense v1.0.0
          </p>
          <p className="text-text-muted font-mono text-xs mt-1">
            Built with ❤️ for personal finance tracking
          </p>
        </div>
      </div>
    </div>
  );
}
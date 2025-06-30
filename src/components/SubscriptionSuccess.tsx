import React, { useEffect, useState } from 'react';
import { CheckCircle, ArrowRight, Sparkles } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';

export function SubscriptionSuccess() {
  const [searchParams] = useSearchParams();
  const { state } = useApp();
  const [isLoading, setIsLoading] = useState(true);

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    // Simulate loading time for subscription activation
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
          </div>
          <h2 className="text-xl font-bold text-text font-mono mb-2">
            Activating Your Subscription
          </h2>
          <p className="text-text-secondary font-mono">
            Please wait while we set up your Pro account...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md text-center animate-fade-in">
        {/* Success Icon */}
        <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={40} className="text-primary" />
        </div>

        {/* Success Message */}
        <h1 className="text-2xl font-bold text-text font-mono mb-4">
          Welcome to Pro! 🎉
        </h1>
        <p className="text-text-secondary font-mono mb-8 leading-relaxed">
          Your subscription has been activated successfully. You now have access to all Pro features including unlimited AI interactions and advanced analytics.
        </p>

        {/* Session Info */}
        {sessionId && (
          <div className="card mb-8 border-primary/20 bg-primary/5">
            <p className="text-xs text-text-muted font-mono">
              Session ID: {sessionId.slice(0, 20)}...
            </p>
          </div>
        )}

        {/* Pro Features */}
        <div className="card mb-8 text-left">
          <h3 className="font-semibold text-text font-mono mb-4 flex items-center space-x-2">
            <Sparkles size={16} className="text-primary" />
            <span>Your Pro Benefits</span>
          </h3>
          <ul className="text-sm text-text-secondary font-mono space-y-3">
            <li className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              <span>Unlimited AI assistant interactions</span>
            </li>
            <li className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              <span>Advanced spending analytics and insights</span>
            </li>
            <li className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              <span>Unlimited custom expense categories</span>
            </li>
            <li className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              <span>Priority customer support</span>
            </li>
            <li className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              <span>Export data in multiple formats</span>
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Link
            to="/assistant"
            className="btn-primary w-full flex items-center justify-center space-x-2"
          >
            <Sparkles size={16} />
            <span>Try AI Assistant</span>
            <ArrowRight size={16} />
          </Link>
          
          <Link
            to="/"
            className="btn-secondary w-full"
          >
            Go to Dashboard
          </Link>
        </div>

        {/* Support Info */}
        <div className="mt-8 text-center">
          <p className="text-xs text-text-muted font-mono">
            Need help? Contact our support team anytime.
          </p>
        </div>
      </div>
    </div>
  );
}
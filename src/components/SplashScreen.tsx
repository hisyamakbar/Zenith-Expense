import React, { useEffect, useState } from 'react';
import { Wallet } from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 300); // Wait for fade out animation
    }, 2000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className={`fixed inset-0 bg-background flex items-center justify-center z-50 transition-opacity duration-300 ${
      isVisible ? 'opacity-100' : 'opacity-0'
    }`}>
      <div className="text-center animate-scale-in">
        <div className="mb-6 flex justify-center">
          <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center">
            <Wallet size={40} className="text-background" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-text mb-2 font-mono">
          Zenith Expense
        </h1>
        <p className="text-text-secondary font-mono">
          AI-Powered Finance Tracker
        </p>
        <div className="mt-8 flex justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
        </div>
      </div>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { AlertTriangle, ChevronDown } from 'lucide-react';
import { useApp } from '../contexts/AppContext';

const POPULAR_CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
];

interface CurrencySelectorProps {
  onCurrencySelected: (currency: string) => void;
}

export function CurrencySelector({ onCurrencySelected }: CurrencySelectorProps) {
  const [selectedCurrency, setSelectedCurrency] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showWarning, setShowWarning] = useState(true);
  const { dispatch } = useApp();

  const handleCurrencySelect = (currencyCode: string) => {
    setSelectedCurrency(currencyCode);
    setIsDropdownOpen(false);
  };

  const handleConfirm = () => {
    if (selectedCurrency) {
      localStorage.setItem('defaultCurrency', selectedCurrency);
      localStorage.setItem('hasSelectedCurrency', 'true');
      dispatch({ type: 'SET_DEFAULT_CURRENCY', payload: selectedCurrency });
      dispatch({ type: 'SET_HAS_SELECTED_CURRENCY', payload: true });
      onCurrencySelected(selectedCurrency);
    }
  };

  const selectedCurrencyData = POPULAR_CURRENCIES.find(c => c.code === selectedCurrency);

  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center p-6 z-50">
      <div className="w-full max-w-md animate-slide-up">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-text mb-2 font-mono">
            Choose Default Currency
          </h1>
          <p className="text-text-secondary font-mono text-sm">
            This will be your primary reporting currency
          </p>
        </div>

        {showWarning && (
          <div className="card border-error/20 bg-error/10 mb-6">
            <div className="flex items-start space-x-3">
              <AlertTriangle size={20} className="text-error mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-error mb-2 font-mono">
                  Important Notice
                </h3>
                <p className="text-sm text-text-secondary font-mono leading-relaxed">
                  Your default currency is permanent and cannot be changed without a full 
                  account reset, which will delete all your data. Please choose carefully.
                </p>
                <button
                  onClick={() => setShowWarning(false)}
                  className="mt-3 text-xs text-primary hover:text-primary/80 font-mono underline"
                >
                  I understand, continue
                </button>
              </div>
            </div>
          </div>
        )}

        {!showWarning && (
          <div className="space-y-6">
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="input flex items-center justify-between w-full"
              >
                <span className={selectedCurrency ? 'text-text' : 'text-text-muted'}>
                  {selectedCurrencyData 
                    ? `${selectedCurrencyData.symbol} ${selectedCurrencyData.name} (${selectedCurrencyData.code})`
                    : 'Select a currency'
                  }
                </span>
                <ChevronDown 
                  size={20} 
                  className={`transition-transform duration-200 ${
                    isDropdownOpen ? 'rotate-180' : ''
                  }`} 
                />
              </button>

              {isDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-surface-light rounded-lg shadow-xl z-10 max-h-60 overflow-y-auto">
                  {POPULAR_CURRENCIES.map((currency) => (
                    <button
                      key={currency.code}
                      onClick={() => handleCurrencySelect(currency.code)}
                      className="w-full px-4 py-3 text-left hover:bg-surface-light transition-colors duration-200 border-b border-surface-light last:border-b-0 font-mono"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-text font-medium">
                            {currency.symbol} {currency.name}
                          </span>
                          <span className="text-text-muted ml-2">
                            ({currency.code})
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={handleConfirm}
              disabled={!selectedCurrency}
              className={`w-full py-4 rounded-lg font-mono font-medium transition-all duration-200 ${
                selectedCurrency
                  ? 'bg-primary text-background hover:bg-primary/90'
                  : 'bg-surface-light text-text-muted cursor-not-allowed'
              }`}
            >
              Confirm Selection
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
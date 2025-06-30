export interface ExchangeRate {
  [key: string]: number;
}

export interface ConversionResult {
  originalAmount: number;
  originalCurrency: string;
  convertedAmount: number;
  convertedCurrency: string;
  exchangeRate: number;
  lastUpdated: string;
}

// Cache for exchange rates to avoid excessive API calls
const rateCache = new Map<string, { rates: ExchangeRate; timestamp: number }>();
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

export async function getExchangeRates(baseCurrency: string = 'USD'): Promise<ExchangeRate> {
  const cacheKey = baseCurrency;
  const cached = rateCache.get(cacheKey);
  
  // Return cached rates if still valid
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.rates;
  }

  try {
    const response = await fetch(`https://open.er-api.com/v6/latest/${baseCurrency}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.result !== 'success') {
      throw new Error('API returned error result');
    }

    const rates = data.rates || {};
    
    // Cache the rates
    rateCache.set(cacheKey, {
      rates,
      timestamp: Date.now()
    });

    return rates;
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    
    // Return cached rates if available, even if expired
    if (cached) {
      console.log('Using expired cache due to API error');
      return cached.rates;
    }
    
    // Fallback rates if no cache and API fails
    console.log('Using fallback rates due to API error');
    return getFallbackRates(baseCurrency);
  }
}

function getFallbackRates(baseCurrency: string): ExchangeRate {
  // Fallback rates based on approximate values (as of 2025)
  const fallbackRates: { [key: string]: ExchangeRate } = {
    USD: {
      USD: 1,
      EUR: 0.85,
      GBP: 0.73,
      JPY: 110,
      IDR: 15000,
      SGD: 1.35,
      AUD: 1.45,
      CAD: 1.25,
      CNY: 6.5,
      INR: 75
    },
    EUR: {
      USD: 1.18,
      EUR: 1,
      GBP: 0.86,
      JPY: 129,
      IDR: 17650,
      SGD: 1.59,
      AUD: 1.71,
      CAD: 1.47,
      CNY: 7.65,
      INR: 88
    },
    IDR: {
      USD: 0.000067,
      EUR: 0.000057,
      GBP: 0.000049,
      JPY: 0.0073,
      IDR: 1,
      SGD: 0.00009,
      AUD: 0.000097,
      CAD: 0.000083,
      CNY: 0.00043,
      INR: 0.005
    },
    GBP: {
      USD: 1.37,
      EUR: 1.16,
      GBP: 1,
      JPY: 151,
      IDR: 20550,
      SGD: 1.85,
      AUD: 1.99,
      CAD: 1.71,
      CNY: 8.91,
      INR: 103
    }
  };

  return fallbackRates[baseCurrency] || fallbackRates.USD;
}

export async function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<ConversionResult> {
  if (fromCurrency === toCurrency) {
    return {
      originalAmount: amount,
      originalCurrency: fromCurrency,
      convertedAmount: amount,
      convertedCurrency: toCurrency,
      exchangeRate: 1,
      lastUpdated: new Date().toISOString()
    };
  }

  try {
    // Get rates with fromCurrency as base
    const rates = await getExchangeRates(fromCurrency);
    const exchangeRate = rates[toCurrency];
    
    if (!exchangeRate) {
      throw new Error(`Exchange rate not found for ${fromCurrency} to ${toCurrency}`);
    }

    const convertedAmount = amount * exchangeRate;

    return {
      originalAmount: amount,
      originalCurrency: fromCurrency,
      convertedAmount: Math.round(convertedAmount * 100) / 100, // Round to 2 decimal places
      convertedCurrency: toCurrency,
      exchangeRate,
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    console.error('Currency conversion error:', error);
    
    // Fallback conversion
    const fallbackRates = getFallbackRates(fromCurrency);
    const rate = fallbackRates[toCurrency] || 1;
    const convertedAmount = amount * rate;

    return {
      originalAmount: amount,
      originalCurrency: fromCurrency,
      convertedAmount: Math.round(convertedAmount * 100) / 100,
      convertedCurrency: toCurrency,
      exchangeRate: rate,
      lastUpdated: new Date().toISOString()
    };
  }
}

export function formatCurrency(amount: number, currency: string): string {
  const currencySymbols: { [key: string]: string } = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    IDR: 'Rp',
    SGD: 'S$',
    AUD: 'A$',
    CAD: 'C$',
    CNY: '¥',
    INR: '₹'
  };

  const symbol = currencySymbols[currency] || currency;
  
  // Format based on currency
  if (currency === 'IDR' || currency === 'JPY') {
    // No decimal places for IDR and JPY
    return `${symbol} ${amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  } else {
    // 2 decimal places for other currencies
    return `${symbol} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}

// Utility function to refresh all cached rates
export function clearRateCache(): void {
  rateCache.clear();
}

// Get cache status for debugging
export function getCacheStatus(): { [key: string]: { age: number; isExpired: boolean } } {
  const status: { [key: string]: { age: number; isExpired: boolean } } = {};
  
  rateCache.forEach((value, key) => {
    const age = Date.now() - value.timestamp;
    status[key] = {
      age: Math.round(age / 1000 / 60), // age in minutes
      isExpired: age > CACHE_DURATION
    };
  });
  
  return status;
}
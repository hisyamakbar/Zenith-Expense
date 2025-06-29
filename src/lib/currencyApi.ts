import Freecurrencyapi from '@everapi/freecurrencyapi-js';

const freecurrencyapi = new Freecurrencyapi('fca_live_NIQUUwDK5vRBrFFnMbLmkaUWStWZynnYXIqU8n0X');

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
    const response = await freecurrencyapi.latest({
      base_currency: baseCurrency,
      currencies: 'USD,EUR,GBP,JPY,IDR,SGD,AUD,CAD,CNY,INR'
    });

    const rates = response.data || {};
    
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
      return cached.rates;
    }
    
    // Fallback rates if no cache and API fails
    return {
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
    };
  }
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
    
    // Fallback conversion with approximate rates
    const fallbackRates: { [key: string]: { [key: string]: number } } = {
      USD: { EUR: 0.85, GBP: 0.73, JPY: 110, IDR: 15000, SGD: 1.35 },
      EUR: { USD: 1.18, GBP: 0.86, JPY: 129, IDR: 17650, SGD: 1.59 },
      IDR: { USD: 0.000067, EUR: 0.000057, GBP: 0.000049, JPY: 0.0073, SGD: 0.00009 },
      GBP: { USD: 1.37, EUR: 1.16, JPY: 151, IDR: 20550, SGD: 1.85 },
      JPY: { USD: 0.0091, EUR: 0.0077, GBP: 0.0066, IDR: 136, SGD: 0.012 },
      SGD: { USD: 0.74, EUR: 0.63, GBP: 0.54, JPY: 81, IDR: 11100 }
    };

    const rate = fallbackRates[fromCurrency]?.[toCurrency] || 1;
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
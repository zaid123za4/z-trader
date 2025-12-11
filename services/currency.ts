
import { CurrencyCode } from "../types";

export const CURRENCY_RATES: Record<CurrencyCode, number> = {
  USD: 1,
  INR: 84.50,
  EUR: 0.92,
  GBP: 0.78,
  JPY: 150.25
};

export const CURRENCY_SIGNS: Record<CurrencyCode, string> = {
  USD: '$',
  INR: '₹',
  EUR: '€',
  GBP: '£',
  JPY: '¥'
};

// Heuristic to determine the native currency of an asset
export const getAssetCurrency = (symbol: string): CurrencyCode => {
  if (symbol.endsWith('.NS') || symbol.endsWith('.BO')) return 'INR';
  return 'USD';
};

// Convert a generic value from one currency to another
export const convertCurrency = (value: number, from: CurrencyCode, to: CurrencyCode): number => {
  // Convert to USD base first
  const rateFrom = CURRENCY_RATES[from] || 1;
  const valueInUSD = value / rateFrom;
  // Convert to target
  const rateTo = CURRENCY_RATES[to] || 1;
  return valueInUSD * rateTo;
};

// Convert a stock price (which is in its native currency) to the user's preferred display currency
export const getDisplayPrice = (price: number, symbol: string, targetCurrency: CurrencyCode): number => {
  const nativeCurrency = getAssetCurrency(symbol);
  return convertCurrency(price, nativeCurrency, targetCurrency);
};

export const formatCurrency = (value: number, currency: CurrencyCode): string => {
  return `${CURRENCY_SIGNS[currency]}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

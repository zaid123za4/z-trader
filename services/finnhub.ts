
import { ChartPoint, Candle, SearchResult } from "../types";

const BASE_URL = 'https://finnhub.io/api/v1';

export const getFinnhubKey = () => localStorage.getItem('FINNHUB_KEY') || '';
export const setFinnhubKey = (key: string) => localStorage.setItem('FINNHUB_KEY', key);

export const fetchQuote = async (symbol: string): Promise<{ price: number; change: number; changePercent: number } | null> => {
  const key = getFinnhubKey();
  if (!key) return null;

  try {
    const response = await fetch(`${BASE_URL}/quote?symbol=${symbol}&token=${key}`);
    const data = await response.json();
    
    // Finnhub returns 0s if invalid, checking c (current price) is usually enough
    if ((data.c === 0 && data.d === null) || !data) return null;

    return {
      price: typeof data.c === 'number' ? data.c : 0,
      change: typeof data.d === 'number' ? data.d : 0,     // Default to 0 if null
      changePercent: typeof data.dp === 'number' ? data.dp : 0 // Default to 0 if null
    };
  } catch (e) {
    console.error(`Failed to fetch quote for ${symbol}`, e);
    return null;
  }
};

export const fetchCandles = async (symbol: string, resolution: string = '1'): Promise<ChartPoint[]> => {
  const key = getFinnhubKey();
  if (!key) return [];

  // Calculate timestamp for last 60 minutes
  const to = Math.floor(Date.now() / 1000);
  const from = to - (60 * 60); // 1 hour ago

  try {
    const response = await fetch(`${BASE_URL}/stock/candle?symbol=${symbol}&resolution=${resolution}&from=${from}&to=${to}&token=${key}`);
    const data: Candle = await response.json();

    if (data.s === 'ok' && data.c && data.t) {
      return data.t.map((timestamp, index) => ({
        time: new Date(timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        price: Number(data.c[index])
      }));
    }
    return [];
  } catch (e) {
    console.error(`Failed to fetch candles for ${symbol}`, e);
    return [];
  }
};

export const searchSymbols = async (query: string): Promise<SearchResult[]> => {
  const key = getFinnhubKey();
  if (!key || !query) return [];

  try {
    const response = await fetch(`${BASE_URL}/search?q=${query}&token=${key}`);
    const data = await response.json();
    if (data.result) {
      return data.result;
    }
    return [];
  } catch (e) {
    console.error("Search failed", e);
    return [];
  }
};

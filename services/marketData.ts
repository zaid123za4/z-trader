
import { fetchQuote, fetchCandles } from "./finnhub";
import { ChartPoint, OHLCData } from "../types";

export const DEFAULT_SYMBOLS = [
  'AAPL', 'TSLA', 'NVDA', 'BINANCE:BTCUSDT', 'BINANCE:ETHUSDT',
  'RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'NIFTYBEES.NS', 'TATAMOTORS.NS'
];

export const getSymbolQuote = async (symbol: string) => {
    const realData = await fetchQuote(symbol);
    if (realData) return realData;

    // Mock fallback
    const base = MOCK_PRICES[symbol] || 100;
    return {
        price: base * (1 + (Math.random() - 0.5) * 0.01),
        change: (Math.random() - 0.5) * 5,
        changePercent: (Math.random() - 0.5) * 2
    };
};

export const getSymbolPrice = async (symbol: string): Promise<number> => {
  const quote = await getSymbolQuote(symbol);
  return quote.price;
};

// Returns standard ChartPoints for legacy/mini charts
export const getSymbolHistory = async (symbol: string): Promise<ChartPoint[]> => {
  const realHistory = await fetchCandles(symbol, '1'); // 1 minute candles
  if (realHistory.length > 0) return realHistory;

  // Mock history if no key
  const history: ChartPoint[] = [];
  let price = MOCK_PRICES[symbol] || 100;
  const now = new Date();
  for (let i = 30; i > 0; i--) {
    price = price * (1 + (Math.random() - 0.5) * 0.01);
    const time = new Date(now.getTime() - i * 60000);
    history.push({
      time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      price: Number(price.toFixed(2))
    });
  }
  return history;
};

// Returns OHLC Data for the Pro Chart
export const getSymbolCandles = async (symbol: string): Promise<OHLCData[]> => {
  // Simulation wrapper since Finnhub Free tier has strict limits on candle data 
  const simpleHistory = await getSymbolHistory(symbol);
  
  // Convert simple line data to synthetic Candle data with Volume
  return simpleHistory.map((pt, i) => {
      const close = pt.price;
      // Synthesize volatility
      const open = i > 0 ? simpleHistory[i-1].price : close * 0.99;
      const high = Math.max(open, close) * (1 + Math.random() * 0.005);
      const low = Math.min(open, close) * (1 - Math.random() * 0.005);
      
      // Synthesize Volume (Whale spikes randomly)
      const isWhale = Math.random() > 0.95;
      const volume = isWhale ? Math.floor(Math.random() * 50000) + 10000 : Math.floor(Math.random() * 5000) + 500;
      
      // Parse time string back to unix timestamp for lightweight-charts
      const today = new Date();
      const [time, modifier] = pt.time.split(' ');
      let [hours, minutes] = time.split(':');
      if (hours === '12') hours = '00';
      if (modifier === 'PM') hours = String(parseInt(hours, 10) + 12);
      
      const timestamp = new Date(today.getFullYear(), today.getMonth(), today.getDate(), parseInt(hours), parseInt(minutes)).getTime() / 1000;

      return {
          time: timestamp,
          open,
          high,
          low,
          close,
          volume
      };
  }).sort((a, b) => a.time - b.time);
};

export const getAvailableSymbols = () => DEFAULT_SYMBOLS;

const MOCK_PRICES: Record<string, number> = {
  'AAPL': 175.50,
  'TSLA': 240.00,
  'NVDA': 850.00,
  'BINANCE:BTCUSDT': 65000,
  'BINANCE:ETHUSDT': 3500,
  'RELIANCE.NS': 2900,
  'TCS.NS': 4000,
  'HDFCBANK.NS': 1500,
  'NIFTYBEES.NS': 240,
  'TATAMOTORS.NS': 980
};

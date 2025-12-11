
export interface MarketData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
  timestamp?: number;
}

export interface ChartPoint {
  time: string;
  price: number;
}

export interface OHLCData {
  time: number; // Unix timestamp
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number; // Added volume
}

export interface ChartMarker {
  time: number;
  position: 'aboveBar' | 'belowBar' | 'inBar';
  color: string;
  shape: 'circle' | 'square' | 'arrowUp' | 'arrowDown';
  text: string;
}

export interface Position {
  symbol: string;
  amount: number;
  avgPrice: number; // In Native Asset Currency
  currentValue: number; // In USD (Normalized)
  pnl: number; // In USD
  pnlPercent: number;
  stopLoss?: number; // Native Currency
  takeProfit?: number; // Native Currency
  isTrailing?: boolean; // If true, SL moves up with price
}

export interface TradeOrder {
  symbol: string;
  side: 'buy' | 'sell';
  amount: number;
  price: number;
  timestamp: number;
  type?: 'market' | 'stop_loss' | 'take_profit' | 'auto_entry' | 'panic_sell' | 'auto_exit' | 'grid_fill';
}

export interface Candle {
  c: number[]; // Close prices
  h: number[]; // High prices
  l: number[]; // Low prices
  o: number[]; // Open prices
  t: number[]; // Timestamps
  v: number[]; // Volumes
  s: string;   // Status
}

export interface SearchResult {
  description: string;
  displaySymbol: string;
  symbol: string;
  type: string;
}

export interface BotConfig {
  enabled: boolean;
  riskPerTrade: number; // % of balance
  intervalSeconds: number;
  maxOpenPositions: number;
  strategy: 'conservative' | 'aggressive' | 'degen' | 'grid_farmer';
  useTrailingStop: boolean;
  allowedSymbols: string[]; // Whitelist. If empty, all allowed.
  dailyProfitTarget: number; // USD. If hit, bot stops.
}

export interface GridConfig {
  enabled: boolean;
  upperPrice: number;
  lowerPrice: number;
  grids: number; // Number of lines
}

export interface BotStats {
  wins: number;
  losses: number;
  totalProfitUSD: number;
  startTime: number;
  grossProfit: number;
  grossLoss: number;
  maxDrawdown: number; // Lowest point of PnL relative to peak
  peakPnL: number; // Highest PnL reached
}

export interface BotLog {
  timestamp: number;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning' | 'whale' | 'savage';
  symbol?: string; // For clickable logs
}

export enum ViewState {
  MARKET = 'MARKET',
  PORTFOLIO = 'PORTFOLIO',
  ANALYSIS = 'ANALYSIS',
  AUTO_TRADER = 'AUTO_TRADER'
}

export type CurrencyCode = 'USD' | 'INR' | 'EUR' | 'GBP' | 'JPY';


import React, { useState, useEffect, useRef } from 'react';
import { ChartPoint, Position, CurrencyCode, OHLCData, ChartMarker } from '../types';
import { getSymbolHistory, getSymbolQuote, getSymbolCandles } from '../services/marketData';
import { getMarketAnalysis, getDeepMarketAnalysis } from '../services/gemini';
import { getDisplayPrice, formatCurrency, getAssetCurrency, convertCurrency } from '../services/currency';
import { TrendingUp, TrendingDown, BrainCircuit, ShieldAlert, Target, Activity, BarChart3, Grid3X3, Terminal } from 'lucide-react';
import CandleStickChart from './CandleStickChart';
import OrderBook from './OrderBook';

interface Props {
  symbol: string;
  balanceUSD: number;
  globalCurrency: CurrencyCode;
  onClose: () => void;
  onTrade: (symbol: string, amount: number, price: number, side: 'buy' | 'sell', sl?: number, tp?: number) => void;
  currentPosition?: Position;
}

const TradeTerminal: React.FC<Props> = ({ symbol, balanceUSD, globalCurrency, onClose, onTrade, currentPosition }) => {
  const [history, setHistory] = useState<OHLCData[]>([]);
  const [currentNativePrice, setCurrentNativePrice] = useState<number>(0);
  const [priceChange, setPriceChange] = useState<{d: number, dp: number}>({ d: 0, dp: 0 });
  const [chartMarkers, setChartMarkers] = useState<ChartMarker[]>([]);
  
  const [tradeAmount, setTradeAmount] = useState<string>('1');
  const [stopLoss, setStopLoss] = useState<string>('');
  const [takeProfit, setTakeProfit] = useState<string>('');
  const [isGridMode, setIsGridMode] = useState(false);
  
  const [aiLog, setAiLog] = useState<string[]>(["Initializing Neural Net...", "Connecting to Market Feed..."]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [sentimentScore, setSentimentScore] = useState(50); // 0-100

  const logEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiLog]);

  const addLog = (msg: string) => {
      const time = new Date().toLocaleTimeString([], {hour12: false});
      setAiLog(prev => [...prev, `[${time}] ${msg}`].slice(-20)); // Keep last 20 lines
  };

  // Initial Load
  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
        addLog(`Fetching High-Res Candles for ${symbol}...`);
        const candles = await getSymbolCandles(symbol);
        const quote = await getSymbolQuote(symbol);
        
        if (mounted) {
            if (candles.length > 0) setHistory(candles);
            setCurrentNativePrice(quote.price);
            setPriceChange({ 
              d: typeof quote.change === 'number' ? quote.change : 0, 
              dp: typeof quote.changePercent === 'number' ? quote.changePercent : 0 
            });
            // Randomize sentiment on load for visual effect
            setSentimentScore(Math.floor(Math.random() * 100));
            addLog("Market Data Stream: ACTIVE");
        }
    };
    loadData();
    return () => { mounted = false; };
  }, [symbol]);

  // Live Ticker
  useEffect(() => {
    const interval = setInterval(async () => {
       const quote = await getSymbolQuote(symbol);
       setCurrentNativePrice(quote.price);
       setPriceChange({ 
          d: typeof quote.change === 'number' ? quote.change : 0, 
          dp: typeof quote.changePercent === 'number' ? quote.changePercent : 0 
       });
       
       // Update last candle in real-time
       setHistory(prev => {
          if (prev.length === 0) return prev;
          const last = prev[prev.length - 1];
          const now = Math.floor(Date.now() / 1000);
          
          // If last candle is older than 60s, make new one
          if (now - last.time > 60) {
             return [...prev, { time: now, open: quote.price, high: quote.price, low: quote.price, close: quote.price, volume: Math.random() * 1000 }];
          }
          
          // Update current candle
          return [
              ...prev.slice(0, -1), 
              { 
                  ...last, 
                  high: Math.max(last.high, quote.price),
                  low: Math.min(last.low, quote.price),
                  close: quote.price,
                  volume: last.volume + (Math.random() * 100) // Simulate accumulating volume
              }
          ];
       });
    }, 5000); 

    return () => clearInterval(interval);
  }, [symbol]);

  const handleAnalysis = async () => {
    setIsAnalyzing(true);
    addLog("--- INITIATING NEURAL SCAN ---");
    addLog("Analyzing 15m Trend structure...");
    
    // Mock mapping chart points for the AI (it doesn't need full OHLC yet)
    const simpleHistory = history.map(h => ({ time: new Date(h.time * 1000).toLocaleTimeString(), price: h.close }));
    const result = await getMarketAnalysis(symbol, currentNativePrice, simpleHistory);
    
    // Parse result for log
    addLog(`AI VERDICT: ${result}`);
    setIsAnalyzing(false);
    
    // Simulate updating sentiment based on AI
    const newSentiment = Math.random() > 0.5 ? 85 : 15;
    setSentimentScore(newSentiment);
    addLog(`Sentiment Adjusted: ${newSentiment}/100`);
    addLog("--- SCAN COMPLETE ---");
  };

  const handleDeepAnalysis = async () => {
    setIsAnalyzing(true);
    addLog("--- ENGAGING GEMINI 3 PRO (Thinking Mode) ---");
    addLog("Parsing Order Book Imbalance...");
    addLog("Calculating Volatility Surface...");
    
    const simpleHistory = history.map(h => ({ time: new Date(h.time * 1000).toLocaleTimeString(), price: h.close }));
    const result = await getDeepMarketAnalysis(symbol, currentNativePrice, simpleHistory);
    
    addLog("STRATEGY GENERATED.");
    // Split long AI response into readable log chunks
    const chunks = result.split('. ');
    chunks.forEach(c => c && addLog(`> ${c}`));
    
    setIsAnalyzing(false);
  };

  const setMaxBuy = () => {
      if (currentNativePrice > 0) {
          const assetCurrency = getAssetCurrency(symbol);
          const balanceNative = convertCurrency(balanceUSD, 'USD', assetCurrency === 'INR' ? 'INR' : 'USD');
          const maxAmount = (balanceNative * 0.99) / currentNativePrice;
          setTradeAmount(maxAmount.toFixed(6));
      }
  };

  const executeTrade = (side: 'buy' | 'sell') => {
    const amount = parseFloat(tradeAmount);
    if (isNaN(amount) || amount <= 0) return;
    const sl = stopLoss ? parseFloat(stopLoss) : undefined;
    const tp = takeProfit ? parseFloat(takeProfit) : undefined;
    
    onTrade(symbol, amount, currentNativePrice, side, sl, tp);
    addLog(`ORDER FILLED: ${side.toUpperCase()} ${amount} @ ${currentNativePrice.toFixed(2)}`);
    
    // Add marker to chart
    const now = Math.floor(Date.now() / 1000);
    setChartMarkers(prev => [...prev, {
        time: now,
        position: side === 'buy' ? 'belowBar' : 'aboveBar',
        color: side === 'buy' ? '#22c55e' : '#ef4444',
        shape: side === 'buy' ? 'arrowUp' : 'arrowDown',
        text: side.toUpperCase()
    }]);
  };

  const d = priceChange.d || 0;
  const dp = priceChange.dp || 0;
  const isGreen = d >= 0;

  // Render Values
  const displayPrice = getDisplayPrice(currentNativePrice, symbol, globalCurrency);
  const displayBalance = convertCurrency(balanceUSD, 'USD', globalCurrency);
  
  return (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-100 overflow-hidden font-mono">
      {/* 1. TOP HEADER BAR */}
      <div className="flex items-center justify-between p-3 border-b border-zinc-800 bg-black">
        <div className="flex items-center gap-6">
          <button onClick={onClose} className="text-zinc-500 hover:text-white flex items-center gap-1 transition-colors">
             <span className="text-lg">&larr;</span> EXIT
          </button>
          
          <div className="flex items-baseline gap-3">
              <h2 className="text-2xl font-black text-white tracking-tighter">{symbol}</h2>
              <span className={`text-sm font-bold ${isGreen ? 'text-green-500' : 'text-red-500'} flex items-center gap-1`}>
                 {isGreen ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                 {d > 0 ? '+' : ''}{d.toFixed(2)} ({dp.toFixed(2)}%)
              </span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
             <div className="text-right">
                 <div className="text-2xl font-bold text-white">{formatCurrency(displayPrice, globalCurrency)}</div>
                 <div className="text-[10px] text-zinc-500 uppercase">Real-Time Quote</div>
             </div>
             <div className="h-8 w-px bg-zinc-800 mx-2"></div>
             <div className="text-right hidden sm:block">
                 <div className="text-sm font-bold text-zinc-300">{formatCurrency(displayBalance, globalCurrency)}</div>
                 <div className="text-[10px] text-zinc-500 uppercase">Cash Available</div>
             </div>
        </div>
      </div>

      {/* 2. MAIN CONTENT GRID */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden min-h-0">
        
        {/* LEFT: CHART & INTEL (9 cols) */}
        <div className="lg:col-span-9 flex flex-col border-r border-zinc-800 min-h-0">
           {/* Chart */}
           <div className="flex-1 bg-zinc-900/50 relative min-h-[300px]">
              <div className="absolute inset-0">
                 <CandleStickChart data={history} markers={chartMarkers} />
              </div>
              <div className="absolute top-4 left-4 flex gap-2">
                 <span className="bg-zinc-900/80 backdrop-blur border border-zinc-700 px-2 py-1 rounded text-[10px] text-zinc-400 font-bold">1M</span>
                 <span className="bg-zinc-900/80 backdrop-blur border border-zinc-700 px-2 py-1 rounded text-[10px] text-zinc-400 font-bold flex items-center gap-1"><Activity size={10}/> PRO FEED</span>
              </div>
           </div>

           {/* AI HUD & Console */}
           <div className="h-48 border-t border-zinc-800 bg-black flex flex-col md:flex-row">
               {/* 1. Sentiment Gauge */}
               <div className="w-full md:w-64 p-4 border-r border-zinc-800 bg-zinc-950 flex flex-col justify-center gap-3">
                   <div className="flex justify-between text-[10px] font-bold uppercase text-zinc-500">
                       <span className="text-red-500">FEAR</span>
                       <span className="text-green-500">GREED</span>
                   </div>
                   <div className="h-2 bg-zinc-800 rounded-full relative overflow-hidden">
                       <div className="absolute inset-0 bg-gradient-to-r from-red-600 via-zinc-600 to-green-500 opacity-80"></div>
                       <div 
                         className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_10px_rgba(255,255,255,1)] transition-all duration-1000 ease-out"
                         style={{ left: `${sentimentScore}%` }}
                       ></div>
                   </div>
                   <div className="flex justify-between items-center">
                        <span className="text-3xl font-black text-white">{sentimentScore}</span>
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] text-zinc-500 uppercase font-bold">Sentiment</span>
                            <span className={`text-xs font-bold ${sentimentScore > 60 ? 'text-green-400' : sentimentScore < 40 ? 'text-red-400' : 'text-zinc-400'}`}>
                                {sentimentScore > 60 ? 'BULLISH' : sentimentScore < 40 ? 'BEARISH' : 'NEUTRAL'}
                            </span>
                        </div>
                   </div>
                   <div className="flex gap-2 mt-1">
                        <button onClick={handleAnalysis} disabled={isAnalyzing} className="flex-1 bg-zinc-800 text-[10px] font-bold py-1 rounded hover:bg-zinc-700 text-white">SCAN</button>
                        <button onClick={handleDeepAnalysis} disabled={isAnalyzing} className="flex-1 bg-indigo-900/30 border border-indigo-900 text-[10px] font-bold py-1 rounded hover:bg-indigo-900/50 text-indigo-300">DEEP THINK</button>
                   </div>
               </div>

               {/* 2. Logic Console */}
               <div className="flex-1 p-2 bg-black font-mono text-xs overflow-hidden flex flex-col">
                  <div className="flex items-center gap-2 text-zinc-500 border-b border-zinc-900 pb-1 mb-1">
                      <Terminal size={12} /> <span className="uppercase text-[10px] font-bold tracking-wider">Neural Logic Stream</span>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-1 p-1 custom-scrollbar">
                      {aiLog.map((line, i) => (
                          <div key={i} className="text-zinc-400 hover:text-zinc-200 transition-colors">
                              <span className="text-indigo-500 mr-2">➜</span>
                              {line}
                          </div>
                      ))}
                      <div ref={logEndRef} />
                  </div>
               </div>
           </div>
        </div>

        {/* RIGHT: ORDER BOOK & CONTROLS (3 cols) */}
        <div className="lg:col-span-3 flex flex-col min-h-0 bg-zinc-950 border-l border-zinc-800">
            
            {/* ORDER BOOK COMPONENT */}
            <div className="flex-1 border-b border-zinc-800 min-h-0 flex flex-col">
                <div className="p-2 border-b border-zinc-800 bg-zinc-900/50 text-xs font-bold text-zinc-400 flex items-center gap-2">
                    <BarChart3 size={12}/> DEPTH OF MARKET
                </div>
                <div className="flex-1 overflow-hidden relative">
                    <OrderBook 
                        currentPrice={currentNativePrice} 
                        onPriceClick={(p) => setTradeAmount(((parseFloat(tradeAmount) * currentNativePrice) / parseFloat(p)).toFixed(6))} 
                    />
                </div>
            </div>

            {/* ORDER FORM */}
            <div className="p-4 bg-zinc-900">
                <div className="flex justify-between items-center mb-2">
                    <h4 className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-2">
                        {isGridMode ? <Grid3X3 size={12} className="text-purple-400"/> : <Activity size={12}/>} 
                        {isGridMode ? 'Grid Strategy' : 'Market Order'}
                    </h4>
                    <button 
                        onClick={() => setIsGridMode(!isGridMode)} 
                        className="text-[10px] text-zinc-400 hover:text-white underline"
                    >
                        Switch to {isGridMode ? 'Standard' : 'Grid'}
                    </button>
                </div>

                <div className="space-y-3">
                    {!isGridMode ? (
                        <>
                            <div className="relative">
                                <label className="text-[9px] text-zinc-500 uppercase font-bold mb-1 block">Amount ({symbol})</label>
                                <input 
                                    type="number" 
                                    value={tradeAmount}
                                    onChange={(e) => setTradeAmount(e.target.value)}
                                    className="w-full bg-black border border-zinc-700 text-white p-3 rounded focus:border-indigo-500 outline-none font-mono text-lg"
                                />
                                <button onClick={setMaxBuy} className="absolute right-2 top-6 text-[10px] bg-zinc-800 px-2 py-1 rounded text-yellow-500 font-bold hover:bg-zinc-700">MAX</button>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-[9px] text-zinc-500 uppercase font-bold mb-1 block">Stop Loss</label>
                                    <div className="bg-black border border-zinc-800 p-2 rounded flex items-center gap-2">
                                        <ShieldAlert size={12} className="text-red-500"/>
                                        <input type="number" placeholder="Price" value={stopLoss} onChange={e => setStopLoss(e.target.value)} className="bg-transparent w-full text-xs text-white outline-none" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[9px] text-zinc-500 uppercase font-bold mb-1 block">Take Profit</label>
                                    <div className="bg-black border border-zinc-800 p-2 rounded flex items-center gap-2">
                                        <Target size={12} className="text-green-500"/>
                                        <input type="number" placeholder="Price" value={takeProfit} onChange={e => setTakeProfit(e.target.value)} className="bg-transparent w-full text-xs text-white outline-none" />
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                         <div className="p-3 bg-purple-900/10 border border-purple-900/30 rounded text-center">
                             <Grid3X3 size={24} className="mx-auto text-purple-500 mb-2"/>
                             <p className="text-xs text-purple-300 font-bold mb-1">Grid Farmer Mode</p>
                             <p className="text-[10px] text-zinc-500">Logic module ready. Configure upper/lower bounds in Bot settings.</p>
                         </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 mt-2">
                        <button 
                            onClick={() => executeTrade('buy')}
                            className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded active:scale-95 transition-all shadow-lg shadow-green-900/20"
                        >
                            BUY
                        </button>
                        <button 
                            onClick={() => executeTrade('sell')}
                            className="bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded active:scale-95 transition-all shadow-lg shadow-red-900/20"
                        >
                            SELL
                        </button>
                    </div>
                </div>

                {/* CURRENT POSITIONS SUMMARY */}
                {currentPosition && (
                    <div className="mt-4 pt-4 border-t border-zinc-800">
                        <div className="flex justify-between text-xs mb-1">
                            <span className="text-zinc-500">Holdings</span>
                            <span className="text-white font-mono">{currentPosition.amount.toFixed(4)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-zinc-500">PnL</span>
                            <span className={`font-mono font-bold ${currentPosition.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {currentPosition.pnl >= 0 ? '+' : ''}{formatCurrency(convertCurrency(currentPosition.pnl, 'USD', globalCurrency), globalCurrency)}
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default TradeTerminal;

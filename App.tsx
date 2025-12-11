
import React, { useState, useEffect, useRef } from 'react';
import { getAvailableSymbols, getSymbolPrice, getSymbolHistory } from './services/marketData';
import { getFinnhubKey, setFinnhubKey, searchSymbols } from './services/finnhub';
import { runMarketScannerAgent, getDeepThinkingAnalysis } from './services/gemini';
import { getAssetCurrency, convertCurrency, getDisplayPrice, formatCurrency, CURRENCY_SIGNS } from './services/currency';
import TradeTerminal from './components/TradeTerminal';
import Portfolio from './components/Portfolio';
import AutoTraderDashboard from './components/AutoTraderDashboard';
import { ViewState, Position, TradeOrder, SearchResult, CurrencyCode, BotConfig, BotLog, BotStats } from './types';
import { BarChart2, PieChart, Menu, X, Coins, TrendingUp, BrainCircuit, Settings, Search, PlayCircle, Bot } from 'lucide-react';

const App = () => {
  const [view, setView] = useState<ViewState>(ViewState.MARKET);
  const [activeSymbol, setActiveSymbol] = useState<string | null>(null);
  const [symbols, setSymbols] = useState<string[]>(getAvailableSymbols());
  const [prices, setPrices] = useState<Record<string, number>>({});
  
  // Settings
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState(getFinnhubKey());
  const [globalCurrency, setGlobalCurrency] = useState<CurrencyCode>('USD');

  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // User Data (ALWAYS IN USD BASE)
  const [balanceUSD, setBalanceUSD] = useState(100000); 
  const [positions, setPositions] = useState<Position[]>([]);
  const [trades, setTrades] = useState<TradeOrder[]>([]);
  
  // AI Feedback
  const [globalAdvice, setGlobalAdvice] = useState<string>("");
  const [scannerResult, setScannerResult] = useState<{symbol: string, action: string, reasoning: string, sl?: number, tp?: number} | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scannerBudget, setScannerBudget] = useState<string>("");

  // --- BOT STATE ---
  const [botConfig, setBotConfig] = useState<BotConfig>({
    enabled: false,
    riskPerTrade: 1, // 1% of balance
    intervalSeconds: 30,
    maxOpenPositions: 3,
    strategy: 'conservative',
    useTrailingStop: true,
    allowedSymbols: [], // Empty means all
    dailyProfitTarget: 5000 // Default 5000 USD
  });
  const [botLogs, setBotLogs] = useState<BotLog[]>([]);
  const [botStats, setBotStats] = useState<BotStats>({ 
      wins: 0, 
      losses: 0, 
      totalProfitUSD: 0, 
      startTime: Date.now(),
      grossProfit: 0,
      grossLoss: 0,
      maxDrawdown: 0,
      peakPnL: 0
  });
  
  const botIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastBotScanTime = useRef<number>(0);

  const addBotLog = (message: string, type: 'info' | 'success' | 'error' | 'warning' | 'whale' = 'info', symbol?: string) => {
    setBotLogs(prev => [...prev, { timestamp: Date.now(), message, type, symbol }].slice(-50));
  };

  // Global Price Ticker
  useEffect(() => {
    const updatePrices = async () => {
      const newPrices: Record<string, number> = {};

      await Promise.all(symbols.map(async (s) => {
        const p = await getSymbolPrice(s);
        newPrices[s] = p;
      }));
      setPrices(newPrices);
    };

    updatePrices(); // Initial fetch
    const interval = setInterval(updatePrices, 5000); // 5s tick for SL/TP
    return () => clearInterval(interval);
  }, [symbols, apiKey]);

  // Search Effect
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.length > 0 && apiKey) { 
        setIsSearching(true);
        const results = await searchSymbols(searchQuery);
        setSearchResults(results.slice(0, 8)); 
        setIsSearching(false);
      } else {
        setSearchResults([]);
      }
    }, 400); 
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, apiKey]);

  // Update Positions Valuation & Check SL/TP (The Watchdog)
  useEffect(() => {
    setPositions(prevPositions => {
      let updatedPositions = [...prevPositions];

      updatedPositions = updatedPositions.map(pos => {
        const nativePrice = prices[pos.symbol] !== undefined ? prices[pos.symbol] : pos.avgPrice;
        if (prices[pos.symbol] === undefined) return pos; // Skip if no price yet

        const assetCurrency = getAssetCurrency(pos.symbol);
        const priceInUSD = convertCurrency(nativePrice, assetCurrency, 'USD');
        const avgPriceInUSD = convertCurrency(pos.avgPrice, assetCurrency, 'USD');

        const currentValue = pos.amount * priceInUSD;
        const costBasis = pos.amount * avgPriceInUSD;
        const pnl = currentValue - costBasis;
        const pnlPercent = costBasis !== 0 ? (pnl / costBasis) * 100 : 0;
        
        let newSL = pos.stopLoss;
        let isTrailingUpdate = false;

        // TRAILING STOP LOGIC
        if (pos.isTrailing && nativePrice > pos.avgPrice) {
            const trailingGap = nativePrice * 0.02; // 2% trail
            const potentialSL = nativePrice - trailingGap;
            
            if (newSL === undefined || potentialSL > newSL) {
                newSL = potentialSL;
                isTrailingUpdate = true;
            }
        }

        // STOP LOSS / TAKE PROFIT CHECK
        if (newSL && nativePrice <= newSL) {
           addBotLog(`STOP LOSS triggered for ${pos.symbol} at ${nativePrice.toFixed(2)}`, 'warning', pos.symbol);
           handleTrade(pos.symbol, pos.amount, nativePrice, 'sell', undefined, undefined, 'stop_loss');
           return { ...pos, amount: 0 }; // Mark for removal
        }
        
        // Take profit only if NOT trailing (Trailing replaces TP)
        if (!pos.isTrailing && pos.takeProfit && nativePrice >= pos.takeProfit) {
           addBotLog(`TAKE PROFIT triggered for ${pos.symbol} at ${nativePrice.toFixed(2)}`, 'success', pos.symbol);
           handleTrade(pos.symbol, pos.amount, nativePrice, 'sell', undefined, undefined, 'take_profit');
           return { ...pos, amount: 0 }; // Mark for removal
        }

        return { ...pos, currentValue, pnl, pnlPercent, stopLoss: newSL, isTrailing: pos.isTrailing };
      });

      const active = updatedPositions.filter(p => p.amount > 0);
      if (active.length !== prevPositions.length) return active;
      return updatedPositions; 
    });
  }, [prices]);

  // --- BOT LOGIC LOOP ---
  useEffect(() => {
    if (botConfig.enabled) {
       const loop = setInterval(async () => {
          const now = Date.now();
          
          // DAILY PROFIT TARGET CHECK
          if (botStats.totalProfitUSD >= botConfig.dailyProfitTarget) {
              setBotConfig(prev => ({ ...prev, enabled: false }));
              addBotLog(`💰 DAILY TARGET HIT ($${botConfig.dailyProfitTarget.toFixed(2)}). Bot stopping to secure bag.`, 'success');
              alert(`DAILY PROFIT TARGET HIT! ENJOY YOUR GAINS.`);
              return;
          }

          // Scan Interval
          if (now - lastBotScanTime.current > (botConfig.intervalSeconds * 1000)) {
             lastBotScanTime.current = now;
             
             // Pick a symbol to analyze based on whitelist or full list
             const pool = botConfig.allowedSymbols && botConfig.allowedSymbols.length > 0 
                ? botConfig.allowedSymbols 
                : symbols;
             const validPool = pool.filter(s => symbols.includes(s));
             if(validPool.length === 0) return;

             const candidate = validPool[Math.floor(Math.random() * validPool.length)];
             const existingPos = positions.find(p => p.symbol === candidate);
             
             try {
                const history = await getSymbolHistory(candidate);
                const price = prices[candidate] || await getSymbolPrice(candidate);
                
                const snapshot = { [candidate]: { price, history: history.slice(-15).map(h => h.price) } };
                
                if (existingPos) {
                    // --- EXIT ANALYSIS ---
                    const result = await runMarketScannerAgent(snapshot, 'scan_exit');
                    if (result.action === 'sell') {
                         addBotLog(`BOT SIGNAL: SELL ${candidate} (Weakness Detected).`, 'warning', candidate);
                         handleTrade(candidate, existingPos.amount, price, 'sell', undefined, undefined, 'auto_exit');
                    } else {
                         addBotLog(`Monitoring ${candidate}... Holding strong.`, 'info', candidate);
                    }
                } else {
                    // --- ENTRY ANALYSIS ---
                    if (positions.length >= botConfig.maxOpenPositions) return;

                    const result = await runMarketScannerAgent(snapshot, 'scan_entry');
                    
                    if (result.symbol !== 'ERROR' && result.symbol !== 'SYSTEM' && result.action === 'buy') {
                        addBotLog(`BOT SIGNAL: BUY ${result.symbol}. Reasoning: ${result.reasoning}`, 'success', result.symbol);
                        
                        // Calculate sizing based on Risk (e.g., 5% of balance for simplicity or fixed)
                        const investAmountUSD = balanceUSD * 0.05; 
                        const assetCurrency = getAssetCurrency(result.symbol);
                        const priceInUSD = convertCurrency(price, assetCurrency, 'USD');
                        const amount = investAmountUSD / priceInUSD;
                        
                        if (amount > 0) {
                            handleTrade(result.symbol, amount, price, 'buy', result.sl, result.tp, 'auto_entry');
                        }
                    } else {
                        addBotLog(`Scan ${candidate}: ${result.action}`, 'info');
                    }
                }
             } catch (e) {
                addBotLog(`Bot scan failed for ${candidate}`, 'error');
             }
          }
       }, 5000); 
       
       botIntervalRef.current = loop;
    } else {
       if (botIntervalRef.current) clearInterval(botIntervalRef.current);
    }

    return () => {
      if (botIntervalRef.current) clearInterval(botIntervalRef.current);
    };
  }, [botConfig, positions, balanceUSD, symbols, prices, botStats]);


  // Unified Trade Handler
  const handleTrade = (
    symbol: string, 
    amount: number, 
    nativePrice: number, 
    side: 'buy' | 'sell',
    sl?: number,
    tp?: number,
    type: 'market' | 'stop_loss' | 'take_profit' | 'auto_entry' | 'panic_sell' | 'auto_exit' = 'market'
  ) => {
    const assetCurrency = getAssetCurrency(symbol);
    const priceInUSD = convertCurrency(nativePrice, assetCurrency, 'USD');
    const costInUSD = amount * priceInUSD;

    if (side === 'buy') {
      if (balanceUSD < costInUSD) {
        if (type === 'market') alert(`Not enough cash.`);
        return;
      }
      setBalanceUSD(prev => prev - costInUSD);
      
      setPositions(prev => {
        const existing = prev.find(p => p.symbol === symbol);
        const isTrailing = (type === 'auto_entry' && botConfig.useTrailingStop) ? true : false;
        const finalSL = isTrailing && !sl ? nativePrice * 0.95 : sl; 

        if (existing) {
          const totalCostNative = (existing.amount * existing.avgPrice) + (amount * nativePrice);
          const totalAmount = existing.amount + amount;
          return prev.map(p => p.symbol === symbol ? {
            ...p,
            amount: totalAmount,
            avgPrice: totalCostNative / totalAmount,
            currentValue: (totalAmount * priceInUSD),
            stopLoss: finalSL || p.stopLoss,
            takeProfit: tp || p.takeProfit,
            isTrailing: p.isTrailing || isTrailing
          } : p);
        } else {
          return [...prev, {
            symbol,
            amount,
            avgPrice: nativePrice,
            currentValue: costInUSD,
            pnl: 0,
            pnlPercent: 0,
            stopLoss: finalSL,
            takeProfit: tp,
            isTrailing: isTrailing
          }];
        }
      });
      if (type === 'market') addBotLog(`Bought ${symbol} @ ${nativePrice}`, 'success', symbol);
      else addBotLog(`Auto-Bot Bought ${symbol}`, 'success', symbol);

    } else {
      // SELLING
      setBalanceUSD(prev => prev + costInUSD);
      
      const pos = positions.find(p => p.symbol === symbol);
      if (pos) {
          const costBasis = amount * convertCurrency(pos.avgPrice, assetCurrency, 'USD');
          const proceeds = amount * priceInUSD;
          const realizedPnL = proceeds - costBasis;
          
          setBotStats(prev => {
              const newTotalProfit = prev.totalProfitUSD + realizedPnL;
              const newPeak = Math.max(prev.peakPnL, newTotalProfit);
              // Drawdown is how far we are from the peak
              const currentDrawdown = newPeak - newTotalProfit;
              
              return {
               ...prev,
               wins: realizedPnL > 0 ? prev.wins + 1 : prev.wins,
               losses: realizedPnL <= 0 ? prev.losses + 1 : prev.losses,
               totalProfitUSD: newTotalProfit,
               grossProfit: realizedPnL > 0 ? prev.grossProfit + realizedPnL : prev.grossProfit,
               grossLoss: realizedPnL < 0 ? prev.grossLoss + Math.abs(realizedPnL) : prev.grossLoss,
               peakPnL: newPeak,
               maxDrawdown: Math.max(prev.maxDrawdown, currentDrawdown)
              };
          });
      }

      setPositions(prev => {
        const existing = prev.find(p => p.symbol === symbol);
        if (!existing) return prev;

        const newAmount = existing.amount - amount;
        if (newAmount <= 0.000001) {
          return prev.filter(p => p.symbol !== symbol);
        }
        return prev.map(p => p.symbol === symbol ? {
           ...p,
           amount: newAmount,
           currentValue: newAmount * priceInUSD
        } : p);
      });
    }

    setTrades(prev => [...prev, { symbol, amount, price: nativePrice, side, timestamp: Date.now(), type }]);
  };

  const panicSellAll = () => {
      addBotLog("PANIC SELL INITIATED. DUMPING EVERYTHING.", "error");
      setBotConfig(prev => ({...prev, enabled: false})); // Kill bot
      
      // Batch update to avoid state race conditions
      setPositions(prevPositions => {
          let totalProceedsUSD = 0;
          
          prevPositions.forEach(p => {
             const currentPrice = prices[p.symbol] || p.avgPrice;
             const assetCurrency = getAssetCurrency(p.symbol);
             const priceInUSD = convertCurrency(currentPrice, assetCurrency, 'USD');
             const proceeds = p.amount * priceInUSD;
             
             totalProceedsUSD += proceeds;
             // Log the sell
             setTrades(prev => [...prev, { 
                 symbol: p.symbol, 
                 amount: p.amount, 
                 price: currentPrice, 
                 side: 'sell', 
                 timestamp: Date.now(), 
                 type: 'panic_sell' 
             }]);
          });

          // Update Balance once
          setBalanceUSD(prev => prev + totalProceedsUSD);
          
          return []; // Clear all positions
      });
      
      alert("ALL ASSETS LIQUIDATED.");
  };

  const saveSettings = () => {
    setFinnhubKey(apiKey);
    setShowSettings(false);
  };

  const addSymbol = (symbol: string) => {
      if (!symbols.includes(symbol)) {
          setSymbols(prev => [symbol, ...prev]);
      }
      setSearchQuery("");
      setSearchResults([]);
      setActiveSymbol(symbol);
      setView(ViewState.ANALYSIS);
  };

  const runAgent = async () => {
    setIsScanning(true);
    setScannerResult(null);
    try {
      const budgetVal = parseFloat(scannerBudget);
      let scanList = symbols;

      if (!isNaN(budgetVal) && budgetVal > 0) {
        scanList = symbols.filter(sym => {
           const price = prices[sym];
           if (!price) return false;
           const displayPrice = getDisplayPrice(price, sym, globalCurrency);
           return displayPrice <= budgetVal;
        });

        if (scanList.length === 0) {
          alert(`No stocks found under ${formatCurrency(budgetVal, globalCurrency)}.`);
          setIsScanning(false);
          return;
        }
      }

      scanList = scanList.slice(0, 10);
      const marketSnapshot: Record<string, any> = {};
      for (const sym of scanList) {
        const h = await getSymbolHistory(sym);
        marketSnapshot[sym] = { 
            price: prices[sym] || 0,
            history: h.slice(-15).map(p => p.price) 
        };
      }
      
      const result = await runMarketScannerAgent(marketSnapshot);
      setScannerResult(result);
      
      if (result.action === 'buy' && result.symbol !== 'ERROR') {
          const investAmt = (!isNaN(budgetVal) && budgetVal > 0) 
            ? formatCurrency(budgetVal, globalCurrency)
            : formatCurrency(convertCurrency(1000, 'USD', globalCurrency), globalCurrency);

          if (confirm(`Agent wants to BUY ${result.symbol} with ${investAmt}.\nSL: ${result.sl || 'N/A'}\nTP: ${result.tp || 'N/A'}\nExecute?`)) {
            const nativePrice = prices[result.symbol] || 0;
            if (nativePrice > 0) {
              const assetCurrency = getAssetCurrency(result.symbol);
              const priceInUSD = convertCurrency(nativePrice, assetCurrency, 'USD');
              
              let investAmountUSD = 1000;
              if (!isNaN(budgetVal) && budgetVal > 0) {
                  investAmountUSD = convertCurrency(budgetVal, globalCurrency, 'USD');
              }
              
              const amount = investAmountUSD / priceInUSD; 
              handleTrade(result.symbol, amount, nativePrice, 'buy', result.sl, result.tp);
            }
          }
      }
      
    } catch (e) {
      alert("Agent crashed.");
    } finally {
      setIsScanning(false);
    }
  };

  const onLogClick = (sym: string) => {
      if (sym) {
          setActiveSymbol(sym);
          setView(ViewState.ANALYSIS);
      }
  };

  const renderMarketList = () => (
    <div className="p-6 max-w-7xl mx-auto flex flex-col lg:flex-row gap-6">
      {/* LEFT COLUMN: Market & Scanner */}
      <div className="flex-1">
        <div className="flex flex-col md:flex-row justify-between items-end mb-6 gap-4">
          <div>
              <h1 className="text-3xl font-bold text-white mb-2">Real-Time Market</h1>
              <p className="text-zinc-400">Trading Base: <span className="text-green-400 font-mono">USD</span> | Display: <span className="text-yellow-400 font-mono">{globalCurrency}</span></p>
          </div>
          <div className="flex items-center gap-4">
              <button onClick={() => setShowSettings(!showSettings)} className="p-2 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400"><Settings size={20} /></button>
              <div className="text-right">
                  <span className="text-xs text-zinc-500 uppercase font-bold">Buying Power</span>
                  <div className="text-2xl font-mono text-green-400 font-bold">{formatCurrency(convertCurrency(balanceUSD, 'USD', globalCurrency), globalCurrency)}</div>
              </div>
          </div>
        </div>

        {showSettings && (
          <div className="mb-8 p-6 bg-zinc-900 border border-zinc-700 rounded-xl relative overflow-hidden">
             {/* Settings Content Same as Before */}
             <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-yellow-500 flex items-center gap-2"><Settings size={18}/> SYSTEM CONFIG</h3>
              <button onClick={() => setShowSettings(false)}><X className="text-zinc-500" /></button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-xs text-zinc-400 uppercase font-bold mb-2 block">Finnhub API Key</label>
                <div className="flex gap-2">
                  <input 
                      type="text" 
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="Enter Token"
                      className="flex-1 bg-black border border-zinc-700 p-2 rounded text-white text-sm"
                  />
                  <button onClick={saveSettings} className="bg-zinc-800 px-4 py-2 rounded text-white font-bold text-xs hover:bg-zinc-700">SAVE</button>
                </div>
              </div>
              <div>
                 <label className="text-xs text-zinc-400 uppercase font-bold mb-2 block">Display Currency</label>
                 <div className="flex flex-wrap gap-2">
                    {(['USD', 'INR', 'EUR', 'GBP', 'JPY'] as CurrencyCode[]).map(curr => (
                       <button key={curr} onClick={() => setGlobalCurrency(curr)} className={`px-4 py-2 rounded text-sm font-bold border transition-all ${globalCurrency === curr ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-black border-zinc-800 text-zinc-500 hover:text-zinc-300'}`}>{curr}</button>
                    ))}
                 </div>
              </div>
            </div>
          </div>
        )}
        
        {/* SEARCH */}
        <div className="relative mb-8 z-20">
          <div className="flex items-center bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 focus-within:border-indigo-500 transition-all">
              <Search className="text-zinc-500 mr-3" />
              <input type="text" className="bg-transparent border-none outline-none text-white w-full placeholder-zinc-500" placeholder="Search stocks..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value.toUpperCase())} />
              {isSearching && <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>}
          </div>
          {searchResults.length > 0 && (
             <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden max-h-80 overflow-y-auto z-30">
                 {searchResults.map((res, idx) => (
                     <div key={idx} onClick={() => addSymbol(res.symbol)} className="p-3 hover:bg-zinc-800 cursor-pointer border-b border-zinc-800 flex justify-between items-center">
                         <div><div className="font-bold text-white">{res.symbol}</div><div className="text-xs text-zinc-400">{res.description}</div></div>
                     </div>
                 ))}
             </div>
          )}
        </div>

        {/* AGENT SCANNER */}
        <div className="mb-8 p-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-xl shadow-2xl">
          <div className="bg-zinc-950 p-6 rounded-[10px] flex flex-col xl:flex-row items-center justify-between gap-6">
             <div className="flex items-center gap-4 min-w-[300px]">
                 <div className="bg-indigo-500/20 p-3 rounded-full"><BrainCircuit className="text-indigo-400" size={32} /></div>
                 <div><h2 className="text-xl font-bold text-white">Manual Agent</h2><p className="text-zinc-400 text-sm">One-time scan & recommend.</p></div>
             </div>
             
             <div className="flex-1 w-full flex justify-center">
                {scannerResult && (
                    <div className="bg-zinc-900 p-4 rounded border border-zinc-800 flex justify-between items-center w-full max-w-2xl">
                        <div>
                           <span className={`font-black text-xl uppercase ${scannerResult.action === 'buy' ? 'text-green-500' : 'text-yellow-500'}`}>{scannerResult.action} {scannerResult.symbol}</span>
                           <p className="text-xs text-zinc-400">{scannerResult.reasoning}</p>
                           {scannerResult.sl && <div className="text-[10px] text-zinc-500 mt-1">Suggested SL: {scannerResult.sl} | TP: {scannerResult.tp}</div>}
                        </div>
                        <button onClick={() => setScannerResult(null)} className="text-zinc-500 hover:text-white"><X size={16} /></button>
                    </div>
                )}
             </div>

             <div className="flex gap-2 w-full xl:w-auto">
                 <div className="relative flex-1 xl:w-40">
                    <span className="absolute left-3 top-3.5 text-zinc-500 font-bold text-sm">{CURRENCY_SIGNS[globalCurrency]}</span>
                    <input type="number" value={scannerBudget} onChange={(e) => setScannerBudget(e.target.value)} placeholder="Budget" className="w-full bg-black border border-zinc-800 text-white pl-8 pr-4 py-3 rounded-lg focus:outline-none focus:border-indigo-500 font-mono" />
                 </div>
                 <button onClick={runAgent} disabled={isScanning} className="bg-white text-black font-bold py-3 px-6 rounded-lg hover:bg-zinc-200 transition-colors flex items-center gap-2 min-w-[120px] justify-center">
                    {isScanning ? <span className="animate-pulse">...</span> : <PlayCircle size={20} />}
                 </button>
             </div>
          </div>
        </div>

        {/* SYMBOL LIST */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {symbols.map(sym => {
             const price = prices[sym];
             const displayPriceStr = price !== undefined ? formatCurrency(getDisplayPrice(price, sym, globalCurrency), globalCurrency) : '...';
             
             return (
              <div key={sym} onClick={() => { setActiveSymbol(sym); setView(ViewState.ANALYSIS); }} className="group bg-zinc-900 border border-zinc-800 p-6 rounded-xl hover:border-yellow-500/50 cursor-pointer transition-all hover:shadow-lg hover:shadow-yellow-900/10">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3">
                     <div className="bg-zinc-800 p-2 rounded text-zinc-300 group-hover:text-yellow-500 transition-colors"><Coins size={24} /></div>
                     <span className="text-xl font-bold text-white truncate">{sym}</span>
                  </div>
                </div>
                <div className="text-2xl font-mono text-zinc-200 group-hover:text-white transition-colors">{displayPriceStr}</div>
              </div>
             );
          })}
        </div>
      </div>

      {/* RIGHT COLUMN: Recent Trades (Removed Bot Control) */}
      <div className="w-full lg:w-72 flex flex-col gap-6 lg:border-l border-zinc-800 lg:h-[calc(100vh-64px)] overflow-hidden bg-zinc-950/50 p-4 sticky top-16">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex-1 overflow-hidden flex flex-col">
             <h3 className="text-zinc-400 font-bold text-xs uppercase mb-3 flex items-center gap-2"><TrendingUp size={12}/> Market Activity</h3>
             <div className="flex-1 overflow-y-auto space-y-2">
                 {trades.length === 0 && <div className="text-zinc-600 text-xs text-center italic mt-10">No recent activity.</div>}
                 {trades.slice().reverse().map((t, i) => (
                    <div key={i} className="flex justify-between items-center text-xs border-b border-zinc-800 pb-2">
                       <div>
                          <span className={`font-bold ${t.side === 'buy' ? 'text-green-500' : 'text-red-500'}`}>{t.side.toUpperCase()}</span> <span className="text-white">{t.symbol}</span>
                          <div className="text-zinc-500">{new Date(t.timestamp).toLocaleTimeString()}</div>
                       </div>
                       <div className="text-right">
                          <div className="font-mono text-white">{t.price.toFixed(2)}</div>
                          {t.type && <div className="text-[9px] uppercase bg-zinc-800 px-1 rounded inline-block text-zinc-400">{t.type.replace('_', ' ')}</div>}
                       </div>
                    </div>
                 ))}
             </div>
          </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col font-sans">
      <nav className="border-b border-zinc-800 bg-zinc-950 sticky top-0 z-50 backdrop-blur-md bg-opacity-80">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
           <div className="flex items-center gap-2 font-bold text-xl cursor-pointer" onClick={() => { setView(ViewState.MARKET); setActiveSymbol(null); }}>
              <div className="bg-gradient-to-tr from-yellow-600 to-yellow-400 w-8 h-8 rounded flex items-center justify-center text-black"><span className="font-black">Z</span></div>
              <span className="hidden sm:inline">Z-MODE <span className="text-zinc-600">TRADER</span></span>
           </div>
           <div className="flex items-center gap-1 bg-zinc-900/50 p-1 rounded-lg border border-zinc-800">
              <button onClick={() => { setView(ViewState.MARKET); setActiveSymbol(null); }} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${view === ViewState.MARKET && !activeSymbol ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'}`}><BarChart2 size={16} /> Market</button>
              <button onClick={() => { setView(ViewState.PORTFOLIO); setActiveSymbol(null); }} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${view === ViewState.PORTFOLIO ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'}`}><PieChart size={16} /> Portfolio</button>
              <button onClick={() => { setView(ViewState.AUTO_TRADER); setActiveSymbol(null); }} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${view === ViewState.AUTO_TRADER ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'}`}><Bot size={16} /> Auto-Pilot</button>
           </div>
        </div>
      </nav>

      <main className="flex-1 relative">
        {activeSymbol && view === ViewState.ANALYSIS ? (
          <div className="absolute inset-0 z-10 bg-black">
             <TradeTerminal 
                symbol={activeSymbol} 
                balanceUSD={balanceUSD}
                globalCurrency={globalCurrency}
                onClose={() => { setActiveSymbol(null); setView(ViewState.MARKET); }} 
                onTrade={handleTrade}
                currentPosition={positions.find(p => p.symbol === activeSymbol)}
             />
          </div>
        ) : (
           <>
              {view === ViewState.MARKET && renderMarketList()}
              {view === ViewState.AUTO_TRADER && (
                 <AutoTraderDashboard 
                   config={botConfig} 
                   stats={botStats}
                   logs={botLogs} 
                   positions={positions.filter(p => p.amount > 0)}
                   availableSymbols={symbols}
                   globalCurrency={globalCurrency}
                   onConfigChange={setBotConfig}
                   onPanicSell={panicSellAll}
                   onLogClick={onLogClick}
                 />
              )}
              {view === ViewState.PORTFOLIO && (
                 <div className="flex flex-col h-full">
                    <Portfolio positions={positions} balanceUSD={balanceUSD} globalCurrency={globalCurrency} />
                    <div className="max-w-4xl mx-auto w-full px-6 pb-12">
                       <button onClick={async () => { setGlobalAdvice("Gemini 3 Pro is analyzing your entire financial existence..."); const advice = await getDeepThinkingAnalysis(positions); setGlobalAdvice(advice); }} className="w-full bg-gradient-to-r from-indigo-900 to-purple-900 border border-indigo-700 p-4 rounded-xl text-indigo-100 hover:opacity-90 transition-opacity flex items-center justify-center gap-2 font-bold shadow-lg shadow-purple-500/20"><BrainCircuit size={20} /> DEEP PORTFOLIO ANALYSIS (Thinking Model)</button>
                       {globalAdvice && <div className="mt-4 p-6 bg-zinc-900 rounded-xl border border-l-4 border-l-yellow-500"><p className="text-lg leading-relaxed">{globalAdvice}</p></div>}
                    </div>
                 </div>
              )}
           </>
        )}
      </main>
    </div>
  );
};

export default App;


import React, { useRef, useEffect, useState } from 'react';
import { BotConfig, BotLog, Position, CurrencyCode, BotStats } from '../types';
import { Bot, Power, Activity, Zap, Terminal, ShieldAlert, Target, Trash2, Crosshair, Trophy, TrendingUp, AlertOctagon, ExternalLink, PieChart as PieIcon } from 'lucide-react';
import { formatCurrency, convertCurrency } from '../services/currency';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface Props {
  config: BotConfig;
  stats: BotStats;
  logs: BotLog[];
  positions: Position[];
  availableSymbols: string[];
  globalCurrency: CurrencyCode;
  onConfigChange: (newConfig: BotConfig) => void;
  onPanicSell: () => void;
  onLogClick: (symbol: string) => void;
}

const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#22c55e', '#eab308', '#ef4444'];

const AutoTraderDashboard: React.FC<Props> = ({ config, stats, logs, positions, availableSymbols, globalCurrency, onConfigChange, onPanicSell, onLogClick }) => {
  const logEndRef = useRef<HTMLDivElement>(null);
  const [isEditingWhitelist, setIsEditingWhitelist] = useState(false);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const toggleBot = () => {
    onConfigChange({ ...config, enabled: !config.enabled });
  };

  const updateStrategy = (strategy: 'conservative' | 'aggressive' | 'degen') => {
    onConfigChange({ ...config, strategy });
  };

  const toggleSymbol = (sym: string) => {
      const current = config.allowedSymbols || [];
      if (current.includes(sym)) {
          onConfigChange({ ...config, allowedSymbols: current.filter(s => s !== sym) });
      } else {
          onConfigChange({ ...config, allowedSymbols: [...current, sym] });
      }
  };

  // Stats Logic
  const totalTrades = stats.wins + stats.losses;
  const winRate = totalTrades > 0 ? ((stats.wins / totalTrades) * 100).toFixed(1) : "0.0";
  const profitFactor = stats.grossLoss > 0 ? (stats.grossProfit / stats.grossLoss).toFixed(2) : "∞";

  // Pie Chart Data
  const pieData = positions.map(p => ({
      name: p.symbol,
      value: p.currentValue
  })).sort((a, b) => b.value - a.value);

  // Check Concentration Risk
  const totalVal = pieData.reduce((acc, curr) => acc + curr.value, 0);
  const highConcentration = pieData.some(p => (p.value / totalVal) > 0.5);

  return (
    <div className="p-6 max-w-7xl mx-auto h-[calc(100vh-80px)] flex flex-col gap-6">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-zinc-900/80 p-6 rounded-2xl border border-zinc-800 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className={`p-4 rounded-full ${config.enabled ? 'bg-green-500/20' : 'bg-zinc-800'}`}>
             <Bot className={config.enabled ? "text-green-500 animate-pulse" : "text-zinc-500"} size={40} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tighter">Z-MODE AUTO-PILOT</h1>
            <p className="text-zinc-400 font-mono text-sm">Autonomous Algorithmic Execution Engine</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
            {positions.length > 0 && (
                <button 
                    onClick={() => { if(confirm("ARE YOU SURE? THIS WILL SELL EVERYTHING.")) onPanicSell(); }}
                    className="px-4 py-4 rounded-xl font-bold text-sm bg-red-900/30 text-red-500 border border-red-900 hover:bg-red-600 hover:text-white transition-all flex items-center gap-2"
                >
                    <AlertOctagon size={18} /> PANIC SELL ALL
                </button>
            )}
            <button 
            onClick={toggleBot}
            className={`px-8 py-4 rounded-xl font-bold text-xl flex items-center gap-3 transition-all shadow-xl hover:scale-105 active:scale-95 ${
                config.enabled 
                ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-green-900/20 border border-green-500" 
                : "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700 hover:text-white"
            }`}
            >
            <Power size={24} /> {config.enabled ? "SYSTEM ONLINE" : "ACTIVATE BOT"}
            </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
        
        {/* LEFT PANEL: CONFIG & STATS */}
        <div className="w-full lg:w-1/3 flex flex-col gap-6 overflow-y-auto pr-2">
           
           {/* SCOREBOARD */}
           <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10"><Trophy size={100} className="text-yellow-500"/></div>
              <h2 className="text-zinc-500 font-bold uppercase text-xs tracking-widest mb-4 flex items-center gap-2">
                 <Trophy size={14} className="text-yellow-500"/> Performance Health
              </h2>
              <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 text-center">
                      <span className="text-zinc-500 text-xs uppercase font-bold">Net Profit</span>
                      <div className={`text-xl font-mono font-bold ${stats.totalProfitUSD >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {stats.totalProfitUSD >= 0 ? '+' : ''}{formatCurrency(convertCurrency(stats.totalProfitUSD, 'USD', globalCurrency), globalCurrency)}
                      </div>
                  </div>
                  <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 text-center">
                      <span className="text-zinc-500 text-xs uppercase font-bold">Win Rate</span>
                      <div className="text-xl font-mono font-bold text-white">{winRate}%</div>
                      <div className="text-[10px] text-zinc-500">{stats.wins}W - {stats.losses}L</div>
                  </div>
              </div>
              
              {/* PIE CHART SECTION */}
              {pieData.length > 0 && (
                <div className="mt-6 border-t border-zinc-800 pt-4">
                    <h3 className="text-[10px] text-zinc-500 font-bold uppercase mb-2 flex justify-between">
                        <span>Exposure</span>
                        {highConcentration && <span className="text-red-500 flex items-center gap-1"><ShieldAlert size={10}/> RISK</span>}
                    </h3>
                    <div className="h-32 w-full flex items-center">
                        <div className="w-1/2 h-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={pieData} innerRadius={25} outerRadius={40} paddingAngle={5} dataKey="value">
                                        {pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none"/>
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{backgroundColor: '#18181b', borderColor: '#27272a', fontSize: '12px'}} formatter={(val: number) => formatCurrency(convertCurrency(val, 'USD', globalCurrency), globalCurrency)} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="w-1/2 text-[10px] space-y-1">
                            {pieData.slice(0, 3).map((entry, index) => (
                                <div key={index} className="flex justify-between items-center text-zinc-400">
                                    <div className="flex items-center gap-1">
                                        <div className="w-2 h-2 rounded-full" style={{backgroundColor: COLORS[index % COLORS.length]}}></div>
                                        {entry.name}
                                    </div>
                                    <span>{Math.round((entry.value / totalVal) * 100)}%</span>
                                </div>
                            ))}
                            {pieData.length > 3 && <div className="text-center italic opacity-50 text-[9px]">+ {pieData.length - 3} more</div>}
                        </div>
                    </div>
                </div>
              )}
           </div>

           {/* STRATEGY CONTROLS */}
           <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex-1 flex flex-col">
              <h2 className="text-zinc-500 font-bold uppercase text-xs tracking-widest mb-6 flex items-center gap-2">
                 <SettingsIcon size={14}/> Strategy Control
              </h2>
              
              <div className="space-y-6">
                
                {/* DAILY PROFIT TARGET */}
                <div>
                     <label className="text-sm font-bold text-white mb-2 block flex items-center gap-2">
                        <Target size={16} className="text-green-500"/> Daily Profit Target ({globalCurrency})
                     </label>
                     <div className="flex gap-2">
                         <input 
                            type="number" 
                            value={config.dailyProfitTarget}
                            onChange={(e) => onConfigChange({...config, dailyProfitTarget: parseFloat(e.target.value)})}
                            className="w-full bg-black border border-zinc-700 p-2 rounded text-white text-sm"
                         />
                     </div>
                </div>

                <div>
                    <label className="text-sm font-bold text-white mb-3 block flex items-center gap-2"><Zap size={16} className="text-yellow-500"/> Aggression Level</label>
                    <div className="grid grid-cols-3 gap-2">
                    {['conservative', 'aggressive', 'degen'].map((s) => (
                        <button
                        key={s}
                        onClick={() => updateStrategy(s as any)}
                        className={`py-2 text-[10px] uppercase font-bold rounded-lg border transition-all ${
                            config.strategy === s 
                            ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-900/20" 
                            : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:bg-zinc-800"
                        }`}
                        >
                        {s}
                        </button>
                    ))}
                    </div>
                </div>

                {/* TRAILING STOP TOGGLE */}
                <div className="flex items-center justify-between bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                    <div>
                        <span className="text-sm font-bold text-white flex items-center gap-2">
                            <TrendingUp size={16} className="text-green-500" /> Trailing Stop Loss
                        </span>
                        <p className="text-[10px] text-zinc-500 mt-1">Automatically move SL up to lock profits.</p>
                    </div>
                    <button 
                        onClick={() => onConfigChange({...config, useTrailingStop: !config.useTrailingStop})}
                        className={`w-12 h-6 rounded-full transition-colors relative ${config.useTrailingStop ? 'bg-green-600' : 'bg-zinc-700'}`}
                    >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${config.useTrailingStop ? 'left-7' : 'left-1'}`}></div>
                    </button>
                </div>

                {/* WHITELIST SELECTOR */}
                <div>
                    <label className="text-sm font-bold text-white mb-3 block flex items-center justify-between">
                        <span className="flex items-center gap-2"><Crosshair size={16} className="text-blue-500"/> Target Assets</span>
                        <button onClick={() => setIsEditingWhitelist(!isEditingWhitelist)} className="text-xs text-indigo-400 hover:text-indigo-300">
                            {isEditingWhitelist ? 'DONE' : 'EDIT'}
                        </button>
                    </label>
                    
                    {isEditingWhitelist ? (
                        <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 bg-zinc-950 rounded border border-zinc-800">
                            {availableSymbols.map(sym => (
                                <button 
                                    key={sym} 
                                    onClick={() => toggleSymbol(sym)}
                                    className={`text-xs px-2 py-1 rounded text-left truncate ${
                                        (config.allowedSymbols || []).includes(sym) 
                                        ? 'bg-blue-600/20 text-blue-400 border border-blue-600/50' 
                                        : 'text-zinc-500 hover:bg-zinc-800'
                                    }`}
                                >
                                    {sym}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {(config.allowedSymbols || []).length === 0 ? (
                                <span className="text-xs text-zinc-500 italic bg-zinc-950 px-3 py-1 rounded">All Market Assets (Wild West Mode)</span>
                            ) : (
                                (config.allowedSymbols || []).map(s => (
                                    <span key={s} className="text-[10px] font-bold bg-blue-900/30 text-blue-400 border border-blue-900 px-2 py-1 rounded">
                                        {s}
                                    </span>
                                ))
                            )}
                        </div>
                    )}
                </div>
              </div>
           </div>
        </div>

        {/* RIGHT PANEL: TERMINAL & ACTIVE POSITIONS */}
        <div className="flex-1 flex flex-col gap-6">
            <div className="bg-black rounded-2xl border border-zinc-800 p-6 flex flex-col font-mono relative overflow-hidden shadow-2xl h-2/3">
                <div className="absolute top-0 left-0 right-0 h-10 bg-zinc-900 border-b border-zinc-800 flex items-center px-4 gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="ml-4 text-xs text-zinc-500">z-mode-neural-net --v2.5 --live</span>
                </div>
                
                <div className="mt-8 flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                    {logs.length === 0 && (
                        <div className="text-zinc-600 text-sm mt-4">
                            <span className="text-green-500">➜</span> System initialized...<br/>
                            <span className="text-green-500">➜</span> Waiting for command...
                        </div>
                    )}
                    {logs.map((log, i) => (
                        <div key={i} className={`text-xs md:text-sm font-mono border-l-2 pl-3 py-1 flex justify-between items-start group hover:bg-zinc-900/50 cursor-pointer ${
                            log.type === 'error' ? 'border-red-500 text-red-400 bg-red-900/10' : 
                            log.type === 'success' ? 'border-green-500 text-green-400 bg-green-900/10' : 
                            log.type === 'warning' ? 'border-yellow-500 text-yellow-400 bg-yellow-900/10' : 
                            log.type === 'whale' ? 'border-blue-500 text-blue-400 bg-blue-900/10' : 'border-zinc-700 text-zinc-300'
                        }`} onClick={() => log.symbol && onLogClick(log.symbol)}>
                            <div>
                                <span className="opacity-40 mr-3">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                                <span className="tracking-wide">{log.message}</span>
                            </div>
                            {log.symbol && <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />}
                        </div>
                    ))}
                    <div ref={logEndRef} />
                </div>

                {config.enabled && (
                    <div className="absolute bottom-6 right-6 pointer-events-none opacity-50">
                        <div className="flex items-center gap-2 text-green-500 text-xs animate-pulse">
                            <Activity size={14}/> NEURAL SCAN ACTIVE
                        </div>
                    </div>
                )}
            </div>

            {/* ACTIVE POSITIONS MINI VIEW */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex-1 overflow-hidden flex flex-col min-h-0">
                  <h3 className="text-zinc-500 font-bold uppercase text-xs tracking-widest mb-4">Active Operations</h3>
                  <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                     {positions.length === 0 ? (
                        <div className="text-zinc-600 text-xs text-center py-4 border border-dashed border-zinc-800 rounded">No active positions</div>
                     ) : (
                        positions.map(pos => (
                            <div key={pos.symbol} onClick={() => onLogClick(pos.symbol)} className="bg-zinc-950 border border-zinc-800 p-3 rounded-lg flex justify-between items-center group cursor-pointer hover:border-zinc-600 transition-colors">
                                <div>
                                    <div className="font-bold text-white flex items-center gap-2">
                                        {pos.symbol}
                                        {pos.isTrailing && <span className="text-[9px] bg-green-900 text-green-400 px-1 rounded border border-green-700">TRAILING</span>}
                                    </div>
                                    <div className="text-[10px] text-zinc-500">{pos.amount.toFixed(4)} shares</div>
                                </div>
                                <div className="text-right">
                                    <div className={`font-mono text-xs font-bold ${pos.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                        {pos.pnl >= 0 ? '+' : ''}{pos.pnlPercent.toFixed(2)}%
                                    </div>
                                    <div className="text-[10px] text-zinc-600">{formatCurrency(convertCurrency(pos.currentValue, 'USD', globalCurrency), globalCurrency)}</div>
                                </div>
                            </div>
                        ))
                     )}
                  </div>
            </div>
        </div>
      </div>
    </div>
  );
};

const SettingsIcon = ({size}: {size: number}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.39a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
);

export default AutoTraderDashboard;

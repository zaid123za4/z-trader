
import React from 'react';
import { BotConfig, BotLog } from '../types';
import { Bot, Power, Activity, Settings, Zap } from 'lucide-react';

interface Props {
  config: BotConfig;
  logs: BotLog[];
  onConfigChange: (newConfig: BotConfig) => void;
}

const BotControl: React.FC<Props> = ({ config, logs, onConfigChange }) => {
  const toggleBot = () => {
    onConfigChange({ ...config, enabled: !config.enabled });
  };

  const updateStrategy = (strategy: 'conservative' | 'aggressive' | 'degen') => {
    onConfigChange({ ...config, strategy });
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col h-full shadow-2xl shadow-purple-900/10">
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Bot className={config.enabled ? "text-green-500" : "text-zinc-500"} size={24} />
          <div>
            <h3 className="text-white font-bold">Z-Mode Auto-Pilot</h3>
            <p className="text-xs text-zinc-500">Autonomous Trading Engine</p>
          </div>
        </div>
        <button 
           onClick={toggleBot}
           className={`px-4 py-2 rounded-full font-bold flex items-center gap-2 transition-all ${
             config.enabled 
             ? "bg-green-500/20 text-green-400 hover:bg-green-500/30" 
             : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
           }`}
        >
           <Power size={16} /> {config.enabled ? "ONLINE" : "OFFLINE"}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
         <div className="bg-black/40 p-3 rounded border border-zinc-800">
            <label className="text-[10px] text-zinc-500 uppercase font-bold flex items-center gap-1 mb-2">
               <Zap size={10} /> Strategy
            </label>
            <div className="flex gap-1">
              {['conservative', 'aggressive', 'degen'].map((s) => (
                <button
                  key={s}
                  onClick={() => updateStrategy(s as any)}
                  className={`flex-1 py-1 text-[10px] uppercase font-bold rounded border ${
                    config.strategy === s 
                    ? "bg-purple-600 border-purple-500 text-white" 
                    : "bg-zinc-800 border-zinc-700 text-zinc-500 hover:bg-zinc-700"
                  }`}
                >
                  {s.slice(0, 4)}
                </button>
              ))}
            </div>
         </div>
         <div className="bg-black/40 p-3 rounded border border-zinc-800">
            <label className="text-[10px] text-zinc-500 uppercase font-bold flex items-center gap-1 mb-2">
               <Activity size={10} /> Max Positions
            </label>
            <input 
              type="number" 
              value={config.maxOpenPositions}
              onChange={(e) => onConfigChange({...config, maxOpenPositions: parseInt(e.target.value) || 1})}
              className="w-full bg-zinc-900 border border-zinc-700 rounded p-1 text-sm text-center text-white"
            />
         </div>
      </div>

      <div className="flex-1 bg-black rounded border border-zinc-800 p-2 overflow-y-auto font-mono text-[10px] max-h-[150px]">
         {logs.length === 0 ? (
           <div className="text-zinc-600 italic text-center mt-4">System Initialized. Waiting for logs...</div>
         ) : (
           logs.slice().reverse().map((log, i) => (
             <div key={i} className={`mb-1 ${
               log.type === 'error' ? 'text-red-500' : 
               log.type === 'success' ? 'text-green-500' : 
               log.type === 'warning' ? 'text-yellow-500' : 'text-zinc-400'
             }`}>
               <span className="opacity-50">[{new Date(log.timestamp).toLocaleTimeString()}]</span> {log.message}
             </div>
           ))
         )}
      </div>
    </div>
  );
};

export default BotControl;


import React from 'react';
import { Position, CurrencyCode } from '../types';
import { TrendingUp, TrendingDown, Wallet, Globe } from 'lucide-react';
import { convertCurrency, formatCurrency } from '../services/currency';

interface Props {
  positions: Position[];
  balanceUSD: number;
  globalCurrency: CurrencyCode;
}

const Portfolio: React.FC<Props> = ({ positions, balanceUSD, globalCurrency }) => {
  // Positions already contain currentValue in USD.
  const totalValueUSD = positions.reduce((acc, pos) => acc + pos.currentValue, 0) + balanceUSD;
  const totalPnLUSD = positions.reduce((acc, pos) => acc + pos.pnl, 0);

  const displayTotalValue = convertCurrency(totalValueUSD, 'USD', globalCurrency);
  const displayBalance = convertCurrency(balanceUSD, 'USD', globalCurrency);
  const displayPnL = convertCurrency(totalPnLUSD, 'USD', globalCurrency);

  return (
    <div className="p-6 text-white max-w-4xl mx-auto">
      <div className="mb-8 p-6 bg-gradient-to-r from-zinc-900 to-zinc-950 rounded-2xl border border-zinc-800 shadow-xl">
        <div className="flex items-center gap-3 mb-2">
           <div className="p-2 bg-yellow-500/10 rounded-lg">
             <Wallet className="text-yellow-500" size={24} />
           </div>
           <span className="text-zinc-400 text-sm font-semibold tracking-wider flex items-center gap-2">
              NET LIQUIDITY <span className="text-xs bg-zinc-800 px-2 rounded text-zinc-500">{globalCurrency}</span>
           </span>
        </div>
        <div className="text-5xl font-mono font-bold mb-4 tracking-tighter">
          {formatCurrency(displayTotalValue, globalCurrency)}
        </div>
        <div className="flex gap-6 text-sm">
           <div>
             <span className="text-zinc-500 block">Available Cash</span>
             <span className="font-mono text-white text-lg">{formatCurrency(displayBalance, globalCurrency)}</span>
           </div>
           <div>
             <span className="text-zinc-500 block">Total Unrealized PnL</span>
             <span className={`font-mono text-lg font-bold ${totalPnLUSD >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {totalPnLUSD >= 0 ? '+' : ''}{formatCurrency(displayPnL, globalCurrency)}
             </span>
           </div>
        </div>
      </div>

      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
         Active Positions <span className="text-sm font-normal text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded-full">{positions.length}</span>
      </h3>

      <div className="grid gap-4">
        {positions.length === 0 ? (
          <div className="p-8 text-center text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
            You have no positions, Zaid. Money doesn't grow on trees, start trading.
          </div>
        ) : (
          positions.map((pos) => {
            const pnlUSD = pos.pnl || 0;
            const pnlPercent = pos.pnlPercent || 0;
            const displayValue = convertCurrency(pos.currentValue, 'USD', globalCurrency);

            return (
            <div key={pos.symbol} className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 flex items-center justify-between hover:border-zinc-700 transition-colors">
               <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-yellow-500">
                    {pos.symbol.substring(0, 1)}
                  </div>
                  <div>
                    <div className="font-bold text-lg">{pos.symbol}</div>
                    <div className="text-zinc-500 text-xs font-mono">{(pos.amount || 0).toFixed(4)} shares</div>
                  </div>
               </div>
               
               <div className="text-right">
                  <div className="font-mono text-lg">{formatCurrency(displayValue, globalCurrency)}</div>
                  <div className={`font-mono text-sm flex items-center justify-end gap-1 ${pnlUSD >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                     {pnlUSD >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                     {pnlUSD >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%
                  </div>
               </div>
            </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Portfolio;

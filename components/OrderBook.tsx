
import React, { useMemo } from 'react';
import { TrendingDown, TrendingUp, Copy } from 'lucide-react';

interface Props {
  currentPrice: number;
  onPriceClick?: (price: string) => void;
}

const OrderBook: React.FC<Props> = ({ currentPrice, onPriceClick }) => {
  // Generate simulated order book data based on current price
  const { asks, bids, maxVol } = useMemo(() => {
    const asks = [];
    const bids = [];
    const spread = currentPrice * 0.0005;

    for (let i = 0; i < 8; i++) {
        // Asks (Sellers) - Price > Current
        const askPrice = currentPrice + spread + (i * currentPrice * 0.001);
        const askVol = Math.random() * 100 + 10;
        asks.push({ price: askPrice, vol: askVol, total: 0 });

        // Bids (Buyers) - Price < Current
        const bidPrice = currentPrice - spread - (i * currentPrice * 0.001);
        const bidVol = Math.random() * 100 + 10;
        bids.push({ price: bidPrice, vol: bidVol, total: 0 });
    }
    
    // Calculate max volume for relative sizing of bars
    const allVols = [...asks.map(a => a.vol), ...bids.map(b => b.vol)];
    const max = Math.max(...allVols);

    return { asks: asks.reverse(), bids, maxVol: max };
  }, [currentPrice]);

  return (
    <div className="flex flex-col h-full overflow-hidden text-[10px] font-mono select-none">
       {/* HEADER */}
       <div className="flex justify-between px-2 py-1 text-zinc-500 font-bold border-b border-zinc-800 bg-zinc-950">
          <span>PRICE</span>
          <span>AMT</span>
       </div>

       {/* ASKS (RED - SELL SIDE) */}
       <div className="flex flex-col justify-end flex-1 overflow-hidden bg-zinc-950">
          {asks.map((ask, i) => (
             <div 
               key={i} 
               onClick={() => onPriceClick?.(ask.price.toFixed(2))}
               className="flex justify-between items-center px-2 py-0.5 relative group hover:bg-zinc-800 cursor-pointer transition-colors"
             >
                {/* Visual Depth Wall */}
                <div 
                   className="absolute top-0 right-0 bottom-0 bg-red-500/10 group-hover:bg-red-500/20 transition-all duration-300"
                   style={{ width: `${(ask.vol / maxVol) * 100}%` }}
                />
                <span className="text-red-400 z-10 font-medium group-hover:text-red-300">{ask.price.toFixed(2)}</span>
                <span className="text-zinc-500 z-10 group-hover:text-zinc-300">{ask.vol.toFixed(4)}</span>
             </div>
          ))}
       </div>

       {/* SPREAD INDICATOR */}
       <div className="py-2 my-1 border-y border-zinc-800 bg-zinc-900 text-center text-white font-bold text-xs flex items-center justify-center gap-2">
          {currentPrice.toFixed(2)} 
          {Math.random() > 0.5 ? <TrendingUp size={12} className="text-green-500"/> : <TrendingDown size={12} className="text-red-500"/>}
       </div>

       {/* BIDS (GREEN - BUY SIDE) */}
       <div className="flex flex-col flex-1 overflow-hidden bg-zinc-950">
          {bids.map((bid, i) => (
             <div 
               key={i} 
               onClick={() => onPriceClick?.(bid.price.toFixed(2))}
               className="flex justify-between items-center px-2 py-0.5 relative group hover:bg-zinc-800 cursor-pointer transition-colors"
             >
                {/* Visual Depth Wall */}
                <div 
                   className="absolute top-0 right-0 bottom-0 bg-green-500/10 group-hover:bg-green-500/20 transition-all duration-300"
                   style={{ width: `${(bid.vol / maxVol) * 100}%` }}
                />
                <span className="text-green-400 z-10 font-medium group-hover:text-green-300">{bid.price.toFixed(2)}</span>
                <span className="text-zinc-500 z-10 group-hover:text-zinc-300">{bid.vol.toFixed(4)}</span>
             </div>
          ))}
       </div>
    </div>
  );
};

export default OrderBook;

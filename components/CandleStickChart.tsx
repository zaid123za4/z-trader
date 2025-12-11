
import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, IChartApi, CrosshairMode } from 'lightweight-charts';
import { OHLCData, ChartMarker } from '../types';

interface Props {
  data: OHLCData[];
  markers?: ChartMarker[];
  colors?: {
    upColor?: string;
    downColor?: string;
    backgroundColor?: string;
    textColor?: string;
  };
}

const CandleStickChart: React.FC<Props> = React.memo(({ 
  data,
  markers = [],
  colors = {
    backgroundColor: '#09090b', // zinc-950
    textColor: '#a1a1aa',       // zinc-400
    upColor: '#22c55e',         // green-500
    downColor: '#ef4444',       // red-500
  }
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<any>(null);
  const volumeSeriesRef = useRef<any>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const handleResize = () => {
      chartRef.current?.applyOptions({ width: chartContainerRef.current!.clientWidth });
    };

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: colors.backgroundColor },
        textColor: colors.textColor,
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      grid: {
        vertLines: { color: '#18181b' }, // zinc-900 (Subtle)
        horzLines: { color: '#18181b' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      timeScale: {
        borderColor: '#27272a',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: '#27272a',
        scaleMargins: {
            top: 0.1,
            bottom: 0.3, // Leave space for volume
        },
      }
    });

    // 1. Candlestick Series (Main Price)
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: colors.upColor,
      downColor: colors.downColor,
      borderVisible: false,
      wickUpColor: colors.upColor,
      wickDownColor: colors.downColor,
    });
    candleSeriesRef.current = candlestickSeries;

    // 2. Volume Series (Histogram at bottom)
    const volumeSeries = chart.addHistogramSeries({
      color: '#3f3f46', // zinc-700
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '', // Overlay on same chart but independent scale
      scaleMargins: {
        top: 0.8, // Push to bottom
        bottom: 0,
      },
    });
    volumeSeriesRef.current = volumeSeries;

    // Load Data
    const candles = data.map(d => ({
        time: d.time,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close
    }));
    
    const volumes = data.map(d => ({
        time: d.time,
        value: d.volume,
        color: d.close >= d.open ? '#22c55e44' : '#ef444444' // Transparent Green/Red
    }));

    candlestickSeries.setData(candles);
    volumeSeries.setData(volumes);
    
    if (markers.length > 0) {
        candlestickSeries.setMarkers(markers);
    }
    
    if (data.length > 0) {
        chart.timeScale().fitContent();
    }

    chartRef.current = chart;

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []); 

  // Update Data Effect (For Real-time ticks)
  useEffect(() => {
     if (!candleSeriesRef.current || !volumeSeriesRef.current || data.length === 0) return;
     
     const candles = data.map(d => ({
        time: d.time,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close
    }));
    
    const volumes = data.map(d => ({
        time: d.time,
        value: d.volume,
        color: d.close >= d.open ? '#22c55e44' : '#ef444444'
    }));

     candleSeriesRef.current.setData(candles);
     volumeSeriesRef.current.setData(volumes);
     
     if (markers.length > 0) {
        candleSeriesRef.current.setMarkers(markers);
     }
  }, [data, markers]);

  return (
    <div ref={chartContainerRef} className="w-full h-full relative" />
  );
});

export default CandleStickChart;

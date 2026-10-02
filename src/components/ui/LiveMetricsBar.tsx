import React, { useEffect, useState } from 'react';
import { getLiveTransactionStream } from '../../lib/liveStream';
import { Activity, ShieldCheck, Zap, Globe, ArrowUpRight, Clock } from 'lucide-react';

export const LiveMetricsBar: React.FC = () => {
  const [metrics, setMetrics] = useState({
    totalVolumeUsd: 38450120000,
    settledCount: 18452,
    inFlightCount: 4,
    clearingCount: 2,
    tps: '1420',
  });

  useEffect(() => {
    const stream = getLiveTransactionStream();
    const interval = setInterval(() => {
      setMetrics(stream.getMetrics());
    }, 400);

    return () => clearInterval(interval);
  }, []);

  const formattedVolume = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(metrics.totalVolumeUsd);

  return (
    <div className="w-full bg-slate-950/80 backdrop-blur-md border-y border-slate-800/80 px-4 py-2.5 text-xs text-slate-300 shadow-inner z-20">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        {/* Left: Network Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[11px] font-semibold">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            SWIFT GPI / CBPR+ LIVE
          </div>
          <span className="hidden md:inline text-slate-500">|</span>
          <div className="hidden sm:flex items-center gap-1.5 text-slate-400">
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <span>11 Global RTGS Clearers Connected</span>
          </div>
        </div>

        {/* Center/Right Metrics Grid */}
        <div className="flex items-center gap-6 overflow-x-auto py-0.5">
          {/* 24h Volume */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
              24h Settled:
            </span>
            <span className="font-mono font-bold text-white tracking-wider">
              {formattedVolume}
            </span>
          </div>

          {/* Cross-border TPS */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Throughput:
            </span>
            <span className="font-mono font-bold text-amber-300">
              {metrics.tps}{' '}
              <span className="text-[10px] text-slate-400 font-normal">msg/s</span>
            </span>
          </div>

          {/* In-Flight Payments */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              In-Flight:
            </span>
            <span className="font-mono font-bold text-cyan-300">
              {metrics.inFlightCount + metrics.clearingCount}
            </span>
          </div>

          {/* Settlement Speed */}
          <div className="hidden lg:flex items-center gap-2">
            <span className="text-slate-400 font-medium flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              Avg Latency:
            </span>
            <span className="font-mono font-semibold text-indigo-300">
              2.4s <span className="text-slate-400 text-[10px] line-through">vs 3 days MT</span>
            </span>
          </div>

          {/* STP Rate */}
          <div className="hidden xl:flex items-center gap-2">
            <span className="text-slate-400 font-medium flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              STP Compliance:
            </span>
            <span className="font-mono font-bold text-emerald-300">
              99.98%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

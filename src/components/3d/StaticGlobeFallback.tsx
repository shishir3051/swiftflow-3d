import React from 'react';
import { FINANCIAL_HUBS } from '../../data/financialHubs';
import { SAMPLE_TRANSACTIONS } from '../../data/sampleTransactions';
import type { PaymentArcData } from '../../types/swift';
import type { FinancialHub } from '../../types/globe';

interface StaticGlobeFallbackProps {
  onSelectArc?: (arc: PaymentArcData) => void;
  onSelectHub?: (hub: FinancialHub) => void;
  selectedArcId?: string | null;
}

export const StaticGlobeFallback: React.FC<StaticGlobeFallbackProps> = ({
  onSelectArc,
  onSelectHub,
  selectedArcId,
}) => {
  // Map longitude (-180 to 180) to X (0 to 800) and latitude (90 to -90) to Y (0 to 400) (Equirectangular)
  const mapCoords = (lat: number, lng: number) => {
    const x = ((lng + 180) / 360) * 800;
    const y = ((90 - lat) / 180) * 400;
    return { x, y };
  };

  const hubMap = new Map(FINANCIAL_HUBS.map((h) => [h.id, h]));

  return (
    <div
      className="relative w-full h-[550px] md:h-[650px] bg-slate-950 rounded-2xl border border-slate-800/80 p-6 flex flex-col justify-between overflow-hidden shadow-2xl"
      role="region"
      aria-label="2D Accessible Interbank Payment Map"
    >
      {/* Fallback Notice Badge */}
      <div className="flex items-center justify-between z-10">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-800/40 text-cyan-300 text-xs font-mono">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span>Accessible 2D High-Contrast Mode Active</span>
        </div>
        <span className="text-xs text-slate-400 font-mono">
          Interactive Financial Clearing Nodes
        </span>
      </div>

      {/* SVG Canvas Map */}
      <div className="relative w-full flex-1 flex items-center justify-center">
        <svg
          viewBox="0 0 800 400"
          className="w-full h-full max-h-[460px] drop-shadow-md"
          role="img"
          aria-label="Interactive global payment flow diagram"
        >
          {/* Subtle Grid Lines */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke="rgba(255, 255, 255, 0.04)"
                strokeWidth="1"
              />
            </pattern>
            {/* Glow Filter */}
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          <rect width="800" height="400" fill="#060c1c" rx="12" />
          <rect width="800" height="400" fill="url(#grid)" rx="12" />

          {/* Equator & Prime Meridian reference lines */}
          <line
            x1="0"
            y1="200"
            x2="800"
            y2="200"
            stroke="rgba(6, 182, 212, 0.15)"
            strokeDasharray="4 4"
          />
          <line
            x1="400"
            y1="0"
            x2="400"
            y2="400"
            stroke="rgba(6, 182, 212, 0.15)"
            strokeDasharray="4 4"
          />

          {/* Payment Arcs */}
          {SAMPLE_TRANSACTIONS.map((tx) => {
            const src = hubMap.get(tx.sourceHubId);
            const tgt = hubMap.get(tx.targetHubId);
            if (!src || !tgt) return null;

            const p1 = mapCoords(src.lat, src.lng);
            const p2 = mapCoords(tgt.lat, tgt.lng);

            // Curve control point
            const midX = (p1.x + p2.x) / 2;
            const midY = Math.min(p1.y, p2.y) - Math.abs(p1.x - p2.x) * 0.25;
            const pathD = `M ${p1.x} ${p1.y} Q ${midX} ${midY} ${p2.x} ${p2.y}`;
            const isSelected = selectedArcId === tx.id;

            return (
              <g key={`svg-arc-${tx.id}`} className="cursor-pointer group">
                {/* Clickable wide hit area */}
                <path
                  d={pathD}
                  fill="none"
                  stroke="transparent"
                  strokeWidth="14"
                  onClick={() => onSelectArc?.(tx)}
                  aria-label={`Select arc from ${tx.sourceCity} to ${tx.targetCity}`}
                />
                {/* Visible glowing arc line */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={isSelected ? '#38bdf8' : src.color}
                  strokeWidth={isSelected ? '3' : '1.5'}
                  strokeDasharray={isSelected ? 'none' : '4 3'}
                  opacity={isSelected ? 1 : 0.6}
                  filter={isSelected ? 'url(#glow)' : undefined}
                  className="transition-all duration-300 group-hover:stroke-cyan-300 group-hover:stroke-[2.5]"
                />
              </g>
            );
          })}

          {/* Hub Pins */}
          {FINANCIAL_HUBS.map((hub) => {
            const { x, y } = mapCoords(hub.lat, hub.lng);
            return (
              <g
                key={`svg-hub-${hub.id}`}
                className="cursor-pointer group focus:outline-none"
                onClick={() => onSelectHub?.(hub)}
                tabIndex={0}
                role="button"
                aria-label={`View ${hub.name}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    onSelectHub?.(hub);
                  }
                }}
              >
                <circle
                  cx={x}
                  cy={y}
                  r="6"
                  fill={hub.color}
                  className="transition-transform group-hover:scale-125"
                />
                <circle
                  cx={x}
                  cy={y}
                  r="12"
                  fill="none"
                  stroke={hub.color}
                  strokeWidth="1"
                  opacity="0.4"
                />
                <text
                  x={x}
                  y={y - 12}
                  textAnchor="middle"
                  fill="#e2e8f0"
                  fontSize="11"
                  fontFamily="monospace"
                  className="font-bold select-none group-hover:fill-cyan-300"
                >
                  {hub.city}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Accessible Transaction Quick Selector bar below */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 mt-4 z-10">
        {SAMPLE_TRANSACTIONS.map((tx) => (
          <button
            key={`fallback-btn-${tx.id}`}
            onClick={() => onSelectArc?.(tx)}
            className={`px-2.5 py-1.5 rounded-lg text-left text-xs font-mono transition-all border ${
              selectedArcId === tx.id
                ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-md'
                : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-600'
            }`}
          >
            <div className="text-[10px] text-slate-400">
              {tx.sourceCity} → {tx.targetCity}
            </div>
            <div className="font-semibold text-cyan-300">{tx.formattedAmount}</div>
          </button>
        ))}
      </div>
    </div>
  );
};

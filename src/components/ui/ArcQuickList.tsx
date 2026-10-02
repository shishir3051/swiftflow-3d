import React from 'react';
import { SAMPLE_TRANSACTIONS } from '../../data/sampleTransactions';
import type { PaymentArcData } from '../../types/swift';

interface ArcQuickListProps {
  onSelectTx: (tx: PaymentArcData) => void;
  selectedTxId?: string | null;
}

export const ArcQuickList: React.FC<ArcQuickListProps> = ({
  onSelectTx,
  selectedTxId,
}) => {
  return (
    <div
      className="w-full max-w-7xl mx-auto px-4 sm:px-6 my-8"
      role="region"
      aria-label="Active Simulated Payment Corridor Registry"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-white font-mono tracking-wide uppercase">
            Active Corridor Registry
          </h3>
          <p className="text-xs text-slate-400">
            Select a corridor to focus the 3D globe and inspect message contents.
          </p>
        </div>
        <span className="text-xs font-mono text-cyan-400">
          {SAMPLE_TRANSACTIONS.length} Simulated Flows
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {SAMPLE_TRANSACTIONS.map((tx) => {
          const isSelected = selectedTxId === tx.id;

          return (
            <button
              key={tx.id}
              onClick={() => onSelectTx(tx)}
              className={`p-4 rounded-2xl text-left border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                isSelected
                  ? 'bg-cyan-950/40 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.25)]'
                  : 'bg-slate-900/60 hover:bg-slate-800/60 border-slate-800 hover:border-slate-700'
              }`}
              aria-pressed={isSelected}
            >
              <div className="flex items-center justify-between text-xs font-mono mb-2">
                <span className="text-slate-400">
                  {tx.sourceCity} → {tx.targetCity}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    tx.status === 'SETTLED'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                      : 'bg-blue-950 text-blue-300 border border-blue-800/60'
                  }`}
                >
                  {tx.status}
                </span>
              </div>

              <div className="text-base font-extrabold text-white mb-1">
                {tx.formattedAmount}
              </div>

              <div className="text-xs text-slate-400 font-sans line-clamp-1">
                {tx.description}
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-500">
                <span>BIC: {tx.senderBic.slice(0, 4)}...</span>
                <span className="text-cyan-400 hover:underline">Inspect Message →</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { getLiveTransactionStream, type LiveTransaction } from '../../lib/liveStream';
import { Search, Copy, Check, ExternalLink, ArrowRight, RefreshCw } from 'lucide-react';
import { soundFx } from '../../lib/soundFx';

interface LiveSettlementLedgerProps {
  onSelectTransaction: (tx: LiveTransaction) => void;
}

export const LiveSettlementLedger: React.FC<LiveSettlementLedgerProps> = ({ onSelectTransaction }) => {
  const [transactions, setTransactions] = useState<LiveTransaction[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'IN_FLIGHT' | 'PENDING' | 'SETTLED'>('ALL');
  const [currencyFilter, setCurrencyFilter] = useState<string>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const stream = getLiveTransactionStream();
    const unsubscribe = stream.subscribe((txs) => {
      setTransactions([...txs]);
    });
    return unsubscribe;
  }, []);

  const handleCopyUetr = (e: React.MouseEvent, uetr: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(uetr);
    setCopiedId(uetr);
    soundFx.playBlip(700);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filtered = transactions.filter((tx) => {
    if (statusFilter !== 'ALL' && tx.status !== statusFilter) return false;
    if (currencyFilter !== 'ALL' && tx.currency !== currencyFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchUetr = tx.uetr.toLowerCase().includes(q);
      const matchFrom = tx.sourceBank.toLowerCase().includes(q) || tx.sourceCity.toLowerCase().includes(q);
      const matchTo = tx.targetBank.toLowerCase().includes(q) || tx.targetCity.toLowerCase().includes(q);
      const matchEntity = tx.senderCustomer.toLowerCase().includes(q) || tx.receiverCustomer.toLowerCase().includes(q);
      return matchUetr || matchFrom || matchTo || matchEntity;
    }
    return true;
  });

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col backdrop-blur-xl">
      {/* Table Header & Controls */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-white tracking-wide">
              Institutional Clearing & Settlement Ledger
            </h2>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              SWIFT GPI Tracker
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Streaming live cross-border payment orders with end-to-end UETR tracking and automated ISO 20022 translation.
          </p>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search BIC, UETR, entity..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-950/80 border border-slate-700/80 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center bg-slate-950/80 p-0.5 rounded-lg border border-slate-700/80 text-xs">
            {(['ALL', 'IN_FLIGHT', 'PENDING', 'SETTLED'] as const).map((st) => (
              <button
                key={st}
                onClick={() => {
                  setStatusFilter(st);
                  soundFx.playBlip(550);
                }}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                  statusFilter === st
                    ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {st === 'ALL' ? 'All' : st === 'IN_FLIGHT' ? 'In-Flight' : st === 'PENDING' ? 'Clearing' : 'Settled'}
              </button>
            ))}
          </div>

          {/* Currency Filter */}
          <select
            value={currencyFilter}
            onChange={(e) => {
              setCurrencyFilter(e.target.value);
              soundFx.playBlip(520);
            }}
            className="bg-slate-950/80 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-500 font-mono"
          >
            <option value="ALL">All Currencies</option>
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
            <option value="GBP">GBP (£)</option>
            <option value="JPY">JPY (¥)</option>
            <option value="CHF">CHF (₣)</option>
            <option value="SGD">SGD (S$)</option>
            <option value="AUD">AUD (A$)</option>
          </select>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="overflow-x-auto max-h-[520px] divide-y divide-slate-800/60 font-sans">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-950/90 text-[11px] font-mono uppercase tracking-wider text-slate-400 sticky top-0 z-10 border-b border-slate-800">
            <tr>
              <th className="py-2.5 px-4 font-semibold">Status</th>
              <th className="py-2.5 px-4 font-semibold">UETR / Ref</th>
              <th className="py-2.5 px-4 font-semibold">Corridor (Debtor ➔ Creditor)</th>
              <th className="py-2.5 px-4 font-semibold text-right">Settlement Amount</th>
              <th className="py-2.5 px-4 font-semibold">Clearing System</th>
              <th className="py-2.5 px-4 font-semibold text-center">Inspect</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40 text-xs text-slate-300">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-500">
                  No cross-border transactions match current filters.
                </td>
              </tr>
            ) : (
              filtered.map((tx) => {
                const isSettled = tx.status === 'SETTLED';
                const isClearing = tx.status === 'PENDING';
                const isInFlight = tx.status === 'IN_FLIGHT';

                return (
                  <tr
                    key={tx.id}
                    onClick={() => {
                      onSelectTransaction(tx);
                      soundFx.playBlip(620);
                    }}
                    className="hover:bg-cyan-950/20 cursor-pointer transition-colors group"
                  >
                    {/* Status Badge */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {isSettled && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                          SETTLED
                        </span>
                      )}
                      {isClearing && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                          CLEARING
                        </span>
                      )}
                      {isInFlight && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
                          IN FLIGHT
                        </span>
                      )}
                    </td>

                    {/* UETR with Copy Button */}
                    <td className="py-3 px-4 font-mono text-[11px] whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-300 font-medium">
                          {tx.uetr.slice(0, 8)}...{tx.uetr.slice(-6)}
                        </span>
                        <button
                          onClick={(e) => handleCopyUetr(e, tx.uetr)}
                          title="Copy Full UETR"
                          className="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-cyan-400 transition-colors"
                        >
                          {copiedId === tx.uetr ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                      <span className="text-[10px] text-slate-500 block">
                        {tx.clearingTimeFormatted}
                      </span>
                    </td>

                    {/* Corridor */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-white">{tx.sourceCity}</span>
                        <span className="text-slate-500 text-[10px]">({tx.sourceBank.split(' ')[0]})</span>
                        <ArrowRight className="w-3 h-3 text-cyan-400 shrink-0 mx-0.5" />
                        <span className="font-semibold text-white">{tx.targetCity}</span>
                        <span className="text-slate-500 text-[10px]">({tx.targetBank.split(' ')[0]})</span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate max-w-xs">
                        {tx.senderCustomer} ➔ {tx.receiverCustomer}
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="font-mono font-bold text-white text-sm">
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: tx.currency,
                          maximumFractionDigits: 0,
                        }).format(tx.amount)}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Tag :32A: {tx.currency}
                      </div>
                    </td>

                    {/* Clearing Network */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="text-xs text-slate-300 font-medium">
                        {tx.clearingSystem}
                      </span>
                      <span className="block text-[10px] text-slate-400">
                        pacs.008 RTGS Clearing
                      </span>
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectTransaction(tx);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-xs font-medium border border-cyan-500/30 transition-all group-hover:border-cyan-400"
                      >
                        <span>Inspect</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Status */}
      <div className="px-4 py-2.5 bg-slate-950/80 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-3 h-3 text-cyan-400 animate-spin" />
          <span>Active Feed Buffer: {transactions.length} transactions retained in local ledger cache</span>
        </div>
        <div className="text-slate-500 hidden sm:block">
          Click any transaction row to open the ISO 20022 XML & MT103 FIN inspector
        </div>
      </div>
    </div>
  );
};

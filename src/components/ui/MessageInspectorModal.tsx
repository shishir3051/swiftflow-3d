import React, { useEffect, useState } from 'react';
import type { PaymentArcData } from '../../types/swift';
import { parseMT103 } from '../../lib/mtParser';
import { MT_TO_MX_MAPPINGS } from '../../data/mtIsoMappings';
import { generatePacs008Xml } from '../../lib/mxGenerator';

interface MessageInspectorModalProps {
  transaction: PaymentArcData;
  onClose: () => void;
}

export const MessageInspectorModal: React.FC<MessageInspectorModalProps> = ({
  transaction,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'mapping' | 'rawMT' | 'previewXML'>('mapping');
  const [copied, setCopied] = useState<boolean>(false);

  const parsed = parseMT103(transaction.mt103Raw);
  const pacs008Xml = generatePacs008Xml(parsed);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLoadIntoConverter = () => {
    // Dispatch global event and scroll down to the converter panel
    window.dispatchEvent(
      new CustomEvent('swiftflow:load-converter', {
        detail: transaction.mt103Raw,
      })
    );
    onClose();
    const converterEl = document.getElementById('converter-section');
    if (converterEl) {
      converterEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <div>
              <h2 id="modal-title" className="text-lg font-bold text-white tracking-wide">
                Payment Message Inspector
              </h2>
              <p className="text-xs font-mono text-slate-400">
                {transaction.sourceCity} ({transaction.senderBic}) → {transaction.targetCity} ({transaction.receiverBic})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleLoadIntoConverter}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-all shadow-[0_0_12px_rgba(6,182,212,0.3)]"
            >
              Convert in AI Assistant →
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Close modal"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Transaction Summary Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-6 py-3 bg-slate-950/60 border-b border-slate-800 text-xs font-mono">
          <div>
            <span className="text-slate-500 block text-[10px]">INSTRUCTED AMOUNT</span>
            <span className="text-cyan-300 font-bold">{transaction.formattedAmount}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px]">TRANSACTION REF (:20:)</span>
            <span className="text-slate-200">{transaction.reference}</span>
          </div>
          <div className="col-span-2 sm:col-span-2">
            <span className="text-slate-500 block text-[10px]">UETR (SWIFT gpi Tracking)</span>
            <span className="text-emerald-400 truncate block">{transaction.uetr}</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center px-6 border-b border-slate-800 bg-slate-900/50">
          <button
            onClick={() => setActiveTab('mapping')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'mapping'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Field-by-Field MT ↔ MX Mapping
          </button>
          <button
            onClick={() => setActiveTab('rawMT')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'rawMT'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Raw MT103 FIN Message
          </button>
          <button
            onClick={() => setActiveTab('previewXML')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'previewXML'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Target pacs.008 XML Preview
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {activeTab === 'mapping' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-400 mb-2">
                Comparison of legacy MT103 unstructured fields with ISO 20022 pacs.008 rich XML schema elements:
              </div>
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 font-mono border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Legacy MT Tag</th>
                      <th className="py-2.5 px-3">Parsed MT Value</th>
                      <th className="py-2.5 px-3">Target ISO 20022 pacs.008 Node</th>
                      <th className="py-2.5 px-3">Migration Improvement</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {parsed.tags.map((t) => {
                      const mapping = MT_TO_MX_MAPPINGS.find((m) => m.mtTag === `:${t.tag}:`);
                      return (
                        <tr key={t.tag} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-3 px-3">
                            <span className="px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/50 font-bold">
                              :{t.tag}:
                            </span>
                            <div className="text-[10px] text-slate-400 mt-1">{t.name}</div>
                          </td>
                          <td className="py-3 px-3 text-slate-300 max-w-[200px] truncate" title={t.value}>
                            {t.value.replace(/\n/g, ' ')}
                          </td>
                          <td className="py-3 px-3 text-emerald-400 font-sans">
                            <span className="font-mono text-emerald-300 block text-[11px]">
                              {mapping ? mapping.mxElement : 'FIToFICstmrCdtTrf'}
                            </span>
                            <span className="text-[10px] text-slate-500 block truncate" title={mapping?.mxPath}>
                              {mapping?.mxPath}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-[11px] font-sans text-slate-300">
                            {mapping?.rule || 'Standard field migration.'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'rawMT' && (
            <div className="relative">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-slate-400 font-mono">SWIFT FIN User-to-User Protocol Payload</span>
                <button
                  onClick={() => handleCopy(transaction.mt103Raw)}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-cyan-400 font-mono transition-colors"
                >
                  {copied ? '✓ Copied' : 'Copy MT103'}
                </button>
              </div>
              <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-cyan-300 font-mono text-xs overflow-x-auto leading-relaxed">
                {transaction.mt103Raw}
              </pre>
            </div>
          )}

          {activeTab === 'previewXML' && (
            <div className="relative">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-slate-400 font-mono">ISO 20022 Business Application Header + pacs.008 Document</span>
                <button
                  onClick={() => handleCopy(pacs008Xml)}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-cyan-400 font-mono transition-colors"
                >
                  {copied ? '✓ Copied' : 'Copy pacs.008 XML'}
                </button>
              </div>
              <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 font-mono text-xs overflow-x-auto max-h-[350px] leading-relaxed">
                {pacs008Xml}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-800 bg-slate-950/80">
          <div className="text-[11px] text-slate-500 font-mono">
            Synthetic banking simulation • Safe for public demonstration
          </div>
          <button
            onClick={handleLoadIntoConverter}
            className="sm:hidden px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-bold text-xs"
          >
            Open in AI Converter
          </button>
        </div>
      </div>
    </div>
  );
};

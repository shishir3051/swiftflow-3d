import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { PaymentArcData } from '../../types/swift';
import { parseMT103 } from '../../lib/mtParser';
import { MT_TO_MX_MAPPINGS } from '../../data/mtIsoMappings';
import { generatePacs008Xml } from '../../lib/mxGenerator';
import { XmlViewer } from './XmlViewer';

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
  const [mounted, setMounted] = useState<boolean>(false);

  const parsed = parseMT103(transaction.mt103Raw);
  const pacs008Xml = generatePacs008Xml(parsed);

  useEffect(() => {
    setMounted(true);
    // Lock body scroll while modal is active
    if (typeof document !== 'undefined') {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, []);

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

  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in"
      style={{ zIndex: 99999 }}
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

        {/* Transaction Summary Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 px-6 py-3 bg-slate-950/60 border-b border-slate-800/80 text-xs font-mono">
          <div>
            <span className="text-slate-500 block text-[10px]">INSTRUCTED AMOUNT</span>
            <span className="text-cyan-400 font-bold text-sm">
              {transaction.formattedAmount} {transaction.currency}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px]">TRANSACTION REF (:20:)</span>
            <span className="text-slate-200 font-semibold">{parsed.transactionReference}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px]">VALUE DATE (:32A:)</span>
            <span className="text-slate-200">{parsed.valueDate}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px]">CHARGES (:71A:)</span>
            <span className="text-emerald-400 font-bold">{parsed.detailsOfCharges}</span>
          </div>
        </div>

        {/* Tab Controls */}
        <div
          role="tablist"
          aria-label="Transaction Drilldown Views"
          className="flex items-center border-b border-slate-800 bg-slate-950/60 px-6 py-2 gap-2 text-xs no-scrollbar overflow-x-auto"
        >
          <button
            role="tab"
            aria-selected={activeTab === 'mapping'}
            onClick={() => setActiveTab('mapping')}
            className={`px-3.5 py-1.5 rounded-lg font-medium transition-all duration-150 flex items-center gap-1.5 ${
              activeTab === 'mapping'
                ? 'bg-slate-800/90 text-white font-semibold border border-slate-700/80 shadow-sm ring-1 ring-cyan-500/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
            }`}
          >
            <span>Field-by-Field MT ↔ MX Mapping</span>
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'rawMT'}
            onClick={() => setActiveTab('rawMT')}
            className={`px-3.5 py-1.5 rounded-lg font-medium transition-all duration-150 flex items-center gap-1.5 ${
              activeTab === 'rawMT'
                ? 'bg-slate-800/90 text-white font-semibold border border-slate-700/80 shadow-sm ring-1 ring-cyan-500/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
            }`}
          >
            <span>Raw MT103 FIN Message</span>
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'previewXML'}
            onClick={() => setActiveTab('previewXML')}
            className={`px-3.5 py-1.5 rounded-lg font-medium transition-all duration-150 flex items-center gap-1.5 ${
              activeTab === 'previewXML'
                ? 'bg-slate-800/90 text-white font-semibold border border-slate-700/80 shadow-sm ring-1 ring-cyan-500/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
            }`}
          >
            <span>Target pacs.008 XML Preview</span>
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 font-mono text-xs">
          {activeTab === 'mapping' && (
            <div className="space-y-4">
              <p className="text-slate-400 font-sans text-xs">
                Comparison of legacy MT103 syntax blocks with ISO 20022 pacs.008 rich XML schema elements:
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                      <th className="py-2 px-3">Legacy MT Tag</th>
                      <th className="py-2 px-3">Parsed MT Value</th>
                      <th className="py-2 px-3">Target ISO 20022 pacs.008 Node</th>
                      <th className="py-2 px-3">Migration Improvement</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {MT_TO_MX_MAPPINGS.map((m) => {
                      // Lookup parsed value if available
                      let parsedVal = '—';
                      if (m.mtTag === ':20:') parsedVal = parsed.transactionReference;
                      if (m.mtTag === ':23B:') parsedVal = parsed.bankOperationCode;
                      if (m.mtTag === ':32A:') parsedVal = `${parsed.valueDate}${parsed.currency}${parsed.amount}`;
                      if (m.mtTag === ':50K:') parsedVal = parsed.orderingCustomer.account || parsed.orderingCustomer.nameAddress.join(' ');
                      if (m.mtTag === ':52A:') parsedVal = parsed.orderingInstitution?.bic || '—';
                      if (m.mtTag === ':57A:') parsedVal = parsed.accountWithInstitution?.bic || '—';
                      if (m.mtTag === ':59:') parsedVal = parsed.beneficiary.account || parsed.beneficiary.nameAddress.join(' ');
                      if (m.mtTag === ':70:') parsedVal = parsed.remittanceInformation || '—';
                      if (m.mtTag === ':71A:') parsedVal = parsed.detailsOfCharges;

                      return (
                        <tr key={m.mtTag} className="hover:bg-slate-800/40">
                          <td className="py-2.5 px-3">
                            <span className="px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-bold">
                              {m.mtTag}
                            </span>
                            <div className="text-[10px] text-slate-500 mt-0.5">{m.mtFieldName}</div>
                          </td>
                          <td className="py-2.5 px-3 text-slate-300 max-w-[200px] truncate" title={parsedVal}>
                            {parsedVal}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="text-emerald-400 font-semibold">{m.mxElement}</span>
                            <div className="text-[10px] text-slate-500 truncate max-w-[240px]" title={m.mxPath}>
                              {m.mxPath}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-slate-400 font-sans text-[11px] leading-relaxed">
                            {m.rule}
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
              <button
                onClick={() => handleCopy(transaction.mt103Raw)}
                className="absolute top-3 right-3 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1 border border-slate-700"
              >
                {copied ? 'Copied ✓' : 'Copy MT103'}
              </button>
              <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-cyan-300 whitespace-pre font-mono overflow-x-auto">
                {transaction.mt103Raw}
              </pre>
            </div>
          )}

          {activeTab === 'previewXML' && (
            <div className="h-full">
              <XmlViewer xml={pacs008Xml} />
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
    </div>,
    document.body
  );
};

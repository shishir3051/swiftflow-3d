import React, { useState, useEffect, Suspense } from 'react';
import { StaticGlobeFallback } from './StaticGlobeFallback';
import { MessageInspectorModal } from '../ui/MessageInspectorModal';
import { SAMPLE_TRANSACTIONS } from '../../data/sampleTransactions';
import type { PaymentArcData } from '../../types/swift';
import type { FinancialHub } from '../../types/globe';

// Lazy load R3F Canvas only in the browser to completely prevent SSR WebGL/Zustand compilation errors
const CanvasScene = React.lazy(() => import('./CanvasScene'));

interface GlobeSceneProps {
  currentSection?: number;
  initialSelectedTxId?: string;
  onSelectTx?: (tx: PaymentArcData) => void;
  isModalOpen?: boolean;
}

export default function GlobeScene({
  currentSection = 0,
  initialSelectedTxId,
  onSelectTx,
  isModalOpen = false,
}: GlobeSceneProps) {
  const [mounted, setMounted] = useState<boolean>(false);
  const [selectedTx, setSelectedTx] = useState<PaymentArcData | null>(null);
  const [selectedHub, setSelectedHub] = useState<FinancialHub | null>(null);
  const [webGlSupported, setWebGlSupported] = useState<boolean>(true);
  const [force2D, setForce2D] = useState<boolean>(false);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);

  // Mount only on client
  useEffect(() => {
    setMounted(true);

    try {
      const canvas = document.createElement('canvas');
      const gl =
        canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        setWebGlSupported(false);
      }
    } catch {
      setWebGlSupported(false);
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setAutoRotate(false);
    }

    if (initialSelectedTxId) {
      const found = SAMPLE_TRANSACTIONS.find((t) => t.id === initialSelectedTxId);
      if (found) {
        if (onSelectTx) onSelectTx(found);
        else setSelectedTx(found);
      }
    }
  }, [initialSelectedTxId, onSelectTx]);

  // Listen to custom global events for selecting transactions
  useEffect(() => {
    const handleSelectTxEvent = (e: CustomEvent<string>) => {
      const tx = SAMPLE_TRANSACTIONS.find((t) => t.id === e.detail);
      if (tx) {
        if (onSelectTx) onSelectTx(tx);
        else setSelectedTx(tx);
      }
    };

    window.addEventListener(
      'swiftflow:select-tx' as any,
      handleSelectTxEvent as EventListener
    );
    return () => {
      window.removeEventListener(
        'swiftflow:select-tx' as any,
        handleSelectTxEvent as EventListener
      );
    };
  }, [onSelectTx]);

  const handleSelectArc = (arc: PaymentArcData) => {
    if (onSelectTx) {
      onSelectTx(arc);
    } else {
      setSelectedTx(arc);
    }
  };

  const handleSelectHub = (hub: FinancialHub) => {
    setSelectedHub(hub);
    const relatedTx = SAMPLE_TRANSACTIONS.find(
      (t) => t.sourceHubId === hub.id || t.targetHubId === hub.id
    );
    if (relatedTx) {
      if (onSelectTx) {
        onSelectTx(relatedTx);
      } else {
        setSelectedTx(relatedTx);
      }
    }
  };

  const modalActive = isModalOpen || !!selectedTx;

  // SSR Placeholder or Fallback if WebGL unsupported / 2D mode forced
  if (!mounted || !webGlSupported || force2D) {
    return (
      <div className="relative w-full max-w-7xl mx-auto">
        <div className="flex justify-end mb-2">
          {mounted && webGlSupported && (
            <button
              onClick={() => setForce2D(false)}
              className="px-3 py-1 rounded bg-slate-800 text-xs text-cyan-400 hover:bg-slate-700 border border-slate-700 font-mono transition-all"
            >
              Switch to 3D Globe Mode
            </button>
          )}
        </div>
        <StaticGlobeFallback
          selectedArcId={selectedTx?.id}
          onSelectArc={handleSelectArc}
          onSelectHub={handleSelectHub}
        />
        {!onSelectTx && selectedTx && (
          <MessageInspectorModal
            transaction={selectedTx}
            onClose={() => setSelectedTx(null)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="relative w-full h-[600px] md:h-[720px] rounded-3xl overflow-hidden border border-slate-800/80 bg-slate-950/70 shadow-2xl backdrop-blur-md">
      {/* Top Floating Control Bar */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500" />
          </span>
          <span className="text-xs font-mono font-semibold tracking-wider text-slate-200 uppercase bg-slate-900/80 backdrop-blur-md px-2.5 py-1 rounded-md border border-slate-800">
            SIMULATED INTERBANK SETTLEMENT RAIL (RTGS)
          </span>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Auto Rotation Toggle */}
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`px-3 py-1 rounded-md text-xs font-mono border transition-all ${
              autoRotate
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-white'
            }`}
            aria-label="Toggle auto rotation"
          >
            Rotate {autoRotate ? 'ON' : 'OFF'}
          </button>

          {/* 2D Fallback Switcher */}
          <button
            onClick={() => setForce2D(true)}
            className="px-3 py-1 rounded-md text-xs font-mono bg-slate-900/80 text-slate-400 border border-slate-800 hover:text-white hover:border-slate-700 transition-all"
            aria-label="Switch to 2D Fallback Map"
          >
            2D Mode
          </button>
        </div>
      </div>

      {/* Floating Instructions / Quick Arc Selector overlay */}
      <div className="absolute bottom-4 left-4 right-4 z-20 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pointer-events-none">
        <div className="text-xs font-mono text-slate-400 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800">
          💡 <span className="text-cyan-400">Click any arc or city pin</span> to inspect the live MT103 payload & ISO 20022 mapping.
        </div>

        {/* Quick Corridor Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pointer-events-auto py-1">
          {SAMPLE_TRANSACTIONS.slice(0, 4).map((tx) => (
            <button
              key={`quick-btn-${tx.id}`}
              onClick={() => handleSelectArc(tx)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-mono whitespace-nowrap transition-all border ${
                selectedTx?.id === tx.id
                  ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.5)]'
                  : 'bg-slate-900/90 text-slate-300 hover:text-white border-slate-700/80 hover:border-cyan-500/50'
              }`}
            >
              {tx.sourceCity} → {tx.targetCity}
            </button>
          ))}
        </div>
      </div>

      {/* R3F Canvas Container dynamically hydrated */}
      <Suspense fallback={<StaticGlobeFallback selectedArcId={selectedTx?.id} onSelectArc={handleSelectArc} onSelectHub={handleSelectHub} />}>
        <CanvasScene
          autoRotate={autoRotate}
          selectedHub={selectedHub}
          selectedTx={selectedTx}
          currentSection={currentSection}
          isModalOpen={modalActive}
          onSelectHub={handleSelectHub}
          onSelectArc={handleSelectArc}
        />
      </Suspense>

      {/* Interactive Modal Inspector - only render if not handled by parent workspace */}
      {!onSelectTx && selectedTx && (
        <MessageInspectorModal
          transaction={selectedTx}
          onClose={() => setSelectedTx(null)}
        />
      )}
    </div>
  );
}

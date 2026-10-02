import React, { useState, useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { EarthSphere } from './EarthSphere';
import { BankHubNodes } from './BankHubNodes';
import { PaymentArcStream } from './PaymentArcStream';
import { CameraController } from './CameraController';
import { StaticGlobeFallback } from './StaticGlobeFallback';
import { MessageInspectorModal } from '../ui/MessageInspectorModal';
import { SAMPLE_TRANSACTIONS } from '../../data/sampleTransactions';
import type { PaymentArcData } from '../../types/swift';
import type { FinancialHub } from '../../types/globe';

interface GlobeSceneProps {
  currentSection?: number;
  initialSelectedTxId?: string;
}

export default function GlobeScene({
  currentSection = 0,
  initialSelectedTxId,
}: GlobeSceneProps) {
  const [selectedTx, setSelectedTx] = useState<PaymentArcData | null>(null);
  const [selectedHub, setSelectedHub] = useState<FinancialHub | null>(null);
  const [webGlSupported, setWebGlSupported] = useState<boolean>(true);
  const [force2D, setForce2D] = useState<boolean>(false);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);

  // Check WebGL availability on mount
  useEffect(() => {
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

    // Check user's preferred motion setting
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setAutoRotate(false);
    }

    if (initialSelectedTxId) {
      const found = SAMPLE_TRANSACTIONS.find((t) => t.id === initialSelectedTxId);
      if (found) setSelectedTx(found);
    }
  }, [initialSelectedTxId]);

  // Listen to custom global events for selecting transactions
  useEffect(() => {
    const handleSelectTxEvent = (e: CustomEvent<string>) => {
      const tx = SAMPLE_TRANSACTIONS.find((t) => t.id === e.detail);
      if (tx) {
        setSelectedTx(tx);
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
  }, []);

  const handleSelectArc = (arc: PaymentArcData) => {
    setSelectedTx(arc);
  };

  const handleSelectHub = (hub: FinancialHub) => {
    setSelectedHub(hub);
    // Find transaction originating or terminating at this hub
    const relatedTx = SAMPLE_TRANSACTIONS.find(
      (t) => t.sourceHubId === hub.id || t.targetHubId === hub.id
    );
    if (relatedTx) {
      setSelectedTx(relatedTx);
    }
  };

  // Render static 2D fallback if WebGL not supported or 2D explicitly chosen
  if (!webGlSupported || force2D) {
    return (
      <div className="relative w-full max-w-7xl mx-auto">
        <div className="flex justify-end mb-2">
          {webGlSupported && (
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
        {selectedTx && (
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
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <span className="text-xs font-mono text-slate-300 bg-slate-900/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-slate-700">
            SIMULATED INTERBANK MESH
          </span>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`px-3 py-1 rounded-full text-xs font-mono border backdrop-blur-md transition-all ${
              autoRotate
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                : 'bg-slate-900/80 text-slate-400 border-slate-700'
            }`}
            title="Toggle globe rotation"
          >
            {autoRotate ? 'Auto-Rotate ON' : 'Auto-Rotate PAUSED'}
          </button>

          <button
            onClick={() => setForce2D(true)}
            className="px-3 py-1 rounded-full text-xs font-mono text-slate-400 hover:text-white bg-slate-900/80 border border-slate-700 hover:border-slate-500 backdrop-blur-md transition-all"
            title="Switch to lightweight 2D view"
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
              onClick={() => setSelectedTx(tx)}
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

      {/* R3F Canvas Container */}
      <Canvas
        camera={{ position: [0, 1.2, 5.5], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 3, 5]} intensity={1.2} color="#ffffff" />
        <pointLight position={[-5, -3, -5]} intensity={0.6} color="#06b6d4" />
        <pointLight position={[0, 6, 0]} intensity={0.8} color="#3b82f6" />

        <Suspense fallback={null}>
          <EarthSphere radius={2.5} autoRotate={autoRotate} />
          <BankHubNodes
            globeRadius={2.5}
            selectedHubId={selectedHub?.id}
            onSelectHub={handleSelectHub}
          />
          <PaymentArcStream
            globeRadius={2.5}
            selectedArcId={selectedTx?.id}
            onSelectArc={handleSelectArc}
          />
          <CameraController currentSection={currentSection} />
        </Suspense>
      </Canvas>

      {/* Interactive Modal Inspector */}
      {selectedTx && (
        <MessageInspectorModal
          transaction={selectedTx}
          onClose={() => setSelectedTx(null)}
        />
      )}
    </div>
  );
}

import React, { useState, useEffect, Suspense } from 'react';
import { LiveMetricsBar } from './LiveMetricsBar';
import { FintechControlDeck, type AppWorkspaceMode } from './FintechControlDeck';
import { ArcQuickList } from './ArcQuickList';
import { MessageInspectorModal } from './MessageInspectorModal';
import type { PaymentArcData } from '../../types/swift';
import type { CorridorPreset, LiveTransaction } from '../../lib/liveStream';
import { soundFx } from '../../lib/soundFx';
import { Loader2 } from 'lucide-react';

// Code-split heavy interactive sub-workspaces for optimal performance & chunking
const GlobeScene = React.lazy(() => import('../3d/GlobeScene'));
const LiveSettlementLedger = React.lazy(() =>
  import('./LiveSettlementLedger').then((m) => ({ default: m.LiveSettlementLedger }))
);
const ConverterPanel = React.lazy(() =>
  import('./ConverterPanel').then((m) => ({ default: m.ConverterPanel }))
);
const AiCopilotTerminal = React.lazy(() =>
  import('./AiCopilotTerminal').then((m) => ({ default: m.AiCopilotTerminal }))
);

const WorkspaceSkeleton: React.FC<{ label: string }> = ({ label }) => (
  <div className="w-full h-96 rounded-2xl border border-slate-800 bg-slate-950/60 flex flex-col items-center justify-center gap-3 text-slate-400">
    <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
    <span className="text-xs font-mono tracking-wider">{label}</span>
  </div>
);

export const FintechWorkspace: React.FC = () => {
  const [currentMode, setCurrentMode] = useState<AppWorkspaceMode>('radar');
  const [selectedTx, setSelectedTx] = useState<PaymentArcData | null>(null);

  // Auto-switch to studio when navigated with #converter-section anchor
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (window.location.hash === '#converter-section') {
        setCurrentMode('studio');
      }
      const handleHashChange = () => {
        if (window.location.hash === '#converter-section') {
          setCurrentMode('studio');
        }
      };
      window.addEventListener('hashchange', handleHashChange);
      return () => window.removeEventListener('hashchange', handleHashChange);
    }
  }, []);

  const handleSelectCorridor = (preset: CorridorPreset | null) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('swiftflow:focus-corridor', {
          detail: preset ? { center: preset.center } : {},
        })
      );
    }
  };

  const handleSelectTransactionFromLedger = (tx: LiveTransaction) => {
    setSelectedTx(tx);
    soundFx.playBlip(700);
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* 1. Real-time Telemetry & Metrics Ribbon */}
      <LiveMetricsBar />

      {/* 2. Institutional FinTech Control Deck (Sticky) */}
      <FintechControlDeck
        currentMode={currentMode}
        onModeChange={(mode) => setCurrentMode(mode)}
        onSelectCorridor={handleSelectCorridor}
      />

      {/* 3. Main Workspace Area by Active Mode */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <Suspense fallback={<WorkspaceSkeleton label="INITIALIZING HIGH-FREQUENCY FINTECH WORKSPACE..." />}>
          {/* MODE 1: 3D Global Radar */}
          {currentMode === 'radar' && (
            <div className="flex flex-col gap-6 animate-fadeIn">
              {/* 3D WebGL Globe View */}
              <div className="w-full rounded-2xl overflow-hidden border border-slate-800 bg-slate-950/60 shadow-2xl relative">
                <GlobeScene
                  onSelectTx={(tx) => {
                    setSelectedTx(tx);
                    soundFx.playBlip(650);
                  }}
                  isModalOpen={!!selectedTx}
                />
              </div>

              {/* Accessible Corridor Quick-Select Deck */}
              <div className="w-full">
                <ArcQuickList
                  onSelectTx={(tx) => {
                    setSelectedTx(tx);
                    soundFx.playBlip(650);
                  }}
                />
              </div>
            </div>
          )}

          {/* MODE 2: Live Institutional Clearing Ledger */}
          {currentMode === 'ledger' && (
            <div className="w-full animate-fadeIn">
              <LiveSettlementLedger onSelectTransaction={handleSelectTransactionFromLedger} />
            </div>
          )}

          {/* MODE 3: MT103 ➔ ISO 20022 Conversion Studio & Sandbox */}
          {currentMode === 'studio' && (
            <div id="converter-section" className="w-full animate-fadeIn">
              <ConverterPanel />
            </div>
          )}

          {/* MODE 4: Regulatory & Compliance AI Copilot Terminal */}
          {currentMode === 'copilot' && (
            <div className="w-full animate-fadeIn">
              <AiCopilotTerminal />
            </div>
          )}
        </Suspense>
      </div>

      {/* Global Transaction Drill-down Modal - Rendered cleanly via Portal to document.body */}
      {selectedTx && (
        <MessageInspectorModal
          transaction={selectedTx}
          onClose={() => setSelectedTx(null)}
        />
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { LiveMetricsBar } from './LiveMetricsBar';
import { FintechControlDeck, type AppWorkspaceMode } from './FintechControlDeck';
import { LiveSettlementLedger } from './LiveSettlementLedger';
import { ConverterPanel } from './ConverterPanel';
import { AiCopilotTerminal } from './AiCopilotTerminal';
import GlobeScene from '../3d/GlobeScene';
import { ArcQuickList } from './ArcQuickList';
import { MessageInspectorModal } from './MessageInspectorModal';
import type { PaymentArcData } from '../../types/swift';
import type { CorridorPreset, LiveTransaction } from '../../lib/liveStream';
import { soundFx } from '../../lib/soundFx';

export const FintechWorkspace: React.FC = () => {
  const [currentMode, setCurrentMode] = useState<AppWorkspaceMode>('radar');
  const [selectedTx, setSelectedTx] = useState<PaymentArcData | null>(null);

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
        {/* MODE 1: 3D Global Radar */}
        {currentMode === 'radar' && (
          <div className="flex flex-col gap-6 animate-fadeIn">
            {/* 3D WebGL Globe View */}
            <div className="w-full rounded-2xl overflow-hidden border border-slate-800 bg-slate-950/60 shadow-2xl relative">
              <GlobeScene />
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
          <div className="w-full animate-fadeIn">
            <ConverterPanel />
          </div>
        )}

        {/* MODE 4: Regulatory & Compliance AI Copilot Terminal */}
        {currentMode === 'copilot' && (
          <div className="w-full animate-fadeIn">
            <AiCopilotTerminal />
          </div>
        )}
      </div>

      {/* Global Transaction Drill-down Modal */}
      {selectedTx && (
        <MessageInspectorModal
          transaction={selectedTx}
          onClose={() => setSelectedTx(null)}
        />
      )}
    </div>
  );
};

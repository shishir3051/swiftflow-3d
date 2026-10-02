import React, { useState, useEffect } from 'react';
import {
  getLiveTransactionStream,
  CORRIDOR_PRESETS,
  type StreamSpeed,
  type CorridorPreset,
} from '../../lib/liveStream';
import { soundFx } from '../../lib/soundFx';
import {
  Play,
  Pause,
  FastForward,
  Volume2,
  VolumeX,
  Compass,
  Layers,
  Terminal,
  Cpu,
  Radio,
} from 'lucide-react';

export type AppWorkspaceMode = 'radar' | 'ledger' | 'studio' | 'copilot';

interface FintechControlDeckProps {
  currentMode: AppWorkspaceMode;
  onModeChange: (mode: AppWorkspaceMode) => void;
  onSelectCorridor?: (preset: CorridorPreset | null) => void;
}

export const FintechControlDeck: React.FC<FintechControlDeckProps> = ({
  currentMode,
  onModeChange,
  onSelectCorridor,
}) => {
  const [speed, setSpeed] = useState<StreamSpeed>(1);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);
  const [activeCorridorId, setActiveCorridorId] = useState<string | null>(null);

  useEffect(() => {
    const stream = getLiveTransactionStream();
    setSpeed(stream.getSpeed());
    setSoundEnabled(soundFx.isEnabled());
  }, []);

  const handleSpeedChange = (newSpeed: StreamSpeed) => {
    const stream = getLiveTransactionStream();
    stream.setSpeed(newSpeed);
    setSpeed(newSpeed);
    soundFx.playBlip(newSpeed === 0 ? 350 : 500 + newSpeed * 100);
  };

  const handleToggleSound = () => {
    const state = soundFx.toggle();
    setSoundEnabled(state);
  };

  const handleCorridorClick = (preset: CorridorPreset | null) => {
    if (preset === null || activeCorridorId === preset.id) {
      setActiveCorridorId(null);
      if (onSelectCorridor) onSelectCorridor(null);
    } else {
      setActiveCorridorId(preset.id);
      if (onSelectCorridor) onSelectCorridor(preset);
    }
    soundFx.playBlip(680);
  };

  return (
    <div className="w-full bg-slate-950/95 border-b border-slate-800 shadow-2xl backdrop-blur-2xl z-30 sticky top-16">
      <div className="max-w-7xl mx-auto px-4 py-2 flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Workspace Mode Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-900/90 rounded-xl border border-slate-800/80 text-xs w-full md:w-auto overflow-x-auto">
          <button
            onClick={() => {
              onModeChange('radar');
              soundFx.playBlip(550);
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium transition-all shrink-0 ${
              currentMode === 'radar'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/20 font-semibold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-cyan-300" />
            <span>3D Global Radar</span>
          </button>

          <button
            onClick={() => {
              onModeChange('ledger');
              soundFx.playBlip(580);
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium transition-all shrink-0 ${
              currentMode === 'ledger'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/20 font-semibold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-cyan-300" />
            <span>Clearing Ledger</span>
          </button>

          <button
            onClick={() => {
              onModeChange('studio');
              soundFx.playBlip(620);
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium transition-all shrink-0 ${
              currentMode === 'studio'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/20 font-semibold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-cyan-300" />
            <span>MT103 ➔ ISO 20022 Studio</span>
          </button>

          <button
            onClick={() => {
              onModeChange('copilot');
              soundFx.playBlip(660);
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium transition-all shrink-0 ${
              currentMode === 'copilot'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/20 font-semibold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Cpu className="w-3.5 h-3.5 text-cyan-300" />
            <span>AI Compliance Copilot</span>
          </button>
        </div>

        {/* Right Controls: Stream Controls, Corridor Presets, Sound */}
        <div className="flex flex-wrap items-center justify-end gap-2.5 w-full md:w-auto">
          {/* Corridor Presets Quick Switch (Visible in Radar Mode) */}
          {currentMode === 'radar' && (
            <div className="hidden lg:flex items-center gap-1 bg-slate-900/80 px-2 py-1 rounded-lg border border-slate-800 text-[11px]">
              <Compass className="w-3 h-3 text-cyan-400 mr-1" />
              <span className="text-slate-500 mr-1 font-mono">FOCUS:</span>
              {CORRIDOR_PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleCorridorClick(p)}
                  className={`px-2 py-0.5 rounded transition-all font-medium ${
                    activeCorridorId === p.id
                      ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-400/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title={p.description}
                >
                  {p.name.split(' ')[0]}
                </button>
              ))}
              {activeCorridorId && (
                <button
                  onClick={() => handleCorridorClick(null)}
                  className="px-1.5 py-0.5 rounded text-amber-400 hover:text-amber-300 text-[10px] ml-1"
                >
                  Reset
                </button>
              )}
            </div>
          )}

          {/* Stream Speed Buttons */}
          <div className="flex items-center bg-slate-900/90 p-0.5 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => handleSpeedChange(0)}
              title="Pause Live Feed"
              className={`p-1.5 rounded transition-all ${
                speed === 0
                  ? 'bg-amber-500/20 text-amber-400 font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Pause className="w-3 h-3" />
            </button>
            <button
              onClick={() => handleSpeedChange(1)}
              title="1x Real-Time Feed"
              className={`px-2 py-1 rounded text-[11px] font-mono transition-all ${
                speed === 1
                  ? 'bg-cyan-500/20 text-cyan-400 font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              1x
            </button>
            <button
              onClick={() => handleSpeedChange(2)}
              title="2x Accelerated"
              className={`px-2 py-1 rounded text-[11px] font-mono transition-all ${
                speed === 2
                  ? 'bg-cyan-500/20 text-cyan-400 font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              2x
            </button>
            <button
              onClick={() => handleSpeedChange(5)}
              title="5x High-Frequency Stream"
              className={`px-2 py-1 rounded text-[11px] font-mono transition-all flex items-center gap-0.5 ${
                speed === 5
                  ? 'bg-cyan-500/20 text-cyan-400 font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FastForward className="w-2.5 h-2.5" />
              <span>5x</span>
            </button>
          </div>

          {/* Audio FX Toggle */}
          <button
            onClick={handleToggleSound}
            title={soundEnabled ? 'Mute Institutional Audio' : 'Enable Settlement Audio Chimes'}
            className={`p-1.5 rounded-lg border text-xs flex items-center gap-1.5 transition-all ${
              soundEnabled
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
            }`}
          >
            {soundEnabled ? (
              <>
                <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline text-[11px] font-mono">AUDIO ON</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[11px] font-mono">MUTED</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

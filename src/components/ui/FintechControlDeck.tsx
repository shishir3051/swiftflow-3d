import React, { useState, useEffect } from 'react';
import {
  getLiveTransactionStream,
  CORRIDOR_PRESETS,
  type StreamSpeed,
  type CorridorPreset,
} from '../../lib/liveStream';
import { soundFx } from '../../lib/soundFx';
import { ThemeToggle } from './ThemeToggle';
import {
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

interface WorkspaceTabDef {
  id: AppWorkspaceMode;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeText: string;
  badgeType: 'live' | 'cyan' | 'blue' | 'purple';
  hotkey: string;
  soundPitch: number;
}

const WORKSPACE_TABS: WorkspaceTabDef[] = [
  {
    id: 'radar',
    label: '3D Global Radar',
    icon: Radio,
    badgeText: 'LIVE',
    badgeType: 'live',
    hotkey: '1',
    soundPitch: 550,
  },
  {
    id: 'ledger',
    label: 'Clearing Ledger',
    icon: Layers,
    badgeText: 'RTGS',
    badgeType: 'cyan',
    hotkey: '2',
    soundPitch: 580,
  },
  {
    id: 'studio',
    label: 'MT103 ➔ ISO 20022 Studio',
    icon: Terminal,
    badgeText: 'CBPR+',
    badgeType: 'blue',
    hotkey: '3',
    soundPitch: 620,
  },
  {
    id: 'copilot',
    label: 'AI Compliance Copilot',
    icon: Cpu,
    badgeText: 'AI',
    badgeType: 'purple',
    hotkey: '4',
    soundPitch: 660,
  },
];

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

  // Keyboard shortcut listener for swift workspace switching (1, 2, 3, 4)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }
      const matched = WORKSPACE_TABS.find((t) => t.hotkey === e.key);
      if (matched) {
        onModeChange(matched.id);
        soundFx.playBlip(matched.soundPitch);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onModeChange]);

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
    <div className="w-full bg-slate-950/95 border-b border-slate-800/80 shadow-2xl backdrop-blur-2xl z-30 sticky top-16">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Workspace Mode TabPanel */}
        <div
          role="tablist"
          aria-label="Fintech Workspace Modules"
          className="flex items-center gap-1.5 p-1.5 bg-slate-950/80 rounded-2xl border border-slate-800/90 shadow-[inset_0_1px_1px_rgba(255,255,255,0.06),0_10px_25px_-5px_rgba(0,0,0,0.6)] backdrop-blur-xl w-full md:w-auto overflow-x-auto no-scrollbar ring-1 ring-white/5"
        >
          {WORKSPACE_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentMode === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => {
                  onModeChange(tab.id);
                  soundFx.playBlip(tab.soundPitch);
                }}
                className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all duration-200 shrink-0 select-none group ${
                  isActive
                    ? 'bg-gradient-to-b from-slate-800/95 to-slate-900/95 text-white font-semibold shadow-[0_2px_12px_rgba(0,0,0,0.5),inset_0_1px_0_0_rgba(255,255,255,0.12)] border border-slate-700/80 ring-1 ring-cyan-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850/60 hover:border-slate-800 border border-transparent'
                }`}
              >
                {/* Active Glowing Bottom Accent Bar */}
                {isActive && (
                  <span className="absolute bottom-0 inset-x-2.5 h-[2px] rounded-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_8px_rgba(6,182,212,0.9)]" />
                )}

                {/* Tab Icon */}
                <Icon
                  className={`w-3.5 h-3.5 transition-all duration-200 group-hover:scale-110 ${
                    isActive
                      ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]'
                      : 'text-slate-400 group-hover:text-cyan-300'
                  }`}
                />

                {/* Tab Label */}
                <span className="tracking-tight">{tab.label}</span>

                {/* Badges */}
                {tab.badgeType === 'live' && (
                  <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold tracking-wider uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_#34d399]" />
                    {tab.badgeText}
                  </span>
                )}
                {tab.badgeType === 'cyan' && (
                  <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-mono font-semibold tracking-wider uppercase bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                    {tab.badgeText}
                  </span>
                )}
                {tab.badgeType === 'blue' && (
                  <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-mono font-semibold tracking-wider uppercase bg-blue-500/15 text-blue-300 border border-blue-500/30">
                    {tab.badgeText}
                  </span>
                )}
                {tab.badgeType === 'purple' && (
                  <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-mono font-semibold tracking-wider uppercase bg-purple-500/15 text-purple-300 border border-purple-500/30">
                    {tab.badgeText}
                  </span>
                )}

                {/* Hotkey Hint */}
                <kbd className="hidden xl:inline-flex items-center justify-center w-4 h-4 text-[9px] font-mono text-slate-500 bg-slate-900/90 border border-slate-800 rounded group-hover:border-slate-700 group-hover:text-slate-400 transition-colors">
                  {tab.hotkey}
                </kbd>
              </button>
            );
          })}
        </div>

        {/* Right Controls: Stream Controls, Corridor Presets, Sound */}
        <div className="flex flex-wrap items-center justify-end gap-2.5 w-full md:w-auto">
          {/* Corridor Presets Quick Switch (Visible in Radar Mode) */}
          {currentMode === 'radar' && (
            <div className="hidden lg:flex items-center gap-1.5 bg-slate-950/80 px-2.5 py-1.5 rounded-xl border border-slate-800/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)] text-[11px]">
              <Compass className="w-3 h-3 text-cyan-400 mr-0.5" />
              <span className="text-slate-500 mr-1 font-mono text-[10px] tracking-wider">FOCUS:</span>
              {CORRIDOR_PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleCorridorClick(p)}
                  className={`px-2 py-0.5 rounded-lg transition-all font-medium text-xs ${
                    activeCorridorId === p.id
                      ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-400/40 shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                  title={p.description}
                >
                  {p.name.split(' ')[0]}
                </button>
              ))}
              {activeCorridorId && (
                <button
                  onClick={() => handleCorridorClick(null)}
                  className="px-1.5 py-0.5 rounded-md text-amber-400 hover:text-amber-300 text-[10px] ml-1 bg-amber-500/10 border border-amber-500/20"
                >
                  Reset
                </button>
              )}
            </div>
          )}

          {/* Stream Speed Buttons */}
          <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)] text-xs gap-0.5">
            <button
              onClick={() => handleSpeedChange(0)}
              title="Pause Live Feed"
              className={`p-1.5 rounded-lg transition-all ${
                speed === 0
                  ? 'bg-amber-500/20 text-amber-400 font-semibold border border-amber-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Pause className="w-3 h-3" />
            </button>
            <button
              onClick={() => handleSpeedChange(1)}
              title="1x Real-Time Feed"
              className={`px-2 py-1 rounded-lg text-[11px] font-mono transition-all ${
                speed === 1
                  ? 'bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              1x
            </button>
            <button
              onClick={() => handleSpeedChange(2)}
              title="2x Accelerated"
              className={`px-2 py-1 rounded-lg text-[11px] font-mono transition-all ${
                speed === 2
                  ? 'bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              2x
            </button>
            <button
              onClick={() => handleSpeedChange(5)}
              title="5x High-Frequency Stream"
              className={`px-2 py-1 rounded-lg text-[11px] font-mono transition-all flex items-center gap-0.5 ${
                speed === 5
                  ? 'bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
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
            className={`px-2.5 py-1.5 rounded-xl border text-xs flex items-center gap-1.5 transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)] ${
              soundEnabled
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.15)]'
                : 'bg-slate-950/80 border-slate-800/80 text-slate-500 hover:text-slate-300 hover:border-slate-700'
            }`}
          >
            {soundEnabled ? (
              <>
                <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline text-[11px] font-mono font-medium">AUDIO ON</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline text-[11px] font-mono">MUTED</span>
              </>
            )}
          </button>

          {/* Theme Toggle (Light / Dark Mode) */}
          <ThemeToggle compact />
        </div>
      </div>
    </div>
  );
};

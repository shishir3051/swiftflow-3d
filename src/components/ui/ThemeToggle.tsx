import React, { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';
import { soundFx } from '../../lib/soundFx';

interface ThemeToggleProps {
  compact?: boolean;
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  compact = false,
  className = '',
}) => {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const isDark = document.documentElement.classList.contains('dark');
    setTheme(isDark ? 'dark' : 'light');

    const handleThemeChange = (e: CustomEvent<{ theme: 'dark' | 'light' }>) => {
      if (e.detail?.theme) {
        setTheme(e.detail.theme);
      }
    };

    window.addEventListener(
      'swiftflow:theme-change' as any,
      handleThemeChange as EventListener
    );

    return () => {
      window.removeEventListener(
        'swiftflow:theme-change' as any,
        handleThemeChange as EventListener
      );
    };
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);

    if (nextTheme === 'dark') {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
      localStorage.setItem('swiftflow-theme', 'dark');
      soundFx.playBlip(540);
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
      localStorage.setItem('swiftflow-theme', 'light');
      soundFx.playBlip(750);
    }

    window.dispatchEvent(
      new CustomEvent('swiftflow:theme-change', { detail: { theme: nextTheme } })
    );
  };

  if (!mounted) {
    // Render placeholder to avoid layout shift before hydration
    return (
      <div
        className={`w-9 h-9 rounded-xl border border-slate-800/80 bg-slate-900/50 ${className}`}
      />
    );
  }

  const isDark = theme === 'dark';

  if (compact) {
    return (
      <button
        onClick={toggleTheme}
        type="button"
        title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        className={`p-1.5 rounded-xl border text-xs flex items-center justify-center transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)] ${
          isDark
            ? 'bg-slate-950/80 border-slate-800/80 text-amber-400 hover:text-amber-300 hover:border-amber-400/30 hover:bg-amber-400/10'
            : 'bg-white border-slate-300 text-indigo-600 hover:text-indigo-800 hover:border-indigo-400/40 hover:bg-indigo-50 shadow-sm'
        } ${className}`}
      >
        {isDark ? (
          <Sun className="w-3.5 h-3.5 transition-transform duration-300 rotate-0 hover:rotate-45" />
        ) : (
          <Moon className="w-3.5 h-3.5 transition-transform duration-300 -rotate-12 hover:rotate-0" />
        )}
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      type="button"
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      className={`relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-medium transition-all ${
        isDark
          ? 'bg-slate-900/90 hover:bg-slate-800/80 border-slate-800 hover:border-slate-700 text-slate-300 hover:text-amber-300 shadow-sm'
          : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-700 hover:text-indigo-600 shadow-sm'
      } ${className}`}
    >
      <span className="relative flex items-center justify-center w-4 h-4">
        {isDark ? (
          <Sun className="w-3.5 h-3.5 text-amber-400 transition-all duration-300 rotate-0 group-hover:rotate-45" />
        ) : (
          <Moon className="w-3.5 h-3.5 text-indigo-600 transition-all duration-300 -rotate-12" />
        )}
      </span>
      <span className="text-[11px] font-mono hidden sm:inline">
        {isDark ? 'LIGHT' : 'DARK'}
      </span>
    </button>
  );
};

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Home, VenetianMask, Settings2 } from 'lucide-react';
import type { WinstonPrefs } from '../utils/prefs';

type TopBarProps = {
  onBackToLauncher: () => void;
  prefs: WinstonPrefs;
  onChangePrefs: (next: WinstonPrefs) => void;
  rightSlot?: React.ReactNode;
};

const Toggle: React.FC<{
  label: string;
  enabled: boolean;
  onToggle: () => void;
  iconOn?: React.ReactNode;
  iconOff?: React.ReactNode;
}> = ({ label, enabled, onToggle, iconOn, iconOff }) => (
  <button
    type="button"
    onClick={onToggle}
    className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/70 px-3 py-2 text-xs md:text-sm text-zinc-200 hover:bg-zinc-800 transition backdrop-blur-md"
    aria-pressed={enabled}
  >
    <span className="text-zinc-400">{enabled ? iconOn : iconOff}</span>
    <span className="font-medium">{label}</span>
    <span
      className={[
        'ml-1 inline-flex h-5 w-9 items-center rounded-full border transition',
        enabled ? 'bg-emerald-500/25 border-emerald-400/40' : 'bg-zinc-800 border-zinc-700',
      ].join(' ')}
    >
      <span
        className={[
          'h-4 w-4 rounded-full transition-transform',
          enabled ? 'translate-x-4 bg-emerald-300' : 'translate-x-0.5 bg-zinc-400',
        ].join(' ')}
      />
    </span>
  </button>
);

const ICON_PRESETS: Array<{ label: string; url: string }> = [
  { label: 'Google', url: 'https://www.google.com/favicon.ico' },
  { label: 'Classroom', url: 'https://classroom.google.com/favicon.ico' },
  { label: 'Drive', url: 'https://drive.google.com/favicon.ico' },
  { label: 'Docs', url: 'https://docs.google.com/favicon.ico' },
  { label: 'Gmail', url: 'https://mail.google.com/favicon.ico' },
  { label: 'Canvas', url: 'https://canvas.instructure.com/favicon.ico' },
];

const TopBar: React.FC<TopBarProps> = ({ onBackToLauncher, prefs, onChangePrefs, rightSlot }) => {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!open) return;
      const target = e.target as Node | null;
      if (target && panelRef.current && !panelRef.current.contains(target)) setOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [open]);

  const cloakSummary = useMemo(() => {
    if (!prefs.cloakMode) return 'Off';
    return prefs.cloakAboutBlank ? 'On • about:blank' : 'On';
  }, [prefs.cloakMode, prefs.cloakAboutBlank]);

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] p-4 md:p-6 pointer-events-none bg-gradient-to-b from-black/90 to-transparent">
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={onBackToLauncher}
          aria-label="Back to Launcher"
          className="group pointer-events-auto rounded-full bg-zinc-900/70 p-2.5 md:p-3 hover:bg-zinc-800 transition backdrop-blur-md flex items-center gap-2 pr-4 border border-zinc-800"
        >
          <Home className="h-5 w-5 text-zinc-400 group-hover:text-white transition" />
          <span className="text-sm font-medium text-zinc-400 group-hover:text-white transition hidden sm:inline">Launcher</span>
        </button>

        <div className="flex items-center gap-2 md:gap-3">
          {rightSlot}

          <div className="relative pointer-events-auto" ref={panelRef}>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/70 px-3 py-2 text-xs md:text-sm text-zinc-200 hover:bg-zinc-800 transition backdrop-blur-md"
              aria-expanded={open}
              aria-haspopup="dialog"
            >
              <VenetianMask className="h-4 w-4 text-zinc-400" />
              <span className="font-medium">Cloak</span>
              <span className="text-zinc-500 hidden md:inline">{cloakSummary}</span>
              <Settings2 className="h-4 w-4 text-zinc-500" />
            </button>

            {open && (
              <div className="absolute right-0 mt-3 w-[320px] rounded-2xl border border-zinc-800 bg-zinc-950/95 backdrop-blur-xl shadow-2xl p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-white">Cloaking</div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="text-xs text-zinc-500 hover:text-zinc-200 transition"
                  >
                    Close
                  </button>
                </div>

                <div className="mt-3 space-y-3">
                  <Toggle
                    label="Enable"
                    enabled={prefs.cloakMode}
                    onToggle={() => onChangePrefs({ ...prefs, cloakMode: !prefs.cloakMode })}
                    iconOn={<VenetianMask className="h-4 w-4" />}
                    iconOff={<VenetianMask className="h-4 w-4" />}
                  />

                  <Toggle
                    label="Open links in about:blank"
                    enabled={prefs.cloakAboutBlank}
                    onToggle={() => onChangePrefs({ ...prefs, cloakAboutBlank: !prefs.cloakAboutBlank })}
                    iconOn={<VenetianMask className="h-4 w-4" />}
                    iconOff={<VenetianMask className="h-4 w-4" />}
                  />

                  <div className="space-y-2">
                    <label className="block text-xs text-zinc-400">Tab title</label>
                    <input
                      value={prefs.cloakTitle}
                      onChange={(e) => onChangePrefs({ ...prefs, cloakTitle: e.target.value })}
                      className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-500"
                      placeholder="Google Classroom"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs text-zinc-400">Icon</label>
                    <div className="grid grid-cols-6 gap-2">
                      {ICON_PRESETS.map((preset) => {
                        const selected = prefs.cloakFaviconUrl === preset.url;
                        return (
                          <button
                            key={preset.url}
                            type="button"
                            onClick={() => onChangePrefs({ ...prefs, cloakFaviconUrl: preset.url })}
                            className={[
                              'h-10 w-10 rounded-xl border bg-zinc-900/70 hover:bg-zinc-800 transition flex items-center justify-center overflow-hidden',
                              selected ? 'border-emerald-400/50 ring-2 ring-emerald-500/20' : 'border-zinc-800',
                            ].join(' ')}
                            title={preset.label}
                          >
                            <img src={preset.url} alt={preset.label} className="h-5 w-5" loading="lazy" decoding="async" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopBar;


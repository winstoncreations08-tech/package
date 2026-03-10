import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Key, Tv } from 'lucide-react';
import { Settings } from '../types';

interface SettingsModalProps {
  settings: Settings;
  onSave: (settings: Settings) => void;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ settings, onSave, onClose }) => {
  const [apiKey, setApiKey] = useState(settings.tmdbApiKey);

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onSave({ tmdbApiKey: apiKey.trim() });
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4 bg-zinc-950/50 shrink-0">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Tv className="h-5 w-5 text-red-500" />
            Stream Settings
          </h2>
          <button onClick={onClose} aria-label="Close Settings" className="text-zinc-400 hover:text-white transition rounded-full hover:bg-zinc-800 p-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto scrollbar-thin">
          
          {/* API Key Card */}
          <div className="space-y-3">
             <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 ml-1">Configuration</label>
             <div className="rounded-xl bg-zinc-950 p-4 border border-zinc-800 space-y-4">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800">
                        <Key className="h-4 w-4 text-zinc-300" />
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold text-white">TMDB Credentials</h4>
                        <p className="text-xs text-zinc-500">Required for metadata</p>
                    </div>
                </div>
                
                <input
                  type="text"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Paste API Key (v3) or Token (v4)"
                  className="w-full rounded-lg bg-zinc-900 border border-zinc-800 px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600 transition"
                  aria-label="TMDB API Key"
                />
                
                <p className="text-[10px] text-zinc-500">
                  Don't have one? <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noreferrer" className="text-red-500 hover:underline">Get it here</a>.
                </p>
             </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-zinc-950/50 border-t border-zinc-800 flex justify-end shrink-0">
          <button 
            onClick={() => handleSave()}
            className="rounded-lg bg-white text-black px-6 py-2 text-sm font-bold hover:bg-zinc-200 transition active:scale-95 shadow-lg"
          >
            Done
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
};

export default SettingsModal;
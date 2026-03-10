import React, { useState } from 'react';
import { Home, Search, Loader2, X, ExternalLink, ArrowUpRight } from 'lucide-react';
import { initProxyWorker, toProxyUrl } from '../services/proxy';

interface SearchAppProps {
  onBack: () => void;
}

const QUICK_LINKS = [
  'netflix.com',
  'hulu.com',
  'disneyplus.com',
  'tv.apple.com',
  'youtube.com',
  'github.com',
  'reddit.com',
  'wikipedia.org',
];

const SearchApp: React.FC<SearchAppProps> = ({ onBack }) => {
  const [query, setQuery] = useState('');
  const [searchUrl, setSearchUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const isLikelyUrl = (str: string) => {
    const trimmed = str.trim();
    return /^(https?:\/\/)/i.test(trimmed) || /^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(trimmed);
  };

  const resolveTargetUrl = (raw: string) => {
    const input = raw.trim();
    if (!input) return '';

    if (isLikelyUrl(input)) {
      return input.startsWith('http://') || input.startsWith('https://') ? input : `https://${input}`;
    }

    return `https://www.google.com/search?q=${encodeURIComponent(input)}`;
  };

  const runSearch = async (value?: string) => {
    const source = value ?? query;
    const targetUrl = resolveTargetUrl(source);
    if (!targetUrl) return;

    setIsLoading(true);
    setQuery(source.trim());
    await initProxyWorker();
    setSearchUrl(toProxyUrl(targetUrl));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void runSearch();
    }
  };

  const clearSearch = () => {
    setQuery('');
    setSearchUrl('');
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col animate-in fade-in duration-500 overflow-x-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 -left-20 h-[420px] w-[420px] rounded-full bg-blue-500/10 blur-[110px]" />
        <div className="absolute -bottom-24 -right-20 h-[420px] w-[420px] rounded-full bg-cyan-500/10 blur-[110px]" />
      </div>

      <div className="relative z-20 fixed top-0 left-0 right-0 p-4 md:p-6 flex justify-between items-center pointer-events-none bg-gradient-to-b from-black/90 to-transparent">
        <button
          onClick={onBack}
          aria-label="Back to Launcher"
          className="group pointer-events-auto rounded-full bg-zinc-900/70 p-2.5 md:p-3 hover:bg-zinc-800 transition backdrop-blur-md flex items-center gap-2 pr-4 border border-zinc-800"
        >
          <Home className="h-5 w-5 text-zinc-400 group-hover:text-white transition" />
          <span className="text-sm font-medium text-zinc-400 group-hover:text-white transition hidden sm:inline">Launcher</span>
        </button>

        {searchUrl && (
          <a
            href={searchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900/70 px-4 py-2 text-xs md:text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 transition"
          >
            Open in tab
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>

      <div className="relative z-10 w-full max-w-[1380px] mx-auto px-4 md:px-8 pb-8 pt-24 md:pt-28 flex-1 flex flex-col gap-6">
        <section className="rounded-2xl border border-zinc-800 bg-zinc-950/70 backdrop-blur-sm p-5 md:p-6 space-y-5">
          <div className="space-y-2">
            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-blue-400 via-cyan-300 to-zinc-100">
              WinstonSearches
            </h1>
            <p className="text-zinc-500 text-sm md:text-base">Search fast, open URLs instantly, and keep flow inside the dashboard.</p>
          </div>

          <div className="relative w-full">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              {isLoading ? (
                <Loader2 className="h-5 w-5 text-blue-400 animate-spin" />
              ) : (
                <Search className="h-5 w-5 text-zinc-500" />
              )}
            </div>

            <input
              type="text"
              placeholder="Search the web or enter URL..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyPress}
              className="w-full rounded-xl bg-zinc-900 border border-zinc-800 py-3.5 pl-12 pr-28 text-base md:text-lg text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
              autoFocus
            />

            <div className="absolute inset-y-0 right-2 flex items-center gap-2">
              {query && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={() => void runSearch()}
                className="rounded-lg bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 text-sm font-semibold transition"
              >
                Go
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {QUICK_LINKS.map((link) => (
              <button
                key={link}
                onClick={() => void runSearch(link)}
                className="inline-flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900/80 px-3 py-1.5 text-xs md:text-sm text-zinc-300 hover:text-white hover:border-zinc-700 hover:bg-zinc-800 transition"
              >
                {link}
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>
        </section>

        {searchUrl ? (
          <section className="flex-1 min-h-[480px] rounded-2xl border border-zinc-800 overflow-hidden bg-white shadow-2xl relative">
            {isLoading && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-zinc-900/20 backdrop-blur-sm">
                <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
              </div>
            )}

            <iframe
              key={searchUrl}
              src={searchUrl}
              className="w-full h-full border-0 bg-white"
              title="Search Results"
              onLoad={() => setIsLoading(false)}
              sandbox="allow-forms allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
            />
          </section>
        ) : (
          <section className="flex-1 min-h-[360px] rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/40 flex items-center justify-center p-6 text-center">
            <div className="max-w-lg space-y-3">
              <p className="text-xl md:text-2xl font-bold text-zinc-200">No page loaded yet</p>
              <p className="text-zinc-500">
                Start with a URL or search term. Quick links above are tuned for the same flow as Streams, Games, and Apps.
              </p>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default SearchApp;

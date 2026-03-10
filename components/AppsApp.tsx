import React, { useMemo, useState, useEffect } from 'react';
import { Search, LayoutGrid, ExternalLink, ArrowUpDown } from 'lucide-react';

interface AppsAppProps {
  onOpenUrl: (url: string) => void;
}

interface App {
  appName: string;
  icon: string;
  desc: string;
  url: string;
}

type SortMode = 'alphabetical' | 'reverse' | 'shortest';

const AppsApp: React.FC<AppsAppProps> = ({ onOpenUrl }) => {
  const [apps, setApps] = useState<App[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortMode>('alphabetical');
  const [fallbackIcons, setFallbackIcons] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadApps = async () => {
      try {
        const response = await fetch('/data/apps.json');
        if (!response.ok) throw new Error('Failed to load apps');
        const data = await response.json();
        setApps(data.apps || []);
      } catch (error) {
        console.error('Error loading apps:', error);
        setApps([
          {
            appName: 'YouTube',
            icon: 'https://www.youtube.com/favicon.ico',
            desc: 'Video Streaming',
            url: 'https://youtube.com',
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    loadApps();
  }, []);

  const filteredApps = useMemo(() => {
    const base = apps.filter((app) => app.appName.toLowerCase().includes(searchQuery.toLowerCase()));

    if (sortBy === 'reverse') {
      return [...base].sort((a, b) => b.appName.localeCompare(a.appName));
    }

    if (sortBy === 'shortest') {
      return [...base].sort((a, b) => a.appName.length - b.appName.length || a.appName.localeCompare(b.appName));
    }

    return [...base].sort((a, b) => a.appName.localeCompare(b.appName));
  }, [apps, searchQuery, sortBy]);

  const handleImageError = (appName: string) => {
    setFallbackIcons((prev) => new Set(prev).add(appName));
  };

  const handleAppClick = (url: string) => {
    onOpenUrl(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="text-center">
          <LayoutGrid className="h-16 w-16 text-emerald-500 animate-pulse mx-auto mb-4" />
          <p className="text-zinc-400">Loading apps...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 -left-24 h-[420px] w-[420px] rounded-full bg-emerald-500/10 blur-[120px]" />
        <div className="absolute -bottom-24 -right-24 h-[420px] w-[420px] rounded-full bg-green-500/10 blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-[1380px] mx-auto px-4 md:px-8 pb-10 pt-24 md:pt-28 space-y-6">
        <section className="rounded-2xl border border-zinc-800 bg-zinc-950/70 backdrop-blur-sm p-5 md:p-6 space-y-5">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-3xl md:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-emerald-400 via-green-300 to-zinc-100">
                WinstonApps
              </h1>
              <p className="text-zinc-500 text-sm md:text-base">Web tools, social platforms, and productivity apps in one place.</p>
            </div>
            <div className="text-xs md:text-sm text-zinc-400 rounded-full border border-zinc-800 px-4 py-2 bg-zinc-900/70 self-start md:self-auto">
              {apps.length} Total Apps
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
              <input
                type="text"
                placeholder={`Search ${apps.length} apps...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-11 pr-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition"
              />
            </div>

            <div className="relative min-w-[190px]">
              <ArrowUpDown className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortMode)}
                className="w-full appearance-none bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              >
                <option value="alphabetical">Sort: A to Z</option>
                <option value="reverse">Sort: Z to A</option>
                <option value="shortest">Sort: Short Name</option>
              </select>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-950/45 p-4 md:p-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
            {filteredApps.map((app) => (
              <button
                key={`${app.appName}-${app.url}`}
                onClick={() => handleAppClick(app.url)}
                className="group relative rounded-2xl border border-zinc-800 bg-zinc-900/80 hover:bg-zinc-900 p-3 md:p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-500/40"
              >
                <div className="relative mb-3">
                  <div className="w-full aspect-square rounded-xl bg-zinc-800 overflow-hidden">
                    {fallbackIcons.has(app.appName) ? (
                      <div className="h-full w-full flex items-center justify-center">
                        <LayoutGrid className="w-9 h-9 text-emerald-400" />
                      </div>
                    ) : (
                      <img
                        src={app.icon}
                        alt={app.appName}
                        className="w-full h-full object-cover"
                        onError={() => handleImageError(app.appName)}
                        loading="lazy"
                        decoding="async"
                      />
                    )}
                  </div>
                  <div className="absolute top-2 right-2 rounded-md bg-black/65 p-1.5 opacity-0 group-hover:opacity-100 transition">
                    <ExternalLink className="h-3.5 w-3.5 text-white" />
                  </div>
                </div>

                <p className="text-sm font-semibold text-white truncate">{app.appName}</p>
                <p className="text-xs text-zinc-500 mt-1 truncate">{app.desc}</p>
              </button>
            ))}
          </div>

          {filteredApps.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-500 text-center">
              <LayoutGrid className="h-16 w-16 mb-4 opacity-50" />
              <p className="text-lg text-zinc-300">No apps found</p>
              <p className="text-sm">Try another search or sorting mode.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default AppsApp;

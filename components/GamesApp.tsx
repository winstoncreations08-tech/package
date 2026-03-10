import React, { useMemo, useState, useEffect } from 'react';
import { Search, Gamepad2, ExternalLink, ArrowUpDown, Star } from 'lucide-react';

interface GamesAppProps {
  onOpenUrl: (url: string) => void;
}

interface Game {
  appName: string;
  icon: string;
  desc: string;
  url: string;
}

type SortMode = 'alphabetical' | 'reverse' | 'shortest';

const FEATURED_GAME: Game = {
  appName: 'CheeseStoreCedarhurst',
  icon: 'https://www.google.com/s2/favicons?sz=128&domain=cheesestorecedarhurst.com',
  desc: 'Featured pick',
  url: 'https://cheesestorecedarhurst.com',
};

const GamesApp: React.FC<GamesAppProps> = ({ onOpenUrl }) => {
  const [games, setGames] = useState<Game[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortMode>('alphabetical');
  const [fallbackIcons, setFallbackIcons] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadGames = async () => {
      try {
        const response = await fetch('/data/apps.json');
        if (!response.ok) throw new Error('Failed to load games');
        const data = await response.json();
        setGames(data.games || []);
      } catch (error) {
        console.error('Error loading games:', error);
        setGames([
          {
            appName: 'Slope',
            icon: 'https://slope-game.github.io/rsc/favicon.ico',
            desc: 'Endless Running',
            url: 'https://slope-game.github.io',
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    loadGames();
  }, []);

  const filteredGames = useMemo(() => {
    const base = games.filter((game) => game.appName.toLowerCase().includes(searchQuery.toLowerCase()));

    if (sortBy === 'reverse') {
      return [...base].sort((a, b) => b.appName.localeCompare(a.appName));
    }

    if (sortBy === 'shortest') {
      return [...base].sort((a, b) => a.appName.length - b.appName.length || a.appName.localeCompare(b.appName));
    }

    return [...base].sort((a, b) => a.appName.localeCompare(b.appName));
  }, [games, searchQuery, sortBy]);

  const gridGames = useMemo(
    () => filteredGames.filter((game) => game.url !== FEATURED_GAME.url && game.appName !== FEATURED_GAME.appName),
    [filteredGames]
  );

  const handleImageError = (appName: string) => {
    setFallbackIcons((prev) => new Set(prev).add(appName));
  };

  const handleGameClick = (url: string) => {
    onOpenUrl(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="text-center">
          <Gamepad2 className="h-16 w-16 text-purple-500 animate-pulse mx-auto mb-4" />
          <p className="text-zinc-400">Loading games...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 -left-24 h-[420px] w-[420px] rounded-full bg-purple-500/10 blur-[120px]" />
        <div className="absolute -bottom-24 -right-24 h-[420px] w-[420px] rounded-full bg-pink-500/10 blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-[1380px] mx-auto px-4 md:px-8 pb-10 pt-24 md:pt-28 space-y-6">
        <section className="rounded-2xl border border-zinc-800 bg-zinc-950/70 backdrop-blur-sm p-5 md:p-6 space-y-5">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-3xl md:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-purple-400 via-pink-300 to-zinc-100">
                WinstonGames
              </h1>
              <p className="text-zinc-500 text-sm md:text-base">High-quality browser games, tuned for instant launch.</p>
            </div>
            <div className="text-xs md:text-sm text-zinc-400 rounded-full border border-zinc-800 px-4 py-2 bg-zinc-900/70 self-start md:self-auto">
              {games.length} Total Games
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
              <input
                type="text"
                placeholder={`Search ${games.length} games...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-11 pr-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition"
              />
            </div>

            <div className="relative min-w-[190px]">
              <ArrowUpDown className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortMode)}
                className="w-full appearance-none bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-purple-600"
              >
                <option value="alphabetical">Sort: A to Z</option>
                <option value="reverse">Sort: Z to A</option>
                <option value="shortest">Sort: Short Name</option>
              </select>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-purple-500/35 bg-gradient-to-br from-purple-900/35 via-zinc-900 to-zinc-950 p-4 md:p-5">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-purple-300 mb-3">
            <Star className="h-3.5 w-3.5 fill-purple-300" />
            Featured
          </div>

          <button
            onClick={() => handleGameClick(FEATURED_GAME.url)}
            className="w-full text-left rounded-xl border border-purple-500/35 bg-zinc-900/75 hover:bg-zinc-900 transition p-4 md:p-5 group"
          >
            <div className="flex items-center gap-4 md:gap-5">
              <div className="h-16 w-16 md:h-20 md:w-20 rounded-xl bg-zinc-800 overflow-hidden shrink-0 border border-zinc-700">
                {fallbackIcons.has(FEATURED_GAME.appName) ? (
                  <div className="h-full w-full flex items-center justify-center">
                    <Gamepad2 className="w-8 h-8 text-purple-400" />
                  </div>
                ) : (
                  <img
                    src={FEATURED_GAME.icon}
                    alt={FEATURED_GAME.appName}
                    className="h-full w-full object-cover"
                    onError={() => handleImageError(FEATURED_GAME.appName)}
                    loading="lazy"
                    decoding="async"
                  />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xl md:text-2xl font-bold tracking-tight text-white truncate">cheesestorecedarhurst.com</p>
                <p className="text-sm md:text-base text-zinc-300 mt-1">Pinned as your main featured destination.</p>
              </div>
              <div className="ml-auto rounded-full bg-purple-500/20 border border-purple-400/30 p-2.5 text-purple-200 shrink-0 group-hover:bg-purple-500/30 transition">
                <ExternalLink className="h-4 w-4" />
              </div>
            </div>
          </button>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-950/45 p-4 md:p-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
            {gridGames.map((game) => (
              <button
                key={`${game.appName}-${game.url}`}
                onClick={() => handleGameClick(game.url)}
                className="group relative rounded-2xl border border-zinc-800 bg-zinc-900/80 hover:bg-zinc-900 p-3 md:p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-purple-500/40"
              >
                <div className="relative mb-3">
                  <div className="w-full aspect-square rounded-xl bg-zinc-800 overflow-hidden">
                    {fallbackIcons.has(game.appName) ? (
                      <div className="h-full w-full flex items-center justify-center">
                        <Gamepad2 className="w-9 h-9 text-purple-400" />
                      </div>
                    ) : (
                      <img
                        src={game.icon}
                        alt={game.appName}
                        className="w-full h-full object-cover"
                        onError={() => handleImageError(game.appName)}
                        loading="lazy"
                        decoding="async"
                      />
                    )}
                  </div>
                  <div className="absolute top-2 right-2 rounded-md bg-black/65 p-1.5 opacity-0 group-hover:opacity-100 transition">
                    <ExternalLink className="h-3.5 w-3.5 text-white" />
                  </div>
                </div>

                <p className="text-sm font-semibold text-white truncate">{game.appName}</p>
                <p className="text-xs text-zinc-500 mt-1 truncate">{game.desc}</p>
              </button>
            ))}
          </div>

          {gridGames.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-500 text-center">
              <Gamepad2 className="h-16 w-16 mb-4 opacity-50" />
              <p className="text-lg text-zinc-300">No games found</p>
              <p className="text-sm">Try another search or sorting mode.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default GamesApp;

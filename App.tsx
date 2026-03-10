import React, { useEffect, useMemo, useState } from 'react';
import MovieApp from './components/MovieApp';
import SearchApp from './components/SearchApp';
import GamesApp from './components/GamesApp';
import AppsApp from './components/AppsApp';
import { Globe, Tv, Gamepad2, LayoutGrid, ArrowRight } from 'lucide-react';

type AppMode = 'launcher' | 'streams' | 'searches' | 'games' | 'apps';
type LaunchMode = Exclude<AppMode, 'launcher'>;

const modeFromPath = (path: string): AppMode => {
  if (path.includes('/WinstonStreams')) return 'streams';
  if (path.includes('/WinstonSearches')) return 'searches';
  if (path.includes('/WinstonGames')) return 'games';
  if (path.includes('/WinstonApps')) return 'apps';
  return 'launcher';
};

const pathForMode = (mode: AppMode): string => {
  if (mode === 'streams') return '/WinstonStreams';
  if (mode === 'searches') return '/WinstonSearches';
  if (mode === 'games') return '/WinstonGames';
  if (mode === 'apps') return '/WinstonApps';
  return '/';
};

const App: React.FC = () => {
  const [appMode, setAppMode] = useState<AppMode>(() => modeFromPath(window.location.pathname));
  const [hoveredCard, setHoveredCard] = useState<LaunchMode | null>(null);

  useEffect(() => {
    const handlePopState = () => setAppMode(modeFromPath(window.location.pathname));
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleLaunch = (target: LaunchMode) => {
    setAppMode(target);
    window.history.pushState({}, '', pathForMode(target));
  };

  const handleBackToLauncher = () => {
    setAppMode('launcher');
    window.history.pushState({}, '', pathForMode('launcher'));
  };

  const orbColors = useMemo(() => {
    if (hoveredCard === 'streams') return ['rgba(239, 68, 68, 0.24)', 'rgba(180, 83, 9, 0.2)'];
    if (hoveredCard === 'searches') return ['rgba(59, 130, 246, 0.24)', 'rgba(6, 182, 212, 0.2)'];
    if (hoveredCard === 'games') return ['rgba(168, 85, 247, 0.26)', 'rgba(236, 72, 153, 0.2)'];
    if (hoveredCard === 'apps') return ['rgba(34, 197, 94, 0.24)', 'rgba(16, 185, 129, 0.2)'];
    return ['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.06)'];
  }, [hoveredCard]);

  const cards: Array<{
    mode: LaunchMode;
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    gradient: string;
    accentText: string;
  }> = [
    {
      mode: 'streams',
      title: 'WinstonStreams',
      subtitle: 'Premium movie and TV discovery',
      icon: <Tv className="h-7 w-7" />,
      gradient: 'from-red-500/20 via-red-500/5 to-transparent',
      accentText: 'text-red-300',
    },
    {
      mode: 'searches',
      title: 'WinstonSearches',
      subtitle: 'Fast web search and URL launch',
      icon: <Globe className="h-7 w-7" />,
      gradient: 'from-blue-500/20 via-blue-500/5 to-transparent',
      accentText: 'text-blue-300',
    },
    {
      mode: 'games',
      title: 'WinstonGames',
      subtitle: 'Curated browser game library',
      icon: <Gamepad2 className="h-7 w-7" />,
      gradient: 'from-purple-500/20 via-purple-500/5 to-transparent',
      accentText: 'text-purple-300',
    },
    {
      mode: 'apps',
      title: 'WinstonApps',
      subtitle: 'Everyday tools and social apps',
      icon: <LayoutGrid className="h-7 w-7" />,
      gradient: 'from-emerald-500/20 via-emerald-500/5 to-transparent',
      accentText: 'text-emerald-300',
    },
  ];

  return (
    <div className="h-[100dvh] bg-zinc-950 text-white relative font-sans selection:bg-white/20 overflow-hidden flex flex-col">
      <div className="relative z-10 w-full flex-1 flex flex-col overflow-hidden">
        {appMode === 'streams' && <MovieApp onBack={handleBackToLauncher} />}
        {appMode === 'searches' && <SearchApp onBack={handleBackToLauncher} />}
        {appMode === 'games' && <GamesApp onBack={handleBackToLauncher} />}
        {appMode === 'apps' && <AppsApp onBack={handleBackToLauncher} />}

        {appMode === 'launcher' && (
          <div className="flex-1 w-full h-full overflow-y-auto no-scrollbar scroll-smooth">
            <div className="min-h-full flex flex-col items-center p-6 md:p-8 relative">
              <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay" />
              <div
                className="fixed top-[-8%] left-[8%] w-[440px] h-[440px] rounded-full blur-[118px] pointer-events-none animate-pulse transition-all duration-1000"
                style={{ backgroundColor: orbColors[0] }}
              />
              <div
                className="fixed bottom-[-8%] right-[8%] w-[440px] h-[440px] rounded-full blur-[118px] pointer-events-none animate-pulse transition-all duration-1000"
                style={{ backgroundColor: orbColors[1] }}
              />

              <div className="relative z-10 w-full max-w-[1180px] flex-1 flex flex-col">
                <header className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 backdrop-blur-sm px-5 md:px-7 py-5 md:py-6 mt-2">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Main Menu</p>
                      <h1 className="text-3xl md:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-zinc-100 via-zinc-300 to-zinc-600">
                        Winston Launcher
                      </h1>
                      <p className="text-zinc-500 text-sm mt-1">Streams, searches, games, and apps in one seamless dashboard.</p>
                    </div>
                  </div>
                </header>

                <main className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6 py-7 md:py-8">
                  {cards.map((card) => (
                    <button
                      key={card.mode}
                      onClick={() => handleLaunch(card.mode)}
                      onMouseEnter={() => setHoveredCard(card.mode)}
                      onMouseLeave={() => setHoveredCard(null)}
                      className="text-left group relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/70 hover:bg-zinc-900 transition-all duration-300 p-6 md:p-7"
                    >
                      <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-90`} />
                      <div className="relative z-10 h-full flex flex-col gap-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className={`rounded-2xl p-3 bg-zinc-950/80 border border-zinc-700 ${card.accentText}`}>
                            {card.icon}
                          </div>
                          <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Launch</div>
                        </div>

                        <div className="space-y-2">
                          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white">{card.title}</h2>
                          <p className="text-zinc-400 text-sm md:text-base">{card.subtitle}</p>
                        </div>

                        <div className="mt-auto inline-flex items-center gap-2 text-sm text-zinc-300 group-hover:text-white transition-colors">
                          Enter module
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </div>
                      </div>
                    </button>
                  ))}
                </main>

                <footer className="pb-4 md:pb-6 flex justify-center">
                  <div className="text-[11px] md:text-xs text-zinc-500 border border-zinc-800 rounded-full px-4 py-2 bg-zinc-900/50 backdrop-blur-sm">
                    Winston Unified • Streams • Search • Games • Apps
                  </div>
                </footer>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;

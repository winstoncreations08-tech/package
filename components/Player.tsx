import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Movie, TVDetails } from '../types';
import {
  X,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Layers,
  Play,
  Maximize,
  Minimize,
  RotateCcw,
  ExternalLink,
} from 'lucide-react';
import { getTVDetails } from '../services/tmdb';

interface PlayerProps {
  movie: Movie | null;
  onClose: () => void;
  apiKey: string;
}

type SourceDefinition = {
  id: 'vidlink' | 'vidsrcTo' | 'vidsrcSu';
  label: string;
  movieUrl: (tmdbId: number) => string;
  tvUrl: (tmdbId: number, season: number, episode: number) => string;
};

const SOURCES: SourceDefinition[] = [
  {
    id: 'vidlink',
    label: 'VidLink',
    movieUrl: (tmdbId) => `https://vidlink.pro/movie/${tmdbId}`,
    tvUrl: (tmdbId, season, episode) => `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}`,
  },
  {
    id: 'vidsrcTo',
    label: 'VidSrc.to',
    movieUrl: (tmdbId) => `https://vidsrc.to/embed/movie/${tmdbId}`,
    tvUrl: (tmdbId, season, episode) => `https://vidsrc.to/embed/tv/${tmdbId}/${season}/${episode}`,
  },
  {
    id: 'vidsrcSu',
    label: 'VidSrc.su',
    movieUrl: (tmdbId) => `https://vidsrc.su/embed/movie/${tmdbId}`,
    tvUrl: (tmdbId, season, episode) => `https://vidsrc.su/embed/tv/${tmdbId}/${season}/${episode}`,
  },
];

const Player: React.FC<PlayerProps> = ({ movie, onClose, apiKey }) => {
  const [season, setSeason] = useState(1);
  const [episode, setEpisode] = useState(1);
  const [tvDetails, setTvDetails] = useState<TVDetails | null>(null);
  const [sourceIndex, setSourceIndex] = useState(0);
  const [reloadToken, setReloadToken] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isIframeLoading, setIsIframeLoading] = useState(true);
  const [showRecovery, setShowRecovery] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const activeSource = SOURCES[sourceIndex];

  const closePlayer = async () => {
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen();
      }
    } catch {
      // Ignore fullscreen exit failure.
    } finally {
      onClose();
    }
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;

    try {
      if (!isFullscreen) {
        if (containerRef.current.requestFullscreen) {
          await containerRef.current.requestFullscreen();
        } else if ((containerRef.current as any).webkitRequestFullscreen) {
          await (containerRef.current as any).webkitRequestFullscreen();
        }
      } else if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        await (document as any).webkitExitFullscreen();
      }
    } catch (error) {
      console.error('Fullscreen error:', error);
    }
  };

  const switchSource = () => {
    setSourceIndex((prev) => (prev + 1) % SOURCES.length);
    setReloadToken((prev) => prev + 1);
  };

  const retryLoad = () => {
    setReloadToken((prev) => prev + 1);
  };

  const getEpisodesForSeason = () => {
    if (!tvDetails) return 24;
    const currentSeason = tvDetails.seasons.find((s) => s.season_number === season);
    return currentSeason ? currentSeason.episode_count : 24;
  };

  const handleNextEpisode = () => {
    const maxEps = getEpisodesForSeason();
    if (episode < maxEps) {
      setEpisode((prev) => prev + 1);
      return;
    }

    setSeason((prev) => prev + 1);
    setEpisode(1);
  };

  const handlePrevEpisode = () => {
    if (episode > 1) {
      setEpisode((prev) => prev - 1);
      return;
    }

    if (season > 1) {
      setSeason((prev) => prev - 1);
      setEpisode(1);
    }
  };

  const embedSrc = useMemo(() => {
    if (!movie) return 'about:blank';

    const tmdbId = movie.id;
    const isTv = movie.media_type === 'tv' || !!movie.name;
    const base = isTv
      ? activeSource.tvUrl(tmdbId, season, episode)
      : activeSource.movieUrl(tmdbId);

    const sep = base.includes('?') ? '&' : '?';
    return `${base}${sep}autoplay=true&winstonReload=${reloadToken}`;
  }, [movie, activeSource, season, episode, reloadToken]);

  const openInNewTab = () => {
    window.open(embedSrc, '_blank', 'noopener,noreferrer');
  };

  useEffect(() => {
    if (!movie) return;

    setSeason(1);
    setEpisode(1);
    setTvDetails(null);
    setSourceIndex(0);
    setReloadToken(0);
    setIsIframeLoading(true);
    setShowRecovery(false);
  }, [movie?.id]);

  useEffect(() => {
    const doc = document.documentElement;
    const body = document.body;
    const originalHtmlOverflow = doc.style.overflow;
    const originalBodyOverflow = body.style.overflow;
    const originalBodyHeight = body.style.height;

    doc.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    body.style.height = '100vh';

    return () => {
      doc.style.overflow = originalHtmlOverflow;
      body.style.overflow = originalBodyOverflow;
      body.style.height = originalBodyHeight;
    };
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => {
      const active = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      setIsFullscreen(active);
    };

    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);
    document.addEventListener('mozfullscreenchange', onFullscreenChange);
    document.addEventListener('MSFullscreenChange', onFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
      document.removeEventListener('mozfullscreenchange', onFullscreenChange);
      document.removeEventListener('MSFullscreenChange', onFullscreenChange);
    };
  }, []);

  useEffect(() => {
    if (!movie) return;
    document.title = `Watch: ${movie.title || movie.name}`;
  }, [movie]);

  useEffect(() => {
    setIsIframeLoading(true);
    setShowRecovery(false);
  }, [embedSrc]);

  useEffect(() => {
    if (!isIframeLoading) return;

    const timer = window.setTimeout(() => {
      setShowRecovery(true);
    }, 10000);

    return () => window.clearTimeout(timer);
  }, [embedSrc, isIframeLoading]);

  useEffect(() => {
    const frame = iframeRef.current;
    if (!frame) return;

    frame.setAttribute('allowfullscreen', 'true');
    frame.setAttribute('webkitallowfullscreen', 'true');
    frame.setAttribute('mozallowfullscreen', 'true');
  }, [embedSrc]);

  useEffect(() => {
    if (!movie) return;
    if (!(movie.media_type === 'tv' || movie.name) || !apiKey) return;

    let cancelled = false;

    const loadDetails = async () => {
      try {
        const details = await getTVDetails(movie.id, apiKey);
        if (cancelled) return;

        setTvDetails(details);

        if (details?.seasons?.length && !details.seasons.find((s) => s.season_number === 1)) {
          const firstSeason = details.seasons.find((s) => s.season_number > 0) || details.seasons[0];
          if (firstSeason) setSeason(firstSeason.season_number);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load TV details', error);
        }
      }
    };

    void loadDetails();

    return () => {
      cancelled = true;
    };
  }, [movie, apiKey]);

  if (!movie) return null;

  const isTv = movie.media_type === 'tv' || !!movie.name;
  const title = movie.title || movie.name;

  return createPortal(
    <div
      ref={containerRef}
      className="fixed inset-0 z-[9999] bg-black flex flex-col w-screen h-screen overflow-hidden animate-in fade-in duration-300"
    >
      <div
        className={`flex-none bg-zinc-950 border-b border-zinc-800 p-4 relative z-20 shadow-lg transition-opacity duration-300 ${
          isFullscreen ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        <div className="mx-auto max-w-[1920px] flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
          <div className="flex items-center gap-4 w-full xl:w-auto">
            <button
              onClick={closePlayer}
              className="flex-shrink-0 rounded-full bg-zinc-800 p-2 hover:bg-zinc-700 hover:text-white text-zinc-400 transition"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex flex-col">
              <h2 className="text-sm md:text-lg font-bold text-white truncate leading-tight">{title}</h2>
              {isTv && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] md:text-xs font-medium text-zinc-400">S{season} E{episode}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto justify-start xl:justify-end">
            {isTv && (
              <div className="flex items-center gap-2 bg-zinc-900/50 p-1 rounded-lg border border-zinc-800/50">
                <button
                  onClick={handlePrevEpisode}
                  disabled={season === 1 && episode === 1}
                  className="p-2 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-white transition disabled:opacity-50 disabled:hover:bg-transparent"
                  title="Previous Episode"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <div className="relative group">
                  <div className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                    <Layers className="h-3 w-3" />
                  </div>
                  <select
                    value={season}
                    onChange={(e) => {
                      setSeason(Number(e.target.value));
                      setEpisode(1);
                    }}
                    className="appearance-none bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-bold rounded-md pl-8 pr-8 py-1.5 focus:outline-none focus:border-zinc-600 focus:text-white transition cursor-pointer hover:bg-zinc-800 w-24 md:w-32"
                  >
                    {tvDetails?.seasons?.filter((s) => s.season_number > 0).map((s) => (
                      <option key={s.id} value={s.season_number} className="bg-zinc-900 text-white">
                        Season {s.season_number}
                      </option>
                    ))}
                    {!tvDetails && <option value="1">Season 1</option>}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-500 pointer-events-none" />
                </div>

                <div className="relative group">
                  <div className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                    <Play className="h-3 w-3" />
                  </div>
                  <select
                    value={episode}
                    onChange={(e) => setEpisode(Number(e.target.value))}
                    className="appearance-none bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-bold rounded-md pl-8 pr-8 py-1.5 focus:outline-none focus:border-zinc-600 focus:text-white transition cursor-pointer hover:bg-zinc-800 w-24 md:w-32"
                  >
                    {Array.from({ length: getEpisodesForSeason() }, (_, i) => i + 1).map((ep) => (
                      <option key={ep} value={ep} className="bg-zinc-900 text-white">
                        Episode {ep}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-500 pointer-events-none" />
                </div>

                <button
                  onClick={handleNextEpisode}
                  className="p-2 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
                  title="Next Episode"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}

            <button
              onClick={switchSource}
              className="rounded-md bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs font-semibold px-3 py-2 hover:bg-zinc-800 transition"
              title="Switch player source"
            >
              Source: {activeSource.label}
            </button>

            <button
              onClick={retryLoad}
              className="rounded-md bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs font-semibold px-3 py-2 hover:bg-zinc-800 transition inline-flex items-center gap-1.5"
              title="Reload player"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reload
            </button>

            <button
              onClick={openInNewTab}
              className="rounded-md bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs font-semibold px-3 py-2 hover:bg-zinc-800 transition inline-flex items-center gap-1.5"
              title="Open current source in a new tab"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open Tab
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 relative bg-black w-full h-full overflow-hidden group/video">
        {isIframeLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-0">
            <div className="h-10 w-10 border-4 border-zinc-800 border-t-red-600 rounded-full animate-spin" />
          </div>
        )}

        <button
          onClick={toggleFullscreen}
          className="absolute bottom-8 right-8 z-50 p-3 rounded-full bg-zinc-900/90 border border-zinc-700/50 text-zinc-400 hover:text-white hover:bg-zinc-800 hover:scale-110 active:scale-95 transition-all duration-300 shadow-xl backdrop-blur-sm group-hover/video:opacity-100 md:opacity-0 md:group-hover/video:opacity-100"
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        >
          {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
        </button>

        <iframe
          ref={iframeRef}
          key={`${movie.id}-${season}-${episode}-${sourceIndex}-${reloadToken}`}
          src={embedSrc}
          className="absolute inset-0 w-full h-full border-0 z-10"
          allowFullScreen
          allow="autoplay; fullscreen *; picture-in-picture; encrypted-media"
          referrerPolicy="origin-when-cross-origin"
          title={`Watch ${title}`}
          onLoad={() => {
            setIsIframeLoading(false);
            setShowRecovery(false);
          }}
        />

        {showRecovery && (
          <div className="absolute inset-x-0 bottom-3 z-30 flex justify-center px-3">
            <div className="rounded-lg border border-zinc-700 bg-zinc-900/90 px-3 py-2 text-xs text-zinc-200 flex items-center gap-3">
              <span>Player taking too long.</span>
              <button onClick={retryLoad} className="rounded-md bg-zinc-800 hover:bg-zinc-700 px-2.5 py-1 transition">
                Reload
              </button>
              <button onClick={switchSource} className="rounded-md bg-zinc-800 hover:bg-zinc-700 px-2.5 py-1 transition">
                Switch Source
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default Player;

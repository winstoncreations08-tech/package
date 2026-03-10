import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Movie, TVDetails } from '../types';
import { X, ChevronDown, MonitorPlay, ChevronRight, ChevronLeft, Layers, Play, Maximize, Minimize } from 'lucide-react';
import { getTVDetails } from '../services/tmdb';
import { initProxyWorker, toProxyUrl } from '../services/proxy';

interface PlayerProps {
  movie: Movie | null;
  onClose: () => void;
  apiKey: string;
}

type ServerOption = 'vidlink' | 'vidsrc';

const Player: React.FC<PlayerProps> = ({ movie, onClose, apiKey }) => {
  // --- STATE ---
  const [server, setServer] = useState<ServerOption>('vidlink');
  const [season, setSeason] = useState(1);
  const [episode, setEpisode] = useState(1);
  const [tvDetails, setTvDetails] = useState<TVDetails | null>(null);
  const [iframeKey, setIframeKey] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [proxyReady, setProxyReady] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // --- SCROLL LOCK ---
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

  // --- FULLSCREEN DETECTION ---
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      setIsFullscreen(isCurrentlyFullscreen);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  // --- TITLE UPDATE ---
  useEffect(() => {
    if (movie) {
      const title = movie.title || movie.name;
      document.title = `Watch: ${title}`;
    }
  }, [movie]);

  // --- FORCE IFRAME RELOAD ON SERVER CHANGE ---
  useEffect(() => {
    setIframeKey(prev => prev + 1);
  }, [server, season, episode, movie?.id, proxyReady]);

  useEffect(() => {
    let isMounted = true;
    initProxyWorker().finally(() => {
      if (isMounted) setProxyReady(true);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const frame = iframeRef.current;
    if (!frame) return;

    // Cross-browser fullscreen hints for embedded providers.
    frame.setAttribute('allowfullscreen', 'true');
    frame.setAttribute('webkitallowfullscreen', 'true');
    frame.setAttribute('mozallowfullscreen', 'true');
  }, [iframeKey]);

  // --- TV DETAILS ---
  useEffect(() => {
    if ((movie?.media_type === 'tv' || movie?.name) && apiKey) {
      const loadDetails = async () => {
        try {
          const details = await getTVDetails(movie.id, apiKey);
          setTvDetails(details);
          if (details?.seasons?.length && !details.seasons.find(s => s.season_number === 1)) {
            const firstSeason = details.seasons.find(s => s.season_number > 0) || details.seasons[0];
            if (firstSeason) setSeason(firstSeason.season_number);
          }
        } catch (e) {
          console.error("Failed to load TV details", e);
        }
      };
      loadDetails();
    }
  }, [movie, apiKey]);

  // --- HANDLERS ---
  const handleNextEpisode = () => {
    const maxEps = getEpisodesForSeason();
    if (episode < maxEps) {
      setEpisode(episode + 1);
    } else {
      setSeason(season + 1);
      setEpisode(1);
    }
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;

    try {
      if (!isFullscreen) {
        // Enter fullscreen
        if (containerRef.current.requestFullscreen) {
          await containerRef.current.requestFullscreen();
        } else if ((containerRef.current as any).webkitRequestFullscreen) {
          await (containerRef.current as any).webkitRequestFullscreen();
        } else if ((containerRef.current as any).mozRequestFullScreen) {
          await (containerRef.current as any).mozRequestFullScreen();
        } else if ((containerRef.current as any).msRequestFullscreen) {
          await (containerRef.current as any).msRequestFullscreen();
        }
      } else {
        // Exit fullscreen
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        } else if ((document as any).mozCancelFullScreen) {
          await (document as any).mozCancelFullScreen();
        } else if ((document as any).msExitFullscreen) {
          await (document as any).msExitFullscreen();
        }
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  };

  const handlePrevEpisode = () => {
    if (episode > 1) {
      setEpisode(episode - 1);
    } else if (season > 1) {
      setSeason(season - 1);
      setEpisode(1);
    }
  };

  const getEpisodesForSeason = () => {
    if (!tvDetails) return 24;
    const currentSeason = tvDetails.seasons.find(s => s.season_number === season);
    return currentSeason ? currentSeason.episode_count : 24;
  };

  if (!movie) return null;

  const isTv = movie.media_type === 'tv' || !!movie.name;
  const title = movie.title || movie.name;

  // --- EMBED URL LOGIC ---
  const getEmbedUrl = () => {
    const tmdbId = movie.id;
    
    switch (server) {
      case 'vidlink':
        return isTv
          ? `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}`
          : `https://vidlink.pro/movie/${tmdbId}`;
        
      case 'vidsrc':
        return isTv
          ? `https://vidsrc.cc/v2/embed/tv/${tmdbId}/${season}/${episode}`
          : `https://vidsrc.cc/v2/embed/movie/${tmdbId}`;
      
      default:
        return isTv
          ? `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}`
          : `https://vidlink.pro/movie/${tmdbId}`;
    }
  };

  const embedSrc = proxyReady ? toProxyUrl(getEmbedUrl()) : 'about:blank';

  return createPortal(
    <div 
      ref={containerRef}
      className="fixed inset-0 z-[9999] bg-black flex flex-col w-screen h-screen overflow-hidden animate-in fade-in duration-300"
    >
      
      {/* --- HEADER CONTROLS (Hidden during fullscreen) --- */}
      <div 
        className={`flex-none bg-zinc-950 border-b border-zinc-800 p-4 relative z-20 shadow-lg transition-opacity duration-300 ${
          isFullscreen ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        <div className="mx-auto max-w-[1920px] flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
            
          {/* Left: Close & Title */}
          <div className="flex items-center gap-4 w-full xl:w-auto">
            <button 
              onClick={onClose}
              className="flex-shrink-0 rounded-full bg-zinc-800 p-2 hover:bg-zinc-700 hover:text-white text-zinc-400 transition"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex flex-col">
              <h2 className="text-sm md:text-lg font-bold text-white truncate leading-tight">{title}</h2>
              {isTv && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] md:text-xs font-medium text-zinc-400">
                    S{season} E{episode}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right: Controls */}
          <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto justify-start xl:justify-end">
            
            {/* --- TV NAV --- */}
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

                {/* Season Select */}
                <div className="relative group">
                  <div className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                    <Layers className="h-3 w-3" />
                  </div>
                  <select 
                    value={season}
                    onChange={(e) => { setSeason(Number(e.target.value)); setEpisode(1); }}
                    className="appearance-none bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-bold rounded-md pl-8 pr-8 py-1.5 focus:outline-none focus:border-zinc-600 focus:text-white transition cursor-pointer hover:bg-zinc-800 w-24 md:w-32"
                  >
                    {tvDetails?.seasons?.filter(s => s.season_number > 0).map(s => (
                      <option key={s.id} value={s.season_number} className="bg-zinc-900 text-white">
                        Season {s.season_number}
                      </option>
                    ))}
                    {!tvDetails && <option value="1" className="bg-zinc-900">Season 1</option>}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-500 pointer-events-none group-hover:text-zinc-300" />
                </div>

                {/* Episode Select */}
                <div className="relative group">
                  <div className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                    <Play className="h-3 w-3" />
                  </div>
                  <select 
                    value={episode}
                    onChange={(e) => setEpisode(Number(e.target.value))}
                    className="appearance-none bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-bold rounded-md pl-8 pr-8 py-1.5 focus:outline-none focus:border-zinc-600 focus:text-white transition cursor-pointer hover:bg-zinc-800 w-24 md:w-32"
                  >
                    {Array.from({ length: getEpisodesForSeason() }, (_, i) => i + 1).map(ep => (
                      <option key={ep} value={ep} className="bg-zinc-900 text-white">
                        Episode {ep}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-500 pointer-events-none group-hover:text-zinc-300" />
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

            {/* Server Select */}
            <div className="relative group">
              <div className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                <MonitorPlay className="h-3.5 w-3.5" />
              </div>
              <select 
                value={server}
                onChange={(e) => setServer(e.target.value as ServerOption)}
                className="appearance-none bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-bold rounded-md pl-8 pr-8 py-2 focus:outline-none focus:border-zinc-600 focus:text-white transition cursor-pointer hover:bg-zinc-800 min-w-[120px]"
              >
                <option value="vidlink" className="bg-zinc-900">VidLink</option>
                <option value="vidsrc" className="bg-zinc-900">VidSrc.cc</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-500 pointer-events-none group-hover:text-zinc-300" />
            </div>
          </div>
        </div>
      </div>

      {/* --- VIDEO CONTAINER --- */}
      <div className="flex-1 relative bg-black w-full h-full overflow-hidden group/video">
        
        {/* Loading Spinner */}
        <div className="absolute inset-0 flex items-center justify-center z-0">
          <div className="h-10 w-10 border-4 border-zinc-800 border-t-red-600 rounded-full animate-spin"></div>
        </div>

        {/* Floating Fullscreen Button */}
        <button 
            onClick={toggleFullscreen}
            className="absolute bottom-8 right-8 z-50 p-3 rounded-full bg-zinc-900/90 border border-zinc-700/50 text-zinc-400 hover:text-white hover:bg-zinc-800 hover:scale-110 active:scale-95 transition-all duration-300 shadow-xl backdrop-blur-sm group-hover/video:opacity-100 md:opacity-0 md:group-hover/video:opacity-100"
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
        >
            {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
        </button>

        <iframe
          ref={iframeRef}
          key={iframeKey}
          src={embedSrc}
          className="absolute inset-0 w-full h-full border-0 z-10"
          allowFullScreen
          allow="autoplay; fullscreen *; picture-in-picture; encrypted-media; accelerometer; gyroscope; clipboard-write"
          sandbox="allow-scripts allow-same-origin allow-forms allow-presentation allow-pointer-lock"
          referrerPolicy="origin-when-cross-origin"
          title={`Watch ${title}`}
        />
      </div>

    </div>,
    document.body
  );
};

export default Player;

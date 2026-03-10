import React, { useState, useEffect, useCallback, useRef } from 'react';
import MovieCard from './MovieCard';
import Player from './Player';
import SettingsModal from './SettingsModal';
import { Movie, Settings, MediaType, SortOption, Genre, GenreFilter } from '../types';
import { discoverByProvider, discoverMedia, getGenres, getTrendingMedia, searchMovies } from '../services/tmdb';
import { Loader2, Settings as SettingsIcon, Search, ChevronDown, Home, Play } from 'lucide-react';

const TMDB_STORAGE_KEY = 'redstream_tmdb_key';
const DEFAULT_API_KEY = '0dd07605b5de27e35ab3e0a14d5854db';

interface MovieAppProps {
  onBack: () => void;
}

interface ProviderConfig {
  key: string;
  name: string;
  providerId: number;
  accentClass: string;
}

interface ProviderRail extends ProviderConfig {
  items: Movie[];
}

const STREAMING_PROVIDER_CONFIG: ProviderConfig[] = [
  { key: 'netflix', name: 'Popular on Netflix', providerId: 8, accentClass: 'from-red-600/30' },
  { key: 'hulu', name: 'Popular on Hulu', providerId: 15, accentClass: 'from-green-500/30' },
  { key: 'disney', name: 'Popular on Disney+', providerId: 337, accentClass: 'from-blue-500/30' },
  { key: 'apple', name: 'Popular on Apple TV+', providerId: 350, accentClass: 'from-zinc-400/30' },
  { key: 'prime', name: 'Popular on Prime Video', providerId: 9, accentClass: 'from-cyan-500/30' },
  { key: 'max', name: 'Popular on Max', providerId: 1899, accentClass: 'from-purple-500/30' },
];

const getTitle = (movie: Movie) => movie.title || movie.name || 'Untitled';
const getYear = (movie: Movie) => (movie.release_date || movie.first_air_date || '').split('-')[0];
const getHeroImage = (movie: Movie | null) => {
  if (!movie) return '';
  if (movie.backdrop_path) {
    return `https://wsrv.nl/?url=image.tmdb.org/t/p/w1280${movie.backdrop_path}&w=1600&output=webp`;
  }
  if (movie.poster_path) {
    return `https://wsrv.nl/?url=image.tmdb.org/t/p/w780${movie.poster_path}&w=1200&output=webp`;
  }
  return '';
};

const MovieApp: React.FC<MovieAppProps> = ({ onBack }) => {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [mediaType, setMediaType] = useState<MediaType>('all');
  const [sortBy, setSortBy] = useState<SortOption>('popularity.desc');
  const [selectedGenreVal, setSelectedGenreVal] = useState<string | number>('');
  const [availableGenres, setAvailableGenres] = useState<Genre[]>([]);
  const [genreMap, setGenreMap] = useState<Record<string, { movie?: number; tv?: number }>>({});
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [providerRails, setProviderRails] = useState<ProviderRail[]>([]);
  const [featuredMovie, setFeaturedMovie] = useState<Movie | null>(null);
  const [providerLoading, setProviderLoading] = useState(false);
  const [settings, setSettings] = useState<Settings>(() => ({
    tmdbApiKey: localStorage.getItem(TMDB_STORAGE_KEY) || DEFAULT_API_KEY,
  }));

  const isSearching = debouncedSearch.trim().length > 0;

  useEffect(() => {
    document.body.style.overflow = 'auto';
    document.body.style.height = 'auto';
    document.documentElement.style.overflow = 'auto';
    document.documentElement.style.height = 'auto';
    return () => {
      document.body.style.overflow = '';
      document.body.style.height = '';
      document.documentElement.style.overflow = '';
      document.documentElement.style.height = '';
    };
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(searchQuery), 450);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    if (!selectedMovie) {
      document.title = 'WinstonStreams';
    }
  }, [debouncedSearch, selectedMovie]);

  const observer = useRef<IntersectionObserver | null>(null);
  const lastMovieElementRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (loading) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasMore) setPage((prevPage) => prevPage + 1);
        },
        { rootMargin: '400px', threshold: 0 }
      );
      if (node) observer.current.observe(node);
    },
    [loading, hasMore]
  );

  useEffect(() => {
    const loadGenres = async () => {
      if (!settings.tmdbApiKey) return;
      try {
        if (mediaType === 'all') {
          const [mGenres, tGenres] = await Promise.all([
            getGenres('movie', settings.tmdbApiKey),
            getGenres('tv', settings.tmdbApiKey),
          ]);
          const map: Record<string, { movie?: number; tv?: number }> = {};
          mGenres.forEach((g) => {
            map[g.name] = { movie: g.id };
          });
          const tvMappings: Record<string, string[]> = {
            'Action & Adventure': ['Action', 'Adventure'],
            'Sci-Fi & Fantasy': ['Science Fiction', 'Fantasy'],
            'War & Politics': ['War'],
          };
          tGenres.forEach((g) => {
            const mappedTargets = tvMappings[g.name];
            if (mappedTargets) {
              mappedTargets.forEach((targetName) => {
                if (map[targetName]) map[targetName].tv = g.id;
              });
            } else {
              if (!map[g.name]) map[g.name] = {};
              map[g.name].tv = g.id;
            }
          });
          setGenreMap(map);
          setAvailableGenres(Object.keys(map).sort().map((name, i) => ({ id: i, name })));
        } else {
          const genres = await getGenres(mediaType, settings.tmdbApiKey);
          setAvailableGenres(genres);
          setGenreMap({});
        }
      } catch (e) {
        console.error('Failed to load genres', e);
      }
    };
    loadGenres();
  }, [mediaType, settings.tmdbApiKey]);

  useEffect(() => {
    setPage(1);
    setMovies([]);
    setHasMore(true);
    setRefreshKey((k) => k + 1);
  }, [debouncedSearch, mediaType, sortBy, selectedGenreVal, settings.tmdbApiKey]);

  useEffect(() => {
    if (!settings.tmdbApiKey) return;
    const controller = new AbortController();

    const fetchCatalog = async () => {
      setLoading(true);
      try {
        let newMovies: Movie[] = [];

        if (isSearching) {
          newMovies = await searchMovies(debouncedSearch, page, settings.tmdbApiKey);
        } else {
          let genreFilter: GenreFilter | null = null;
          if (selectedGenreVal) {
            if (mediaType === 'all' && typeof selectedGenreVal === 'string') {
              const mapping = genreMap[selectedGenreVal];
              if (mapping) genreFilter = mapping;
            } else if (typeof selectedGenreVal === 'number') {
              genreFilter = selectedGenreVal;
            }
          }
          newMovies = await discoverMedia(mediaType, sortBy, genreFilter, page, settings.tmdbApiKey);
        }

        if (controller.signal.aborted) return;

        if (newMovies.length === 0) {
          setHasMore(false);
        } else {
          setMovies((prev) => {
            const currentList = page === 1 ? [] : prev;
            const existingIds = new Set(currentList.map((m) => `${m.media_type || 'movie'}-${m.id}`));
            const uniqueNew = newMovies.filter((m) => !existingIds.has(`${m.media_type || 'movie'}-${m.id}`));
            return [...currentList, ...uniqueNew];
          });
          if (newMovies.length < 20) setHasMore(false);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('Error fetching catalog:', error);
          if (page === 1) setHasMore(false);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    fetchCatalog();
    return () => controller.abort();
  }, [page, refreshKey, settings.tmdbApiKey, isSearching, debouncedSearch, mediaType, sortBy, selectedGenreVal, genreMap]);

  useEffect(() => {
    if (!settings.tmdbApiKey || isSearching) {
      setProviderRails([]);
      setFeaturedMovie(null);
      setProviderLoading(false);
      return;
    }

    let cancelled = false;

    const loadStreamingRows = async () => {
      setProviderLoading(true);
      try {
        const [trending, ...providerResults] = await Promise.all([
          getTrendingMedia('all', settings.tmdbApiKey, 'week'),
          ...STREAMING_PROVIDER_CONFIG.map((provider) => discoverByProvider('all', provider.providerId, settings.tmdbApiKey, 1)),
        ]);

        if (cancelled) return;

        const firstHero = trending.find((m) => !!m.backdrop_path) || trending[0] || null;
        setFeaturedMovie(firstHero);

        const rows: ProviderRail[] = STREAMING_PROVIDER_CONFIG.map((provider, index) => {
          const deduped = (providerResults[index] || []).filter((item, i, arr) => {
            const key = `${item.media_type || 'movie'}-${item.id}`;
            return i === arr.findIndex((x) => `${x.media_type || 'movie'}-${x.id}` === key);
          });

          return {
            ...provider,
            items: deduped.slice(0, 18),
          };
        }).filter((row) => row.items.length > 0);

        setProviderRails(rows);
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load streaming rows:', error);
          setProviderRails([]);
          setFeaturedMovie(null);
        }
      } finally {
        if (!cancelled) setProviderLoading(false);
      }
    };

    loadStreamingRows();

    return () => {
      cancelled = true;
    };
  }, [settings.tmdbApiKey, isSearching]);

  const handleMovieClick = (movie: Movie) => setSelectedMovie(movie);
  const handleClosePlayer = () => setSelectedMovie(null);
  const handleSaveSettings = (newSettings: Settings) => {
    setSettings(newSettings);
    if (newSettings.tmdbApiKey) localStorage.setItem(TMDB_STORAGE_KEY, newSettings.tmdbApiKey);
    else localStorage.removeItem(TMDB_STORAGE_KEY);
  };

  const getBrowseLabel = () => {
    let sortLabel = 'Trending';
    if (sortBy === 'vote_average.desc') sortLabel = 'Top Rated';
    if (sortBy === 'primary_release_date.desc') sortLabel = 'Newest';

    let genreLabel = '';
    if (selectedGenreVal) {
      if (typeof selectedGenreVal === 'string') genreLabel = selectedGenreVal;
      else genreLabel = availableGenres.find((g) => g.id === selectedGenreVal)?.name || '';
    }

    const mediaLabel = mediaType === 'movie' ? 'Movies' : mediaType === 'tv' ? 'TV Shows' : 'Movies & TV';
    return [sortLabel, genreLabel, mediaLabel].filter(Boolean).join(' • ');
  };

  return (
    <div className="min-h-screen w-full bg-black text-white overflow-y-auto overflow-x-hidden selection:bg-red-600 selection:text-white animate-in fade-in duration-500">
      <div className="fixed top-0 left-0 right-0 p-4 md:p-6 z-50 flex justify-between items-center pointer-events-none bg-gradient-to-b from-black/90 to-transparent">
        <button
          onClick={onBack}
          className="group pointer-events-auto relative rounded-full bg-zinc-900/50 p-2 md:p-3 hover:bg-zinc-800 transition backdrop-blur-md flex items-center gap-2 pr-4 border border-white/10"
        >
          <Home className="h-4 w-4 md:h-5 md:w-5 text-zinc-400 group-hover:text-white transition" />
          <span className="text-xs md:text-sm font-medium text-zinc-400 group-hover:text-white transition hidden sm:inline">Launcher</span>
        </button>
        <button
          onClick={() => setShowSettings(true)}
          className="group pointer-events-auto relative rounded-full bg-zinc-900/50 p-2 md:p-3 hover:bg-zinc-800 transition backdrop-blur-md border border-white/10"
        >
          <SettingsIcon className="h-5 w-5 md:h-6 md:w-6 text-zinc-400 group-hover:text-white transition-transform group-hover:rotate-90" />
        </button>
      </div>

      <div className="w-full max-w-[1380px] mx-auto px-4 md:px-8 pb-16 pt-24 md:pt-28 space-y-8">
        <section className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 backdrop-blur-sm p-4 md:p-6">
          <div className="flex flex-col gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-red-500 via-red-400 to-zinc-200">WinstonStreams</h1>
              <p className="text-zinc-500 text-sm md:text-base mt-1">Your all-in-one streaming dashboard.</p>
            </div>

            <div className="relative w-full">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-zinc-500" />
              </div>
              <input
                type="text"
                placeholder="Search for movies, TV shows, or actors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl bg-zinc-900 border border-zinc-800 py-3 pl-12 pr-5 text-base text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition"
              />
            </div>
          </div>
        </section>

        {!isSearching && featuredMovie && (
          <section className="relative overflow-hidden rounded-2xl border border-zinc-800 min-h-[340px] md:min-h-[420px]">
            {getHeroImage(featuredMovie) && (
              <img
                src={getHeroImage(featuredMovie)}
                alt={getTitle(featuredMovie)}
                className="absolute inset-0 h-full w-full object-cover"
                loading="eager"
                decoding="async"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/75 to-black/30" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />

            <div className="relative z-10 h-full p-6 md:p-10 flex items-end">
              <div className="max-w-2xl space-y-4">
                <p className="text-xs uppercase tracking-[0.2em] text-red-300">Featured This Week</p>
                <h2 className="text-3xl md:text-5xl font-black leading-tight text-white">{getTitle(featuredMovie)}</h2>
                <p className="text-zinc-300 text-sm md:text-base line-clamp-3">{featuredMovie.overview || 'Top trending right now.'}</p>
                <div className="flex items-center gap-3 text-xs md:text-sm text-zinc-400">
                  <span>{getYear(featuredMovie) || 'Now Streaming'}</span>
                  <span>•</span>
                  <span>{featuredMovie.media_type === 'tv' ? 'TV Series' : 'Movie'}</span>
                  {featuredMovie.vote_average > 0 && (
                    <>
                      <span>•</span>
                      <span>{featuredMovie.vote_average.toFixed(1)} Rating</span>
                    </>
                  )}
                </div>
                <button
                  onClick={() => handleMovieClick(featuredMovie)}
                  className="inline-flex items-center gap-2 rounded-full bg-white text-black px-5 py-2.5 font-semibold hover:bg-zinc-200 transition"
                >
                  <Play className="h-4 w-4 fill-black" />
                  Watch Now
                </button>
              </div>
            </div>
          </section>
        )}

        {!isSearching && (
          <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 md:p-5">
            <div className="flex flex-wrap items-center gap-3 md:gap-4">
              <div className="relative group">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="appearance-none bg-zinc-900 text-white pl-4 pr-10 py-2.5 rounded-lg text-sm font-medium border border-zinc-700 hover:border-zinc-500 focus:ring-2 focus:ring-red-600 focus:outline-none transition cursor-pointer"
                >
                  <option value="popularity.desc">Trending</option>
                  <option value="vote_average.desc">Top Rated</option>
                  <option value="primary_release_date.desc">Newest</option>
                </select>
                <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-zinc-400 pointer-events-none" />
              </div>

              <div className="relative group">
                <select
                  value={mediaType}
                  onChange={(e) => setMediaType(e.target.value as MediaType)}
                  className="appearance-none bg-zinc-900 text-white pl-4 pr-10 py-2.5 rounded-lg text-sm font-medium border border-zinc-700 hover:border-zinc-500 focus:ring-2 focus:ring-red-600 focus:outline-none transition cursor-pointer"
                >
                  <option value="all">All Types</option>
                  <option value="movie">Movies</option>
                  <option value="tv">TV Shows</option>
                </select>
                <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-zinc-400 pointer-events-none" />
              </div>

              <div className="relative group min-w-[190px]">
                <select
                  value={selectedGenreVal}
                  onChange={(e) => {
                    const val = e.target.value;
                    mediaType === 'all' ? setSelectedGenreVal(val) : setSelectedGenreVal(val ? Number(val) : '');
                  }}
                  className="w-full appearance-none bg-zinc-900 text-white pl-4 pr-10 py-2.5 rounded-lg text-sm font-medium border border-zinc-700 hover:border-zinc-500 focus:ring-2 focus:ring-red-600 focus:outline-none transition cursor-pointer"
                >
                  <option value="">All Genres</option>
                  {availableGenres.map((g) => (
                    <option key={g.id} value={mediaType === 'all' ? g.name : g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-zinc-400 pointer-events-none" />
              </div>

              <span className="text-xs md:text-sm text-zinc-400 md:ml-auto">{getBrowseLabel()}</span>
            </div>
          </section>
        )}

        {!isSearching && providerLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-red-500" />
          </div>
        )}

        {!isSearching && providerRails.map((row) => (
          <section key={row.key} className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xl md:text-2xl font-bold text-white">{row.name}</h3>
              <div className={`h-px flex-1 bg-gradient-to-r ${row.accentClass} to-transparent`} />
            </div>

            <div className="flex gap-3 md:gap-4 overflow-x-auto pb-2 no-scrollbar">
              {row.items.map((movie) => (
                <div key={`${row.key}-${movie.media_type || 'movie'}-${movie.id}`} className="w-[145px] sm:w-[160px] md:w-[180px] shrink-0">
                  <MovieCard movie={movie} onClick={handleMovieClick} />
                </div>
              ))}
            </div>
          </section>
        ))}

        <section className="space-y-4">
          <h3 className="text-2xl md:text-3xl font-bold text-white">
            {isSearching ? `Results for "${debouncedSearch}"` : 'Browse Catalog'}
          </h3>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 pb-8">
            {movies.map((movie, index) => {
              const isLast = movies.length === index + 1;
              return (
                <div ref={isLast ? lastMovieElementRef : null} key={`${movie.media_type || 'movie'}-${movie.id}-${index}`} className="relative">
                  <MovieCard movie={movie} onClick={handleMovieClick} />
                </div>
              );
            })}
          </div>

          {loading && (
            <div className="flex w-full items-center justify-center py-8">
              <Loader2 className="h-10 w-10 animate-spin text-red-600" />
            </div>
          )}

          {!loading && movies.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-500 text-center px-4">
              {isSearching ? (
                <p>No results for "{debouncedSearch}"</p>
              ) : !settings.tmdbApiKey ? (
                <p>Enter your TMDB key in Settings.</p>
              ) : (
                <p>No titles found for the selected filters.</p>
              )}
            </div>
          )}
        </section>
      </div>

      {selectedMovie && <Player movie={selectedMovie} onClose={handleClosePlayer} apiKey={settings.tmdbApiKey} />}
      {showSettings && <SettingsModal settings={settings} onSave={handleSaveSettings} onClose={() => setShowSettings(false)} />}
    </div>
  );
};

export default MovieApp;

import React, { useState, useEffect, useCallback, useRef } from 'react';
import MovieCard from './MovieCard';
import Player from './Player';
import SettingsModal from './SettingsModal';
import { Movie, Settings, MediaType, SortOption, Genre, GenreFilter } from '../types';
import { discoverByProvider, discoverMedia, getGenres, getTrendingMedia, searchMovies } from '../services/tmdb';
import { Loader2, Settings as SettingsIcon, Search, ChevronDown, Play } from 'lucide-react';

const TMDB_STORAGE_KEY = 'redstream_tmdb_key';
const DEFAULT_API_KEY = '0dd07605b5de27e35ab3e0a14d5854db';

interface MovieAppProps {
}

interface ProviderConfig {
  key: string;
  name: string;
  providerId: number;
  accentClass: string;
  iconUrl?: string;
}

interface ProviderRail extends ProviderConfig {
  items: Movie[];
}

const STREAMING_PROVIDER_CONFIG: ProviderConfig[] = [
  { key: 'netflix', name: 'Netflix', providerId: 8, accentClass: 'from-red-600/30', iconUrl: 'https://www.google.com/s2/favicons?sz=128&domain=netflix.com' },
  { key: 'hulu', name: 'Hulu', providerId: 15, accentClass: 'from-green-500/30', iconUrl: 'https://www.google.com/s2/favicons?sz=128&domain=hulu.com' },
  { key: 'disney', name: 'Disney+', providerId: 337, accentClass: 'from-blue-500/30', iconUrl: 'https://www.google.com/s2/favicons?sz=128&domain=disneyplus.com' },
  { key: 'apple', name: 'Apple TV+', providerId: 350, accentClass: 'from-zinc-400/30', iconUrl: 'https://www.google.com/s2/favicons?sz=128&domain=apple.com' },
  { key: 'prime', name: 'Prime Video', providerId: 9, accentClass: 'from-cyan-500/30', iconUrl: 'https://www.google.com/s2/favicons?sz=128&domain=amazon.com' },
  { key: 'max', name: 'Max', providerId: 1899, accentClass: 'from-purple-500/30', iconUrl: 'https://www.google.com/s2/favicons?sz=128&domain=max.com' },
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

const MovieApp: React.FC<MovieAppProps> = () => {
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
  const [featuredMovies, setFeaturedMovies] = useState<Array<{ movie: Movie; provider: ProviderConfig | null }>>([]);
  const [featuredIndex, setFeaturedIndex] = useState(0);
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
    // Player handles its own title when open
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
      setFeaturedMovies([]);
      setProviderLoading(false);
      return;
    }

    let cancelled = false;

    const loadStreamingRows = async () => {
      setProviderLoading(true);
      try {
        let genreFilter: GenreFilter | null = null;
        if (selectedGenreVal) {
          if (mediaType === 'all' && typeof selectedGenreVal === 'string') {
            const mapping = genreMap[selectedGenreVal];
            if (mapping) genreFilter = mapping;
          } else if (typeof selectedGenreVal === 'number') {
            genreFilter = selectedGenreVal;
          }
        }

        const [trending, ...providerResults] = await Promise.all([
          getTrendingMedia(mediaType, settings.tmdbApiKey, 'week'),
          ...STREAMING_PROVIDER_CONFIG.map((provider) => 
            discoverByProvider(mediaType, provider.providerId, sortBy, genreFilter, settings.tmdbApiKey, 1)
          ),
        ]);

        if (cancelled) return;

        const heroes: Array<{ movie: Movie; provider: ProviderConfig | null }> = [];
        const topTrending = trending.find((m) => !!m.backdrop_path);
        if (topTrending) heroes.push({ movie: topTrending, provider: null });

        STREAMING_PROVIDER_CONFIG.forEach((provider, index) => {
          const top = providerResults[index]?.find((m) => !!m.backdrop_path);
          if (top) heroes.push({ movie: top, provider });
        });

        setFeaturedMovies(heroes);
        setFeaturedIndex(0);

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
          setFeaturedMovies([]);
        }
      } finally {
        if (!cancelled) setProviderLoading(false);
      }
    };

    loadStreamingRows();

    return () => {
      cancelled = true;
    };
  }, [settings.tmdbApiKey, isSearching, mediaType, sortBy, selectedGenreVal, genreMap]);

  useEffect(() => {
    if (featuredMovies.length <= 1) return;
    const interval = setInterval(() => {
      setFeaturedIndex((prev) => (prev + 1) % featuredMovies.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [featuredMovies.length]);

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
      <div className="w-full max-w-[1380px] mx-auto px-4 md:px-8 pb-16 pt-24 md:pt-28 space-y-8">
        <section className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 backdrop-blur-sm p-4 md:p-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-red-500 via-red-400 to-zinc-200">
                  WinstonStreams
                </h1>
                <p className="text-zinc-500 text-sm md:text-base mt-1">Your all-in-one streaming dashboard.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowSettings(true)}
                className="rounded-full border border-white/10 bg-zinc-900/60 hover:bg-zinc-800 transition backdrop-blur-md p-2.5 md:p-3 text-zinc-300 hover:text-white"
                aria-label="Open settings"
              >
                <SettingsIcon className="h-5 w-5 md:h-6 md:w-6" />
              </button>
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

        {!isSearching && featuredMovies.length > 0 && (
          <section className="relative overflow-hidden rounded-2xl border border-zinc-800 min-h-[340px] md:min-h-[420px]">
            {featuredMovies.map((hero, idx) => (
              <div
                key={`${hero.movie.id}-${idx}`}
                className={`absolute inset-0 transition-opacity duration-1000 ${
                  idx === featuredIndex ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
              >
                {getHeroImage(hero.movie) && (
                  <img
                    src={getHeroImage(hero.movie)}
                    alt={getTitle(hero.movie)}
                    className="absolute inset-0 h-full w-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-r from-black via-black/75 to-black/30" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />

                <div className="relative z-10 h-full p-6 md:p-10 flex flex-col justify-end">
                  <div className="max-w-2xl space-y-4">
                    {hero.provider ? (
                      <div className="flex items-center gap-2">
                        {hero.provider.iconUrl && (
                          <img
                            src={hero.provider.iconUrl}
                            alt={hero.provider.name}
                            className="h-6 w-6 rounded-md object-contain bg-white/10"
                            onError={(e) => (e.currentTarget.style.display = 'none')}
                          />
                        )}
                        <p className="text-xs uppercase tracking-[0.2em] font-semibold text-zinc-300">
                          {getBrowseLabel()} on {hero.provider.name}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs uppercase tracking-[0.2em] font-semibold text-zinc-300">
                        Top {getBrowseLabel()}
                      </p>
                    )}
                    <h2 className="text-3xl md:text-5xl font-black leading-tight text-white">{getTitle(hero.movie)}</h2>
                    <p className="text-zinc-300 text-sm md:text-base line-clamp-3">
                      {hero.movie.overview || 'Top trending right now.'}
                    </p>
                    <div className="flex items-center gap-3 text-xs md:text-sm text-zinc-400">
                      <span>{getYear(hero.movie) || 'Now Streaming'}</span>
                      <span>•</span>
                      <span>{hero.movie.media_type === 'tv' ? 'TV Series' : 'Movie'}</span>
                      {hero.movie.vote_average > 0 && (
                        <>
                          <span>•</span>
                          <span>{hero.movie.vote_average.toFixed(1)} Rating</span>
                        </>
                      )}
                    </div>
                    <button
                      onClick={() => handleMovieClick(hero.movie)}
                      className="inline-flex items-center gap-2 rounded-full bg-white text-black px-5 py-2.5 font-semibold hover:bg-zinc-200 transition mt-2"
                    >
                      <Play className="h-4 w-4 fill-black" />
                      Watch Now
                    </button>
                  </div>
                </div>
              </div>
            ))}

            <div className="absolute bottom-6 right-6 z-20 flex gap-2">
              {featuredMovies.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setFeaturedIndex(idx)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === featuredIndex ? 'w-6 bg-white' : 'w-2 bg-white/30 hover:bg-white/50'
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
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
              <div className="flex items-center gap-3">
                {row.iconUrl && (
                  <img
                    src={row.iconUrl}
                    alt={row.name}
                    className="h-6 w-6 md:h-8 md:w-8 rounded-md object-contain bg-white/10"
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                  />
                )}
                <h3 className="text-xl md:text-2xl font-bold text-white">
                  {getBrowseLabel()} on {row.name}
                </h3>
              </div>
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

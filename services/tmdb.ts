import { TMDBResponse, Movie, GenresResponse, Genre, TVDetails, GenreFilter } from '../types';

const BASE_URL = 'https://api.themoviedb.org/3';
const FALLBACK_V3_API_KEY = '0dd07605b5de27e35ab3e0a14d5854db';

// Helper to handle API requests safely
const fetchFromTMDB = async <T,>(
  endpoint: string,
  apiKey: string,
  params: Record<string, string> = {},
  allowFallback = true
): Promise<T | null> => {
  if (!apiKey) return null;
  
  // Sanitize the key: remove whitespace and 'Bearer ' prefix if present
  const cleanKey = apiKey.trim().replace(/^Bearer\s+/i, '');
  if (!cleanKey) return null;

  const queryParams = new URLSearchParams(params);
  
  // Heuristic: TMDB v3 keys are usually 32 hex characters. v4 tokens are long JWTs.
  // If the key is short (approx 32 chars), treat as v3 API Key (query param).
  // If the key is long, treat as v4 Read Access Token (Bearer header).
  const isV3Key = cleanKey.length < 40; 
  
  const headers: Record<string, string> = {
    accept: 'application/json',
  };

  if (isV3Key) {
    queryParams.append('api_key', cleanKey);
  } else {
    headers['Authorization'] = `Bearer ${cleanKey}`;
  }

  const url = `${BASE_URL}${endpoint}?${queryParams.toString()}`;

  try {
    const response = await fetch(url, { headers });

    if (!response.ok) {
      if (response.status === 401 && allowFallback && cleanKey !== FALLBACK_V3_API_KEY) {
        console.warn('TMDB key unauthorized, retrying with fallback key.');
        try {
          if (typeof window !== 'undefined') {
            localStorage.setItem('redstream_tmdb_key', FALLBACK_V3_API_KEY);
          }
        } catch {
          // Ignore storage errors.
        }
        return fetchFromTMDB<T>(endpoint, FALLBACK_V3_API_KEY, params, false);
      }

      // Log specifically for 401 to help debugging
      if (response.status === 401) {
        console.error(`TMDB 401 Unauthorized. Key type: ${isV3Key ? 'v3' : 'v4'}. Length: ${cleanKey.length}`);
      }
      throw new Error(`TMDB API Error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to fetch from TMDB:", error);
    return null;
  }
};

export const getGenres = async (type: 'movie' | 'tv', apiKey: string): Promise<Genre[]> => {
  const data = await fetchFromTMDB<GenresResponse>(`/genre/${type}/list`, apiKey, {
    language: 'en-US'
  });
  return data?.genres || [];
};

export const getTVDetails = async (id: number, apiKey: string): Promise<TVDetails | null> => {
  return await fetchFromTMDB<TVDetails>(`/tv/${id}`, apiKey, {
    language: 'en-US'
  });
};

export const getTrendingMedia = async (
  type: 'all' | 'movie' | 'tv',
  apiKey: string,
  timeWindow: 'day' | 'week' = 'week'
): Promise<Movie[]> => {
  const data = await fetchFromTMDB<TMDBResponse>(`/trending/${type}/${timeWindow}`, apiKey, {
    language: 'en-US',
  });

  if (!data?.results) return [];

  return data.results
    .filter((m) => (m.media_type as string) !== 'person')
    .map((m) => {
      if (!m.media_type) {
        if (type === 'movie') return { ...m, media_type: 'movie' as const };
        if (type === 'tv') return { ...m, media_type: 'tv' as const };
      }
      return m;
    });
};

export const discoverByProvider = async (
  type: 'all' | 'movie' | 'tv',
  providerId: number,
  sortBy: string,
  genreFilter: GenreFilter | null,
  apiKey: string,
  page = 1
): Promise<Movie[]> => {
  const fetchType = async (mediaType: 'movie' | 'tv', specificGenreId?: number) => {
    let apiSortBy = sortBy;
    if (mediaType === 'tv' && sortBy.includes('primary_release_date')) {
      apiSortBy = sortBy.replace('primary_release_date', 'first_air_date');
    }

    const params: Record<string, string> = {
      language: 'en-US',
      page: page.toString(),
      include_adult: 'false',
      sort_by: apiSortBy,
      watch_region: 'US',
      with_watch_providers: providerId.toString(),
      with_watch_monetization_types: 'flatrate',
    };

    if (!sortBy.includes('date')) {
      params['vote_count.gte'] = '50';
    }

    if (specificGenreId && specificGenreId > 0) {
      params.with_genres = specificGenreId.toString();
    }
    
    if (sortBy.includes('date')) {
        const today = new Date().toISOString().split('T')[0];
        if (mediaType === 'movie') {
            params['primary_release_date.lte'] = today;
        } else {
            params['first_air_date.lte'] = today;
        }
    }

    const data = await fetchFromTMDB<TMDBResponse>(`/discover/${mediaType}`, apiKey, params);

    if (!data?.results) return [];
    return data.results.map((m) => ({ ...m, media_type: mediaType }));
  };

  if (type === 'all') {
    let movieGenreId: number | undefined;
    let tvGenreId: number | undefined;
    if (genreFilter) {
      if (typeof genreFilter === 'number') {
        movieGenreId = genreFilter;
        tvGenreId = genreFilter;
      } else {
        movieGenreId = genreFilter.movie;
        tvGenreId = genreFilter.tv;
      }
    }
    const shouldFetchMovies = genreFilter === null || movieGenreId !== undefined;
    const shouldFetchTV = genreFilter === null || tvGenreId !== undefined;

    const [movies, tv] = await Promise.all([
      shouldFetchMovies ? fetchType('movie', movieGenreId) : Promise.resolve([]),
      shouldFetchTV ? fetchType('tv', tvGenreId) : Promise.resolve([])
    ]);
    const merged = [...movies, ...tv];
    
    // Deduplicate
    const seen = new Set<string>();
    const deduplicated = merged.filter((item) => {
      const key = `${item.media_type}-${item.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return deduplicated.sort((a, b) => {
      if (sortBy.includes('popularity')) return (b.popularity || 0) - (a.popularity || 0); 
      if (sortBy.includes('vote_average')) return (b.vote_average || 0) - (a.vote_average || 0);
      if (sortBy.includes('date')) {
        const dateA = a.release_date || a.first_air_date || '';
        const dateB = b.release_date || b.first_air_date || '';
        return dateB.localeCompare(dateA);
      }
      return 0;
    });
  } else {
    const gid = typeof genreFilter === 'number' ? genreFilter : undefined;
    return await fetchType(type, gid);
  }
};

export const discoverMedia = async (
  type: 'movie' | 'tv' | 'all', 
  sortBy: string, 
  genreFilter: GenreFilter | null,
  page: number, 
  apiKey: string
): Promise<Movie[]> => {
  
  // Internal helper to fetch a specific type
  const fetchType = async (mediaType: 'movie' | 'tv', specificGenreId?: number) => {
    let apiSortBy = sortBy;
    // Fix for TV sort keys
    if (mediaType === 'tv' && sortBy.includes('primary_release_date')) {
      apiSortBy = sortBy.replace('primary_release_date', 'first_air_date');
    }

    const params: Record<string, string> = {
      sort_by: apiSortBy,
      page: page.toString(),
      include_adult: 'false',
      language: 'en-US',
    };

    // Only apply vote count filter for Trending/Top Rated to filter out spam.
    // Do NOT apply it for Newest, otherwise fresh releases with 0 votes won't show up.
    if (!sortBy.includes('date')) {
      params['vote_count.gte'] = '50';
    }

    if (specificGenreId && specificGenreId > 0) {
      params.with_genres = specificGenreId.toString();
    }
    
    // For "Newest", ensure we don't show future releases
    if (sortBy.includes('date')) {
        const today = new Date().toISOString().split('T')[0];
        if (mediaType === 'movie') {
            params['primary_release_date.lte'] = today;
        } else {
            params['first_air_date.lte'] = today;
        }
    }

    const data = await fetchFromTMDB<TMDBResponse>(`/discover/${mediaType}`, apiKey, params);
    if (!data || !data.results) return [];
    return data.results.map(m => ({ ...m, media_type: mediaType }));
  };

  if (type === 'all') {
    // Determine genre IDs for each type
    let movieGenreId: number | undefined;
    let tvGenreId: number | undefined;

    if (genreFilter) {
      if (typeof genreFilter === 'number') {
        movieGenreId = genreFilter;
        tvGenreId = genreFilter;
      } else {
        movieGenreId = genreFilter.movie;
        tvGenreId = genreFilter.tv;
      }
    }

    // Logic: If a filter is Active (genreFilter is not null), but specific ID is undefined,
    // it means that genre doesn't exist for that media type.
    // We should return empty array for that type instead of fetching unfiltered.
    const shouldFetchMovies = genreFilter === null || movieGenreId !== undefined;
    const shouldFetchTV = genreFilter === null || tvGenreId !== undefined;

    const [movies, tvs] = await Promise.all([
      shouldFetchMovies ? fetchType('movie', movieGenreId) : Promise.resolve([]),
      shouldFetchTV ? fetchType('tv', tvGenreId) : Promise.resolve([])
    ]);
    
    const combined = [...movies, ...tvs];
    
    // Sort combined results
    return combined.sort((a, b) => {
      if (sortBy.includes('popularity')) {
        return (b.popularity || 0) - (a.popularity || 0); 
      }
      if (sortBy.includes('vote_average')) {
        return (b.vote_average || 0) - (a.vote_average || 0);
      }
      if (sortBy.includes('date')) {
        const dateA = a.release_date || a.first_air_date || '';
        const dateB = b.release_date || b.first_air_date || '';
        return dateB.localeCompare(dateA);
      }
      return 0;
    });
  } else {
    // If not 'all', genreFilter MUST be a number if present, but we cast safely
    const gid = typeof genreFilter === 'number' ? genreFilter : undefined;
    return await fetchType(type, gid);
  }
};

export const searchMovies = async (query: string, page: number, apiKey: string): Promise<Movie[]> => {
  const data = await fetchFromTMDB<TMDBResponse>('/search/multi', apiKey, {
    query,
    page: page.toString(),
    include_adult: 'false',
    language: 'en-US'
  });

  if (!data || !data.results) return [];

  // 1. Filter out 'person' results to keep only watchable content.
  // 2. Sort by POPULARITY. This is crucial for a "streaming site" feel.
  //    Standard TMDB search ranks by text relevance, which often puts obscure shorts or
  //    documentaries first. We want the blockbuster "The Batman" to be #1, not a 5-min short.
  return data.results
    .filter(m => (m.media_type as string) !== 'person')
    .sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
};

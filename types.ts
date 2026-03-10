
export interface Movie {
  id: number;
  title: string;
  name?: string; // For TV shows
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  release_date?: string;
  first_air_date?: string;
  media_type?: 'movie' | 'tv';
  popularity?: number;
}

export interface Genre {
  id: number;
  name: string;
}

export interface Season {
  air_date: string;
  episode_count: number;
  id: number;
  name: string;
  overview: string;
  poster_path: string;
  season_number: number;
  vote_average: number;
}

export interface TVDetails {
  id: number;
  name: string;
  number_of_episodes: number;
  number_of_seasons: number;
  seasons: Season[];
}

export interface TMDBResponse {
  page: number;
  results: Movie[];
  total_pages: number;
  total_results: number;
}

export interface GenresResponse {
  genres: Genre[];
}

export enum ViewState {
  HOME = 'HOME',
  SEARCH = 'SEARCH',
  WATCH = 'WATCH'
}

export interface Settings {
  tmdbApiKey: string;
}

export type SortOption = 'popularity.desc' | 'vote_average.desc' | 'primary_release_date.desc';
export type MediaType = 'movie' | 'tv' | 'all';
export type GenreFilter = number | { movie?: number; tv?: number };

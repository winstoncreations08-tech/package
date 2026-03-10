import React from 'react';
import { Movie } from '../types';
import { Play, Star } from 'lucide-react';

interface MovieCardProps {
  movie: Movie;
  onClick: (movie: Movie) => void;
}

const MovieCard: React.FC<MovieCardProps> = ({ movie, onClick }) => {
  const title = movie.title || movie.name || 'Untitled';
  const year = (movie.release_date || movie.first_air_date || '').split('-')[0];
  const imageUrl = movie.poster_path 
  ? `https://wsrv.nl/?url=image.tmdb.org/t/p/w500${movie.poster_path}&w=500&output=webp`
  : 'https://via.placeholder.com/500x750?text=No+Image';
   

  return (
    <div 
      className="group relative flex flex-col gap-2 cursor-pointer transition-transform duration-300 hover:scale-105 hover:z-10"
      onClick={() => onClick(movie)}
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-md bg-zinc-900 shadow-lg">
        <img 
          src={imageUrl} 
          alt={title} 
          className="h-full w-full object-cover transition-opacity duration-300 group-hover:opacity-60"
          loading="lazy"
          decoding="async"
        />
        
        {/* Hover Overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <div className="rounded-full bg-red-600 p-3 shadow-xl">
            <Play className="h-6 w-6 text-white fill-white" />
          </div>
        </div>
        
        {/* Rating Badge */}
        <div className="absolute top-2 right-2 rounded bg-black/60 px-1.5 py-0.5 text-xs font-bold text-yellow-400 backdrop-blur-sm flex items-center gap-1">
          <Star className="w-3 h-3 fill-yellow-400" />
          {movie.vote_average?.toFixed(1)}
        </div>
      </div>

      <div className="px-1">
        <h3 className="truncate text-sm font-medium text-white">{title}</h3>
        <p className="text-xs text-zinc-400">{year} • {movie.media_type === 'tv' ? 'TV Series' : 'Movie'}</p>
      </div>
    </div>
  );
};

export default MovieCard;
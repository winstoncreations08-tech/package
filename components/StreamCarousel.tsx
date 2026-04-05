import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import MovieCard from './MovieCard';
import { Movie } from '../types';

interface StreamCarouselProps {
  items: Movie[];
  onMovieClick: (movie: Movie) => void;
}

const CARD_GAP = 16;

const getCardWidth = () => {
  if (typeof window === 'undefined') return 180;
  if (window.innerWidth < 640) return 145;
  if (window.innerWidth < 768) return 160;
  return 180;
};

const getVisibleCount = () => {
  if (typeof window === 'undefined') return 6;
  const cardW = getCardWidth() + CARD_GAP;
  return Math.floor((window.innerWidth - 64) / cardW);
};

const StreamCarousel: React.FC<StreamCarouselProps> = ({ items, onMovieClick }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [cardWidth, setCardWidth] = useState(getCardWidth);
  const [visibleCount, setVisibleCount] = useState(getVisibleCount);
  const [skipTransition, setSkipTransition] = useState(false);

  const stepSize = cardWidth + CARD_GAP;
  const totalOriginal = items.length;

  // Clone enough items at the end to fill one full viewport for seamless wrapping
  const cloneCount = Math.min(visibleCount + 2, totalOriginal);
  const extendedItems = [...items, ...items.slice(0, cloneCount)];

  useEffect(() => {
    const handleResize = () => {
      setCardWidth(getCardWidth());
      setVisibleCount(getVisibleCount());
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const translateX = currentIndex * stepSize;

  const scrollRight = useCallback(() => {
    if (isAnimating || totalOriginal <= visibleCount) return;
    setIsAnimating(true);
    setSkipTransition(false);

    const nextIndex = currentIndex + visibleCount;

    if (nextIndex >= totalOriginal) {
      // We'd overshoot — snap to exactly totalOriginal so clones
      // show the beginning items, then silently reset to 0
      setCurrentIndex(totalOriginal);
    } else {
      setCurrentIndex(nextIndex);
    }
  }, [isAnimating, visibleCount, totalOriginal, currentIndex]);

  const scrollLeft = useCallback(() => {
    if (isAnimating || currentIndex <= 0) return;
    setIsAnimating(true);
    setSkipTransition(false);
    setCurrentIndex((prev) => Math.max(0, prev - visibleCount));
  }, [isAnimating, currentIndex, visibleCount]);

  const handleTransitionEnd = useCallback(() => {
    if (currentIndex >= totalOriginal) {
      // We animated into the clone zone — silently jump to 0
      setSkipTransition(true);
      setCurrentIndex(0);
      requestAnimationFrame(() => {
        setIsAnimating(false);
      });
    } else {
      setIsAnimating(false);
    }
  }, [currentIndex, totalOriginal]);

  // Clear skip-transition flag after the reset renders
  useEffect(() => {
    if (skipTransition) {
      const raf = requestAnimationFrame(() => {
        setSkipTransition(false);
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [skipTransition]);

  const showLeftArrow = currentIndex > 0;
  const showRightArrow = totalOriginal > visibleCount;

  if (items.length === 0) return null;

  return (
    <div className="group/carousel relative">
      {/* Left Arrow */}
      {showLeftArrow && (
        <button
          onClick={scrollLeft}
          className="absolute left-0 top-0 bottom-0 z-20 w-11 md:w-14 flex items-center justify-center
                     bg-gradient-to-r from-black/90 via-black/60 to-transparent
                     opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-300
                     cursor-pointer"
          aria-label="Scroll left"
        >
          <ChevronLeft className="h-7 w-7 md:h-9 md:w-9 text-white drop-shadow-lg transition-transform hover:scale-110" />
        </button>
      )}

      {/* Right Arrow */}
      {showRightArrow && (
        <button
          onClick={scrollRight}
          className="absolute right-0 top-0 bottom-0 z-20 w-11 md:w-14 flex items-center justify-center
                     bg-gradient-to-l from-black/90 via-black/60 to-transparent
                     opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-300
                     cursor-pointer"
          aria-label="Scroll right"
        >
          <ChevronRight className="h-7 w-7 md:h-9 md:w-9 text-white drop-shadow-lg transition-transform hover:scale-110" />
        </button>
      )}

      {/* Track — extra vertical padding so hover-scale isn't clipped, negative margin to keep layout tight */}
      <div className="overflow-hidden py-3 -my-3">
        <div
          className="flex"
          style={{
            gap: `${CARD_GAP}px`,
            transform: `translateX(-${translateX}px)`,
            transition: skipTransition
              ? 'none'
              : isAnimating
                ? 'transform 0.55s cubic-bezier(0.22, 1, 0.36, 1)'
                : 'none',
            willChange: isAnimating ? 'transform' : 'auto',
          }}
          onTransitionEnd={handleTransitionEnd}
        >
          {extendedItems.map((movie, i) => (
            <div
              key={`card-${i}`}
              className="shrink-0"
              style={{ width: `${cardWidth}px` }}
            >
              <MovieCard movie={movie} onClick={onMovieClick} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StreamCarousel;

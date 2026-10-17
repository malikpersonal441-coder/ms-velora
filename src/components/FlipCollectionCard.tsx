import React, { useState } from 'react';
import { sized, srcSet } from '../lib/img';
import { Link } from 'react-router-dom';
import { ArrowRight, RotateCw } from 'lucide-react';
import type { Collection } from '../types';

/**
 * 3D flip card: photo on the front, story + call to action on the back.
 * Flips on hover (mouse) or tap (touch / keyboard via the flip button).
 */
export const FlipCollectionCard: React.FC<{ collection: Collection; index: number }> = ({ collection, index }) => {
  const [flipped, setFlipped] = useState(false);

  return (
    <div
      className="flip-card group aspect-[5/6] [perspective:1400px]"
      onPointerEnter={(e) => e.pointerType === 'mouse' && setFlipped(true)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && setFlipped(false)}
    >
      <div
        className={`flip-inner relative w-full h-full [transform-style:preserve-3d] transition-transform duration-[900ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
          flipped ? '[transform:rotateY(180deg)]' : ''
        }`}
      >
        {/* Front */}
        <div className="absolute inset-0 [backface-visibility:hidden] rounded-sm overflow-hidden bg-[#0D0D0D] shadow-[0_30px_60px_-30px_rgba(13,13,13,0.45)]">
          <img
            src={sized(collection.image, 520)}
            srcSet={srcSet(collection.image, 520)}
            decoding="async"
            alt={collection.name}
            loading="lazy"
            width={600}
            height={750}
            className="w-full h-full object-cover transition-transform duration-[1200ms] group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0D0D0D]/90 via-[#0D0D0D]/20 to-transparent" />
          <div className="absolute inset-3 border border-[#FAF8F5]/20 pointer-events-none" />
          <span className="absolute top-4 left-4 sm:top-6 sm:left-6 font-serif-luxury text-[#FAF8F5]/70 text-lg italic">
            {String(index + 1).padStart(2, '0')}
          </span>
          <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6 text-[#FAF8F5]">
            <p className="text-[10px] uppercase tracking-[0.35em] text-[#DFBD78]">
              {collection.subtitle || 'Signature Collection'}
            </p>
            <h3 className="mt-1 font-serif-luxury text-lg sm:text-2xl font-medium">{collection.name}</h3>
          </div>
          <button
            type="button"
            onClick={() => setFlipped(true)}
            className="absolute top-3 right-3 sm:top-5 sm:right-5 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/25 text-[#FAF8F5] flex items-center justify-center hover:bg-[#C5A059] hover:text-[#0D0D0D] transition-colors"
            aria-label={`Discover ${collection.name}`}
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>

        {/* Back */}
        <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-sm overflow-hidden bg-[#0B0B0D] text-[#FAF8F5] flex flex-col items-center justify-center text-center p-4 sm:p-8">
          <div className="absolute inset-3 border border-[#C5A059]/40 pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(197,160,89,0.18),transparent_60%)]" />
          <p className="relative text-[10px] uppercase tracking-[0.4em] text-[#DFBD78]">
            {collection.subtitle || 'Signature Collection'}
          </p>
          <h3 className="relative mt-2 font-serif-luxury text-xl sm:text-3xl font-medium">{collection.name}</h3>
          <span className="relative my-2 sm:my-4 text-[#C5A059] text-xs">✦</span>
          <p className="relative text-xs sm:text-sm text-[#FAF8F5]/70 leading-relaxed line-clamp-3 sm:line-clamp-4">{collection.description}</p>
          <Link
            to={`/collections/${collection.slug}`}
            className="btn-lux-gold group/btn relative mt-4 sm:mt-7 !px-4 sm:!px-8 !py-2.5 sm:!py-4"
            onFocus={() => setFlipped(true)}
          >
            <span>Explore</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
          </Link>
          <button
            type="button"
            onClick={() => setFlipped(false)}
            className="relative mt-5 text-[10px] uppercase tracking-[0.3em] text-[#FAF8F5]/45 hover:text-[#FAF8F5]"
          >
            Turn back
          </button>
        </div>
      </div>
    </div>
  );
};

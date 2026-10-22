import React, { useEffect, useMemo, useRef, useState } from 'react';
import { sized, srcSet } from '../lib/img';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useReducedMotion } from 'framer-motion';
import type { Product } from '../types';
import { formatPrice } from '../lib/api';
import { useStore } from '../context/StoreContext';

/**
 * "The Rotunda" — pieces arranged on a 3D ring that turns continuously.
 * Keeps rotating under the cursor; arrows and swipe step it; the front piece is spotlit.
 */
export const Showcase3D: React.FC<{ products: Product[] }> = ({ products }) => {
  const { settings } = useStore();
  const reduced = useReducedMotion();
  const items = useMemo(() => products.slice(0, 8), [products]);
  const n = items.length;
  const step = 360 / Math.max(n, 1);
  const [angle, setAngle] = useState(0);
  const [radius, setRadius] = useState(420);
  const touchX = useRef<number | null>(null);

  // Responsive ring size
  useEffect(() => {
    const fit = () => setRadius(window.innerWidth < 640 ? 230 : window.innerWidth < 1024 ? 330 : 440);
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  // Continuous turn — one slot every 3.2s, never paused by hover
  useEffect(() => {
    if (reduced || n < 3) return;
    const id = setInterval(() => setAngle((a) => a - step), 3200);
    return () => clearInterval(id);
  }, [reduced, n, step]);

  if (n < 3) return null;

  const front = (((Math.round(-angle / step) % n) + n) % n);
  const symbol = settings?.currencySymbol || 'Rs.';
  const active = items[front];

  return (
    <div className="relative overflow-hidden">
      <div
        className="relative -mt-4 h-[320px] sm:h-[380px] lg:h-[400px] [perspective:1800px] select-none"
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          if (Math.abs(dx) > 40) setAngle((a) => a + (dx > 0 ? step : -step));
          touchX.current = null;
        }}
      >
        {/* Floor reflection glow */}
        <div className="absolute left-1/2 bottom-0 -translate-x-1/2 w-[70%] h-16 rounded-[50%] bg-[radial-gradient(ellipse,rgba(197,160,89,0.35),transparent_70%)] blur-xl" />

        <div
          className="absolute left-1/2 top-1/2 w-0 h-0 [transform-style:preserve-3d] transition-transform duration-[1400ms] ease-[cubic-bezier(0.45,0,0.2,1)]"
          style={{ transform: `translateZ(${-radius}px) rotateX(-6deg) rotateY(${angle}deg)` }}
        >
          {items.map((p, i) => {
            const isFront = i === front;
            return (
              <Link
                key={p._id}
                to={`/product/${p.slug}`}
                tabIndex={isFront ? 0 : -1}
                aria-hidden={!isFront}
                className="absolute -left-[90px] -top-[130px] sm:-left-[110px] sm:-top-[150px] w-[180px] h-[260px] sm:w-[220px] sm:h-[300px] [backface-visibility:hidden]"
                style={{ transform: `rotateY(${i * step}deg) translateZ(${radius}px)` }}
              >
                <div
                  className={`w-full h-full rounded-sm overflow-hidden bg-[#26262B] transition-all duration-700 ${
                    isFront
                      ? 'shadow-[0_40px_80px_-30px_rgba(0,0,0,0.8),0_0_0_1px_rgba(197,160,89,0.6)] brightness-100'
                      : 'shadow-[0_20px_40px_-20px_rgba(0,0,0,0.6)] brightness-[0.55]'
                  }`}
                >
                  <img src={sized(p.mainImage, 300)} srcSet={srcSet(p.mainImage, 300)} alt={p.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Caption for the spotlit piece */}
      <div className="mt-1 text-center min-h-[88px]" aria-live="polite">
        <p className="text-[10px] uppercase tracking-[0.4em] text-[#D4B06A] font-semibold">{active.brand}</p>
        <Link
          to={`/product/${active.slug}`}
          className="mt-2 inline-block font-serif-luxury text-2xl sm:text-3xl text-[#F2EFE9] hover:text-[#D4B06A] transition-colors"
        >
          {active.name}
        </Link>
        <p className="mt-1 text-sm text-neutral-600 tabular-nums">
          {formatPrice(active.salePrice && active.salePrice < active.price ? active.salePrice : active.price, symbol)}
        </p>
      </div>

      <div className="mt-6 flex items-center justify-center gap-4">
        {[
          { label: 'Previous piece', Icon: ChevronLeft, d: step },
          { label: 'Next piece', Icon: ChevronRight, d: -step },
        ].map(({ label, Icon, d }) => (
          <button
            key={label}
            type="button"
            onClick={() => setAngle((a) => a + d)}
            aria-label={label}
            className="w-12 h-12 rounded-full border border-[#C5A059]/50 bg-white/80 text-[#F2EFE9] hover:bg-[#C5A059] hover:text-white flex items-center justify-center transition-colors duration-500 shadow-xs"
          >
            <Icon className="w-5 h-5" />
          </button>
        ))}
      </div>
    </div>
  );
};

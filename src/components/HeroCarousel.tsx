import React, { useState, useEffect, useRef } from 'react';
import { sized } from '../lib/img';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { ChevronLeft, ChevronRight, Shield, Award, Truck, ArrowRight } from 'lucide-react';
import { HeroSlide } from '../types';

interface HeroCarouselProps {
  slides: HeroSlide[];
  autoRotate?: boolean;
  intervalMs?: number;
}

export const HeroCarousel: React.FC<HeroCarouselProps> = ({
  slides,
  autoRotate = true,
  intervalMs = 6000,
}) => {
  const activeSlides = slides
    .filter((s) => s.isActive !== false)
    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const prefersReducedMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  // Parallax: image drifts slower than the page, copy lifts and fades as you scroll away
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end start'] });
  const imageY = useTransform(scrollYProgress, [0, 1], ['0%', '18%']);
  const imageScale = useTransform(scrollYProgress, [0, 1], [1, 1.08]);
  const contentY = useTransform(scrollYProgress, [0, 1], ['0%', '-25%']);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  const slideCount = activeSlides.length;

  useEffect(() => {
    if (!autoRotate || isPaused || slideCount <= 1) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slideCount);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [autoRotate, isPaused, slideCount, intervalMs]);

  if (slideCount === 0) return null;

  const safeIndex = current % slideCount;
  const slide = activeSlides[safeIndex];

  const handlePrev = () => {
    setCurrent((prev) => (prev - 1 + slideCount) % slideCount);
  };

  const handleNext = () => {
    setCurrent((prev) => (prev + 1) % slideCount);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    setIsPaused(true);
    touchStartX.current = e.touches[0].clientX;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current !== null) {
      const deltaX = e.changedTouches[0].clientX - touchStartX.current;
      if (Math.abs(deltaX) > 45) {
        if (deltaX < 0) handleNext();
        else handlePrev();
      }
    }
    touchStartX.current = null;
    setIsPaused(false);
  };

  // Split headline into words; the last word gets the gold italic accent
  const words = (slide.title || '').trim().split(/\s+/);
  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <section
      ref={sectionRef}
      className="relative bg-[#08090B] text-[#FAF8F5] overflow-hidden select-none grain"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      aria-roledescription="carousel"
      aria-label="Featured Jewellery Collections"
    >
      <div className="relative h-[calc(100svh-104px)] min-h-[520px] max-h-[820px] w-full">
        {/* Slides: slow cinematic zoom + drift, parallax on scroll */}
        <motion.div className="absolute inset-0" style={prefersReducedMotion ? undefined : { y: imageY, scale: imageScale }}>
          {activeSlides.map((s, idx) => {
            const isCurrent = idx === safeIndex;
            const isFirstLcp = idx === 0;
            return (
              <div
                key={s._id || idx}
                className={`absolute inset-0 transition-opacity duration-[1400ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  isCurrent ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                }`}
                aria-hidden={!isCurrent}
              >
                <picture>
                  <source media="(max-width: 767px)" srcSet={sized(s.mobileImage || s.desktopImage, 800, 70)} />
                  <source media="(max-width: 1279px)" srcSet={sized(s.desktopImage, 1400, 72)} />
                  <img
                    src={sized(s.desktopImage, 1920, 72)}
                    decoding="async"
                    alt={s.title}
                    fetchPriority={isFirstLcp ? 'high' : 'low'}
                    loading={isFirstLcp ? undefined : 'lazy'}
                    width={1920}
                    height={1080}
                    className={`w-full h-full object-cover object-center ${
                      isCurrent && !prefersReducedMotion ? 'hero-kenburns' : ''
                    }`}
                    style={{ animationDuration: `${Math.max(intervalMs, 6000) + 4000}ms` }}
                  />
                </picture>
                <div className="absolute inset-0 bg-gradient-to-r from-[#08090B]/95 via-[#08090B]/60 to-[#08090B]/10" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#08090B] via-transparent to-[#08090B]/50" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_75%_40%,rgba(197,160,89,0.12),transparent_55%)]" />
              </div>
            );
          })}
        </motion.div>

        {/* Vertical edge label */}
        <div className="hidden lg:flex absolute left-6 top-1/2 -translate-y-1/2 z-20 items-center gap-4 [writing-mode:vertical-rl] rotate-180 text-[10px] uppercase tracking-[0.5em] text-[#FAF8F5]/35">
          <span className="w-px h-16 bg-gradient-to-b from-transparent to-[#C5A059]/60" />
          Est. Lahore · Fine Jewellery
        </div>

        {/* Slide content */}
        <motion.div
          style={prefersReducedMotion ? undefined : { y: contentY, opacity: contentOpacity }}
          className="relative z-20 max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-16 pt-6 pb-28 sm:pb-32 flex flex-col justify-center"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={safeIndex}
              initial="hidden"
              animate="show"
              exit="exit"
              variants={{
                hidden: {},
                show: { transition: { staggerChildren: prefersReducedMotion ? 0 : 0.08, delayChildren: 0.15 } },
                exit: { opacity: 0, transition: { duration: 0.35 } },
              }}
              className="max-w-2xl"
            >
              <motion.div variants={fadeUp} className="flex items-center gap-4 mb-7">
                <span className="h-px w-12 bg-gradient-to-r from-transparent to-[#C5A059]" />
                <span className="text-[11px] uppercase tracking-[0.45em] text-[#DFBD78] font-semibold">
                  {slide.badgeText || 'MS Velora Atelier'}
                </span>
              </motion.div>

              <h1 className="font-serif-luxury text-[11vw] sm:text-6xl lg:text-[4.6rem] font-medium leading-[1] tracking-[-0.01em]">
                {words.map((w, i) => (
                  <span key={i} className="inline-block overflow-hidden align-bottom pb-[0.08em] mr-[0.22em]">
                    <motion.span
                      variants={wordReveal}
                      className={`inline-block ${
                        i === words.length - 1 && words.length > 1
                          ? 'italic font-normal text-gold-gradient pr-[0.05em]'
                          : ''
                      }`}
                    >
                      {w}
                    </motion.span>
                  </span>
                ))}
              </h1>

              <motion.p
                variants={fadeUp}
                className="mt-5 text-[15px] sm:text-base lg:text-[17px] text-[#FAF8F5]/70 leading-relaxed max-w-lg font-light"
              >
                {slide.subtitle}
              </motion.p>

              <motion.div variants={fadeUp} className="mt-8 flex flex-wrap items-center gap-3">
                <Link to={slide.primaryCtaLink || '/shop'} className="btn-lux-gold group">
                  <span>{slide.primaryCtaText || 'Shop Collection'}</span>
                  <ArrowRight className="w-4 h-4 transition-transform duration-500 group-hover:translate-x-1" />
                </Link>
                {slide.secondaryCtaText && (
                  <Link to={slide.secondaryCtaLink || '/collections'} className="btn-lux-ghost backdrop-blur-sm">
                    {slide.secondaryCtaText}
                  </Link>
                )}
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* Bottom bar: counter + per-slide progress, scroll cue, arrows */}
        <div className="absolute bottom-0 inset-x-0 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-16 pb-8 flex items-end justify-between gap-6">
            {slideCount > 1 ? (
              <div className="flex items-center gap-5">
                <span className="font-serif-luxury text-3xl text-[#FAF8F5] tabular-nums">{pad(safeIndex + 1)}</span>
                <div className="flex items-center gap-2">
                  {activeSlides.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCurrent(idx)}
                      aria-label={`Go to slide ${idx + 1}`}
                      aria-current={idx === safeIndex}
                      className="relative h-5 w-10 sm:w-16"
                    >
                      <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[2px] bg-white/20" />
                      <span
                        key={`${idx}-${safeIndex}`}
                        className={`absolute left-0 top-1/2 -translate-y-1/2 h-[2px] bg-[#C5A059] ${
                          idx < safeIndex ? 'w-full' : idx === safeIndex ? 'hero-progress' : 'w-0'
                        }`}
                        style={{
                          animationDuration: `${intervalMs}ms`,
                          animationPlayState: isPaused || !autoRotate ? 'paused' : 'running',
                        }}
                      />
                    </button>
                  ))}
                </div>
                <span className="font-serif-luxury text-lg text-[#FAF8F5]/40 tabular-nums">{pad(slideCount)}</span>
              </div>
            ) : (
              <span />
            )}

            <div className="flex items-center gap-6">
              <a
                href="#after-hero"
                className="hidden md:flex flex-col items-center gap-2 text-[10px] uppercase tracking-[0.35em] text-[#FAF8F5]/50 hover:text-[#DFBD78] transition-colors"
              >
                Scroll
                <span className="relative w-px h-10 bg-white/15 overflow-hidden">
                  <span className="absolute inset-x-0 top-0 h-1/2 bg-[#C5A059] hero-scroll-cue" />
                </span>
              </a>
              {slideCount > 1 && (
                <div className="hidden sm:flex items-center gap-3">
                  {[
                    { fn: handlePrev, label: 'Previous slide', Icon: ChevronLeft },
                    { fn: handleNext, label: 'Next slide', Icon: ChevronRight },
                  ].map(({ fn, label, Icon }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={fn}
                      aria-label={label}
                      className="w-12 h-12 rounded-full border border-white/20 bg-white/5 backdrop-blur-md hover:border-[#C5A059] hover:bg-[#C5A059] hover:text-[#0D0D0D] flex items-center justify-center transition-all duration-500"
                    >
                      <Icon className="w-5 h-5" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Trust strip */}
      <div id="after-hero" className="relative z-20 bg-[#0D0E11] border-y border-[#C5A059]/15 py-5 px-4">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4 sm:divide-x divide-white/10 text-[11px] text-[#FAF8F5]/70">
          {[
            { Icon: Award, text: 'Hand-Checked Quality' },
            { Icon: Shield, text: 'Plating Warranty' },
            { Icon: Truck, text: 'Gift-Boxed Delivery Nationwide' },
          ].map(({ Icon, text }) => (
            <div key={text} className="flex items-center justify-center gap-3">
              <Icon className="w-4 h-4 text-[#C5A059] shrink-0" />
              <span className="tracking-[0.22em] uppercase">{text}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const EASE = [0.16, 1, 0.3, 1] as const;
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.9, ease: EASE } },
};
const wordReveal = {
  hidden: { y: '110%' },
  show: { y: '0%', transition: { duration: 1.1, ease: EASE } },
};

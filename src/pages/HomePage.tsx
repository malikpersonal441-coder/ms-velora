import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  Copy,
  Sparkles,
  ShieldCheck,
  Clock,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { HeroCarousel } from '../components/HeroCarousel';
import { ProductCard } from '../components/ProductCard';
import { SectionHeading } from '../components/SectionHeading';
import { Showcase3D } from '../components/Showcase3D';
import { Reveal } from '../components/Reveal';
import { Product } from '../types';

export const HomePage: React.FC = () => {
  const {
    homepage,
    collections,
    categories,
    bestSellers,
    newArrivals,
    storefrontLoading,
    addToast,
  } = useStore();
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    document.title = 'MS Velora — Fine Jewellery for Women';
  }, []);

  const visibility = homepage?.sectionVisibility || {
    heroCarousel: true,
    featuredCollections: true,
    bestSellers: true,
    promoBanner: true,
    newArrivals: true,
    brandStory: true,
    customerReviews: true,
    newsletter: true,
  };

  const handleCopyCoupon = (code: string) => {
    navigator.clipboard.writeText(code);
    addToast(`Privilege code "${code}" copied to clipboard!`, 'success');
  };

  return (
    <div className="home-sections space-y-20 sm:space-y-28 pb-20">
      {/* C. Hero Carousel */}
      {visibility.heroCarousel && homepage?.heroSlides && (
        <HeroCarousel
          slides={homepage.heroSlides}
          autoRotate={homepage.carouselSettings?.autoRotate ?? true}
          intervalMs={homepage.carouselSettings?.intervalMs ?? 6000}
        />
      )}

      {/* C2. Quick Shop by Category */}
      {categories && categories.length > 0 && (
        <section className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 mt-4 sm:-mt-14 relative z-20">
          <div className="bg-white rounded-2xl border border-[#C5A059]/25 p-4 sm:p-7 shadow-xl">
            <div className="flex items-center justify-between mb-4 sm:mb-5 pb-3 border-b border-[#C5A059]/15">
              <div>
                <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.24em] text-[#D4B06A] font-semibold block">Explore By Maison</span>
                <h3 className="font-serif-luxury text-lg sm:text-2xl font-semibold text-[#F2EFE9]">Shop By Category</h3>
              </div>
              <Link to="/shop" className="text-[11px] sm:text-xs uppercase tracking-widest text-[#D4B06A] hover:text-[#F2EFE9] font-semibold flex items-center gap-1">
                View All <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 sm:gap-4">
              {categories.map((cat) => (
                <Link
                  key={cat._id}
                  to={`/shop?category=${cat.slug}`}
                  className="group relative rounded-xl overflow-hidden aspect-[4/5] border border-black/10 hover:border-[#C5A059] transition-all duration-300 shadow-sm flex flex-col justify-end p-2.5 sm:p-4"
                >
                  <img
                    src={cat.image}
                    alt={cat.name}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent group-hover:from-black/95 transition-colors" />
                  <div className="relative z-10 space-y-0.5">
                    <span className="text-[10px] uppercase tracking-wider text-[#DFBD78] font-medium block">Category</span>
                    <h4 className="font-serif-luxury text-sm sm:text-base font-bold text-white leading-tight group-hover:text-[#DFBD78] transition-colors">{cat.name}</h4>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* E. Best Sellers */}
      {visibility.bestSellers && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Most Coveted"
            title="Best Sellers"
            subtitle="Our most sought-after handcrafted pieces, adored by women across Pakistan."
            link={{ to: '/shop?bestSeller=true', label: 'Shop All Best Sellers' }}
          />

          {storefrontLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-5">
              {[1, 2, 3, 4, 5].map((n) => (
                <div
                  key={n}
                  className="bg-white rounded-lg border border-black/5 overflow-hidden animate-pulse"
                >
                  <div className="aspect-[4/5] bg-neutral-200" />
                  <div className="p-4 space-y-3">
                    <div className="h-3 bg-neutral-200 rounded w-1/3" />
                    <div className="h-5 bg-neutral-200 rounded w-3/4" />
                    <div className="h-4 bg-neutral-200 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-5">
              {bestSellers.slice(0, 10).map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* The Rotunda — 3D rotating showcase */}
      {[...bestSellers, ...newArrivals].length >= 3 && (
        <section className="relative bg-[#1C1C1F] py-16 sm:py-20 overflow-hidden border-y border-[#C5A059]/20">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,rgba(197,160,89,0.1),transparent_60%)]" />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeading
              eyebrow="The Rotunda"
              title="A Turn Through the Vault"
              subtitle="Our most coveted pieces, presented in the round. Tap any piece to view it."
            />
            <Showcase3D
              products={[...bestSellers, ...newArrivals].filter(
                (p, i, all) => all.findIndex((x) => x._id === p._id) === i
              )}
            />
          </div>
        </section>
      )}

      {/* F. Promotional Banner */}
      {visibility.promoBanner && homepage?.promoBanner?.isActive && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-2xl overflow-hidden bg-white text-[#F2EFE9] border border-[#C5A059]/25 shadow-xl">
            <div className="grid grid-cols-1 lg:grid-cols-12 items-center">
              <div className="lg:col-span-7 p-8 sm:p-12 lg:p-16 space-y-6 relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#C5A059]/40 bg-[#C5A059]/10 text-[#D4B06A] text-[11px] uppercase tracking-[0.2em] font-semibold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{homepage.promoBanner.badgeText}</span>
                </div>

                <h2 className="font-serif-luxury text-3xl sm:text-5xl font-semibold leading-tight text-[#F2EFE9]">
                  {homepage.promoBanner.title}
                </h2>

                <p className="text-base sm:text-lg text-[#D4B06A] font-serif-luxury italic">
                  {homepage.promoBanner.subtitle}
                </p>

                <p className="text-sm text-neutral-600 leading-relaxed max-w-xl">
                  {homepage.promoBanner.description}
                </p>

                <div className="pt-2 flex flex-wrap items-center gap-4">
                  <Link
                    to={homepage.promoBanner.ctaLink || '/shop'}
                    className="px-7 py-4 bg-[#C5A059] hover:bg-[#DFBD78] text-[#F2EFE9] font-semibold text-xs uppercase tracking-[0.2em] rounded transition-colors shadow-xs"
                  >
                    {homepage.promoBanner.ctaText || 'Explore Limited Edition'}
                  </Link>

                  {homepage.promoBanner.couponHighlight && (
                    <button
                      type="button"
                      onClick={() => handleCopyCoupon(homepage.promoBanner.couponHighlight!)}
                      className="px-5 py-3.5 rounded border border-dashed border-[#C5A059]/60 bg-[#1C1C1F] hover:border-[#C5A059] text-xs font-mono-code text-[#F2EFE9] flex items-center gap-2.5 transition-colors"
                    >
                      <span>USE CODE: {homepage.promoBanner.couponHighlight}</span>
                      <Copy className="w-3.5 h-3.5 text-[#D4B06A]" />
                    </button>
                  )}
                </div>
              </div>

              <div className="lg:col-span-5 h-72 sm:h-96 lg:h-full relative">
                <img
                  src={homepage.promoBanner.image}
                  alt={homepage.promoBanner.title}
                  loading="lazy"
                  width={800}
                  height={600}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-white via-white/30 to-transparent" />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* G. New Arrivals */}
      {visibility.newArrivals && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Fresh From The Atelier"
            title="New Arrivals"
            link={{ to: '/shop?newArrival=true', label: 'View All New Arrivals' }}
          />

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-5">
            {newArrivals.slice(0, 10).map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* H. Brand Story */}
      {visibility.brandStory && homepage?.brandStory && (
        <section className="bg-[#26262B] border-y border-[#F2EFE9]/8 py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-5">
                <div className="relative rounded-xl overflow-hidden border border-[#C5A059]/40 shadow-xl aspect-[4/5]">
                  <img
                    src={homepage.brandStory.image}
                    alt={homepage.brandStory.heading}
                    loading="lazy"
                    width={600}
                    height={750}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-4 left-4 right-4 p-4 rounded-lg bg-white/95 backdrop-blur-md text-[#F2EFE9] border border-[#C5A059]/30 shadow-lg flex items-center gap-3">
                    <Sparkles className="w-8 h-8 text-[#C5A059] shrink-0" />
                    <div>
                      <p className="text-xs uppercase tracking-widest text-[#D4B06A] font-semibold">
                        Hand-Checked Quality
                      </p>
                      <p className="text-xs text-neutral-600">
                        Checked for finish, stone setting and clasp strength.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-7 space-y-6">
                <span className="text-xs uppercase tracking-[0.24em] text-[#D4B06A] font-semibold">
                  {homepage.brandStory.eyebrow}
                </span>

                <h2 className="font-serif-luxury text-3xl sm:text-5xl font-semibold text-[#F2EFE9] leading-tight">
                  {homepage.brandStory.heading}
                </h2>

                <p className="text-base sm:text-lg text-[#F2EFE9]/85 font-medium leading-relaxed">
                  {homepage.brandStory.leadParagraph}
                </p>

                <p className="text-sm text-neutral-600 leading-relaxed">
                  {homepage.brandStory.bodyParagraph}
                </p>

                {homepage.brandStory.highlights && homepage.brandStory.highlights.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
                    {homepage.brandStory.highlights.map((h, i) => (
                      <div
                        key={i}
                        className="p-4 bg-white rounded-lg border border-black/8 space-y-1"
                      >
                        <span className="text-[11px] uppercase tracking-wider text-[#D4B06A] font-semibold block">
                          {h.label}
                        </span>
                        <h3 className="font-serif-luxury text-xl font-bold text-[#F2EFE9]">
                          {h.value}
                        </h3>
                        <p className="text-xs text-neutral-500 leading-relaxed">
                          {h.description}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-2">
                  <Link
                    to={homepage.brandStory.ctaLink || '/shop'}
                    className="inline-flex items-center gap-2 px-7 py-4 bg-[#F2EFE9] hover:bg-[#C5A059] text-[#1C1C1F] hover:text-[#F2EFE9] text-xs uppercase tracking-[0.2em] font-semibold rounded transition-colors"
                  >
                    <span>{homepage.brandStory.ctaText || 'Explore Our Catalog'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

    </div>
  );
};

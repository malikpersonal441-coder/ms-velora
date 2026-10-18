import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  Star,
  CheckCircle2,
  Copy,
  Sparkles,
  ShieldCheck,
  Clock,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { HeroCarousel } from '../components/HeroCarousel';
import { ProductCard } from '../components/ProductCard';
import { SectionHeading } from '../components/SectionHeading';
import { FlipCollectionCard } from '../components/FlipCollectionCard';
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
    verifiedReviews,
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
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 sm:-mt-14 relative z-20">
          <div className="bg-[#111215]/95 backdrop-blur-md rounded-2xl border border-[#C5A059]/30 p-5 sm:p-7 shadow-2xl">
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-[#C5A059]/15">
              <div>
                <span className="text-[10px] uppercase tracking-[0.24em] text-[#C5A059] font-semibold block">Explore By Maison</span>
                <h3 className="font-serif-luxury text-xl sm:text-2xl font-semibold text-[#FAF8F5]">Shop By Category</h3>
              </div>
              <Link to="/shop" className="text-xs uppercase tracking-widest text-[#C5A059] hover:text-[#DFBD78] font-semibold flex items-center gap-1">
                View All <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
              {categories.map((cat) => (
                <Link
                  key={cat._id}
                  to={`/shop?category=${cat.slug}`}
                  className="group relative rounded-xl overflow-hidden aspect-[4/5] border border-white/10 hover:border-[#C5A059] transition-all duration-300 shadow-md flex flex-col justify-end p-3 sm:p-4"
                >
                  <img
                    src={cat.image}
                    alt={cat.name}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent group-hover:from-black/95 transition-colors" />
                  <div className="relative z-10 space-y-0.5">
                    <span className="text-[10px] uppercase tracking-wider text-[#C5A059] font-medium block">Collection</span>
                    <h4 className="font-serif-luxury text-sm sm:text-base font-bold text-[#FAF8F5] leading-tight group-hover:text-[#DFBD78] transition-colors">{cat.name}</h4>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* D. Featured Collections — 3D flip cards */}
      {visibility.featuredCollections && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Curated Jewellery"
            title="The Collections"
            subtitle="Hover or tap a card to turn it over and discover the story behind each collection."
            link={{ to: '/collections', label: 'All Collections' }}
          />
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
            {collections.slice(0, 6).map((col, idx) => (
              <Reveal key={col._id} delay={idx * 0.08}>
                <FlipCollectionCard collection={col} index={idx} />
              </Reveal>
            ))}
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
        <section className="relative bg-[#08090B] py-16 sm:py-20 overflow-hidden grain">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,rgba(197,160,89,0.12),transparent_60%)]" />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeading
              tone="dark"
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
          <div className="relative rounded-2xl overflow-hidden bg-[#0D0D0D] text-[#FAF8F5] border border-[#C5A059]/35 shadow-2xl">
            <div className="grid grid-cols-1 lg:grid-cols-12 items-center">
              <div className="lg:col-span-7 p-8 sm:p-12 lg:p-16 space-y-6 relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#C5A059]/40 bg-[#C5A059]/10 text-[#DFBD78] text-[11px] uppercase tracking-[0.2em] font-semibold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{homepage.promoBanner.badgeText}</span>
                </div>

                <h2 className="font-serif-luxury text-3xl sm:text-5xl font-semibold leading-tight">
                  {homepage.promoBanner.title}
                </h2>

                <p className="text-base sm:text-lg text-[#C5A059] font-serif-luxury italic">
                  {homepage.promoBanner.subtitle}
                </p>

                <p className="text-sm text-[#FAF8F5]/75 leading-relaxed max-w-xl">
                  {homepage.promoBanner.description}
                </p>

                <div className="pt-2 flex flex-wrap items-center gap-4">
                  <Link
                    to={homepage.promoBanner.ctaLink || '/shop'}
                    className="px-7 py-4 bg-[#C5A059] hover:bg-[#DFBD78] text-[#0D0D0D] font-semibold text-xs uppercase tracking-[0.2em] rounded transition-colors"
                  >
                    {homepage.promoBanner.ctaText || 'Explore Limited Edition'}
                  </Link>

                  {homepage.promoBanner.couponHighlight && (
                    <button
                      type="button"
                      onClick={() => handleCopyCoupon(homepage.promoBanner.couponHighlight!)}
                      className="px-5 py-3.5 rounded border border-dashed border-[#C5A059]/60 bg-[#1A1A1E] hover:border-[#C5A059] text-xs font-mono-code text-[#FAF8F5] flex items-center gap-2.5 transition-colors"
                    >
                      <span>USE CODE: {homepage.promoBanner.couponHighlight}</span>
                      <Copy className="w-3.5 h-3.5 text-[#C5A059]" />
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
                <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-[#0D0D0D] via-[#0D0D0D]/30 to-transparent" />
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
        <section className="bg-[#F3EFE6] border-y border-[#0D0D0D]/8 py-20">
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
                  <div className="absolute bottom-4 left-4 right-4 p-4 rounded-lg bg-[#0D0D0D]/90 backdrop-blur-md text-[#FAF8F5] border border-[#C5A059]/30 flex items-center gap-3">
                    <Sparkles className="w-8 h-8 text-[#C5A059] shrink-0" />
                    <div>
                      <p className="text-xs uppercase tracking-widest text-[#C5A059] font-semibold">
                        Hand-Checked Quality
                      </p>
                      <p className="text-xs text-[#FAF8F5]/80">
                        Checked for finish, stone setting and clasp strength.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-7 space-y-6">
                <span className="text-xs uppercase tracking-[0.24em] text-[#9E7B36] font-semibold">
                  {homepage.brandStory.eyebrow}
                </span>

                <h2 className="font-serif-luxury text-3xl sm:text-5xl font-semibold text-[#0D0D0D] leading-tight">
                  {homepage.brandStory.heading}
                </h2>

                <p className="text-base sm:text-lg text-[#0D0D0D]/85 font-medium leading-relaxed">
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
                        <span className="text-[11px] uppercase tracking-wider text-[#9E7B36] font-semibold block">
                          {h.label}
                        </span>
                        <h3 className="font-serif-luxury text-xl font-bold text-[#0D0D0D]">
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
                    className="inline-flex items-center gap-2 px-7 py-4 bg-[#0D0D0D] hover:bg-[#C5A059] text-[#FAF8F5] hover:text-[#0D0D0D] text-xs uppercase tracking-[0.2em] font-semibold rounded transition-colors"
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

      {/* I. Verified Customer Reviews */}
      {visibility.customerReviews && verifiedReviews.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
            <span className="text-xs uppercase tracking-[0.24em] text-[#9E7B36] font-semibold">
              Verified Collector Testimonials
            </span>
            <h2 className="font-serif-luxury text-3xl sm:text-4xl lg:text-5xl font-semibold text-[#0D0D0D]">
              Loved by Our Customers
            </h2>
            <p className="text-sm text-neutral-500">
              Genuine reviews submitted by verified MS Velora customers across Pakistan.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {verifiedReviews.slice(0, 4).map((rev) => {
              const prod =
                typeof rev.product === 'object' && rev.product !== null
                  ? (rev.product as Product)
                  : null;
              return (
                <div
                  key={rev._id}
                  className="bg-white p-6 rounded-xl border border-black/8 shadow-xs flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-0.5 text-[#C5A059]">
                        {Array.from({ length: rev.rating }).map((_, idx) => (
                          <Star key={idx} className="w-4 h-4 fill-current" />
                        ))}
                      </div>
                      {rev.verifiedPurchase && (
                        <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                          <CheckCircle2 className="w-3 h-3" /> Verified Buyer
                        </span>
                      )}
                    </div>

                    <h3 className="font-serif-luxury text-lg font-semibold text-[#0D0D0D]">
                      "{rev.title}"
                    </h3>

                    <p className="text-xs text-neutral-600 leading-relaxed line-clamp-4">
                      {rev.comment}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-neutral-100 space-y-2">
                    <p className="text-xs font-semibold text-[#0D0D0D]">{rev.userName}</p>
                    {prod && (
                      <Link
                        to={`/product/${prod.slug}`}
                        className="flex items-center gap-2.5 p-2 rounded bg-[#FAF8F5] hover:bg-[#F3EFE6] transition-colors"
                      >
                        <img
                          src={prod.mainImage}
                          alt={prod.name}
                          loading="lazy"
                          className="w-9 h-9 rounded object-cover shrink-0"
                        />
                        <span className="text-[11px] font-medium text-[#0D0D0D] line-clamp-1">
                          {prod.name}
                        </span>
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};

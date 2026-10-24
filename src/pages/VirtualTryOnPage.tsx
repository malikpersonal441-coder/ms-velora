import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Search, Sparkles, ShoppingBag, Heart, ExternalLink, FlaskConical, BadgeCheck } from 'lucide-react';
import { apiRequest, formatPrice } from '../lib/api';
import { sized } from '../lib/img';
import { useStore } from '../context/StoreContext';
import type { Product } from '../types';
import { KINDS, kindForProduct, kindInfo, type TryOnKind } from '../lib/tryon/kinds';
import { prepareJewel, type PreparedJewel } from '../lib/tryon/cutout';
import { TryOnStudio } from '../components/tryon/TryOnStudio';

const effectivePrice = (p: Product, variantSku?: string) => {
  const v = variantSku ? p.variants.find((x) => x.sku === variantSku) : undefined;
  const regular = v?.price && v.price > 0 ? v.price : p.price;
  const sale = v && v.salePrice !== undefined ? v.salePrice : p.salePrice;
  return { now: sale && sale > 0 && sale < regular ? sale : regular, was: sale && sale > 0 && sale < regular ? regular : null };
};

export const VirtualTryOnPage: React.FC = () => {
  const { settings, addToCart, toggleWishlist, isInWishlist } = useStore();
  const symbol = settings?.currencySymbol || 'Rs.';
  const [params, setParams] = useSearchParams();

  const [filter, setFilter] = useState<TryOnKind | 'all'>('all');
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selected, setSelected] = useState<Product | null>(null);
  const [variantSku, setVariantSku] = useState<string | undefined>();
  const [jewel, setJewel] = useState<PreparedJewel | null>(null);
  const [jewelLoading, setJewelLoading] = useState(false);
  const [jewelError, setJewelError] = useState('');

  useEffect(() => {
    document.title = 'Virtual Try-On — MS Velora';
  }, []);

  // Catalogue: the existing products API; pieces are sorted into try-on kinds on the client
  // because not every product has a category set
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError('');
    const q = query.trim();
    const t = window.setTimeout(() => {
      apiRequest(`/api/products?limit=48${q ? `&q=${encodeURIComponent(q)}` : ''}`)
        .then((r) => {
          if (cancelled) return;
          setProducts(((r.products || []) as Product[]).filter((p) => {
            const k = kindForProduct(p);
            return k && (filter === 'all' || k === filter);
          }));
        })
        .catch(() => !cancelled && setLoadError('We could not load the collection. Please refresh to try again.'))
        .finally(() => !cancelled && setLoading(false));
    }, q ? 300 : 0);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [filter, query]);

  // Deep link: /virtual-try-on?product=<slug>
  useEffect(() => {
    const slug = params.get('product');
    if (!slug || selected?.slug === slug) return;
    apiRequest(`/api/products/${encodeURIComponent(slug)}`)
      .then((r) => r.product && kindForProduct(r.product) && choose(r.product))
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const choose = (p: Product) => {
    setSelected(p);
    setVariantSku(p.variants?.length ? p.variants[0].sku : undefined);
    setParams({ product: p.slug }, { replace: true });
  };

  // Prepare the overlay image for the chosen piece
  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    setJewelLoading(true);
    setJewelError('');
    prepareJewel(selected.mainImage, selected.tryOnImage || undefined, kindForProduct(selected) === 'earrings')
      .then((j) => !cancelled && setJewel(j))
      .catch(() => {
        if (cancelled) return;
        setJewel(null);
        setJewelError('This piece’s image could not be prepared for try-on.');
      })
      .finally(() => !cancelled && setJewelLoading(false));
    return () => {
      cancelled = true;
    };
  }, [selected]);

  const selectedKind = selected ? kindForProduct(selected) : null;
  const selectedInfo = selectedKind ? kindInfo(selectedKind) : null;
  const price = useMemo(() => (selected ? effectivePrice(selected, variantSku) : null), [selected, variantSku]);
  const variant = selected?.variants.find((v) => v.sku === variantSku);
  const stock = variant ? variant.stock : selected?.stock ?? 0;

  return (
    <div className="bg-[#FAF8F5] min-h-screen">
      {/* Header */}
      <section className="relative overflow-hidden border-b border-[#C5A059]/20 bg-[radial-gradient(ellipse_at_50%_0%,rgba(197,160,89,0.16),transparent_60%)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <Link to="/shop" className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.18em] text-neutral-500 hover:text-[#9E7B36] font-semibold">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to the store
          </Link>
          <div className="mt-4 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-[#9E7B36] font-semibold">
                <Sparkles className="w-3.5 h-3.5" /> Virtual Try-On
              </span>
              <h1 className="mt-2 font-serif-luxury text-4xl sm:text-5xl font-semibold text-[#0D0D0D] leading-tight">See it on you</h1>
              <p className="mt-2 text-sm sm:text-base text-neutral-600 max-w-xl">
                Pick a piece and try it on live with your camera or a photo — right here in your browser.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-[11px]">
              {KINDS.map((k) => (
                <span key={k.kind} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${k.support === 'supported' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
                  {k.support === 'supported' ? <BadgeCheck className="w-3.5 h-3.5" /> : <FlaskConical className="w-3.5 h-3.5" />}
                  {k.label}: {k.support === 'supported' ? 'Supported' : 'Experimental'}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: selection */}
        <aside className="lg:col-span-4 xl:col-span-3 order-2 lg:order-1">
          <div className="lg:sticky lg:top-24 rounded-3xl bg-white border border-neutral-200/80 p-4 sm:p-5 shadow-sm">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search jewellery…"
                aria-label="Search jewellery"
                className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-[#C5A059] focus:ring-4 focus:ring-[#C5A059]/15"
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5" role="tablist" aria-label="Category">
              {[{ kind: 'all' as const, label: 'All' }, ...KINDS].map((k) => (
                <button
                  key={k.kind}
                  type="button"
                  role="tab"
                  aria-selected={filter === k.kind}
                  onClick={() => setFilter(k.kind)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                    filter === k.kind ? 'bg-[#0D0D0D] text-white border-[#0D0D0D]' : 'bg-white text-neutral-600 border-neutral-200 hover:border-[#C5A059]'
                  }`}
                >
                  {k.label}
                </button>
              ))}
            </div>

            <div className="mt-4 max-h-[60vh] lg:max-h-[calc(100vh-260px)] overflow-y-auto -mx-1 px-1 space-y-2">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-[72px] rounded-2xl bg-neutral-100 animate-pulse" />)
              ) : loadError ? (
                <p className="p-4 text-sm text-red-700 bg-red-50 rounded-xl">{loadError}</p>
              ) : products.length === 0 ? (
                <p className="p-6 text-center text-sm text-neutral-500">No matching pieces found.</p>
              ) : (
                products.map((p) => {
                  const k = kindForProduct(p)!;
                  const active = selected?._id === p._id;
                  const pr = effectivePrice(p);
                  return (
                    <button
                      key={p._id}
                      type="button"
                      onClick={() => choose(p)}
                      aria-pressed={active}
                      className={`w-full flex items-center gap-3 p-2 rounded-2xl border text-left transition-all ${
                        active ? 'border-[#C5A059] bg-[#C5A059]/10 ring-4 ring-[#C5A059]/10' : 'border-transparent hover:border-neutral-200 hover:bg-[#FAF8F5]'
                      }`}
                    >
                      <img src={sized(p.mainImage, 160)} alt="" loading="lazy" className="w-14 h-14 rounded-xl object-cover bg-[#F3EFE6] shrink-0" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-[#0D0D0D] truncate">{p.name}</span>
                        <span className="block text-xs font-mono-code text-neutral-600">{formatPrice(pr.now, symbol)}</span>
                        <span className={`mt-0.5 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${kindInfo(k).support === 'supported' ? 'text-emerald-700' : 'text-amber-700'}`}>
                          {kindInfo(k).support === 'supported' ? <BadgeCheck className="w-3 h-3" /> : <FlaskConical className="w-3 h-3" />}
                          {kindInfo(k).support === 'supported' ? 'Try-on ready' : 'Experimental'}
                        </span>
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </aside>

        {/* Main: studio + product */}
        <main className="lg:col-span-8 xl:col-span-9 order-1 lg:order-2 space-y-6">
          <TryOnStudio tryOnKind={selectedKind} jewel={jewel} jewelLoading={jewelLoading} />

          {selectedInfo && (
            <div className={`flex items-start gap-2.5 p-3.5 rounded-2xl text-sm ${selectedInfo.support === 'supported' ? 'bg-emerald-50 text-emerald-900' : 'bg-amber-50 text-amber-900'}`}>
              {selectedInfo.support === 'supported' ? <BadgeCheck className="w-4 h-4 shrink-0 mt-0.5" /> : <FlaskConical className="w-4 h-4 shrink-0 mt-0.5" />}
              <span>
                {selectedInfo.support === 'experimental' && <strong>Experimental: </strong>}
                {selectedInfo.howTo}
                {selectedInfo.support === 'experimental' && ' Placement is approximate — use drag and size to fine-tune.'}
              </span>
            </div>
          )}
          {jewelError && <p className="p-3.5 rounded-2xl bg-red-50 text-sm text-red-800" role="alert">{jewelError}</p>}
          {jewel && !jewel.clean && (
            <p className="p-3.5 rounded-2xl bg-neutral-100 text-sm text-neutral-700">
              This piece is photographed on a busy background, so the preview may show part of the backdrop. It’s a guide to size and placement.
            </p>
          )}

          {selected && price && (
            <section className="rounded-3xl bg-white border border-neutral-200/80 p-5 sm:p-6 flex flex-col sm:flex-row gap-5">
              <img src={sized(selected.mainImage, 400)} alt={selected.name} className="w-full sm:w-40 h-48 sm:h-40 rounded-2xl object-cover bg-[#F3EFE6]" />
              <div className="flex-1 min-w-0 space-y-3">
                <div>
                  <span className="text-[11px] uppercase tracking-[0.2em] text-[#9E7B36] font-semibold">{selectedInfo?.label}</span>
                  <h2 className="font-serif-luxury text-2xl sm:text-3xl font-semibold text-[#0D0D0D] leading-tight">{selected.name}</h2>
                </div>
                <div className="flex items-baseline gap-3">
                  <span className="font-mono-code text-xl font-bold text-[#0D0D0D]">{formatPrice(price.now, symbol)}</span>
                  {price.was && <span className="price-was font-mono-code text-sm text-neutral-400">{formatPrice(price.was, symbol)}</span>}
                  <span className={`ml-auto text-[11px] uppercase tracking-wider font-semibold ${stock > 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                    {stock > 0 ? 'In stock' : 'Sold out'}
                  </span>
                </div>
                {(selected.shortDescription || selected.description) && (
                  <p className="text-sm text-neutral-600 line-clamp-2">{selected.shortDescription || selected.description}</p>
                )}
                {selected.variants.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selected.variants.map((v) => (
                      <button
                        key={v.sku}
                        type="button"
                        onClick={() => setVariantSku(v.sku)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${variantSku === v.sku ? 'bg-[#0D0D0D] text-white border-[#0D0D0D]' : 'border-neutral-200 text-neutral-600 hover:border-[#C5A059]'}`}
                      >
                        {v.name}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    disabled={stock <= 0}
                    onClick={() => addToCart(selected, 1, variantSku, true)}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#0D0D0D] hover:bg-[#C5A059] text-white hover:text-[#0D0D0D] text-xs uppercase tracking-[0.14em] font-bold transition-colors disabled:opacity-40"
                  >
                    <ShoppingBag className="w-4 h-4" /> {stock > 0 ? 'Add to Bag' : 'Sold Out'}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleWishlist(selected)}
                    aria-pressed={isInWishlist(selected._id)}
                    className="inline-flex items-center gap-2 px-4 py-3 rounded-xl border border-neutral-200 hover:border-[#C5A059] text-xs uppercase tracking-[0.14em] font-semibold"
                  >
                    <Heart className={`w-4 h-4 ${isInWishlist(selected._id) ? 'fill-[#C5A059] text-[#C5A059]' : ''}`} />
                    {isInWishlist(selected._id) ? 'Saved' : 'Wishlist'}
                  </button>
                  <Link
                    to={`/product/${selected.slug}`}
                    className="inline-flex items-center gap-2 px-4 py-3 rounded-xl text-xs uppercase tracking-[0.14em] font-semibold text-neutral-600 hover:bg-neutral-100"
                  >
                    View Product <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </section>
          )}
          {!selected && !loading && products.length > 0 && (
            <p className="text-sm text-neutral-500">
              Choose a piece from the list to start trying it on.
            </p>
          )}
        </main>
      </div>
    </div>
  );
};

export default VirtualTryOnPage;

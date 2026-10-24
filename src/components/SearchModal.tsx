import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, X, ArrowRight, Gem, Clock, Loader2, LayoutGrid } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { apiRequest, formatPrice } from '../lib/api';
import { sized } from '../lib/img';
import type { Product } from '../types';

const RECENT_KEY = 'msv_recent_searches_v1';
const readRecent = (): string[] => {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string').slice(0, 6) : [];
  } catch {
    return [];
  }
};
const normalise = (q: string) => q.replace(/\s+/g, ' ').trim();

type Option =
  | { kind: 'product'; product: Product }
  | { kind: 'category'; name: string; slug: string }
  | { kind: 'all' }
  | { kind: 'recent'; term: string };

/** Search overlay: debounced live suggestions, categories, recent searches and full keyboard control. */
export const SearchModal: React.FC = () => {
  const { isSearchOpen, setIsSearchOpen, settings, categories } = useStore();
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [cats, setCats] = useState<{ name: string; slug: string }[]>([]);
  const [fuzzy, setFuzzy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [recent, setRecent] = useState<string[]>(readRecent);
  const [active, setActive] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const symbol = settings?.currencySymbol || 'Rs.';
  const q = normalise(query);

  useEffect(() => {
    if (!isSearchOpen) {
      setQuery('');
      setProducts([]);
      setCats([]);
      setActive(-1);
      return;
    }
    setRecent(readRecent());
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setIsSearchOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isSearchOpen, setIsSearchOpen]);

  // Debounced suggestions; an older response never overwrites a newer query's results
  useEffect(() => {
    setActive(-1);
    if (q.length < 2) {
      setProducts([]);
      setCats([]);
      setFailed(false);
      setLoading(false);
      return;
    }
    let stale = false;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await apiRequest(`/api/products/suggest?q=${encodeURIComponent(q)}`);
        if (stale) return;
        setProducts(res.products || []);
        setCats(res.categories || []);
        setFuzzy(Boolean(res.fuzzy));
        setFailed(false);
      } catch {
        if (!stale) setFailed(true);
      } finally {
        if (!stale) setLoading(false);
      }
    }, 250);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [q]);

  const remember = (term: string) => {
    const next = [term, ...recent.filter((t) => t.toLowerCase() !== term.toLowerCase())].slice(0, 6);
    setRecent(next);
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
      // ignore storage errors
    }
  };

  const go = (path: string) => {
    setIsSearchOpen(false);
    navigate(path);
  };
  const seeAll = (term = q) => {
    if (!term) return;
    remember(term);
    go(`/search?q=${encodeURIComponent(term)}`);
  };

  const options: Option[] =
    q.length >= 2
      ? [
          ...products.map((product) => ({ kind: 'product' as const, product })),
          ...cats.map((c) => ({ kind: 'category' as const, name: c.name, slug: c.slug })),
          ...(products.length ? [{ kind: 'all' as const }] : []),
        ]
      : recent.map((term) => ({ kind: 'recent' as const, term }));

  const choose = (o: Option) => {
    if (o.kind === 'product') {
      remember(q);
      go(`/product/${o.product.slug}`);
    } else if (o.kind === 'category') go(`/shop?category=${o.slug}`);
    else if (o.kind === 'recent') seeAll(o.term);
    else seeAll();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (options.length ? (i + 1) % options.length : -1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (options.length ? (i <= 0 ? options.length - 1 : i - 1) : -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (active >= 0 && options[active]) choose(options[active]);
      else seeAll();
    }
  };

  const optId = (i: number) => `search-opt-${i}`;
  const rowCls = (i: number) =>
    `w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-colors ${active === i ? 'bg-[#C5A059]/15' : 'hover:bg-[#FAF8F5]'}`;

  return (
    <AnimatePresence>
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center sm:pt-24 sm:px-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-[#0D0D0D]/70 backdrop-blur-sm" onClick={() => setIsSearchOpen(false)} />
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
            className="relative z-10 w-full sm:max-w-2xl h-[100dvh] sm:h-auto bg-white sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-label="Search jewellery"
          >
            <form
              role="search"
              onSubmit={(e) => {
                e.preventDefault();
                seeAll();
              }}
              className="flex items-center gap-3 border-b border-neutral-200 px-4 sm:px-5 py-4"
            >
              <Search className="w-5 h-5 text-[#9E7B36] shrink-0" />
              <input
                ref={inputRef}
                type="search"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Search necklaces, earrings, rings…"
                aria-label="Search jewellery"
                role="combobox"
                aria-expanded={options.length > 0}
                aria-controls="search-options"
                aria-activedescendant={active >= 0 ? optId(active) : undefined}
                aria-autocomplete="list"
                maxLength={80}
                className="w-full text-base text-[#0D0D0D] placeholder:text-neutral-400 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
              />
              {loading && <Loader2 className="w-4 h-4 text-neutral-400 animate-spin shrink-0" aria-label="Searching" />}
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    inputRef.current?.focus();
                  }}
                  className="text-xs font-semibold text-neutral-500 hover:text-[#0D0D0D] shrink-0"
                >
                  Clear
                </button>
              )}
              <button type="button" onClick={() => setIsSearchOpen(false)} className="p-1.5 text-neutral-400 hover:text-[#0D0D0D] shrink-0" aria-label="Close search">
                <X className="w-5 h-5" />
              </button>
            </form>

            <div id="search-options" role="listbox" aria-label="Search suggestions" className="p-3 sm:p-4 flex-1 sm:max-h-[65vh] overflow-y-auto">
              {q.length < 2 ? (
                <div className="space-y-5 p-1">
                  {recent.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-neutral-400 font-semibold">Recent searches</p>
                        <button
                          type="button"
                          onClick={() => {
                            setRecent([]);
                            try {
                              localStorage.removeItem(RECENT_KEY);
                            } catch {
                              // ignore
                            }
                          }}
                          className="text-[11px] font-semibold text-neutral-400 hover:text-[#0D0D0D]"
                        >
                          Clear
                        </button>
                      </div>
                      {recent.map((term, i) => (
                        <button key={term} id={optId(i)} role="option" aria-selected={active === i} type="button" onClick={() => seeAll(term)} className={rowCls(i)}>
                          <Clock className="w-4 h-4 text-neutral-400 shrink-0" />
                          <span className="text-sm text-[#0D0D0D] truncate">{term}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {categories.length > 0 && (
                    <div>
                      <p className="mb-2 text-[11px] uppercase tracking-[0.2em] text-neutral-400 font-semibold">Browse by category</p>
                      <div className="flex flex-wrap gap-2">
                        {categories.map((c) => (
                          <button
                            key={c._id}
                            type="button"
                            onClick={() => go(`/shop?category=${c.slug}`)}
                            className="px-3.5 py-1.5 rounded-full border border-neutral-200 hover:border-[#C5A059] text-xs font-medium text-[#0D0D0D] transition-colors"
                          >
                            {c.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : failed ? (
                <p className="py-10 text-center text-sm text-neutral-600">Search is unavailable right now. Press Enter to try the full results page.</p>
              ) : !loading && products.length === 0 && cats.length === 0 ? (
                <div className="py-10 text-center space-y-2">
                  <Gem className="w-8 h-8 text-neutral-300 mx-auto" />
                  <p className="text-sm font-medium text-neutral-700">Nothing matched “{q}”</p>
                  <p className="text-xs text-neutral-500">Try a shorter word, like necklace, earrings or pearl.</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {fuzzy && products.length > 0 && <p className="px-2 pb-1 text-xs text-neutral-500">Showing close matches for “{q}”</p>}
                  {products.map((p, i) => {
                    const sale = p.salePrice && p.salePrice > 0 && p.salePrice < p.price ? p.salePrice : null;
                    const cat = typeof p.category === 'object' && p.category ? p.category.name : '';
                    return (
                      <button key={p._id} id={optId(i)} role="option" aria-selected={active === i} type="button" onClick={() => choose({ kind: 'product', product: p })} className={rowCls(i)}>
                        <img src={sized(p.mainImage, 120)} alt="" loading="lazy" className="w-12 h-12 rounded-lg object-cover bg-[#F3EFE6] shrink-0" />
                        <span className="flex-1 min-w-0">
                          {cat && <span className="block text-[10px] uppercase tracking-wider text-[#9E7B36] font-semibold">{cat}</span>}
                          <span className="block font-serif-luxury text-base font-semibold text-[#0D0D0D] truncate">{p.name}</span>
                          {p.stock <= 0 && <span className="block text-[11px] text-red-600">Out of stock</span>}
                        </span>
                        <span className="text-right shrink-0">
                          <span className="block font-mono-code text-sm font-bold text-[#0D0D0D]">{formatPrice(sale ?? p.price, symbol)}</span>
                          {sale && <span className="price-was font-mono-code text-[11px] text-neutral-400">{formatPrice(p.price, symbol)}</span>}
                        </span>
                      </button>
                    );
                  })}
                  {cats.map((c, j) => {
                    const i = products.length + j;
                    return (
                      <button key={c.slug} id={optId(i)} role="option" aria-selected={active === i} type="button" onClick={() => choose({ kind: 'category', name: c.name, slug: c.slug })} className={rowCls(i)}>
                        <span className="w-12 h-12 rounded-lg bg-[#FAF8F5] text-[#9E7B36] flex items-center justify-center shrink-0">
                          <LayoutGrid className="w-5 h-5" />
                        </span>
                        <span className="text-sm text-neutral-700">
                          All <strong className="text-[#0D0D0D]">{c.name}</strong>
                        </span>
                      </button>
                    );
                  })}
                  {products.length > 0 && (
                    <button
                      id={optId(options.length - 1)}
                      role="option"
                      aria-selected={active === options.length - 1}
                      type="button"
                      onClick={() => seeAll()}
                      className={`${rowCls(options.length - 1)} justify-center mt-1 border border-neutral-200 text-sm font-semibold text-[#9E7B36]`}
                    >
                      See all results for “{q}” <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

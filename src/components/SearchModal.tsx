import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, X, ArrowRight, Gem } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { apiRequest, formatPrice } from '../lib/api';
import { Product } from '../types';

export const SearchModal: React.FC = () => {
  const { isSearchOpen, setIsSearchOpen, settings } = useStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const symbol = settings?.currencySymbol || 'Rs.';

  useEffect(() => {
    if (!isSearchOpen) {
      setQuery('');
      setResults([]);
      return;
    }
  }, [isSearchOpen]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await apiRequest(`/api/products?q=${encodeURIComponent(trimmed)}&limit=6`);
        if (res.success) {
          setResults(res.products || []);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }, 220);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setIsSearchOpen(false);
    navigate(`/shop?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <AnimatePresence>
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/75 backdrop-blur-xs"
            onClick={() => setIsSearchOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="relative z-10 w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-[#C5A059]/30 overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Search jewellery"
          >
            <form onSubmit={handleSubmit} className="relative flex items-center border-b border-neutral-200 bg-white px-5 py-4">
              <Search className="w-5 h-5 text-[#9E7B36] shrink-0" />
              <input
                type="text"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search necklaces, earrings, rings..."
                className="w-full px-4 text-sm sm:text-base text-[#0D0D0D] placeholder:text-neutral-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setIsSearchOpen(false)}
                className="p-1.5 text-neutral-400 hover:text-[#0D0D0D]"
                aria-label="Close search"
              >
                <X className="w-5 h-5" />
              </button>
            </form>

            <div className="p-5 max-h-[65vh] overflow-y-auto">
              {query.trim().length < 2 ? (
                <div className="space-y-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-neutral-400 font-semibold">
                    Popular Searches
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      'Automatic',
                      'Earrings',
                      'Aurelius',
                      'Champagne Gold',
                      'Skeleton',
                      'Diver 200M',
                      'Mother-of-Pearl',
                      'Titanium',
                    ].map((term) => (
                      <button
                        key={term}
                        type="button"
                        onClick={() => setQuery(term)}
                        className="px-3.5 py-1.5 rounded-full bg-white border border-neutral-200 hover:border-[#C5A059] text-xs font-medium text-[#0D0D0D] transition-colors"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              ) : loading ? (
                <div className="py-8 text-center text-xs uppercase tracking-widest text-neutral-500">
                  Searching the MS Velora Vault...
                </div>
              ) : results.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <Gem className="w-8 h-8 text-neutral-400 mx-auto" />
                  <p className="text-sm font-medium text-neutral-700">
                    Nothing matched "{query}"
                  </p>
                  <p className="text-xs text-neutral-500">
                    Try searching for Necklace, Earrings, Pearl or Bridal.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-neutral-500">
                    <span>Matching Jewellery</span>
                    <button
                      type="button"
                      onClick={handleSubmit}
                      className="text-[#9E7B36] hover:underline font-semibold inline-flex items-center gap-1"
                    >
                      <span>View all results</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="divide-y divide-neutral-200 bg-white rounded-lg border border-black/5">
                    {results.map((prod) => (
                      <Link
                        key={prod._id}
                        to={`/product/${prod.slug}`}
                        onClick={() => setIsSearchOpen(false)}
                        className="flex items-center gap-4 p-3 hover:bg-[#FAF8F5] transition-colors"
                      >
                        <img
                          src={prod.mainImage}
                          alt={prod.name}
                          className="w-14 h-14 rounded object-cover bg-[#F3EFE6] shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] uppercase tracking-wider text-[#9E7B36] font-semibold">
                            {typeof prod.category === 'object' && prod.category?.name
                              ? prod.category.name
                              : prod.specifications?.movement || prod.model || 'Fine Jewellery'}
                          </p>
                          <h4 className="font-serif-luxury text-base font-semibold text-[#0D0D0D] truncate">
                            {prod.name}
                          </h4>
                          <p className="text-xs text-neutral-500">
                            {prod.specifications?.movement} • {prod.specifications?.caseMaterial}
                          </p>
                        </div>
                        <div className="text-right font-mono-code text-sm font-bold text-[#0D0D0D]">
                          {formatPrice(prod.salePrice || prod.price, symbol)}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

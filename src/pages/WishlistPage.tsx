import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingBag, Trash2, ArrowRight, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatPrice } from '../lib/api';
import { sized } from '../lib/img';
import type { Product } from '../types';

const pricing = (p: Product) => {
  const sale = p.salePrice && p.salePrice > 0 && p.salePrice < p.price ? p.salePrice : null;
  return { now: sale ?? p.price, was: sale ? p.price : null };
};

/** /wishlist — saved pieces with live price and stock, add-to-bag, remove and clear-all. */
export const WishlistPage: React.FC = () => {
  const { wishlistProducts, wishlistIds, wishlistLoading, toggleWishlist, clearWishlist, addToCart, settings } = useStore();
  const symbol = settings?.currencySymbol || 'Rs.';
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    document.title = `Wishlist (${wishlistIds.length}) — MS Velora`;
  }, [wishlistIds.length]);

  useEffect(() => {
    if (!confirmClear) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setConfirmClear(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [confirmClear]);

  // Saved ids whose product data is still loading
  const pending = wishlistLoading && wishlistProducts.length < wishlistIds.length;

  return (
    <div className="bg-[#FAF8F5] min-h-[70vh]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pb-24">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <span className="text-[11px] uppercase tracking-[0.28em] text-[#9E7B36] font-semibold">Saved for later</span>
            <h1 className="mt-1 font-serif-luxury text-4xl sm:text-5xl font-semibold text-[#0D0D0D]">
              Your Wishlist <span className="text-neutral-400 font-normal">({wishlistIds.length})</span>
            </h1>
            <p className="mt-1 text-sm text-neutral-500">Saved on this device. Prices and stock are always current.</p>
          </div>
          {wishlistIds.length > 0 && (
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs uppercase tracking-[0.14em] font-semibold text-neutral-600 hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" /> Clear all
            </button>
          )}
        </div>

        {pending && wishlistProducts.length === 0 ? (
          <div className="space-y-3" aria-busy="true" aria-label="Loading your wishlist">
            {wishlistIds.slice(0, 4).map((id) => (
              <div key={id} className="h-32 rounded-2xl bg-white border border-neutral-200/80 animate-pulse" />
            ))}
          </div>
        ) : wishlistProducts.length === 0 ? (
          <div className="bg-white p-12 sm:p-16 rounded-3xl border border-neutral-200/80 text-center">
            <span className="w-16 h-16 mx-auto rounded-full bg-[#C5A059]/15 text-[#9E7B36] flex items-center justify-center">
              <Heart className="w-7 h-7" />
            </span>
            <h2 className="mt-5 font-serif-luxury text-3xl font-semibold">Your wishlist is empty</h2>
            <p className="mt-2 text-sm text-neutral-500 max-w-md mx-auto">Tap the heart on any piece to save it here and come back to it any time.</p>
            <Link
              to="/shop"
              className="mt-7 inline-flex items-center gap-2 px-7 py-4 rounded-xl bg-[#0D0D0D] hover:bg-[#C5A059] text-white hover:text-[#0D0D0D] text-xs uppercase tracking-[0.2em] font-bold transition-colors"
            >
              Shop Now <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {wishlistProducts.map((p) => {
              const { now, was } = pricing(p);
              const inStock = p.stock > 0;
              const low = inStock && p.stock <= (p.lowStockThreshold || 3);
              const hasVariants = p.variants?.length > 0;
              return (
                <li key={p._id} className="flex gap-4 sm:gap-5 p-3 sm:p-4 rounded-2xl bg-white border border-neutral-200/80">
                  <Link to={`/product/${p.slug}`} className="shrink-0">
                    <img src={sized(p.mainImage, 240)} alt={p.name} loading="lazy" className="w-24 h-24 sm:w-32 sm:h-32 rounded-xl object-cover bg-[#F3EFE6]" />
                  </Link>
                  <div className="flex-1 min-w-0 flex flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link to={`/product/${p.slug}`} className="font-serif-luxury text-lg sm:text-xl font-semibold text-[#0D0D0D] hover:text-[#9E7B36] leading-snug line-clamp-2">
                          {p.name}
                        </Link>
                        <p className="mt-1 flex items-baseline gap-2">
                          <span className="font-mono-code font-bold text-[#0D0D0D]">{formatPrice(now, symbol)}</span>
                          {was && <span className="price-was font-mono-code text-xs text-neutral-400">{formatPrice(was, symbol)}</span>}
                        </p>
                        <p className={`mt-1 text-[11px] uppercase tracking-wider font-semibold ${!inStock ? 'text-red-600' : low ? 'text-amber-700' : 'text-emerald-700'}`}>
                          {!inStock ? 'Out of stock' : low ? `Only ${p.stock} left` : 'In stock'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleWishlist(p)}
                        aria-label={`Remove ${p.name} from wishlist`}
                        className="w-9 h-9 rounded-full flex items-center justify-center text-neutral-400 hover:text-red-600 hover:bg-red-50 shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="mt-auto pt-3 flex flex-wrap gap-2">
                      {hasVariants ? (
                        <Link
                          to={`/product/${p.slug}`}
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0D0D0D] hover:bg-[#C5A059] text-white hover:text-[#0D0D0D] text-[11px] uppercase tracking-[0.14em] font-bold transition-colors"
                        >
                          Choose option
                        </Link>
                      ) : (
                        <button
                          type="button"
                          disabled={!inStock}
                          onClick={() => addToCart(p, 1, undefined, true)}
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0D0D0D] hover:bg-[#C5A059] text-white hover:text-[#0D0D0D] text-[11px] uppercase tracking-[0.14em] font-bold transition-colors disabled:opacity-40 disabled:hover:bg-[#0D0D0D] disabled:hover:text-white"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" /> {inStock ? 'Add to Bag' : 'Sold Out'}
                        </button>
                      )}
                      <Link
                        to={`/product/${p.slug}`}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-neutral-200 hover:border-[#C5A059] text-[11px] uppercase tracking-[0.14em] font-semibold"
                      >
                        View Product
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {confirmClear && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-[#0D0D0D]/60 backdrop-blur-sm" onClick={() => setConfirmClear(false)}>
          <div role="alertdialog" aria-modal="true" aria-labelledby="clear-wishlist-title" onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl text-center">
            <span className="w-12 h-12 mx-auto rounded-full bg-red-50 text-red-600 flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </span>
            <h2 id="clear-wishlist-title" className="mt-4 font-serif-luxury text-2xl font-semibold">Clear your wishlist?</h2>
            <p className="mt-1.5 text-sm text-neutral-600">
              All {wishlistIds.length} saved {wishlistIds.length === 1 ? 'piece' : 'pieces'} will be removed. This can’t be undone.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-2">
              <button type="button" autoFocus onClick={() => setConfirmClear(false)} className="py-3 rounded-xl border border-neutral-200 text-sm font-semibold hover:bg-neutral-50">
                Keep them
              </button>
              <button
                type="button"
                onClick={() => {
                  clearWishlist();
                  setConfirmClear(false);
                }}
                className="py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold"
              >
                Clear all
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WishlistPage;

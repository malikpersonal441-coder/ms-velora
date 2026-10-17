import React, { useRef, useState } from 'react';
import { sized, srcSet } from '../lib/img';
import { Link } from 'react-router-dom';
import { Heart, Eye, ShoppingBag, Star, Check } from 'lucide-react';
import { Product } from '../types';
import { formatProductPrice } from '../lib/api';
import { useStore } from '../context/StoreContext';
import { flyToCart } from '../lib/flyToCart';
import { Reveal } from './Reveal';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const {
    addToCart,
    toggleWishlist,
    isInWishlist,
    setQuickViewProduct,
    settings,
  } = useStore();

  const symbol = settings?.currencySymbol || 'Rs.';
  const wished = isInWishlist(product._id);
  const hasSale =
    product.salePrice !== null &&
    product.salePrice !== undefined &&
    product.salePrice > 0 &&
    product.salePrice < product.price;
  const discountPercent = hasSale
    ? Math.round(((product.price - (product.salePrice as number)) / product.price) * 100)
    : 0;

  const isOutOfStock = product.stock <= 0;
  const isLowStock =
    !isOutOfStock && product.stock <= (product.lowStockThreshold || 5);

  const cardRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [addState, setAddState] = useState<'idle' | 'flying' | 'added'>('idle');
  const altImage = product.images?.find((im) => im.url && im.url !== product.mainImage)?.url;

  const handleAdd = async () => {
    if (isOutOfStock || addState !== 'idle') return;
    setAddState('flying');
    await flyToCart(imgRef.current);
    addToCart(product, 1, undefined, false);
    setAddState('added');
    setTimeout(() => setAddState('idle'), 1600);
  };

  // Subtle 3D tilt + light-follow on hover (mouse only)
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse' || !cardRef.current) return;
    const r = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    cardRef.current.style.setProperty('--rx', `${(0.5 - y) * 6}deg`);
    cardRef.current.style.setProperty('--ry', `${(x - 0.5) * 8}deg`);
    cardRef.current.style.setProperty('--mx', `${x * 100}%`);
    cardRef.current.style.setProperty('--my', `${y * 100}%`);
  };
  const onLeave = () => {
    cardRef.current?.style.setProperty('--rx', '0deg');
    cardRef.current?.style.setProperty('--ry', '0deg');
  };

  return (
    <Reveal className="h-full">
    <div
      ref={cardRef}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className="lux-card group h-full bg-white border border-[#0D0D0D]/8 rounded-lg overflow-hidden flex flex-col hover:border-[#C5A059]/60"
    >
      {/* Image Container */}
      <div className="relative aspect-square bg-[#F3EFE6] overflow-hidden">
        <Link to={`/product/${product.slug}`} className="block w-full h-full">
          <img
            ref={imgRef}
            src={sized(product.mainImage, 420)}
            srcSet={srcSet(product.mainImage, 420)}
            decoding="async"
            alt={product.name}
            loading="lazy"
            width={400}
            height={500}
            className={`w-full h-full object-cover object-center transition-all duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110 ${altImage ? 'group-hover:opacity-0' : ''}`}
          />
          {altImage && (
            <img
              src={sized(altImage, 420)}
              decoding="async"
              alt=""
              aria-hidden
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover opacity-0 scale-105 transition-all duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:opacity-100 group-hover:scale-100"
            />
          )}
          <span className="lux-sheen" aria-hidden />
        </Link>

        {/* Top Left Badges */}
        <div className="absolute top-2 left-2 sm:top-3 sm:left-3 flex flex-col gap-1 z-10 pointer-events-none scale-90 sm:scale-100 origin-top-left">
          {isOutOfStock ? (
            <span className="px-2.5 py-1 bg-[#0D0D0D] text-[#FAF8F5] text-[10px] font-semibold uppercase tracking-[0.16em] rounded">
              Sold Out
            </span>
          ) : (
            <>
              {product.bestSeller && (
                <span className="px-2.5 py-1 bg-[#0D0D0D] text-[#C5A059] border border-[#C5A059]/40 text-[10px] font-semibold uppercase tracking-[0.15em] rounded">
                  Best Seller
                </span>
              )}
              {product.newArrival && !product.bestSeller && (
                <span className="px-2.5 py-1 bg-[#1A1A1E] text-[#FAF8F5] text-[10px] font-semibold uppercase tracking-[0.15em] rounded">
                  New Arrival
                </span>
              )}
              {hasSale && (
                <span className="px-2.5 py-1 bg-[#C5A059] text-[#0D0D0D] text-[10px] font-bold uppercase tracking-[0.14em] rounded">
                  Save {discountPercent}%
                </span>
              )}
            </>
          )}
        </div>

        {/* Top Right Quick Actions */}
        <div className="absolute top-2 right-2 sm:top-3 sm:right-3 flex flex-col gap-1.5 z-10">
          <button
            type="button"
            onClick={() => toggleWishlist(product)}
            aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-sm ${
              wished
                ? 'bg-[#0D0D0D] text-[#C5A059]'
                : 'bg-white/90 text-[#0D0D0D] hover:bg-[#0D0D0D] hover:text-[#C5A059]'
            }`}
          >
            <Heart key={String(wished)} className={`w-4 h-4 ${wished ? 'fill-current heart-beat' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => setQuickViewProduct(product)}
            aria-label={`Quick view ${product.name}`}
            className="w-8 h-8 rounded-full bg-white/90 text-[#0D0D0D] hover:bg-[#0D0D0D] hover:text-[#C5A059] flex items-center justify-center transition-all shadow-sm"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Add Overlay Bar */}
        <div
          className={`absolute inset-x-3 bottom-3 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] z-10 ${
            addState !== 'idle'
              ? 'translate-y-0 opacity-100'
              : 'translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100'
          }`}
        >
          <button
            type="button"
            disabled={isOutOfStock}
            onClick={handleAdd}
            aria-live="polite"
            className={`w-full py-2 px-2 sm:px-4 rounded text-[10px] sm:text-xs uppercase tracking-[0.12em] sm:tracking-[0.16em] font-semibold flex items-center justify-center gap-2 transition-all duration-300 shadow-md active:scale-[0.97] ${
              isOutOfStock
                ? 'bg-neutral-400 text-white cursor-not-allowed'
                : addState === 'added'
                ? 'bg-[#C5A059] text-[#0D0D0D]'
                : 'bg-[#0D0D0D]/95 hover:bg-[#C5A059] text-[#FAF8F5] hover:text-[#0D0D0D] backdrop-blur'
            }`}
          >
            {addState === 'added' ? (
              <Check className="w-3.5 h-3.5 badge-pop" />
            ) : (
              <ShoppingBag className={`w-3.5 h-3.5 ${addState === 'flying' ? 'animate-bounce' : ''}`} />
            )}
            <span>
              {isOutOfStock
                ? 'Out of Stock'
                : addState === 'flying'
                ? 'Adding…'
                : addState === 'added'
                ? 'Added to Bag'
                : 'Add to Bag'}
            </span>
          </button>
        </div>
      </div>

      {/* Product Info */}
      <div className="p-3 sm:p-3.5 flex-1 flex flex-col justify-between space-y-2.5">
        <div>
          <div className="flex items-center justify-between gap-2 text-[11px] uppercase tracking-[0.18em] text-[#9E7B36] font-semibold">
            <span className="truncate">{product.brand}</span>
            <span className="text-neutral-500 font-mono-code text-[10px]">
              {product.specifications?.movement || 'Jewellery'}
            </span>
          </div>

          <Link
            to={`/product/${product.slug}`}
            className="mt-1 block font-serif-luxury text-[15px] sm:text-lg font-semibold text-[#0D0D0D] group-hover:text-[#9E7B36] transition-colors line-clamp-2 leading-snug min-h-[2.75em]"
          >
            {product.name}
          </Link>

          <p className="mt-1 text-xs text-neutral-500 line-clamp-1">
            {product.specifications?.caseMaterial || 'Gold Plated'} •{' '}
            {product.specifications?.crystal || 'Cubic Zirconia'}
          </p>
        </div>

        <div className="pt-2 border-t border-neutral-100 flex items-end justify-between gap-2">
          <div>
            {hasSale ? (
              <div className="flex flex-col">
                <span className="text-xs text-neutral-400 line-through font-mono-code">
                  {formatProductPrice(product.price, symbol)}
                </span>
                <span className="text-[13px] sm:text-sm font-bold text-[#0D0D0D] font-mono-code">
                  {formatProductPrice(product.salePrice, symbol)}
                </span>
              </div>
            ) : (
              <span className="text-[13px] sm:text-sm font-bold text-[#0D0D0D] font-mono-code">
                {formatProductPrice(product.price, symbol)}
              </span>
            )}
          </div>

          <div className="flex flex-col items-end">
            {product.reviewCount > 0 && (
              <div className="flex items-center gap-1 text-xs text-amber-600">
                <Star className="w-3.5 h-3.5 fill-current text-[#C5A059]" />
                <span className="font-semibold text-[#0D0D0D]">
                  {product.averageRating.toFixed(1)}
                </span>
                <span className="text-neutral-400">({product.reviewCount})</span>
              </div>
            )}

            <span
              className={`text-[10px] font-medium uppercase tracking-wider mt-0.5 ${
                isOutOfStock
                  ? 'text-red-600'
                  : isLowStock
                  ? 'text-amber-700'
                  : 'text-emerald-700'
              }`}
            >
              {isOutOfStock
                ? 'Out of Stock'
                : isLowStock
                ? `Only ${product.stock} left`
                : 'In Stock'}
            </span>
          </div>
        </div>
      </div>
    </div>
    </Reveal>
  );
};

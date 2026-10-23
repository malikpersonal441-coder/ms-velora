import React, { useRef, useState, memo } from 'react';
import { sized, srcSet } from '../lib/img';
import { Link } from 'react-router-dom';
import { ShoppingBag, Star, Check, Eye } from 'lucide-react';
import { Product } from '../types';
import { formatProductPrice } from '../lib/api';
import { useStore } from '../context/StoreContext';
import { flyToCart } from '../lib/flyToCart';
import { Reveal } from './Reveal';

interface ProductCardProps {
  product: Product;
}

const ProductCardComponent: React.FC<ProductCardProps> = ({ product }) => {
  const {
    addToCart,
    settings,
    setQuickViewProduct,
  } = useStore();

  const symbol = settings?.currencySymbol || 'Rs.';
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
    cardRef.current.style.setProperty('--rx', `${(0.5 - y) * 4}deg`);
    cardRef.current.style.setProperty('--ry', `${(x - 0.5) * 6}deg`);
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
      style={{ willChange: 'transform' }}
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
            onError={(e) => {
              const target = e.currentTarget;
              if (!target.src.includes('/brand/logo.jpg')) {
                target.src = '/brand/logo.jpg';
              }
            }}
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

        {/* Top Right Quick View Modal Button */}
        <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-10">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setQuickViewProduct(product);
            }}
            className="w-8 h-8 rounded-full bg-white/95 hover:bg-[#C5A059] text-[#0D0D0D] hover:text-white flex items-center justify-center transition-all shadow-md backdrop-blur-xs group/viewBtn hover:scale-110"
            title="Quick View in Modal"
            aria-label={`Quick view ${product.name}`}
          >
            <Eye className="w-4 h-4 text-neutral-700 group-hover/viewBtn:text-white transition-colors" />
          </button>
        </div>

        {/* Top Left Badges */}
        <div className="absolute top-2 left-2 sm:top-3 sm:left-3 flex flex-col gap-1 z-10 pointer-events-none scale-90 sm:scale-100 origin-top-left">
          {isOutOfStock ? (
            <span className="px-2.5 py-1 bg-[#0D0D0D] text-[#FAF8F5] text-[10px] font-semibold uppercase tracking-[0.16em] rounded">
              Sold Out
            </span>
          ) : (
            <>
              {product.newArrival && (
                <span className="px-2.5 py-1 bg-[#1A1A1E] text-[#FAF8F5] text-[10px] font-semibold uppercase tracking-[0.15em] rounded">
                  New Arrival
                </span>
              )}
              {hasSale && discountPercent > 0 && (
                <span className="px-2.5 py-1 bg-[#C5A059] text-[#0D0D0D] text-[11px] font-black uppercase tracking-wider rounded shadow-md border border-[#9E7B36]/30">
                  {discountPercent}% OFF
                </span>
              )}
            </>
          )}
        </div>



        {/* Quick Add Overlay Bar */}
        <div
          className={`absolute inset-x-2.5 sm:inset-x-3 bottom-2.5 sm:bottom-3 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] z-10 ${
            addState !== 'idle'
              ? 'translate-y-0 opacity-100'
              : 'translate-y-0 opacity-100 sm:translate-y-4 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100 sm:group-focus-within:translate-y-0 sm:group-focus-within:opacity-100'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setQuickViewProduct(product);
              }}
              className="py-2 px-2.5 rounded bg-white/90 hover:bg-[#C5A059] text-[#0D0D0D] hover:text-white text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-colors shadow-md flex items-center justify-center gap-1 shrink-0"
              title="Open full view modal"
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">View</span>
            </button>
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
    </div>

      {/* Product Info */}
      <div className="p-3 sm:p-3.5 flex-1 flex flex-col justify-between space-y-2">
        <div>
          {(() => {
            const catLabel = typeof product.category === 'object' && product.category?.name
              ? product.category.name
              : (product.specifications?.movement || product.model || '');
            return catLabel ? (
              <div className="flex items-center justify-between gap-2 text-[11px] uppercase tracking-[0.18em] text-[#9E7B36] font-semibold">
                <span className="truncate">{catLabel}</span>
              </div>
            ) : null;
          })()}

          <Link
            to={`/product/${product.slug}`}
            className="mt-1 block font-serif-luxury text-[15px] sm:text-[17px] font-semibold text-[#0D0D0D] group-hover:text-[#9E7B36] transition-colors line-clamp-2 leading-snug min-h-[2.4em]"
          >
            {product.name}
          </Link>

          {/* Rating & Sold Quantity */}
          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 text-[11px] font-semibold text-[#0D0D0D]">
              <Star className="w-3.5 h-3.5 fill-[#C5A059] text-[#C5A059]" />
              <span>{(product.averageRating && product.averageRating > 0 ? product.averageRating : 4.9).toFixed(1)}</span>
              <span className="text-neutral-400 font-normal">
                ({product.reviewCount && product.reviewCount > 0 ? product.reviewCount : 28})
              </span>
            </div>

            <div className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded-full">
              <span className="text-amber-600">🔥</span>
              <span>{(product.soldCount && product.soldCount > 0 ? product.soldCount : 35)} sold</span>
            </div>
          </div>
        </div>

        {/* Pricing: After (Sale) & Before (Original) + Stock Status */}
        <div className="pt-2 border-t border-neutral-100 flex items-baseline justify-between gap-2">
          <div>
            {hasSale ? (
              <div className="flex items-baseline gap-2 flex-wrap">
                {/* After Price (Current discounted sale price) */}
                <span className="text-base sm:text-lg font-bold text-[#0D0D0D] font-mono-code">
                  {formatProductPrice(product.salePrice, symbol)}
                </span>
                {/* Before Price (Market price crossed out) */}
                <span className="text-xs sm:text-sm text-neutral-400 line-through decoration-red-500/70 decoration-[1.5px] font-mono-code" title="Market Price">
                  {formatProductPrice(product.price, symbol)}
                </span>
              </div>
            ) : (
              <span className="text-base sm:text-lg font-bold text-[#0D0D0D] font-mono-code">
                {formatProductPrice(product.price, symbol)}
              </span>
            )}
          </div>

          <span
            className={`text-[10px] font-medium uppercase tracking-wider shrink-0 ${
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
    </Reveal>
  );
};

export const ProductCard = memo(ProductCardComponent);

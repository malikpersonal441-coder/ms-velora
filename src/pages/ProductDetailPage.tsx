import React, { useState, useEffect, useRef } from 'react';
import { sized } from '../lib/img';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  Heart,
  Share2,
  ShieldCheck,
  Truck,
  RotateCcw,
  Star,
  CheckCircle2,
  Maximize2,
  X,
  Check,
  AlertTriangle,
  Bell,
  MessageCircle,
} from 'lucide-react';
import { useWhatsAppLink } from '../components/WhatsAppButton';
import { z } from 'zod';
import { apiRequest, formatPrice, formatProductPrice, formatDate } from '../lib/api';
import { Product, Review } from '../types';
import { useStore } from '../context/StoreContext';
import { flyToCart } from '../lib/flyToCart';
import { ProductCard } from '../components/ProductCard';

const reviewInputSchema = z.object({
  rating: z.number().min(1).max(5),
  title: z.string().min(3, 'Please provide a brief review title (min 3 characters)'),
  comment: z.string().min(10, 'Please share at least 10 characters in your review'),
});

export const ProductDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const {
    user,
    settings,
    addToCart,
    toggleWishlist,
    isInWishlist,
    recentlyViewed,
    recordRecentlyViewed,
    addToast,
    setIsCartOpen,
  } = useStore();

  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeImage, setActiveImage] = useState('');
  const [zoomOrigin, setZoomOrigin] = useState<string | null>(null);
  const [addState, setAddState] = useState<'idle' | 'flying' | 'added'>('idle');
  const mainImageRef = useRef<HTMLImageElement>(null);
  const whatsappHref = useWhatsAppLink();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [selectedVariantSku, setSelectedVariantSku] = useState<string | undefined>(undefined);
  const [quantity, setQuantity] = useState(1);

  // Review form state
  const [rating, setRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const symbol = settings?.currencySymbol || 'Rs.';

  useEffect(() => {
    async function loadProduct() {
      if (!slug) return;
      try {
        setLoading(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        const res = await apiRequest(`/api/products/${slug}`);
        if (res.success && res.product) {
          const prod: Product = res.product;
          setProduct(prod);
          setReviews(res.reviews || []);
          setRelatedProducts(res.relatedProducts || []);
          setActiveImage(prod.mainImage);
          setSelectedVariantSku(prod.variants?.[0]?.sku);
          setQuantity(1);
          recordRecentlyViewed(prod);
          document.title = `${prod.name} (${prod.brand}) — MS Velora`;
        }
      } catch {
        setProduct(null);
      } finally {
        setLoading(false);
      }
    }
    loadProduct();
  }, [slug, recordRecentlyViewed]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 animate-pulse">
          <div className="aspect-square bg-neutral-200 rounded-xl" />
          <div className="space-y-4">
            <div className="h-4 bg-neutral-200 rounded w-1/4" />
            <div className="h-10 bg-neutral-200 rounded w-3/4" />
            <div className="h-6 bg-neutral-200 rounded w-1/3" />
            <div className="h-28 bg-neutral-200 rounded w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center space-y-4">
        <h1 className="font-serif-luxury text-4xl font-semibold text-[#0D0D0D]">
          Piece Not Found
        </h1>
        <p className="text-sm text-neutral-500">
          This piece may have been archived or moved.
        </p>
        <Link
          to="/shop"
          className="inline-block px-6 py-3 bg-[#0D0D0D] text-[#FAF8F5] text-xs uppercase tracking-widest rounded"
        >
          Return to Catalog
        </Link>
      </div>
    );
  }

  const activeVariant = product.variants?.find((v) => v.sku === selectedVariantSku);
  const regularPrice = activeVariant?.price || product.price;
  const salePrice =
    activeVariant?.salePrice !== undefined ? activeVariant.salePrice : product.salePrice;
  const hasSale =
    salePrice !== null && salePrice !== undefined && salePrice > 0 && salePrice < regularPrice;
  const effectivePrice = hasSale ? (salePrice as number) : regularPrice;
  const availableStock = activeVariant !== undefined ? activeVariant.stock : product.stock;
  const currentSku = activeVariant?.sku || product.sku;
  const wished = isInWishlist(product._id);

  const gallery =
    product.images && product.images.length > 0
      ? product.images
      : [{ url: product.mainImage, alt: product.name }];

  const handleAddToCart = async () => {
    if (!product || availableStock <= 0 || addState !== 'idle') return;
    setAddState('flying');
    await flyToCart(mainImageRef.current);
    addToCart(product, quantity, selectedVariantSku, false);
    setAddState('added');
    setTimeout(() => setAddState('idle'), 2400);
  };

  const handleBuyNow = () => {
    if (!product || availableStock <= 0) return;
    addToCart(product, quantity, selectedVariantSku, false);
    navigate('/checkout');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    addToast('Product link copied to clipboard.', 'success');
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const parsed = reviewInputSchema.parse({
        rating,
        title: reviewTitle.trim(),
        comment: reviewComment.trim(),
      });
      setSubmittingReview(true);
      const res = await apiRequest(`/api/products/${product._id}/reviews`, {
        method: 'POST',
        body: JSON.stringify(parsed),
      });
      if (res.success) {
        addToast(res.message, 'success');
        setReviewTitle('');
        setReviewComment('');
        setReviews((prev) => [
          res.review,
          ...prev.filter((r) => r._id !== res.review._id),
        ]);
        setProduct((prev) =>
          prev
            ? {
                ...prev,
                averageRating: res.averageRating,
                reviewCount: res.reviewCount,
              }
            : prev
        );
      }
    } catch (err: any) {
      addToast(err.message || 'Could not submit review.', 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  // Schema.org JSON-LD Product Markup
  const jsonLd = {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: product.name,
    image: gallery.map((g) => g.url),
    description: product.description,
    sku: currentSku,
    brand: {
      '@type': 'Brand',
      name: product.brand,
    },
    offers: {
      '@type': 'Offer',
      url: window.location.href,
      priceCurrency: settings?.currency || 'PKR',
      price: effectivePrice,
      availability:
        availableStock > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
    },
    ...(product.reviewCount > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: product.averageRating,
            reviewCount: product.reviewCount,
          },
        }
      : {}),
  };

  const filteredRecent = recentlyViewed.filter((p) => p._id !== product._id).slice(0, 4);

  return (
    <div className="pb-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Breadcrumbs */}
      <div className="bg-[#F3EFE6] border-b border-black/8 py-3.5 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-neutral-600">
          <div className="flex items-center gap-2 truncate">
            <Link to="/" className="hover:text-[#0D0D0D]">
              Home
            </Link>
            <span>/</span>
            <Link to="/shop" className="hover:text-[#0D0D0D]">
              Shop
            </Link>
            <span>/</span>
            <span className="text-[#0D0D0D] font-semibold truncate">{product.name}</span>
          </div>
          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#0D0D0D] hover:text-[#9E7B36] shrink-0"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share Link</span>
          </button>
        </div>
      </div>

      {/* Main Product Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14">
          {/* Left: Gallery & Thumbnails */}
          <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-24 self-start">
            <div
              className="relative aspect-square rounded-xl overflow-hidden bg-[#F3EFE6] border border-black/10 group"
              onPointerMove={(e) => {
                if (e.pointerType !== 'mouse') return;
                const r = e.currentTarget.getBoundingClientRect();
                setZoomOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`);
              }}
              onPointerLeave={() => setZoomOrigin(null)}
            >
              <img
                ref={mainImageRef}
                key={activeImage || product.mainImage}
                src={sized(activeImage || product.mainImage, 1400, 80)}
                alt={product.name}
                fetchPriority="high"
                style={zoomOrigin ? { transformOrigin: zoomOrigin, transform: 'scale(1.8)' } : undefined}
                className="w-full h-full object-cover object-center transition-transform duration-300 ease-out cursor-zoom-in animate-[fade-in_0.5s_ease]"
                onClick={() => setLightboxOpen(true)}
              />
              <span className="pointer-events-none absolute top-4 left-4 px-2.5 py-1 rounded-full bg-white/85 text-[10px] uppercase tracking-[0.2em] font-semibold text-[#0D0D0D] transition-opacity duration-300 group-hover:opacity-0 hidden sm:inline">
                Hover to zoom
              </span>
              <button
                type="button"
                onClick={() => setLightboxOpen(true)}
                className="absolute bottom-4 right-4 px-3.5 py-2 rounded-lg bg-[#0D0D0D]/80 text-[#FAF8F5] hover:bg-[#C5A059] hover:text-[#0D0D0D] text-xs font-medium flex items-center gap-1.5 transition-colors backdrop-blur-xs"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>High-Res Zoom</span>
              </button>
            </div>

            {gallery.length > 1 && (
              <div className="flex items-center gap-3 overflow-x-auto pb-2">
                {gallery.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImage(img.url)}
                    className={`w-20 h-24 rounded-lg overflow-hidden border-2 transition-all shrink-0 ${
                      activeImage === img.url
                        ? 'border-[#C5A059] shadow-md'
                        : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={img.url}
                      alt={img.alt || `${product.name} view ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Purchase & Details */}
          <div className="lg:col-span-7 space-y-5 lg:pl-4">
            <div className="space-y-2 border-b border-neutral-200 pb-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs uppercase tracking-[0.24em] text-[#9E7B36] font-bold">
                  {product.brand} • {product.specifications?.movement || 'Jewellery'}
                </span>
              </div>

              <h1 className="font-serif-luxury text-3xl lg:text-4xl font-semibold text-[#0D0D0D] leading-tight">
                {product.name}
              </h1>

              {product.reviewCount > 0 && (
                <div className="flex items-center gap-2 pt-1">
                  <div className="flex items-center text-[#C5A059]">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < Math.round(product.averageRating) ? 'fill-current' : 'opacity-30'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-semibold text-[#0D0D0D]">
                    {product.averageRating.toFixed(1)}
                </span>
                  <a
                    href="#reviews-section"
                    className="text-xs text-neutral-500 hover:text-[#9E7B36] underline"
                  >
                    ({product.reviewCount} verified {product.reviewCount === 1 ? 'review' : 'reviews'})
                  </a>
                </div>
              )}

              {/* Price Display */}
              <div className="pt-3 flex items-baseline gap-4">
                <span className="text-2xl font-semibold text-[#0D0D0D] tabular-nums">
                  {formatProductPrice(effectivePrice, symbol)}
                  </span>
                {hasSale && (
                  <>
                    <span className="text-base text-neutral-400 line-through font-mono-code">
                      {formatPrice(regularPrice, symbol)}
                </span>
                    <span className="px-2.5 py-0.5 bg-[#C5A059]/20 text-[#9E7B36] border border-[#C5A059]/40 rounded text-xs font-bold uppercase tracking-wider">
                      Save {formatPrice(regularPrice - effectivePrice, symbol)}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Description */}
            <p className="text-sm sm:text-base text-neutral-700 leading-relaxed">
              {product.description}
            </p>

            {/* Variants Selection */}
            {product.variants && product.variants.length > 0 && (
              <div className="space-y-2.5">
                <label className="block text-xs uppercase tracking-[0.18em] font-bold text-[#0D0D0D]">
                  Select Option
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {product.variants.map((v) => {
                    const isSelected = selectedVariantSku === v.sku;
                    return (
                      <button
                        key={v.sku}
                        type="button"
                        onClick={() => {
                          setSelectedVariantSku(v.sku);
                          if (v.image) setActiveImage(v.image);
                          setQuantity(1);
                        }}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          isSelected
                            ? 'border-[#0D0D0D] bg-[#0D0D0D] text-[#FAF8F5]'
                            : 'border-neutral-300 bg-white text-[#0D0D0D] hover:border-[#C5A059]'
                        }`}
                      >
                        <div className="text-xs font-semibold">{v.name}</div>
                        <div
                          className={`text-[11px] font-mono-code mt-0.5 ${
                            isSelected ? 'text-[#C5A059]' : 'text-neutral-500'
                          }`}
                        >
                          {formatProductPrice(v.salePrice || v.price || product.price, symbol)} •{' '}
                          {v.stock > 0 ? `${v.stock} in stock` : 'Sold out'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Stock Status & Quantity Selector */}
            <div className="p-4 rounded-xl bg-white border border-black/8 space-y-4">
              <div className="flex items-center justify-between">
                {availableStock > 0 ? (
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>
                      In Stock — {availableStock} {availableStock === 1 ? 'piece' : 'pieces'}{' '}
                      available for immediate dispatch
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs font-semibold text-red-700">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <span>Out of Stock</span>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Quantity Control */}
                <div className="flex items-center border border-neutral-300 rounded-lg bg-[#FAF8F5]">
                  <button
                    type="button"
                    disabled={availableStock <= 0 || quantity <= 1}
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="px-4 py-3 text-sm font-bold hover:bg-neutral-200 disabled:opacity-40"
                    aria-label="Decrease quantity"
                  >
                    -
                  </button>
                  <span className="px-4 py-3 text-sm font-bold font-mono-code min-w-[44px] text-center">
                    {quantity}
                    </span>
                  <button
                    type="button"
                    disabled={availableStock <= 0 || quantity >= availableStock}
                    onClick={() => setQuantity((q) => Math.min(availableStock, q + 1))}
                    className="px-4 py-3 text-sm font-bold hover:bg-neutral-200 disabled:opacity-40"
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>

                {/* Add to Bag */}
                <button
                  type="button"
                  disabled={availableStock <= 0}
                  onClick={handleAddToCart}
                  aria-live="polite"
                  className={`flex-1 min-w-[160px] py-3 px-5 font-semibold text-xs uppercase tracking-[0.2em] rounded-lg flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-50 ${
                    addState === 'added'
                      ? 'bg-[#C5A059] text-[#0D0D0D]'
                      : 'bg-[#0D0D0D] hover:bg-[#1A1A1E] text-[#FAF8F5]'
                  }`}
                >
                  {addState === 'added' ? (
                    <Check className="w-4 h-4 badge-pop" />
                  ) : (
                    <ShoppingBag className={`w-4 h-4 text-[#C5A059] ${addState === 'flying' ? 'animate-bounce' : ''}`} />
                  )}
                  <span>
                    {availableStock <= 0
                      ? 'Out of Stock'
                      : addState === 'flying'
                      ? 'Adding…'
                      : addState === 'added'
                      ? 'Added to Bag'
                      : 'Add to Bag'}
                  </span>
                </button>
                {addState === 'added' && (
                  <button
                    type="button"
                    onClick={() => setIsCartOpen(true)}
                    className="link-underline text-xs uppercase tracking-[0.2em] font-semibold text-[#9E7B36] badge-pop"
                  >
                    View Bag →
                  </button>
                )}

                {/* Buy Now */}
                <button
                  type="button"
                  disabled={availableStock <= 0}
                  onClick={handleBuyNow}
                  className="flex-1 min-w-[140px] py-3 px-5 bg-[#C5A059] hover:bg-[#DFBD78] text-[#0D0D0D] font-bold text-xs uppercase tracking-[0.2em] rounded-lg transition-colors disabled:opacity-50"
                >
                  Buy Now
                </button>

                {/* Wishlist */}
                <button
                  type="button"
                  onClick={() => toggleWishlist(product)}
                  aria-label="Save to wishlist"
                  className={`p-3.5 rounded-lg border transition-colors ${
                    wished
                      ? 'bg-[#0D0D0D] text-[#C5A059] border-[#0D0D0D]'
                      : 'bg-white text-[#0D0D0D] border-neutral-300 hover:border-[#0D0D0D]'
                  }`}
                >
                  <Heart key={String(wished)} className={`w-5 h-5 ${wished ? 'fill-current heart-beat' : ''}`} />
                </button>
              </div>

              {/* Concierge: restock alert when sold out, otherwise a product enquiry */}
              {whatsappHref && (
                <a
                  href={whatsappHref(
                    availableStock <= 0
                      ? `Hello! Please let me know when "${product.name}" is back in stock.`
                      : `Hello! I would like more information about "${product.name}".`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`group/wa flex items-center justify-center gap-2.5 w-full py-3 rounded-lg border text-xs uppercase tracking-[0.2em] font-semibold transition-all duration-300 ${
                    availableStock <= 0
                      ? 'bg-[#0D0D0D] text-[#FAF8F5] border-[#0D0D0D] hover:bg-[#C5A059] hover:text-[#0D0D0D] hover:border-[#C5A059]'
                      : 'border-neutral-300 text-[#0D0D0D] hover:border-[#25D366] hover:text-[#128C7E]'
                  }`}
                >
                  {availableStock <= 0 ? <Bell className="w-4 h-4" /> : <MessageCircle className="w-4 h-4" />}
                  <span>{availableStock <= 0 ? 'Notify Me When Available' : 'Ask on WhatsApp'}</span>
                  <span className="transition-transform duration-300 group-hover/wa:translate-x-1">→</span>
                </a>
              )}
            </div>

            {/* Guarantees */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-lg bg-[#F3EFE6] flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-[#9E7B36] shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-[#0D0D0D]">2-Year Official Warranty</span>
                  <span className="text-neutral-600 text-[11px]">
                    Stamped MS Velora warranty card included.
                  </span>
                </div>
              </div>
              <div className="p-3.5 rounded-lg bg-[#F3EFE6] flex items-start gap-2.5">
                <Truck className="w-4 h-4 text-[#9E7B36] shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-[#0D0D0D]">Insured Express Delivery</span>
                  <span className="text-neutral-600 text-[11px]">
                    Free nationwide shipping over Rs. 25,000.
                  </span>
                </div>
              </div>
              <div className="p-3.5 rounded-lg bg-[#F3EFE6] flex items-start gap-2.5">
                <RotateCcw className="w-4 h-4 text-[#9E7B36] shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-[#0D0D0D]">7-Day Inspection</span>
                  <span className="text-neutral-600 text-[11px]">
                    Hassle-free exchange on unworn jewellery.
                  </span>
                </div>
              </div>
            </div>

            {/* Technical Specifications Table */}
            <div className="bg-white rounded-xl border border-black/8 overflow-hidden shadow-xs">
              <div className="px-5 py-3.5 bg-[#FAF8F5] text-[#0D0D0D] border-b border-black/8 flex items-center justify-between">
                <h2 className="font-serif-luxury text-lg tracking-wider uppercase text-[#9E7B36] font-semibold">
                  Specifications
                </h2>
                <span className="text-[11px] font-mono-code text-neutral-500">
                  MODEL: {product.model}
                  </span>
              </div>
              <div className="divide-y divide-neutral-100 text-xs sm:text-sm">
                {[
                  { label: 'Brand / Maison', value: product.brand },
                  { label: 'Model Reference', value: product.model },
                  { label: 'Type', value: product.specifications?.movement },
                  { label: 'Metal', value: product.specifications?.caseMaterial },
                  { label: 'Size / Length', value: product.specifications?.caseDiameter },
                  { label: 'Weight', value: product.specifications?.caseThickness },
                  { label: 'Colour', value: product.specifications?.dialColor },
                  { label: 'Stones', value: product.specifications?.crystal },
                  { label: 'Finish', value: product.specifications?.strapMaterial },
                  { label: 'Closure', value: product.specifications?.strapWidth },
                  { label: 'Care', value: product.specifications?.waterResistance },
                  { label: 'Gender Fit', value: product.gender },
                  { label: 'Warranty Coverage', value: product.specifications?.warranty },
                ].map((spec, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-2 px-5 py-3 hover:bg-[#FAF8F5] transition-colors"
                  >
                    <span className="text-neutral-500 font-medium">{spec.label}</span>
                    <span className="font-semibold text-[#0D0D0D]">{spec.value || '—'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Customer Reviews Section */}
        <section id="reviews-section" className="mt-20 pt-14 border-t border-neutral-200">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div className="lg:col-span-5 space-y-6">
              <div>
                <span className="text-xs uppercase tracking-[0.22em] text-[#9E7B36] font-semibold">
                  Collector Feedback
                </span>
                <h2 className="font-serif-luxury text-3xl font-semibold text-[#0D0D0D] mt-1">
                  Client Reviews ({reviews.length})
                </h2>
              </div>

              {user ? (
                <form
                  onSubmit={handleReviewSubmit}
                  className="bg-white p-6 rounded-xl border border-black/8 space-y-4"
                >
                  <h3 className="font-serif-luxury text-xl font-semibold">
                    Write a Review for {product.name}
                  </h3>

                  <div>
                    <label className="block text-xs uppercase tracking-wider font-semibold text-neutral-600 mb-1.5">
                      Your Rating
                    </label>
                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          className="p-1 text-[#C5A059]"
                        >
                          <Star
                            className={`w-6 h-6 ${
                              star <= rating ? 'fill-current' : 'opacity-30'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-wider font-semibold text-neutral-600 mb-1">
                      Headline
                    </label>
                    <input
                      type="text"
                      required
                      value={reviewTitle}
                      onChange={(e) => setReviewTitle(e.target.value)}
                      placeholder="e.g. Exceptional craftsmanship and weight"
                      className="w-full px-3.5 py-2.5 text-sm border border-neutral-300 rounded focus:outline-none focus:border-[#0D0D0D]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-wider font-semibold text-neutral-600 mb-1">
                      Detailed Impression
                    </label>
                    <textarea
                      rows={4}
                      required
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="Share your experience with the finish, shine and comfort..."
                      className="w-full px-3.5 py-2.5 text-sm border border-neutral-300 rounded focus:outline-none focus:border-[#0D0D0D]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="w-full py-3 bg-[#0D0D0D] hover:bg-[#C5A059] text-[#FAF8F5] hover:text-[#0D0D0D] text-xs uppercase tracking-[0.18em] font-semibold rounded transition-colors"
                  >
                    {submittingReview ? 'Submitting...' : 'Submit Review'}
                  </button>
                </form>
              ) : (
                <div className="p-6 bg-[#F3EFE6] rounded-xl border border-black/8 space-y-3">
                  <p className="text-sm font-medium text-[#0D0D0D]">
                    Have you bought this piece?
                  </p>
                  <p className="text-xs text-neutral-600">
                    Share your experience with our team on WhatsApp — verified buyer reviews are published here.
                  </p>
                </div>
              )}
            </div>

            <div className="lg:col-span-7 space-y-4">
              {reviews.length === 0 ? (
                <div className="bg-white p-10 rounded-xl border border-black/8 text-center text-neutral-500 text-sm">
                  No reviews yet. Be the first to review this piece.
                </div>
              ) : (
                reviews.map((rev) => (
                  <div
                    key={rev._id}
                    className="bg-white p-6 rounded-xl border border-black/8 space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center text-[#C5A059]">
                          {Array.from({ length: rev.rating }).map((_, idx) => (
                            <Star key={idx} className="w-4 h-4 fill-current" />
                          ))}
                        </div>
                        <span className="text-sm font-bold text-[#0D0D0D]">{rev.userName}</span>
                        {rev.verifiedPurchase && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-semibold uppercase tracking-wider">
                            <CheckCircle2 className="w-3 h-3" /> Verified Purchase
                </span>
                        )}
                      </div>
                      <span className="text-xs text-neutral-400">
                        {formatDate(rev.createdAt)}
                          </span>
                    </div>

                    <h4 className="font-serif-luxury text-lg font-semibold text-[#0D0D0D]">
                      {rev.title}
                    </h4>
                    <p className="text-sm text-neutral-600 leading-relaxed">{rev.comment}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <section className="mt-20 pt-14 border-t border-neutral-200">
            <h2 className="font-serif-luxury text-3xl sm:text-4xl font-semibold text-[#0D0D0D] mb-8">
              You May Also Like
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-5">
              {relatedProducts.map((rel) => (
                <ProductCard key={rel._id} product={rel} />
              ))}
            </div>
          </section>
        )}

        {/* Recently Viewed */}
        {filteredRecent.length > 0 && (
          <section className="mt-20 pt-14 border-t border-neutral-200">
            <h2 className="font-serif-luxury text-2xl sm:text-3xl font-semibold text-[#0D0D0D] mb-6">
              Recently Viewed in Your Session
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-5">
              {filteredRecent.map((rec) => (
                <ProductCard key={rec._id} product={rec} />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* High-Res Lightbox Zoom Modal */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            className="absolute top-6 right-6 w-11 h-11 rounded-full bg-white/10 text-white hover:bg-[#C5A059] hover:text-black flex items-center justify-center"
            aria-label="Close zoom view"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={activeImage || product.mainImage}
            alt={product.name}
            className="max-w-full max-h-[88vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Mobile Sticky Bottom Purchase Bar */}
      <div className="lg:hidden fixed bottom-[52px] left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-[#C5A059]/25 p-2.5 px-4 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <img
            src={activeImage || product.mainImage}
            alt=""
            className="w-10 h-10 rounded-md object-cover border border-[#C5A059]/30 shrink-0"
          />
          <div className="min-w-0">
            <p className="font-serif-luxury text-sm font-bold text-[#0D0D0D] truncate leading-tight">{product.name}</p>
            <p className="font-mono-code text-xs font-bold text-[#9E7B36]">
              {formatProductPrice(product.salePrice ?? product.price, symbol)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={availableStock <= 0}
            onClick={handleAddToCart}
            className={`px-4 py-2.5 active:scale-95 text-xs font-bold uppercase tracking-wider rounded-md transition-all flex items-center gap-1.5 shadow-md disabled:opacity-50 ${
              addState === 'added'
                ? 'bg-[#DFBD78] text-[#0D0D0D]'
                : 'bg-[#C5A059] text-[#0D0D0D]'
            }`}
          >
            {addState === 'added' ? <Check className="w-3.5 h-3.5" /> : <ShoppingBag className="w-3.5 h-3.5" />}
            <span>{availableStock <= 0 ? 'Sold Out' : addState === 'added' ? 'Added' : 'Add to Bag'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X, ShoppingBag, Heart, ShieldCheck, Check, ArrowRight } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatProductPrice } from '../lib/api';

export const QuickViewModal: React.FC = () => {
  const {
    quickViewProduct,
    setQuickViewProduct,
    addToCart,
    toggleWishlist,
    isInWishlist,
    settings,
  } = useStore();

  const [selectedImage, setSelectedImage] = useState('');
  const [selectedVariantSku, setSelectedVariantSku] = useState<string | undefined>(undefined);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (quickViewProduct) {
      setSelectedImage(quickViewProduct.mainImage);
      setSelectedVariantSku(quickViewProduct.variants?.[0]?.sku);
      setQuantity(1);
    }
  }, [quickViewProduct]);

  if (!quickViewProduct) return null;

  const symbol = settings?.currencySymbol || 'Rs.';
  const wished = isInWishlist(quickViewProduct._id);
  const activeVariant = quickViewProduct.variants?.find((v) => v.sku === selectedVariantSku);

  const regularPrice = activeVariant?.price || quickViewProduct.price;
  const salePrice =
    activeVariant?.salePrice !== undefined
      ? activeVariant.salePrice
      : quickViewProduct.salePrice;
  const availableStock =
    activeVariant !== undefined ? activeVariant.stock : quickViewProduct.stock;

  const hasSale = salePrice !== null && salePrice !== undefined && salePrice > 0 && salePrice < regularPrice;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/75 backdrop-blur-xs"
          onClick={() => setQuickViewProduct(null)}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.22 }}
          className="relative z-10 w-full max-w-4xl bg-white rounded-xl overflow-hidden shadow-2xl border border-[#C5A059]/30 max-h-[90vh] overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label={`Quick view ${quickViewProduct.name}`}
        >
          <button
            type="button"
            onClick={() => setQuickViewProduct(null)}
            className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-white/90 text-[#0D0D0D] border border-black/10 hover:bg-[#C5A059] hover:text-white flex items-center justify-center transition-colors shadow-sm"
            aria-label="Close quick view"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Gallery Column */}
            <div className="bg-[#FAF8F5] p-6 flex flex-col justify-between">
              <div className="aspect-square rounded-lg overflow-hidden bg-white border border-black/5">
                <img
                  src={selectedImage || quickViewProduct.mainImage}
                  alt={quickViewProduct.name}
                  className="w-full h-full object-cover"
                />
              </div>
              {quickViewProduct.images && quickViewProduct.images.length > 1 && (
                <div className="flex items-center gap-2.5 mt-4 overflow-x-auto pb-1">
                  {quickViewProduct.images.map((img, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSelectedImage(img.url)}
                      className={`w-16 h-16 rounded border-2 overflow-hidden shrink-0 ${
                        selectedImage === img.url ? 'border-[#C5A059]' : 'border-transparent opacity-70'
                      }`}
                    >
                      <img src={img.url} alt={img.alt} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Details Column */}
            <div className="p-6 sm:p-8 flex flex-col justify-between space-y-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-[#9E7B36] font-semibold">
                  <span>{typeof quickViewProduct.category === 'object' && quickViewProduct.category?.name
                    ? quickViewProduct.category.name
                    : (quickViewProduct.model || quickViewProduct.specifications?.movement || 'Fine Jewellery')}</span>
                  <span className="font-mono-code text-neutral-500">{quickViewProduct.specifications?.movement}</span>
                </div>

                <h2 className="font-serif-luxury text-2xl sm:text-3xl font-semibold text-[#0D0D0D]">
                  {quickViewProduct.name}
                </h2>

                <div className="flex items-baseline gap-3">
                  {hasSale ? (
                    <>
                      <span className="text-2xl font-bold text-[#0D0D0D] font-mono-code">
                        {formatProductPrice(salePrice, symbol)}
                      </span>
                      <span className="text-sm text-neutral-400 line-through font-mono-code">
                        {formatProductPrice(regularPrice, symbol)}
                      </span>
                    </>
                  ) : (
                    <span className="text-2xl font-bold text-[#0D0D0D] font-mono-code">
                      {formatProductPrice(regularPrice, symbol)}
                    </span>
                  )}
                </div>

                <p className="text-sm text-neutral-600 leading-relaxed">
                  {quickViewProduct.shortDescription || quickViewProduct.description}
                </p>

                {/* Key Specs */}
                <div className="grid grid-cols-2 gap-2.5 pt-2 text-xs bg-white p-3.5 rounded-lg border border-black/5">
                  <div>
                    <span className="text-neutral-400 block">Metal</span>
                    <span className="font-semibold text-[#0D0D0D]">
                      {quickViewProduct.specifications?.caseMaterial}
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block">Size</span>
                    <span className="font-semibold text-[#0D0D0D]">
                      {quickViewProduct.specifications?.caseDiameter}
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block">Stones</span>
                    <span className="font-semibold text-[#0D0D0D]">
                      {quickViewProduct.specifications?.crystal}
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block">Care</span>
                    <span className="font-semibold text-[#0D0D0D]">
                      {quickViewProduct.specifications?.waterResistance}
                    </span>
                  </div>
                </div>

                {/* Variants */}
                {quickViewProduct.variants && quickViewProduct.variants.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <label className="block text-xs uppercase tracking-wider font-semibold text-neutral-700">
                      Option
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {quickViewProduct.variants.map((v) => (
                        <button
                          key={v.sku}
                          type="button"
                          onClick={() => setSelectedVariantSku(v.sku)}
                          className={`px-3 py-1.5 rounded text-xs font-medium border transition-all ${
                            selectedVariantSku === v.sku
                              ? 'border-[#0D0D0D] bg-[#0D0D0D] text-[#FAF8F5]'
                              : 'border-neutral-300 bg-white text-neutral-700 hover:border-[#C5A059]'
                          }`}
                        >
                          {v.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4 pt-4 border-t border-neutral-200">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-medium text-emerald-700">
                    <Check className="w-4 h-4" />
                    {availableStock > 0
                      ? `${availableStock} unit(s) available in vault`
                      : 'Currently Out of Stock'}
                  </span>
                  <span className="flex items-center gap-1 text-neutral-500">
                    <ShieldCheck className="w-4 h-4 text-[#C5A059]" /> 2-Year Warranty
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center border border-neutral-300 rounded bg-white">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="px-3 py-2.5 text-sm font-bold hover:bg-neutral-100"
                    >
                      -
                    </button>
                    <span className="px-3 py-2.5 text-sm font-semibold min-w-[36px] text-center">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.min(Math.max(1, availableStock), q + 1))}
                      className="px-3 py-2.5 text-sm font-bold hover:bg-neutral-100"
                    >
                      +
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={availableStock <= 0}
                    onClick={() => {
                      addToCart(quickViewProduct, quantity, selectedVariantSku);
                      setQuickViewProduct(null);
                    }}
                    className="flex-1 py-3 px-5 bg-[#0D0D0D] hover:bg-[#C5A059] text-[#FAF8F5] hover:text-[#0D0D0D] font-semibold text-xs uppercase tracking-[0.18em] rounded flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>{availableStock > 0 ? 'Add to Bag' : 'Out of Stock'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleWishlist(quickViewProduct)}
                    className={`p-3 rounded border transition-colors ${
                      wished
                        ? 'bg-[#0D0D0D] text-[#C5A059] border-[#0D0D0D]'
                        : 'bg-white text-[#0D0D0D] border-neutral-300 hover:border-[#0D0D0D]'
                    }`}
                    aria-label="Toggle wishlist"
                  >
                    <Heart className={`w-4 h-4 ${wished ? 'fill-current' : ''}`} />
                  </button>
                </div>

                <Link
                  to={`/product/${quickViewProduct.slug}`}
                  onClick={() => setQuickViewProduct(null)}
                  className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.18em] font-semibold text-[#9E7B36] hover:text-[#0D0D0D] transition-colors"
                >
                  <span>View All Specifications</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

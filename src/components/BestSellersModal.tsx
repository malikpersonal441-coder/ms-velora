import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, ShoppingBag } from 'lucide-react';
import { Product } from '../types';
import { ProductCard } from './ProductCard';
import { ProductCardSkeleton } from './ProductCardSkeleton';
import { Link } from 'react-router-dom';

interface BestSellersModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
}

export const BestSellersModal: React.FC<BestSellersModalProps> = ({ isOpen, onClose, products }) => {
  if (!isOpen) return null;

  const displayProducts = products.slice(0, 10);
  const isLoading = !products || products.length === 0;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/75 backdrop-blur-xs"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.22 }}
          className="relative z-10 w-full max-w-6xl bg-white rounded-xl overflow-hidden shadow-2xl border border-[#C5A059]/30 max-h-[90vh] overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label="Best Sellers"
        >
          <div className="sticky top-0 bg-white border-b border-[#C5A059]/20 p-4 sm:p-6 flex items-center justify-between z-20">
            <div>
              <span className="text-[10px] uppercase tracking-[0.24em] text-[#9E7B36] font-semibold block">
                Most Coveted
              </span>
              <h2 className="font-serif-luxury text-2xl sm:text-3xl font-semibold text-[#0D0D0D]">
                Best Sellers
              </h2>
              <p className="text-xs text-neutral-500 mt-1">
                {displayProducts.length} pieces available
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                to="/shop?bestSeller=true"
                onClick={onClose}
                className="hidden sm:inline-flex items-center gap-2 px-4 py-2 bg-[#C5A059]/10 text-[#9E7B36] border border-[#C5A059]/30 rounded-lg text-xs font-semibold uppercase tracking-wider hover:bg-[#C5A059] hover:text-[#0D0D0D] transition-colors"
              >
                <ShoppingBag className="w-4 h-4" />
                View All
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-white/90 text-[#0D0D0D] border border-black/10 hover:bg-[#C5A059] hover:text-white flex items-center justify-center transition-colors shadow-sm"
                aria-label="Close best sellers"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="p-4 sm:p-6">
            <p className="text-sm text-neutral-600 mb-6">
              Our most sought-after handcrafted pieces, adored by women across Pakistan.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-5">
              {isLoading ? (
                [1, 2, 3, 4, 5].map((n) => <ProductCardSkeleton key={n} />)
              ) : (
                displayProducts.map((product) => (
                  <ProductCard key={product._id} product={product} />
                ))
              )}
            </div>

            {!isLoading && products.length > 10 && (
              <div className="mt-8 text-center">
                <Link
                  to="/shop?bestSeller=true"
                  onClick={onClose}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#0D0D0D] hover:bg-[#C5A059] text-[#FAF8F5] hover:text-[#0D0D0D] font-semibold text-xs uppercase tracking-[0.2em] rounded transition-colors shadow-md"
                >
                  <ShoppingBag className="w-4 h-4" />
                  View All {products.length} Best Sellers
                </Link>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

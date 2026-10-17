import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X, ShoppingBag, Trash2, Tag, ArrowRight, Truck } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatPrice } from '../lib/api';

export const CartDrawer: React.FC = () => {
  const {
    isCartOpen,
    setIsCartOpen,
    cartItems,
    cartSummary,
    updateCartQuantity,
    removeFromCart,
    applyCoupon,
    removeCoupon,
  } = useStore();
  const [couponInput, setCouponInput] = useState('');
  const [applying, setApplying] = useState(false);
  const navigate = useNavigate();

  const symbol = cartSummary.currencySymbol || 'Rs.';
  const remainingForFreeShipping = Math.max(
    0,
    cartSummary.freeShippingThreshold - (cartSummary.subtotal - cartSummary.discountAmount)
  );
  const progressPercent = Math.min(
    100,
    Math.round(
      ((cartSummary.subtotal - cartSummary.discountAmount) /
        Math.max(1, cartSummary.freeShippingThreshold)) *
        100
    )
  );

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;
    setApplying(true);
    const ok = await applyCoupon(couponInput);
    if (ok) setCouponInput('');
    setApplying(false);
  };

  return (
    <AnimatePresence>
      {isCartOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50"
            onClick={() => setIsCartOpen(false)}
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.28 }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-[#FAF8F5] text-[#0D0D0D] z-50 flex flex-col shadow-2xl border-l border-[#C5A059]/30"
            aria-label="Shopping Bag Drawer"
          >
            {/* Header */}
            <div className="p-5 bg-[#0D0D0D] text-[#FAF8F5] flex items-center justify-between border-b border-[#C5A059]/25">
              <div className="flex items-center gap-2.5">
                <ShoppingBag className="w-5 h-5 text-[#C5A059]" />
                <h2 className="font-serif-luxury text-xl tracking-wider uppercase">
                  Your Shopping Bag
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                className="p-1.5 text-[#FAF8F5]/70 hover:text-[#C5A059] transition-colors"
                aria-label="Close shopping bag"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Free Shipping Progress */}
            {cartItems.length > 0 && (
              <div className="px-5 py-3 bg-[#F3EFE6] border-b border-black/5 text-xs">
                <div className="flex items-center gap-2 text-neutral-700 font-medium mb-1.5">
                  <Truck className="w-4 h-4 text-[#9E7B36] shrink-0" />
                  {remainingForFreeShipping === 0 ? (
                    <span className="text-emerald-800 font-semibold">
                      Complimentary insured shipping unlocked!
                    </span>
                  ) : (
                    <span>
                      Add{' '}
                      <strong className="font-mono-code">
                        {formatPrice(remainingForFreeShipping, symbol)}
                      </strong>{' '}
                      more for complimentary shipping
                    </span>
                  )}
                </div>
                <div className="w-full h-1.5 bg-neutral-300 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#C5A059] transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            )}

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {cartItems.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-12 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-[#F3EFE6] flex items-center justify-center text-[#9E7B36]">
                    <ShoppingBag className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-serif-luxury text-2xl font-semibold">
                      Your Bag is Empty
                    </h3>
                    <p className="text-xs text-neutral-500 max-w-xs">
                      Explore our necklaces, earrings, rings and bridal sets.
                    </p>
                  </div>
                  <Link
                    to="/shop"
                    onClick={() => setIsCartOpen(false)}
                    className="px-6 py-3 bg-[#0D0D0D] hover:bg-[#C5A059] text-[#FAF8F5] hover:text-[#0D0D0D] text-xs uppercase tracking-[0.18em] font-semibold rounded transition-colors"
                  >
                    Explore Jewellery
                  </Link>
                </div>
              ) : (
                cartItems.map((item) => (
                  <div
                    key={`${item.productId}-${item.variantSku || 'base'}`}
                    className="flex gap-4 p-3.5 bg-white rounded-lg border border-black/8 shadow-xs"
                  >
                    <Link
                      to={`/product/${item.slug}`}
                      onClick={() => setIsCartOpen(false)}
                      className="w-20 h-24 rounded bg-[#F3EFE6] overflow-hidden shrink-0"
                    >
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </Link>

                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <Link
                            to={`/product/${item.slug}`}
                            onClick={() => setIsCartOpen(false)}
                            className="font-serif-luxury text-base font-semibold text-[#0D0D0D] hover:text-[#9E7B36] line-clamp-1"
                          >
                            {item.name}
                          </Link>
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.productId, item.variantSku)}
                            className="text-neutral-400 hover:text-red-600 p-0.5"
                            aria-label={`Remove ${item.name}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <p className="text-[11px] text-neutral-500 uppercase tracking-wider">
                          {item.brand} {item.variantName ? `• ${item.variantName}` : ''}
                        </p>

                        {item.stockWarning && (
                          <p className="text-[11px] text-amber-700 font-medium mt-0.5">
                            {item.stockWarning}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center border border-neutral-200 rounded">
                          <button
                            type="button"
                            onClick={() =>
                              updateCartQuantity(
                                item.productId,
                                item.quantity - 1,
                                item.variantSku
                              )
                            }
                            className="px-2.5 py-1 text-xs font-bold hover:bg-neutral-100"
                          >
                            -
                          </button>
                          <span className="px-2.5 py-1 text-xs font-semibold">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              updateCartQuantity(
                                item.productId,
                                Math.min(item.availableStock, item.quantity + 1),
                                item.variantSku
                              )
                            }
                            className="px-2.5 py-1 text-xs font-bold hover:bg-neutral-100"
                          >
                            +
                          </button>
                        </div>

                        <span className="text-sm font-bold font-mono-code text-[#0D0D0D]">
                          {formatPrice(item.subtotal, symbol)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer Summary */}
            {cartItems.length > 0 && (
              <div className="p-5 bg-white border-t border-neutral-200 space-y-4">
                {/* Coupon Input */}
                {cartSummary.couponCode ? (
                  <div className="flex items-center justify-between px-3 py-2 bg-emerald-50 border border-emerald-200 rounded text-xs">
                    <span className="flex items-center gap-1.5 font-semibold text-emerald-800">
                      <Tag className="w-3.5 h-3.5" />
                      Code {cartSummary.couponCode} (-{formatPrice(cartSummary.discountAmount, symbol)})
                    </span>
                    <button
                      type="button"
                      onClick={removeCoupon}
                      className="text-red-600 hover:underline font-medium"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleApplyCoupon} className="flex gap-2">
                    <input
                      type="text"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      placeholder="Promo code (e.g. ROYAL10)"
                      className="flex-1 px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:border-[#0D0D0D] uppercase font-mono-code"
                    />
                    <button
                      type="submit"
                      disabled={applying}
                      className="px-4 py-2 bg-[#1A1A1E] text-[#FAF8F5] hover:bg-[#C5A059] hover:text-[#0D0D0D] text-xs uppercase tracking-wider font-semibold rounded transition-colors"
                    >
                      Apply
                    </button>
                  </form>
                )}

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-neutral-600">
                    <span>Subtotal</span>
                    <span className="font-mono-code font-medium">
                      {formatPrice(cartSummary.subtotal, symbol)}
                    </span>
                  </div>
                  {cartSummary.discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-700 font-medium">
                      <span>Discount</span>
                      <span className="font-mono-code">
                        -{formatPrice(cartSummary.discountAmount, symbol)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-neutral-600">
                    <span>Estimated Insured Shipping</span>
                    <span className="font-mono-code">
                      {cartSummary.shippingCost === 0
                        ? 'Complimentary'
                        : formatPrice(cartSummary.shippingCost, symbol)}
                    </span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-[#0D0D0D] pt-2 border-t border-neutral-100">
                    <span>Total</span>
                    <span className="font-mono-code">
                      {formatPrice(cartSummary.totalAmount, symbol)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Link
                    to="/cart"
                    onClick={() => setIsCartOpen(false)}
                    className="py-3 px-4 border border-[#0D0D0D] text-[#0D0D0D] hover:bg-neutral-100 text-xs uppercase tracking-[0.15em] font-semibold text-center rounded transition-colors"
                  >
                    View Full Bag
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCartOpen(false);
                      navigate('/checkout');
                    }}
                    className="py-3 px-4 bg-[#C5A059] hover:bg-[#DFBD78] text-[#0D0D0D] text-xs uppercase tracking-[0.15em] font-bold rounded flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span>Checkout</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};

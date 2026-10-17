import React, { useState, useEffect } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { InstallAppButton, PushToggleButton } from './AppActions';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Search,
  User as UserIcon,
  Heart,
  ShoppingBag,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';

const NAV_LINKS = [
  { label: 'Home', to: '/' },
  { label: 'Shop', to: '/shop' },
  { label: 'Collections', to: '/collections' },
  { label: 'Bridal', to: '/collections/bridal-couture' },
  { label: 'Pearl Edit', to: '/collections/pearl-edit' },
  { label: 'New Arrivals', to: '/shop?newArrival=true' },
  { label: 'Sale', to: '/shop?onSale=true' },
];

export const Navbar: React.FC = () => {
  const {
    user,
    cartItems,
    wishlistIds,
    setIsCartOpen,
    setIsSearchOpen,
  } = useStore();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const totalBagQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 24);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname, location.search]);

  return (
    <>
      <header
        className={`sticky top-0 z-40 transition-all duration-300 ${
          isScrolled
            ? 'bg-[#0D0D0D]/95 backdrop-blur-md text-[#FAF8F5] shadow-[0_10px_30px_rgba(0,0,0,0.3)] py-3.5 border-b border-[#C5A059]/20'
            : 'bg-[#0D0D0D] text-[#FAF8F5] py-5 border-b border-white/10'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            {/* Mobile Menu Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 text-[#FAF8F5] hover:text-[#C5A059] transition-colors"
              aria-label="Open navigation menu"
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Brand Logo */}
            <Link to="/" className="flex items-center gap-2.5 group shrink-0" aria-label="MS Velora — home">
              <img src="/brand/logo.jpg" alt="MS Velora" width={56} height={56} className="h-12 w-12 sm:h-14 sm:w-14 transition-transform duration-500 group-hover:scale-105" />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-5 xl:gap-7">
              {NAV_LINKS.map((link) => {
                const isSale = link.label === 'Sale';
                return (
                  <NavLink
                    key={link.label}
                    to={link.to}
                    end={link.to === '/'}
                    className={({ isActive }) =>
                      `relative whitespace-nowrap text-[11px] xl:text-xs uppercase tracking-[0.14em] font-medium py-1 transition-colors ${
                        isSale
                          ? 'text-[#DFBD78] hover:text-[#FAF8F5]'
                          : isActive
                          ? 'text-[#C5A059]'
                          : 'text-[#FAF8F5]/85 hover:text-[#C5A059]'
                      }`
                    }
                  >
                    {link.label}
                  </NavLink>
                );
              })}
            </nav>

            {/* Action Icons */}
            <div className="flex items-center gap-1.5 sm:gap-3">

              <button
                type="button"
                onClick={() => setIsSearchOpen(true)}
                className="p-2 text-[#FAF8F5]/90 hover:text-[#C5A059] transition-colors"
                aria-label="Search jewellery"
              >
                <Search className="w-5 h-5" />
              </button>

              <InstallAppButton
                label="Install"
                className="hidden 2xl:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#C5A059]/50 text-[#DFBD78] hover:bg-[#C5A059] hover:text-[#0D0D0D] text-[11px] uppercase tracking-[0.15em] font-semibold transition-colors"
              />

              <Link
                to="/wishlist"
                className="p-2 text-[#FAF8F5]/90 hover:text-[#C5A059] transition-colors relative"
                aria-label="Wishlist"
              >
                <Heart className="w-5 h-5" />
                {wishlistIds.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#C5A059] text-[#0D0D0D] text-[10px] font-bold flex items-center justify-center">
                    {wishlistIds.length}
                  </span>
                )}
              </Link>

              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                data-cart-target
                className="p-2 text-[#FAF8F5]/90 hover:text-[#C5A059] transition-colors relative flex items-center gap-1.5"
                aria-label="Shopping bag"
              >
                <ShoppingBag className="w-5 h-5" />
                {totalBagQuantity > 0 && (
                  <span key={totalBagQuantity} className="badge-pop w-5 h-5 rounded-full bg-[#C5A059] text-[#0D0D0D] text-[11px] font-bold flex items-center justify-center">
                    {totalBagQuantity}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Animated Navigation Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.28 }}
              className="fixed top-0 left-0 bottom-0 w-[85%] max-w-sm bg-[#0D0D0D] text-[#FAF8F5] z-50 flex flex-col border-r border-[#C5A059]/30 lg:hidden"
            >
              <div className="p-5 border-b border-white/10 flex items-center justify-between">
                <img src="/brand/logo.jpg" alt="MS Velora" width={56} height={56} className="h-14 w-14" />
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 text-[#FAF8F5]/70 hover:text-[#C5A059]"
                  aria-label="Close navigation menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 flex-1 overflow-y-auto space-y-1">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.label}
                    to={link.to}
                    className="flex items-center justify-between py-3.5 px-3 rounded hover:bg-white/5 text-sm uppercase tracking-[0.15em] border-b border-white/5"
                  >
                    <span>{link.label}</span>
                    <ChevronRight className="w-4 h-4 text-[#C5A059]" />
                  </Link>
                ))}
                <Link
                  to="/track-order"
                  className="flex items-center justify-between py-3.5 px-3 rounded hover:bg-white/5 text-sm uppercase tracking-[0.15em] border-b border-white/5 text-[#C5A059]"
                >
                  <span>Track Your Order</span>
                  <ChevronRight className="w-4 h-4 text-[#C5A059]" />
                </Link>
              </div>

              <div className="p-5 border-t border-white/10 bg-[#141417] space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <PushToggleButton topic="new-arrivals" onLabel="New Arrivals" offLabel="Alerts On" className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg border border-[#C5A059]/50 hover:border-[#C5A059] hover:bg-[#C5A059]/10 text-[#FAF8F5] text-xs uppercase tracking-[0.18em] font-semibold transition-colors disabled:opacity-60 !px-3 !tracking-[0.1em]" />
                  <InstallAppButton label="Install" className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg border border-[#C5A059]/50 hover:border-[#C5A059] hover:bg-[#C5A059]/10 text-[#FAF8F5] text-xs uppercase tracking-[0.18em] font-semibold transition-colors disabled:opacity-60 !px-3 !tracking-[0.1em]" />
                </div>
                <Link
                  to="/track-order"
                  className="block w-full py-3 px-4 bg-[#C5A059] text-[#0D0D0D] font-semibold text-xs uppercase tracking-[0.16em] text-center rounded"
                >
                  Track Your Order
                </Link>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

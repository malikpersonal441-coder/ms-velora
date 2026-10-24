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
  Home,
  Sparkles,
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
            ? 'bg-white/95 backdrop-blur-md text-[#0D0D0D] shadow-[0_4px_25px_rgba(0,0,0,0.06)] py-3.5 border-b border-[#C5A059]/20'
            : 'bg-white text-[#0D0D0D] py-5 border-b border-black/5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            {/* Mobile Menu Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 text-[#0D0D0D] hover:text-[#C5A059] transition-colors"
              aria-label="Open navigation menu"
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Brand Logo */}
            <Link to="/" className="flex items-center gap-3 group shrink-0" aria-label="MS Velora — home">
              <div className="relative rounded-full p-0.5 bg-gradient-to-tr from-[#C5A059] via-[#DFBD78] to-[#9E7B36] shadow-sm group-hover:shadow-[0_0_18px_rgba(197,160,89,0.35)] group-hover:scale-105 transition-all duration-300">
                <img
                  src="/brand/logo-128.webp"
                  alt="MS Velora"
                  width={52}
                  height={52}
                  className="h-10 w-10 sm:h-12 sm:w-12 rounded-full object-cover"
                />
              </div>
              <div className="flex flex-col">
                <span className="font-serif-luxury text-base sm:text-xl font-bold tracking-[0.16em] sm:tracking-[0.18em] text-[#0D0D0D] leading-none group-hover:text-[#9E7B36] transition-colors">
                  MS VELORA
                </span>
                <span className="text-[8px] sm:text-[9px] uppercase tracking-[0.26em] sm:tracking-[0.32em] text-[#C5A059] font-medium mt-0.5">
                  Fine Jewellery
                </span>
              </div>
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
                          ? 'text-[#9E7B36] font-semibold hover:text-[#0D0D0D]'
                          : isActive
                          ? 'text-[#C5A059] font-semibold'
                          : 'text-[#0D0D0D]/75 hover:text-[#C5A059]'
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
                className="p-2 text-[#0D0D0D]/80 hover:text-[#C5A059] transition-colors"
                aria-label="Search jewellery"
              >
                <Search className="w-5 h-5" />
              </button>

              <InstallAppButton
                label="Install"
                className="hidden 2xl:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#C5A059]/50 text-[#9E7B36] hover:bg-[#C5A059] hover:text-white text-[11px] uppercase tracking-[0.15em] font-semibold transition-colors"
              />

              <Link
                to="/wishlist"
                className="p-2 text-[#0D0D0D]/80 hover:text-[#C5A059] transition-colors relative"
                aria-label="Wishlist"
              >
                <Heart className="w-5 h-5" />
                {wishlistIds.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#C5A059] text-white text-[10px] font-bold flex items-center justify-center">
                    {wishlistIds.length}
                  </span>
                )}
              </Link>

              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                data-cart-target
                className="p-2 text-[#0D0D0D]/80 hover:text-[#C5A059] transition-colors relative flex items-center gap-1.5"
                aria-label="Shopping bag"
              >
                <ShoppingBag className="w-5 h-5" />
                {totalBagQuantity > 0 && (
                  <span key={totalBagQuantity} className="badge-pop w-5 h-5 rounded-full bg-[#C5A059] text-white text-[11px] font-bold flex items-center justify-center">
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
              className="fixed top-0 left-0 bottom-0 w-[85%] max-w-sm bg-white text-[#0D0D0D] z-50 flex flex-col border-r border-[#C5A059]/30 shadow-2xl lg:hidden"
            >
              <div className="p-5 border-b border-black/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-full p-0.5 bg-gradient-to-tr from-[#C5A059] via-[#DFBD78] to-[#9E7B36] shadow-sm">
                    <img src="/brand/logo-128.webp" alt="MS Velora" width={44} height={44} className="h-11 w-11 rounded-full object-cover" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-serif-luxury text-base font-bold tracking-[0.16em] text-[#0D0D0D]">MS VELORA</span>
                    <span className="text-[8px] uppercase tracking-[0.28em] text-[#C5A059] font-medium">Fine Jewellery</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 text-neutral-500 hover:text-[#C5A059]"
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
                    className="flex items-center justify-between py-3.5 px-3 rounded hover:bg-neutral-50 text-sm uppercase tracking-[0.15em] border-b border-black/5 text-[#0D0D0D]"
                  >
                    <span>{link.label}</span>
                    <ChevronRight className="w-4 h-4 text-[#C5A059]" />
                  </Link>
                ))}
              </div>

              <div className="p-5 border-t border-black/5 bg-[#FCFBF8] space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <PushToggleButton topic="new-arrivals" onLabel="New Arrivals" offLabel="Alerts On" className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg border border-[#C5A059]/50 hover:border-[#C5A059] hover:bg-[#C5A059]/10 text-[#0D0D0D] text-xs uppercase tracking-[0.18em] font-semibold transition-colors disabled:opacity-60 !px-3 !tracking-[0.1em]" />
                  <InstallAppButton label="Install" className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg border border-[#C5A059]/50 hover:border-[#C5A059] hover:bg-[#C5A059]/10 text-[#0D0D0D] text-xs uppercase tracking-[0.18em] font-semibold transition-colors disabled:opacity-60 !px-3 !tracking-[0.1em]" />
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Mobile Sticky Bottom Navigation Bar */}
      <nav
        aria-label="Mobile Navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#C5A059]/20 px-2 py-1.5 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] flex items-center justify-around"
      >
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[9px] uppercase tracking-wider font-medium transition-colors ${
              isActive ? 'text-[#C5A059] font-bold' : 'text-[#0D0D0D]/65 hover:text-[#C5A059]'
            }`
          }
        >
          <Home className="w-5 h-5 mb-0.5" />
          <span>Home</span>
        </NavLink>

        <NavLink
          to="/shop"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[9px] uppercase tracking-wider font-medium transition-colors ${
              isActive ? 'text-[#C5A059] font-bold' : 'text-[#0D0D0D]/65 hover:text-[#C5A059]'
            }`
          }
        >
          <Sparkles className="w-5 h-5 mb-0.5" />
          <span>Shop</span>
        </NavLink>

        <button
          type="button"
          onClick={() => setIsSearchOpen(true)}
          className="flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[9px] uppercase tracking-wider font-medium text-[#0D0D0D]/65 hover:text-[#C5A059] transition-colors"
          aria-label="Search catalogue"
        >
          <Search className="w-5 h-5 mb-0.5" />
          <span>Search</span>
        </button>

        <NavLink
          to="/wishlist"
          className={({ isActive }) =>
            `relative flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[9px] uppercase tracking-wider font-medium transition-colors ${
              isActive ? 'text-[#C5A059] font-bold' : 'text-[#0D0D0D]/65 hover:text-[#C5A059]'
            }`
          }
        >
          <div className="relative">
            <Heart className="w-5 h-5 mb-0.5" />
            {wishlistIds.length > 0 && (
              <span className="absolute -top-1 -right-2 w-4 h-4 rounded-full bg-[#C5A059] text-white text-[9px] font-bold flex items-center justify-center">
                {wishlistIds.length}
              </span>
            )}
          </div>
          <span>Wishlist</span>
        </NavLink>

        <button
          type="button"
          onClick={() => setIsCartOpen(true)}
          className="relative flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[9px] uppercase tracking-wider font-medium text-[#0D0D0D]/65 hover:text-[#C5A059] transition-colors"
          aria-label="Shopping bag"
        >
          <div className="relative">
            <ShoppingBag className="w-5 h-5 mb-0.5" />
            {totalBagQuantity > 0 && (
              <span className="absolute -top-1 -right-2 w-4 h-4 rounded-full bg-[#C5A059] text-white text-[9px] font-bold flex items-center justify-center">
                {totalBagQuantity}
              </span>
            )}
          </div>
          <span>Bag</span>
        </button>
      </nav>
    </>
  );
};

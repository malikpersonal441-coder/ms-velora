import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { StoreProvider, useStore } from './context/StoreContext';
import { WalletPaymentModal } from './components/WalletPaymentModal';
import type { Order } from './types';
import { AnnouncementBar } from './components/AnnouncementBar';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { CartDrawer } from './components/CartDrawer';
import { SearchModal } from './components/SearchModal';
import { QuickViewModal } from './components/QuickViewModal';
import { ToastContainer } from './components/ToastContainer';
import { WhatsAppButton } from './components/WhatsAppButton';
import { motion, useReducedMotion } from 'framer-motion';

// Route-level code splitting
const HomePage = lazy(() =>
  import('./pages/HomePage').then((m) => ({ default: m.HomePage }))
);
const ShopPage = lazy(() =>
  import('./pages/ShopPage').then((m) => ({ default: m.ShopPage }))
);
const CollectionsPage = lazy(() =>
  import('./pages/CollectionsPage').then((m) => ({ default: m.CollectionsPage }))
);
const CollectionDetailPage = lazy(() =>
  import('./pages/CollectionsPage').then((m) => ({ default: m.CollectionDetailPage }))
);
const ProductDetailPage = lazy(() =>
  import('./pages/ProductDetailPage').then((m) => ({ default: m.ProductDetailPage }))
);
const CartPage = lazy(() =>
  import('./pages/CartAndCheckoutPages').then((m) => ({ default: m.CartPage }))
);
const CheckoutPage = lazy(() =>
  import('./pages/CartAndCheckoutPages').then((m) => ({ default: m.CheckoutPage }))
);
const OrderConfirmationPage = lazy(() =>
  import('./pages/CartAndCheckoutPages').then((m) => ({ default: m.OrderConfirmationPage }))
);
const TrackOrderPage = lazy(() =>
  import('./pages/CartAndCheckoutPages').then((m) => ({ default: m.TrackOrderPage }))
);
const WishlistPage = lazy(() => import('./pages/WishlistPage'));
const GiftOptionsPage = lazy(() => import('./pages/GiftOptionsPage'));
const PolicyPage = lazy(() =>
  import('./pages/AccountAndStaticPages').then((m) => ({ default: m.PolicyPage }))
);
const NotFoundPage = lazy(() =>
  import('./pages/AccountAndStaticPages').then((m) => ({ default: m.NotFoundPage }))
);
const PrintSlipsPage = lazy(() =>
  import('./pages/PrintSlipsPage').then((m) => ({ default: m.PrintSlipsPage }))
);
const AdminDashboardPage = lazy(() =>
  import('./pages/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage }))
);

const AppShell: React.FC = () => {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const reduced = useReducedMotion();
  const navigate = useNavigate();
  const { settings } = useStore();
  const placedOrder = (location.state as { placedOrder?: Order } | null)?.placedOrder;

  // Every new page opens at the top (otherwise the old scroll position carries over,
  // e.g. Bag -> Checkout landed on the footer)
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  }, [location.pathname]);

  // Keep staff pages out of search indexes (robots.txt already disallows /admin)
  useEffect(() => {
    if (!isAdminRoute) return;
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    return () => meta.remove();
  }, [isAdminRoute]);

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-[#0D0D0D]">
      {!isAdminRoute && (
        <>
          <AnnouncementBar />
          <Navbar />
        </>
      )}

      {/* Gold route-change progress line */}
      <div key={`bar-${location.pathname}`} className="route-progress" aria-hidden />

      <main className={`flex-1 ${!isAdminRoute ? 'pb-16 lg:pb-0' : ''}`}>
        <Suspense
          fallback={
            <div className="py-32 text-center text-xs uppercase tracking-[0.24em] text-[#9E7B36] font-semibold">
              Loading MS Velora Vault...
            </div>
          }
        >
          <motion.div
            key={location.pathname}
            initial={reduced ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
          <Routes location={location}>
            <Route path="/" element={<HomePage />} />
            <Route path="/shop" element={<ShopPage />} />
            <Route path="/search" element={<ShopPage />} />
            <Route path="/collections" element={<CollectionsPage />} />
            <Route path="/collections/:slug" element={<CollectionDetailPage />} />
            <Route path="/product/:slug" element={<ProductDetailPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route
              path="/order-confirmation/:orderNumber"
              element={<OrderConfirmationPage />}
            />
            <Route path="/track-order" element={<TrackOrderPage />} />
            {/* No customer accounts: the only sign-in is the owner's at /admin */}
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="/register" element={<Navigate to="/" replace />} />
            <Route path="/forgot-password" element={<Navigate to="/" replace />} />
            <Route path="/account" element={<Navigate to="/" replace />} />
            <Route path="/wishlist" element={<WishlistPage />} />
            <Route path="/gift-options" element={<GiftOptionsPage />} />
            <Route path="/shipping-returns" element={<PolicyPage type="shipping" />} />
            <Route path="/privacy-policy" element={<PolicyPage type="privacy" />} />
            <Route path="/terms" element={<PolicyPage type="terms" />} />
            <Route path="/contact" element={<PolicyPage type="contact" />} />
            <Route path="/admin/login" element={<Navigate to="/admin" replace />} />
            <Route path="/admin/slips" element={<PrintSlipsPage />} />
            <Route path="/admin/*" element={<AdminDashboardPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          </motion.div>
        </Suspense>
      </main>

      {!isAdminRoute && <Footer />}

      <CartDrawer />
      <SearchModal />
      <QuickViewModal />
      <ToastContainer />
      <WhatsAppButton />
      {placedOrder && (
        <WalletPaymentModal
          justPlaced
          order={placedOrder}
          settings={settings}
          // Clear router state so a refresh doesn't reopen the window
          onClose={() => navigate(location.pathname, { replace: true, state: null })}
        />
      )}
    </div>
  );
};

export function App() {
  return (
    <BrowserRouter>
      <StoreProvider>
        <AppShell />
      </StoreProvider>
    </BrowserRouter>
  );
}

export default App;

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  User,
  Product,
  Category,
  Collection,
  HomepageContent,
  StoreSettings,
  Review,
  ValidatedCartItem,
  CartSummary,
  CartGift,
} from '../types';
import { apiRequest } from '../lib/api';
import { demoCategories, demoCollections, demoProducts, demoReviews } from '../lib/demoData';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

export interface RawCartItem {
  productId: string;
  variantSku?: string;
  quantity: number;
  gift?: CartGift;
}

interface StoreContextType {
  user: User | null;
  authLoading: boolean;
  storefrontLoading: boolean;
  homepage: HomepageContent | null;
  settings: StoreSettings | null;
  categories: Category[];
  collections: Collection[];
  bestSellers: Product[];
  newArrivals: Product[];
  verifiedReviews: Review[];
  rawCart: RawCartItem[];
  cartItems: ValidatedCartItem[];
  cartSummary: CartSummary;
  cartValidating: boolean;
  couponCode: string;
  shippingMethod: 'standard' | 'express';
  wishlistIds: string[];
  wishlistProducts: Product[];
  wishlistLoading: boolean;
  recentlyViewed: Product[];
  isCartOpen: boolean;
  isSearchOpen: boolean;
  quickViewProduct: Product | null;
  toasts: ToastMessage[];
  setIsCartOpen: (open: boolean) => void;
  setIsSearchOpen: (open: boolean) => void;
  setQuickViewProduct: (product: Product | null) => void;
  setShippingMethod: (method: 'standard' | 'express') => void;
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
  refreshAuth: () => Promise<void>;
  refreshStorefront: () => Promise<void>;
  logout: () => Promise<void>;
  /** `gift` replaces the line's gift choice when given; omit it to keep the existing one. */
  addToCart: (product: Product, quantity?: number, variantSku?: string, openDrawer?: boolean, gift?: CartGift) => void;
  /** Sets or (with null) removes the gift choice for one cart line. */
  setCartItemGift: (productId: string, variantSku: string | undefined, gift: CartGift | null) => void;
  updateCartQuantity: (productId: string, quantity: number, variantSku?: string) => void;
  removeFromCart: (productId: string, variantSku?: string) => void;
  clearCart: () => void;
  applyCoupon: (code: string) => Promise<boolean>;
  removeCoupon: () => void;
  toggleWishlist: (product: Product) => Promise<void>;
  isInWishlist: (productId: string) => boolean;
  clearWishlist: () => void;
  recordRecentlyViewed: (product: Product) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'bfs_bag_items_v1';
const WISHLIST_GUEST_KEY = 'bfs_guest_wishlist_v1';
const RECENT_VIEWED_KEY = 'msv_recent_items_v1';

const defaultSummary: CartSummary = {
  subtotal: 0,
  discountAmount: 0,
  couponCode: null,
  couponValid: false,
  couponMessage: '',
  shippingCost: 0,
  freeShippingThreshold: 25000,
  taxAmount: 0,
  totalAmount: 0,
  currency: 'PKR',
  currencySymbol: 'Rs.',
};

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [storefrontLoading, setStorefrontLoading] = useState(true);

  const [homepage, setHomepage] = useState<HomepageContent | null>(null);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [categories, setCategories] = useState<Category[]>(() => demoCategories);
  const [collections, setCollections] = useState<Collection[]>(() => demoCollections);
  const [bestSellers, setBestSellers] = useState<Product[]>(() => demoProducts.filter((p) => p.bestSeller));
  const [newArrivals, setNewArrivals] = useState<Product[]>(() => demoProducts.filter((p) => p.newArrival));
  const [verifiedReviews, setVerifiedReviews] = useState<Review[]>(() => demoReviews);

  const [rawCart, setRawCart] = useState<RawCartItem[]>(() => {
    try {
      const saved = sessionStorage.getItem(CART_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [cartItems, setCartItems] = useState<ValidatedCartItem[]>([]);
  const [cartSummary, setCartSummary] = useState<CartSummary>(defaultSummary);
  const [cartValidating, setCartValidating] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [shippingMethod, setShippingMethod] = useState<'standard' | 'express'>('standard');

  const [wishlistIds, setWishlistIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(WISHLIST_GUEST_KEY) ?? sessionStorage.getItem(WISHLIST_GUEST_KEY);
      const ids = saved ? JSON.parse(saved) : [];
      return Array.isArray(ids) ? Array.from(new Set(ids.filter((x: unknown) => typeof x === 'string'))) : [];
    } catch {
      return [];
    }
  });
  const [wishlistProducts, setWishlistProducts] = useState<Product[]>([]);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [recentlyViewed, setRecentlyViewed] = useState<Product[]>(() => {
    try {
      const saved = sessionStorage.getItem(RECENT_VIEWED_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (message: string, type: 'success' | 'error' | 'info' = 'success') => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev.slice(-3), { id, message, type }]);
      setTimeout(() => {
        removeToast(id);
      }, 4000);
    },
    [removeToast]
  );

  const refreshStorefront = useCallback(async () => {
    try {
      setStorefrontLoading(true);
      const res = await apiRequest('/api/content/storefront');
      if (res.success) {
        setHomepage(res.homepage);
        setSettings(res.settings);
        setCategories(res.categories?.length ? res.categories : demoCategories);
        setCollections(res.collections?.length ? res.collections : demoCollections);
        setBestSellers(res.bestSellers?.length ? res.bestSellers : demoProducts.filter((p) => p.bestSeller));
        setNewArrivals(res.newArrivals?.length ? res.newArrivals : demoProducts.filter((p) => p.newArrival));
        setVerifiedReviews(res.verifiedReviews?.length ? res.verifiedReviews : demoReviews);
      }
    } catch (err) {
      console.error('Failed to load storefront data:', err);
    } finally {
      setStorefrontLoading(false);
    }
  }, []);

  const refreshAuth = useCallback(async () => {
    try {
      setAuthLoading(true);
      const res = await apiRequest('/api/auth/me');
      if (res.success && res.user) {
        setUser(res.user);
        const items: Product[] = res.wishlistItems || [];
        setWishlistProducts(items);
        setWishlistIds(items.map((p) => p._id));
      }
    } catch {
      setUser(null);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshStorefront();
    refreshAuth();
  }, [refreshStorefront, refreshAuth]);

  // Guest wishlist: keep ids in localStorage and load current product data for them
  useEffect(() => {
    if (user) return;
    try {
      localStorage.setItem(WISHLIST_GUEST_KEY, JSON.stringify(wishlistIds));
      sessionStorage.removeItem(WISHLIST_GUEST_KEY);
    } catch {
      // ignore storage errors
    }
  }, [wishlistIds, user]);

  useEffect(() => {
    if (authLoading || user) return;
    const ids = wishlistIds;
    if (ids.length === 0) return;
    let cancelled = false;
    setWishlistLoading(true);
    apiRequest(`/api/products/by-ids?ids=${ids.join(',')}`)
      .then((res) => {
        if (cancelled || !res.success) return;
        const found: Product[] = res.products || [];
        const byId = new Map(found.map((p) => [p._id, p]));
        setWishlistProducts(ids.map((id) => byId.get(id)).filter(Boolean) as Product[]);
        const gone = ids.filter((id) => !byId.has(id));
        if (gone.length > 0) {
          setWishlistIds((prev) => prev.filter((id) => byId.has(id)));
          addToast(
            gone.length === 1
              ? 'A saved piece is no longer available and was removed from your wishlist.'
              : `${gone.length} saved pieces are no longer available and were removed from your wishlist.`,
            'info'
          );
        }
      })
      .catch(() => undefined) // keep what we have; the page shows the saved ids again next visit
      .finally(() => !cancelled && setWishlistLoading(false));
    return () => {
      cancelled = true;
    };
    // Load once per session start, not on every toggle (toggles update the list directly)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  // Persist non-sensitive cart item references in sessionStorage & validate on server
  useEffect(() => {
    try {
      sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify(rawCart));
    } catch {
      // ignore storage errors
    }
  }, [rawCart]);

  const validateCartWithServer = useCallback(
    async (itemsToValidate: RawCartItem[], code: string, method: 'standard' | 'express') => {
      if (itemsToValidate.length === 0) {
        setCartItems([]);
        setCartSummary({
          ...defaultSummary,
          freeShippingThreshold: settings?.freeShippingThreshold ?? 25000,
          currency: settings?.currency ?? 'PKR',
          currencySymbol: settings?.currencySymbol ?? 'Rs.',
        });
        return;
      }

      try {
        setCartValidating(true);
        const res = await apiRequest('/api/cart/validate', {
          method: 'POST',
          body: JSON.stringify({
            items: itemsToValidate.map((i) => (i.gift ? i : { productId: i.productId, variantSku: i.variantSku, quantity: i.quantity })),
            couponCode: code || undefined,
            shippingMethod: method,
          }),
        });
        if (res.success) {
          const validItems: ValidatedCartItem[] = res.items || [];
          setCartItems(validItems);
          setCartSummary(res.summary || defaultSummary);

          // Drop bag entries the server no longer recognises (deleted products, or
          // demo-catalogue items saved while offline) so checkout can't fail on them.
          const known = new Set(validItems.map((i) => `${i.productId}|${i.variantSku || ''}`));
          const stale = itemsToValidate.filter((i) => !known.has(`${i.productId}|${i.variantSku || ''}`));
          if (stale.length > 0) {
            setRawCart((prev) =>
              prev.filter((i) => known.has(`${i.productId}|${i.variantSku || ''}`))
            );
            addToast(
              stale.length === 1
                ? 'An item that is no longer available was removed from your bag.'
                : `${stale.length} items that are no longer available were removed from your bag.`,
              'info'
            );
          }
        }
      } catch (err) {
        console.error('Cart validation error:', err);
      } finally {
        setCartValidating(false);
      }
    },
    [settings, addToast]
  );

  useEffect(() => {
    validateCartWithServer(rawCart, couponCode, shippingMethod);
  }, [rawCart, couponCode, shippingMethod, validateCartWithServer]);

  const addToCart = useCallback(
    (product: Product, quantity = 1, variantSku?: string, openDrawer = true, gift?: CartGift) => {
      if (product.stock <= 0) {
        addToast(`${product.name} is currently out of stock.`, 'error');
        return;
      }

      setRawCart((prev) => {
        const idx = prev.findIndex(
          (i) => i.productId === product._id && (i.variantSku || '') === (variantSku || '')
        );
        if (idx > -1) {
          const updated = [...prev];
          const nextQty = Math.min(product.stock, updated[idx].quantity + quantity);
          updated[idx] = { ...updated[idx], quantity: nextQty, ...(gift ? { gift } : {}) };
          return updated;
        }
        return [
          ...prev,
          {
            productId: product._id,
            variantSku,
            quantity: Math.min(product.stock, quantity),
            ...(gift ? { gift } : {}),
          },
        ];
      });

      addToast(`Added "${product.name}" to your shopping bag.`, 'success');
      if (openDrawer) {
        setIsCartOpen(true);
      }
    },
    [addToast]
  );

  const updateCartQuantity = useCallback(
    (productId: string, quantity: number, variantSku?: string) => {
      if (quantity <= 0) {
        setRawCart((prev) =>
          prev.filter(
            (i) => !(i.productId === productId && (i.variantSku || '') === (variantSku || ''))
          )
        );
        return;
      }
      setRawCart((prev) =>
        prev.map((i) =>
          i.productId === productId && (i.variantSku || '') === (variantSku || '')
            ? { ...i, quantity }
            : i
        )
      );
    },
    []
  );

  const setCartItemGift = useCallback(
    (productId: string, variantSku: string | undefined, gift: CartGift | null) => {
      setRawCart((prev) =>
        prev.map((i) => {
          if (i.productId !== productId || (i.variantSku || '') !== (variantSku || '')) return i;
          if (gift) return { ...i, gift };
          const { gift: _removed, ...rest } = i;
          return rest;
        })
      );
      addToast(gift ? 'Gift options saved.' : 'Gift wrapping removed.', 'info');
    },
    [addToast]
  );

  const removeFromCart = useCallback(
    (productId: string, variantSku?: string) => {
      setRawCart((prev) =>
        prev.filter(
          (i) => !(i.productId === productId && (i.variantSku || '') === (variantSku || ''))
        )
      );
      addToast('Item removed from your shopping bag.', 'info');
    },
    [addToast]
  );

  const clearCart = useCallback(() => {
    setRawCart([]);
    setCartItems([]);
    setCouponCode('');
    try {
      sessionStorage.removeItem(CART_STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  const applyCoupon = useCallback(
    async (code: string): Promise<boolean> => {
      const trimmed = code.trim().toUpperCase();
      if (!trimmed) {
        addToast('Please enter a promotional code.', 'error');
        return false;
      }
      try {
        const res = await apiRequest('/api/coupons/validate', {
          method: 'POST',
          body: JSON.stringify({
            code: trimmed,
            subtotal: cartSummary.subtotal,
          }),
        });
        if (res.valid) {
          setCouponCode(trimmed);
          addToast(res.message || `Coupon ${trimmed} applied!`, 'success');
          return true;
        }
        addToast(res.message || 'Invalid coupon code.', 'error');
        return false;
      } catch (err: any) {
        addToast(err.message || 'Invalid coupon code.', 'error');
        return false;
      }
    },
    [cartSummary.subtotal, addToast]
  );

  const removeCoupon = useCallback(() => {
    setCouponCode('');
    addToast('Promotional code removed.', 'info');
  }, [addToast]);

  const toggleWishlist = useCallback(
    async (product: Product) => {
      if (user) {
        try {
          const res = await apiRequest(`/api/auth/wishlist/${product._id}`, {
            method: 'POST',
          });
          if (res.success) {
            const items: Product[] = res.wishlistItems || [];
            setWishlistProducts(items);
            setWishlistIds(items.map((p) => p._id));
            addToast(res.message, res.action === 'added' ? 'success' : 'info');
          }
        } catch (err: any) {
          addToast(err.message || 'Could not update wishlist.', 'error');
        }
      } else {
        setWishlistIds((prev) => {
          const exists = prev.includes(product._id);
          const next = exists ? prev.filter((id) => id !== product._id) : [...prev, product._id];
          addToast(
            exists ? 'Removed from your wishlist.' : 'Saved to your wishlist.',
            exists ? 'info' : 'success'
          );
          return next;
        });
        setWishlistProducts((prev) => {
          const exists = prev.some((p) => p._id === product._id);
          return exists ? prev.filter((p) => p._id !== product._id) : [...prev, product];
        });
      }
    },
    [user, addToast]
  );

  const clearWishlist = useCallback(() => {
    setWishlistIds([]);
    setWishlistProducts([]);
    addToast('Your wishlist has been cleared.', 'info');
  }, [addToast]);

  const isInWishlist = useCallback(
    (productId: string) => wishlistIds.includes(productId),
    [wishlistIds]
  );

  const recordRecentlyViewed = useCallback((product: Product) => {
    setRecentlyViewed((prev) => {
      const filtered = prev.filter((p) => p._id !== product._id);
      const next = [product, ...filtered].slice(0, 6);
      try {
        sessionStorage.setItem(RECENT_VIEWED_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    setUser(null);
    setWishlistIds([]);
    setWishlistProducts([]);
    addToast('Signed out of your MS Velora account.', 'info');
  }, [addToast]);

  return (
    <StoreContext.Provider
      value={{
        user,
        authLoading,
        storefrontLoading,
        homepage,
        settings,
        categories,
        collections,
        bestSellers,
        newArrivals,
        verifiedReviews,
        rawCart,
        cartItems,
        cartSummary,
        cartValidating,
        couponCode,
        shippingMethod,
        wishlistIds,
        wishlistProducts,
        wishlistLoading,
        recentlyViewed,
        isCartOpen,
        isSearchOpen,
        quickViewProduct,
        toasts,
        setIsCartOpen,
        setIsSearchOpen,
        setQuickViewProduct,
        setShippingMethod,
        addToast,
        removeToast,
        refreshAuth,
        refreshStorefront,
        logout,
        addToCart,
        setCartItemGift,
        updateCartQuantity,
        removeFromCart,
        clearCart,
        applyCoupon,
        removeCoupon,
        toggleWishlist,
        isInWishlist,
        clearWishlist,
        recordRecentlyViewed,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export function useStore(): StoreContextType {
  const ctx = useContext(StoreContext);
  if (!ctx) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return ctx;
}

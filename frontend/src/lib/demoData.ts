/**
 * Offline demo catalogue. Served by apiRequest() only when the backend is
 * unreachable, so the storefront can be previewed with `npm run dev:frontend` alone.
 */
import type {
  Category,
  Collection,
  HomepageContent,
  Product,
  Review,
  StoreSettings,
  ValidatedCartItem,
} from '../types';
import { demoOrderResponse, getDemoSettings } from './demoOrders';

const img = (id: string, w = 900) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

/** Placeholder jewellery imagery — replace with real photos from the admin panel. */
const IMAGES = {
  necklace: img('1599643478518-a784e5dc4c8f'),
  pendant: img('1515562141207-7a88fb7ce338'),
  choker: img('1617038220319-276d3cfab638'),
  earrings: img('1535632066927-ab7c9ab60908'),
  jhumka: img('1630019852942-f89202989a59'),
  ring: img('1605100804763-247f67b3557e'),
  rings: img('1603561591411-07134e71a2a9'),
  bracelet: img('1611591437281-460bfbe1220a'),
  bangles: img('1602173574767-37ac01994b2a'),
  set: img('1573408301185-9146fe634ad0'),
};

export const demoCategories: Category[] = [
  { _id: 'cat-necklaces', name: 'Necklaces', slug: 'necklaces', description: 'Pendants, chokers and layered chains.', image: IMAGES.necklace, displayOrder: 1, isActive: true },
  { _id: 'cat-earrings', name: 'Earrings', slug: 'earrings', description: 'Studs, hoops and jhumkas.', image: IMAGES.earrings, displayOrder: 2, isActive: true },
  { _id: 'cat-rings', name: 'Rings & Bangles', slug: 'rings-bangles', description: 'Rings, bracelets and bangles.', image: IMAGES.ring, displayOrder: 3, isActive: true },
];

export const demoCollections: Collection[] = [
  { _id: 'col-everyday', name: 'Everyday Elegance', slug: 'everyday-elegance', subtitle: 'Light & Wearable', description: 'Minimal pieces made for daily wear.', image: IMAGES.pendant, featured: true, displayOrder: 1, isActive: true },
  { _id: 'col-bridal', name: 'Bridal Couture', slug: 'bridal-couture', subtitle: 'For Your Special Day', description: 'Statement kundan, polki and pearl sets.', image: IMAGES.set, featured: true, displayOrder: 2, isActive: true },
  { _id: 'col-pearl', name: 'Pearl Edit', slug: 'pearl-edit', subtitle: 'Timeless Lustre', description: 'Soft pearls in classic designs.', image: IMAGES.choker, featured: true, displayOrder: 3, isActive: true },
];

// Field names are legacy; the UI labels them as jewellery attributes (Type, Metal, Size…)
const specs = (o: Partial<Product['specifications']> = {}): Product['specifications'] => ({
  movement: 'Necklace',
  caseMaterial: 'Gold Plated Brass',
  caseDiameter: 'Adjustable',
  caseThickness: 'Lightweight',
  strapMaterial: 'High Polish',
  strapWidth: 'Lobster Clasp',
  dialColor: 'Gold',
  crystal: 'Cubic Zirconia',
  waterResistance: 'Keep away from water & perfume',
  warranty: 'Plating Warranty',
  origin: 'Pakistan',
  ...o,
});

type Seed = Partial<Product> & Pick<Product, 'name' | 'mainImage'>;

const make = (i: number, p: Seed, alt: string): Product => {
  const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return {
    _id: `demo-${i}`,
    slug,
    brand: 'MS Velora',
    model: '',
    sku: slug.toUpperCase(),
    gender: 'Women',
    price: 0,
    salePrice: null,
    shortDescription: 'A demonstration piece for previewing the storefront.',
    description:
      'This is demo data shown while the backend is offline. Hand-finished, hypoallergenic and delivered in the MS Velora gift box.',
    images: [
      { url: p.mainImage, alt: p.name, isMain: true },
      { url: alt, alt: `${p.name} detail` },
    ],
    specifications: specs(),
    variants: [],
    stock: 12,
    lowStockThreshold: 3,
    soldCount: 0,
    status: 'published',
    featured: i < 4,
    bestSeller: false,
    newArrival: false,
    tags: [],
    averageRating: 0,
    reviewCount: 0,
    createdAt: new Date(Date.now() - i * 86400000 * 4).toISOString(),
    category: demoCategories[i % 3],
    collections: [demoCollections[i % 3]],
    ...p,
  };
};

export const demoProducts: Product[] = [
  make(1, { name: 'Aurora Pearl Drop Necklace', mainImage: IMAGES.pendant, bestSeller: true, category: demoCategories[0], collections: [demoCollections[2]], specifications: specs({ crystal: 'Pearl', dialColor: 'Ivory & Gold' }) }, IMAGES.choker),
  make(2, { name: 'Noor Kundan Choker', mainImage: IMAGES.choker, bestSeller: true, category: demoCategories[0], collections: [demoCollections[1]], specifications: specs({ crystal: 'Kundan & Pearls', strapWidth: 'Adjustable Dori' }) }, IMAGES.set),
  make(3, { name: 'Zara Crystal Stud Earrings', mainImage: IMAGES.earrings, bestSeller: true, category: demoCategories[1], collections: [demoCollections[0]], specifications: specs({ movement: 'Earrings', strapWidth: 'Push Back', dialColor: 'Silver' }) }, IMAGES.earrings),
  make(4, { name: 'Shehzadi Bridal Necklace Set', mainImage: IMAGES.set, bestSeller: true, stock: 2, category: demoCategories[0], collections: [demoCollections[1]], specifications: specs({ movement: 'Bridal Set', crystal: 'Polki Style Stones & Pearls', dialColor: 'Gold & Red' }) }, IMAGES.choker),
  make(5, { name: 'Mehr Gold Jhumka', mainImage: IMAGES.jhumka, newArrival: true, category: demoCategories[1], collections: [demoCollections[1]], specifications: specs({ movement: 'Earrings', strapWidth: 'Hook', crystal: 'Pearls' }) }, IMAGES.earrings),
  make(6, { name: 'Solene Solitaire Ring', mainImage: IMAGES.ring, newArrival: true, category: demoCategories[2], specifications: specs({ movement: 'Ring', caseMaterial: 'Rhodium Plated Silver', strapWidth: 'Adjustable Band', dialColor: 'Silver' }) }, IMAGES.rings),
  make(7, { name: 'Ayla Tennis Bracelet', mainImage: IMAGES.bracelet, newArrival: true, category: demoCategories[2], specifications: specs({ movement: 'Bracelet', strapWidth: 'Box Clasp', dialColor: 'Silver' }) }, IMAGES.bangles),
  make(8, { name: 'Rani Festive Bangle Set', mainImage: IMAGES.bangles, newArrival: true, stock: 0, category: demoCategories[2], specifications: specs({ movement: 'Bangles', strapWidth: 'Slip On', crystal: 'Coloured Stones' }) }, IMAGES.bracelet),
];

export const demoReviews: Review[] = [];

export const demoSettings = {
  storeName: 'MS Velora',
  tagline: 'Fine Jewellery for Women',
  currency: 'PKR',
  currencySymbol: 'Rs.',
  standardShippingFee: 500,
  expressShippingFee: 1500,
  freeShippingThreshold: 25000,
  taxPercentage: 0,
  allowGuestCheckout: true,
  enableCod: true,
  enableOnlinePayment: false,
  enableBankTransfer: true,
  contactEmail: 'concierge@example.com',
  contactPhone: '+92 300 0000000',
  // Placeholder store contact & WhatsApp number — set the real one in admin settings
  whatsappNumber: '+92 300 0000000',
  socialLinks: { instagram: '', facebook: '', youtube: '', tiktok: '' },
} as unknown as StoreSettings;

export const demoHomepage: HomepageContent = {
  announcementBar: {
    isEnabled: true,
    rotateIntervalMs: 4000,
    messages: [
      { text: 'Demo mode — sample products shown while the backend is offline', isActive: true },
      { text: 'Free delivery across Pakistan', link: '/shipping-returns', isActive: true },
      { text: 'Every piece arrives in an MS Velora gift box', isActive: true },
      { text: 'New Arrivals — fresh designs now live', link: '/shop?newArrival=true', isActive: true },
    ],
  },
  carouselSettings: { autoRotate: true, intervalMs: 6000 },
  heroSlides: [
    { badgeText: 'New Collection', title: 'Jewellery That Tells Your Story', subtitle: 'Necklaces, earrings, rings and bangles for the modern woman.', desktopImage: img('1599643478518-a784e5dc4c8f', 1920), mobileImage: IMAGES.necklace, primaryCtaText: 'Shop Now', primaryCtaLink: '/shop', secondaryCtaText: 'Collections', secondaryCtaLink: '/collections', displayOrder: 1, isActive: true },
    { badgeText: 'Bridal Couture', title: 'Made for Your Special Day', subtitle: 'Kundan, polki and pearl sets for every wedding function.', desktopImage: img('1573408301185-9146fe634ad0', 1920), mobileImage: IMAGES.set, primaryCtaText: 'Explore Bridal', primaryCtaLink: '/collections/bridal-couture', displayOrder: 2, isActive: true },
  ],
  promoBanner: {
    badgeText: 'Limited Edition',
    title: 'Shehzadi Bridal Set',
    subtitle: 'Necklace, earrings & tikka',
    description: 'A complete bridal set in polki-style stones and pearls, presented in a keepsake box.',
    image: IMAGES.set,
    ctaText: 'View the Set',
    ctaLink: `/product/${demoProducts[3].slug}`,
    isActive: true,
  },
  brandStory: {
    eyebrow: 'Our Story',
    heading: 'Every piece, checked by hand',
    leadParagraph: 'MS Velora designs elegant jewellery for women — from everyday pieces to bridal sets.',
    bodyParagraph: 'Finish, stone setting and clasp strength are checked on every piece before it is wrapped in our gift box.',
    image: IMAGES.pendant,
    highlights: [
      { label: 'Quality', value: 'Hand Checked', description: 'Inspected before dispatch' },
      { label: 'Warranty', value: 'Plating', description: 'Lasting shine' },
      { label: 'Delivery', value: 'Nationwide', description: 'Gift-boxed' },
    ],
    ctaText: 'Explore the Catalogue',
    ctaLink: '/shop',
  },
  sectionVisibility: {
    heroCarousel: true,
    featuredCollections: true,
    bestSellers: true,
    promoBanner: true,
    newArrivals: true,
    brandStory: true,
    customerReviews: false,
    newsletter: true,
  },
};

/** Local-dev-only demo staff account for trying /admin without the backend. */
export const DEMO_ADMIN = { email: 'admin@msvelora.pk', password: 'Admin@MsVelora2026' };

const effective = (p: Product) => (p.salePrice && p.salePrice < p.price ? p.salePrice : p.price);

/** Returns a mock response for a known endpoint, or undefined if none applies. */
export function demoResponse(endpoint: string, options: RequestInit = {}): unknown {
  const url = new URL(endpoint, 'http://demo.local');
  const path = url.pathname;
  const q = url.searchParams;

  const catalog = { products: demoProducts, baseSettings: demoSettings };
  const orderMock = demoOrderResponse(path, q, options, catalog);
  if (orderMock !== undefined) return orderMock;

  if (path === '/api/content/storefront') {
    return {
      success: true,
      homepage: demoHomepage,
      settings: getDemoSettings(catalog),
      categories: demoCategories,
      collections: demoCollections,
      bestSellers: demoProducts.filter((p) => p.bestSeller),
      newArrivals: demoProducts.filter((p) => p.newArrival),
      verifiedReviews: demoReviews,
    };
  }

  if (path === '/api/products') {
    const term = (q.get('q') || '').toLowerCase();
    let list = demoProducts.filter((p) => {
      if (term && !`${p.name} ${p.brand}`.toLowerCase().includes(term)) return false;
      if (q.get('brand') && p.brand !== q.get('brand')) return false;
      if (q.get('gender') && p.gender !== q.get('gender')) return false;
      if (q.get('bestSeller') === 'true' && !p.bestSeller) return false;
      if (q.get('newArrival') === 'true' && !p.newArrival) return false;
      if (q.get('onSale') === 'true' && !p.salePrice) return false;
      if (q.get('inStock') === 'true' && p.stock <= 0) return false;
      if (q.get('collection') && !p.collections?.some((c) => typeof c === 'object' && c.slug === q.get('collection'))) return false;
      if (q.get('category') && !(typeof p.category === 'object' && p.category?.slug === q.get('category'))) return false;
      return true;
    });
    const sort = q.get('sort');
    if (sort === 'price-asc') list = [...list].sort((a, b) => effective(a) - effective(b));
    if (sort === 'price-desc') list = [...list].sort((a, b) => effective(b) - effective(a));
    const limit = Number(q.get('limit') || 9);
    const page = Number(q.get('page') || 1);
    return {
      success: true,
      products: list.slice((page - 1) * limit, page * limit),
      pagination: { total: list.length, page, limit, totalPages: Math.max(1, Math.ceil(list.length / limit)) },
      facets: {
        brands: [...new Set(demoProducts.map((p) => p.brand))],
        movements: [...new Set(demoProducts.map((p) => p.specifications.movement))],
        strapMaterials: [...new Set(demoProducts.map((p) => p.specifications.strapMaterial))],
        dialColors: [...new Set(demoProducts.map((p) => p.specifications.dialColor))],
        genders: ['Men', 'Women', 'Unisex'],
        priceRange: { min: 0, max: 0 },
      },
    };
  }

  const productMatch = path.match(/^\/api\/products\/([^/]+)$/);
  if (productMatch) {
    const product = demoProducts.find((p) => p.slug === productMatch[1] || p._id === productMatch[1]);
    if (!product) return undefined;
    return {
      success: true,
      product,
      reviews: demoReviews.filter((r) => typeof r.product === 'object' && r.product._id === product._id),
      relatedProducts: demoProducts.filter((p) => p._id !== product._id).slice(0, 4),
    };
  }

  const colMatch = path.match(/^\/api\/content\/collections\/([^/]+)$/);
  if (colMatch) {
    const collection = demoCollections.find((c) => c.slug === colMatch[1]);
    if (!collection) return undefined;
    return {
      success: true,
      collection,
      products: demoProducts.filter((p) => p.collections?.some((c) => typeof c === 'object' && c._id === collection._id)),
    };
  }

  if (path === '/api/cart/validate') {
    const body = JSON.parse(String(options.body || '{}'));
    const items: ValidatedCartItem[] = (body.items || []).flatMap(
      (it: { productId: string; quantity: number; variantSku?: string }) => {
        const p = demoProducts.find((d) => d._id === it.productId);
        if (!p) return [];
        const quantity = Math.min(it.quantity, p.stock);
        return [{
          productId: p._id, name: p.name, slug: p.slug, brand: p.brand, sku: p.sku,
          variantSku: it.variantSku, image: p.mainImage, price: p.price, salePrice: p.salePrice,
          effectivePrice: effective(p), requestedQuantity: it.quantity, quantity,
          availableStock: p.stock, subtotal: effective(p) * quantity,
        }];
      },
    );
    const subtotal = items.reduce((s, i) => s + i.subtotal, 0);
    const couponValid = String(body.couponCode || '').toUpperCase() === 'DEMO10';
    const discountAmount = couponValid ? Math.round(subtotal * 0.1) : 0;
    const shippingCost = subtotal >= 25000 || subtotal === 0 ? 0 : body.shippingMethod === 'express' ? 1500 : 500;
    return {
      success: true,
      items,
      summary: {
        subtotal, discountAmount,
        couponCode: body.couponCode || null, couponValid,
        couponMessage: body.couponCode ? (couponValid ? '10% demo discount applied' : 'Invalid code (try DEMO10)') : '',
        shippingCost, freeShippingThreshold: 25000, taxAmount: 0,
        totalAmount: subtotal - discountAmount + shippingCost,
        currency: 'PKR', currencySymbol: 'Rs.',
      },
    };
  }

  if (path === '/api/coupons/validate') {
    return { success: true, valid: true, message: 'Demo coupon applied' };
  }

  if (path === '/api/auth/login') {
    let body: { email?: string; password?: string } = {};
    try {
      body = JSON.parse(String(options.body || '{}'));
    } catch {
      return { success: false, message: 'Invalid credentials.' };
    }
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    if (!email || !password) return { success: false, message: 'Invalid credentials.' };

    const isAdmin =
      email === 'admin@msvelora.pk' ||
      email === DEMO_ADMIN.email ||
      email.includes('admin') ||
      password === 'Admin@MsVelora2026' ||
      password === 'Admin@MsVelora2026!' ||
      password === 'demo-admin';

    const user = {
      _id: isAdmin ? 'usr-admin-seed' : 'usr-collector-seed',
      name: isAdmin ? 'Mahtab Saghir' : 'Demo Customer',
      email: email || (isAdmin ? 'admin@msvelora.pk' : 'collector@msvelora.pk'),
      phone: '+92 300 0000000',
      role: (isAdmin ? 'admin' : 'customer') as 'admin' | 'customer',
      status: 'active' as const,
      addresses: [],
      wishlist: [],
      createdAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem('bfs_demo_user', JSON.stringify(user));
    } catch {
      // storage unavailable — session just won't persist
    }
    return { success: true, message: `Welcome back, ${user.name}.`, user };
  }

  if (path === '/api/auth/me') {
    try {
      const saved = localStorage.getItem('bfs_demo_user');
      if (saved) return { success: true, user: JSON.parse(saved), wishlistItems: [] };
    } catch {
      // fall through to signed-out
    }
    // Signed out: never default to an admin session
    return { success: false, user: null, wishlistItems: [] };
  }

  if (path === '/api/auth/logout') {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('bfs_demo_user');
    }
    return { success: true, message: 'Signed out successfully.' };
  }

  if (path === '/api/admin/overview') {
    return {
      success: true,
      metrics: {
        paidRevenue: 0,
        pendingRevenue: 0,
        totalOrders: 0,
        pendingOrders: 0,
        completedOrders: 0,
        totalProducts: demoProducts.length,
        lowStockCount: demoProducts.filter((p) => p.stock > 0 && p.stock <= 5).length,
        outOfStockCount: demoProducts.filter((p) => p.stock <= 0).length,
      },
      salesTrend: [],
      recentOrders: [],
      topSellers: demoProducts.slice(0, 4),
      lowStockProducts: demoProducts.filter((p) => p.stock <= 5),
    };
  }

  return undefined;
}

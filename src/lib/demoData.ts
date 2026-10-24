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
  { _id: 'cat-necklaces', name: 'Necklaces & Chokers', slug: 'necklaces', description: 'Pendants, chokers and royal layered chains.', image: IMAGES.necklace, displayOrder: 1, isActive: true },
  { _id: 'cat-earrings', name: 'Earrings & Jhumkas', slug: 'earrings', description: 'Studs, hoops, chandbalis and heritage jhumkas.', image: IMAGES.earrings, displayOrder: 2, isActive: true },
  { _id: 'cat-rings', name: 'Rings & Solitaires', slug: 'rings', description: 'Solitaires, cocktail bands and stackable rings.', image: IMAGES.ring, displayOrder: 3, isActive: true },
  { _id: 'cat-bangles', name: 'Bracelets & Bangles', slug: 'bracelets-bangles', description: 'Tennis bracelets, festive bangles and cuffs.', image: IMAGES.bracelet, displayOrder: 4, isActive: true },
  { _id: 'cat-bridal', name: 'Bridal Couture Sets', slug: 'bridal-sets', description: 'Complete necklace, earring and tikka sets.', image: IMAGES.set, displayOrder: 5, isActive: true },
];

export const demoCollections: Collection[] = [
  { _id: 'col-everyday', name: 'Everyday Elegance', slug: 'everyday-elegance', subtitle: 'Light & Wearable', description: 'Minimal, lightweight pieces made for effortless daily wear.', image: IMAGES.pendant, featured: true, displayOrder: 1, isActive: true },
  { _id: 'col-bridal', name: 'Bridal Couture', slug: 'bridal-couture', subtitle: 'For Your Special Day', description: 'Statement kundan, polki and freshwater pearl bridal sets.', image: IMAGES.set, featured: true, displayOrder: 2, isActive: true },
  { _id: 'col-pearl', name: 'Pearl Edit', slug: 'pearl-edit', subtitle: 'Timeless Lustre', description: 'Lustrous pearls crafted into classic, delicate designs.', image: IMAGES.choker, featured: true, displayOrder: 3, isActive: true },
  { _id: 'col-festive', name: 'Festive Glow', slug: 'festive-glow', subtitle: 'Eid & Wedding Ready', description: 'Intricate jhumkas, vibrant bangles and celebration jewellery.', image: IMAGES.jhumka, featured: true, displayOrder: 4, isActive: true },
  { _id: 'col-kundan', name: 'Royal Heritage', slug: 'royal-heritage', subtitle: 'Polki & Kundan Craft', description: 'Artisanal jewellery inspired by Mughal and royal court craftsmanship.', image: IMAGES.necklace, featured: true, displayOrder: 5, isActive: true },
  { _id: 'col-gifts', name: 'Gift Picks', slug: 'gift-picks', subtitle: 'Delivered in Velvet Box', description: 'Thoughtfully curated luxury gifts with custom gift packaging.', image: IMAGES.rings, featured: true, displayOrder: 6, isActive: true },
];

// Field names are legacy; the UI labels them as jewellery attributes (Type, Metal, Size…)
const specs = (o: Partial<Product['specifications']> = {}): Product['specifications'] => ({
  movement: 'Necklace',
  caseMaterial: '24K Gold Micron Plated Brass',
  caseDiameter: 'Adjustable Length',
  caseThickness: 'Lightweight (Hypoallergenic)',
  strapMaterial: 'Hand Polished Mirror Finish',
  strapWidth: 'Secure Clasp / Adjustable Dori',
  dialColor: 'Champagne Gold',
  crystal: 'AAA+ Cubic Zirconia & Synthetic Pearls',
  waterResistance: 'Keep away from moisture & perfume',
  warranty: '6-Month Plating & Polish Warranty',
  origin: 'Handcrafted in Pakistan',
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
    price: p.price ?? 6500,
    salePrice: p.salePrice ?? null,
    shortDescription: p.shortDescription || 'An exquisite handcrafted piece finished in 24K gold plating and sparkling gemstones.',
    description:
      'Hand-finished by master artisans, hypoallergenic, and shipped in the signature MS Velora luxury keepsake box with certificate of authenticity.',
    images: [
      { url: p.mainImage, alt: p.name, isMain: true },
      { url: alt, alt: `${p.name} detail view` },
    ],
    specifications: specs(),
    variants: [],
    stock: p.stock ?? 15,
    lowStockThreshold: 3,
    soldCount: (i * 17 + 8) % 65,
    status: 'published',
    featured: i <= 8,
    bestSeller: (p.bestSeller !== undefined) ? p.bestSeller : (i % 2 === 0),
    newArrival: (p.newArrival !== undefined) ? p.newArrival : (i % 2 !== 0),
    tags: p.tags || ['luxury', 'jewellery', 'gold-plated'],
    averageRating: 4.8 + ((i % 3) * 0.1),
    reviewCount: 14 + (i * 3),
    createdAt: new Date(Date.now() - i * 86400000 * 2).toISOString(),
    category: p.category || demoCategories[i % demoCategories.length],
    collections: p.collections || [demoCollections[i % demoCollections.length]],
    ...p,
  };
};

export const demoProducts: Product[] = [
  make(1, { name: 'Aurora Pearl Drop Necklace', price: 6800, salePrice: 5440, mainImage: IMAGES.pendant, bestSeller: true, featured: true, category: demoCategories[0], collections: [demoCollections[2], demoCollections[0]], specifications: specs({ movement: 'Pendant Necklace', crystal: 'Freshwater Baroque Pearl', dialColor: 'Ivory & Gold' }) }, IMAGES.choker),
  make(2, { name: 'Noor Kundan Choker Set', price: 18500, salePrice: 14800, mainImage: IMAGES.choker, bestSeller: true, featured: true, category: demoCategories[0], collections: [demoCollections[1], demoCollections[4]], specifications: specs({ movement: 'Choker Set', crystal: 'Fine Kundan & Clusters', strapWidth: 'Adjustable Silk Dori' }) }, IMAGES.set),
  make(3, { name: 'Zara Solitaire Crystal Studs', price: 3800, mainImage: IMAGES.earrings, bestSeller: true, featured: true, category: demoCategories[1], collections: [demoCollections[0], demoCollections[5]], specifications: specs({ movement: 'Stud Earrings', strapWidth: 'Hypoallergenic Push Back', dialColor: 'Diamond White' }) }, IMAGES.earrings),
  make(4, { name: 'Shehzadi Royal Bridal Necklace Set', price: 48000, salePrice: 39900, mainImage: IMAGES.set, bestSeller: true, featured: true, stock: 4, category: demoCategories[4], collections: [demoCollections[1]], specifications: specs({ movement: 'Full Bridal Set', crystal: 'Polki Style Gemstones & Pearls', dialColor: 'Gold & Ruby Red' }) }, IMAGES.choker),
  make(5, { name: 'Mehr Polki Gold Jhumka', price: 7200, salePrice: 5900, mainImage: IMAGES.jhumka, bestSeller: true, newArrival: true, category: demoCategories[1], collections: [demoCollections[3], demoCollections[1]], specifications: specs({ movement: 'Traditional Jhumka', strapWidth: 'Comfort Hook', crystal: 'Fine Pearl Hangings' }) }, IMAGES.earrings),
  make(6, { name: 'Solene Solitaire Princess Ring', price: 4500, mainImage: IMAGES.ring, bestSeller: true, newArrival: true, category: demoCategories[2], collections: [demoCollections[0], demoCollections[5]], specifications: specs({ movement: 'Solitaire Ring', caseMaterial: 'Rhodium Plated Sterling Silver', strapWidth: 'Adjustable Sizing', dialColor: 'Ice Crystal' }) }, IMAGES.rings),
  make(7, { name: 'Ayla Brilliant Tennis Bracelet', price: 12000, salePrice: 9999, mainImage: IMAGES.bracelet, bestSeller: true, newArrival: true, category: demoCategories[3], collections: [demoCollections[0], demoCollections[5]], specifications: specs({ movement: 'Tennis Bracelet', strapWidth: 'Double Security Box Clasp', dialColor: 'Shimmering Silver' }) }, IMAGES.bangles),
  make(8, { name: 'Rani Festive Meenakari Bangle Set', price: 16500, salePrice: 13900, mainImage: IMAGES.bangles, bestSeller: true, category: demoCategories[3], collections: [demoCollections[3], demoCollections[1]], specifications: specs({ movement: 'Kangan Bangles (Set of 4)', strapWidth: 'Screw-Pin Fastening', crystal: 'Semi-Precious Stones' }) }, IMAGES.bracelet),
  make(9, { name: 'Celeste Triple Layered Gold Chain', price: 5400, mainImage: IMAGES.necklace, newArrival: true, featured: true, category: demoCategories[0], collections: [demoCollections[0]], specifications: specs({ movement: 'Layered Necklace', dialColor: 'Yellow Gold' }) }, IMAGES.pendant),
  make(10, { name: 'Luna Chunky Huggie Hoops', price: 3200, mainImage: IMAGES.earrings, newArrival: true, category: demoCategories[1], collections: [demoCollections[0]], specifications: specs({ movement: 'Hoop Earrings', strapWidth: 'Click-Top Hinge', dialColor: 'High Polish Gold' }) }, IMAGES.jhumka),
  make(11, { name: 'Rosa Stackable Eternity Ring Trio', price: 5900, salePrice: 4700, mainImage: IMAGES.rings, newArrival: true, category: demoCategories[2], collections: [demoCollections[5]], specifications: specs({ movement: 'Ring Set (3 Bands)', dialColor: 'Rose Gold & White Gold' }) }, IMAGES.ring),
  make(12, { name: 'Gul Nikkah Pearl Choker & Tops', price: 29500, salePrice: 24900, mainImage: IMAGES.set, newArrival: true, category: demoCategories[4], collections: [demoCollections[1], demoCollections[2]], specifications: specs({ movement: 'Bridal Set', crystal: 'Lustrous Shell Pearls', dialColor: 'Ivory White & Gold' }) }, IMAGES.choker),
  make(13, { name: 'Darya Emerald Halo Cocktail Ring', price: 6200, mainImage: IMAGES.ring, newArrival: true, category: demoCategories[2], collections: [demoCollections[3]], specifications: specs({ movement: 'Cocktail Ring', dialColor: 'Emerald Green & Diamond CZ' }) }, IMAGES.rings),
  make(14, { name: 'Zahra Handcrafted Pearl Kada', price: 8900, salePrice: 7500, mainImage: IMAGES.bracelet, bestSeller: true, category: demoCategories[3], collections: [demoCollections[2], demoCollections[0]], specifications: specs({ movement: 'Cuff Kada', dialColor: 'Antique Champagne Gold' }) }, IMAGES.bangles),
  make(15, { name: 'Sitara Polki Chandbali Earrings', price: 9200, salePrice: 7900, mainImage: IMAGES.jhumka, bestSeller: true, category: demoCategories[1], collections: [demoCollections[3], demoCollections[4]], specifications: specs({ movement: 'Chandbali Earrings', dialColor: 'Gold & Green Enamel' }) }, IMAGES.earrings),
  make(16, { name: 'Mahnoor Royal Polki Mala Haar', price: 54000, salePrice: 46000, mainImage: IMAGES.necklace, featured: true, category: demoCategories[0], collections: [demoCollections[1], demoCollections[4]], specifications: specs({ movement: 'Long Mala Haar', dialColor: 'Navratan Polki & Pearls' }) }, IMAGES.set),
];

export const demoReviews: Review[] = [
  {
    _id: 'rev-1',
    product: 'demo-4',
    user: 'usr-1',
    userName: 'Ayesha Khan',
    rating: 5,
    title: 'Breathtaking Bridal Quality!',
    comment: 'Ordered the Shehzadi set for my walima. The craftsmanship is identical to pure real gold polki! Came in a lovely velvet box.',
    verifiedPurchase: true,
    status: 'approved',
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    _id: 'rev-2',
    product: 'demo-1',
    user: 'usr-2',
    userName: 'Fatima Zahra',
    rating: 5,
    title: 'Daily Favorite Piece',
    comment: 'The Aurora pearl necklace has not lost its shine in 4 months. Extremely elegant for office wear and dinners.',
    verifiedPurchase: true,
    status: 'approved',
    createdAt: new Date(Date.now() - 8 * 86400000).toISOString(),
  },
  {
    _id: 'rev-3',
    product: 'demo-7',
    user: 'usr-3',
    userName: 'Mariam Tariq',
    rating: 5,
    title: 'Shines Like Real Diamonds',
    comment: 'Tennis bracelet quality is extraordinary. The double lock clasp gives great peace of mind. Fast delivery to Karachi in 2 days!',
    verifiedPurchase: true,
    status: 'approved',
    createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
  },
  {
    _id: 'rev-4',
    product: 'demo-5',
    user: 'usr-4',
    userName: 'Sana Malik',
    rating: 5,
    title: 'Gorgeous Festive Jhumkas',
    comment: 'Lightweight on the ears despite having such royal detail. Wore them on Mehndi and got compliments all night!',
    verifiedPurchase: true,
    status: 'approved',
    createdAt: new Date(Date.now() - 19 * 86400000).toISOString(),
  },
];

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
  contactEmail: 'msvelora@gmail.com',
  contactPhone: '+92 308 5060106',
  // Placeholder store contact & WhatsApp number — set the real one in admin settings
  whatsappNumber: '+92 308 5060106',
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
    customerReviews: true,
    newsletter: true,
  },
};

/** Local-dev-only demo staff account for trying /admin without the backend. */
export const DEMO_ADMIN = { email: 'admin@msvelora.com', password: 'AdminVelora@2026' };

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
    const reviewsWithProducts = demoReviews.map((r, i) => ({
      ...r,
      product: demoProducts[i % demoProducts.length],
    }));
    return {
      success: true,
      homepage: demoHomepage,
      settings: getDemoSettings(catalog),
      categories: demoCategories,
      collections: demoCollections,
      bestSellers: demoProducts.filter((p) => p.bestSeller),
      newArrivals: demoProducts.filter((p) => p.newArrival),
      verifiedReviews: reviewsWithProducts,
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

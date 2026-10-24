export interface ProductSpecifications {
  movement: string;
  caseMaterial: string;
  caseDiameter: string;
  caseThickness: string;
  strapMaterial: string;
  strapWidth: string;
  dialColor: string;
  crystal: string;
  waterResistance: string;
  warranty: string;
  origin: string;
}

export interface ProductImage {
  url: string;
  alt: string;
  isMain?: boolean;
}

export interface ProductVariant {
  _id?: string;
  sku: string;
  name: string;
  dialColor?: string;
  strapMaterial?: string;
  price?: number;
  salePrice?: number | null;
  stock: number;
  image?: string;
}

export interface Category {
  _id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  metaTitle?: string;
  metaDescription?: string;
  displayOrder: number;
  isActive: boolean;
}

export interface Collection {
  _id: string;
  name: string;
  slug: string;
  subtitle: string;
  description: string;
  image: string;
  bannerImage?: string;
  metaTitle?: string;
  metaDescription?: string;
  featured: boolean;
  displayOrder: number;
  isActive: boolean;
}

export interface Product {
  _id: string;
  name: string;
  slug: string;
  brand: string;
  model: string;
  sku: string;
  category?: Category | string;
  collections?: (Collection | string)[];
  gender: 'Men' | 'Women' | 'Unisex';
  price: number;
  salePrice: number | null;
  costPrice?: number;
  shortDescription: string;
  description: string;
  mainImage: string;
  images: ProductImage[];
  specifications: ProductSpecifications;
  variants: ProductVariant[];
  stock: number;
  reservedStock?: number;
  lowStockThreshold: number;
  soldCount: number;
  status: 'published' | 'draft' | 'archived';
  featured: boolean;
  bestSeller: boolean;
  newArrival: boolean;
  tags: string[];
  averageRating: number;
  reviewCount: number;
  metaTitle?: string;
  metaDescription?: string;
  createdAt: string;
}

export interface Review {
  _id: string;
  product: Product | string;
  user: string;
  userName: string;
  rating: number;
  title: string;
  comment: string;
  verifiedPurchase: boolean;
  status: 'approved' | 'pending' | 'rejected';
  createdAt: string;
}

export interface SavedAddress {
  _id?: string;
  label: string;
  fullName: string;
  phone: string;
  streetAddress: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: 'customer' | 'admin';
  status: 'active' | 'suspended';
  addresses: SavedAddress[];
  wishlist: (string | Product)[];
  createdAt: string;
}

export interface HeroSlide {
  _id?: string;
  badgeText: string;
  title: string;
  subtitle: string;
  desktopImage: string;
  mobileImage: string;
  primaryCtaText: string;
  primaryCtaLink: string;
  secondaryCtaText?: string;
  secondaryCtaLink?: string;
  displayOrder: number;
  isActive: boolean;
}

export interface HomepageContent {
  announcementBar: {
    isEnabled: boolean;
    rotateIntervalMs: number;
    messages: { _id?: string; text: string; link?: string; isActive: boolean }[];
  };
  carouselSettings: {
    autoRotate: boolean;
    intervalMs: number;
  };
  heroSlides: HeroSlide[];
  promoBanner: {
    badgeText: string;
    title: string;
    subtitle: string;
    description: string;
    image: string;
    ctaText: string;
    ctaLink: string;
    couponHighlight?: string;
    isActive: boolean;
  };
  brandStory: {
    eyebrow: string;
    heading: string;
    leadParagraph: string;
    bodyParagraph: string;
    image: string;
    highlights: { label: string; value: string; description: string }[];
    ctaText: string;
    ctaLink: string;
  };
  sectionVisibility: {
    heroCarousel: boolean;
    featuredCollections: boolean;
    bestSellers: boolean;
    promoBanner: boolean;
    newArrivals: boolean;
    brandStory: boolean;
    customerReviews: boolean;
    newsletter: boolean;
  };
}

export interface StoreSettings {
  storeName: string;
  tagline: string;
  logoUrl: string;
  faviconUrl: string;
  currency: string;
  currencySymbol: string;
  timezone: string;
  standardShippingFee: number;
  expressShippingFee: number;
  handDeliveryFee?: number;
  freeShippingThreshold: number;
  taxPercentage: number;
  allowGuestCheckout: boolean;
  enableCod: boolean;
  enableOnlinePayment: boolean;
  enableBankTransfer: boolean;
  bankDetails: string;
  contactEmail: string;
  contactPhone: string;
  whatsappNumber: string;
  whatsappOrderingEnabled?: boolean;
  mobileWallets?: MobileWallets;
  shipFrom?: { name: string; address: string; city: string; phone: string };
  whatsappTemplates?: WhatsAppTemplates;
  showroomAddress: string;
  socialLinks: {
    instagram: string;
    facebook: string;
    youtube: string;
    tiktok: string;
  };
  policies: {
    shippingPolicy: string;
    returnPolicy: string;
    privacyPolicy: string;
    termsOfService: string;
  };
}

export interface WalletAccount {
  enabled: boolean;
  accountTitle: string;
  accountNumber: string;
  accountName?: string;
}

export interface MobileWallets {
  jazzcash: WalletAccount;
  easypaisa: WalletAccount;
  nayapay?: WalletAccount;
  sadapay?: WalletAccount;
  instructions: string;
}

export type WhatsAppTemplateKey =
  | 'orderPlaced'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'paymentReminder'
  | 'paymentReceived'
  | 'refunded';

export type WhatsAppTemplates = Record<WhatsAppTemplateKey, string>;

export interface WhatsAppLogEntry {
  template: WhatsAppTemplateKey | 'custom';
  message: string;
  phone: string;
  sentBy: string;
  sentAt: string;
}

export interface ValidatedCartItem {
  productId: string;
  name: string;
  slug: string;
  brand: string;
  sku: string;
  variantSku?: string;
  variantName?: string;
  image: string;
  price: number;
  salePrice: number | null;
  effectivePrice: number;
  requestedQuantity: number;
  quantity: number;
  availableStock: number;
  subtotal: number;
  stockWarning?: string;
}

export interface CartSummary {
  subtotal: number;
  discountAmount: number;
  couponCode: string | null;
  couponValid: boolean;
  couponMessage: string;
  shippingCost: number;
  freeShippingThreshold: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  currencySymbol: string;
}

export interface OrderItem {
  product?: string;
  name: string;
  slug?: string;
  brand?: string;
  sku?: string;
  variantSku?: string;
  variantName?: string;
  image?: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  isSurpriseGift?: boolean;
}

export interface Order {
  _id: string;
  orderNumber: string;
  isGuest: boolean;
  items: OrderItem[];
  shippingAddress: {
    fullName: string;
    email: string;
    phone: string;
    streetAddress: string;
    city: string;
    province: string;
    postalCode: string;
    country: string;
    notes?: string;
  };
  shippingMethod: 'standard' | 'express' | 'hand' | 'pickup';
  deliveryPerson?: string;
  deliveryPhone?: string;
  manualChannel?: string;
  subtotal: number;
  discountAmount: number;
  couponCode?: string;
  shippingCost: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  paymentMethod: 'cod' | 'online_card' | 'bank_transfer' | 'jazzcash' | 'easypaisa' | 'online';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentReference?: string;
  paidAt?: string;
  fulfillmentStatus:
    | 'pending'
    | 'confirmed'
    | 'processing'
    | 'shipped'
    | 'delivered'
    | 'cancelled'
    | 'refunded';
  courierName?: string;
  trackingNumber?: string;
  shippedAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  inventoryRestored: boolean;
  orderSource?: 'website' | 'whatsapp' | 'manual';
  whatsappLog?: WhatsAppLogEntry[];
  statusHistory: {
    status: string;
    paymentStatus?: string;
    note: string;
    updatedBy?: string;
    timestamp: string;
  }[];
  createdAt: string;
}

export interface Coupon {
  _id: string;
  code: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderAmount: number;
  maxDiscountAmount?: number | null;
  startDate: string;
  expiryDate: string;
  usageLimit?: number | null;
  usedCount: number;
  perCustomerLimit: number;
  isActive: boolean;
  createdAt: string;
}

export interface Expense {
  _id: string;
  title: string;
  amount: number;
  category:
    | 'courier_shipping'
    | 'packaging'
    | 'marketing_ads'
    | 'inventory_materials'
    | 'rent_utilities'
    | 'salaries'
    | 'repairs_maintenance'
    | 'miscellaneous';
  paymentMethod: 'cash' | 'bank_transfer' | 'easypaisa' | 'jazzcash' | 'credit_card';
  date: string;
  referenceNumber?: string;
  notes?: string;
  loggedBy?: string;
  loggedByName?: string;
  createdAt: string;
}

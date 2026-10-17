import mongoose, { Schema, Document } from 'mongoose';

export interface IAnnouncementMessage {
  _id?: mongoose.Types.ObjectId;
  text: string;
  link?: string;
  isActive: boolean;
}

export interface IHeroSlide {
  _id?: mongoose.Types.ObjectId;
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

export interface IPromoBanner {
  badgeText: string;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  ctaText: string;
  ctaLink: string;
  couponHighlight?: string;
  isActive: boolean;
}

export interface IBrandStory {
  eyebrow: string;
  heading: string;
  leadParagraph: string;
  bodyParagraph: string;
  image: string;
  highlights: { label: string; value: string; description: string }[];
  ctaText: string;
  ctaLink: string;
}

export interface IHomepageContent extends Document {
  key: string;
  announcementBar: {
    isEnabled: boolean;
    rotateIntervalMs: number;
    messages: IAnnouncementMessage[];
  };
  carouselSettings: {
    autoRotate: boolean;
    intervalMs: number;
  };
  heroSlides: IHeroSlide[];
  promoBanner: IPromoBanner;
  brandStory: IBrandStory;
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
  updatedAt: Date;
}

const HeroSlideSchema = new Schema<IHeroSlide>(
  {
    badgeText: { type: String, default: 'NEW COLLECTION' },
    title: { type: String, required: true },
    subtitle: { type: String, required: true },
    desktopImage: { type: String, required: true },
    mobileImage: { type: String, required: true },
    primaryCtaText: { type: String, default: 'Shop Collection' },
    primaryCtaLink: { type: String, default: '/shop' },
    secondaryCtaText: { type: String, default: 'Discover the Collection' },
    secondaryCtaLink: { type: String, default: '/collections' },
    displayOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { _id: true }
);

const HomepageContentSchema = new Schema<IHomepageContent>(
  {
    key: { type: String, default: 'default', unique: true },
    announcementBar: {
      isEnabled: { type: Boolean, default: true },
      rotateIntervalMs: { type: Number, default: 4500 },
      messages: [
        {
          text: { type: String, required: true },
          link: { type: String, default: '/shop' },
          isActive: { type: Boolean, default: true },
        },
      ],
    },
    carouselSettings: {
      autoRotate: { type: Boolean, default: true },
      intervalMs: { type: Number, default: 6000 },
    },
    heroSlides: { type: [HeroSlideSchema], default: [] },
    promoBanner: {
      badgeText: { type: String, default: 'LIMITED EDITION' },
      title: { type: String, default: 'The Bridal Couture Edit' },
      subtitle: { type: String, default: 'Kundan, Polki & Pearl Sets' },
      description: {
        type: String,
        default:
          'Handcrafted statement sets for mehndi, baraat and walima, delivered in a keepsake MS Velora box.',
      },
      image: {
        type: String,
        default: 'https://images.unsplash.com/photo-1573408301185-9146fe634ad0?auto=format&fit=crop&w=1600&q=85',
      },
      ctaText: { type: String, default: 'Explore Bridal' },
      ctaLink: { type: String, default: '/shop?featured=true' },
      couponHighlight: { type: String, default: 'ROYAL10' },
      isActive: { type: Boolean, default: true },
    },
    brandStory: {
      eyebrow: { type: String, default: 'THE MS VELORA ATELIER' },
      heading: { type: String, default: 'Jewellery Made to Be Treasured' },
      leadParagraph: {
        type: String,
        default:
          'MS Velora designs elegant jewellery for the modern woman — from everyday pieces to statement bridal sets — for women across Pakistan.',
      },
      bodyParagraph: {
        type: String,
        default:
          'Every piece is checked by hand for finish, stone setting and clasp strength before it is wrapped in our signature gift box.',
      },
      image: {
        type: String,
        default: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=1200&q=85',
      },
      highlights: {
        type: [
          {
            label: { type: String, default: '' },
            value: { type: String, default: '' },
            description: { type: String, default: '' },
          },
        ],
        default: [
          {
            label: 'Quality Checked',
            value: 'Hand Inspected',
            description: 'Every piece is inspected for finish and stone setting before dispatch.',
          },
          {
            label: 'Plating Warranty',
            value: 'Lasting Shine',
            description: 'Craftsmanship protection with friendly after-sales support.',
          },
          {
            label: 'Gift Ready',
            value: 'Nationwide Delivery',
            description: 'Delivered in the MS Velora gift box to every city in Pakistan.',
          },
        ],
      },
      ctaText: { type: String, default: 'Explore Our Catalog' },
      ctaLink: { type: String, default: '/shop' },
    },
    sectionVisibility: {
      heroCarousel: { type: Boolean, default: true },
      featuredCollections: { type: Boolean, default: true },
      bestSellers: { type: Boolean, default: true },
      promoBanner: { type: Boolean, default: true },
      newArrivals: { type: Boolean, default: true },
      brandStory: { type: Boolean, default: true },
      customerReviews: { type: Boolean, default: true },
      newsletter: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

export const HomepageContent = mongoose.model<IHomepageContent>('HomepageContent', HomepageContentSchema);

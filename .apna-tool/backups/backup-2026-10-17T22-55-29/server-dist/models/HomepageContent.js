"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.HomepageContent = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const HeroSlideSchema = new mongoose_1.Schema({
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
}, { _id: true });
const HomepageContentSchema = new mongoose_1.Schema({
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
            default: 'Handcrafted statement sets for mehndi, baraat and walima, delivered in a keepsake MS Velora box.',
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
            default: 'MS Velora designs elegant jewellery for the modern woman — from everyday pieces to statement bridal sets — for women across Pakistan.',
        },
        bodyParagraph: {
            type: String,
            default: 'Every piece is checked by hand for finish, stone setting and clasp strength before it is wrapped in our signature gift box.',
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
}, { timestamps: true });
exports.HomepageContent = mongoose_1.default.model('HomepageContent', HomepageContentSchema);

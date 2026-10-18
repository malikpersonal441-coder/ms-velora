"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedDatabase = seedDatabase;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const models_1 = require("../models");
const env_1 = require("../config/env");
const img = (id, w = 1000) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=85`;
/** Placeholder jewellery imagery — replace from the admin panel with real product photos. */
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
const spec = (o) => ({
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
const slugOf = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
async function seedDatabase(forceReset = false) {
    const existingProductsCount = await models_1.Product.countDocuments();
    if (existingProductsCount > 0 && !forceReset) {
        return;
    }
    console.log('[Seed] Initializing MS Velora jewellery catalog & database records...');
    if (forceReset) {
        await Promise.all([
            models_1.User.deleteMany({}),
            models_1.Category.deleteMany({}),
            models_1.Collection.deleteMany({}),
            models_1.Product.deleteMany({}),
            models_1.StockMovement.deleteMany({}),
            models_1.Order.deleteMany({}),
            models_1.Coupon.deleteMany({}),
            models_1.Review.deleteMany({}),
            models_1.HomepageContent.deleteMany({}),
            models_1.StoreSettings.deleteMany({}),
            models_1.AuditLog.deleteMany({}),
        ]);
    }
    // 1. Admin account
    // The fallback password is published in the README, so it must never reach production
    if (env_1.env.NODE_ENV === 'production' && !process.env.ADMIN_PASSWORD) {
        throw new Error('ADMIN_PASSWORD must be set in production before the admin account can be created.');
    }
    const adminPasswordHash = await bcryptjs_1.default.hash(env_1.env.ADMIN_PASSWORD, 12);
    const adminUser = await models_1.User.create({
        name: 'Mahtab Saghir',
        email: env_1.env.ADMIN_EMAIL.toLowerCase(),
        phone: '+92 300 0000000',
        passwordHash: adminPasswordHash,
        role: 'admin',
        status: 'active',
        lastLoginAt: new Date(),
    });
    // 2. Categories
    const categoriesData = [
        { name: 'Necklaces', slug: 'necklaces', description: 'Pendants, chokers and layered chains for every neckline.', image: IMAGES.necklace },
        { name: 'Earrings', slug: 'earrings', description: 'Studs, hoops, drops and traditional jhumkas.', image: IMAGES.earrings },
        { name: 'Rings', slug: 'rings', description: 'Solitaires, stackables and statement cocktail rings.', image: IMAGES.ring },
        { name: 'Bracelets & Bangles', slug: 'bracelets-bangles', description: 'Delicate chains, cuffs and festive bangle sets.', image: IMAGES.bracelet },
        { name: 'Bridal Sets', slug: 'bridal-sets', description: 'Complete necklace and earring sets for the big day.', image: IMAGES.set },
    ].map((c, i) => ({
        ...c,
        metaTitle: `${c.name} | MS Velora`,
        metaDescription: `Shop women's ${c.name.toLowerCase()} at MS Velora.`,
        displayOrder: i + 1,
        isActive: true,
    }));
    const categories = await models_1.Category.insertMany(categoriesData);
    const catMap = new Map(categories.map((c) => [c.slug, c._id]));
    // 3. Collections
    const collectionsData = [
        { name: 'Everyday Elegance', slug: 'everyday-elegance', subtitle: 'Light, Wearable, Effortless', description: 'Minimal pieces made for daily wear, office and brunch.', image: IMAGES.pendant },
        { name: 'Bridal Couture', slug: 'bridal-couture', subtitle: 'For Your Most Precious Day', description: 'Statement kundan, polki and pearl sets for weddings.', image: IMAGES.set },
        { name: 'Pearl Edit', slug: 'pearl-edit', subtitle: 'Timeless Lustre', description: 'Freshwater-style pearls in soft, classic designs.', image: IMAGES.choker },
        { name: 'Festive Glow', slug: 'festive-glow', subtitle: 'Eid & Mehndi Ready', description: 'Jhumkas, bangles and colourful stones for celebrations.', image: IMAGES.jhumka },
        { name: 'Gift Picks', slug: 'gift-picks', subtitle: 'Made to Be Given', description: 'Thoughtful pieces boxed and ready to gift.', image: IMAGES.rings },
        { name: 'New Arrivals', slug: 'new-arrivals', subtitle: 'Fresh from the Atelier', description: 'The latest designs added to the MS Velora collection.', image: IMAGES.bangles },
    ].map((c, i) => ({
        ...c,
        bannerImage: c.image.replace('w=1000', 'w=1800'),
        featured: true,
        displayOrder: i + 1,
        isActive: true,
    }));
    const collections = await models_1.Collection.insertMany(collectionsData);
    const colMap = new Map(collections.map((c) => [c.slug, c._id]));
    // 4. Products — dummy catalogue; prices are left at 0 so the admin can set them
    const jewels = [
        {
            name: 'Aurora Pearl Drop Necklace',
            category: 'necklaces',
            collections: ['pearl-edit', 'everyday-elegance', 'new-arrivals'],
            shortDescription: 'A single lustrous pearl suspended from a fine gold-tone chain.',
            description: 'Soft, luminous and endlessly wearable. The Aurora pendant pairs a classic pearl drop with a delicate cable chain that sits beautifully on any neckline.',
            images: [IMAGES.pendant, IMAGES.choker],
            specifications: spec({ crystal: 'Pearl', dialColor: 'Ivory & Gold' }),
            stock: 15,
            featured: true,
            bestSeller: true,
            newArrival: true,
            tags: ['pearl', 'pendant', 'minimal', 'gift'],
        },
        {
            name: 'Noor Kundan Choker',
            category: 'necklaces',
            collections: ['bridal-couture', 'festive-glow'],
            shortDescription: 'Traditional kundan choker with pearl hangings and an adjustable dori.',
            description: 'Hand-set kundan stones framed in antique gold, finished with fine pearl drops. A statement piece for mehndi, baraat and festive evenings.',
            images: [IMAGES.choker, IMAGES.set],
            specifications: spec({ crystal: 'Kundan & Pearls', strapMaterial: 'Antique Gold', strapWidth: 'Adjustable Dori', dialColor: 'Gold & Green' }),
            stock: 8,
            featured: true,
            bestSeller: true,
            tags: ['kundan', 'choker', 'bridal', 'festive'],
        },
        {
            name: 'Celeste Layered Chain Necklace',
            category: 'necklaces',
            collections: ['everyday-elegance', 'new-arrivals'],
            shortDescription: 'Three fine chains layered for an effortless, stacked look.',
            description: 'Three delicate chains of graduated length, joined on a single clasp so the layers never tangle.',
            images: [IMAGES.necklace],
            specifications: spec({ crystal: 'None', strapMaterial: 'Brushed & Polished' }),
            stock: 20,
            newArrival: true,
            tags: ['layered', 'chain', 'everyday'],
        },
        {
            name: 'Zara Crystal Stud Earrings',
            category: 'earrings',
            collections: ['everyday-elegance', 'gift-picks'],
            shortDescription: 'Brilliant-cut crystal studs in a four-prong setting.',
            description: 'The everyday sparkle every jewellery box needs. Hypoallergenic posts make them comfortable for all-day wear.',
            images: [IMAGES.earrings],
            specifications: spec({ movement: 'Earrings', strapWidth: 'Push Back', dialColor: 'Silver', caseMaterial: 'Rhodium Plated Silver' }),
            stock: 25,
            featured: true,
            bestSeller: true,
            tags: ['studs', 'crystal', 'everyday', 'gift'],
        },
        {
            name: 'Mehr Gold Jhumka',
            category: 'earrings',
            collections: ['festive-glow', 'bridal-couture'],
            shortDescription: 'Classic bell-shaped jhumkas with tiny pearl fringes.',
            description: 'Intricately detailed jhumkas with an antique gold finish and swinging pearl fringes. A festive essential.',
            images: [IMAGES.jhumka, IMAGES.earrings],
            specifications: spec({ movement: 'Earrings', strapWidth: 'Hook', crystal: 'Pearls', strapMaterial: 'Antique Gold' }),
            stock: 12,
            bestSeller: true,
            newArrival: true,
            tags: ['jhumka', 'festive', 'traditional'],
        },
        {
            name: 'Luna Huggie Hoops',
            category: 'earrings',
            collections: ['everyday-elegance', 'new-arrivals'],
            shortDescription: 'Small hinged hoops that hug the earlobe.',
            description: 'Chunky yet lightweight huggie hoops with a seamless hinge closure. Wear alone or stack with studs.',
            images: [IMAGES.earrings],
            specifications: spec({ movement: 'Earrings', strapWidth: 'Hinged', crystal: 'None' }),
            stock: 18,
            newArrival: true,
            tags: ['hoops', 'huggie', 'everyday'],
        },
        {
            name: 'Solene Solitaire Ring',
            category: 'rings',
            collections: ['gift-picks', 'everyday-elegance'],
            shortDescription: 'A single brilliant stone on a slim polished band.',
            description: 'Timeless and understated, the Solene solitaire catches the light from every angle. Available in adjustable sizing.',
            images: [IMAGES.ring],
            specifications: spec({ movement: 'Ring', caseMaterial: 'Rhodium Plated Silver', strapWidth: 'Adjustable Band', dialColor: 'Silver' }),
            stock: 14,
            featured: true,
            bestSeller: true,
            tags: ['solitaire', 'ring', 'gift', 'promise'],
        },
        {
            name: 'Rosa Stackable Ring Set',
            category: 'rings',
            collections: ['gift-picks', 'new-arrivals'],
            shortDescription: 'A trio of slim bands to mix, match and stack.',
            description: 'Three delicate bands — plain, twisted and crystal-set — in a warm rose-gold tone.',
            images: [IMAGES.rings],
            specifications: spec({ movement: 'Ring', caseMaterial: 'Rose Gold Plated Brass', strapWidth: 'Open Band', dialColor: 'Rose Gold' }),
            stock: 16,
            newArrival: true,
            tags: ['stackable', 'rose-gold', 'ring-set'],
        },
        {
            name: 'Ayla Tennis Bracelet',
            category: 'bracelets-bangles',
            collections: ['gift-picks', 'everyday-elegance'],
            shortDescription: 'A continuous line of sparkling stones on a flexible setting.',
            description: 'The classic tennis bracelet, refined. Secure box clasp with a safety latch.',
            images: [IMAGES.bracelet],
            specifications: spec({ movement: 'Bracelet', strapWidth: 'Box Clasp', caseMaterial: 'Rhodium Plated Brass', dialColor: 'Silver' }),
            stock: 10,
            featured: true,
            tags: ['tennis', 'bracelet', 'gift'],
        },
        {
            name: 'Rani Festive Bangle Set',
            category: 'bracelets-bangles',
            collections: ['festive-glow', 'bridal-couture'],
            shortDescription: 'A set of textured and stone-set bangles for celebrations.',
            description: 'A coordinated set of bangles mixing hammered gold texture with coloured stones. Perfect with festive outfits.',
            images: [IMAGES.bangles],
            specifications: spec({ movement: 'Bangles', strapWidth: 'Slip On', crystal: 'Coloured Stones', dialColor: 'Gold & Maroon' }),
            stock: 9,
            bestSeller: true,
            newArrival: true,
            tags: ['bangles', 'festive', 'set'],
        },
        {
            name: 'Shehzadi Bridal Necklace Set',
            category: 'bridal-sets',
            collections: ['bridal-couture'],
            shortDescription: 'Full bridal necklace with matching earrings and tikka.',
            description: 'A complete bridal set in polki-style stones and pearls: statement necklace, matching earrings and maang tikka, presented in a keepsake box.',
            images: [IMAGES.set, IMAGES.choker],
            specifications: spec({ movement: 'Bridal Set', crystal: 'Polki Style Stones & Pearls', strapWidth: 'Adjustable Dori', dialColor: 'Gold & Red', caseThickness: 'Statement' }),
            stock: 4,
            featured: true,
            tags: ['bridal', 'set', 'polki', 'wedding'],
        },
        {
            name: 'Gul Pearl Bridal Set',
            category: 'bridal-sets',
            collections: ['bridal-couture', 'pearl-edit', 'new-arrivals'],
            shortDescription: 'Soft pearl necklace and earrings for nikkah and walima.',
            description: 'Layers of pearls with delicate crystal accents — elegant, light and made for a graceful bridal look.',
            images: [IMAGES.choker, IMAGES.pendant],
            specifications: spec({ movement: 'Bridal Set', crystal: 'Pearls & Crystals', dialColor: 'Ivory & Gold' }),
            stock: 6,
            featured: true,
            newArrival: true,
            tags: ['bridal', 'pearl', 'nikkah'],
        },
    ];
    const productsSeed = jewels.map((j) => {
        const slug = slugOf(j.name);
        return {
            name: j.name,
            slug,
            brand: j.brand || 'MS Velora',
            model: '',
            sku: slug.toUpperCase(),
            category: catMap.get(j.category),
            collections: j.collections.map((c) => colMap.get(c)),
            gender: 'Women',
            price: 0,
            salePrice: null,
            shortDescription: j.shortDescription,
            description: j.description,
            mainImage: j.images[0],
            images: j.images.map((url, i) => ({ url, alt: j.name, isMain: i === 0 })),
            specifications: j.specifications,
            variants: [],
            stock: j.stock,
            lowStockThreshold: 5,
            soldCount: 0,
            status: 'published',
            featured: !!j.featured,
            bestSeller: !!j.bestSeller,
            newArrival: !!j.newArrival,
            tags: j.tags,
            averageRating: 0,
            reviewCount: 0,
        };
    });
    const insertedProducts = await models_1.Product.insertMany(productsSeed);
    await models_1.StockMovement.insertMany(insertedProducts.map((p) => ({
        product: p._id,
        sku: p.sku,
        type: 'initial_seed',
        quantityChange: p.stock,
        previousStock: 0,
        newStock: p.stock,
        reason: 'Initial catalog allocation',
        performedBy: adminUser._id,
        performedByName: adminUser.name,
    })));
    // 5. Homepage CMS content
    await models_1.HomepageContent.create({
        key: 'default',
        announcementBar: {
            isEnabled: true,
            rotateIntervalMs: 4500,
            messages: [
                { text: 'FREE DELIVERY ACROSS PAKISTAN', link: '/shop', isActive: true },
                { text: 'NEW ARRIVALS — FRESH DESIGNS NOW LIVE', link: '/collections/new-arrivals', isActive: true },
                { text: 'EVERY PIECE ARRIVES IN AN MS VELORA GIFT BOX', link: '/shipping-returns', isActive: true },
            ],
        },
        carouselSettings: { autoRotate: true, intervalMs: 6000 },
        heroSlides: [
            {
                badgeText: 'NEW COLLECTION',
                title: 'Jewellery That Tells Your Story',
                subtitle: 'Necklaces, earrings, rings and bangles designed for the modern woman.',
                desktopImage: img('1599643478518-a784e5dc4c8f', 1920),
                mobileImage: img('1599643478518-a784e5dc4c8f', 900),
                primaryCtaText: 'Shop Now',
                primaryCtaLink: '/shop',
                secondaryCtaText: 'View Collections',
                secondaryCtaLink: '/collections',
                displayOrder: 1,
                isActive: true,
            },
            {
                badgeText: 'BRIDAL COUTURE',
                title: 'Made for Your Most Precious Day',
                subtitle: 'Kundan, polki and pearl sets for mehndi, baraat and walima.',
                desktopImage: img('1573408301185-9146fe634ad0', 1920),
                mobileImage: img('1573408301185-9146fe634ad0', 900),
                primaryCtaText: 'Explore Bridal',
                primaryCtaLink: '/collections/bridal-couture',
                secondaryCtaText: 'Bridal Sets',
                secondaryCtaLink: '/shop?category=bridal-sets',
                displayOrder: 2,
                isActive: true,
            },
            {
                badgeText: 'THE PEARL EDIT',
                title: 'Timeless Lustre, Everyday Grace',
                subtitle: 'Soft pearls in classic designs you will reach for again and again.',
                desktopImage: img('1515562141207-7a88fb7ce338', 1920),
                mobileImage: img('1515562141207-7a88fb7ce338', 900),
                primaryCtaText: 'Shop Pearls',
                primaryCtaLink: '/collections/pearl-edit',
                secondaryCtaText: 'New Arrivals',
                secondaryCtaLink: '/collections/new-arrivals',
                displayOrder: 3,
                isActive: true,
            },
        ],
    });
    // 6. Store settings
    await models_1.StoreSettings.create({ key: 'default' });
    // 7. Coupons
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    await models_1.Coupon.insertMany([
        {
            code: 'ROYAL10',
            description: '10% off your order',
            discountType: 'percentage',
            discountValue: 10,
            minOrderAmount: 20000,
            maxDiscountAmount: 10000,
            startDate: new Date(Date.now() - 86400000),
            expiryDate: nextYear,
            usageLimit: 500,
            usedCount: 0,
            perCustomerLimit: 3,
            isActive: true,
        },
    ]);
    console.log(`[Seed] MS Velora database seeded with ${insertedProducts.length} jewellery pieces and ${collections.length} collections.`);
}

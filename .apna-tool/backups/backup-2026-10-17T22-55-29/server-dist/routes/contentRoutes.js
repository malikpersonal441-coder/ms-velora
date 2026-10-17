"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleSitemap = handleSitemap;
exports.handleRobots = handleRobots;
const express_1 = require("express");
const zod_1 = require("zod");
const HomepageContent_1 = require("../models/HomepageContent");
const StoreSettings_1 = require("../models/StoreSettings");
const Category_1 = require("../models/Category");
const Collection_1 = require("../models/Collection");
const Product_1 = require("../models/Product");
const Review_1 = require("../models/Review");
const NewsletterSubscriber_1 = require("../models/NewsletterSubscriber");
const errorHandler_1 = require("../middleware/errorHandler");
const env_1 = require("../config/env");
const router = (0, express_1.Router)();
// GET /api/content/storefront — Consolidated initial storefront data
router.get('/storefront', async (_req, res, next) => {
    try {
        let [homepage, settings] = await Promise.all([
            HomepageContent_1.HomepageContent.findOne({ key: 'default' }),
            StoreSettings_1.StoreSettings.findOne({ key: 'default' }),
        ]);
        if (!homepage) {
            homepage = await HomepageContent_1.HomepageContent.create({ key: 'default' });
        }
        if (!settings) {
            settings = await StoreSettings_1.StoreSettings.create({ key: 'default' });
        }
        const [categories, collections, bestSellers, newArrivals, verifiedReviews] = await Promise.all([
            Category_1.Category.find({ isActive: true }).sort({ displayOrder: 1, name: 1 }),
            Collection_1.Collection.find({ isActive: true }).sort({ displayOrder: 1, name: 1 }),
            Product_1.Product.find({ status: 'published', bestSeller: true })
                .populate('category', 'name slug')
                .sort({ soldCount: -1, createdAt: -1 })
                .limit(8),
            Product_1.Product.find({ status: 'published', newArrival: true })
                .populate('category', 'name slug')
                .sort({ createdAt: -1 })
                .limit(8),
            Review_1.Review.find({ status: 'approved', verifiedPurchase: true })
                .populate('product', 'name slug brand mainImage')
                .sort({ rating: -1, createdAt: -1 })
                .limit(6),
        ]);
        res.json({
            success: true,
            homepage,
            settings,
            categories,
            collections,
            bestSellers,
            newArrivals,
            verifiedReviews,
        });
    }
    catch (err) {
        next(err);
    }
});
// GET /api/content/homepage
router.get('/homepage', async (_req, res, next) => {
    try {
        let homepage = await HomepageContent_1.HomepageContent.findOne({ key: 'default' });
        if (!homepage)
            homepage = await HomepageContent_1.HomepageContent.create({ key: 'default' });
        res.json({ success: true, homepage });
    }
    catch (err) {
        next(err);
    }
});
// GET /api/content/settings
router.get('/settings', async (_req, res, next) => {
    try {
        let settings = await StoreSettings_1.StoreSettings.findOne({ key: 'default' });
        if (!settings)
            settings = await StoreSettings_1.StoreSettings.create({ key: 'default' });
        res.json({ success: true, settings });
    }
    catch (err) {
        next(err);
    }
});
// GET /api/content/categories
router.get('/categories', async (_req, res, next) => {
    try {
        const categories = await Category_1.Category.find({ isActive: true }).sort({ displayOrder: 1, name: 1 });
        res.json({ success: true, categories });
    }
    catch (err) {
        next(err);
    }
});
// GET /api/content/collections
router.get('/collections', async (_req, res, next) => {
    try {
        const collections = await Collection_1.Collection.find({ isActive: true }).sort({ displayOrder: 1, name: 1 });
        res.json({ success: true, collections });
    }
    catch (err) {
        next(err);
    }
});
// GET /api/content/collections/:slug
router.get('/collections/:slug', async (req, res, next) => {
    try {
        const collection = await Collection_1.Collection.findOne({
            slug: String(req.params.slug).toLowerCase(),
            isActive: true,
        });
        if (!collection) {
            throw new errorHandler_1.AppError('Collection not found.', 404);
        }
        const products = await Product_1.Product.find({
            status: 'published',
            collections: collection._id,
        })
            .populate('category', 'name slug')
            .sort({ featured: -1, createdAt: -1 });
        res.json({
            success: true,
            collection,
            products,
        });
    }
    catch (err) {
        next(err);
    }
});
// POST /api/content/newsletter
router.post('/newsletter', async (req, res, next) => {
    try {
        const { email } = zod_1.z
            .object({
            email: zod_1.z.string().email('Please enter a valid email address'),
        })
            .parse(req.body);
        const normalized = email.toLowerCase().trim();
        const existing = await NewsletterSubscriber_1.NewsletterSubscriber.findOne({ email: normalized });
        if (existing) {
            existing.isActive = true;
            await existing.save();
            res.json({
                success: true,
                message: 'You are subscribed to the MS Velora Private Collector Journal.',
            });
            return;
        }
        await NewsletterSubscriber_1.NewsletterSubscriber.create({ email: normalized, isActive: true });
        res.status(201).json({
            success: true,
            message: 'Welcome to the MS Velora Private Collector Journal.',
        });
    }
    catch (err) {
        next(err);
    }
});
// Helper handlers for /sitemap.xml and /robots.txt
async function handleSitemap(_req, res, next) {
    try {
        const baseUrl = env_1.env.FRONTEND_URL.replace(/\/$/, '');
        const [products, collections] = await Promise.all([
            Product_1.Product.find({ status: 'published' }).select('slug updatedAt'),
            Collection_1.Collection.find({ isActive: true }).select('slug updatedAt'),
        ]);
        const staticPages = ['', '/shop', '/collections', '/track-order', '/shipping-returns', '/privacy-policy', '/terms'];
        const urls = [];
        for (const page of staticPages) {
            urls.push(`
  <url>
    <loc>${baseUrl}${page}</loc>
    <changefreq>daily</changefreq>
    <priority>${page === '' ? '1.0' : '0.8'}</priority>
  </url>`);
        }
        for (const col of collections) {
            urls.push(`
  <url>
    <loc>${baseUrl}/collections/${col.slug}</loc>
    <lastmod>${col.updatedAt.toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`);
        }
        for (const prod of products) {
            urls.push(`
  <url>
    <loc>${baseUrl}/product/${prod.slug}</loc>
    <lastmod>${prod.updatedAt.toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`);
        }
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}
</urlset>`;
        res.header('Content-Type', 'application/xml');
        res.send(xml);
    }
    catch (err) {
        next(err);
    }
}
function handleRobots(_req, res) {
    const baseUrl = env_1.env.FRONTEND_URL.replace(/\/$/, '');
    const txt = `User-agent: *
Allow: /
Allow: /shop
Allow: /collections
Allow: /product/
Disallow: /admin
Disallow: /admin/
Disallow: /account
Disallow: /account/
Disallow: /checkout
Disallow: /cart
Disallow: /api/

Sitemap: ${baseUrl}/sitemap.xml
`;
    res.header('Content-Type', 'text/plain');
    res.send(txt);
}
exports.default = router;

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { HomepageContent } from '../models/HomepageContent';
import { StoreSettings } from '../models/StoreSettings';
import { Category } from '../models/Category';
import { Collection } from '../models/Collection';
import { Product } from '../models/Product';
import { Review } from '../models/Review';
import { NewsletterSubscriber } from '../models/NewsletterSubscriber';
import { AppError } from '../middleware/errorHandler';
import { env } from '../config/env';

const router = Router();

// GET /api/content/storefront — Consolidated initial storefront data
router.get('/storefront', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    let [homepage, settings] = await Promise.all([
      HomepageContent.findOne({ key: 'default' }),
      StoreSettings.findOne({ key: 'default' }),
    ]);

    if (!homepage) {
      homepage = await HomepageContent.create({ key: 'default' });
    }
    if (!settings) {
      settings = await StoreSettings.create({ key: 'default' });
    }

    const [categories, collections, bestSellers, newArrivals, verifiedReviews] = await Promise.all([
      Category.find({ isActive: true }).sort({ displayOrder: 1, name: 1 }),
      Collection.find({ isActive: true }).sort({ displayOrder: 1, name: 1 }),
      Product.find({ status: 'published', bestSeller: true })
        .populate('category', 'name slug')
        .sort({ soldCount: -1, createdAt: -1 })
        .limit(8),
      Product.find({ status: 'published', newArrival: true })
        .populate('category', 'name slug')
        .sort({ createdAt: -1 })
        .limit(8),
      Review.find({ status: 'approved', verifiedPurchase: true })
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
  } catch (err) {
    next(err);
  }
});

// GET /api/content/homepage
router.get('/homepage', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    let homepage = await HomepageContent.findOne({ key: 'default' });
    if (!homepage) homepage = await HomepageContent.create({ key: 'default' });
    res.json({ success: true, homepage });
  } catch (err) {
    next(err);
  }
});

// GET /api/content/settings
router.get('/settings', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    let settings = await StoreSettings.findOne({ key: 'default' });
    if (!settings) settings = await StoreSettings.create({ key: 'default' });
    res.json({ success: true, settings });
  } catch (err) {
    next(err);
  }
});

// GET /api/content/categories
router.get('/categories', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({ displayOrder: 1, name: 1 });
    res.json({ success: true, categories });
  } catch (err) {
    next(err);
  }
});

// GET /api/content/collections
router.get('/collections', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const collections = await Collection.find({ isActive: true }).sort({ displayOrder: 1, name: 1 });
    res.json({ success: true, collections });
  } catch (err) {
    next(err);
  }
});

// GET /api/content/collections/:slug
router.get('/collections/:slug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const collection = await Collection.findOne({
      slug: String(req.params.slug).toLowerCase(),
      isActive: true,
    });
    if (!collection) {
      throw new AppError('Collection not found.', 404);
    }

    const products = await Product.find({
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
  } catch (err) {
    next(err);
  }
});

// POST /api/content/newsletter
router.post('/newsletter', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = z
      .object({
        email: z.string().email('Please enter a valid email address'),
      })
      .parse(req.body);

    const normalized = email.toLowerCase().trim();
    const existing = await NewsletterSubscriber.findOne({ email: normalized });
    if (existing) {
      existing.isActive = true;
      await existing.save();
      res.json({
        success: true,
        message: 'You are subscribed to the MS Velora Private Collector Journal.',
      });
      return;
    }

    await NewsletterSubscriber.create({ email: normalized, isActive: true });
    res.status(201).json({
      success: true,
      message: 'Welcome to the MS Velora Private Collector Journal.',
    });
  } catch (err) {
    next(err);
  }
});

// Helper handlers for /sitemap.xml and /robots.txt
export async function handleSitemap(_req: Request, res: Response, next: NextFunction) {
  try {
    const baseUrl = env.FRONTEND_URL.replace(/\/$/, '');
    const [products, collections] = await Promise.all([
      Product.find({ status: 'published' }).select('slug updatedAt'),
      Collection.find({ isActive: true }).select('slug updatedAt'),
    ]);

    const staticPages = ['', '/shop', '/collections', '/track-order', '/shipping-returns', '/privacy-policy', '/terms'];

    const urls: string[] = [];
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
  } catch (err) {
    next(err);
  }
}

export function handleRobots(_req: Request, res: Response) {
  const baseUrl = env.FRONTEND_URL.replace(/\/$/, '');
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

export default router;

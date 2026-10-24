import { Router, Request, Response, NextFunction } from 'express';
import { buildTextFilter, normaliseQuery, nameRelevance, EFFECTIVE_PRICE } from '../utils/search';
import mongoose from 'mongoose';
import { z } from 'zod';
import { Product } from '../models/Product';
import { Category } from '../models/Category';
import { Collection } from '../models/Collection';
import { Review } from '../models/Review';
import { Order } from '../models/Order';
import { requireAuth } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// Store-only fields that must never reach shoppers through the public catalogue
const PUBLIC_FIELDS = '-costPrice';

// GET /api/products — Filtered, sorted, paginated product listing with dynamic facets
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      q,
      brand,
      category,
      collection,
      gender,
      movement,
      strapMaterial,
      dialColor,
      metal,
      stone,
      minPrice,
      maxPrice,
      inStock,
      onSale,
      featured,
      bestSeller,
      newArrival,
      sort = 'featured',
      page = '1',
      limit = '12',
    } = req.query as Record<string, string | undefined>;

    const filter: Record<string, unknown> = { status: 'published' };
    const list = (v?: string) => (v || '').split(',').map((s) => s.trim()).filter(Boolean);

    const brands = list(brand);
    if (brands.length > 0) filter.brand = { $in: brands };

    if (category && category.trim()) {
      if (mongoose.isValidObjectId(category)) {
        filter.category = new (mongoose.Types.ObjectId as any)(category);
      } else {
        const catDoc = await Category.findOne({ slug: category.toLowerCase().trim() });
        // No matching category slug matches nothing
        if (catDoc) filter.category = catDoc._id;
        else filter._id = null;
      }
    }

    if (collection && collection.trim()) {
      if (mongoose.isValidObjectId(collection)) {
        filter.collections = new (mongoose.Types.ObjectId as any)(collection);
      } else {
        const colDoc = await Collection.findOne({ slug: collection.toLowerCase().trim() });
        if (colDoc) filter.collections = colDoc._id;
        else filter._id = null;
      }
    }

    const genders = list(gender);
    if (genders.length > 0) filter.gender = { $in: genders };
    for (const [param, field] of [
      [movement, 'specifications.movement'],
      [strapMaterial, 'specifications.strapMaterial'],
      [dialColor, 'specifications.dialColor'],
      [metal, 'specifications.caseMaterial'],
      [stone, 'specifications.crystal'],
    ] as const) {
      const values = list(param);
      if (values.length > 0) filter[field] = { $in: values };
    }

    const min = Number(minPrice);
    const max = Number(maxPrice);
    if ((minPrice && Number.isFinite(min)) || (maxPrice && Number.isFinite(max))) {
      filter.$expr = {
        $and: [
          { $gte: [EFFECTIVE_PRICE, minPrice && Number.isFinite(min) ? min : 0] },
          { $lte: [EFFECTIVE_PRICE, maxPrice && Number.isFinite(max) ? max : Number.MAX_SAFE_INTEGER] },
        ],
      };
    }

    if (inStock === 'true') filter.stock = { $gt: 0 };
    if (onSale === 'true') filter.salePrice = { $ne: null, $gt: 0 };
    if (featured === 'true') filter.featured = true;
    if (bestSeller === 'true') filter.bestSeller = true;
    if (newArrival === 'true') filter.newArrival = true;

    // Text search: every word must match; with no hits, retry tolerating one typo per word
    const query = normaliseQuery(q);
    let fuzzy = false;
    let matchFilter = filter;
    if (query) {
      matchFilter = { ...filter, ...buildTextFilter(query) };
      if ((await Product.countDocuments(matchFilter)) === 0) {
        const fuzzyFilter = { ...filter, ...buildTextFilter(query, true) };
        if ((await Product.countDocuments(fuzzyFilter)) > 0) {
          matchFilter = fuzzyFilter;
          fuzzy = true;
        }
      }
    }

    let sortOption: Record<string, 1 | -1>;
    switch (sort) {
      case 'price_asc':
        sortOption = { effectivePrice: 1, _id: 1 };
        break;
      case 'price_desc':
        sortOption = { effectivePrice: -1, _id: 1 };
        break;
      case 'newest':
        sortOption = { createdAt: -1 };
        break;
      case 'popularity':
        sortOption = { soldCount: -1, bestSeller: -1, createdAt: -1 };
        break;
      case 'rating':
        sortOption = { averageRating: -1, reviewCount: -1 };
        break;
      case 'featured':
      default:
        sortOption = { featured: -1, bestSeller: -1, createdAt: -1 };
        break;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(48, Math.max(1, parseInt(limit, 10) || 12));
    const skip = (pageNum - 1) * limitNum;

    // Sorting by the price the shopper pays needs a computed field, so page through ids in an aggregate
    const [pageIds, totalCount, facetRows] = await Promise.all([
      Product.aggregate<{ _id: mongoose.Types.ObjectId }>([
        { $match: matchFilter },
        { $addFields: { effectivePrice: EFFECTIVE_PRICE } },
        { $sort: sortOption },
        { $skip: skip },
        { $limit: limitNum },
        { $project: { _id: 1 } },
      ]),
      Product.countDocuments(matchFilter),
      Product.aggregate([
        { $match: { status: 'published' } },
        {
          $group: {
            _id: null,
            brands: { $addToSet: '$brand' },
            movements: { $addToSet: '$specifications.movement' },
            strapMaterials: { $addToSet: '$specifications.strapMaterial' },
            dialColors: { $addToSet: '$specifications.dialColor' },
            metals: { $addToSet: '$specifications.caseMaterial' },
            stones: { $addToSet: '$specifications.crystal' },
            min: { $min: EFFECTIVE_PRICE },
            max: { $max: EFFECTIVE_PRICE },
          },
        },
      ]),
    ]);

    const docs = await Product.find({ _id: { $in: pageIds.map((p) => p._id) } })
      .select(PUBLIC_FIELDS)
      .populate('category', 'name slug')
      .populate('collections', 'name slug');
    const byId = new Map(docs.map((d) => [String(d._id), d]));
    const products = pageIds.map((p) => byId.get(String(p._id))).filter(Boolean);

    const f = facetRows[0] || {};
    const clean = (values?: unknown[]) =>
      Array.from(new Set((values || []).filter((v): v is string => typeof v === 'string' && v.trim() !== '').map((v) => v.trim()))).sort();

    res.json({
      success: true,
      products,
      fuzzy,
      pagination: {
        total: totalCount,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalCount / limitNum) || 1,
      },
      facets: {
        brands: clean(f.brands),
        movements: clean(f.movements),
        strapMaterials: clean(f.strapMaterials),
        dialColors: clean(f.dialColors),
        metals: clean(f.metals),
        stones: clean(f.stones),
        genders: ['Men', 'Women', 'Unisex'],
        priceRange: { min: f.min ?? 0, max: f.max ?? 0 },
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/products/by-ids?ids=a,b,c — current data for saved pieces (guest wishlist).
// Only published products are returned; the caller treats missing ids as no longer available.
router.get('/by-ids', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ids = String(req.query.ids || '')
      .split(',')
      .map((s) => s.trim())
      .filter((s) => mongoose.isValidObjectId(s))
      .slice(0, 100);
    if (ids.length === 0) {
      res.json({ success: true, products: [] });
      return;
    }
    const products = await Product.find({ _id: { $in: ids }, status: 'published' }).select(PUBLIC_FIELDS).populate('category', 'name slug');
    res.json({ success: true, products });
  } catch (err) {
    next(err);
  }
});

// GET /api/products/suggest?q= — lightweight live suggestions for the search bar
router.get('/suggest', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = normaliseQuery(req.query.q as string | undefined);
    if (query.length < 2) {
      res.json({ success: true, products: [], categories: [], fuzzy: false });
      return;
    }
    const select = 'name slug mainImage price salePrice stock category';
    let fuzzy = false;
    let products = await Product.find({ status: 'published', ...buildTextFilter(query) })
      .select(select)
      .populate('category', 'name slug')
      .sort({ featured: -1, soldCount: -1 })
      .limit(24);
    if (products.length === 0) {
      products = await Product.find({ status: 'published', ...buildTextFilter(query, true) })
        .select(select)
        .populate('category', 'name slug')
        .sort({ featured: -1, soldCount: -1 })
        .limit(6);
      fuzzy = products.length > 0;
    }
    // Name matches first; the sort is stable, so featured/best-selling order holds within a tier
    products = products.sort((a, b) => nameRelevance(b.name, query) - nameRelevance(a.name, query)).slice(0, 6);
    const catRegex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const categories = await Category.find({ isActive: true, name: catRegex }).select('name slug').limit(4);
    res.json({ success: true, products, categories, fuzzy });
  } catch (err) {
    next(err);
  }
});

// GET /api/products/:slug — Product details + verified reviews + related products
router.get('/:slug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const slug = String(req.params.slug);
    let product = await Product.findOne({ slug: slug.toLowerCase(), status: 'published' })
      .select(PUBLIC_FIELDS)
      .populate('category', 'name slug description')
      .populate('collections', 'name slug subtitle');

    if (!product && mongoose.isValidObjectId(slug)) {
      product = await Product.findOne({ _id: slug, status: 'published' })
        .select(PUBLIC_FIELDS)
        .populate('category', 'name slug description')
        .populate('collections', 'name slug subtitle');
    }

    if (!product) {
      throw new AppError('Product not found.', 404);
    }

    const [reviews, relatedProducts] = await Promise.all([
      Review.find({ product: product._id, status: 'approved' }).sort({ createdAt: -1 }).limit(30),
      Product.find({
        _id: { $ne: product._id },
        status: 'published',
        $or: [
          { category: product.category },
          { brand: product.brand },
          { gender: product.gender },
        ],
      })
        .select('name slug brand model sku price salePrice mainImage images stock specifications featured bestSeller newArrival averageRating reviewCount')
        .limit(4),
    ]);

    res.json({
      success: true,
      product,
      reviews,
      relatedProducts,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/products/:productId/reviews — Submit a customer review
router.post(
  '/:productId/reviews',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const reviewSchema = z.object({
        rating: z.number().int().min(1, 'Rating must be between 1 and 5').max(5),
        title: z.string().min(3, 'Review headline is required').max(120),
        comment: z.string().min(10, 'Please write at least 10 characters in your review').max(2000),
      });

      const data = reviewSchema.parse(req.body);
      const product = await Product.findById(req.params.productId);
      if (!product) {
        throw new AppError('Product not found.', 404);
      }

      // Check if customer has purchased this product
      const matchingOrder = await Order.findOne({
        user: req.user!._id,
        'items.product': product._id,
        fulfillmentStatus: { $nin: ['cancelled', 'refunded'] },
      });

      const existingReview = await Review.findOne({
        product: product._id,
        user: req.user!._id,
      });

      let review;
      if (existingReview) {
        existingReview.rating = data.rating;
        existingReview.title = data.title;
        existingReview.comment = data.comment;
        existingReview.verifiedPurchase = Boolean(matchingOrder);
        review = await existingReview.save();
      } else {
        review = await Review.create({
          product: product._id,
          user: req.user!._id,
          userName: req.user!.name,
          order: matchingOrder?._id,
          rating: data.rating,
          title: data.title,
          comment: data.comment,
          verifiedPurchase: Boolean(matchingOrder),
          status: 'approved',
        });
      }

      // Recalculate product rating stats from approved reviews
      const allReviews = await Review.find({ product: product._id, status: 'approved' });
      const reviewCount = allReviews.length;
      const averageRating =
        reviewCount > 0
          ? Number(
              (allReviews.reduce((acc, r) => acc + r.rating, 0) / reviewCount).toFixed(1)
            )
          : 0;

      product.reviewCount = reviewCount;
      product.averageRating = averageRating;
      await product.save();

      res.status(201).json({
        success: true,
        message: 'Thank you for sharing your review.',
        review,
        averageRating,
        reviewCount,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;

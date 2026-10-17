"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const mongoose_1 = __importDefault(require("mongoose"));
const zod_1 = require("zod");
const Product_1 = require("../models/Product");
const Category_1 = require("../models/Category");
const Collection_1 = require("../models/Collection");
const Review_1 = require("../models/Review");
const Order_1 = require("../models/Order");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const router = (0, express_1.Router)();
// GET /api/products — Filtered, sorted, paginated product listing with dynamic facets
router.get('/', async (req, res, next) => {
    try {
        const { q, brand, category, collection, gender, movement, strapMaterial, dialColor, minPrice, maxPrice, inStock, onSale, featured, bestSeller, newArrival, sort = 'featured', page = '1', limit = '12', } = req.query;
        const filter = { status: 'published' };
        if (q && q.trim()) {
            const escaped = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(escaped, 'i');
            filter.$or = [
                { name: regex },
                { brand: regex },
                { model: regex },
                { sku: regex },
                { shortDescription: regex },
                { tags: regex },
            ];
        }
        if (brand && brand.trim()) {
            const brands = brand.split(',').map((b) => b.trim()).filter(Boolean);
            if (brands.length > 0) {
                filter.brand = { $in: brands };
            }
        }
        if (category && category.trim()) {
            if (mongoose_1.default.isValidObjectId(category)) {
                filter.category = new mongoose_1.default.Types.ObjectId(category);
            }
            else {
                const catDoc = await Category_1.Category.findOne({ slug: category.toLowerCase().trim() });
                if (catDoc) {
                    filter.category = catDoc._id;
                }
                else {
                    // No matching category slug
                    filter._id = null;
                }
            }
        }
        if (collection && collection.trim()) {
            if (mongoose_1.default.isValidObjectId(collection)) {
                filter.collections = new mongoose_1.default.Types.ObjectId(collection);
            }
            else {
                const colDoc = await Collection_1.Collection.findOne({ slug: collection.toLowerCase().trim() });
                if (colDoc) {
                    filter.collections = colDoc._id;
                }
                else {
                    filter._id = null;
                }
            }
        }
        if (gender && gender.trim()) {
            const genders = gender.split(',').map((g) => g.trim()).filter(Boolean);
            if (genders.length > 0) {
                filter.gender = { $in: genders };
            }
        }
        if (movement && movement.trim()) {
            const movements = movement.split(',').map((m) => m.trim()).filter(Boolean);
            if (movements.length > 0) {
                filter['specifications.movement'] = { $in: movements };
            }
        }
        if (strapMaterial && strapMaterial.trim()) {
            const straps = strapMaterial.split(',').map((s) => s.trim()).filter(Boolean);
            if (straps.length > 0) {
                filter['specifications.strapMaterial'] = { $in: straps };
            }
        }
        if (dialColor && dialColor.trim()) {
            const dials = dialColor.split(',').map((d) => d.trim()).filter(Boolean);
            if (dials.length > 0) {
                filter['specifications.dialColor'] = { $in: dials };
            }
        }
        if (minPrice || maxPrice) {
            const min = minPrice ? Number(minPrice) : 0;
            const max = maxPrice ? Number(maxPrice) : Number.MAX_SAFE_INTEGER;
            // Match effective price (salePrice if present, else price)
            filter.$expr = {
                $and: [
                    { $gte: [{ $ifNull: ['$salePrice', '$price'] }, min] },
                    { $lte: [{ $ifNull: ['$salePrice', '$price'] }, max] },
                ],
            };
        }
        if (inStock === 'true') {
            filter.stock = { $gt: 0 };
        }
        if (onSale === 'true') {
            filter.salePrice = { $ne: null, $gt: 0 };
        }
        if (featured === 'true') {
            filter.featured = true;
        }
        if (bestSeller === 'true') {
            filter.bestSeller = true;
        }
        if (newArrival === 'true') {
            filter.newArrival = true;
        }
        let sortOption = { featured: -1, createdAt: -1 };
        switch (sort) {
            case 'price_asc':
                sortOption = { price: 1 };
                break;
            case 'price_desc':
                sortOption = { price: -1 };
                break;
            case 'newest':
                sortOption = { createdAt: -1 };
                break;
            case 'popularity':
                sortOption = { soldCount: -1, bestSeller: -1 };
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
        const [products, totalCount, allPublished] = await Promise.all([
            Product_1.Product.find(filter)
                .populate('category', 'name slug')
                .populate('collections', 'name slug')
                .sort(sortOption)
                .skip(skip)
                .limit(limitNum),
            Product_1.Product.countDocuments(filter),
            Product_1.Product.find({ status: 'published' }).select('brand gender price salePrice specifications.movement specifications.strapMaterial specifications.dialColor'),
        ]);
        const brandsSet = new Set();
        const movementsSet = new Set();
        const strapsSet = new Set();
        const dialsSet = new Set();
        let minCatalogPrice = Infinity;
        let maxCatalogPrice = 0;
        for (const p of allPublished) {
            if (p.brand)
                brandsSet.add(p.brand);
            if (p.specifications?.movement)
                movementsSet.add(p.specifications.movement);
            if (p.specifications?.strapMaterial)
                strapsSet.add(p.specifications.strapMaterial);
            if (p.specifications?.dialColor)
                dialsSet.add(p.specifications.dialColor);
            const effective = p.salePrice && p.salePrice > 0 ? p.salePrice : p.price;
            if (effective < minCatalogPrice)
                minCatalogPrice = effective;
            if (effective > maxCatalogPrice)
                maxCatalogPrice = effective;
        }
        res.json({
            success: true,
            products,
            pagination: {
                total: totalCount,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(totalCount / limitNum) || 1,
            },
            facets: {
                brands: Array.from(brandsSet).sort(),
                movements: Array.from(movementsSet).sort(),
                strapMaterials: Array.from(strapsSet).sort(),
                dialColors: Array.from(dialsSet).sort(),
                genders: ['Men', 'Women', 'Unisex'],
                priceRange: {
                    min: minCatalogPrice === Infinity ? 0 : minCatalogPrice,
                    max: maxCatalogPrice,
                },
            },
        });
    }
    catch (err) {
        next(err);
    }
});
// GET /api/products/:slug — Product details + verified reviews + related products
router.get('/:slug', async (req, res, next) => {
    try {
        const slug = String(req.params.slug);
        let product = await Product_1.Product.findOne({ slug: slug.toLowerCase(), status: 'published' })
            .populate('category', 'name slug description')
            .populate('collections', 'name slug subtitle');
        if (!product && mongoose_1.default.isValidObjectId(slug)) {
            product = await Product_1.Product.findOne({ _id: slug, status: 'published' })
                .populate('category', 'name slug description')
                .populate('collections', 'name slug subtitle');
        }
        if (!product) {
            throw new errorHandler_1.AppError('Product not found.', 404);
        }
        const [reviews, relatedProducts] = await Promise.all([
            Review_1.Review.find({ product: product._id, status: 'approved' }).sort({ createdAt: -1 }).limit(30),
            Product_1.Product.find({
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
    }
    catch (err) {
        next(err);
    }
});
// POST /api/products/:productId/reviews — Submit a customer review
router.post('/:productId/reviews', auth_1.requireAuth, async (req, res, next) => {
    try {
        const reviewSchema = zod_1.z.object({
            rating: zod_1.z.number().int().min(1, 'Rating must be between 1 and 5').max(5),
            title: zod_1.z.string().min(3, 'Review headline is required').max(120),
            comment: zod_1.z.string().min(10, 'Please write at least 10 characters in your review').max(2000),
        });
        const data = reviewSchema.parse(req.body);
        const product = await Product_1.Product.findById(req.params.productId);
        if (!product) {
            throw new errorHandler_1.AppError('Product not found.', 404);
        }
        // Check if customer has purchased this product
        const matchingOrder = await Order_1.Order.findOne({
            user: req.user._id,
            'items.product': product._id,
            fulfillmentStatus: { $nin: ['cancelled', 'refunded'] },
        });
        const existingReview = await Review_1.Review.findOne({
            product: product._id,
            user: req.user._id,
        });
        let review;
        if (existingReview) {
            existingReview.rating = data.rating;
            existingReview.title = data.title;
            existingReview.comment = data.comment;
            existingReview.verifiedPurchase = Boolean(matchingOrder);
            review = await existingReview.save();
        }
        else {
            review = await Review_1.Review.create({
                product: product._id,
                user: req.user._id,
                userName: req.user.name,
                order: matchingOrder?._id,
                rating: data.rating,
                title: data.title,
                comment: data.comment,
                verifiedPurchase: Boolean(matchingOrder),
                status: 'approved',
            });
        }
        // Recalculate product rating stats from approved reviews
        const allReviews = await Review_1.Review.find({ product: product._id, status: 'approved' });
        const reviewCount = allReviews.length;
        const averageRating = reviewCount > 0
            ? Number((allReviews.reduce((acc, r) => acc + r.rating, 0) / reviewCount).toFixed(1))
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
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;

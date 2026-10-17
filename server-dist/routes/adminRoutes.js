"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const multer_1 = __importDefault(require("multer"));
const cloudinary_1 = require("cloudinary");
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const Product_1 = require("../models/Product");
const Category_1 = require("../models/Category");
const Collection_1 = require("../models/Collection");
const Order_1 = require("../models/Order");
const User_1 = require("../models/User");
const StockMovement_1 = require("../models/StockMovement");
const Coupon_1 = require("../models/Coupon");
const HomepageContent_1 = require("../models/HomepageContent");
const StoreSettings_1 = require("../models/StoreSettings");
const AuditLog_1 = require("../models/AuditLog");
const Review_1 = require("../models/Review");
const helpers_1 = require("../utils/helpers");
const Counter_1 = require("../models/Counter");
const PushSubscription_1 = require("../models/PushSubscription");
const push_1 = require("../utils/push");
const env_1 = require("../config/env");
const router = (0, express_1.Router)();
// Protect all routes in adminRoutes with server-enforced authentication + admin role verification
router.use(auth_1.requireAuth, auth_1.requireAdmin);
// Configure safe image upload storage (handles Vercel /tmp vs local disk)
const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const uploadsDir = isServerless
    ? path_1.default.join(os_1.default.tmpdir(), 'msvelora-uploads')
    : path_1.default.resolve(__dirname, '../../uploads');
try {
    if (!fs_1.default.existsSync(uploadsDir)) {
        fs_1.default.mkdirSync(uploadsDir, { recursive: true });
    }
}
catch (err) {
    console.warn('[Storage] Notice: Could not create local uploadsDir:', err);
}
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => {
        try {
            if (!fs_1.default.existsSync(uploadsDir)) {
                fs_1.default.mkdirSync(uploadsDir, { recursive: true });
            }
        }
        catch {
            // ignore
        }
        cb(null, uploadsDir);
    },
    filename: (_req, file, cb) => {
        const ext = path_1.default.extname(file.originalname).toLowerCase();
        const safeName = `bfs-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
        cb(null, safeName);
    },
});
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
    fileFilter: (_req, file, cb) => {
        const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new errorHandler_1.AppError('Only JPG, PNG, WebP, and AVIF images under 5MB are allowed.', 400));
        }
    },
});
// ==========================================
// A. DASHBOARD OVERVIEW
// ==========================================
router.get('/overview', async (_req, res, next) => {
    try {
        const [allOrders, totalProducts, lowStockProducts, outOfStockProducts, recentOrders, bestSellingProducts, totalCustomers,] = await Promise.all([
            Order_1.Order.find().select('orderNumber totalAmount paymentStatus fulfillmentStatus createdAt items shippingAddress orderSource'),
            Product_1.Product.countDocuments({ status: { $ne: 'archived' } }),
            Product_1.Product.find({
                status: 'published',
                $expr: {
                    $and: [{ $gt: ['$stock', 0] }, { $lte: ['$stock', '$lowStockThreshold'] }],
                },
            })
                .select('name slug sku brand mainImage stock lowStockThreshold price')
                .sort({ stock: 1 })
                .limit(12),
            Product_1.Product.find({ status: 'published', stock: 0 })
                .select('name slug sku brand mainImage stock lowStockThreshold price')
                .limit(12),
            Order_1.Order.find().sort({ createdAt: -1 }).limit(8),
            Product_1.Product.find({ status: 'published' })
                .sort({ soldCount: -1, bestSeller: -1 })
                .select('name slug sku brand mainImage price salePrice stock soldCount')
                .limit(6),
            User_1.User.countDocuments({ role: 'customer' }),
        ]);
        const pushSubscribers = await PushSubscription_1.PushSubscription.countDocuments({ topics: 'new-arrivals' });
        // Today / this month (server local time)
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const startOfMonth = new Date(startOfToday.getFullYear(), startOfToday.getMonth(), 1);
        let todayOrders = 0;
        let todaySales = 0;
        let monthSales = 0;
        let monthOrders = 0;
        let unitsSold = 0;
        let whatsappOrders = 0;
        const statusCounts = {
            pending: 0, confirmed: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0, refunded: 0,
        };
        let paidRevenue = 0;
        let pendingRevenue = 0;
        let cancelledValue = 0;
        let pendingOrdersCount = 0;
        let completedOrdersCount = 0;
        let cancelledOrdersCount = 0;
        // Last 14 days sales trend
        const dailyMap = new Map();
        for (let i = 13; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const key = d.toISOString().slice(0, 10);
            dailyMap.set(key, { date: key, paidRevenue: 0, pendingRevenue: 0, orders: 0 });
        }
        for (const o of allOrders) {
            const isCancelledOrRefunded = o.fulfillmentStatus === 'cancelled' ||
                o.fulfillmentStatus === 'refunded' ||
                o.paymentStatus === 'refunded';
            if (isCancelledOrRefunded) {
                cancelledValue += o.totalAmount;
                cancelledOrdersCount += 1;
            }
            else if (o.paymentStatus === 'paid' || o.fulfillmentStatus === 'delivered') {
                paidRevenue += o.totalAmount;
            }
            else {
                pendingRevenue += o.totalAmount;
            }
            if (['pending', 'confirmed', 'processing', 'shipped'].includes(o.fulfillmentStatus)) {
                pendingOrdersCount += 1;
            }
            if (o.fulfillmentStatus === 'delivered') {
                completedOrdersCount += 1;
            }
            statusCounts[o.fulfillmentStatus] = (statusCounts[o.fulfillmentStatus] || 0) + 1;
            if (o.orderSource === 'whatsapp')
                whatsappOrders += 1;
            if (!isCancelledOrRefunded) {
                unitsSold += o.items.reduce((n, i) => n + i.quantity, 0);
                if (o.createdAt >= startOfToday) {
                    todayOrders += 1;
                    todaySales += o.totalAmount;
                }
                if (o.createdAt >= startOfMonth) {
                    monthOrders += 1;
                    monthSales += o.totalAmount;
                }
            }
            const dayKey = o.createdAt.toISOString().slice(0, 10);
            const dayEntry = dailyMap.get(dayKey);
            if (dayEntry && !isCancelledOrRefunded) {
                dayEntry.orders += 1;
                if (o.paymentStatus === 'paid' || o.fulfillmentStatus === 'delivered') {
                    dayEntry.paidRevenue += o.totalAmount;
                }
                else {
                    dayEntry.pendingRevenue += o.totalAmount;
                }
            }
        }
        res.json({
            success: true,
            metrics: {
                paidRevenue,
                pendingRevenue,
                cancelledValue,
                totalOrders: allOrders.length,
                pendingOrders: pendingOrdersCount,
                completedOrders: completedOrdersCount,
                cancelledOrders: cancelledOrdersCount,
                totalProducts,
                lowStockCount: lowStockProducts.length,
                outOfStockCount: outOfStockProducts.length,
                totalCustomers,
                todayOrders,
                todaySales,
                monthOrders,
                monthSales,
                unitsSold,
                whatsappOrders,
                pushSubscribers,
                averageOrderValue: allOrders.length - cancelledOrdersCount > 0
                    ? Math.round((paidRevenue + pendingRevenue) / (allOrders.length - cancelledOrdersCount))
                    : 0,
            },
            statusCounts,
            salesTrend: Array.from(dailyMap.values()),
            recentOrders,
            bestSellingProducts,
            inventoryAlerts: {
                lowStock: lowStockProducts,
                outOfStock: outOfStockProducts,
            },
        });
    }
    catch (err) {
        next(err);
    }
});
// ==========================================
// B. PRODUCT MANAGEMENT
// ==========================================
const productPayloadSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Product name is required').max(180),
    slug: zod_1.z.string().optional(),
    brand: zod_1.z.string().min(1, 'Brand is required'),
    model: zod_1.z.string().optional().default(''),
    sku: zod_1.z.string().optional(),
    category: zod_1.z.string().optional().nullable(),
    collections: zod_1.z.array(zod_1.z.string()).optional().default([]),
    gender: zod_1.z.enum(['Men', 'Women', 'Unisex']).default('Women'),
    // 0 means "price on request"
    price: zod_1.z.number().min(0, 'Price cannot be negative'),
    salePrice: zod_1.z.number().nullable().optional().default(null),
    costPrice: zod_1.z.number().min(0).optional().default(0),
    shortDescription: zod_1.z.string().optional().default(''),
    description: zod_1.z.string().min(10, 'Detailed product description is required'),
    mainImage: zod_1.z.string().min(1, 'Main product image is required'),
    images: zod_1.z
        .array(zod_1.z.object({
        url: zod_1.z.string().min(1),
        alt: zod_1.z.string().optional().default(''),
        isMain: zod_1.z.boolean().optional().default(false),
    }))
        .optional()
        .default([]),
    specifications: zod_1.z
        .object({
        // Field names are legacy; labels in the UI are jewellery-specific
        movement: zod_1.z.string().default('Necklace'), // Type
        caseMaterial: zod_1.z.string().default('Gold Plated Brass'), // Metal
        caseDiameter: zod_1.z.string().default('Adjustable'), // Size / length
        caseThickness: zod_1.z.string().default('Lightweight'), // Weight
        strapMaterial: zod_1.z.string().default('High Polish'), // Finish
        strapWidth: zod_1.z.string().default('Lobster Clasp'), // Closure
        dialColor: zod_1.z.string().default('Gold'), // Colour
        crystal: zod_1.z.string().default('Cubic Zirconia'), // Stones
        waterResistance: zod_1.z.string().default('Keep away from water & perfume'), // Care
        warranty: zod_1.z.string().default('Plating Warranty'),
        origin: zod_1.z.string().default('Pakistan'),
    })
        .optional(),
    variants: zod_1.z
        .array(zod_1.z.object({
        sku: zod_1.z.string().min(1),
        name: zod_1.z.string().min(1),
        dialColor: zod_1.z.string().optional().default(''),
        strapMaterial: zod_1.z.string().optional().default(''),
        price: zod_1.z.number().optional(),
        salePrice: zod_1.z.number().nullable().optional().default(null),
        stock: zod_1.z.number().int().min(0).default(0),
        image: zod_1.z.string().optional().default(''),
    }))
        .optional()
        .default([]),
    stock: zod_1.z.number().int().min(0, 'Stock cannot be negative').default(0),
    lowStockThreshold: zod_1.z.number().int().min(0).default(5),
    status: zod_1.z.enum(['published', 'draft', 'archived']).default('published'),
    featured: zod_1.z.boolean().default(false),
    bestSeller: zod_1.z.boolean().default(false),
    newArrival: zod_1.z.boolean().default(false),
    tags: zod_1.z.array(zod_1.z.string()).optional().default([]),
    metaTitle: zod_1.z.string().optional().default(''),
    metaDescription: zod_1.z.string().optional().default(''),
});
// GET /api/admin/products
router.get('/products', async (req, res, next) => {
    try {
        const { q, status, category, stockStatus, page = '1', limit = '20' } = req.query;
        const filter = {};
        if (status && status !== 'all') {
            filter.status = status;
        }
        if (category && category !== 'all') {
            filter.category = category;
        }
        if (stockStatus === 'out_of_stock') {
            filter.stock = 0;
        }
        else if (stockStatus === 'low_stock') {
            filter.$expr = {
                $and: [{ $gt: ['$stock', 0] }, { $lte: ['$stock', '$lowStockThreshold'] }],
            };
        }
        if (q && q.trim()) {
            const regex = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            filter.$or = [{ name: regex }, { brand: regex }, { sku: regex }, { model: regex }];
        }
        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
        const [products, total] = await Promise.all([
            Product_1.Product.find(filter)
                .populate('category', 'name slug')
                .populate('collections', 'name slug')
                .sort({ createdAt: -1 })
                .skip((pageNum - 1) * limitNum)
                .limit(limitNum),
            Product_1.Product.countDocuments(filter),
        ]);
        res.json({
            success: true,
            products,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum) || 1,
            },
        });
    }
    catch (err) {
        next(err);
    }
});
// POST /api/admin/products
router.post('/products', async (req, res, next) => {
    try {
        const data = productPayloadSchema.parse(req.body);
        let slug = data.slug && data.slug.trim() ? (0, helpers_1.slugify)(data.slug) : (0, helpers_1.slugify)(`${data.brand}-${data.name}`);
        const existingSlug = await Product_1.Product.findOne({ slug });
        if (existingSlug) {
            slug = `${slug}-${Math.floor(100 + Math.random() * 900)}`;
        }
        const sku = data.sku && data.sku.trim()
            ? data.sku.trim().toUpperCase()
            : (0, helpers_1.generateSku)(data.brand, data.model);
        const images = data.images.length > 0
            ? data.images
            : [{ url: data.mainImage, alt: data.name, isMain: true }];
        const product = await Product_1.Product.create({
            ...data,
            slug,
            sku,
            category: data.category || undefined,
            images,
        });
        await StockMovement_1.StockMovement.create({
            product: product._id,
            sku: product.sku,
            type: 'addition',
            quantityChange: product.stock,
            previousStock: 0,
            newStock: product.stock,
            reason: 'Initial product creation inventory',
            performedBy: req.user._id,
            performedByName: req.user.name,
        });
        await (0, helpers_1.logAudit)({
            user: req.user,
            action: 'CREATE_PRODUCT',
            entityType: 'product',
            entityId: String(product._id),
            details: `Created product "${product.name}" (SKU: ${product.sku}, Stock: ${product.stock})`,
            ipAddress: req.ip,
        });
        res.status(201).json({
            success: true,
            message: 'Product created successfully.',
            product,
        });
    }
    catch (err) {
        next(err);
    }
});
// PUT /api/admin/products/:id
router.put('/products/:id', async (req, res, next) => {
    try {
        const product = await Product_1.Product.findById(req.params.id);
        if (!product) {
            throw new errorHandler_1.AppError('Product not found.', 404);
        }
        const data = productPayloadSchema.partial().parse(req.body);
        const previousStock = product.stock;
        if (data.slug && data.slug.trim()) {
            data.slug = (0, helpers_1.slugify)(data.slug);
        }
        if (data.sku && data.sku.trim()) {
            data.sku = data.sku.trim().toUpperCase();
        }
        Object.assign(product, {
            ...data,
            category: data.category === null ? undefined : data.category ?? product.category,
        });
        await product.save();
        if (data.stock !== undefined && data.stock !== previousStock) {
            const diff = data.stock - previousStock;
            await StockMovement_1.StockMovement.create({
                product: product._id,
                sku: product.sku,
                type: 'manual_adjustment',
                quantityChange: diff,
                previousStock,
                newStock: data.stock,
                reason: 'Updated via Product Editor',
                performedBy: req.user._id,
                performedByName: req.user.name,
            });
        }
        await (0, helpers_1.logAudit)({
            user: req.user,
            action: 'UPDATE_PRODUCT',
            entityType: 'product',
            entityId: String(product._id),
            details: `Updated product "${product.name}" (SKU: ${product.sku})`,
            ipAddress: req.ip,
        });
        res.json({
            success: true,
            message: 'Product updated successfully.',
            product,
        });
    }
    catch (err) {
        next(err);
    }
});
// DELETE /api/admin/products/:id
router.delete('/products/:id', async (req, res, next) => {
    try {
        const product = await Product_1.Product.findById(req.params.id);
        if (!product) {
            throw new errorHandler_1.AppError('Product not found.', 404);
        }
        const permanent = req.query.permanent === 'true';
        if (permanent) {
            await Product_1.Product.findByIdAndDelete(product._id);
        }
        else {
            product.status = 'archived';
            await product.save();
        }
        await (0, helpers_1.logAudit)({
            user: req.user,
            action: permanent ? 'DELETE_PRODUCT' : 'ARCHIVE_PRODUCT',
            entityType: 'product',
            entityId: String(product._id),
            details: `${permanent ? 'Deleted' : 'Archived'} product "${product.name}" (SKU: ${product.sku})`,
            ipAddress: req.ip,
        });
        res.json({
            success: true,
            message: permanent ? 'Product permanently deleted.' : 'Product archived.',
        });
    }
    catch (err) {
        next(err);
    }
});
// POST /api/admin/products/bulk
router.post('/products/bulk', async (req, res, next) => {
    try {
        const schema = zod_1.z.object({
            productIds: zod_1.z.array(zod_1.z.string()).min(1),
            action: zod_1.z.enum(['publish', 'draft', 'archive', 'delete']),
        });
        const { productIds, action } = schema.parse(req.body);
        if (action === 'delete') {
            await Product_1.Product.deleteMany({ _id: { $in: productIds } });
        }
        else {
            const statusMap = {
                publish: 'published',
                draft: 'draft',
                archive: 'archived',
            };
            await Product_1.Product.updateMany({ _id: { $in: productIds } }, { $set: { status: statusMap[action] } });
        }
        await (0, helpers_1.logAudit)({
            user: req.user,
            action: `BULK_${action.toUpperCase()}_PRODUCTS`,
            entityType: 'product',
            details: `Bulk action "${action}" applied to ${productIds.length} products`,
            ipAddress: req.ip,
        });
        res.json({
            success: true,
            message: `Bulk action (${action}) completed for ${productIds.length} products.`,
        });
    }
    catch (err) {
        next(err);
    }
});
// ==========================================
// C. INVENTORY MANAGEMENT
// ==========================================
router.get('/inventory', async (req, res, next) => {
    try {
        const { q, status } = req.query;
        const filter = { status: { $ne: 'archived' } };
        if (q && q.trim()) {
            const regex = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            filter.$or = [{ name: regex }, { sku: regex }, { brand: regex }, { model: regex }];
        }
        if (status === 'out_of_stock') {
            filter.stock = 0;
        }
        else if (status === 'low_stock') {
            filter.$expr = {
                $and: [{ $gt: ['$stock', 0] }, { $lte: ['$stock', '$lowStockThreshold'] }],
            };
        }
        else if (status === 'in_stock') {
            filter.$expr = { $gt: ['$stock', '$lowStockThreshold'] };
        }
        const [products, recentMovements] = await Promise.all([
            Product_1.Product.find(filter)
                .select('name slug brand model sku mainImage price salePrice costPrice stock reservedStock lowStockThreshold soldCount variants status')
                .sort({ stock: 1, name: 1 }),
            StockMovement_1.StockMovement.find()
                .populate('product', 'name sku mainImage')
                .sort({ createdAt: -1 })
                .limit(60),
        ]);
        res.json({
            success: true,
            inventory: products,
            movements: recentMovements,
        });
    }
    catch (err) {
        next(err);
    }
});
// POST /api/admin/inventory/adjust — Auditable stock addition/reduction/adjustment
router.post('/inventory/adjust', async (req, res, next) => {
    try {
        const schema = zod_1.z.object({
            productId: zod_1.z.string().min(1),
            variantSku: zod_1.z.string().optional(),
            adjustmentType: zod_1.z.enum(['addition', 'reduction', 'set_exact']),
            quantity: zod_1.z.number().int().min(0, 'Quantity must be a non-negative integer'),
            lowStockThreshold: zod_1.z.number().int().min(0).optional(),
            reason: zod_1.z.string().min(3, 'Please provide a clear reason for this inventory adjustment'),
        });
        const data = schema.parse(req.body);
        const product = await Product_1.Product.findById(data.productId);
        if (!product) {
            throw new errorHandler_1.AppError('Product not found.', 404);
        }
        const previousStock = product.stock;
        let newStock = previousStock;
        if (data.adjustmentType === 'addition') {
            if (data.quantity <= 0) {
                throw new errorHandler_1.AppError('Addition quantity must be greater than 0.', 400);
            }
            newStock = previousStock + data.quantity;
        }
        else if (data.adjustmentType === 'reduction') {
            if (data.quantity <= 0) {
                throw new errorHandler_1.AppError('Reduction quantity must be greater than 0.', 400);
            }
            if (previousStock - data.quantity < 0) {
                throw new errorHandler_1.AppError(`Cannot reduce stock by ${data.quantity}. Current stock is ${previousStock} (negative stock is prohibited).`, 400);
            }
            newStock = previousStock - data.quantity;
        }
        else {
            newStock = data.quantity;
        }
        const quantityChange = newStock - previousStock;
        product.stock = newStock;
        if (data.lowStockThreshold !== undefined) {
            product.lowStockThreshold = data.lowStockThreshold;
        }
        await product.save();
        const movement = await StockMovement_1.StockMovement.create({
            product: product._id,
            sku: product.sku,
            variantSku: data.variantSku,
            type: data.adjustmentType === 'addition'
                ? 'addition'
                : data.adjustmentType === 'reduction'
                    ? 'reduction'
                    : 'manual_adjustment',
            quantityChange,
            previousStock,
            newStock,
            reason: data.reason,
            performedBy: req.user._id,
            performedByName: req.user.name,
        });
        await (0, helpers_1.logAudit)({
            user: req.user,
            action: 'INVENTORY_ADJUSTMENT',
            entityType: 'inventory',
            entityId: String(product._id),
            details: `Adjusted stock for ${product.name} (${product.sku}): ${previousStock} -> ${newStock} (${quantityChange >= 0 ? `+${quantityChange}` : quantityChange}). Reason: ${data.reason}`,
            ipAddress: req.ip,
        });
        res.json({
            success: true,
            message: `Stock updated from ${previousStock} to ${newStock}.`,
            product,
            movement,
        });
    }
    catch (err) {
        next(err);
    }
});
// ==========================================
// D. ORDER MANAGEMENT
// ==========================================
router.get('/orders', async (req, res, next) => {
    try {
        const { q, fulfillmentStatus, paymentStatus, orderSource, page = '1', limit = '20', } = req.query;
        const filter = {};
        if (fulfillmentStatus && fulfillmentStatus !== 'all') {
            filter.fulfillmentStatus = fulfillmentStatus;
        }
        if (paymentStatus && paymentStatus !== 'all') {
            filter.paymentStatus = paymentStatus;
        }
        if (orderSource === 'website' || orderSource === 'whatsapp') {
            filter.orderSource = orderSource;
        }
        if (q && q.trim()) {
            const regex = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            filter.$or = [
                { orderNumber: regex },
                { requestNumber: regex },
                { 'shippingAddress.fullName': regex },
                { 'shippingAddress.email': regex },
                { 'shippingAddress.phone': regex },
                { trackingNumber: regex },
            ];
        }
        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
        const [orders, total] = await Promise.all([
            Order_1.Order.find(filter)
                .sort({ createdAt: -1 })
                .skip((pageNum - 1) * limitNum)
                .limit(limitNum),
            Order_1.Order.countDocuments(filter),
        ]);
        res.json({
            success: true,
            orders,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum) || 1,
            },
        });
    }
    catch (err) {
        next(err);
    }
});
router.get('/orders/:id', async (req, res, next) => {
    try {
        const order = await Order_1.Order.findById(req.params.id).populate('user', 'name email phone');
        if (!order) {
            throw new errorHandler_1.AppError('Order not found.', 404);
        }
        res.json({ success: true, order });
    }
    catch (err) {
        next(err);
    }
});
// PUT /api/admin/orders/:id/status — Defined state transitions & idempotent inventory restoration
router.put('/orders/:id/status', async (req, res, next) => {
    try {
        const schema = zod_1.z.object({
            fulfillmentStatus: zod_1.z
                .enum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'])
                .optional(),
            paymentStatus: zod_1.z.enum(['pending', 'paid', 'failed', 'refunded']).optional(),
            courierName: zod_1.z.string().optional(),
            trackingNumber: zod_1.z.string().optional(),
            note: zod_1.z.string().optional(),
        });
        const data = schema.parse(req.body);
        const order = await Order_1.Order.findById(req.params.id);
        if (!order) {
            throw new errorHandler_1.AppError('Order not found.', 404);
        }
        const prevFulfillment = order.fulfillmentStatus;
        const prevPayment = order.paymentStatus;
        // Prevent invalid state transitions from terminal states
        if ((prevFulfillment === 'cancelled' || prevFulfillment === 'refunded') &&
            data.fulfillmentStatus &&
            data.fulfillmentStatus !== prevFulfillment &&
            data.fulfillmentStatus !== 'refunded') {
            throw new errorHandler_1.AppError(`Order ${order.orderNumber} is already ${prevFulfillment} and cannot be reopened.`, 400);
        }
        if (data.courierName !== undefined)
            order.courierName = data.courierName;
        if (data.trackingNumber !== undefined)
            order.trackingNumber = data.trackingNumber;
        const targetFulfillment = data.fulfillmentStatus || order.fulfillmentStatus;
        let targetPayment = data.paymentStatus || order.paymentStatus;
        // If order is delivered via COD, mark as paid automatically if still pending
        if (targetFulfillment === 'delivered' && targetPayment === 'pending') {
            targetPayment = 'paid';
            order.paidAt = new Date();
        }
        if (targetFulfillment === 'shipped' && !order.shippedAt) {
            order.shippedAt = new Date();
        }
        if (targetFulfillment === 'delivered' && !order.deliveredAt) {
            order.deliveredAt = new Date();
        }
        if (targetFulfillment === 'cancelled' && !order.cancelledAt) {
            order.cancelledAt = new Date();
        }
        if (targetFulfillment === 'refunded' || targetPayment === 'refunded') {
            targetPayment = 'refunded';
            order.refundedAt = new Date();
        }
        if (targetPayment === 'paid' && !order.paidAt) {
            order.paidAt = new Date();
        }
        // Restore inventory ONCE AND ONLY ONCE if order is cancelled or refunded
        if ((targetFulfillment === 'cancelled' || targetFulfillment === 'refunded') &&
            !order.inventoryRestored) {
            for (const item of order.items) {
                const prod = await Product_1.Product.findById(item.product);
                if (prod) {
                    const prevStock = prod.stock;
                    prod.stock += item.quantity;
                    prod.soldCount = Math.max(0, (prod.soldCount || 0) - item.quantity);
                    if (item.variantSku && prod.variants && prod.variants.length > 0) {
                        const v = prod.variants.find((vr) => vr.sku === item.variantSku);
                        if (v) {
                            v.stock += item.quantity;
                        }
                    }
                    await prod.save();
                    await StockMovement_1.StockMovement.create({
                        product: prod._id,
                        sku: item.sku,
                        variantSku: item.variantSku,
                        type: 'order_cancelled',
                        quantityChange: item.quantity,
                        previousStock: prevStock,
                        newStock: prod.stock,
                        reason: `Stock restored from ${targetFulfillment} order ${order.orderNumber}`,
                        orderId: order._id,
                        orderNumber: order.orderNumber,
                        performedBy: req.user._id,
                        performedByName: req.user.name,
                    });
                }
            }
            order.inventoryRestored = true;
        }
        // Approval assigns the permanent sequential number (MS-001, MS-002, …).
        // Orders cancelled before approval never consume a number, so there are no gaps.
        let approvedNumberNote = '';
        const approving = ['confirmed', 'processing', 'shipped', 'delivered'].includes(targetFulfillment);
        if (approving && !(0, helpers_1.isApprovedOrderNumber)(order.orderNumber)) {
            if (!order.requestNumber)
                order.requestNumber = order.orderNumber;
            order.orderNumber = (0, helpers_1.formatApprovedOrderNumber)(await (0, Counter_1.nextSequence)('approvedOrder'));
            order.approvedAt = new Date();
            approvedNumberNote = ` Approved as ${order.orderNumber} (ref ${order.requestNumber}).`;
        }
        order.fulfillmentStatus = targetFulfillment;
        order.paymentStatus = targetPayment;
        const statusNote = (data.note ||
            `Status updated: Fulfillment [${prevFulfillment} -> ${targetFulfillment}], Payment [${prevPayment} -> ${targetPayment}]${order.trackingNumber ? ` (Tracking: ${order.courierName || 'Courier'} #${order.trackingNumber})` : ''}`) + approvedNumberNote;
        order.statusHistory.push({
            status: targetFulfillment,
            paymentStatus: targetPayment,
            note: statusNote,
            updatedBy: req.user.name,
            timestamp: new Date(),
        });
        await order.save();
        await (0, helpers_1.logAudit)({
            user: req.user,
            action: 'UPDATE_ORDER_STATUS',
            entityType: 'order',
            entityId: String(order._id),
            details: `Order ${order.orderNumber}: ${statusNote}`,
            ipAddress: req.ip,
        });
        res.json({
            success: true,
            message: `Order ${order.orderNumber} updated.`,
            order,
        });
    }
    catch (err) {
        next(err);
    }
});
// ==========================================
// D2. WHATSAPP CENTER
// ==========================================
const WHATSAPP_TEMPLATES = [
    'orderPlaced',
    'confirmed',
    'shipped',
    'delivered',
    'cancelled',
    'paymentReminder',
    'processing',
    'paymentReceived',
    'refunded',
    'custom',
];
// POST /api/admin/orders/:id/whatsapp-log — record a message the admin sent via click-to-chat
router.post('/orders/:id/whatsapp-log', async (req, res, next) => {
    try {
        const data = zod_1.z
            .object({
            template: zod_1.z.enum(WHATSAPP_TEMPLATES),
            message: zod_1.z.string().min(1).max(4000),
            phone: zod_1.z.string().min(6).max(30),
        })
            .parse(req.body);
        const entry = {
            ...data,
            sentBy: req.user.name,
            sentAt: new Date(),
        };
        // $push keeps concurrent sends from overwriting each other
        const order = await Order_1.Order.findByIdAndUpdate(req.params.id, { $push: { whatsappLog: entry } }, { new: true });
        if (!order) {
            throw new errorHandler_1.AppError('Order not found.', 404);
        }
        await (0, helpers_1.logAudit)({
            user: req.user,
            action: 'WHATSAPP_MESSAGE_SENT',
            entityType: 'order',
            entityId: String(order._id),
            details: `WhatsApp "${data.template}" message opened for order ${order.orderNumber} (${data.phone})`,
            ipAddress: req.ip,
        });
        res.json({ success: true, order });
    }
    catch (err) {
        next(err);
    }
});
// GET /api/admin/whatsapp/overview — action queue, stats and recent message log
router.get('/whatsapp/overview', async (_req, res, next) => {
    try {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const notSent = (template) => ({ 'whatsappLog.template': { $ne: template } });
        const [needsConfirmation, needsShippingUpdate, needsDeliveryNote, paymentPending, whatsappOrders, totalOrders, sentTodayAgg, recentAgg,] = await Promise.all([
            Order_1.Order.find({ fulfillmentStatus: 'pending', ...notSent('orderPlaced') })
                .sort({ createdAt: -1 })
                .limit(50),
            Order_1.Order.find({ fulfillmentStatus: 'shipped', ...notSent('shipped') })
                .sort({ shippedAt: -1 })
                .limit(50),
            Order_1.Order.find({ fulfillmentStatus: 'delivered', ...notSent('delivered') })
                .sort({ deliveredAt: -1 })
                .limit(50),
            Order_1.Order.find({
                paymentStatus: 'pending',
                paymentMethod: 'bank_transfer',
                fulfillmentStatus: { $nin: ['cancelled', 'refunded'] },
                ...notSent('paymentReminder'),
            })
                .sort({ createdAt: -1 })
                .limit(50),
            Order_1.Order.countDocuments({ orderSource: 'whatsapp' }),
            Order_1.Order.countDocuments({}),
            Order_1.Order.aggregate([
                { $unwind: '$whatsappLog' },
                { $match: { 'whatsappLog.sentAt': { $gte: startOfToday } } },
                { $count: 'count' },
            ]),
            Order_1.Order.aggregate([
                { $unwind: '$whatsappLog' },
                { $sort: { 'whatsappLog.sentAt': -1 } },
                { $limit: 30 },
                {
                    $project: {
                        _id: 0,
                        orderId: '$_id',
                        orderNumber: 1,
                        customerName: '$shippingAddress.fullName',
                        template: '$whatsappLog.template',
                        message: '$whatsappLog.message',
                        phone: '$whatsappLog.phone',
                        sentBy: '$whatsappLog.sentBy',
                        sentAt: '$whatsappLog.sentAt',
                    },
                },
            ]),
        ]);
        res.json({
            success: true,
            stats: {
                sentToday: sentTodayAgg[0]?.count || 0,
                whatsappOrders,
                totalOrders,
                pendingActions: needsConfirmation.length +
                    needsShippingUpdate.length +
                    needsDeliveryNote.length +
                    paymentPending.length,
            },
            queues: {
                orderPlaced: needsConfirmation,
                shipped: needsShippingUpdate,
                delivered: needsDeliveryNote,
                paymentReminder: paymentPending,
            },
            recentMessages: recentAgg,
        });
    }
    catch (err) {
        next(err);
    }
});
// ==========================================
// D3. PUSH NOTIFICATIONS
// ==========================================
// GET /api/admin/push/stats — how many devices will receive announcements
router.get('/push/stats', async (_req, res, next) => {
    try {
        const [newArrivalSubscribers, adminDevices] = await Promise.all([
            PushSubscription_1.PushSubscription.countDocuments({ topics: 'new-arrivals' }),
            PushSubscription_1.PushSubscription.countDocuments({ topics: 'admin-orders' }),
        ]);
        res.json({ success: true, enabled: push_1.pushEnabled, newArrivalSubscribers, adminDevices });
    }
    catch (err) {
        next(err);
    }
});
// POST /api/admin/push/new-arrival/:productId — announce a published product to subscribers
router.post('/push/new-arrival/:productId', async (req, res, next) => {
    try {
        if (!push_1.pushEnabled)
            throw new errorHandler_1.AppError('Notifications are not configured on this server.', 503);
        const product = await Product_1.Product.findById(req.params.productId);
        if (!product)
            throw new errorHandler_1.AppError('Product not found.', 404);
        if (product.status !== 'published')
            throw new errorHandler_1.AppError('Publish the product before announcing it.', 400);
        const price = product.salePrice && product.salePrice < product.price ? product.salePrice : product.price;
        const result = await (0, push_1.sendToTopic)('new-arrivals', {
            title: `New arrival: ${product.name}`,
            body: `${product.brand} • Rs. ${Math.round(price).toLocaleString('en-PK')} — tap to view`,
            url: `/product/${product.slug}`,
            image: product.mainImage,
            tag: `bfs-new-arrival-${product._id}`,
        });
        await (0, helpers_1.logAudit)({
            user: req.user,
            action: 'PUSH_NEW_ARRIVAL',
            entityType: 'product',
            entityId: String(product._id),
            details: `Announced "${product.name}" to ${result.sent} subscriber device(s)`,
            ipAddress: req.ip,
        });
        res.json({ success: true, message: `Sent to ${result.sent} device(s).`, ...result });
    }
    catch (err) {
        next(err);
    }
});
// ==========================================
// E. CUSTOMER MANAGEMENT
// ==========================================
router.get('/customers', async (req, res, next) => {
    try {
        const { q, status } = req.query;
        const filter = {};
        if (status && status !== 'all') {
            filter.status = status;
        }
        if (q && q.trim()) {
            const regex = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            filter.$or = [{ name: regex }, { email: regex }, { phone: regex }];
        }
        const users = await User_1.User.find(filter).sort({ createdAt: -1 });
        const orders = await Order_1.Order.find({
            fulfillmentStatus: { $nin: ['cancelled', 'refunded'] },
        }).select('user shippingAddress.email totalAmount createdAt');
        const spendByUser = new Map();
        for (const o of orders) {
            const key = o.user ? String(o.user) : o.shippingAddress.email.toLowerCase();
            const entry = spendByUser.get(key) || { count: 0, totalSpend: 0 };
            entry.count += 1;
            entry.totalSpend += o.totalAmount;
            spendByUser.set(key, entry);
        }
        const customers = users.map((u) => {
            const byId = spendByUser.get(String(u._id));
            const byEmail = spendByUser.get(u.email.toLowerCase());
            return {
                _id: u._id,
                name: u.name,
                email: u.email,
                phone: u.phone,
                role: u.role,
                status: u.status,
                addresses: u.addresses,
                lastLoginAt: u.lastLoginAt,
                createdAt: u.createdAt,
                orderCount: byId?.count || byEmail?.count || 0,
                totalSpend: byId?.totalSpend || byEmail?.totalSpend || 0,
            };
        });
        res.json({ success: true, customers });
    }
    catch (err) {
        next(err);
    }
});
router.put('/customers/:id/status', async (req, res, next) => {
    try {
        const { status } = zod_1.z
            .object({ status: zod_1.z.enum(['active', 'suspended']) })
            .parse(req.body);
        const customer = await User_1.User.findById(req.params.id);
        if (!customer) {
            throw new errorHandler_1.AppError('Customer not found.', 404);
        }
        if (String(customer._id) === String(req.user._id)) {
            throw new errorHandler_1.AppError('You cannot suspend your own administrator account.', 400);
        }
        customer.status = status;
        if (status === 'suspended') {
            customer.tokenVersion = (customer.tokenVersion || 0) + 1;
        }
        await customer.save();
        await (0, helpers_1.logAudit)({
            user: req.user,
            action: 'UPDATE_CUSTOMER_STATUS',
            entityType: 'customer',
            entityId: String(customer._id),
            details: `Set account status of ${customer.email} to ${status}`,
            ipAddress: req.ip,
        });
        res.json({
            success: true,
            message: `Customer account ${status === 'active' ? 'activated' : 'suspended'}.`,
            customer,
        });
    }
    catch (err) {
        next(err);
    }
});
// ==========================================
// F. CATEGORY & COLLECTION MANAGEMENT
// ==========================================
const categorySchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(100),
    slug: zod_1.z.string().optional(),
    description: zod_1.z.string().optional().default(''),
    image: zod_1.z.string().optional().default(''),
    metaTitle: zod_1.z.string().optional().default(''),
    metaDescription: zod_1.z.string().optional().default(''),
    displayOrder: zod_1.z.number().int().optional().default(0),
    isActive: zod_1.z.boolean().optional().default(true),
});
router.get('/categories', async (_req, res, next) => {
    try {
        const categories = await Category_1.Category.find().sort({ displayOrder: 1, name: 1 });
        res.json({ success: true, categories });
    }
    catch (err) {
        next(err);
    }
});
router.post('/categories', async (req, res, next) => {
    try {
        const data = categorySchema.parse(req.body);
        const slug = data.slug && data.slug.trim() ? (0, helpers_1.slugify)(data.slug) : (0, helpers_1.slugify)(data.name);
        const category = await Category_1.Category.create({ ...data, slug });
        await (0, helpers_1.logAudit)({
            user: req.user,
            action: 'CREATE_CATEGORY',
            entityType: 'category',
            entityId: String(category._id),
            details: `Created category "${category.name}"`,
            ipAddress: req.ip,
        });
        res.status(201).json({ success: true, message: 'Category created.', category });
    }
    catch (err) {
        next(err);
    }
});
router.put('/categories/:id', async (req, res, next) => {
    try {
        const data = categorySchema.partial().parse(req.body);
        if (data.slug)
            data.slug = (0, helpers_1.slugify)(data.slug);
        const category = await Category_1.Category.findByIdAndUpdate(req.params.id, data, { new: true });
        if (!category)
            throw new errorHandler_1.AppError('Category not found.', 404);
        res.json({ success: true, message: 'Category updated.', category });
    }
    catch (err) {
        next(err);
    }
});
router.delete('/categories/:id', async (req, res, next) => {
    try {
        await Category_1.Category.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Category deleted.' });
    }
    catch (err) {
        next(err);
    }
});
const collectionSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(100),
    slug: zod_1.z.string().optional(),
    subtitle: zod_1.z.string().optional().default(''),
    description: zod_1.z.string().optional().default(''),
    image: zod_1.z.string().min(1, 'Collection cover image is required'),
    bannerImage: zod_1.z.string().optional().default(''),
    metaTitle: zod_1.z.string().optional().default(''),
    metaDescription: zod_1.z.string().optional().default(''),
    featured: zod_1.z.boolean().optional().default(true),
    displayOrder: zod_1.z.number().int().optional().default(0),
    isActive: zod_1.z.boolean().optional().default(true),
});
router.get('/collections', async (_req, res, next) => {
    try {
        const collections = await Collection_1.Collection.find().sort({ displayOrder: 1, name: 1 });
        res.json({ success: true, collections });
    }
    catch (err) {
        next(err);
    }
});
router.post('/collections', async (req, res, next) => {
    try {
        const data = collectionSchema.parse(req.body);
        const slug = data.slug && data.slug.trim() ? (0, helpers_1.slugify)(data.slug) : (0, helpers_1.slugify)(data.name);
        const collection = await Collection_1.Collection.create({ ...data, slug });
        await (0, helpers_1.logAudit)({
            user: req.user,
            action: 'CREATE_COLLECTION',
            entityType: 'collection',
            entityId: String(collection._id),
            details: `Created collection "${collection.name}"`,
            ipAddress: req.ip,
        });
        res.status(201).json({ success: true, message: 'Collection created.', collection });
    }
    catch (err) {
        next(err);
    }
});
router.put('/collections/:id', async (req, res, next) => {
    try {
        const data = collectionSchema.partial().parse(req.body);
        if (data.slug)
            data.slug = (0, helpers_1.slugify)(data.slug);
        const collection = await Collection_1.Collection.findByIdAndUpdate(req.params.id, data, { new: true });
        if (!collection)
            throw new errorHandler_1.AppError('Collection not found.', 404);
        res.json({ success: true, message: 'Collection updated.', collection });
    }
    catch (err) {
        next(err);
    }
});
router.delete('/collections/:id', async (req, res, next) => {
    try {
        await Collection_1.Collection.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Collection deleted.' });
    }
    catch (err) {
        next(err);
    }
});
// ==========================================
// G. HOMEPAGE & BANNER MANAGEMENT
// ==========================================
router.get('/homepage', async (_req, res, next) => {
    try {
        let homepage = await HomepageContent_1.HomepageContent.findOne({ key: 'default' });
        if (!homepage) {
            homepage = await HomepageContent_1.HomepageContent.create({ key: 'default' });
        }
        res.json({ success: true, homepage });
    }
    catch (err) {
        next(err);
    }
});
router.put('/homepage', async (req, res, next) => {
    try {
        let homepage = await HomepageContent_1.HomepageContent.findOne({ key: 'default' });
        if (!homepage) {
            homepage = new HomepageContent_1.HomepageContent({ key: 'default' });
        }
        const { announcementBar, carouselSettings, heroSlides, promoBanner, brandStory, sectionVisibility } = req.body;
        if (announcementBar)
            homepage.announcementBar = announcementBar;
        if (carouselSettings)
            homepage.carouselSettings = carouselSettings;
        if (Array.isArray(heroSlides))
            homepage.heroSlides = heroSlides;
        if (promoBanner)
            homepage.promoBanner = promoBanner;
        if (brandStory)
            homepage.brandStory = brandStory;
        if (sectionVisibility)
            homepage.sectionVisibility = sectionVisibility;
        await homepage.save();
        await (0, helpers_1.logAudit)({
            user: req.user,
            action: 'UPDATE_HOMEPAGE_CMS',
            entityType: 'homepage',
            details: 'Updated homepage hero carousel, announcement bar, and promotional sections',
            ipAddress: req.ip,
        });
        res.json({
            success: true,
            message: 'Homepage content published immediately to the storefront.',
            homepage,
        });
    }
    catch (err) {
        next(err);
    }
});
// ==========================================
// H. COUPONS & PROMOTIONS
// ==========================================
const couponSchema = zod_1.z.object({
    code: zod_1.z.string().min(3, 'Coupon code must be at least 3 characters').max(30),
    description: zod_1.z.string().optional().default(''),
    discountType: zod_1.z.enum(['percentage', 'fixed']),
    discountValue: zod_1.z.number().min(1, 'Discount value must be greater than 0'),
    minOrderAmount: zod_1.z.number().min(0).default(0),
    maxDiscountAmount: zod_1.z.number().nullable().optional().default(null),
    startDate: zod_1.z.string().or(zod_1.z.date()).optional(),
    expiryDate: zod_1.z.string().or(zod_1.z.date()),
    usageLimit: zod_1.z.number().int().nullable().optional().default(null),
    perCustomerLimit: zod_1.z.number().int().min(1).default(1),
    isActive: zod_1.z.boolean().default(true),
});
router.get('/coupons', async (_req, res, next) => {
    try {
        const coupons = await Coupon_1.Coupon.find().sort({ createdAt: -1 });
        res.json({ success: true, coupons });
    }
    catch (err) {
        next(err);
    }
});
router.post('/coupons', async (req, res, next) => {
    try {
        const data = couponSchema.parse(req.body);
        const coupon = await Coupon_1.Coupon.create({
            ...data,
            code: data.code.toUpperCase().trim(),
            startDate: data.startDate ? new Date(data.startDate) : new Date(),
            expiryDate: new Date(data.expiryDate),
        });
        await (0, helpers_1.logAudit)({
            user: req.user,
            action: 'CREATE_COUPON',
            entityType: 'coupon',
            entityId: String(coupon._id),
            details: `Created coupon ${coupon.code} (${coupon.discountValue}${coupon.discountType === 'percentage' ? '%' : ' PKR'})`,
            ipAddress: req.ip,
        });
        res.status(201).json({ success: true, message: 'Coupon created.', coupon });
    }
    catch (err) {
        next(err);
    }
});
router.put('/coupons/:id', async (req, res, next) => {
    try {
        const data = couponSchema.partial().parse(req.body);
        const updatePayload = { ...data };
        if (data.code)
            updatePayload.code = data.code.toUpperCase().trim();
        if (data.expiryDate)
            updatePayload.expiryDate = new Date(data.expiryDate);
        if (data.startDate)
            updatePayload.startDate = new Date(data.startDate);
        const coupon = await Coupon_1.Coupon.findByIdAndUpdate(req.params.id, updatePayload, { new: true });
        if (!coupon)
            throw new errorHandler_1.AppError('Coupon not found.', 404);
        res.json({ success: true, message: 'Coupon updated.', coupon });
    }
    catch (err) {
        next(err);
    }
});
router.delete('/coupons/:id', async (req, res, next) => {
    try {
        await Coupon_1.Coupon.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Coupon deleted.' });
    }
    catch (err) {
        next(err);
    }
});
// ==========================================
// I. REPORTS, CSV EXPORT, SETTINGS, UPLOADS & AUDIT LOGS
// ==========================================
router.get('/reports', async (req, res, next) => {
    try {
        const { startDate, endDate } = req.query;
        const dateFilter = {};
        if (startDate || endDate) {
            dateFilter.createdAt = {};
            if (startDate)
                dateFilter.createdAt.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                dateFilter.createdAt.$lte = end;
            }
        }
        const [orders, products, coupons] = await Promise.all([
            Order_1.Order.find(dateFilter).sort({ createdAt: -1 }),
            Product_1.Product.find({ status: { $ne: 'archived' } }),
            Coupon_1.Coupon.find(),
        ]);
        const statusBreakdown = {
            pending: 0,
            confirmed: 0,
            processing: 0,
            shipped: 0,
            delivered: 0,
            cancelled: 0,
            refunded: 0,
        };
        let totalPaidSales = 0;
        let totalPendingSales = 0;
        let totalDiscountsGiven = 0;
        for (const o of orders) {
            statusBreakdown[o.fulfillmentStatus] = (statusBreakdown[o.fulfillmentStatus] || 0) + 1;
            if (o.fulfillmentStatus !== 'cancelled' && o.fulfillmentStatus !== 'refunded') {
                totalDiscountsGiven += o.discountAmount || 0;
                if (o.paymentStatus === 'paid' || o.fulfillmentStatus === 'delivered') {
                    totalPaidSales += o.totalAmount;
                }
                else {
                    totalPendingSales += o.totalAmount;
                }
            }
        }
        let totalUnitsInStock = 0;
        let totalInventoryCostValuation = 0;
        let totalInventoryRetailValuation = 0;
        for (const p of products) {
            totalUnitsInStock += p.stock;
            const effectiveRetail = p.salePrice && p.salePrice > 0 ? p.salePrice : p.price;
            totalInventoryRetailValuation += p.stock * effectiveRetail;
            totalInventoryCostValuation += p.stock * (p.costPrice || Math.round(effectiveRetail * 0.62));
        }
        const topProducts = [...products]
            .sort((a, b) => b.soldCount - a.soldCount)
            .slice(0, 10)
            .map((p) => ({
            _id: p._id,
            name: p.name,
            sku: p.sku,
            brand: p.brand,
            soldCount: p.soldCount,
            stock: p.stock,
            price: p.salePrice || p.price,
            estimatedRevenue: p.soldCount * (p.salePrice || p.price),
        }));
        res.json({
            success: true,
            salesSummary: {
                totalOrdersInPeriod: orders.length,
                totalPaidSales,
                totalPendingSales,
                totalDiscountsGiven,
                statusBreakdown,
            },
            inventoryValuation: {
                totalSkus: products.length,
                totalUnitsInStock,
                totalInventoryCostValuation,
                totalInventoryRetailValuation,
                projectedGrossMargin: totalInventoryRetailValuation - totalInventoryCostValuation,
            },
            topProducts,
            couponUsage: coupons.map((c) => ({
                code: c.code,
                discountType: c.discountType,
                discountValue: c.discountValue,
                usedCount: c.usedCount,
                usageLimit: c.usageLimit,
                isActive: c.isActive,
                expiryDate: c.expiryDate,
            })),
        });
    }
    catch (err) {
        next(err);
    }
});
// GET /api/admin/reports/export/:type — Downloadable CSV reports
router.get('/reports/export/:type', async (req, res, next) => {
    try {
        const { type } = req.params;
        const escapeCsv = (val) => {
            const str = String(val ?? '').replace(/"/g, '""');
            return `"${str}"`;
        };
        let csvRows = [];
        let filename = `msvelora-${type}-${new Date().toISOString().slice(0, 10)}.csv`;
        if (type === 'orders') {
            const orders = await Order_1.Order.find().sort({ createdAt: -1 });
            csvRows.push(['Order Number', 'Date', 'Customer Name', 'Email', 'Phone', 'City', 'Province', 'Subtotal (PKR)', 'Discount (PKR)', 'Shipping (PKR)', 'Total (PKR)', 'Payment Method', 'Payment Status', 'Fulfillment Status', 'Tracking Number']
                .map(escapeCsv)
                .join(','));
            for (const o of orders) {
                csvRows.push([
                    o.orderNumber,
                    o.createdAt.toISOString(),
                    o.shippingAddress.fullName,
                    o.shippingAddress.email,
                    o.shippingAddress.phone,
                    o.shippingAddress.city,
                    o.shippingAddress.province,
                    o.subtotal,
                    o.discountAmount,
                    o.shippingCost,
                    o.totalAmount,
                    o.paymentMethod,
                    o.paymentStatus,
                    o.fulfillmentStatus,
                    o.trackingNumber || '',
                ]
                    .map(escapeCsv)
                    .join(','));
            }
        }
        else if (type === 'inventory' || type === 'products') {
            const products = await Product_1.Product.find().sort({ sku: 1 });
            csvRows.push(['SKU', 'Name', 'Brand', 'Model', 'Gender', 'Status', 'Stock', 'Low Stock Threshold', 'Sold Count', 'Cost Price (PKR)', 'Retail Price (PKR)', 'Sale Price (PKR)', 'Retail Stock Value (PKR)']
                .map(escapeCsv)
                .join(','));
            for (const p of products) {
                const effective = p.salePrice && p.salePrice > 0 ? p.salePrice : p.price;
                csvRows.push([
                    p.sku,
                    p.name,
                    p.brand,
                    p.model,
                    p.gender,
                    p.status,
                    p.stock,
                    p.lowStockThreshold,
                    p.soldCount,
                    p.costPrice,
                    p.price,
                    p.salePrice ?? '',
                    p.stock * effective,
                ]
                    .map(escapeCsv)
                    .join(','));
            }
        }
        else {
            throw new errorHandler_1.AppError('Unsupported export report type.', 400);
        }
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(csvRows.join('\n'));
    }
    catch (err) {
        next(err);
    }
});
// GET & PUT /api/admin/settings
router.get('/settings', async (_req, res, next) => {
    try {
        let settings = await StoreSettings_1.StoreSettings.findOne({ key: 'default' });
        if (!settings) {
            settings = await StoreSettings_1.StoreSettings.create({ key: 'default' });
        }
        res.json({ success: true, settings });
    }
    catch (err) {
        next(err);
    }
});
router.put('/settings', async (req, res, next) => {
    try {
        let settings = await StoreSettings_1.StoreSettings.findOne({ key: 'default' });
        if (!settings) {
            settings = new StoreSettings_1.StoreSettings({ key: 'default' });
        }
        Object.assign(settings, req.body);
        await settings.save();
        await (0, helpers_1.logAudit)({
            user: req.user,
            action: 'UPDATE_STORE_SETTINGS',
            entityType: 'settings',
            details: 'Updated store configuration, shipping rules, and payment settings',
            ipAddress: req.ip,
        });
        res.json({
            success: true,
            message: 'Store settings saved.',
            settings,
        });
    }
    catch (err) {
        next(err);
    }
});
// POST /api/admin/upload — Safe image upload (Cloudinary or local fallback)
router.post('/upload', upload.single('image'), async (req, res, next) => {
    try {
        if (!req.file) {
            throw new errorHandler_1.AppError('No image file provided.', 400);
        }
        if (env_1.env.CLOUDINARY_CLOUD_NAME &&
            env_1.env.CLOUDINARY_API_KEY &&
            env_1.env.CLOUDINARY_API_SECRET) {
            cloudinary_1.v2.config({
                cloud_name: env_1.env.CLOUDINARY_CLOUD_NAME,
                api_key: env_1.env.CLOUDINARY_API_KEY,
                api_secret: env_1.env.CLOUDINARY_API_SECRET,
            });
            const uploaded = await cloudinary_1.v2.uploader.upload(req.file.path, {
                folder: 'msvelora',
                transformation: [{ quality: 'auto', fetch_format: 'auto' }],
            });
            fs_1.default.unlink(req.file.path, () => { });
            res.status(201).json({
                success: true,
                url: uploaded.secure_url,
                provider: 'cloudinary',
            });
            return;
        }
        const localUrl = `/uploads/${req.file.filename}`;
        res.status(201).json({
            success: true,
            url: localUrl,
            provider: 'local',
        });
    }
    catch (err) {
        next(err);
    }
});
// GET /api/admin/audit-logs
router.get('/audit-logs', async (_req, res, next) => {
    try {
        const logs = await AuditLog_1.AuditLog.find().sort({ createdAt: -1 }).limit(100);
        res.json({ success: true, logs });
    }
    catch (err) {
        next(err);
    }
});
// GET /api/admin/reviews
router.get('/reviews', async (_req, res, next) => {
    try {
        const reviews = await Review_1.Review.find()
            .populate('product', 'name slug sku mainImage')
            .sort({ createdAt: -1 });
        res.json({ success: true, reviews });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;

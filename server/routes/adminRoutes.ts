import { Router, Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import os from 'os';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { z } from 'zod';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { Product } from '../models/Product';
import { Category } from '../models/Category';
import { Collection } from '../models/Collection';
import mongoose from 'mongoose';
import { Order, OrderFulfillmentStatus, OrderPaymentStatus, ShippingMethod, SHIPPING_METHODS } from '../models/Order';
import { User } from '../models/User';
import { StockMovement } from '../models/StockMovement';
import { Coupon } from '../models/Coupon';
import { HomepageContent } from '../models/HomepageContent';
import { StoreSettings } from '../models/StoreSettings';
import { AuditLog } from '../models/AuditLog';
import { Review } from '../models/Review';
import {
  slugify,
  generateSku,
  logAudit,
  isApprovedOrderNumber,
  formatApprovedOrderNumber,
  generateOrderNumber,
} from '../utils/helpers';
import { nextSequence, getNextOrderNumber, formatOrderNumber } from '../models/Counter';
import { PushSubscription } from '../models/PushSubscription';
import { sendToTopic, pushEnabled } from '../utils/push';
import { env } from '../config/env';

const router = Router();

// Protect all routes in adminRoutes with server-enforced authentication + admin role verification
router.use(requireAuth, requireAdmin);

// Configure safe image upload storage (handles Vercel /tmp vs local disk)
const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const uploadsDir = isServerless
  ? path.join(os.tmpdir(), 'msvelora-uploads')
  : path.resolve(__dirname, '../../uploads');

try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
} catch (err) {
  console.warn('[Storage] Notice: Could not create local uploadsDir:', err);
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    try {
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
    } catch {
      // ignore
    }
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `bfs-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
    cb(null, safeName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (_req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError('Only JPG, PNG, WebP, and AVIF images under 5MB are allowed.', 400));
    }
  },
});

// ==========================================
// A. DASHBOARD OVERVIEW
// ==========================================
router.get('/overview', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [
      allOrders,
      totalProducts,
      lowStockProducts,
      outOfStockProducts,
      recentOrders,
      bestSellingProducts,
      totalCustomers,
    ] = await Promise.all([
      Order.find().select(
        'orderNumber totalAmount paymentStatus fulfillmentStatus createdAt items shippingAddress orderSource'
      ),
      Product.countDocuments({ status: { $ne: 'archived' } }),
      Product.find({
        status: 'published',
        $expr: {
          $and: [{ $gt: ['$stock', 0] }, { $lte: ['$stock', '$lowStockThreshold'] }],
        },
      })
        .select('name slug sku brand mainImage stock lowStockThreshold price')
        .sort({ stock: 1 })
        .limit(12),
      Product.find({ status: 'published', stock: 0 })
        .select('name slug sku brand mainImage stock lowStockThreshold price')
        .limit(12),
      Order.find().sort({ createdAt: -1 }).limit(8),
      Product.find({ status: 'published' })
        .sort({ soldCount: -1, bestSeller: -1 })
        .select('name slug sku brand mainImage price salePrice stock soldCount')
        .limit(6),
      User.countDocuments({ role: 'customer' }),
    ]);
    const pushSubscribers = await PushSubscription.countDocuments({ topics: 'new-arrivals' });

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
    const statusCounts: Record<string, number> = {
      pending: 0, confirmed: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0, refunded: 0,
    };

    let paidRevenue = 0;
    let pendingRevenue = 0;
    let cancelledValue = 0;
    let pendingOrdersCount = 0;
    let completedOrdersCount = 0;
    let cancelledOrdersCount = 0;

    // Last 14 days sales trend
    const dailyMap = new Map<string, { date: string; paidRevenue: number; pendingRevenue: number; orders: number }>();
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      dailyMap.set(key, { date: key, paidRevenue: 0, pendingRevenue: 0, orders: 0 });
    }

    for (const o of allOrders) {
      const isCancelledOrRefunded =
        o.fulfillmentStatus === 'cancelled' ||
        o.fulfillmentStatus === 'refunded' ||
        o.paymentStatus === 'refunded';

      if (isCancelledOrRefunded) {
        cancelledValue += o.totalAmount;
        cancelledOrdersCount += 1;
      } else if (o.paymentStatus === 'paid' || o.fulfillmentStatus === 'delivered') {
        paidRevenue += o.totalAmount;
      } else {
        pendingRevenue += o.totalAmount;
      }

      if (['pending', 'confirmed', 'processing', 'shipped'].includes(o.fulfillmentStatus)) {
        pendingOrdersCount += 1;
      }
      if (o.fulfillmentStatus === 'delivered') {
        completedOrdersCount += 1;
      }
      statusCounts[o.fulfillmentStatus] = (statusCounts[o.fulfillmentStatus] || 0) + 1;
      if (o.orderSource === 'whatsapp') whatsappOrders += 1;
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
        } else {
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
        averageOrderValue:
          allOrders.length - cancelledOrdersCount > 0
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
  } catch (err) {
    next(err);
  }
});

// ==========================================
// B. PRODUCT MANAGEMENT
// ==========================================
const productPayloadSchema = z.object({
  name: z.string().min(2, 'Product name is required').max(180),
  slug: z.string().optional(),
  brand: z.string().min(1, 'Brand is required'),
  model: z.string().optional().default(''),
  sku: z.string().optional(),
  category: z.string().optional().nullable(),
  collections: z.array(z.string()).optional().default([]),
  gender: z.enum(['Men', 'Women', 'Unisex']).default('Women'),
  // 0 means "price on request"
  price: z.number().min(0, 'Price cannot be negative'),
  salePrice: z.number().nullable().optional().default(null),
  costPrice: z.number().min(0).optional().default(0),
  shortDescription: z.string().optional().default(''),
  description: z.string().min(10, 'Detailed product description is required'),
  mainImage: z.string().min(1, 'Main product image is required'),
  images: z
    .array(
      z.object({
        url: z.string().min(1),
        alt: z.string().optional().default(''),
        isMain: z.boolean().optional().default(false),
      })
    )
    .optional()
    .default([]),
  specifications: z
    .object({
      // Field names are legacy; labels in the UI are jewellery-specific
      movement: z.string().default('Necklace'), // Type
      caseMaterial: z.string().default('Gold Plated Brass'), // Metal
      caseDiameter: z.string().default('Adjustable'), // Size / length
      caseThickness: z.string().default('Lightweight'), // Weight
      strapMaterial: z.string().default('High Polish'), // Finish
      strapWidth: z.string().default('Lobster Clasp'), // Closure
      dialColor: z.string().default('Gold'), // Colour
      crystal: z.string().default('Cubic Zirconia'), // Stones
      waterResistance: z.string().default('Keep away from water & perfume'), // Care
      warranty: z.string().default('Plating Warranty'),
      origin: z.string().default('Pakistan'),
    })
    .optional(),
  variants: z
    .array(
      z.object({
        sku: z.string().min(1),
        name: z.string().min(1),
        dialColor: z.string().optional().default(''),
        strapMaterial: z.string().optional().default(''),
        price: z.number().optional(),
        salePrice: z.number().nullable().optional().default(null),
        stock: z.number().int().min(0).default(0),
        image: z.string().optional().default(''),
      })
    )
    .optional()
    .default([]),
  stock: z.number().int().min(0, 'Stock cannot be negative').default(0),
  lowStockThreshold: z.number().int().min(0).default(5),
  status: z.enum(['published', 'draft', 'archived']).default('published'),
  featured: z.boolean().default(false),
  bestSeller: z.boolean().default(false),
  newArrival: z.boolean().default(false),
  tags: z.array(z.string()).optional().default([]),
  metaTitle: z.string().optional().default(''),
  metaDescription: z.string().optional().default(''),
});

// GET /api/admin/products
router.get('/products', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { q, status, category, stockStatus, page = '1', limit = '20' } = req.query as Record<
      string,
      string | undefined
    >;

    const filter: Record<string, unknown> = {};
    if (status && status !== 'all') {
      filter.status = status;
    }
    if (category && category !== 'all') {
      filter.category = category;
    }
    if (stockStatus === 'out_of_stock') {
      filter.stock = 0;
    } else if (stockStatus === 'low_stock') {
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
      Product.find(filter)
        .populate('category', 'name slug')
        .populate('collections', 'name slug')
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Product.countDocuments(filter),
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
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/products
router.post('/products', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = productPayloadSchema.parse(req.body);

    let slug = data.slug && data.slug.trim() ? slugify(data.slug) : slugify(`${data.brand}-${data.name}`);
    const existingSlug = await Product.findOne({ slug });
    if (existingSlug) {
      slug = `${slug}-${Math.floor(100 + Math.random() * 900)}`;
    }

    const sku =
      data.sku && data.sku.trim()
        ? data.sku.trim().toUpperCase()
        : generateSku(data.brand, data.model);

    const images =
      data.images.length > 0
        ? data.images
        : [{ url: data.mainImage, alt: data.name, isMain: true }];

    const product = await Product.create({
      ...data,
      slug,
      sku,
      category: data.category || undefined,
      images,
    });

    await StockMovement.create({
      product: product._id,
      sku: product.sku,
      type: 'addition',
      quantityChange: product.stock,
      previousStock: 0,
      newStock: product.stock,
      reason: 'Initial product creation inventory',
      performedBy: req.user!._id,
      performedByName: req.user!.name,
    });

    await logAudit({
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
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/products/:id
router.put('/products/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      throw new AppError('Product not found.', 404);
    }

    const data = productPayloadSchema.partial().parse(req.body);
    const previousStock = product.stock;

    if (data.slug && data.slug.trim()) {
      data.slug = slugify(data.slug);
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
      await StockMovement.create({
        product: product._id,
        sku: product.sku,
        type: 'manual_adjustment',
        quantityChange: diff,
        previousStock,
        newStock: data.stock,
        reason: 'Updated via Product Editor',
        performedBy: req.user!._id,
        performedByName: req.user!.name,
      });
    }

    await logAudit({
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
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/products/:id
router.delete('/products/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      throw new AppError('Product not found.', 404);
    }

    const permanent = req.query.permanent === 'true';
    if (permanent) {
      await Product.findByIdAndDelete(product._id);
    } else {
      product.status = 'archived';
      await product.save();
    }

    await logAudit({
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
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/products/bulk
router.post('/products/bulk', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      productIds: z.array(z.string()).min(1),
      action: z.enum(['publish', 'draft', 'archive', 'delete']),
    });
    const { productIds, action } = schema.parse(req.body);

    if (action === 'delete') {
      await Product.deleteMany({ _id: { $in: productIds } });
    } else {
      const statusMap: Record<string, 'published' | 'draft' | 'archived'> = {
        publish: 'published',
        draft: 'draft',
        archive: 'archived',
      };
      await Product.updateMany(
        { _id: { $in: productIds } },
        { $set: { status: statusMap[action] } }
      );
    }

    await logAudit({
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
  } catch (err) {
    next(err);
  }
});

// ==========================================
// C. INVENTORY MANAGEMENT
// ==========================================
router.get('/inventory', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { q, status } = req.query as Record<string, string | undefined>;
    const filter: Record<string, unknown> = { status: { $ne: 'archived' } };

    if (q && q.trim()) {
      const regex = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ name: regex }, { sku: regex }, { brand: regex }, { model: regex }];
    }

    if (status === 'out_of_stock') {
      filter.stock = 0;
    } else if (status === 'low_stock') {
      filter.$expr = {
        $and: [{ $gt: ['$stock', 0] }, { $lte: ['$stock', '$lowStockThreshold'] }],
      };
    } else if (status === 'in_stock') {
      filter.$expr = { $gt: ['$stock', '$lowStockThreshold'] };
    }

    const [products, recentMovements] = await Promise.all([
      Product.find(filter)
        .select(
          'name slug brand model sku mainImage price salePrice costPrice stock reservedStock lowStockThreshold soldCount variants status'
        )
        .sort({ stock: 1, name: 1 }),
      StockMovement.find()
        .populate('product', 'name sku mainImage')
        .sort({ createdAt: -1 })
        .limit(60),
    ]);

    res.json({
      success: true,
      inventory: products,
      movements: recentMovements,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/inventory/adjust — Auditable stock addition/reduction/adjustment
router.post('/inventory/adjust', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      productId: z.string().min(1),
      variantSku: z.string().optional(),
      adjustmentType: z.enum(['addition', 'reduction', 'set_exact']),
      quantity: z.number().int().min(0, 'Quantity must be a non-negative integer'),
      lowStockThreshold: z.number().int().min(0).optional(),
      reason: z.string().min(3, 'Please provide a clear reason for this inventory adjustment'),
    });

    const data = schema.parse(req.body);
    const product = await Product.findById(data.productId);
    if (!product) {
      throw new AppError('Product not found.', 404);
    }

    const previousStock = product.stock;
    let newStock = previousStock;

    if (data.adjustmentType === 'addition') {
      if (data.quantity <= 0) {
        throw new AppError('Addition quantity must be greater than 0.', 400);
      }
      newStock = previousStock + data.quantity;
    } else if (data.adjustmentType === 'reduction') {
      if (data.quantity <= 0) {
        throw new AppError('Reduction quantity must be greater than 0.', 400);
      }
      if (previousStock - data.quantity < 0) {
        throw new AppError(
          `Cannot reduce stock by ${data.quantity}. Current stock is ${previousStock} (negative stock is prohibited).`,
          400
        );
      }
      newStock = previousStock - data.quantity;
    } else {
      newStock = data.quantity;
    }

    const quantityChange = newStock - previousStock;
    product.stock = newStock;
    if (data.lowStockThreshold !== undefined) {
      product.lowStockThreshold = data.lowStockThreshold;
    }
    await product.save();

    const movement = await StockMovement.create({
      product: product._id,
      sku: product.sku,
      variantSku: data.variantSku,
      type:
        data.adjustmentType === 'addition'
          ? 'addition'
          : data.adjustmentType === 'reduction'
          ? 'reduction'
          : 'manual_adjustment',
      quantityChange,
      previousStock,
      newStock,
      reason: data.reason,
      performedBy: req.user!._id,
      performedByName: req.user!.name,
    });

    await logAudit({
      user: req.user,
      action: 'INVENTORY_ADJUSTMENT',
      entityType: 'inventory',
      entityId: String(product._id),
      details: `Adjusted stock for ${product.name} (${product.sku}): ${previousStock} -> ${newStock} (${
        quantityChange >= 0 ? `+${quantityChange}` : quantityChange
      }). Reason: ${data.reason}`,
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      message: `Stock updated from ${previousStock} to ${newStock}.`,
      product,
      movement,
    });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// D. ORDER MANAGEMENT
// ==========================================
router.get('/orders', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      q,
      fulfillmentStatus,
      paymentStatus,
      orderSource,
      page = '1',
      limit = '20',
    } = req.query as Record<string, string | undefined>;

    const filter: Record<string, unknown> = {};
    if (fulfillmentStatus && fulfillmentStatus !== 'all') {
      filter.fulfillmentStatus = fulfillmentStatus;
    }
    if (paymentStatus && paymentStatus !== 'all') {
      filter.paymentStatus = paymentStatus;
    }
    if (orderSource === 'website' || orderSource === 'whatsapp' || orderSource === 'manual') {
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
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Order.countDocuments(filter),
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
  } catch (err) {
    next(err);
  }
});

router.get('/orders/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const order = await Order.findById(req.params.id).populate('user', 'name email phone');
    if (!order) {
      throw new AppError('Order not found.', 404);
    }
    res.json({ success: true, order });
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/orders/:id/status — Defined state transitions & idempotent inventory restoration
router.put('/orders/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      fulfillmentStatus: z
        .enum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'])
        .optional(),
      paymentStatus: z.enum(['pending', 'paid', 'failed', 'refunded']).optional(),
      courierName: z.string().optional(),
      trackingNumber: z.string().optional(),
      note: z.string().optional(),
    });

    const data = schema.parse(req.body);
    const order = await Order.findById(req.params.id);
    if (!order) {
      throw new AppError('Order not found.', 404);
    }

    const prevFulfillment = order.fulfillmentStatus;
    const prevPayment = order.paymentStatus;

    // If reopening a previously cancelled or refunded order, re-allocate the stock
    if (
      (prevFulfillment === 'cancelled' || prevFulfillment === 'refunded') &&
      data.fulfillmentStatus &&
      !['cancelled', 'refunded'].includes(data.fulfillmentStatus) &&
      order.inventoryRestored
    ) {
      for (const item of order.items) {
        const prod = await Product.findById(item.product);
        if (prod) {
          const prevStock = prod.stock;
          prod.stock = Math.max(0, prod.stock - item.quantity);
          prod.soldCount = (prod.soldCount || 0) + item.quantity;

          if (item.variantSku && prod.variants && prod.variants.length > 0) {
            const v = prod.variants.find((vr) => vr.sku === item.variantSku);
            if (v) {
              v.stock = Math.max(0, v.stock - item.quantity);
            }
          }
          await prod.save();

          await StockMovement.create({
            product: prod._id,
            sku: item.sku,
            variantSku: item.variantSku,
            type: 'order_placed',
            quantityChange: -item.quantity,
            previousStock: prevStock,
            newStock: prod.stock,
            reason: `Stock re-allocated: Order ${order.orderNumber} reopened from ${prevFulfillment} to ${data.fulfillmentStatus}`,
            orderId: order._id,
            orderNumber: order.orderNumber,
            performedBy: req.user!._id,
            performedByName: req.user!.name,
          });
        }
      }
      order.inventoryRestored = false;
      order.cancelledAt = undefined;
      order.refundedAt = undefined;
    }

    if (data.courierName !== undefined) order.courierName = data.courierName;
    if (data.trackingNumber !== undefined) order.trackingNumber = data.trackingNumber;

    const targetFulfillment: OrderFulfillmentStatus =
      data.fulfillmentStatus || order.fulfillmentStatus;
    let targetPayment: OrderPaymentStatus = data.paymentStatus || order.paymentStatus;

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
    if (
      (targetFulfillment === 'cancelled' || targetFulfillment === 'refunded') &&
      !order.inventoryRestored
    ) {
      for (const item of order.items) {
        const prod = await Product.findById(item.product);
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

          await StockMovement.create({
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
            performedBy: req.user!._id,
            performedByName: req.user!.name,
          });
        }
      }
      order.inventoryRestored = true;
    }

    // Approval assigns the permanent sequential number (MS-001, MS-002, …).
    // Orders cancelled before approval never consume a number, so there are no gaps.
    let approvedNumberNote = '';
    const approving = ['confirmed', 'processing', 'shipped', 'delivered'].includes(targetFulfillment);
    if (approving && !isApprovedOrderNumber(order.orderNumber)) {
      if (!order.requestNumber) order.requestNumber = order.orderNumber;
      order.orderNumber = await getNextOrderNumber();
      order.approvedAt = new Date();
      approvedNumberNote = ` Approved as ${order.orderNumber} (ref ${order.requestNumber}).`;
    }

    order.fulfillmentStatus = targetFulfillment;
    order.paymentStatus = targetPayment;

    const statusNote =
      (data.note ||
        `Status updated: Fulfillment [${prevFulfillment} -> ${targetFulfillment}], Payment [${prevPayment} -> ${targetPayment}]${
          order.trackingNumber ? ` (Tracking: ${order.courierName || 'Courier'} #${order.trackingNumber})` : ''
        }`) + approvedNumberNote;

    order.statusHistory.push({
      status: targetFulfillment,
      paymentStatus: targetPayment,
      note: statusNote,
      updatedBy: req.user!.name,
      timestamp: new Date(),
    });

    await order.save();

    await logAudit({
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
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/orders/:id — Permanently delete an order and restore inventory if needed
router.delete('/orders/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      throw new AppError('Order not found.', 404);
    }

    const restoreStock = req.query.restoreStock !== 'false';
    let stockRestoredCount = 0;

    // Restore inventory if not already restored
    if (restoreStock && !order.inventoryRestored) {
      for (const item of order.items) {
        const prod = await Product.findById(item.product);
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

          await StockMovement.create({
            product: prod._id,
            sku: item.sku,
            variantSku: item.variantSku,
            type: 'order_cancelled',
            quantityChange: item.quantity,
            previousStock: prevStock,
            newStock: prod.stock,
            reason: `Stock returned to vault from deleted order ${order.orderNumber}`,
            orderId: order._id,
            orderNumber: order.orderNumber,
            performedBy: req.user!._id,
            performedByName: req.user!.name,
          });
          stockRestoredCount += item.quantity;
        }
      }
    }

    await Order.findByIdAndDelete(order._id);

    await logAudit({
      user: req.user,
      action: 'DELETE_ORDER',
      entityType: 'order',
      entityId: String(order._id),
      details: `Order ${order.orderNumber} permanently deleted by ${req.user!.name}. Total: Rs. ${order.totalAmount}. ${stockRestoredCount > 0 ? `Restored ${stockRestoredCount} item(s) to stock.` : 'No stock restoration needed.'}`,
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      message: `Order ${order.orderNumber} deleted successfully.`,
      orderId: order._id,
      orderNumber: order.orderNumber,
      stockRestoredCount,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/orders/bulk — Bulk actions for orders (bulk delete, etc.)
router.post('/orders/bulk', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      orderIds: z.array(z.string()).min(1, 'Select at least one order.'),
      action: z.enum(['delete']),
      restoreStock: z.boolean().default(true),
    });

    const { orderIds, action, restoreStock } = schema.parse(req.body);
    let deletedCount = 0;
    let totalStockRestored = 0;

    if (action === 'delete') {
      for (const id of orderIds) {
        const order = await Order.findById(id);
        if (!order) continue;

        if (restoreStock && !order.inventoryRestored) {
          for (const item of order.items) {
            const prod = await Product.findById(item.product);
            if (prod) {
              const prevStock = prod.stock;
              prod.stock += item.quantity;
              prod.soldCount = Math.max(0, (prod.soldCount || 0) - item.quantity);

              if (item.variantSku && prod.variants && prod.variants.length > 0) {
                const v = prod.variants.find((vr) => vr.sku === item.variantSku);
                if (v) v.stock += item.quantity;
              }
              await prod.save();

              await StockMovement.create({
                product: prod._id,
                sku: item.sku,
                variantSku: item.variantSku,
                type: 'order_cancelled',
                quantityChange: item.quantity,
                previousStock: prevStock,
                newStock: prod.stock,
                reason: `Stock returned to vault from bulk deleted order ${order.orderNumber}`,
                orderId: order._id,
                orderNumber: order.orderNumber,
                performedBy: req.user!._id,
                performedByName: req.user!.name,
              });
              totalStockRestored += item.quantity;
            }
          }
        }

        await Order.findByIdAndDelete(order._id);
        deletedCount++;
      }

      await logAudit({
        user: req.user,
        action: 'BULK_DELETE_ORDERS',
        entityType: 'order',
        details: `Bulk deleted ${deletedCount} order(s) by ${req.user!.name}. Restored ${totalStockRestored} item(s) to stock.`,
        ipAddress: req.ip,
      });

      res.json({
        success: true,
        message: `Successfully deleted ${deletedCount} order(s). ${totalStockRestored > 0 ? `(${totalStockRestored} items returned to inventory)` : ''}`,
        deletedCount,
      });
    }
  } catch (err) {
    next(err);
  }
});

// PATCH / PUT /api/admin/orders/:id/force-update — Admin forceful override of any order field
const forceUpdateHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      orderNumber: z.string().trim().min(2).max(40).optional(),
      overwriteOrder: z.boolean().default(false).optional(),
      fulfillmentStatus: z
        .enum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'])
        .optional(),
      paymentStatus: z.enum(['pending', 'paid', 'failed', 'refunded']).optional(),
      paymentMethod: z.enum(['cod', 'online_card', 'bank_transfer', 'jazzcash', 'easypaisa', 'online']).optional(),
      shippingMethod: z.enum(['standard', 'express', 'hand', 'pickup'] as const).optional(),
      customer: z
        .object({
          fullName: z.string().trim().min(1).max(80).optional(),
          phone: z.string().trim().min(3).max(30).optional(),
          email: z.string().trim().max(100).optional(),
          streetAddress: z.string().trim().max(250).optional(),
          city: z.string().trim().max(80).optional(),
          province: z.string().trim().max(80).optional(),
          postalCode: z.string().trim().max(20).optional(),
          notes: z.string().trim().max(500).optional(),
        })
        .optional(),
      financials: z
        .object({
          subtotal: z.number().min(0).optional(),
          discountAmount: z.number().min(0).optional(),
          shippingCost: z.number().min(0).optional(),
          totalAmount: z.number().min(0).optional(),
        })
        .optional(),
      courierName: z.string().trim().max(80).optional(),
      trackingNumber: z.string().trim().max(80).optional(),
      deliveryPerson: z.string().trim().max(80).optional(),
      deliveryPhone: z.string().trim().max(30).optional(),
      adminReason: z.string().trim().max(500).optional(),
      adjustStock: z.boolean().default(true),
    });

    const data = schema.parse(req.body);
    const order = await Order.findById(req.params.id);
    if (!order) {
      throw new AppError('Order not found.', 404);
    }

    const changes: string[] = [];
    const prevFulfillment = order.fulfillmentStatus;
    const prevPayment = order.paymentStatus;

    // 1. Order Number override & overwrite capability
    if (data.orderNumber && data.orderNumber.toUpperCase() !== order.orderNumber) {
      const newNum = data.orderNumber.trim().toUpperCase();
      const existing = await Order.findOne({ orderNumber: newNum, _id: { $ne: order._id } });
      if (existing) {
        if (data.overwriteOrder) {
          // If overwrite requested, safely delete the old conflicting duplicate
          await Order.findByIdAndDelete(existing._id);
          changes.push(`Overwrote existing order ${newNum}`);
        } else {
          throw new AppError(`Order number ${newNum} already exists. Select 'Overwrite existing order' if you wish to replace it.`, 400);
        }
      }
      changes.push(`Order ID [${order.orderNumber} -> ${newNum}]`);
      order.orderNumber = newNum;
    }

    // 2. Fulfillment status & stock transition
    if (data.fulfillmentStatus && data.fulfillmentStatus !== prevFulfillment) {
      const targetFulfillment = data.fulfillmentStatus;
      changes.push(`Fulfillment [${prevFulfillment} -> ${targetFulfillment}]`);

      if (data.adjustStock) {
        // From cancelled/refunded -> active
        if (
          (prevFulfillment === 'cancelled' || prevFulfillment === 'refunded') &&
          !['cancelled', 'refunded'].includes(targetFulfillment) &&
          order.inventoryRestored
        ) {
          for (const item of order.items) {
            const prod = await Product.findById(item.product);
            if (prod) {
              const prevStock = prod.stock;
              prod.stock = Math.max(0, prod.stock - item.quantity);
              prod.soldCount = (prod.soldCount || 0) + item.quantity;
              if (item.variantSku && prod.variants && prod.variants.length > 0) {
                const v = prod.variants.find((vr) => vr.sku === item.variantSku);
                if (v) v.stock = Math.max(0, v.stock - item.quantity);
              }
              await prod.save();
              await StockMovement.create({
                product: prod._id,
                sku: item.sku,
                variantSku: item.variantSku,
                type: 'order_placed',
                quantityChange: -item.quantity,
                previousStock: prevStock,
                newStock: prod.stock,
                reason: `Stock re-allocated via forceful order update (${prevFulfillment} -> ${targetFulfillment})`,
                orderId: order._id,
                orderNumber: order.orderNumber,
                performedBy: req.user!._id,
                performedByName: req.user!.name,
              });
            }
          }
          order.inventoryRestored = false;
        }

        // From active -> cancelled/refunded
        if (
          ['cancelled', 'refunded'].includes(targetFulfillment) &&
          !order.inventoryRestored
        ) {
          for (const item of order.items) {
            const prod = await Product.findById(item.product);
            if (prod) {
              const prevStock = prod.stock;
              prod.stock += item.quantity;
              prod.soldCount = Math.max(0, (prod.soldCount || 0) - item.quantity);
              if (item.variantSku && prod.variants && prod.variants.length > 0) {
                const v = prod.variants.find((vr) => vr.sku === item.variantSku);
                if (v) v.stock += item.quantity;
              }
              await prod.save();
              await StockMovement.create({
                product: prod._id,
                sku: item.sku,
                variantSku: item.variantSku,
                type: 'order_cancelled',
                quantityChange: item.quantity,
                previousStock: prevStock,
                newStock: prod.stock,
                reason: `Stock restored via forceful order update (${prevFulfillment} -> ${targetFulfillment})`,
                orderId: order._id,
                orderNumber: order.orderNumber,
                performedBy: req.user!._id,
                performedByName: req.user!.name,
              });
            }
          }
          order.inventoryRestored = true;
        }
      }

      order.fulfillmentStatus = targetFulfillment;
      if (targetFulfillment === 'shipped' && !order.shippedAt) order.shippedAt = new Date();
      if (targetFulfillment === 'delivered' && !order.deliveredAt) order.deliveredAt = new Date();
      if (targetFulfillment === 'cancelled' && !order.cancelledAt) order.cancelledAt = new Date();
      if (targetFulfillment === 'refunded' && !order.refundedAt) order.refundedAt = new Date();
    }

    // 3. Payment status
    if (data.paymentStatus && data.paymentStatus !== prevPayment) {
      changes.push(`Payment [${prevPayment} -> ${data.paymentStatus}]`);
      order.paymentStatus = data.paymentStatus;
      if (data.paymentStatus === 'paid' && !order.paidAt) order.paidAt = new Date();
      if (data.paymentStatus === 'refunded' && !order.refundedAt) order.refundedAt = new Date();
    }

    // 4. Payment method
    if (data.paymentMethod && data.paymentMethod !== order.paymentMethod) {
      changes.push(`Payment Method [${order.paymentMethod} -> ${data.paymentMethod}]`);
      order.paymentMethod = data.paymentMethod;
    }

    // 5. Shipping method
    if (data.shippingMethod && data.shippingMethod !== order.shippingMethod) {
      changes.push(`Shipping Method [${order.shippingMethod} -> ${data.shippingMethod}]`);
      order.shippingMethod = data.shippingMethod as ShippingMethod;
    }

    // 6. Customer details
    if (data.customer) {
      const c = data.customer;
      if (c.fullName !== undefined && c.fullName !== order.shippingAddress.fullName) {
        changes.push(`Name [${order.shippingAddress.fullName} -> ${c.fullName}]`);
        order.shippingAddress.fullName = c.fullName;
      }
      if (c.phone !== undefined && c.phone !== order.shippingAddress.phone) {
        changes.push(`Phone [${order.shippingAddress.phone} -> ${c.phone}]`);
        order.shippingAddress.phone = c.phone;
      }
      if (c.email !== undefined && c.email !== order.shippingAddress.email) {
        changes.push(`Email [${order.shippingAddress.email || 'none'} -> ${c.email}]`);
        order.shippingAddress.email = c.email;
      }
      if (c.streetAddress !== undefined && c.streetAddress !== order.shippingAddress.streetAddress) {
        changes.push('Address updated');
        order.shippingAddress.streetAddress = c.streetAddress;
      }
      if (c.city !== undefined && c.city !== order.shippingAddress.city) {
        changes.push(`City [${order.shippingAddress.city} -> ${c.city}]`);
        order.shippingAddress.city = c.city;
      }
      if (c.province !== undefined) order.shippingAddress.province = c.province;
      if (c.postalCode !== undefined) order.shippingAddress.postalCode = c.postalCode;
      if (c.notes !== undefined) order.shippingAddress.notes = c.notes;
    }

    // 7. Financials
    if (data.financials) {
      const f = data.financials;
      if (f.subtotal !== undefined) order.subtotal = f.subtotal;
      if (f.discountAmount !== undefined) order.discountAmount = f.discountAmount;
      if (f.shippingCost !== undefined) order.shippingCost = f.shippingCost;
      if (f.totalAmount !== undefined && f.totalAmount !== order.totalAmount) {
        changes.push(`Total [Rs. ${order.totalAmount} -> Rs. ${f.totalAmount}]`);
        order.totalAmount = f.totalAmount;
      }
    }

    // 8. Courier & delivery details
    if (data.courierName !== undefined) order.courierName = data.courierName;
    if (data.trackingNumber !== undefined) order.trackingNumber = data.trackingNumber;
    if (data.deliveryPerson !== undefined) order.deliveryPerson = data.deliveryPerson;
    if (data.deliveryPhone !== undefined) order.deliveryPhone = data.deliveryPhone;

    // 9. Status history & audit
    const reasonText = data.adminReason ? ` (Reason: ${data.adminReason})` : '';
    const summary = changes.length > 0 ? changes.join('; ') : 'Order details modified';
    const noteText = `Force update by admin ${req.user!.name}: ${summary}${reasonText}`;

    order.statusHistory.push({
      status: order.fulfillmentStatus,
      paymentStatus: order.paymentStatus,
      note: noteText,
      updatedBy: req.user!.name,
      timestamp: new Date(),
    });

    await order.save();

    await logAudit({
      user: req.user,
      action: 'FORCE_UPDATE_ORDER',
      entityType: 'order',
      entityId: String(order._id),
      details: `Order ${order.orderNumber}: ${noteText}`,
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      message: `Order ${order.orderNumber} updated successfully.`,
      order,
    });
  } catch (err) {
    next(err);
  }
};

router.patch('/orders/:id/force-update', forceUpdateHandler);
router.put('/orders/:id/force-update', forceUpdateHandler);

// ==========================================
// D1b. MANUAL ORDERS & DELIVERY ADJUSTMENTS
// ==========================================
const SHIPPING_LABEL: Record<string, string> = {
  standard: 'Courier (standard)',
  express: 'Courier (express)',
  hand: 'Hand delivery',
  pickup: 'Store pickup',
};

/** Default delivery charge for a method, using the store's delivery settings. */
const defaultShippingFor = (
  method: string,
  discountedSubtotal: number,
  settings: { standardShippingFee: number; expressShippingFee: number; freeShippingThreshold: number; handDeliveryFee?: number }
) => {
  if (method === 'pickup') return 0;
  if (method === 'hand') return settings.handDeliveryFee || 0;
  if (method === 'express') return settings.expressShippingFee;
  return discountedSubtotal >= settings.freeShippingThreshold ? 0 : settings.standardShippingFee;
};

// POST /api/admin/orders — create an order by hand (phone, Instagram, walk-in, …)
router.post('/orders', async (req: Request, res: Response, next: NextFunction) => {
  type Deducted = { productId: mongoose.Types.ObjectId; variantSku?: string; quantity: number };
  const deducted: Deducted[] = [];
  try {
    const schema = z.object({
      customer: z.object({
        fullName: z.string().trim().min(2).max(80),
        phone: z.string().trim().min(5).max(30),
        email: z.union([z.string().trim().email(), z.literal('')]).default(''),
        streetAddress: z.string().trim().max(200).default(''),
        city: z.string().trim().max(60).default(''),
        province: z.string().trim().max(60).default(''),
        postalCode: z.string().trim().max(20).default(''),
        notes: z.string().trim().max(500).default(''),
      }),
      items: z
        .array(
          z.object({
            productId: z.string().regex(/^[a-f\d]{24}$/i),
            variantSku: z.string().optional(),
            quantity: z.number().int().min(1).max(999),
            unitPrice: z.number().min(0).optional(),
          })
        )
        .min(1, 'Add at least one product.'),
      shippingMethod: z.enum(SHIPPING_METHODS as [string, ...string[]]).default('standard'),
      shippingCost: z.number().min(0).optional(),
      discountAmount: z.number().min(0).default(0),
      paymentMethod: z.enum(['cod', 'bank_transfer', 'jazzcash', 'easypaisa', 'online']).default('cod'),
      paymentStatus: z.enum(['pending', 'paid']).default('pending'),
      fulfillmentStatus: z.enum(['pending', 'confirmed', 'processing', 'shipped', 'delivered']).default('confirmed'),
      courierName: z.string().trim().max(60).default(''),
      trackingNumber: z.string().trim().max(60).default(''),
      deliveryPerson: z.string().trim().max(80).default(''),
      deliveryPhone: z.string().trim().max(30).default(''),
      manualChannel: z.string().trim().max(40).default(''),
      note: z.string().trim().max(500).default(''),
      deductStock: z.boolean().default(true),
    });
    const data = schema.parse(req.body);

    const settings =
      (await StoreSettings.findOne({ key: 'default' })) || new StoreSettings({ key: 'default' });

    const lines: {
      product: mongoose.Types.ObjectId;
      name: string;
      slug: string;
      brand: string;
      sku: string;
      variantSku?: string;
      variantName?: string;
      image: string;
      unitPrice: number;
      quantity: number;
      subtotal: number;
      previousStock: number;
      newStock: number;
    }[] = [];

    for (const item of data.items) {
      const prod = await Product.findById(item.productId);
      if (!prod || prod.status === 'archived') throw new AppError('One of the selected products no longer exists.', 400);

      const variant = item.variantSku ? prod.variants.find((v) => v.sku === item.variantSku) : undefined;
      if (item.variantSku && !variant) throw new AppError(`Option ${item.variantSku} of ${prod.name} not found.`, 400);

      let previousStock = variant ? variant.stock : prod.stock;
      let newStock = previousStock;
      if (data.deductStock) {
        const filter: Record<string, unknown> = { _id: prod._id, stock: { $gte: item.quantity } };
        const inc: Record<string, number> = { stock: -item.quantity, soldCount: item.quantity };
        if (variant) {
          filter.variants = { $elemMatch: { sku: variant.sku, stock: { $gte: item.quantity } } };
          inc['variants.$.stock'] = -item.quantity;
        }
        const updated = await Product.findOneAndUpdate(filter, { $inc: inc }, { new: true });
        if (!updated) {
          throw new AppError(
            `Not enough stock for ${prod.name}${variant ? ` (${variant.name})` : ''}. Available: ${previousStock}. Untick "Deduct stock" to create it anyway.`,
            409
          );
        }
        deducted.push({ productId: prod._id as mongoose.Types.ObjectId, variantSku: variant?.sku, quantity: item.quantity });
        const afterVar = variant ? updated.variants.find((v) => v.sku === variant.sku) : undefined;
        newStock = afterVar ? afterVar.stock : updated.stock;
      }

      let regular = prod.price;
      let sale = prod.salePrice;
      if (variant) {
        if (variant.price !== undefined && variant.price > 0) regular = variant.price;
        if (variant.salePrice !== undefined) sale = variant.salePrice;
      }
      const listPrice = sale && sale > 0 && sale < regular ? sale : regular;
      const unitPrice = item.unitPrice !== undefined ? item.unitPrice : listPrice;

      lines.push({
        product: prod._id as mongoose.Types.ObjectId,
        name: prod.name,
        slug: prod.slug,
        brand: prod.brand,
        sku: variant ? variant.sku : prod.sku,
        variantSku: variant?.sku,
        variantName: variant?.name,
        image: (variant as any)?.image || prod.mainImage,
        unitPrice,
        quantity: item.quantity,
        subtotal: unitPrice * item.quantity,
        previousStock,
        newStock,
      });
    }

    const subtotal = lines.reduce((s, l) => s + l.subtotal, 0);
    const discountAmount = Math.min(subtotal, data.discountAmount);
    const discounted = subtotal - discountAmount;
    const shippingCost =
      data.shippingCost !== undefined ? data.shippingCost : defaultShippingFor(data.shippingMethod, discounted, settings);
    const totalAmount = discounted + shippingCost;

    const now = new Date();
    const orderNumber = await getNextOrderNumber();
    const requestNumber = orderNumber;
    const approved = data.fulfillmentStatus !== 'pending';
    const delivered = data.fulfillmentStatus === 'delivered';
    const paymentStatus = delivered ? 'paid' : data.paymentStatus;
    const channel = data.manualChannel ? ` via ${data.manualChannel}` : '';

    const order = await Order.create({
      orderNumber,
      requestNumber,
      approvedAt: approved ? now : undefined,
      user: null,
      isGuest: true,
      items: lines.map(({ previousStock: _p, newStock: _n, ...l }) => l),
      shippingAddress: { ...data.customer, country: 'Pakistan' },
      shippingMethod: data.shippingMethod,
      subtotal,
      discountAmount,
      shippingCost,
      taxAmount: 0,
      totalAmount,
      currency: settings.currency,
      paymentMethod: data.paymentMethod,
      paymentStatus,
      paidAt: paymentStatus === 'paid' ? now : undefined,
      fulfillmentStatus: data.fulfillmentStatus,
      shippedAt: ['shipped', 'delivered'].includes(data.fulfillmentStatus) ? now : undefined,
      deliveredAt: delivered ? now : undefined,
      courierName: data.courierName,
      trackingNumber: data.trackingNumber,
      deliveryPerson: data.deliveryPerson,
      deliveryPhone: data.deliveryPhone,
      manualChannel: data.manualChannel,
      inventoryRestored: false,
      orderSource: 'manual',
      statusHistory: [
        {
          status: data.fulfillmentStatus,
          paymentStatus,
          note:
            `Manual order created by ${req.user!.name}${channel} — ${SHIPPING_LABEL[data.shippingMethod]}.` +
            (data.deductStock ? '' : ' Stock not deducted.') +
            (data.note ? ` ${data.note}` : ''),
          updatedBy: req.user!.name,
          timestamp: now,
        },
      ],
    });

    if (data.deductStock) {
      await Promise.all(
        lines.map((l) =>
          StockMovement.create({
            product: l.product,
            sku: l.sku,
            variantSku: l.variantSku,
            type: 'order_placed',
            quantityChange: -l.quantity,
            previousStock: l.previousStock,
            newStock: l.newStock,
            reason: `Manual order ${order.orderNumber} for ${data.customer.fullName}`,
            orderId: order._id,
            orderNumber: order.orderNumber,
            performedBy: req.user!._id,
            performedByName: req.user!.name,
          })
        )
      );
    }

    await logAudit({
      user: req.user,
      action: 'CREATE_MANUAL_ORDER',
      entityType: 'order',
      entityId: String(order._id),
      details: `Manual order ${order.orderNumber} for ${data.customer.fullName} (Rs. ${totalAmount})`,
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, message: `Order ${order.orderNumber} created.`, order });
  } catch (err) {
    // Give back any stock taken before the failure
    for (const d of deducted) {
      try {
        if (d.variantSku) {
          await Product.updateOne(
            { _id: d.productId, 'variants.sku': d.variantSku },
            { $inc: { stock: d.quantity, soldCount: -d.quantity, 'variants.$.stock': d.quantity } }
          );
        } else {
          await Product.updateOne({ _id: d.productId }, { $inc: { stock: d.quantity, soldCount: -d.quantity } });
        }
      } catch {
        // best effort
      }
    }
    next(err);
  }
});

// PUT /api/admin/orders/:id/delivery — change delivery method, charges, rider, address; totals recalculated
router.put('/orders/:id/delivery', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      shippingMethod: z.enum(SHIPPING_METHODS as [string, ...string[]]).optional(),
      shippingCost: z.number().min(0).optional(),
      discountAmount: z.number().min(0).optional(),
      courierName: z.string().trim().max(60).optional(),
      trackingNumber: z.string().trim().max(60).optional(),
      deliveryPerson: z.string().trim().max(80).optional(),
      deliveryPhone: z.string().trim().max(30).optional(),
      address: z
        .object({
          fullName: z.string().trim().min(2).max(80).optional(),
          phone: z.string().trim().min(5).max(30).optional(),
          streetAddress: z.string().trim().max(200).optional(),
          city: z.string().trim().max(60).optional(),
          notes: z.string().trim().max(500).optional(),
        })
        .optional(),
    });
    const data = schema.parse(req.body);
    const order = await Order.findById(req.params.id);
    if (!order) throw new AppError('Order not found.', 404);

    const changes: string[] = [];
    if (data.shippingMethod && data.shippingMethod !== order.shippingMethod) {
      changes.push(`delivery ${SHIPPING_LABEL[order.shippingMethod] || order.shippingMethod} → ${SHIPPING_LABEL[data.shippingMethod]}`);
      order.shippingMethod = data.shippingMethod as typeof order.shippingMethod;
    }
    if (data.shippingCost !== undefined && data.shippingCost !== order.shippingCost) {
      changes.push(`delivery charge Rs. ${order.shippingCost} → Rs. ${data.shippingCost}`);
      order.shippingCost = data.shippingCost;
    }
    if (data.discountAmount !== undefined && data.discountAmount !== order.discountAmount) {
      const d = Math.min(order.subtotal, data.discountAmount);
      changes.push(`discount Rs. ${order.discountAmount} → Rs. ${d}`);
      order.discountAmount = d;
    }
    (['courierName', 'trackingNumber', 'deliveryPerson', 'deliveryPhone'] as const).forEach((k) => {
      const v = data[k];
      if (v !== undefined && v !== (order[k] || '')) {
        changes.push(`${k === 'deliveryPerson' ? 'rider' : k === 'deliveryPhone' ? 'rider phone' : k === 'courierName' ? 'courier' : 'tracking'}: ${v || '—'}`);
        order[k] = v;
      }
    });
    if (data.address) {
      (Object.keys(data.address) as (keyof typeof data.address)[]).forEach((k) => {
        const v = data.address![k];
        if (v !== undefined && v !== order.shippingAddress[k]) {
          (order.shippingAddress as any)[k] = v;
          changes.push(`${k} updated`);
        }
      });
    }
    if (changes.length === 0) {
      res.json({ success: true, message: 'Nothing changed.', order });
      return;
    }

    const prevTotal = order.totalAmount;
    order.totalAmount = Math.max(0, order.subtotal - order.discountAmount) + order.shippingCost + (order.taxAmount || 0);
    if (order.totalAmount !== prevTotal) changes.push(`total Rs. ${prevTotal} → Rs. ${order.totalAmount}`);

    const note = `Delivery adjusted: ${changes.join('; ')}.`;
    order.statusHistory.push({
      status: order.fulfillmentStatus,
      paymentStatus: order.paymentStatus,
      note,
      updatedBy: req.user!.name,
      timestamp: new Date(),
    });
    await order.save();

    await logAudit({
      user: req.user,
      action: 'ADJUST_ORDER_DELIVERY',
      entityType: 'order',
      entityId: String(order._id),
      details: `Order ${order.orderNumber}: ${note}`,
      ipAddress: req.ip,
    });

    res.json({ success: true, message: `Order ${order.orderNumber} updated.`, order });
  } catch (err) {
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
] as const;

// POST /api/admin/orders/:id/whatsapp-log — record a message the admin sent via click-to-chat
router.post('/orders/:id/whatsapp-log', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = z
      .object({
        template: z.enum(WHATSAPP_TEMPLATES),
        message: z.string().min(1).max(4000),
        phone: z.string().min(6).max(30),
      })
      .parse(req.body);

    const entry = {
      ...data,
      sentBy: req.user!.name,
      sentAt: new Date(),
    };

    // $push keeps concurrent sends from overwriting each other
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { $push: { whatsappLog: entry } },
      { new: true }
    );
    if (!order) {
      throw new AppError('Order not found.', 404);
    }

    await logAudit({
      user: req.user,
      action: 'WHATSAPP_MESSAGE_SENT',
      entityType: 'order',
      entityId: String(order._id),
      details: `WhatsApp "${data.template}" message opened for order ${order.orderNumber} (${data.phone})`,
      ipAddress: req.ip,
    });

    res.json({ success: true, order });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/whatsapp/overview — action queue, stats and recent message log
router.get('/whatsapp/overview', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const notSent = (template: string) => ({ 'whatsappLog.template': { $ne: template } });

    const [
      needsConfirmation,
      needsShippingUpdate,
      needsDeliveryNote,
      paymentPending,
      whatsappOrders,
      totalOrders,
      sentTodayAgg,
      recentAgg,
    ] = await Promise.all([
      Order.find({ fulfillmentStatus: 'pending', ...notSent('orderPlaced') })
        .sort({ createdAt: -1 })
        .limit(50),
      Order.find({ fulfillmentStatus: 'shipped', ...notSent('shipped') })
        .sort({ shippedAt: -1 })
        .limit(50),
      Order.find({ fulfillmentStatus: 'delivered', ...notSent('delivered') })
        .sort({ deliveredAt: -1 })
        .limit(50),
      Order.find({
        paymentStatus: 'pending',
        paymentMethod: 'bank_transfer',
        fulfillmentStatus: { $nin: ['cancelled', 'refunded'] },
        ...notSent('paymentReminder'),
      })
        .sort({ createdAt: -1 })
        .limit(50),
      Order.countDocuments({ orderSource: 'whatsapp' }),
      Order.countDocuments({}),
      Order.aggregate([
        { $unwind: '$whatsappLog' },
        { $match: { 'whatsappLog.sentAt': { $gte: startOfToday } } },
        { $count: 'count' },
      ]),
      Order.aggregate([
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
        pendingActions:
          needsConfirmation.length +
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
  } catch (err) {
    next(err);
  }
});

// ==========================================
// D3. PUSH NOTIFICATIONS
// ==========================================
// GET /api/admin/push/stats — how many devices will receive announcements
// POST /api/admin/push/test — send a test push notification to all subscribed admin devices
router.post('/push/test', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!pushEnabled) throw new AppError('Push notifications are not configured on this server.', 503);
    const adminCount = await PushSubscription.countDocuments({ topics: 'admin-orders' });
    if (adminCount === 0) {
      throw new AppError('No admin devices are subscribed yet. Tap "Enable Notifications" on your phone or PC first.', 400);
    }

    const result = await sendToTopic('admin-orders', {
      title: '🚨 New Order! Latest: Mahtab Saghir',
      body: 'Customer: Mahtab Saghir\nTotal: Rs. 350 • Lahore\nOrder #MS-001',
      url: '/admin',
      tag: 'test-admin-push',
      urgent: true,
    });

    res.json({
      success: true,
      message: `Test notification successfully delivered to ${result.sent} device(s)! Check your mobile lock screen or desktop notification banner.`,
      sent: result.sent,
      subscribedDevices: adminCount,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/push/stats', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [newArrivalSubscribers, adminDevices] = await Promise.all([
      PushSubscription.countDocuments({ topics: 'new-arrivals' }),
      PushSubscription.countDocuments({ topics: 'admin-orders' }),
    ]);
    res.json({ success: true, enabled: pushEnabled, newArrivalSubscribers, adminDevices });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/push/new-arrival/:productId — announce a published product to subscribers
router.post('/push/new-arrival/:productId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!pushEnabled) throw new AppError('Notifications are not configured on this server.', 503);
    const product = await Product.findById(req.params.productId);
    if (!product) throw new AppError('Product not found.', 404);
    if (product.status !== 'published') throw new AppError('Publish the product before announcing it.', 400);

    const price = product.salePrice && product.salePrice < product.price ? product.salePrice : product.price;
    const result = await sendToTopic('new-arrivals', {
      title: `New arrival: ${product.name}`,
      body: `${product.brand} • Rs. ${Math.round(price).toLocaleString('en-PK')} — tap to view`,
      url: `/product/${product.slug}`,
      image: product.mainImage,
      tag: `bfs-new-arrival-${product._id}`,
    });

    await logAudit({
      user: req.user,
      action: 'PUSH_NEW_ARRIVAL',
      entityType: 'product',
      entityId: String(product._id),
      details: `Announced "${product.name}" to ${result.sent} subscriber device(s)`,
      ipAddress: req.ip,
    });

    res.json({ success: true, message: `Sent to ${result.sent} device(s).`, ...result });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// E. CUSTOMER MANAGEMENT
// ==========================================
router.get('/customers', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { q, status } = req.query as Record<string, string | undefined>;
    const filter: Record<string, unknown> = {};
    if (status && status !== 'all') {
      filter.status = status;
    }
    if (q && q.trim()) {
      const regex = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ name: regex }, { email: regex }, { phone: regex }];
    }

    const users = await User.find(filter).sort({ createdAt: -1 });
    const orders = await Order.find({
      fulfillmentStatus: { $nin: ['cancelled', 'refunded'] },
    }).select('user shippingAddress.email totalAmount createdAt');

    const spendByUser = new Map<string, { count: number; totalSpend: number }>();
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
  } catch (err) {
    next(err);
  }
});

router.put('/customers/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = z
      .object({ status: z.enum(['active', 'suspended']) })
      .parse(req.body);

    const customer = await User.findById(req.params.id);
    if (!customer) {
      throw new AppError('Customer not found.', 404);
    }
    if (String(customer._id) === String(req.user!._id)) {
      throw new AppError('You cannot suspend your own administrator account.', 400);
    }

    customer.status = status;
    if (status === 'suspended') {
      customer.tokenVersion = (customer.tokenVersion || 0) + 1;
    }
    await customer.save();

    await logAudit({
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
  } catch (err) {
    next(err);
  }
});

// ==========================================
// F. CATEGORY & COLLECTION MANAGEMENT
// ==========================================
const categorySchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().optional(),
  description: z.string().optional().default(''),
  image: z.string().optional().default(''),
  metaTitle: z.string().optional().default(''),
  metaDescription: z.string().optional().default(''),
  displayOrder: z.number().int().optional().default(0),
  isActive: z.boolean().optional().default(true),
});

router.get('/categories', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await Category.find().sort({ displayOrder: 1, name: 1 });
    res.json({ success: true, categories });
  } catch (err) {
    next(err);
  }
});

router.post('/categories', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = categorySchema.parse(req.body);
    const slug = data.slug && data.slug.trim() ? slugify(data.slug) : slugify(data.name);
    const category = await Category.create({ ...data, slug });

    await logAudit({
      user: req.user,
      action: 'CREATE_CATEGORY',
      entityType: 'category',
      entityId: String(category._id),
      details: `Created category "${category.name}"`,
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, message: 'Category created.', category });
  } catch (err) {
    next(err);
  }
});

router.put('/categories/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = categorySchema.partial().parse(req.body);
    if (data.slug) data.slug = slugify(data.slug);
    const category = await Category.findByIdAndUpdate(req.params.id, data, { new: true });
    if (!category) throw new AppError('Category not found.', 404);

    res.json({ success: true, message: 'Category updated.', category });
  } catch (err) {
    next(err);
  }
});

router.delete('/categories/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await Category.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Category deleted.' });
  } catch (err) {
    next(err);
  }
});

const collectionSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().optional(),
  subtitle: z.string().optional().default(''),
  description: z.string().optional().default(''),
  image: z.string().min(1, 'Collection cover image is required'),
  bannerImage: z.string().optional().default(''),
  metaTitle: z.string().optional().default(''),
  metaDescription: z.string().optional().default(''),
  featured: z.boolean().optional().default(true),
  displayOrder: z.number().int().optional().default(0),
  isActive: z.boolean().optional().default(true),
});

router.get('/collections', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const collections = await Collection.find().sort({ displayOrder: 1, name: 1 });
    res.json({ success: true, collections });
  } catch (err) {
    next(err);
  }
});

router.post('/collections', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = collectionSchema.parse(req.body);
    const slug = data.slug && data.slug.trim() ? slugify(data.slug) : slugify(data.name);
    const collection = await Collection.create({ ...data, slug });

    await logAudit({
      user: req.user,
      action: 'CREATE_COLLECTION',
      entityType: 'collection',
      entityId: String(collection._id),
      details: `Created collection "${collection.name}"`,
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, message: 'Collection created.', collection });
  } catch (err) {
    next(err);
  }
});

router.put('/collections/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = collectionSchema.partial().parse(req.body);
    if (data.slug) data.slug = slugify(data.slug);
    const collection = await Collection.findByIdAndUpdate(req.params.id, data, { new: true });
    if (!collection) throw new AppError('Collection not found.', 404);

    res.json({ success: true, message: 'Collection updated.', collection });
  } catch (err) {
    next(err);
  }
});

router.delete('/collections/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await Collection.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Collection deleted.' });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// G. HOMEPAGE & BANNER MANAGEMENT
// ==========================================
router.get('/homepage', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    let homepage = await HomepageContent.findOne({ key: 'default' });
    if (!homepage) {
      homepage = await HomepageContent.create({ key: 'default' });
    }
    res.json({ success: true, homepage });
  } catch (err) {
    next(err);
  }
});

router.put('/homepage', async (req: Request, res: Response, next: NextFunction) => {
  try {
    let homepage = await HomepageContent.findOne({ key: 'default' });
    if (!homepage) {
      homepage = new HomepageContent({ key: 'default' });
    }

    const { announcementBar, carouselSettings, heroSlides, promoBanner, brandStory, sectionVisibility } =
      req.body;

    if (announcementBar) homepage.announcementBar = announcementBar;
    if (carouselSettings) homepage.carouselSettings = carouselSettings;
    if (Array.isArray(heroSlides)) homepage.heroSlides = heroSlides;
    if (promoBanner) homepage.promoBanner = promoBanner;
    if (brandStory) homepage.brandStory = brandStory;
    if (sectionVisibility) homepage.sectionVisibility = sectionVisibility;

    await homepage.save();

    await logAudit({
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
  } catch (err) {
    next(err);
  }
});

// ==========================================
// H. COUPONS & PROMOTIONS
// ==========================================
const couponSchema = z.object({
  code: z.string().min(3, 'Coupon code must be at least 3 characters').max(30),
  description: z.string().optional().default(''),
  discountType: z.enum(['percentage', 'fixed']),
  discountValue: z.number().min(1, 'Discount value must be greater than 0'),
  minOrderAmount: z.number().min(0).default(0),
  maxDiscountAmount: z.number().nullable().optional().default(null),
  startDate: z.string().or(z.date()).optional(),
  expiryDate: z.string().or(z.date()),
  usageLimit: z.number().int().nullable().optional().default(null),
  perCustomerLimit: z.number().int().min(1).default(1),
  isActive: z.boolean().default(true),
});

router.get('/coupons', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.json({ success: true, coupons });
  } catch (err) {
    next(err);
  }
});

router.post('/coupons', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = couponSchema.parse(req.body);
    const coupon = await Coupon.create({
      ...data,
      code: data.code.toUpperCase().trim(),
      startDate: data.startDate ? new Date(data.startDate) : new Date(),
      expiryDate: new Date(data.expiryDate),
    });

    await logAudit({
      user: req.user,
      action: 'CREATE_COUPON',
      entityType: 'coupon',
      entityId: String(coupon._id),
      details: `Created coupon ${coupon.code} (${coupon.discountValue}${
        coupon.discountType === 'percentage' ? '%' : ' PKR'
      })`,
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, message: 'Coupon created.', coupon });
  } catch (err) {
    next(err);
  }
});

router.put('/coupons/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = couponSchema.partial().parse(req.body);
    const updatePayload: Record<string, unknown> = { ...data };
    if (data.code) updatePayload.code = data.code.toUpperCase().trim();
    if (data.expiryDate) updatePayload.expiryDate = new Date(data.expiryDate);
    if (data.startDate) updatePayload.startDate = new Date(data.startDate);

    const coupon = await Coupon.findByIdAndUpdate(req.params.id, updatePayload, { new: true });
    if (!coupon) throw new AppError('Coupon not found.', 404);

    res.json({ success: true, message: 'Coupon updated.', coupon });
  } catch (err) {
    next(err);
  }
});

router.delete('/coupons/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await Coupon.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Coupon deleted.' });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// I. REPORTS, CSV EXPORT, SETTINGS, UPLOADS & AUDIT LOGS
// ==========================================
router.get('/reports', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = req.query as Record<string, string | undefined>;
    const dateFilter: Record<string, unknown> = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) (dateFilter.createdAt as Record<string, Date>).$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        (dateFilter.createdAt as Record<string, Date>).$lte = end;
      }
    }

    const [orders, products, coupons] = await Promise.all([
      Order.find(dateFilter).sort({ createdAt: -1 }),
      Product.find({ status: { $ne: 'archived' } }),
      Coupon.find(),
    ]);

    const statusBreakdown: Record<string, number> = {
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
        } else {
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
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/reports/export/:type — Downloadable CSV reports
router.get('/reports/export/:type', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type } = req.params;
    const escapeCsv = (val: unknown) => {
      const str = String(val ?? '').replace(/"/g, '""');
      return `"${str}"`;
    };

    let csvRows: string[] = [];
    let filename = `msvelora-${type}-${new Date().toISOString().slice(0, 10)}.csv`;

    if (type === 'orders') {
      const orders = await Order.find().sort({ createdAt: -1 });
      csvRows.push(
        ['Order Number', 'Date', 'Customer Name', 'Email', 'Phone', 'City', 'Province', 'Subtotal (PKR)', 'Discount (PKR)', 'Shipping (PKR)', 'Total (PKR)', 'Payment Method', 'Payment Status', 'Fulfillment Status', 'Tracking Number']
          .map(escapeCsv)
          .join(',')
      );
      for (const o of orders) {
        csvRows.push(
          [
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
            .join(',')
        );
      }
    } else if (type === 'inventory' || type === 'products') {
      const products = await Product.find().sort({ sku: 1 });
      csvRows.push(
        ['SKU', 'Name', 'Brand', 'Model', 'Gender', 'Status', 'Stock', 'Low Stock Threshold', 'Sold Count', 'Cost Price (PKR)', 'Retail Price (PKR)', 'Sale Price (PKR)', 'Retail Stock Value (PKR)']
          .map(escapeCsv)
          .join(',')
      );
      for (const p of products) {
        const effective = p.salePrice && p.salePrice > 0 ? p.salePrice : p.price;
        csvRows.push(
          [
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
            .join(',')
        );
      }
    } else {
      throw new AppError('Unsupported export report type.', 400);
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvRows.join('\n'));
  } catch (err) {
    next(err);
  }
});

// GET & PUT /api/admin/settings
router.get('/settings', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    let settings = await StoreSettings.findOne({ key: 'default' });
    if (!settings) {
      settings = await StoreSettings.create({ key: 'default' });
    }
    res.json({ success: true, settings });
  } catch (err) {
    next(err);
  }
});

router.put('/settings', async (req: Request, res: Response, next: NextFunction) => {
  try {
    let settings = await StoreSettings.findOne({ key: 'default' });
    if (!settings) {
      settings = new StoreSettings({ key: 'default' });
    }

    Object.assign(settings, req.body);
    await settings.save();

    await logAudit({
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
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/upload — Safe image upload (Cloudinary or local fallback)
router.post(
  '/upload',
  upload.single('image'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        throw new AppError('No image file provided.', 400);
      }

      if (
        env.CLOUDINARY_CLOUD_NAME &&
        env.CLOUDINARY_API_KEY &&
        env.CLOUDINARY_API_SECRET
      ) {
        cloudinary.config({
          cloud_name: env.CLOUDINARY_CLOUD_NAME,
          api_key: env.CLOUDINARY_API_KEY,
          api_secret: env.CLOUDINARY_API_SECRET,
        });

        const uploaded = await cloudinary.uploader.upload(req.file.path, {
          folder: 'msvelora',
          transformation: [{ quality: 'auto', fetch_format: 'auto' }],
        });

        fs.unlink(req.file.path, () => {});
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
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/admin/audit-logs
router.get('/audit-logs', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, logs });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/reviews
router.get('/reviews', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const reviews = await Review.find()
      .populate('product', 'name slug sku mainImage')
      .sort({ createdAt: -1 });
    res.json({ success: true, reviews });
  } catch (err) {
    next(err);
  }
});

export default router;

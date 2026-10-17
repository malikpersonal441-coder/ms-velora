"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const crypto_1 = __importDefault(require("crypto"));
const mongoose_1 = __importDefault(require("mongoose"));
const zod_1 = require("zod");
const Product_1 = require("../models/Product");
const Order_1 = require("../models/Order");
const push_1 = require("../utils/push");
const Cart_1 = require("../models/Cart");
const StockMovement_1 = require("../models/StockMovement");
const StoreSettings_1 = require("../models/StoreSettings");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const helpers_1 = require("../utils/helpers");
const env_1 = require("../config/env");
const router = (0, express_1.Router)();
const cartItemInputSchema = zod_1.z.object({
    productId: zod_1.z.string().min(1),
    variantSku: zod_1.z.string().optional(),
    quantity: zod_1.z.number().int().min(1).max(20),
});
const validateCartSchema = zod_1.z.object({
    items: zod_1.z.array(cartItemInputSchema),
    couponCode: zod_1.z.string().optional(),
    shippingMethod: zod_1.z.enum(['standard', 'express']).optional().default('standard'),
    email: zod_1.z.string().email().optional(),
});
const createOrderSchema = zod_1.z.object({
    idempotencyKey: zod_1.z.string().min(6).max(120).optional(),
    items: zod_1.z.array(cartItemInputSchema).min(1, 'Your shopping bag cannot be empty'),
    shippingAddress: zod_1.z.object({
        fullName: zod_1.z.string().min(2, 'Full name is required'),
        email: zod_1.z.string().email('Valid email address is required'),
        phone: zod_1.z
            .string()
            // Accept any common spacing: 0301-7713866, +92 300 0000000, 92 301 7713866…
            .transform((v) => v.replace(/[\s()-]/g, ''))
            .refine((v) => /^(\+92|0092|92|0)?3\d{9}$/.test(v), 'Please enter a valid Pakistani mobile number (e.g., 0300 1234567 or +92 300 1234567)'),
        streetAddress: zod_1.z.string().min(5, 'Complete street delivery address is required'),
        city: zod_1.z.string().min(2, 'City is required'),
        province: zod_1.z.string().min(2, 'Province / Region is required'),
        postalCode: zod_1.z.string().min(4, 'Postal code is required'),
        country: zod_1.z.string().default('Pakistan'),
        notes: zod_1.z.string().max(500).optional().default(''),
    }),
    shippingMethod: zod_1.z.enum(['standard', 'express']).default('standard'),
    // 'online' = JazzCash / EasyPaisa transfer; customer sends the screenshot on WhatsApp
    paymentMethod: zod_1.z.enum(['cod', 'bank_transfer', 'online', 'jazzcash', 'easypaisa']).default('cod'),
    couponCode: zod_1.z.string().optional(),
    orderSource: zod_1.z.enum(['website', 'whatsapp']).default('website'),
});
// POST /api/cart/validate — Server-side cart price, stock, shipping, and coupon validation
router.post('/cart/validate', auth_1.optionalAuth, async (req, res, next) => {
    try {
        const data = validateCartSchema.parse(req.body);
        let settings = await StoreSettings_1.StoreSettings.findOne({ key: 'default' });
        if (!settings) {
            settings = await StoreSettings_1.StoreSettings.create({ key: 'default' });
        }
        const validatedItems = [];
        let subtotal = 0;
        for (const reqItem of data.items) {
            if (!mongoose_1.default.isValidObjectId(reqItem.productId))
                continue;
            const product = await Product_1.Product.findOne({
                _id: reqItem.productId,
                status: 'published',
            });
            if (!product)
                continue;
            let unitRegular = product.price;
            let unitSale = product.salePrice;
            let availableStock = product.stock;
            let image = product.mainImage;
            let sku = product.sku;
            let variantName;
            if (reqItem.variantSku && product.variants && product.variants.length > 0) {
                const v = product.variants.find((vr) => vr.sku === reqItem.variantSku);
                if (v) {
                    if (v.price !== undefined && v.price > 0)
                        unitRegular = v.price;
                    if (v.salePrice !== undefined)
                        unitSale = v.salePrice;
                    availableStock = v.stock;
                    if (v.image)
                        image = v.image;
                    sku = v.sku;
                    variantName = v.name;
                }
            }
            const effectivePrice = unitSale && unitSale > 0 && unitSale < unitRegular ? unitSale : unitRegular;
            const cappedQty = Math.min(reqItem.quantity, Math.max(0, availableStock));
            const lineSubtotal = effectivePrice * cappedQty;
            subtotal += lineSubtotal;
            validatedItems.push({
                productId: String(product._id),
                name: product.name,
                slug: product.slug,
                brand: product.brand,
                sku,
                variantSku: reqItem.variantSku,
                variantName,
                image,
                price: unitRegular,
                salePrice: unitSale,
                effectivePrice,
                requestedQuantity: reqItem.quantity,
                quantity: cappedQty,
                availableStock,
                subtotal: lineSubtotal,
                categoryId: product.category ? String(product.category) : undefined,
                stockWarning: availableStock === 0
                    ? 'Currently out of stock'
                    : reqItem.quantity > availableStock
                        ? `Only ${availableStock} unit(s) available in stock`
                        : undefined,
            });
        }
        // Evaluate coupon if provided
        let discountAmount = 0;
        let couponMessage = '';
        let couponValid = false;
        if (data.couponCode && data.couponCode.trim() && subtotal > 0) {
            const couponEval = await (0, helpers_1.evaluateCoupon)({
                code: data.couponCode,
                subtotal,
                userId: req.user ? String(req.user._id) : undefined,
                userEmail: req.user?.email || data.email,
                items: validatedItems.map((i) => ({
                    productId: i.productId,
                    categoryId: i.categoryId,
                    lineTotal: i.subtotal,
                })),
            });
            couponValid = couponEval.valid;
            discountAmount = couponEval.discountAmount;
            couponMessage = couponEval.message;
        }
        const discountedSubtotal = Math.max(0, subtotal - discountAmount);
        let shippingCost = 0;
        if (subtotal > 0) {
            if (data.shippingMethod === 'express') {
                shippingCost = settings.expressShippingFee;
            }
            else {
                shippingCost =
                    discountedSubtotal >= settings.freeShippingThreshold ? 0 : settings.standardShippingFee;
            }
        }
        const taxAmount = settings.taxPercentage > 0
            ? Math.round((discountedSubtotal * settings.taxPercentage) / 100)
            : 0;
        const totalAmount = discountedSubtotal + shippingCost + taxAmount;
        // Persist cart for authenticated user
        if (req.user) {
            await Cart_1.Cart.findOneAndUpdate({ user: req.user._id }, {
                user: req.user._id,
                items: validatedItems
                    .filter((i) => i.quantity > 0)
                    .map((i) => ({
                    product: new mongoose_1.default.Types.ObjectId(i.productId),
                    variantSku: i.variantSku,
                    quantity: i.quantity,
                })),
                couponCode: couponValid ? data.couponCode?.toUpperCase() : undefined,
            }, { upsert: true, new: true });
        }
        res.json({
            success: true,
            items: validatedItems,
            summary: {
                subtotal,
                discountAmount,
                couponCode: couponValid ? data.couponCode?.trim().toUpperCase() : null,
                couponValid,
                couponMessage,
                shippingCost,
                freeShippingThreshold: settings.freeShippingThreshold,
                taxAmount,
                totalAmount,
                currency: settings.currency,
                currencySymbol: settings.currencySymbol,
            },
        });
    }
    catch (err) {
        next(err);
    }
});
// POST /api/coupons/validate
router.post('/coupons/validate', auth_1.optionalAuth, async (req, res, next) => {
    try {
        const schema = zod_1.z.object({
            code: zod_1.z.string().min(1, 'Coupon code is required'),
            subtotal: zod_1.z.number().min(0),
            email: zod_1.z.string().email().optional(),
        });
        const { code, subtotal, email } = schema.parse(req.body);
        const result = await (0, helpers_1.evaluateCoupon)({
            code,
            subtotal,
            userId: req.user ? String(req.user._id) : undefined,
            userEmail: req.user?.email || email,
        });
        if (!result.valid) {
            res.status(400).json({
                success: false,
                valid: false,
                message: result.message,
                discountAmount: 0,
            });
            return;
        }
        res.json({
            success: true,
            valid: true,
            code: result.coupon?.code,
            discountType: result.coupon?.discountType,
            discountValue: result.coupon?.discountValue,
            discountAmount: result.discountAmount,
            message: result.message,
        });
    }
    catch (err) {
        next(err);
    }
});
// POST /api/orders — Secure order creation with atomic inventory deduction & idempotency
router.post('/orders', auth_1.optionalAuth, async (req, res, next) => {
    const deductedRecords = [];
    try {
        const data = createOrderSchema.parse(req.body);
        // 1. Check idempotency key to prevent duplicate orders on retry/double-click
        if (data.idempotencyKey) {
            const existingOrder = await Order_1.Order.findOne({ idempotencyKey: data.idempotencyKey });
            if (existingOrder) {
                res.status(200).json({
                    success: true,
                    duplicatePrevented: true,
                    message: 'Order already processed.',
                    order: existingOrder,
                });
                return;
            }
        }
        let settings = await StoreSettings_1.StoreSettings.findOne({ key: 'default' });
        if (!settings) {
            settings = await StoreSettings_1.StoreSettings.create({ key: 'default' });
        }
        if (!req.user && !settings.allowGuestCheckout) {
            throw new errorHandler_1.AppError('Please sign in to your account to complete checkout.', 401);
        }
        if (data.paymentMethod === 'cod' && !settings.enableCod) {
            throw new errorHandler_1.AppError('Cash on Delivery is currently disabled.', 400);
        }
        if (data.paymentMethod === 'bank_transfer' && !settings.enableBankTransfer) {
            throw new errorHandler_1.AppError('Bank transfer is currently disabled.', 400);
        }
        if (data.paymentMethod === 'online' &&
            !settings.mobileWallets?.jazzcash?.enabled &&
            !settings.mobileWallets?.easypaisa?.enabled) {
            throw new errorHandler_1.AppError('Online payment is currently unavailable.', 400);
        }
        if ((data.paymentMethod === 'jazzcash' || data.paymentMethod === 'easypaisa') &&
            !settings.mobileWallets?.[data.paymentMethod]?.enabled) {
            throw new errorHandler_1.AppError(`${data.paymentMethod === 'jazzcash' ? 'JazzCash' : 'EasyPaisa'} is currently unavailable.`, 400);
        }
        // 2. Verify all products and atomically deduct stock to prevent concurrent overselling
        const orderItems = [];
        let subtotal = 0;
        for (const item of data.items) {
            if (!mongoose_1.default.isValidObjectId(item.productId)) {
                throw new errorHandler_1.AppError('Invalid product identifier in cart.', 400);
            }
            let updatedProduct = null;
            let previousStock = 0;
            let newStock = 0;
            if (item.variantSku) {
                // Atomic deduction for both variant stock and total product stock
                const beforeDoc = await Product_1.Product.findOne({
                    _id: item.productId,
                    status: 'published',
                    'variants.sku': item.variantSku,
                });
                if (!beforeDoc) {
                    throw new errorHandler_1.AppError(`Product option ${item.variantSku} is no longer available.`, 400);
                }
                const targetVar = beforeDoc.variants.find((v) => v.sku === item.variantSku);
                if (!targetVar || targetVar.stock < item.quantity) {
                    throw new errorHandler_1.AppError(`Insufficient stock for ${beforeDoc.name} (${targetVar?.name || item.variantSku}). Available: ${targetVar?.stock || 0}.`, 400);
                }
                previousStock = targetVar.stock;
                updatedProduct = await Product_1.Product.findOneAndUpdate({
                    _id: item.productId,
                    status: 'published',
                    stock: { $gte: item.quantity },
                    variants: { $elemMatch: { sku: item.variantSku, stock: { $gte: item.quantity } } },
                }, {
                    $inc: {
                        stock: -item.quantity,
                        soldCount: item.quantity,
                        'variants.$.stock': -item.quantity,
                    },
                }, { new: true });
                if (!updatedProduct) {
                    throw new errorHandler_1.AppError(`Insufficient stock for ${beforeDoc.name}. Another customer may have just purchased the remaining piece.`, 409);
                }
                const afterVar = updatedProduct.variants.find((v) => v.sku === item.variantSku);
                newStock = afterVar ? afterVar.stock : previousStock - item.quantity;
            }
            else {
                const beforeDoc = await Product_1.Product.findOne({
                    _id: item.productId,
                    status: 'published',
                });
                if (!beforeDoc) {
                    throw new errorHandler_1.AppError('One or more selected items are no longer available.', 400);
                }
                if (beforeDoc.stock < item.quantity) {
                    throw new errorHandler_1.AppError(`Insufficient stock for ${beforeDoc.name}. Only ${beforeDoc.stock} unit(s) available.`, 400);
                }
                previousStock = beforeDoc.stock;
                updatedProduct = await Product_1.Product.findOneAndUpdate({
                    _id: item.productId,
                    status: 'published',
                    stock: { $gte: item.quantity },
                }, {
                    $inc: {
                        stock: -item.quantity,
                        soldCount: item.quantity,
                    },
                }, { new: true });
                if (!updatedProduct) {
                    throw new errorHandler_1.AppError(`Insufficient stock for ${beforeDoc.name}. Another customer just purchased the last available unit.`, 409);
                }
                newStock = updatedProduct.stock;
            }
            deductedRecords.push({
                productId: updatedProduct._id,
                variantSku: item.variantSku,
                quantity: item.quantity,
            });
            let unitRegular = updatedProduct.price;
            let unitSale = updatedProduct.salePrice;
            let image = updatedProduct.mainImage;
            let sku = updatedProduct.sku;
            let variantName;
            if (item.variantSku) {
                const v = updatedProduct.variants.find((vr) => vr.sku === item.variantSku);
                if (v) {
                    if (v.price !== undefined && v.price > 0)
                        unitRegular = v.price;
                    if (v.salePrice !== undefined)
                        unitSale = v.salePrice;
                    if (v.image)
                        image = v.image;
                    sku = v.sku;
                    variantName = v.name;
                }
            }
            const unitPrice = unitSale && unitSale > 0 && unitSale < unitRegular ? unitSale : unitRegular;
            const lineSubtotal = unitPrice * item.quantity;
            subtotal += lineSubtotal;
            orderItems.push({
                product: updatedProduct._id,
                name: updatedProduct.name,
                slug: updatedProduct.slug,
                brand: updatedProduct.brand,
                sku,
                variantSku: item.variantSku,
                variantName,
                image,
                unitPrice,
                quantity: item.quantity,
                subtotal: lineSubtotal,
                categoryId: updatedProduct.category ? String(updatedProduct.category) : undefined,
                previousStock,
                newStock,
            });
        }
        // 3. Validate coupon on server if provided
        let discountAmount = 0;
        let appliedCouponCode;
        if (data.couponCode && data.couponCode.trim()) {
            const couponResult = await (0, helpers_1.evaluateCoupon)({
                code: data.couponCode,
                subtotal,
                userId: req.user ? String(req.user._id) : undefined,
                userEmail: data.shippingAddress.email,
                items: orderItems.map((i) => ({
                    productId: String(i.product),
                    categoryId: i.categoryId,
                    lineTotal: i.subtotal,
                })),
            });
            if (!couponResult.valid) {
                throw new errorHandler_1.AppError(couponResult.message, 400);
            }
            discountAmount = couponResult.discountAmount;
            appliedCouponCode = couponResult.coupon?.code;
            if (couponResult.coupon) {
                couponResult.coupon.usedCount += 1;
                couponResult.coupon.usedByUsers.push({
                    userId: req.user?._id,
                    email: data.shippingAddress.email.toLowerCase(),
                    usedAt: new Date(),
                });
                await couponResult.coupon.save();
            }
        }
        const discountedSubtotal = Math.max(0, subtotal - discountAmount);
        const shippingCost = data.shippingMethod === 'express'
            ? settings.expressShippingFee
            : discountedSubtotal >= settings.freeShippingThreshold
                ? 0
                : settings.standardShippingFee;
        const taxAmount = settings.taxPercentage > 0
            ? Math.round((discountedSubtotal * settings.taxPercentage) / 100)
            : 0;
        const totalAmount = discountedSubtotal + shippingCost + taxAmount;
        const orderNumber = (0, helpers_1.generateOrderNumber)();
        const order = await Order_1.Order.create({
            orderNumber,
            requestNumber: orderNumber,
            idempotencyKey: data.idempotencyKey || undefined,
            user: req.user ? req.user._id : null,
            isGuest: !req.user,
            items: orderItems.map((i) => ({
                product: i.product,
                name: i.name,
                slug: i.slug,
                brand: i.brand,
                sku: i.sku,
                variantSku: i.variantSku,
                variantName: i.variantName,
                image: i.image,
                unitPrice: i.unitPrice,
                quantity: i.quantity,
                subtotal: i.subtotal,
            })),
            shippingAddress: data.shippingAddress,
            shippingMethod: data.shippingMethod,
            subtotal,
            discountAmount,
            couponCode: appliedCouponCode,
            shippingCost,
            taxAmount,
            totalAmount,
            currency: settings.currency,
            paymentMethod: data.paymentMethod,
            paymentStatus: 'pending',
            fulfillmentStatus: 'pending',
            inventoryRestored: false,
            orderSource: data.orderSource,
            statusHistory: [
                {
                    status: 'pending',
                    paymentStatus: 'pending',
                    note: `Order placed via ${data.paymentMethod === 'cod'
                        ? 'Cash on Delivery'
                        : data.paymentMethod === 'online'
                            ? 'Online Payment — JazzCash / EasyPaisa (awaiting payment screenshot)'
                            : data.paymentMethod === 'jazzcash'
                                ? 'JazzCash (awaiting payment screenshot)'
                                : data.paymentMethod === 'easypaisa'
                                    ? 'EasyPaisa (awaiting payment screenshot)'
                                    : 'Direct Bank Transfer'}${data.orderSource === 'whatsapp' ? ' Customer chose to confirm via WhatsApp.' : ''}`,
                    updatedBy: data.shippingAddress.fullName,
                    timestamp: new Date(),
                },
            ],
        });
        // 4. Record auditable StockMovement entries for every line item
        await Promise.all(orderItems.map((i) => StockMovement_1.StockMovement.create({
            product: i.product,
            sku: i.sku,
            variantSku: i.variantSku,
            type: 'order_placed',
            quantityChange: -i.quantity,
            previousStock: i.previousStock,
            newStock: i.newStock,
            reason: `Order ${order.orderNumber} placed by ${data.shippingAddress.fullName}`,
            orderId: order._id,
            orderNumber: order.orderNumber,
            performedBy: req.user?._id,
            performedByName: data.shippingAddress.fullName,
        })));
        // Alert the admin's devices (phone/desktop) — never blocks or fails the order
        void (0, push_1.sendToTopic)('admin-orders', {
            title: `New order ${order.orderNumber}`,
            body: `${data.shippingAddress.fullName} • ${data.shippingAddress.city} • Rs. ${Math.round(totalAmount).toLocaleString('en-PK')}`,
            url: '/admin',
            tag: 'bfs-new-order',
        });
        // Clear server cart if user is authenticated
        if (req.user) {
            await Cart_1.Cart.findOneAndDelete({ user: req.user._id });
        }
        // Generate a signed checkout token for online payment simulation/verification
        let paymentCheckoutSignature;
        res.status(201).json({
            success: true,
            message: `Order received. Reference ${order.orderNumber} — we will confirm it shortly.`,
            order,
            paymentCheckoutSignature,
        });
    }
    catch (err) {
        // Rollback any stock deductions if an error occurred mid-order
        if (deductedRecords.length > 0) {
            for (const rec of deductedRecords) {
                try {
                    if (rec.variantSku) {
                        await Product_1.Product.findOneAndUpdate({ _id: rec.productId, 'variants.sku': rec.variantSku }, {
                            $inc: {
                                stock: rec.quantity,
                                soldCount: -rec.quantity,
                                'variants.$.stock': rec.quantity,
                            },
                        });
                    }
                    else {
                        await Product_1.Product.findByIdAndUpdate(rec.productId, {
                            $inc: { stock: rec.quantity, soldCount: -rec.quantity },
                        });
                    }
                }
                catch (rollbackErr) {
                    console.error('[Stock Rollback Error]:', rollbackErr);
                }
            }
        }
        next(err);
    }
});
// GET /api/orders/my-orders — Authenticated customer's order history
router.get('/orders/my-orders', auth_1.requireAuth, async (req, res, next) => {
    try {
        const orders = await Order_1.Order.find({
            $or: [{ user: req.user._id }, { 'shippingAddress.email': req.user.email.toLowerCase() }],
        }).sort({ createdAt: -1 });
        res.json({
            success: true,
            orders,
        });
    }
    catch (err) {
        next(err);
    }
});
// GET /api/orders/track/:orderNumber — Public order tracking & confirmation lookup
router.get('/orders/track/:orderNumber', auth_1.optionalAuth, async (req, res, next) => {
    try {
        const orderNumber = String(req.params.orderNumber).toUpperCase().trim();
        // Internal admin↔customer message history is never exposed on the public tracking page
        // Customers may hold either the checkout reference (REQ-…) or the approved number (MS-…)
        const order = await Order_1.Order.findOne({ $or: [{ orderNumber }, { requestNumber: orderNumber }] }).select('-whatsappLog');
        if (!order) {
            throw new errorHandler_1.AppError(`No order found with reference number ${orderNumber}.`, 404);
        }
        res.json({
            success: true,
            order,
        });
    }
    catch (err) {
        next(err);
    }
});
// POST /api/orders/webhooks/payment — Verified payment webhook handler
router.post('/orders/webhooks/payment', async (req, res, next) => {
    try {
        const schema = zod_1.z.object({
            orderNumber: zod_1.z.string(),
            amount: zod_1.z.number(),
            paymentReference: zod_1.z.string(),
            signature: zod_1.z.string(),
        });
        const { orderNumber, amount, paymentReference, signature } = schema.parse(req.body);
        const ref = orderNumber.toUpperCase();
        const order = await Order_1.Order.findOne({ $or: [{ orderNumber: ref }, { requestNumber: ref }] });
        if (!order) {
            throw new errorHandler_1.AppError('Order not found.', 404);
        }
        const expectedSignature = crypto_1.default
            .createHmac('sha256', env_1.env.PAYMENT_WEBHOOK_SECRET)
            .update(`${order.requestNumber || order.orderNumber}:${order.totalAmount}`)
            .digest('hex');
        if (signature !== expectedSignature || amount !== order.totalAmount) {
            throw new errorHandler_1.AppError('Webhook signature verification failed.', 401);
        }
        if (order.paymentStatus !== 'paid') {
            order.paymentStatus = 'paid';
            order.paymentReference = paymentReference;
            order.paidAt = new Date();
            if (order.fulfillmentStatus === 'pending') {
                order.fulfillmentStatus = 'confirmed';
            }
            order.statusHistory.push({
                status: order.fulfillmentStatus,
                paymentStatus: 'paid',
                note: `Online payment verified (Ref: ${paymentReference}).`,
                updatedBy: 'Payment Gateway Webhook',
                timestamp: new Date(),
            });
            await order.save();
        }
        res.json({
            success: true,
            message: 'Payment verified and recorded.',
            order,
        });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;

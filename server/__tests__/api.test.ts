import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../app';
import { env } from '../config/env';
import { connectDatabase, disconnectDatabase } from '../config/db';
import { seedDatabase } from '../seed/seedData';
import { Product } from '../models/Product';
import { StockMovement } from '../models/StockMovement';
import { slugify, generateSku } from '../utils/helpers';

describe('MS Velora — Automated Unit & Integration Test Suite', () => {
  let adminCookie: string[] = [];
  let customerCookie: string[] = [];
  let testProductId = '';
  let testProductSlug = '';
  let testProductSku = '';

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.ALLOW_CUSTOMER_SIGNUP = 'true';
    await connectDatabase();
    await seedDatabase(true);
  }, 60000);

  afterAll(async () => {
    await disconnectDatabase();
  });

  describe('1. Unit Tests — Business Logic Helpers', () => {
    it('generates clean SEO-friendly slugs and valid SKUs', () => {
      expect(slugify('Aurora Pearl Drop Necklace!')).toBe('aurora-pearl-drop-necklace');
      const sku = generateSku('MS Velora', 'Aurelius');
      expect(sku).toMatch(/^MSV-AURE-[A-F0-9]{4}$/);
    });
  });

  describe('2. Authentication & Role-Based Access Control (RBAC)', () => {
    it('blocks unauthenticated access to /api/admin/overview with 401', async () => {
      const res = await request(app).get('/api/admin/overview');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('registers a new customer and blocks customer access to /api/admin/* with 403', async () => {
      const regRes = await request(app).post('/api/auth/register').send({
        name: 'Hamza Tariq',
        email: 'hamza.test@msvelora.pk',
        phone: '03001122334',
        password: 'SecurePassword123!',
      });

      expect(regRes.status).toBe(201);
      expect(regRes.body.user.role).toBe('customer');
      const cookies = regRes.headers['set-cookie'];
      expect(cookies).toBeDefined();
      customerCookie = Array.isArray(cookies) ? cookies : [cookies];

      // Attempt to access admin endpoint as customer
      const adminAttempt = await request(app)
        .get('/api/admin/overview')
        .set('Cookie', customerCookie);
      expect(adminAttempt.status).toBe(403);
      expect(adminAttempt.body.message).toContain('Administrator privileges');
    });

    it('signs in as seeded administrator and accesses /api/admin/overview', async () => {
      const loginRes = await request(app).post('/api/auth/login').send({
        email: env.ADMIN_EMAIL,
        password: env.ADMIN_PASSWORD,
      });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.user.role).toBe('admin');
      const cookies = loginRes.headers['set-cookie'];
      adminCookie = Array.isArray(cookies) ? cookies : [cookies];

      const overviewRes = await request(app)
        .get('/api/admin/overview')
        .set('Cookie', adminCookie);

      expect(overviewRes.status).toBe(200);
      expect(overviewRes.body.success).toBe(true);
      expect(overviewRes.body.metrics.totalProducts).toBeGreaterThanOrEqual(12);
    });
  });

  describe('3. Storefront Catalog, Filtering, Search & SEO', () => {
    it('returns filtered products, facets, and pagination from MongoDB', async () => {
      const res = await request(app).get(
        '/api/products?movement=Necklace&inStock=true&sort=price_asc'
      );
      expect(res.status).toBe(200);
      expect(res.body.products.length).toBeGreaterThan(0);
      expect(res.body.facets.brands.length).toBeGreaterThan(0);

      for (const p of res.body.products) {
        expect(p.specifications.movement).toBe('Necklace');
        expect(p.stock).toBeGreaterThan(0);
      }

      testProductId = res.body.products[0]._id;
      testProductSlug = res.body.products[0].slug;
      testProductSku = res.body.products[0].sku;
    });

    it('serves product details by slug along with reviews and related products', async () => {
      const res = await request(app).get(`/api/products/${testProductSlug}`);
      expect(res.status).toBe(200);
      expect(res.body.product.slug).toBe(testProductSlug);
      expect(Array.isArray(res.body.relatedProducts)).toBe(true);
    });

    it('serves valid XML sitemap and robots.txt disallowing /admin and /account', async () => {
      const [sitemapRes, robotsRes] = await Promise.all([
        request(app).get('/sitemap.xml'),
        request(app).get('/robots.txt'),
      ]);
      expect(sitemapRes.status).toBe(200);
      expect(sitemapRes.text).toContain('<urlset');
      expect(sitemapRes.text).toContain(`/product/${testProductSlug}`);

      expect(robotsRes.status).toBe(200);
      expect(robotsRes.text).toContain('Disallow: /admin');
      expect(robotsRes.text).toContain('Disallow: /account');
    });
  });

  describe('4. Inventory Management & Auditable Stock Movements', () => {
    it('prevents negative stock reduction and records auditable StockMovement on valid adjustment', async () => {
      // Attempt reduction larger than stock
      const failRes = await request(app)
        .post('/api/admin/inventory/adjust')
        .set('Cookie', adminCookie)
        .send({
          productId: testProductId,
          adjustmentType: 'reduction',
          quantity: 99999,
          reason: 'Testing negative stock guard',
        });

      expect(failRes.status).toBe(400);
      expect(failRes.body.message).toContain('negative stock is prohibited');

      // Perform valid restock addition
      const beforeProd = await Product.findById(testProductId);
      const addRes = await request(app)
        .post('/api/admin/inventory/adjust')
        .set('Cookie', adminCookie)
        .send({
          productId: testProductId,
          adjustmentType: 'addition',
          quantity: 5,
          reason: 'Jewellery batch restock verification',
        });

      expect(addRes.status).toBe(200);
      expect(addRes.body.product.stock).toBe((beforeProd?.stock || 0) + 5);

      const movement = await StockMovement.findOne({
        product: testProductId,
        reason: 'Jewellery batch restock verification',
      });
      expect(movement).not.toBeNull();
      expect(movement?.quantityChange).toBe(5);
    });
  });

  describe('5. Checkout Price Integrity, Idempotency, Concurrency & Order Cancellation', () => {
    let createdOrderId = '';
    let createdOrderNumber = '';

    it('calculates authoritative server-side prices and applies coupon ROYAL10 accurately', async () => {
      // Seeded jewellery is "price on request" (0), so give the test product a real price
      await Product.findByIdAndUpdate(testProductId, { $set: { price: 50000 } });
      const prod = await Product.findById(testProductId);
      const expectedUnit =
        prod!.salePrice && prod!.salePrice > 0 ? prod!.salePrice : prod!.price;
      const stockBeforeOrder = prod!.stock;

      const idempotencyKey = `test-idem-${Date.now()}`;

      const orderPayload = {
        idempotencyKey,
        items: [{ productId: testProductId, quantity: 2 }],
        shippingAddress: {
          fullName: 'Hamza Tariq',
          email: 'hamza.test@msvelora.pk',
          phone: '0300 1122334',
          streetAddress: 'House 10, Street 4, F-7/3',
          city: 'Islamabad',
          province: 'Islamabad Capital Territory',
          postalCode: '44000',
          country: 'Pakistan',
        },
        shippingMethod: 'standard',
        paymentMethod: 'cod',
        couponCode: 'ROYAL10',
        // Attempt to inject tampered client total (should be completely ignored by server!)
        totalAmount: 1,
        subtotal: 1,
      };

      const orderRes = await request(app)
        .post('/api/orders')
        .set('Cookie', customerCookie)
        .send(orderPayload);

      expect(orderRes.status).toBe(201);
      const order = orderRes.body.order;
      createdOrderId = order._id;
      createdOrderNumber = order.orderNumber;

      const expectedSubtotal = expectedUnit * 2;
      const expectedDiscount = Math.min(10000, Math.round(expectedSubtotal * 0.1));
      expect(order.subtotal).toBe(expectedSubtotal);
      expect(order.discountAmount).toBe(expectedDiscount);
      expect(order.totalAmount).toBeGreaterThan(10000);

      // Verify stock was deducted by 2
      const prodAfter = await Product.findById(testProductId);
      expect(prodAfter!.stock).toBe(stockBeforeOrder - 2);

      // Send duplicate request with same idempotencyKey — must NOT deduct stock again!
      const dupRes = await request(app)
        .post('/api/orders')
        .set('Cookie', customerCookie)
        .send(orderPayload);

      expect(dupRes.status).toBe(200);
      expect(dupRes.body.duplicatePrevented).toBe(true);
      expect(dupRes.body.order.orderNumber).toBe(createdOrderNumber);

      const prodAfterDup = await Product.findById(testProductId);
      expect(prodAfterDup!.stock).toBe(stockBeforeOrder - 2);
    });

    it('restores stock once and only once when an order is cancelled', async () => {
      const prodBeforeCancel = await Product.findById(testProductId);
      const stockBeforeCancel = prodBeforeCancel!.stock;

      const cancelRes = await request(app)
        .put(`/api/admin/orders/${createdOrderId}/status`)
        .set('Cookie', adminCookie)
        .send({
          fulfillmentStatus: 'cancelled',
          note: 'Customer requested cancellation prior to dispatch',
        });

      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.order.inventoryRestored).toBe(true);

      const prodAfterCancel = await Product.findById(testProductId);
      expect(prodAfterCancel!.stock).toBe(stockBeforeCancel + 2);

      // Attempt a second cancellation / refund update — stock must NOT be restored a second time!
      const secondUpdate = await request(app)
        .put(`/api/admin/orders/${createdOrderId}/status`)
        .set('Cookie', adminCookie)
        .send({
          fulfillmentStatus: 'refunded',
          paymentStatus: 'refunded',
        });

      expect(secondUpdate.status).toBe(200);
      const prodAfterSecond = await Product.findById(testProductId);
      expect(prodAfterSecond!.stock).toBe(stockBeforeCancel + 2);
    });

    it('prevents concurrent overselling when multiple requests compete for the last unit in stock', async () => {
      // Set a product's stock to exactly 1
      await Product.findByIdAndUpdate(testProductId, { $set: { stock: 1 } });

      const makeOrderReq = (idx: number) =>
        request(app)
          .post('/api/orders')
          .send({
            idempotencyKey: `concurrent-${Date.now()}-${idx}`,
            items: [{ productId: testProductId, quantity: 1 }],
            shippingAddress: {
              fullName: `Buyer ${idx}`,
              email: `buyer${idx}@example.com`,
              phone: '0321 9988776',
              streetAddress: 'Plot 55, Gulberg III',
              city: 'Lahore',
              province: 'Punjab',
              postalCode: '54000',
            },
            shippingMethod: 'standard',
            paymentMethod: 'cod',
          });

      const [res1, res2] = await Promise.all([makeOrderReq(1), makeOrderReq(2)]);
      const statuses = [res1.status, res2.status].sort();

      // Exactly one request must succeed (201) and the other must fail (400 or 409)
      expect(statuses[0]).toBe(201);
      expect([400, 409]).toContain(statuses[1]);

      const finalProd = await Product.findById(testProductId);
      expect(finalProd!.stock).toBe(0);
    });
  });
});

# MS Velora — REST API Documentation

All API routes are prefixed with `/api` and return JSON responses in the format `{ success: boolean, message?: string, ... }`.
State-changing requests (`POST`, `PUT`, `PATCH`, `DELETE`) are protected by CSRF origin/header validation (`X-Requested-With: MSVelora-Client`), NoSQL operator sanitization, Zod schema validation, and HTTP-only cookie authentication (`bfs_auth_token`).

---

## 1. Authentication & Customer Account (`/api/auth`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Register a new customer account (`name`, `email`, `phone`, `password`). Sets HTTP-only `bfs_auth_token` cookie. |
| `POST` | `/api/auth/login` | Public | Authenticate customer or admin (`email`, `password`). Sets HTTP-only cookie. |
| `POST` | `/api/auth/logout` | Public | Clear authentication cookie. |
| `GET` | `/api/auth/me` | Authenticated | Return current user profile and populated wishlist products. |
| `PUT` | `/api/auth/profile` | Authenticated | Update user `name` and `phone`. |
| `POST` | `/api/auth/addresses` | Authenticated | Add a saved delivery address to user profile. |
| `PUT` | `/api/auth/addresses/:addressId` | Authenticated | Update a saved delivery address or set it as default. |
| `DELETE` | `/api/auth/addresses/:addressId` | Authenticated | Delete a saved delivery address. |
| `PUT` | `/api/auth/password` | Authenticated | Change password (`currentPassword`, `newPassword`) and increment `tokenVersion` to revoke other sessions. |
| `POST` | `/api/auth/invalidate-sessions` | Authenticated | Increment `tokenVersion` to sign out all other devices. |
| `POST` | `/api/auth/forgot-password` | Public | Generate a SHA-256 password recovery token (`email`). |
| `POST` | `/api/auth/reset-password` | Public | Reset password with valid `token` and `newPassword`. |
| `POST` | `/api/auth/wishlist/:productId` | Authenticated | Toggle a product in the authenticated user's wishlist. |

---

## 2. Products, Reviews & Public Content (`/api/products`, `/api/content`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/products` | Public | Search, filter, sort, and paginate products. Supports query params: `q`, `brand`, `category`, `collection`, `gender`, `movement`, `strapMaterial`, `dialColor`, `minPrice`, `maxPrice`, `inStock`, `onSale`, `featured`, `bestSeller`, `newArrival`, `sort` (`featured`, `newest`, `price_asc`, `price_desc`, `popularity`, `rating`), `page`, `limit`. Also returns dynamic `facets`. |
| `GET` | `/api/products/:slug` | Public | Fetch full product details by slug (or ID), approved reviews, and related products. |
| `POST` | `/api/products/:productId/reviews` | Authenticated | Submit or update a product review (`rating`, `title`, `comment`). Automatically sets `verifiedPurchase: true` if user has ordered the product. |
| `GET` | `/api/content/storefront` | Public | Fetch consolidated homepage CMS content, store settings, active categories, collections, best sellers, new arrivals, and verified reviews. |
| `GET` | `/api/content/collections/:slug` | Public | Fetch collection metadata and published products in that collection. |
| `POST` | `/api/content/newsletter` | Public | Subscribe an email address to the collector newsletter. |
| `GET` | `/sitemap.xml` | Public | Dynamic XML sitemap of all public pages, collections, and published products. |
| `GET` | `/robots.txt` | Public | Search crawler directives disallowing `/admin` and `/account`. |

---

## 3. Cart, Coupons & Orders (`/api/cart`, `/api/coupons`, `/api/orders`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/cart/validate` | Public / Auth | Validate cart items against live MongoDB prices, sale discounts, available stock, shipping rules, and coupon codes. |
| `POST` | `/api/coupons/validate` | Public / Auth | Validate a promotional coupon code (`code`, `subtotal`). |
| `POST` | `/api/orders` | Public / Auth | Create an order with server-side price calculation, coupon validation, `idempotencyKey` duplicate protection, atomic stock deduction, and `StockMovement` logging. |
| `GET` | `/api/orders/my-orders` | Authenticated | List orders belonging to the signed-in customer. |
| `GET` | `/api/orders/track/:orderNumber` | Public | Track an order by its reference number (e.g. `BFS-261010-A101`). |
| `POST` | `/api/orders/webhooks/payment` | Webhook | HMAC-SHA256 signature-verified payment confirmation endpoint. |

---

## 4. Admin Dashboard Endpoints (`/api/admin/*`)
*All `/api/admin/*` endpoints enforce both `requireAuth` and `requireAdmin` (`role === 'admin'`).*

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/admin/overview` | Revenue KPIs (paid vs pending vs cancelled), order counts, 14-day sales trend, recent orders, best sellers, and low-stock/out-of-stock alerts. |
| `GET` | `/api/admin/products` | Paginated admin product list with search and status/stock filters. |
| `POST` | `/api/admin/products` | Create a new jewellery product and initial `StockMovement` entry. |
| `PUT` | `/api/admin/products/:id` | Update a jewellery product, specifications, gallery, or variants. |
| `DELETE` | `/api/admin/products/:id` | Archive (`?permanent=false`) or permanently delete (`?permanent=true`) a product. |
| `POST` | `/api/admin/products/bulk` | Bulk publish, draft, archive, or delete multiple products. |
| `GET` | `/api/admin/inventory` | View stock balances and recent `StockMovement` audit history. |
| `POST` | `/api/admin/inventory/adjust` | Perform an auditable stock addition, reduction, or exact count adjustment with a mandatory `reason`. |
| `GET` | `/api/admin/orders` | Search and filter all customer orders. |
| `PUT` | `/api/admin/orders/:id/status` | Update fulfillment status, payment status, courier, and tracking number. Automatically restores stock once when transitioning to `cancelled` or `refunded`. |
| `GET` | `/api/admin/customers` | List customers with order counts and total spend. |
| `PUT` | `/api/admin/customers/:id/status` | Activate or suspend a customer account (revoking active sessions). |
| `GET/POST/PUT/DELETE` | `/api/admin/categories` & `/api/admin/collections` | Full CRUD for categories and collections. |
| `GET/PUT` | `/api/admin/homepage` | Manage hero carousel slides, announcement bar, promo banner, brand story, and section visibility. |
| `GET/POST/PUT/DELETE` | `/api/admin/coupons` | Full CRUD for promotional discount coupons. |
| `GET` | `/api/admin/reports` | Sales summary, status breakdown, inventory cost/retail valuation, and coupon usage. |
| `GET` | `/api/admin/reports/export/:type` | Download CSV exports for `orders` or `inventory`. |
| `GET/PUT` | `/api/admin/settings` | Manage store currency, shipping fees, payment toggles, contact info, and policies. |
| `POST` | `/api/admin/upload` | Safe image upload (`jpg/png/webp/avif`, max 5MB) to Cloudinary or local `/uploads`. |
| `GET` | `/api/admin/audit-logs` | View chronological security audit trail of administrative operations. |

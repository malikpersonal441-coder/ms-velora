# MS Velora — Database Architecture & Mongoose Models Documentation

MS Velora uses **MongoDB Atlas** with **Mongoose** (`backend/src/models/`) for strongly typed schema definitions, compound and text indexing, and auditable inventory and order state management.

---

## 1. `User` (`backend/src/models/User.ts`)
Stores customer and administrator accounts, saved Pakistani delivery addresses, wishlist references, and session security version counters.

| Field | Type | Constraints / Indexes | Description |
|---|---|---|---|
| `name` | `String` | `required`, `maxlength: 100` | Full name of customer or administrator |
| `email` | `String` | `required`, `unique`, `lowercase`, `index` | Unique login email |
| `phone` | `String` | `trim` | Pakistani or international contact phone |
| `passwordHash` | `String` | `required`, `select: false` | Bcrypt 12-round password hash |
| `role` | `'customer' \| 'admin'` | `index`, default `'customer'` | Server-enforced RBAC role |
| `status` | `'active' \| 'suspended'` | `index`, default `'active'` | Account status |
| `tokenVersion` | `Number` | default `0` | Incremented on password change/reset or session revocation to invalidate older JWTs immediately |
| `addresses` | `ISavedAddress[]` | Embedded subdocuments | Saved delivery addresses (`label`, `fullName`, `phone`, `streetAddress`, `city`, `province`, `postalCode`, `country`, `isDefault`) |
| `wishlist` | `ObjectId[]` | `ref: 'Product'` | Saved wishlist products |

---

## 2. `Product` (`backend/src/models/Product.ts`)
Stores jewellery catalog items, specifications, variants, pricing, cost valuation, and real-time stock quantities.

| Field | Type | Constraints / Indexes | Description |
|---|---|---|---|
| `name` | `String` | `required`, `index`, `text` | Full product title |
| `slug` | `String` | `required`, `unique`, `index` | SEO-friendly URL slug |
| `brand` | `String` | `required`, `index`, `text` | Brand name |
| `model` | `String` | `required`, `text` | Model reference code |
| `sku` | `String` | `required`, `unique`, `uppercase`, `index` | Unique Stock Keeping Unit |
| `category` | `ObjectId` | `ref: 'Category'`, `index` | Primary jewellery category |
| `collections` | `ObjectId[]` | `ref: 'Collection'`, `index` | Assigned curated collections |
| `gender` | `'Men' \| 'Women' \| 'Unisex'` | `index` | Target fit |
| `price` | `Number` | `required`, `min: 0`, `index` | Regular retail price in PKR |
| `salePrice` | `Number \| null` | `min: 0` | Promotional sale price when applicable |
| `costPrice` | `Number` | `min: 0` | Unit acquisition cost for admin inventory valuation reports |
| `mainImage` | `String` | `required` | Primary product image URL |
| `images` | `IProductImage[]` | `{ url, alt, isMain }[]` | Gallery images |
| `specifications` | `IProductSpecifications` | Indexed sub-fields | `movement`, `caseMaterial`, `caseDiameter`, `caseThickness`, `strapMaterial`, `strapWidth`, `dialColor`, `crystal`, `waterResistance`, `warranty`, `origin` |
| `variants` | `IProductVariant[]` | `{ sku, name, dialColor, strapMaterial, price, salePrice, stock, image }` | Configurable product options |
| `stock` | `Number` | `required`, `min: 0`, `index` | Current available stock (protected against negative values) |
| `lowStockThreshold` | `Number` | default `5` | Triggers admin low-stock alerts |
| `soldCount` | `Number` | default `0`, `index` | Total units sold |
| `status` | `'published' \| 'draft' \| 'archived'` | `index` | Visibility status |
| `featured`, `bestSeller`, `newArrival` | `Boolean` | `index` | Merchandising flags |
| `averageRating`, `reviewCount` | `Number` | `0–5` | Dynamically calculated from approved `Review` documents |

---

## 3. `StockMovement` (`backend/src/models/StockMovement.ts`)
Immutable audit ledger recording every stock addition, reduction, manual adjustment, order deduction, and cancellation restoration.

| Field | Type | Description |
|---|---|---|
| `product` | `ObjectId` (`ref: 'Product'`) | Target product |
| `sku` / `variantSku` | `String` | SKU of product/variant |
| `type` | `'addition' \| 'reduction' \| 'order_placed' \| 'order_cancelled' \| 'manual_adjustment' \| 'initial_seed'` | Movement classification |
| `quantityChange` | `Number` | Signed delta (`+5`, `-2`, etc.) |
| `previousStock` / `newStock` | `Number` | Stock balance before and after the operation |
| `reason` | `String` | Mandatory explanation or order reference |
| `orderId` / `orderNumber` | `ObjectId` / `String` | Associated order when triggered by checkout or cancellation |
| `performedBy` / `performedByName` | `ObjectId` / `String` | Administrator or customer who triggered the change |

---

## 4. `Order` (`backend/src/models/Order.ts`)
Stores customer orders, itemized price snapshots, shipping details, payment status, and chronological fulfillment history.

| Field | Type | Constraints / Indexes | Description |
|---|---|---|---|
| `orderNumber` | `String` | `required`, `unique`, `index` | Human-readable reference (e.g., `BFS-261010-A101`) |
| `idempotencyKey` | `String` | `unique`, `sparse`, `index` | Prevents duplicate orders on network retry or double-click |
| `user` | `ObjectId \| null` | `ref: 'User'`, `index` | Linked customer account (or `null` for guest checkout) |
| `items` | `IOrderItem[]` | Required | Snapshot of purchased items, SKUs, unit prices, and quantities |
| `shippingAddress` | `IShippingAddress` | Required | Recipient name, email, Pakistani phone, street, city, province, postalCode |
| `subtotal`, `discountAmount`, `shippingCost`, `taxAmount`, `totalAmount` | `Number` | Server-calculated | Authoritative financial breakdown in PKR |
| `paymentMethod` | `'cod' \| 'online_card' \| 'bank_transfer'` | Required | Chosen payment method |
| `paymentStatus` | `'pending' \| 'paid' \| 'failed' \| 'refunded'` | `index` | Payment lifecycle state |
| `fulfillmentStatus` | `'pending' \| 'confirmed' \| 'processing' \| 'shipped' \| 'delivered' \| 'cancelled' \| 'refunded'` | `index` | Fulfillment lifecycle state |
| `inventoryRestored` | `Boolean` | default `false` | Guards against restoring stock more than once when an order is cancelled/refunded |
| `statusHistory` | `IOrderStatusHistory[]` | Chronological array | Audit log of every status transition, note, and actor |

---

## 5. Supporting Models
- **`Category` (`Category.ts`)** & **`Collection` (`Collection.ts`)**: Unique `slug`, `name`, `subtitle`, `description`, `image`, `bannerImage`, `metaTitle`, `metaDescription`, `featured`, `displayOrder`, `isActive`.
- **`Coupon` (`Coupon.ts`)**: Unique uppercase `code`, `discountType` (`percentage` | `fixed`), `discountValue`, `minOrderAmount`, `maxDiscountAmount`, `startDate`, `expiryDate`, `usageLimit`, `usedCount`, `perCustomerLimit`, `usedByUsers`.
- **`Review` (`Review.ts`)**: Compound unique index `{ product: 1, user: 1 }`, `rating` (1–5), `title`, `comment`, `verifiedPurchase` (automatically set to `true` when matched against a real customer `Order`), `status`.
- **`HomepageContent` (`HomepageContent.ts`)**: Admin-editable `announcementBar`, `carouselSettings`, `heroSlides`, `promoBanner`, `brandStory`, and `sectionVisibility`.
- **`StoreSettings` (`StoreSettings.ts`)**: Configurable `currency`, `standardShippingFee`, `expressShippingFee`, `freeShippingThreshold`, `allowGuestCheckout`, payment method toggles, showroom contact details, and legal policy texts.
- **`AuditLog` (`AuditLog.ts`)**: Tracks sensitive administrative actions (`CREATE_PRODUCT`, `INVENTORY_ADJUSTMENT`, `UPDATE_ORDER_STATUS`, `UPDATE_CUSTOMER_STATUS`, `UPDATE_HOMEPAGE_CMS`, etc.).

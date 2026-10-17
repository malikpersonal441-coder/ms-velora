# MS Velora — Fine Jewellery for Women
## Complete Full-Stack Jewellery E-Commerce Platform with Admin Executive Console

MS Velora is a modern, production-quality e-commerce platform for women's jewellery — necklaces, earrings, rings, bangles and bridal sets. It delivers an elegant shopping experience paired with reliable inventory management, server-side price integrity, and a powerful role-based administrative dashboard.

---

## 1. Key Highlights & Features

### Luxury Storefront & UI/UX Experience
- **Luxury Visual Identity**: Built on a palette of Matte Black (`#0D0D0D`), Ivory White (`#FAF8F5`), Charcoal Grey (`#1A1A1E`), and Champagne Gold (`#C5A059`). Elegant serif headings (*Cormorant Garamond*) paired with clean modern sans-serif body typography (*Plus Jakarta Sans*) and monospace pricing/SKU accents (*JetBrains Mono*).
- **Rotating Announcement Bar**: Configurable promotional offers, new arrivals, and privilege announcements with rotating intervals.
- **Hero Carousel with LCP Optimization**:
  - Full-width hero carousel featuring multiple promotional slides with separate desktop and mobile image support.
  - Automatic slide rotation with configurable interval timing.
  - Automatic pause on user hover or interaction.
  - Manual navigation arrows, pagination progress indicators, and mobile touch/swipe gestures.
  - **LCP Fetch Priority Optimization**: Employs `fetchpriority="high"` on the initial candidate slide, and `fetchpriority="low" loading="lazy"` on background slides in accordance with modern web best practices.
- **Featured Collections**: Curated collections (*Everyday Elegance*, *Bridal Couture*, *Pearl Edit*, *Festive Glow*, *Gift Picks*, *New Arrivals*) with subtle image zoom and hover reveals.
- **Best Sellers & New Arrivals**: Real-time product feeds queried from MongoDB Atlas, complete with quick view, wishlist, and add-to-bag actions.
- **Editorial Brand Story**: Highlight cards illustrating MS Velora's hand-checked quality and plating warranty.
- **Genuine Verified Reviews**: Displays reviews associated strictly with verified purchases from the database (never hardcoded or fabricated).
- **Newsletter Subscription**: Zod-validated collector journal subscription.

### Shop & Product Catalog
- **Multi-Faceted Database Filtering**: Real-time query filtering by price range, brand/maison, category, collection, jewellery type (*Necklace*, *Earrings*, *Ring*, *Bracelet*, *Bangles*, *Bridal Set*), finish, colour, and availability (*In Stock*, *On Sale*, *Best Seller*, *New Arrival*).
- **Dynamic Sorting & Pagination**: Sort by featured curation, newest arrivals, popularity (sold count), price ascending/descending, and customer rating.
- **Active Filter Chips**: One-click removal and "Clear All Filters" controls.
- **Mobile Filter Drawer**: Responsive touch-friendly filter sidebar for small screens.

### Comprehensive Product Details Page
- **High-Resolution Gallery & Lightbox Zoom**: Large interactive product gallery with full-screen zoom lightbox for inspecting stone settings and finish.
- **Specifications Table**: Type, metal, size, weight, colour, stones, finish, closure, care, warranty, and origin.
- **Configurable Variants**: Dynamic edition and strap selection with SKU, stock, and price override support.
- **Inventory Enforcement**: Quantity selection is strictly capped at available vault inventory to prevent overselling.
- **Buy Now & Add to Bag**: Instant checkout shortcut or slide-over drawer addition.
- **Customer Review Submission**: Verified buyer badge automatically granted when the customer has an eligible completed order.
- **SEO Schema.org Markup**: Dynamic `Schema.org/Product` JSON-LD structured data and Open Graph tags.

### Shopping Bag, Checkout & Order Lifecycle
- **Server-Side Price & Stock Integrity**: Prices, promotional discounts, and inventory balances are validated authoritatively on the Express server.
- **Slide-Over Bag Drawer & Full Bag Page**: Free shipping progress indicator, quantity adjustments, and coupon code application.
- **Pakistan-Ready Checkout**:
  - Pakistani mobile number validation (`03xx xxxxxxx` or `+92 3xx xxxxxxx`).
  - Province selection (*Punjab*, *Sindh*, *Islamabad Capital Territory*, *Khyber Pakhtunkhwa*, *Balochistan*, *Gilgit-Baltistan*, *Azad Jammu & Kashmir*), City, Street Address, Postal Code.
  - Payment methods: **Cash on Delivery (COD)**, **Online Card Payment** (SafePay / Visa / Mastercard webhook-ready integration without storing raw card details), and **Direct Bank / IBFT Transfer**.
  - **Duplicate Order Protection**: Server-enforced `idempotencyKey` prevents double charges or duplicate orders on network retries.
  - **Overselling Prevention**: Atomic conditional inventory deductions ensure stock can never drop below zero during concurrent checkout spikes.
- **Order Confirmation & Printable Invoice**: Itemized receipt, fulfillment status, and browser print-ready invoice.
- **Public Order Tracking**: Lookup any order by its reference number (`MS-001`) to inspect real-time courier partner tracking and chronological fulfillment milestones.

### Customer Account Portal
- Customer registration and login with secure HTTP-only cookies.
- Profile management and address book (add, edit, delete, set default).
- Order history with chronological status timeline.
- Wishlist management.
- Security controls: Password change and "Revoke Other Device Sessions" via `tokenVersion` session invalidation.

### Complete Administrative Dashboard (`/admin`)
- **Server-Enforced Role-Based Access Control**: Admin routes and APIs strictly require `role === 'admin'`.
- **Overview & KPIs**: Paid revenue clearly distinguished from pending or cancelled orders, total order count, inventory alerts (low-stock and out-of-stock), 14-day sales trend visualization, and top-selling jewellery.
- **Product Management**: Full CRUD, slug/SKU auto-generation, multi-image upload manager, jewellery specifications editor, variant configurator, merchandising flags, live preview, and bulk actions (*Publish*, *Draft*, *Archive*, *Delete*).
- **Auditable Inventory Ledger**: Real-time stock counts, low-stock threshold alerts, manual stock adjustments (*Addition*, *Reduction*, *Set Exact*) with mandatory audit reasons, and an immutable `StockMovement` history log.
- **Order Management & Invoicing**: Strict state transitions (*pending* → *confirmed* → *processing* → *shipped* → *delivered* → *cancelled* / *refunded*), courier tracking recording, and single-execution inventory restoration protection when orders are cancelled or refunded.
- **Customer Management**: Customer profiles, order volume, total spend, and account activation/suspension toggles.
- **Catalog Management**: Category and Collection CRUD with cover images, descriptions, and display ordering.
- **Homepage & Carousel CMS**: Full visual editor for hero slides, announcement bar messages, and promotional banners without touching code.
- **Coupons & Promotions**: Percentage or fixed PKR discounts, start/expiry dates, minimum order amounts, max discount caps, and usage limits.
- **Reports & Downloadable CSV Exports**: Financial and inventory cost/retail valuation reports with downloadable CSV exports for orders, inventory, and products.
- **Store Configuration**: Editable currency, shipping rates, free shipping thresholds, payment method toggles, showroom contact details, and policies.
- **Security Audit Logs**: Chronological log of administrative actions.

---

## 2. Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, Vite 6, TypeScript |
| **Styling** | Tailwind CSS v4, Custom CSS luxury variables |
| **Animations** | Framer Motion (respecting `prefers-reduced-motion`) |
| **Icons** | Lucide React |
| **Routing** | React Router v7 with route-level code splitting (`React.lazy` + `Suspense`) |
| **Form Validation** | Zod (on both client and server) |
| **Backend** | Node.js, Express.js, TypeScript (`tsx` in dev, `tsc` in production) |
| **Database** | MongoDB Atlas with Mongoose (with embedded `mongodb-memory-server` fallback for zero-config local dev & automated testing) |
| **Authentication** | JWT stored in secure HTTP-only cookies (`bfs_auth_token`), server-side `tokenVersion` session validation |
| **Image Storage** | Cloudinary integration with local disk upload fallback |
| **Testing** | Vitest, Supertest |

---

## 3. Project Architecture

```
msvelora/
├── package.json               # Root monorepo workspace scripts
├── .gitignore
├── backend/                   # Node.js & Express REST Backend
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   ├── .env                   # Local development secrets
│   └── src/
│       ├── server.ts          # Server entry point & DB bootstrap
│       ├── app.ts             # Express application & middleware setup
│       ├── config/            # DB connection & environment configuration
│       ├── models/            # Mongoose schemas (User, Product, Order, etc.)
│       ├── middleware/        # Auth, RBAC, CSRF, NoSQL sanitization, Rate limiters, Error handling
│       ├── routes/            # Modular API routes (auth, products, content, orders, admin)
│       ├── seed/              # Jewellery seed data & CLI runner
│       ├── utils/             # Helpers (slugify, SKU, orderNumber, audit logger, coupon evaluator)
│       └── __tests__/         # Vitest & Supertest automated integration tests
├── frontend/                  # React + Vite TypeScript Frontend
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts         # Vite configuration with API proxy
│   ├── vercel.json            # Vercel deployment rewrites
│   ├── index.html             # Google Fonts, luxury favicon, meta tags
│   └── src/
│       ├── main.tsx           # React entry point
│       ├── App.tsx            # Routes, layout shell, drawers, code-splitting
│       ├── index.css          # Tailwind CSS v4 & luxury theme variables
│       ├── types/             # TypeScript interfaces
│       ├── lib/               # Typed API client & formatting helpers
│       ├── context/           # StoreContext (Auth, Cart, Wishlist, Notifications)
│       ├── components/        # Reusable UI components (Navbar, HeroCarousel, ProductCard, etc.)
│       └── pages/             # Storefront and Admin pages
└── docs/                      # Database & API Documentation
    ├── API.md
    └── DATABASE.md
```

---

## 4. Getting Started & Local Installation

### Prerequisites
- Node.js (v18 or higher recommended; developed on Node v24)
- npm (v9+)

### Installation
Run the root script to install dependencies for both backend and frontend:

```bash
npm run install:all
```

Or install them individually:
```bash
cd backend && npm install
cd ../frontend && npm install
```

---

## 5. Environment Configuration

### Backend (`backend/.env`)
Copy `backend/.env.example` to `backend/.env`:

```env
PORT=5001
NODE_ENV=development
FRONTEND_URL=http://localhost:5174

# MongoDB Atlas Connection URI
# Set your MongoDB Atlas cluster URI:
# MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/msvelora?retryWrites=true&w=majority
# (When left empty in local dev, the backend automatically boots an embedded MongoDB instance and seeds initial data)
MONGODB_URI=

# Authentication Secret
JWT_SECRET=<random 64+ character string — generate your own>
JWT_EXPIRES_IN=7d
COOKIE_SECURE=false

# Cloudinary Image Storage (Optional - falls back to local /uploads in development)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Payment Gateway Configuration
PAYMENT_PROVIDER=safepay
PAYMENT_API_KEY=
PAYMENT_WEBHOOK_SECRET=<random string>

# Default Administrator Account for Seed Script
ADMIN_EMAIL=admin@msvelora.pk
ADMIN_PASSWORD=<your own strong password>
```

### Frontend (`frontend/.env`)
Copy `frontend/.env.example` to `frontend/.env`:

```env
# Leave blank in development to leverage the Vite proxy (/api -> http://localhost:5001/api)
VITE_API_URL=
VITE_SITE_URL=http://localhost:5174
```

---

## 6. Seed Accounts & Credentials

The seed script automatically populates the following demonstration accounts:

| Role | Email | Password | Access |
|---|---|---|---|
| **Store Admin** | `admin@msvelora.pk` | set via `ADMIN_PASSWORD` in `backend/.env` | Full Admin Console (`/admin`) & Storefront |

*Tip: The Sign In page (`/login`) includes quick one-click buttons to automatically fill either account for rapid testing.*

### Active Promotional Codes
- `ROYAL10` — 10% privilege discount on orders above Rs. 20,000 (Max discount Rs. 10,000).


- `COLLECTOR15` — 15% VIP collector discount on orders above Rs. 75,000.

---

## 7. Running the Application

### Running Both Backend and Frontend in Development

1. **Start the backend server** (Terminal 1):
   ```bash
   npm run dev:backend
   ```
   *The server starts on `http://localhost:5001` and automatically connects to MongoDB Atlas or embedded local MongoDB, seeding initial catalog data if empty.*

2. **Start the frontend application** (Terminal 2):
   ```bash
   npm run dev:frontend
   ```
   *Vite starts the luxury storefront on `http://localhost:5174` with proxying to the backend API.*

3. Open your browser and navigate to `http://localhost:5174`.

---

## 8. Database Seeding & Resetting

To manually re-seed or reset the database catalog with 12 jewellery pieces, 6 collections and categories:

```bash
npm run seed
```

---

## 9. Automated Testing

To run the automated Vitest and Supertest suite:

```bash
npm run test
```

The test suite exercises:
1. **Business Logic Unit Tests**: Slugification, SKU generation, and coupon logic.
2. **Authentication & RBAC Tests**: Verifies unauthenticated users receive `401 Unauthorized` and standard customers receive `403 Forbidden` on admin endpoints.
3. **Catalog & SEO Integration Tests**: Tests multi-faceted filtering, sorting, product details, XML sitemaps, and `robots.txt`.
4. **Auditable Inventory Tests**: Verifies negative stock reduction is strictly blocked and `StockMovement` ledger entries are recorded.
5. **Checkout Price Integrity & Concurrency**: Tests that client price tampering is rejected, duplicate requests via `idempotencyKey` do not re-deduct stock, single-execution stock restoration on order cancellation works properly, and concurrent requests for low-stock items prevent overselling.

---

## 10. Production Deployment

### Frontend Deployment (Vercel)
1. Link your repository to **Vercel**.
2. Set the Root Directory to `frontend`.
3. Set the Framework Preset to `Vite`.
4. Add the environment variable `VITE_API_URL` pointing to your hosted Node.js backend (e.g. `https://api.msvelora.pk`).
5. `frontend/vercel.json` ensures all client-side routes rewrite seamlessly to `/index.html`.

### Backend Deployment (Render, Railway, or VPS)
1. Set the Root Directory to `backend`.
2. Build Command: `npm install && npm run build`
3. Start Command: `npm start`
4. Configure the environment variables in your hosting dashboard:
   - `NODE_ENV=production`
   - `PORT=5001`
   - `FRONTEND_URL=https://msvelora.pk`
   - `MONGODB_URI=mongodb+srv://...` (Your MongoDB Atlas connection string)
   - `JWT_SECRET=your_production_64_byte_random_secret`
   - `COOKIE_SECURE=true`
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
   - `PAYMENT_WEBHOOK_SECRET`

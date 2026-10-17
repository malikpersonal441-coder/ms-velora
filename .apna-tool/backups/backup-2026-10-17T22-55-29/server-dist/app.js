"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const path_1 = __importDefault(require("path"));
const env_1 = require("./config/env");
const security_1 = require("./middleware/security");
const errorHandler_1 = require("./middleware/errorHandler");
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const productRoutes_1 = __importDefault(require("./routes/productRoutes"));
const contentRoutes_1 = __importStar(require("./routes/contentRoutes"));
const cartOrderRoutes_1 = __importDefault(require("./routes/cartOrderRoutes"));
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
const pushRoutes_1 = __importDefault(require("./routes/pushRoutes"));
const app = (0, express_1.default)();
// Trust reverse proxy (Vercel, AWS Lambda, Cloudflare)
app.set('trust proxy', 1);
// Security headers
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
// CORS with credentials support
app.use((0, cors_1.default)({
    origin: (requestOrigin, callback) => {
        if (!requestOrigin)
            return callback(null, true);
        const allowedOrigins = [
            env_1.env.FRONTEND_URL,
            'http://localhost:5174',
            'http://127.0.0.1:5174',
            'http://localhost:5001',
        ];
        if (allowedOrigins.includes(requestOrigin) ||
            requestOrigin.endsWith('.vercel.app') ||
            (process.env.VERCEL_URL && requestOrigin.includes(process.env.VERCEL_URL))) {
            return callback(null, true);
        }
        return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));
app.use(express_1.default.json({ limit: '2mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '2mb' }));
app.use((0, cookie_parser_1.default)());
// NoSQL injection sanitization & CSRF origin verification
app.use(security_1.sanitizeNoSqlInjection);
app.use(security_1.csrfProtection);
app.use('/api', security_1.apiRateLimiter);
// Serve local uploaded images
app.use('/uploads', express_1.default.static(path_1.default.resolve(__dirname, '../uploads')));
// SEO Sitemap & Robots
app.get('/sitemap.xml', contentRoutes_1.handleSitemap);
app.get('/robots.txt', contentRoutes_1.handleRobots);
// Health check
app.get('/api/health', (_req, res) => {
    res.json({
        success: true,
        service: 'MS Velora API',
        status: 'operational',
        timestamp: new Date().toISOString(),
    });
});
// Mount API modular routes
app.use('/api/auth', authRoutes_1.default);
app.use('/api/products', productRoutes_1.default);
app.use('/api/content', contentRoutes_1.default);
app.use('/api', cartOrderRoutes_1.default);
app.use('/api/push', pushRoutes_1.default);
app.use('/api/admin', adminRoutes_1.default);
// 404 handler for unknown API routes
app.use('/api/*', (_req, res) => {
    res.status(404).json({
        success: false,
        message: 'API endpoint not found.',
    });
});
// Centralized Error Handler
app.use(errorHandler_1.errorHandler);
exports.default = app;

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../.env') });
exports.env = {
    PORT: parseInt(process.env.PORT || '5001', 10),
    NODE_ENV: process.env.NODE_ENV || 'development',
    FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5174',
    MONGODB_URI: process.env.MONGODB_URI || '',
    JWT_SECRET: process.env.JWT_SECRET || 'bfs_dev_jwt_secret_key_99887766554433221100_msvelora_jewellery',
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
    COOKIE_SECURE: process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production',
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '',
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || '',
    PAYMENT_PROVIDER: process.env.PAYMENT_PROVIDER || 'safepay',
    PAYMENT_API_KEY: process.env.PAYMENT_API_KEY || '',
    PAYMENT_WEBHOOK_SECRET: process.env.PAYMENT_WEBHOOK_SECRET || 'bfs_dev_webhook_secret_2026',
    ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@msvelora.pk',
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'Admin@MsVelora2026!',
};
// The fallback JWT secret is public (it's in this file and the README).
const DEFAULT_JWT_SECRET = 'bfs_dev_jwt_secret_key_99887766554433221100_msvelora_jewellery';
if (exports.env.MONGODB_URI && (exports.env.JWT_SECRET === DEFAULT_JWT_SECRET || exports.env.JWT_SECRET.length < 32)) {
    console.warn('[Security Warning] JWT_SECRET is missing, too short, or using the default key. Please configure a 64+ char JWT_SECRET in your Vercel / environment variables.');
}

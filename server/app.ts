import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { UploadedMedia } from './models/UploadedMedia';
import { env } from './config/env';
import {
  sanitizeNoSqlInjection,
  csrfProtection,
  apiRateLimiter,
} from './middleware/security';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/authRoutes';
import productRoutes from './routes/productRoutes';
import contentRoutes, { handleSitemap, handleRobots } from './routes/contentRoutes';
import cartOrderRoutes from './routes/cartOrderRoutes';
import adminRoutes from './routes/adminRoutes';
import pushRoutes from './routes/pushRoutes';

const app = express();

// Trust reverse proxy (Vercel, AWS Lambda, Cloudflare)
app.set('trust proxy', 1);

// Security headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS with credentials support
app.use(
  cors({
    origin: (requestOrigin, callback) => {
      if (!requestOrigin) return callback(null, true);
      const allowedOrigins = [
        env.FRONTEND_URL,
        'http://localhost:5174',
        'http://127.0.0.1:5174',
        'http://localhost:5001',
      ];
      if (
        allowedOrigins.includes(requestOrigin) ||
        requestOrigin.endsWith('.vercel.app') ||
        (process.env.VERCEL_URL && requestOrigin.includes(process.env.VERCEL_URL))
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  }) as any
);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser());

// NoSQL injection sanitization & CSRF origin verification
app.use(sanitizeNoSqlInjection);
app.use(csrfProtection);
app.use('/api', apiRateLimiter);

// Serve local uploaded images
const serveUploadedImage = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const rawFilename = Array.isArray(req.params.filename) ? req.params.filename[0] : req.params.filename;
    if (!rawFilename) return next();
    const filename = path.basename(String(rawFilename));

    // 1. Try local disk first (for local dev speed)
    const localPath = path.resolve(__dirname, '../uploads', filename);
    if (fs.existsSync(localPath)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      return res.sendFile(localPath);
    }

    // Also check os.tmpdir() in case serverless wrote there
    const tmpPath = path.join(os.tmpdir(), 'msvelora-uploads', filename);
    if (fs.existsSync(tmpPath)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      return res.sendFile(tmpPath);
    }

    // 2. Query MongoDB UploadedMedia (works 100% everywhere, even on Vercel)
    const media = await UploadedMedia.findOne({ filename });
    if (media && media.data) {
      res.setHeader('Content-Type', media.contentType || 'image/webp');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.setHeader('Content-Length', media.data.length);
      return res.send(media.data);
    }

    return res.status(404).send('Image not found');
  } catch (err) {
    next(err);
  }
};

app.get('/uploads/:filename', serveUploadedImage);
app.get('/api/uploads/:filename', serveUploadedImage);
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

// SEO Sitemap & Robots
app.get('/sitemap.xml', handleSitemap);
app.get('/robots.txt', handleRobots);

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
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/content', contentRoutes);
app.use('/api', cartOrderRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/admin', adminRoutes);

// 404 handler for unknown API routes
app.use('/api/*', (_req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found.',
  });
});

// Centralized Error Handler
app.use(errorHandler);

export default app;

import mongoose from 'mongoose';
import { env } from './env';

let cached = (global as any).mongoose;
if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

export async function connectDatabase(): Promise<{ uri: string; isMemory: boolean }> {
  try {
    let mongoUri = (process.env.MONGODB_URI || env.MONGODB_URI || '').trim();

    if (mongoose.connection.readyState === 1) {
      return { uri: mongoUri || 'cached', isMemory: isUsingMemoryServer };
    }

    if (!mongoUri) {
      if (process.env.VERCEL || env.NODE_ENV === 'production') {
        throw new Error('MONGODB_URI is missing in Vercel Environment Variables. Please add MONGODB_URI in Vercel Project Settings.');
      }
      console.log('[DB] No MONGODB_URI configured. Starting embedded MongoDB server for local development/testing...');
      const { MongoMemoryServer } = await (import('mongodb-memory-server' as any) as Promise<any>);
      memoryServerInstance = await MongoMemoryServer.create();
      mongoUri = memoryServerInstance.getUri();
      isUsingMemoryServer = true;
    }

    if (!cached.promise) {
      mongoose.set('strictQuery', true);
      cached.promise = mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 15000,
        connectTimeoutMS: 15000,
        maxPoolSize: 10,
      } as any);
    }

    await cached.promise;
    cached.conn = mongoose.connection;

    console.log(`[DB] Connected to MongoDB (${isUsingMemoryServer ? 'Embedded Memory Server' : 'MongoDB Atlas / External Cluster'})`);

    // Ensure primary admin account exists
    try {
      const { User } = await import('../models/User');
      const bcrypt = (await import('bcryptjs')).default;
      const adminEmail = (env.ADMIN_EMAIL || 'admin@msvelora.com').toLowerCase();
      const existingAdmin = await User.findOne({ email: adminEmail });
      if (!existingAdmin) {
        console.log(`[DB] Auto-seeding primary administrator: ${adminEmail}`);
        const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD || 'AdminVelora@2026', 12);
        await User.create({
          name: 'Store Administrator',
          email: adminEmail,
          passwordHash,
          role: 'admin',
          status: 'active',
          phone: '+92 300 0000000',
        });
        console.log(`[DB] Primary admin seeded successfully.`);
      }
    } catch (seedErr) {
      console.error('[DB] Admin auto-seed error:', seedErr);
    }

    return { uri: mongoUri, isMemory: isUsingMemoryServer };
  } catch (error) {
    cached.promise = null;
    console.error('[DB] Database connection error:', error);
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
  if (memoryServerInstance) {
    await memoryServerInstance.stop();
    memoryServerInstance = null;
  }
}

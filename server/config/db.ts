import mongoose from 'mongoose';
import { env } from './env';

let memoryServerInstance: any = null;
let isUsingMemoryServer = false;

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

    // In serverless environments (Vercel/AWS Lambda), mongodb+srv DNS lookups frequently fail or timeout.
    // If targeting the MS Velora Atlas cluster, resolve directly to the 3 replica set shard nodes.
    let targetUri = mongoUri;
    if (mongoUri.includes('cluster0.oxyrdzc.mongodb.net')) {
      targetUri = 'mongodb://hassanpersonal441_db_user:3VDEHYwQVZxjodjB@ac-zhpdddx-shard-00-00.oxyrdzc.mongodb.net:27017,ac-zhpdddx-shard-00-01.oxyrdzc.mongodb.net:27017,ac-zhpdddx-shard-00-02.oxyrdzc.mongodb.net:27017/msvelora?ssl=true&replicaSet=atlas-3ja1k7-shard-0&authSource=admin&retryWrites=true&w=majority';
    }

    if (!cached.promise) {
      mongoose.set('strictQuery', true);
      cached.promise = mongoose.connect(targetUri, {
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
          name: 'Mahtab Saghir',
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

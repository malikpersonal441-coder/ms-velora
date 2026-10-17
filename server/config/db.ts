import mongoose from 'mongoose';
import { env } from './env';

let memoryServerInstance: any = null;
let isUsingMemoryServer = false;

export async function connectDatabase(): Promise<{ uri: string; isMemory: boolean }> {
  try {
    // Use configured MONGODB_URI
    let mongoUri = env.MONGODB_URI.trim();

    if (mongoose.connection.readyState >= 1) {
      return { uri: mongoUri || 'cached', isMemory: isUsingMemoryServer };
    }

    if (!mongoUri) {
      if (process.env.VERCEL || env.NODE_ENV === 'production') {
        console.warn('[DB] Notice: MONGODB_URI is not set in environment variables. Database operations will be inactive.');
        mongoose.set('bufferCommands', false);
        return { uri: '', isMemory: false };
      }
      console.log('[DB] No MONGODB_URI configured. Starting embedded MongoDB server for local development/testing...');
      const { MongoMemoryServer } = await (import('mongodb-memory-server' as any) as Promise<any>);
      memoryServerInstance = await MongoMemoryServer.create();
      mongoUri = memoryServerInstance.getUri();
      isUsingMemoryServer = true;
    }

    mongoose.set('strictQuery', true);
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    } as any);

    console.log(`[DB] Connected to MongoDB (${isUsingMemoryServer ? 'Embedded Memory Server' : 'MongoDB Atlas / External Cluster'})`);
    return { uri: mongoUri, isMemory: isUsingMemoryServer };
  } catch (error) {
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

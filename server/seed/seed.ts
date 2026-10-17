import { connectDatabase, disconnectDatabase } from '../config/db';
import { seedDatabase } from './seedData';

async function runCliSeed() {
  try {
    await connectDatabase();
    await seedDatabase(true);
    console.log('[Seed CLI] Completed successfully.');
  } catch (err) {
    console.error('[Seed CLI] Failed:', err);
    process.exitCode = 1;
  } finally {
    await disconnectDatabase();
  }
}

runCliSeed();

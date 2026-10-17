import app from './app';
import { env } from './config/env';
import { connectDatabase } from './config/db';
import { seedDatabase } from './seed/seedData';

async function bootstrap() {
  try {
    await connectDatabase();
    await seedDatabase(false);

    app.listen(env.PORT, () => {
      console.log(`=========================================================`);
      console.log(`  MS VELORA BACKEND API SERVER`);
      console.log(`  Port: ${env.PORT} | Environment: ${env.NODE_ENV}`);
      console.log(`  Admin Login: ${env.ADMIN_EMAIL}`);
      console.log(`=========================================================`);
    });
  } catch (err) {
    console.error('[Server Bootstrap Failed]:', err);
    process.exit(1);
  }
}

bootstrap();

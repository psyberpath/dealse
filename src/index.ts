import { db } from './services/database.js';
import { env } from './config/env.js';
import './worker.js'; // Start workers
import { app } from './app.js';

const start = async () => {
  try {
    console.log('--- Dealse Engine Starting ---');
    console.log(`Environment: ${env.NODE_ENV}`);

    // Connect to database
    await db.$connect();

    // Start API Server
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`--- API Server running on port ${PORT} ---`);
    });

  } catch (error) {
    console.error('Failed to start application:', error);
    process.exit(1);
  }
};

start();

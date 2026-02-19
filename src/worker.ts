import { Worker } from 'bullmq';
import { env } from './config/env.js';
import { QUEUE_NAMES } from './services/queue.js';
import { scrapingProcessor, analysisProcessor, draftingProcessor } from './workers/processors.js';

console.log('--- Worker Host Starting ---');

const connection = {
  url: env.REDIS_URL,
};

const workers: Worker[] = [];

// Start Scraping Worker
const scrapingWorker = new Worker(QUEUE_NAMES.SCRAPING, scrapingProcessor, {
  connection,
  concurrency: 1, // Start with 1 to avoid being blocked
});
workers.push(scrapingWorker);
console.log(`[Worker] Started ${QUEUE_NAMES.SCRAPING}`);

// Start Analysis Worker
const analysisWorker = new Worker(QUEUE_NAMES.ANALYSIS, analysisProcessor, {
  connection,
  concurrency: 1,
});
workers.push(analysisWorker);
console.log(`[Worker] Started ${QUEUE_NAMES.ANALYSIS}`);

// Start Drafting Worker
const draftingWorker = new Worker(QUEUE_NAMES.DRAFTING, draftingProcessor, {
  connection,
  concurrency: 1,
});
workers.push(draftingWorker);
console.log(`[Worker] Started ${QUEUE_NAMES.DRAFTING}`);

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  console.log(`Received ${signal}, closing workers...`);
  await Promise.all(workers.map(w => w.close()));
  console.log('Workers closed.');
  process.exit(0);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

console.log('--- Workers are running ---');

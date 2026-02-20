import { Queue } from 'bullmq';
import { env } from '../config/env.js';

export const QUEUE_NAMES = {
  SCRAPING: 'scraping-queue',
  ANALYSIS: 'analysis-queue',
  DRAFTING: 'drafting-queue',
} as const;

class QueueService {
  public scrapingQueue: Queue;
  public analysisQueue: Queue;
  public draftingQueue: Queue;

  private connection = {
    url: env.REDIS_URL,
  };

  constructor() {
    const defaultJobOptions = {
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: {
        age: 24 * 3600, // Keep for 24 hours
        count: 1000,
      },
      removeOnFail: {
        age: 7 * 24 * 3600, // Keep for 7 days (DLQ)
      },
    };

    this.scrapingQueue = new Queue(QUEUE_NAMES.SCRAPING, {
      connection: this.connection,
      defaultJobOptions,
    });

    this.analysisQueue = new Queue(QUEUE_NAMES.ANALYSIS, {
      connection: this.connection,
      defaultJobOptions,
    });

    this.draftingQueue = new Queue(QUEUE_NAMES.DRAFTING, {
      connection: this.connection,
      defaultJobOptions,
    });
  }

  public async logQueueStatus() {
    console.log('--- Queue Status ---');
    const [scraping, analysis, drafting] = await Promise.all([
      this.scrapingQueue.getJobCounts(),
      this.analysisQueue.getJobCounts(),
      this.draftingQueue.getJobCounts(),
    ]);
    console.log(`Scraping: ${JSON.stringify(scraping)}`);
    console.log(`Analysis: ${JSON.stringify(analysis)}`);
    console.log(`Drafting: ${JSON.stringify(drafting)}`);
  }

  public async close() {
    await Promise.all([
      this.scrapingQueue.close(),
      this.analysisQueue.close(),
      this.draftingQueue.close(),
    ]);
  }
}

export const queueService = new QueueService();

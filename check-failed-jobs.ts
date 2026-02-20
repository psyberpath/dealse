import { queueService } from './src/services/queue.js';

async function checkFailed() {
  const aq = queueService.analysisQueue;
  const failed = await aq.getFailed(0, 5);
  console.log(`Found ${failed.length} failed jobs in Analysis Queue`);
  for (const job of failed) {
    console.log(`Job ID: ${job.id}`);
    console.log(`Failed Reason: ${job.failedReason}`);
    console.log(`Stacktrace:`, job.stacktrace);
  }
}

checkFailed().catch(console.error).finally(() => queueService.close());

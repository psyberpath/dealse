import { queueService } from './src/services/queue.js';
async function run() {
  await queueService.logQueueStatus();
  process.exit(0);
}
run();

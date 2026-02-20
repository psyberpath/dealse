import { scraperService } from './src/services/scraper.js';

async function testScraper() {
  const result = await scraperService.scrape('https://newyorkoffices.com');
  console.log('--- SCAPED DATA RESULT ---');
  console.log('Characters in rawText:', result.rawText.length);
  console.log('Preview of rawText:', result.rawText.substring(0, 500));
  console.log('Tech Stack:', result.techStackDetected);
}

testScraper().catch(console.error).finally(() => scraperService.close());

import { db } from './src/services/database.js';

const leadId = 'af776462-56b1-40af-81cc-304fee45dc57'; // From previous E2E run

async function debug() {
  const lead = await db.lead.findUnique({
    where: { id: leadId },
    include: { scrapedData: true, analysisReports: true, emailDrafts: true }
  });

  console.log('Lead:', lead);

  if (lead?.status === 'FAILED') {
    // If ScrapedData exists, it failed in Analysis or subsequent steps
    if (lead.scrapedData) {
      console.log('Scraping successful. Failed during Analysis/Drafting.');
    } else {
      console.log('Scraping failed (No ScrapedData found).');
    }
  }
}

debug().catch(console.error).finally(() => db.$disconnect());

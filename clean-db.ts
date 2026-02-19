import { db } from './src/services/database.js';

async function clean() {
  const domain = 'example.com';
  console.log(`Cleaning up lead for domain: ${domain}`);

  // Delete related data first (cascade should handle it, but being explicit)
  const lead = await db.lead.findUnique({ where: { domain } });
  if (lead) {
    await db.scrapedData.deleteMany({ where: { leadId: lead.id } });
    await db.analysisReport.deleteMany({ where: { leadId: lead.id } });
    await db.emailDraft.deleteMany({ where: { leadId: lead.id } });
    await db.lead.delete({ where: { id: lead.id } });
    console.log('Lead and related data deleted.');
  } else {
    console.log('Lead not found.');
  }
}

clean().catch(console.error).finally(() => db.$disconnect());

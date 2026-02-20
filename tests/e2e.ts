import { env } from '../src/config/env.js';
import { db } from '../src/services/database.js';

const TARGET_DOMAIN = 'https://tribecadentalstudio.com';
const API_URL = `http://localhost:${process.env.PORT || 3000}`;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function runTest() {
  console.log('--- Starting E2E Test ---');

  // 1. Create Lead
  console.log(`Creating lead for ${TARGET_DOMAIN}...`);
  const createRes = await fetch(`${API_URL}/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ domains: [TARGET_DOMAIN] }),
  });

  if (!createRes.ok) {
    console.error('Failed to create lead:', await createRes.text());
    process.exit(1);
  }

  const createData = await createRes.json();
  const leadId = createData.leads[0].id;
  console.log(`Lead created with ID: ${leadId}`);

  // 2. Poll for Status
  let status = 'NEW';
  let attempts = 0;
  const maxAttempts = 30; // 30 seconds timeout

  while (status !== 'DRAFTED' && status !== 'FAILED' && attempts < maxAttempts) {
    await sleep(2000); // Wait 2 seconds
    attempts++;

    console.log(`Polling status (Attempt ${attempts})...`);
    const leadRes = await fetch(`${API_URL}/leads/${leadId}`);
    const leadData = await leadRes.json();
    status = leadData.status;

    console.log(`Current Status: ${status}`);

    if (status === 'DRAFTED' || status === 'FAILED') break;
  }

  if (status === 'DRAFTED') {
    console.log('✅ PASS: Lead successfully processed and drafted.');

    // 3. Verify Draft
    const leadRes = await fetch(`${API_URL}/leads/${leadId}`);
    const leadData = await leadRes.json();
    console.log('--- Email Draft ---');
    console.log(`Subject: ${leadData.emailDrafts[0].subjectLine}`);
    console.log(`Body: ${leadData.emailDrafts[0].bodyContent.substring(0, 100)}...`);
  } else {
    console.error(`❌ FAIL: Lead failed to reach DRAFTED status. Final Status: ${status}`);
    process.exit(1);
  }
}

runTest().catch(console.error);

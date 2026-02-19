import { Router } from 'express';
import { z } from 'zod';
import { db } from '../services/database.js';
import { queueService, QUEUE_NAMES } from '../services/queue.js';

const router = Router();

const createLeadSchema = z.object({
  domains: z.array(z.string().min(1)),
});

// POST /leads - Bulk create leads
router.post('/', async (req, res) => {
  try {
    const { domains } = createLeadSchema.parse(req.body);

    const results = [];

    for (const domain of domains) {
      // Check if lead exists
      let lead = await db.lead.findUnique({ where: { domain } });

      if (!lead) {
        lead = await db.lead.create({
          data: { domain, status: 'NEW' },
        });

        // Add to queue
        await queueService.scrapingQueue.add(QUEUE_NAMES.SCRAPING, { leadId: lead.id });
      }

      results.push(lead);
    }

    res.json({ message: 'Leads processed', leads: results });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: (error as z.ZodError).errors });
    } else {
      console.error('Error creating leads:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
});

// GET /leads/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const lead = await db.lead.findUnique({
      where: { id },
      include: {
        scrapedData: true,
        analysisReports: true,
        emailDrafts: true,
      },
    });

    if (!lead) {
      res.status(404).json({ error: 'Lead not found' });
      return;
    }

    res.json(lead);
  } catch (error) {
    console.error('Error fetching lead:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export const leadsRouter = router;

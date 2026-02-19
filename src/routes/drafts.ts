import { Router } from 'express';
import { db } from '../services/database.js';

import { Prisma } from '@prisma/client';

const router = Router();

// GET /drafts - List drafts
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;

    const where: Prisma.EmailDraftWhereInput = status ? { status: status as any } : {};

    const drafts = await db.emailDraft.findMany({
      where,
      include: {
        lead: {
          select: { domain: true, companyName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(drafts);
  } catch (error) {
    console.error('Error fetching drafts:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export const draftsRouter = router;

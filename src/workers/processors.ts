import { Job } from 'bullmq';
import { db } from '../services/database.js';
import { scraperService } from '../services/scraper.js';
import { aiService } from '../services/ai.js';
import { queueService, QUEUE_NAMES } from '../services/queue.js';
import { Prisma } from '@prisma/client';

export const scrapingProcessor = async (job: Job) => {
  const { leadId } = job.data;
  console.log(`[Scraper] Processing job ${job.id} for lead ${leadId}`);

  try {
    const lead = await db.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      console.error(`[Scraper] Lead ${leadId} not found`);
      return;
    }

    const scrapedData = await scraperService.scrape(lead.domain);

    // Save to database
    await db.$transaction(async (tx) => {
      await tx.scrapedData.create({
        data: {
          leadId: lead.id,
          rawText: scrapedData.rawText,
          metaDescription: scrapedData.metaDescription,
          socialLinks: scrapedData.socialLinks as Prisma.InputJsonValue,
          techStackDetected: scrapedData.techStackDetected as Prisma.InputJsonValue,
        },
      });

      await tx.lead.update({
        where: { id: lead.id },
        data: { status: 'SCRAPED' },
      });
    });

    console.log(`[Scraper] Lead ${lead.domain} scraped successfully.`);

    // Add to next queue
    await queueService.analysisQueue.add(QUEUE_NAMES.ANALYSIS, { leadId });

  } catch (error) {
    console.error(`[Scraper] Error processing lead ${leadId}:`, error);
    await db.lead.update({
      where: { id: leadId },
      data: { status: 'FAILED' },
    });
    throw error;
  }
};

export const analysisProcessor = async (job: Job) => {
  const { leadId } = job.data;
  console.log(`[Analyst] Processing job ${job.id} for lead ${leadId}`);

  try {
    // Cast strict type
    const scrapedData = await db.scrapedData.findUnique({ where: { leadId } });
    if (!scrapedData) {
      console.error(`[Analyst] Scraped data for lead ${leadId} not found`);
      return;
    }

    const report = await aiService.analyzeLead(
      scrapedData.rawText,
      scrapedData.metaDescription,
      scrapedData.techStackDetected
    );

    // Save to database
    await db.$transaction(async (tx) => {
      await tx.analysisReport.create({
        data: {
          leadId,
          businessModel: report.businessModel,
          painPoints: report.painPoints as Prisma.InputJsonValue,
          suggestedSolutions: report.suggestedSolutions as Prisma.InputJsonValue,
          revenueEstimation: report.revenueEstimation || null,
          modelUsed: report.modelUsed,
        },
      });

      await tx.lead.update({
        where: { id: leadId },
        data: { status: 'ANALYZED' },
      });
    });

    console.log(`[Analyst] Lead ${leadId} analyzed successfully.`);

    // Add to next queue
    await queueService.draftingQueue.add(QUEUE_NAMES.DRAFTING, { leadId });

  } catch (error: any) {
    console.error(`[Analyst] Error processing lead ${leadId}:`, error);

    let newStatus = 'FAILED';
    if (error.message?.includes('SAFETY') || error.message?.includes('GoogleGenerativeAI Error')) {
      if (error.message?.includes('429 Too Many Requests') || error.message?.includes('Quota')) {
        newStatus = 'RATE_LIMITED';
      } else if (error.message?.includes('SAFETY')) {
        newStatus = 'BLOCKED_BY_SAFETY';
      }
    }

    await db.lead.update({
      where: { id: leadId },
      data: { status: newStatus as any },
    });

    // Don't retry on safety blocks, it will always fail
    if (newStatus !== 'BLOCKED_BY_SAFETY') {
      throw error;
    }
  }
};

export const draftingProcessor = async (job: Job) => {
  const { leadId } = job.data;
  console.log(`[Copywriter] Processing job ${job.id} for lead ${leadId}`);

  try {
    const analysis = await db.analysisReport.findFirst({ where: { leadId }, orderBy: { createdAt: 'desc' } });
    if (!analysis) {
      console.error(`[Copywriter] Analysis for lead ${leadId} not found`);
      return;
    }

    // Adapt database/Prisma types to AI Service types
    const aiAnalysisInput: any = {
      businessModel: analysis.businessModel,
      painPoints: analysis.painPoints as string[],
      suggestedSolutions: analysis.suggestedSolutions as string[],
      modelUsed: analysis.modelUsed
    };
    if (analysis.revenueEstimation) {
      aiAnalysisInput.revenueEstimation = analysis.revenueEstimation;
    }

    const draft = await aiService.draftEmail(aiAnalysisInput);

    // Save to database
    await db.$transaction(async (tx) => {
      await tx.emailDraft.create({
        data: {
          leadId,
          subjectLine: draft.subjectLine,
          bodyContent: draft.bodyContent,
          status: 'PENDING_REVIEW',
          generationPromptVersion: draft.generationPromptVersion,
        },
      });

      await tx.lead.update({
        where: { id: leadId },
        data: { status: 'DRAFTED' },
      });
    });

    console.log(`[Copywriter] Draft created for lead ${leadId}.`);

  } catch (error: any) {
    console.error(`[Copywriter] Error processing lead ${leadId}:`, error);

    let newStatus = 'FAILED';
    if (error.message?.includes('SAFETY') || error.message?.includes('GoogleGenerativeAI Error')) {
      if (error.message?.includes('429 Too Many Requests') || error.message?.includes('Quota')) {
        newStatus = 'RATE_LIMITED';
      } else if (error.message?.includes('SAFETY')) {
        newStatus = 'BLOCKED_BY_SAFETY';
      }
    }

    await db.lead.update({
      where: { id: leadId },
      data: { status: newStatus as any },
    });

    if (newStatus !== 'BLOCKED_BY_SAFETY') {
      throw error;
    }
  }
};

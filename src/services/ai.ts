import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../config/env.js';

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

// Define the expected structure for Analysis Response
export interface AnalysisResult {
  businessModel: string;
  painPoints: string[];
  suggestedSolutions: string[];
  revenueEstimation?: string;
  modelUsed: string;
}

// Define the expected structure for Draft Response
export interface DraftResult {
  subjectLine: string;
  bodyContent: string;
  generationPromptVersion: string;
}

const ANALYST_PROMPT = `
You are an expert Business Analyst and Sales Strategist.
Analyze the following company data scraped from their website.
You need to identify:
1. Their Business Model (B2B, B2C, SaaS, Agency, etc.)
2. Potential Pain Points they might be facing based on their public presence.
3. How an AI Automation Agency (providing Chatbots, Workflow Automation, AI Agents) could specifically help them.
4. Estimate their revenue range if possible (e.g., "$1M - $5M/yr") based on team size or other signals, otherwise return "Unknown".

Input Data:
---
Raw Text: {{RAW_TEXT}}
Meta Description: {{META_DESC}}
Tech Stack: {{TECH_STACK}}
---

Return the output strictly as a JSON object with the following keys:
- businessModel: string
- painPoints: string[] (3-5 items)
- suggestedSolutions: string[] (3-5 specific AI automation ideas)
- revenueEstimation: string
`;

const COPYWRITER_PROMPT = `
You are a world-class Copywriter specializing in cold outreach emails.
Using the analysis below, write a personalized cold email to the decision-maker of this company.
The goal is to book a 15-min discovery call to discuss how AI automation can solve their specific pain points.

Company Analysis:
---
Business Model: {{BUSINESS_MODEL}}
Pain Points: {{PAIN_POINTS}}
Suggested Solutions: {{SOLUTIONS}}
---

Guidelines:
- Keep it under 150 words.
- Be conversational but professional.
- Focus on value and their specific problems, not just listing features.
- Proposed a low-friction Call to Action (CTA).

Return the output strictly as a JSON object with the following keys:
- subjectLine: string (Catchy, relevant, under 50 chars)
- bodyContent: string (The email body in plain text or simple markdown)
`;

export class AIService {
  private model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  public async analyzeLead(
    rawText: string,
    metaDesc: string | null,
    techStack: any
  ): Promise<AnalysisResult> {
    const prompt = ANALYST_PROMPT
      .replace('{{RAW_TEXT}}', rawText)
      .replace('{{META_DESC}}', metaDesc || 'N/A')
      .replace('{{TECH_STACK}}', JSON.stringify(techStack));

    try {
      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' }
      });
      const response = await result.response;
      const text = response.text();
      const json = JSON.parse(text);

      return {
        ...json,
        modelUsed: 'gemini-2.0-flash',
      };
    } catch (error) {
      console.error('Error in analyzeLead:', error);
      throw error;
    }
  }

  public async draftEmail(analysis: AnalysisResult): Promise<DraftResult> {
    const prompt = COPYWRITER_PROMPT
      .replace('{{BUSINESS_MODEL}}', analysis.businessModel)
      .replace('{{PAIN_POINTS}}', analysis.painPoints.join(', '))
      .replace('{{SOLUTIONS}}', analysis.suggestedSolutions.join(', '));

    try {
      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' }
      });
      const response = await result.response;
      const text = response.text();
      const json = JSON.parse(text);

      return {
        ...json,
        generationPromptVersion: 'v1.0',
      };
    } catch (error) {
      console.error('Error in draftEmail:', error);
      throw error;
    }
  }
}

export const aiService = new AIService();

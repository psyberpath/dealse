import { chromium } from 'playwright';
import type { Browser } from 'playwright';

export interface ScrapedDataResult {
  rawText: string;
  metaDescription: string | null;
  socialLinks: string[];
  techStackDetected: Record<string, any>; // Changed from detailed to detected to match generic type
}

export class ScraperService {
  private browser: Browser | null = null;

  private async getBrowser() {
    if (!this.browser) {
      this.browser = await chromium.launch({ headless: true });
    }
    return this.browser;
  }

  public async scrape(url: string): Promise<ScrapedDataResult> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      console.log(`[Scraper] Navigating to ${url}`);
      // Ensure url starts with http
      const targetUrl = url.startsWith('http') ? url : `https://${url}`;
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

      // Basic info extraction
      const data = await page.evaluate(() => {
        const metaDesc = document.querySelector('meta[name="description"]')?.getAttribute('content') ||
          document.querySelector('meta[property="og:description"]')?.getAttribute('content') || null;

        // Extract main text content
        const headings = Array.from(document.querySelectorAll('h1, h2, h3')).map(el => el.textContent?.trim()).filter(Boolean);
        const paragraphs = Array.from(document.querySelectorAll('p')).map(el => el.textContent?.trim()).filter(Boolean);
        const rawText = [...headings, ...paragraphs].join('\n\n').substring(0, 10000); // Limit text size

        // Extract social links
        const socialLinks: string[] = [];
        const socialDomains = ['twitter.com', 'x.com', 'linkedin.com', 'facebook.com', 'instagram.com', 'github.com', 'youtube.com'];
        document.querySelectorAll('a').forEach(a => {
          if (a.href && socialDomains.some(d => a.href.includes(d))) {
            socialLinks.push(a.href);
          }
        });

        // Basic tech stack detection (very naive)
        const techStack: Record<string, string> = {};
        if (document.querySelector('#__next')) techStack['Framework'] = 'Next.js';
        if (document.querySelector('div[id^="gatsby"]')) techStack['Framework'] = 'Gatsby';
        if (document.querySelector('script[src*="wp-content"]')) techStack['CMS'] = 'WordPress';
        if (document.querySelector('script[src*="shopify"]')) techStack['E-commerce'] = 'Shopify';
        if (document.querySelector('script[src*="wix"]')) techStack['CMS'] = 'Wix';
        if (document.querySelector('script[src*="squarespace"]')) techStack['CMS'] = 'Squarespace';

        return {
          rawText,
          metaDescription: metaDesc,
          socialLinks: Array.from(new Set(socialLinks)), // unique
          techStackDetected: techStack
        };
      });

      return data;

    } catch (error) {
      console.error(`[Scraper] Failed to scrape ${url}:`, error);
      throw error;
    } finally {
      await page.close();
    }
  }

  public async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

export const scraperService = new ScraperService();

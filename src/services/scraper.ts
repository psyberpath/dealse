import { chromium } from 'playwright';
import type { Browser } from 'playwright';
import { XMLParser } from 'fast-xml-parser';

export interface ScrapedDataResult {
  rawText: string;
  metaDescription: string | null;
  socialLinks: string[];
  techStackDetected: Record<string, any>;
}

export class ScraperService {
  private browser: Browser | null = null;
  private parser = new XMLParser();

  private async getBrowser() {
    if (!this.browser) {
      this.browser = await chromium.launch({ headless: true });
    }
    return this.browser;
  }

  private async fetchSitemapLocs(domain: string): Promise<string[]> {
    const sitemapUrl = domain.startsWith('http') ? `${domain}/sitemap.xml` : `https://${domain}/sitemap.xml`;
    try {
      console.log(`[Scraper] Fetching sitemap: ${sitemapUrl}`);
      const res = await fetch(sitemapUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      if (!res.ok) return [];

      const xmlData = await res.text();
      const result = this.parser.parse(xmlData);

      let locs: string[] = [];
      if (result.urlset && Array.isArray(result.urlset.url)) {
        locs = result.urlset.url.map((u: any) => u.loc);
      } else if (result.urlset && result.urlset.url) {
        locs = [result.urlset.url.loc];
      } else if (result.sitemapindex) {
        console.log(`[Scraper] Sitemap index found. Attempting to fetch child sitemap.`);
        let childSitemaps: string[] = [];
        if (Array.isArray(result.sitemapindex.sitemap)) {
          childSitemaps = result.sitemapindex.sitemap.map((s: any) => s.loc);
        } else if (result.sitemapindex.sitemap) {
          childSitemaps = [result.sitemapindex.sitemap.loc];
        }

        // Prioritize sitemaps containing 'page'
        let targetSitemap = childSitemaps.find(s => s.toLowerCase().includes('page')) || childSitemaps[0];

        if (targetSitemap) {
          try {
            const childRes = await fetch(targetSitemap);
            if (childRes.ok) {
              const childXmlData = await childRes.text();
              const childResult = this.parser.parse(childXmlData);
              if (childResult.urlset && Array.isArray(childResult.urlset.url)) {
                locs = childResult.urlset.url.map((u: any) => u.loc);
              } else if (childResult.urlset && childResult.urlset.url) {
                locs = [childResult.urlset.url.loc];
              }
            }
          } catch (e) {
            console.error(`[Scraper] Failed to fetch child sitemap ${targetSitemap}`);
          }
        }
      }

      // Filter high value pages
      const keywords = ['/about', '/services', '/pricing', '/case', '/contact', '/product'];
      const targetUrls = locs.filter(loc =>
        loc && keywords.some(kw => loc.toLowerCase().includes(kw))
      );

      // Unique and limit to 3 (+ homepage later)
      return Array.from(new Set(targetUrls)).slice(0, 3);
    } catch (error) {
      console.error(`[Scraper] Failed to fetch or parse sitemap for ${domain}`, error);
      return [];
    }
  }

  public async scrape(domain: string): Promise<ScrapedDataResult> {
    const browser = await this.getBrowser();

    const homepageUrl = domain.startsWith('http') ? domain : `https://${domain}`;
    const interiorUrls = await this.fetchSitemapLocs(homepageUrl);

    // Always scrape homepage first, then up to 3 interior URLs
    const targetUrls = Array.from(new Set([homepageUrl, ...interiorUrls]));
    console.log(`[Scraper] Target URLs to scrape for ${domain}:`, targetUrls);

    let combinedRawText = `--- HOMEPAGE (${homepageUrl}) ---\n`;
    let mainMetaDescription: string | null = null;
    let allSocialLinks = new Set<string>();
    let combinedTechStack: Record<string, string> = {};

    for (const url of targetUrls) {
      console.log(`[Scraper] Navigating to ${url}`);
      let page;
      try {
        page = await browser.newPage();
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

        const data = await page.evaluate(() => {
          const metaDesc = document.querySelector('meta[name="description"]')?.getAttribute('content') ||
            document.querySelector('meta[property="og:description"]')?.getAttribute('content') || null;

          const headings = Array.from(document.querySelectorAll('h1, h2, h3')).map(el => el.textContent?.trim()).filter(Boolean);
          const paragraphs = Array.from(document.querySelectorAll('p')).map(el => el.textContent?.trim()).filter(Boolean);
          // Limit text size per page
          const rawText = [...headings, ...paragraphs].join('\n\n').substring(0, 5000);

          const socialLinks: string[] = [];
          const socialDomains = ['twitter.com', 'x.com', 'linkedin.com', 'facebook.com', 'instagram.com', 'github.com', 'youtube.com'];
          document.querySelectorAll('a').forEach(a => {
            if (a.href && socialDomains.some(d => a.href.includes(d))) {
              socialLinks.push(a.href);
            }
          });

          const techStack: Record<string, string> = {};
          if (document.querySelector('#__next')) techStack['Framework'] = 'Next.js';
          if (document.querySelector('div[id^="gatsby"]')) techStack['Framework'] = 'Gatsby';
          if (document.querySelector('script[src*="wp-content"]')) techStack['CMS'] = 'WordPress';
          if (document.querySelector('script[src*="shopify"]')) techStack['E-commerce'] = 'Shopify';
          if (document.querySelector('script[src*="wix"]')) techStack['CMS'] = 'Wix';
          if (document.querySelector('script[src*="squarespace"]')) techStack['CMS'] = 'Squarespace';

          return { rawText, metaDesc, socialLinks, techStack };
        });

        // Accumulate data
        if (url === homepageUrl) {
          mainMetaDescription = data.metaDesc;
        } else {
          combinedRawText += `\n\n--- INTERIOR PAGE (${url}) ---\n`;
        }

        combinedRawText += data.rawText;
        data.socialLinks.forEach(link => allSocialLinks.add(link));
        combinedTechStack = { ...combinedTechStack, ...data.techStack };

      } catch (error) {
        console.error(`[Scraper] Failed to scrape ${url}:`, error);
        // Continue scraping other URLs even if one fails
      } finally {
        if (page) await page.close();
      }
    }

    // Limit the overall combined text size just in case
    combinedRawText = combinedRawText.substring(0, 15000);

    return {
      rawText: combinedRawText,
      metaDescription: mainMetaDescription,
      socialLinks: Array.from(allSocialLinks), // unique
      techStackDetected: combinedTechStack
    };
  }

  public async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

export const scraperService = new ScraperService();

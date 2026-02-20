import { XMLParser } from 'fast-xml-parser';

async function testSitemap() {
  const url = 'https://newyorkoffices.com/sitemap.xml';
  const res = await fetch(url);
  const xml = await res.text();
  const parser = new XMLParser();
  const result = parser.parse(xml);

  console.log('Main sitemap keys:', Object.keys(result));

  let childSitemapUrl = null;
  if (result.sitemapindex && result.sitemapindex.sitemap) {
    if (Array.isArray(result.sitemapindex.sitemap)) {
      childSitemapUrl = result.sitemapindex.sitemap[0].loc;
      console.log('Child sitemaps available:', result.sitemapindex.sitemap.map(s => s.loc));
    } else {
      childSitemapUrl = result.sitemapindex.sitemap.loc;
      console.log('Single child sitemap:', childSitemapUrl);
    }
  }

  if (childSitemapUrl) {
    // try to fetch the one with "page" in it if available
    let target = childSitemapUrl;
    if (Array.isArray(result.sitemapindex.sitemap)) {
      const pageSitemap = result.sitemapindex.sitemap.find(s => s.loc.includes('page'));
      if (pageSitemap) target = pageSitemap.loc;
    }

    console.log('Fetching child sitemap:', target);
    const cRes = await fetch(target);
    const cXml = await cRes.text();
    const cResult = parser.parse(cXml);
    if (cResult.urlset && cResult.urlset.url) {
      const locs = Array.isArray(cResult.urlset.url) ? cResult.urlset.url.map(u => u.loc) : [cResult.urlset.url.loc];
      console.log(`Found ${locs.length} urls in child sitemap.`);
      console.log('First 5:', locs.slice(0, 5));
      const keywords = ['/about', '/services', '/pricing', '/case', '/contact', '/product'];
      const matched = locs.filter(loc => loc && keywords.some(kw => loc.toLowerCase().includes(kw)));
      console.log('Matched keywords:', matched);
    }
  }
}

testSitemap().catch(console.error);

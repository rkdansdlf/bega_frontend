import fs from 'node:fs';
import path from 'node:path';
import { canonicalUrlForPath, distDir, indexableRoutes } from './seo-policy.mjs';
import { prerenderDynamicStadiumPages } from './seo-dynamic-pages.mjs';

if (!fs.existsSync(distDir)) {
  console.error('[seo:sitemap] dist directory not found. Run build first.');
  process.exit(1);
}

const today = new Date().toISOString().split('T')[0];

const staticEntries = indexableRoutes.map((route) => ({
  path: route.path,
  loc: canonicalUrlForPath(route.path),
  lastmod: today,
  changefreq: route.changefreq || 'weekly',
  priority: route.priority || '0.5',
}));

const dynamicStadiumEntries = await prerenderDynamicStadiumPages();

const seen = new Set();
const allEntries = [];
for (const entry of [...staticEntries, ...dynamicStadiumEntries]) {
  const key = entry.loc;
  if (seen.has(key)) {
    continue;
  }
  seen.add(key);
  allEntries.push(entry);
}

const urls = allEntries.map((entry) => [
  '  <url>',
  `    <loc>${entry.loc}</loc>`,
  `    <lastmod>${entry.lastmod || today}</lastmod>`,
  `    <changefreq>${entry.changefreq || 'weekly'}</changefreq>`,
  `    <priority>${entry.priority || '0.5'}</priority>`,
  '  </url>',
].join('\n'));

const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...urls,
  '</urlset>',
  '',
].join('\n');

const sitemapPath = path.join(distDir, 'sitemap.xml');
fs.writeFileSync(sitemapPath, xml, 'utf-8');

console.log(
  `[seo:sitemap] generated ${sitemapPath} (${allEntries.length} urls; ${dynamicStadiumEntries.length} stadium details)`,
);

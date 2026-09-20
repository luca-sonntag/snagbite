/**
 * Empirical Open Food Facts DACH Category Analysis Script
 *
 * Streams the Open Food Facts dump and counts all category tags
 * across all DACH products to discover the true major taxonomy branches.
 */

import { createGunzip } from 'node:zlib';
import * as readline from 'node:readline';
import { Readable } from 'node:stream';

const DUMP_URL = 'https://static.openfoodfacts.org/data/en.openfoodfacts.org.products.csv.gz';

function isDACH(countriesStr: string): boolean {
  const c = countriesStr.toLowerCase();
  return (
    c.includes('germany') ||
    c.includes('deutschland') ||
    c.includes('de') ||
    c.includes('austria') ||
    c.includes('österreich') ||
    c.includes('at') ||
    c.includes('switzerland') ||
    c.includes('schweiz') ||
    c.includes('ch')
  );
}

async function main() {
  console.log('='.repeat(75));
  console.log('📊 Empirical Open Food Facts DACH Category Analysis');
  console.log('='.repeat(75));
  console.log(`Connecting to: ${DUMP_URL}...\n`);

  const response = await fetch(DUMP_URL);
  if (!response.ok || !response.body) {
    throw new Error(`Failed to download dump: ${response.status} ${response.statusText}`);
  }

  const tagCounts = new Map<string, number>();
  const firstTagCounts = new Map<string, number>();
  const secondTagCounts = new Map<string, number>();

  let dachProductCount = 0;
  let totalLines = 0;
  let productsWithCategories = 0;

  const nodeReadable = Readable.fromWeb(response.body as any).pipe(createGunzip());
  const rl = readline.createInterface({
    input: nodeReadable,
    crlfDelay: Infinity,
  });

  let colMap: Record<string, number> = {};
  let isHeader = true;
  let lastReport = Date.now();

  for await (const line of rl) {
    if (!line) continue;
    totalLines++;

    if (isHeader) {
      const headers = line.split('\t');
      headers.forEach((h, idx) => {
        colMap[h.trim()] = idx;
      });
      isHeader = false;
      continue;
    }

    const cols = line.split('\t');
    const countries = cols[colMap['countries_tags'] ?? 40] || cols[colMap['countries_en'] ?? 41] || '';
    if (!isDACH(countries)) continue;

    dachProductCount++;

    const rawTags = cols[colMap['categories_tags'] ?? 22] || '';
    if (!rawTags) continue;

    const tags = rawTags
      .split(',')
      .map(t => t.trim().toLowerCase())
      .filter(t => t.startsWith('en:'));

    if (tags.length === 0) continue;
    productsWithCategories++;

    // Track 1st and 2nd tag in lineage
    if (tags[0]) firstTagCounts.set(tags[0], (firstTagCounts.get(tags[0]) || 0) + 1);
    if (tags[1]) secondTagCounts.set(tags[1], (secondTagCounts.get(tags[1]) || 0) + 1);

    // Track all tags
    for (const tag of tags) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }

    if (Date.now() - lastReport > 5000) {
      process.stdout.write(`\r⏳ Scanned ${totalLines.toLocaleString('de-DE')} lines | DACH Products: ${dachProductCount.toLocaleString('de-DE')} | Unique Tags: ${tagCounts.size.toLocaleString('de-DE')} `);
      lastReport = Date.now();
    }
  }

  console.log(`\n\n✅ Scan Complete!`);
  console.log(`   Total DACH Products: ${dachProductCount.toLocaleString('de-DE')}`);
  console.log(`   Products with Categories: ${productsWithCategories.toLocaleString('de-DE')} (${((productsWithCategories / dachProductCount) * 100).toFixed(1)}%)`);
  console.log(`   Total Distinct Tags: ${tagCounts.size.toLocaleString('de-DE')}\n`);

  console.log('='.repeat(75));
  console.log('🏆 Top 60 Most Frequent Category Tags across all DACH products:');
  console.log('='.repeat(75));

  const sortedAll = Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 60);

  console.table(
    sortedAll.map(([tag, count], index) => ({
      Rank: index + 1,
      Tag: tag,
      Count: count,
      'Share %': ((count / productsWithCategories) * 100).toFixed(1) + '%',
    }))
  );

  console.log('\n' + '='.repeat(75));
  console.log('🌿 Top 30 Level-1 Root Tags:');
  console.log('='.repeat(75));

  const sortedFirst = Array.from(firstTagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30);

  console.table(
    sortedFirst.map(([tag, count], index) => ({
      Rank: index + 1,
      RootTag: tag,
      Count: count,
      'Share %': ((count / productsWithCategories) * 100).toFixed(1) + '%',
    }))
  );

  console.log('\n' + '='.repeat(75));
  console.log('🌿 Top 35 Level-2 Branch Tags:');
  console.log('='.repeat(75));

  const sortedSecond = Array.from(secondTagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 35);

  console.table(
    sortedSecond.map(([tag, count], index) => ({
      Rank: index + 1,
      Level2Tag: tag,
      Count: count,
      'Share %': ((count / productsWithCategories) * 100).toFixed(1) + '%',
    }))
  );
}

main().catch(err => {
  console.error('\n❌ Analysis failed:', err?.message || err);
  process.exit(1);
});

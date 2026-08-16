import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BASE_NAME_TO_CANONICAL_ID } from '../matching/baseNameMap.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CANONICAL_DATA_PATH = path.resolve(__dirname, '../data/canonicalIngredientsData.json');

async function main() {
  const rawData = fs.readFileSync(CANONICAL_DATA_PATH, 'utf-8');
  const ingredients = JSON.parse(rawData);

  const byCode = new Map<string, any>();
  for (const item of ingredients) {
    if (item.bls_code) {
      byCode.set(item.bls_code.toUpperCase().trim(), item);
    }
    if (item.id) {
      byCode.set(item.id.toLowerCase().trim(), item);
    }
  }

  const entries = Object.entries(BASE_NAME_TO_CANONICAL_ID);
  console.log(`Auditing ${entries.length} baseName mappings against BLS 4.0 database...\n`);

  const lines: string[] = [];
  const issues: string[] = [];

  for (const [baseName, code] of entries) {
    const cleanCode = code.toUpperCase().trim();
    const item = byCode.get(cleanCode) || byCode.get('BLS_' + cleanCode) || byCode.get(code.toLowerCase().trim());

    if (!item) {
      const line = `${baseName} | ${code} | ❌ NOT FOUND IN BLS 4.0`;
      lines.push(line);
      issues.push(line);
      continue;
    }

    const nameDe = item.name_de || '';
    const nameEn = item.name_en || '';
    const category = item.category || '';
    const line = `${baseName.padEnd(28)} | ${cleanCode.padEnd(8)} | ${nameDe} (${category})`;
    lines.push(line);

    // Heuristic sanity checks
    const lowerBase = baseName.toLowerCase();
    const lowerDe = nameDe.toLowerCase();

    // Check for obvious mismatches
    if (category === 'READY_MEALS' && !['french fries', 'hashbrown patty'].includes(lowerBase)) {
      issues.push(`⚠️ WARNING (Ready Meal): ${baseName} -> ${nameDe} [${category}]`);
    }
  }

  const dumpPath = path.resolve(__dirname, '../../../baseNameMappingsDump.txt');
  fs.writeFileSync(dumpPath, lines.join('\n'), 'utf-8');
  console.log(`Wrote ${lines.length} lines to: ${dumpPath}\n`);

  // Print first 40 and last 40 lines
  console.log('=== Sample Mappings (First 30) ===');
  console.log(lines.slice(0, 30).join('\n'));
  console.log('\n=== Sample Mappings (Last 30) ===');
  console.log(lines.slice(-30).join('\n'));

  console.log(`\n=== Verification Summary ===`);
  console.log(`Total Mappings Checked: ${entries.length}`);
  console.log(`Found & Valid: ${entries.length - issues.length}`);
  console.log(`Issues / Warnings: ${issues.length}`);

  if (issues.length > 0) {
    console.log('\nIssues to inspect:');
    issues.forEach(i => console.log(i));
  } else {
    console.log('\n✅ ALL 338 MAPPINGS EXIST AND POINT TO VALID ENTRIES!');
  }
}

main().catch(console.error);

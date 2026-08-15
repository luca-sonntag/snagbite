import fs from 'fs/promises';
import path from 'path';

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ';' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

async function run() {
  const deCsvPath = path.resolve('backend/src/data/swiss_food_composition_de.csv');
  const enCsvPath = path.resolve('backend/src/data/swiss_food_composition.csv');

  const deContent = await fs.readFile(deCsvPath, 'utf-8');
  const enContent = await fs.readFile(enCsvPath, 'utf-8');

  const deLines = deContent.split(/\r?\n/).filter(l => l.trim().length > 0);
  const enLines = enContent.split(/\r?\n/).filter(l => l.trim().length > 0);

  // Map of category DE -> { count, sampleFoods: string[] }
  const categories = new Map<string, { count: number; samples: string[] }>();

  // Skip header lines (start at line 12 / index 11 where data starts)
  for (let i = 11; i < deLines.length; i++) {
    const cols = parseCsvLine(deLines[i]);
    if (cols.length < 6) continue;
    const cat = cols[5]?.trim();
    const foodName = cols[3]?.trim();
    if (!cat) continue;

    // A category might contain multiple subcategories separated by semicolon if quoted, e.g. "Früchte/Fruchtsäfte;Alkoholfreie Getränke/..."
    const individualCats = cat.split(';').map(c => c.trim()).filter(Boolean);
    for (const c of individualCats) {
      const existing = categories.get(c) || { count: 0, samples: [] };
      existing.count++;
      if (existing.samples.length < 5 && foodName && !existing.samples.includes(foodName)) {
        existing.samples.push(foodName);
      }
      categories.set(c, existing);
    }
  }

  const sortedCats = Array.from(categories.entries()).sort((a, b) => b[1].count - a[1].count);

  const outputPath = path.resolve('eval_results/swiss_categories_raw.json');
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(
    outputPath,
    JSON.stringify(
      sortedCats.map(([cat, info]) => ({
        category: cat,
        itemCount: info.count,
        sampleFoods: info.samples,
      })),
      null,
      2
    ),
    'utf-8'
  );

  console.log(`Successfully extracted ${sortedCats.length} categories to ${outputPath}`);
}

run();

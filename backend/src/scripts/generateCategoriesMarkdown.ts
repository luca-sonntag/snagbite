import fs from 'fs/promises';
import path from 'path';

interface Subcategory {
  category: string;
  itemCount: number;
  sampleFoods: string[];
}

interface Group {
  mainCategory: string;
  mainCategoryLabel: string;
  totalItems: number;
  swissSubcategories: Subcategory[];
}

async function run() {
  const data: Group[] = JSON.parse(await fs.readFile('eval_results/swiss_categories_grouped.json', 'utf-8'));

  let md = '# 🇨🇭 Schweizer Nährwertdatenbank: Kategorien-Übersicht & Konsolidierung\n\n';
  md += 'Alle 106 Unterkategorien der offiziellen Schweizer Nährwertdatenbank wurden in **12 klare Hauptkategorien** konsolidiert:\n\n';

  md += '| # | Hauptkategorie (Enum) | Deutsche Bezeichnung | Anzahl Lebensmittel | Schweizer Unterkategorien |\n';
  md += '|---|---|---|---|---|\n';

  data.forEach((g, idx) => {
    md += `| ${idx + 1} | \`${g.mainCategory}\` | **${g.mainCategoryLabel}** | ${g.totalItems} | ${g.swissSubcategories.length} Subkategorien |\n`;
  });

  md += '\n---\n\n## 📋 Detail-Aufschlüsselung aller 12 Kategorien\n\n';

  data.forEach((g, idx) => {
    md += `### ${idx + 1}. \`${g.mainCategory}\` — ${g.mainCategoryLabel} (${g.totalItems} Items)\n\n`;
    md += '| Schweizer Original-Kategorie | Anzahl | Beispiele |\n';
    md += '|---|---|---|\n';
    g.swissSubcategories.forEach(s => {
      md += `| \`${s.category}\` | **${s.itemCount}** | ${s.sampleFoods.slice(0, 3).join(', ')} |\n`;
    });
    md += '\n';
  });

  const outPath = path.resolve('eval_results/SWISS_CATEGORIES_OVERVIEW.md');
  await fs.writeFile(outPath, md, 'utf-8');
  console.log(`Overview written to ${outPath}`);
}

run();

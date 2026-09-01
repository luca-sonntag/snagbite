import fs from 'node:fs';
import path from 'node:path';
import { getClient } from '../db.js';
import { packIngredientIcons, getIngredientImagesDir } from '../ingredientIconPacker.js';
import { isMappingConfirmed, isIconConfirmed } from '../audit/auditManifest.js';
import { findExistingIngredientImage } from '../ingredientImageService.js';
import {
  loadDailyBudget,
  isBudgetExhausted,
  getDailyBudgetStatus,
  DEFAULT_DAILY_BUDGET_USD,
} from '../audit/budgetTracker.js';
import { auditSingleMapping } from '../audit/mappingAuditor.js';
import { auditSingleIcon, AbortPipelineError } from '../audit/iconAuditor.js';
import type { PipelineCliOptions } from '../audit/types.js';

function parseCliArgs(): PipelineCliOptions {
  const args = process.argv.slice(2);
  const options: PipelineCliOptions = {
    dryRun: false,
    autoZip: true,
    force: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--force') {
      options.force = true;
    } else if (arg === '--no-zip') {
      options.autoZip = false;
    } else if (arg === '--missing-only' || arg === '-m') {
      options.missingOnly = true;
    } else if (arg === '--icons-only') {
      options.iconsOnly = true;
    } else if ((arg === '--limit' || arg === '-l') && args[i + 1]) {
      options.limit = parseInt(args[++i], 10);
    } else if ((arg === '--budget' || arg === '-b') && args[i + 1]) {
      options.dailyBudgetUsd = parseFloat(args[++i]);
    } else if (arg === '--interactive' || arg === '-i' || arg === '--debug' || arg === '-d') {
      options.interactive = true;
    } else if ((arg === '--key' || arg === '-k') && args[i + 1]) {
      options.key = args[++i].toLowerCase().trim();
    }
  }

  return options;
}

async function runPipeline() {
  const options = parseCliArgs();
  const dailyBudgetLimit = options.dailyBudgetUsd ?? (parseFloat(process.env.DAILY_AUDIT_BUDGET_USD || '') || DEFAULT_DAILY_BUDGET_USD);

  console.log(`\n======================================================`);
  console.log(`🍳 All-in-One Ingredient Icons & Audit Pipeline`);
  console.log(`======================================================`);
  console.log(`✨ Dry-Run Modus:    ${options.dryRun ? 'AKTIV (keine Schreibvorgänge)' : 'Nein'}`);
  console.log(`🔎 Interaktiv/Debug: ${options.interactive ? 'AKTIV (Vergleich nach Generierung)' : 'Nein'}`);
  console.log(`⚡ Force-Re-Audit:   ${options.force ? 'Ja' : 'Nein'}`);
  if (options.missingOnly) console.log(`🚀 Modus:            NUR FEHLENDE ICONS GENERIEREN`);
  if (options.iconsOnly)   console.log(`🎨 Modus:            NUR ICONS (Mapping-Check übersprungen)`);
  console.log(`💰 Tagesbudget:      $${dailyBudgetLimit.toFixed(2)} USD`);
  if (options.limit) console.log(`🔢 Limit:            Max. ${options.limit} Mappings`);
  if (options.key) console.log(`🎯 Einzel-Key:       ${options.key}`);
  console.log(`------------------------------------------------------`);

  const budgetStatus = getDailyBudgetStatus(dailyBudgetLimit);
  const currentBudgetLog = loadDailyBudget();
  console.log(`📊 Bisherige Tagesausgaben: $${budgetStatus.spentUsd.toFixed(4)} / $${dailyBudgetLimit.toFixed(2)} (Verbleibend: $${budgetStatus.remainingUsd.toFixed(4)})`);
  console.log(`   └─ FLUX: $${currentBudgetLog.fluxSpentUsd.toFixed(4)} | BGBuster: $${(currentBudgetLog.bgbusterSpentUsd || 0).toFixed(4)} | Gemini: $${currentBudgetLog.geminiSpentUsd.toFixed(4)}`);

  if (!options.force && budgetStatus.isExceeded) {
    console.log(`\n🛑 Tagesbudget von $${dailyBudgetLimit.toFixed(2)} bereits erreicht. Pipeline pausiert bis morgen.`);
    return;
  }

  // 1. Fetch ingredient mappings from Supabase
  console.log(`\n📡 Lade Mappings aus Supabase...`);
  let query = getClient()
    .from('ingredient_mappings')
    .select('mapping_key, category, product_code, resolution, estimated_nutrients, source, confidence, reasoning')
    .order('hit_count', { ascending: false });

  if (options.key) {
    query = query.eq('mapping_key', options.key);
  }

  const { data: rawRows, error } = await query;
  if (error) {
    throw new Error(`Fehler beim Abfragen von ingredient_mappings: ${error.message}`);
  }

  const rows = rawRows || [];
  console.log(`📦 Gefundene Mappings in DB: ${rows.length}`);

  // 2. Filter out already confirmed mappings unless force
  const imagesDir = getIngredientImagesDir();
  const pendingRows = rows.filter((r) => {
    if (options.force) return true;
    const existingFile = findExistingIngredientImage(r.mapping_key, imagesDir);
    const iconFileExists = !!existingFile && fs.existsSync(path.join(imagesDir, existingFile));

    if (options.missingOnly) {
      return !iconFileExists;
    }

    if (options.iconsOnly) {
      return !iconFileExists || !isIconConfirmed(existingFile);
    }

    const mappingConfirmed = isMappingConfirmed(r.mapping_key, r.category || '');
    const iconConfirmed = iconFileExists && isIconConfirmed(existingFile);
    return !mappingConfirmed || !iconConfirmed;
  });

  console.log(`🎯 Zu verarbeitende Einträge: ${pendingRows.length} (übersprungen/bestätigt: ${rows.length - pendingRows.length})`);

  if (pendingRows.length === 0) {
    console.log(`\n✅ Alle Einträge sind bereits verifiziert und vorhanden! Nichts zu tun.`);
    return;
  }

  const queue = options.limit ? pendingRows.slice(0, options.limit) : pendingRows;
  console.log(`🚀 Starte Verarbeitung von ${queue.length} Einträgen...\n`);

  let auditedCount = 0;
  let mappingsUpdated = 0;
  let iconsZoomed = 0;
  let iconsGenerated = 0;
  let iconsConfirmed = 0;
  let totalCostRunUsd = 0;

  interface ChangedIconItem {
    mappingKey: string;
    action: string;
    oldPath: string | null;
    newPath: string;
    reasoning: string;
  }
  const changedIcons: ChangedIconItem[] = [];

  for (let i = 0; i < queue.length; i++) {
    const item = queue[i];
    const prefix = `[${i + 1}/${queue.length}][${item.mapping_key}]`;

    // Budget guard
    if (isBudgetExhausted(dailyBudgetLimit)) {
      console.log(`\n🛑 Tagesbudget ($${dailyBudgetLimit.toFixed(2)}) während des Laufs erreicht. Beende aktuellen Batch.`);
      break;
    }

    console.log(`${prefix} 🔎 Auditiere (Kategorie: ${item.category || 'N/A'})...`);

    try {
      let updatedProductCode = item.product_code || undefined;

      // Stufe 1: Mapping Plausibilität & OFF Match (wird bei --icons-only übersprungen)
      if (!options.iconsOnly) {
        const mapRes = await auditSingleMapping(item, { dryRun: options.dryRun, force: options.force });
        totalCostRunUsd += mapRes.costUsd;
        if (mapRes.updatedInDatabase) mappingsUpdated++;
        if (mapRes.updatedProductCode) updatedProductCode = mapRes.updatedProductCode;
        console.log(`${prefix} 🥗 Mapping: ${mapRes.resolution} (Code: ${mapRes.updatedProductCode || 'none'}) - ${mapRes.notes}`);
      }

      // Stufe 2: Icon Qualität, Zoom & Vision Check
      const iconRes = await auditSingleIcon({
        mappingKey: item.mapping_key,
        category: item.category,
        reasoning: item.reasoning || undefined,
        productCode: updatedProductCode,
        dryRun: options.dryRun,
        force: options.force,
        dailyBudgetLimit,
        interactive: options.interactive,
      });

      totalCostRunUsd += iconRes.costUsd;
      if (iconRes.zoomApplied) iconsZoomed++;
      if (iconRes.generated) iconsGenerated++;
      if (iconRes.status === 'ai_confirmed') iconsConfirmed++;

      if (iconRes.generated || iconRes.zoomApplied) {
        changedIcons.push({
          mappingKey: item.mapping_key,
          action: iconRes.generated ? (iconRes.oldFilePath ? 'regeneriert (Vision-Fix)' : 'neu generiert') : 'gezoomt (Rand-Fix)',
          oldPath: iconRes.oldFilePath || null,
          newPath: iconRes.filePath,
          reasoning: iconRes.reasoning,
        });
      }

      console.log(
        `${prefix} 🎨 Icon: [${iconRes.filename}] Status: ${iconRes.status} (Rand: ${(iconRes.marginPct * 100).toFixed(0)}%, Zoom: ${iconRes.zoomApplied ? 'Ja' : 'Nein'}, Gen: ${iconRes.generated ? 'Ja' : 'Nein'})`
      );

      auditedCount++;
    } catch (err: unknown) {
      if (err instanceof AbortPipelineError) {
        console.log(`\n🛑 Pipeline vorzeitig vom Benutzer im interaktiven Modus beendet.`);
        break;
      }
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`${prefix} ❌ Fehler beim Audit: ${msg}`);
    }
  }

  // Auto-zip packaging if any icons were modified
  if (options.autoZip && !options.dryRun && (iconsZoomed > 0 || iconsGenerated > 0)) {
    console.log(`\n🗜️  Icons wurden modifiziert. Aktualisiere ingredient-icons.zip...`);
    try {
      const zipRes = packIngredientIcons({ verbose: true });
      console.log(`📦 Zip-Archiv erfolgreich aktualisiert (${zipRes.fileCount} Dateien, ${zipRes.zipSizeMb} MB).`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`⚠️  Warnung beim Packen des Zip-Archivs: ${msg}`);
    }
  }

  const finalBudget = loadDailyBudget();
  console.log(`\n======================================================`);
  console.log(`🎉 Audit-Lauf abgeschlossen!`);
  console.log(`======================================================`);
  console.log(`✅ Geprüfte Zutaten:       ${auditedCount}`);
  console.log(`📝 DB-Mappings aktualisiert: ${mappingsUpdated}`);
  console.log(`🔎 Icons gezoomt (Auto-Fix): ${iconsZoomed}`);
  console.log(`🎨 Icons neu generiert:    ${iconsGenerated}`);
  console.log(`⭐ Icons bestätigt:         ${iconsConfirmed}`);
  console.log(`💰 Kosten dieses Laufs:     $${totalCostRunUsd.toFixed(5)} USD`);
  console.log(`📈 Gesamte Tagesausgaben:   $${finalBudget.totalSpentUsd.toFixed(4)} / $${dailyBudgetLimit.toFixed(2)} USD`);
  console.log(`   └─ FLUX: $${finalBudget.fluxSpentUsd.toFixed(4)} | BGBuster: $${(finalBudget.bgbusterSpentUsd || 0).toFixed(4)} | Gemini: $${finalBudget.geminiSpentUsd.toFixed(4)}`);
  console.log(`======================================================`);

  if (changedIcons.length > 0) {
    console.log(`\n======================================================`);
    console.log(`🖼️  VERGLEICHS-ÜBERSICHT MODIFIZIERTER ICONS (${changedIcons.length})`);
    console.log(`======================================================`);
    for (const icon of changedIcons) {
      const oldLink = icon.oldPath ? `file:///${icon.oldPath.replace(/\\/g, '/')}` : 'keine Altversion';
      const newLink = `file:///${icon.newPath.replace(/\\/g, '/')}`;
      console.log(`• [${icon.mappingKey}] (${icon.action})`);
      if (icon.oldPath) console.log(`  ⏮️  Alt: ${oldLink}`);
      console.log(`  ⏭️  Neu: ${newLink}`);
      console.log(`  💬 Grund: ${icon.reasoning}`);
    }
    console.log(`======================================================\n`);

    try {
      const reportPath = path.join(getIngredientImagesDir(), 'AUDIT_REPORT.md');
      const mdLines: string[] = [
        '# 📋 Ingredient Audit Report',
        `*Stand: ${new Date().toISOString()}*\n`,
        `### 📊 Zusammenfassung`,
        `- Geprüfte Zutaten: ${auditedCount}`,
        `- Modifizierte Mappings: ${mappingsUpdated}`,
        `- Gezoomte Icons: ${iconsZoomed}`,
        `- Neu generierte Icons: ${iconsGenerated}\n`,
        `### 🖼️ Bild-Vergleich (Alt vs. Neu)`,
        '| Zutat | Aktion | Alt (Backup) | Neu (Aktuell) | Begründung |',
        '| :--- | :--- | :--- | :--- | :--- |',
      ];
      for (const icon of changedIcons) {
        const oldMd = icon.oldPath ? `[Alt ansehen](file:///${icon.oldPath.replace(/\\/g, '/')})` : '—';
        const newMd = `[Neu ansehen](file:///${icon.newPath.replace(/\\/g, '/')})`;
        mdLines.push(`| **${icon.mappingKey}** | ${icon.action} | ${oldMd} | ${newMd} | ${icon.reasoning.replace(/\|/g, '/')} |`);
      }
      fs.writeFileSync(reportPath, mdLines.join('\n'), 'utf-8');
      console.log(`📄 Detaillierter Review-Report gespeichert: file:///${reportPath.replace(/\\/g, '/')}\n`);
    } catch (err: unknown) {
      console.warn('[auditIngredientPipeline] Warning writing report:', err);
    }
  }
}

runPipeline().catch((err) => {
  console.error('Fataler Pipeline-Fehler:', err);
  process.exit(1);
});

import { packIngredientIcons, ensureIngredientIconsExtracted, getIngredientZipPath, getIngredientImagesDir } from '../ingredientIconPacker.js';

async function main() {
  const args = process.argv.slice(2);
  const isUnpack = args.includes('--unpack') || args.includes('--extract');
  const isForce = args.includes('--force');

  console.log(`\n==================================================`);
  console.log(`📦 Ingredient Icons Zip Utility`);
  console.log(`==================================================`);
  console.log(`📂 Icons Dir: ${getIngredientImagesDir()}`);
  console.log(`🗜️  Zip Path:  ${getIngredientZipPath()}`);
  console.log(`--------------------------------------------------`);

  if (isUnpack) {
    console.log(`⚡ Entpacke Icons (Modus: ${isForce ? 'Force' : 'Smart Stamp Check'})...\n`);
    const res = await ensureIngredientIconsExtracted({ force: isForce, verbose: true });
    if (res.extracted) {
      console.log(`\n✅ ${res.count} Icons erfolgreich entpackt in ${res.durationMs}ms!`);
    } else if (res.reason === 'already_extracted') {
      console.log(`\n✅ Icons sind bereits auf dem neuesten Stand (${res.count} Icons vorhanden).`);
    } else if (res.reason === 'zip_not_found') {
      console.log(`\n⚠️  Keine Zip-Datei gefunden. Es sind ${res.count} Icons im Zielordner vorhanden.`);
    } else {
      console.error(`\n❌ Fehler beim Entpacken: ${res.error}`);
      process.exit(1);
    }
  } else {
    console.log(`⚡ Packe alle .webp Icons in das Zip-Archiv...\n`);
    const res = packIngredientIcons({ verbose: true });
    console.log(`\n==================================================`);
    console.log(`🎉 Erfolgreich gepackt!`);
    console.log(`==================================================`);
    console.log(`📄 Dateien: ${res.fileCount}`);
    console.log(`💾 Größe:   ${res.zipSizeMb} MB`);
    console.log(`⏱️  Dauer:   ${res.durationMs}ms`);
    console.log(`📍 Ziel:    ${res.zipPath}\n`);
  }
}

main().catch((err) => {
  console.error('\n❌ Fataler Fehler:', err.message);
  process.exit(1);
});

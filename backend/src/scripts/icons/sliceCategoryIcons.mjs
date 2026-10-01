import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SHEET_PATH = 'C:/Users/lucas/.gemini/antigravity-ide/brain/74f40fd4-1ea8-4639-80cd-e999ab3ae6ac/category_icon_sheet_1787489733656.jpg';

const CATEGORY_GRID = [
  // Row 0
  [
    { name: 'vegetables', label: 'Vegetables & Salads' },
    { name: 'fruits', label: 'Fruits & Berries' },
    { name: 'dairy_eggs', label: 'Dairy & Eggs' },
    { name: 'meat_poultry', label: 'Meat & Poultry' },
  ],
  // Row 1
  [
    { name: 'seafood', label: 'Fish & Seafood' },
    { name: 'grains_pasta', label: 'Grains, Bread & Pasta' },
    { name: 'oils_condiments', label: 'Oils, Sauces & Vinegar' },
    { name: 'spices_herbs', label: 'Spices & Herbs' },
  ],
  // Row 2
  [
    { name: 'nuts_seeds', label: 'Nuts & Seeds' },
    { name: 'sweets_snacks', label: 'Sweets & Snacks' },
    { name: 'beverages', label: 'Beverages' },
    { name: 'pantry_baking', label: 'Baking & Pantry' },
  ],
  // Row 3
  [
    { name: 'prepared_dishes', label: 'Prepared Dishes' },
    { name: 'frozen', label: 'Frozen Food' },
    { name: 'pantry', label: 'Canned & Preserved' },
    { name: 'other', label: 'General Grocery' },
  ],
];

async function sliceIcons() {
  if (!fs.existsSync(SHEET_PATH)) {
    console.error('Sheet not found:', SHEET_PATH);
    process.exit(1);
  }

  const metadata = await sharp(SHEET_PATH).metadata();
  const width = metadata.width || 1024;
  const height = metadata.height || 1024;

  const cellWidth = Math.floor(width / 4);
  const cellHeight = Math.floor(height / 4);

  const frontendDir = path.resolve(__dirname, '../../../frontend/public/category-icons');
  const backendDir = path.resolve(__dirname, '../../public/category-icons');

  fs.mkdirSync(frontendDir, { recursive: true });
  fs.mkdirSync(backendDir, { recursive: true });

  console.log(`Processing ${width}x${height} sheet (${cellWidth}x${cellHeight} per cell)...`);

  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const cat = CATEGORY_GRID[r][c];
      
      const left = c * cellWidth;
      const top = r * cellHeight;
      // In each cell, the icon is in the upper ~74%, while the bottom ~26% has the text label and padding
      // Let's crop the icon region to avoid the text label and cell divider lines
      const cropMarginX = Math.round(cellWidth * 0.05);
      const cropMarginTop = Math.round(cellHeight * 0.05);
      const cropHeight = Math.round(cellHeight * 0.74);
      const cropWidth = cellWidth - (cropMarginX * 2);

      const cropped = await sharp(SHEET_PATH)
        .extract({
          left: left + cropMarginX,
          top: top + cropMarginTop,
          width: cropWidth,
          height: cropHeight,
        })
        .resize(384, 384, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 },
        })
        .webp({ quality: 92, effort: 6 })
        .toBuffer();

      const filename = `${cat.name}.webp`;
      fs.writeFileSync(path.join(frontendDir, filename), cropped);
      fs.writeFileSync(path.join(backendDir, filename), cropped);
      console.log(`Saved ${filename} (${cat.label})`);
    }
  }

  // Also create aliases for legacy category names so they resolve directly
  const aliases = {
    'produce.webp': 'vegetables.webp',
    'bakery.webp': 'grains_pasta.webp',
    'baking.webp': 'pantry_baking.webp',
    'condiments_oils.webp': 'oils_condiments.webp',
  };

  for (const [alias, target] of Object.entries(aliases)) {
    const srcPath = path.join(frontendDir, target);
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, path.join(frontendDir, alias));
      fs.copyFileSync(srcPath, path.join(backendDir, alias));
      console.log(`Created alias ${alias} -> ${target}`);
    }
  }

  console.log('Done slicing all category icons!');
}

sliceIcons().catch((err) => {
  console.error('Error slicing icons:', err);
  process.exit(1);
});

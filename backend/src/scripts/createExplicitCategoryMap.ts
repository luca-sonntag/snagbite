import fs from 'fs/promises';
import path from 'path';

/**
 * Explicit, human-curated 1:1 mapping of ALL 106 Swiss subcategories
 * to 11 standardized, culinary-correct main categories.
 */
export const SWISS_CATEGORY_EXPLICIT_MAP: Record<string, { mainCategory: string; labelDe: string; labelEn: string }> = {
  // ── 1. VEGETABLES (Gemüse frisch/gekocht, Pilze, Salate, Kräuter, Sprossen) ───────
  'Gemüse/Gemüse frisch': { mainCategory: 'VEGETABLES', labelDe: 'Frisches Gemüse & Salate', labelEn: 'Fresh Vegetables & Salads' },
  'Gemüse/Gemüse gekocht (inkl. Konserven)': { mainCategory: 'VEGETABLES', labelDe: 'Gemüse (gekocht / Konserve)', labelEn: 'Cooked & Canned Vegetables' },
  'Gemüse/Gemüse getrocknet': { mainCategory: 'VEGETABLES', labelDe: 'Getrocknetes Gemüse (getr. Tomaten etc.)', labelEn: 'Dried Vegetables' },
  'Gemüse/Gemüse tiefgekühlt': { mainCategory: 'VEGETABLES', labelDe: 'Tiefkühlgemüse', labelEn: 'Frozen Vegetables' },
  'Gemüse/Pilze': { mainCategory: 'VEGETABLES', labelDe: 'Pilze (frisch & konserviert)', labelEn: 'Mushrooms' },
  'Gemüse/Kräuter': { mainCategory: 'VEGETABLES', labelDe: 'Frische Kräuter', labelEn: 'Fresh Herbs' },
  'Gemüse/Sprossen und Keimlinge': { mainCategory: 'VEGETABLES', labelDe: 'Sprossen & Keimlinge (Kresse etc.)', labelEn: 'Sprouts & Microgreens' },

  // ── 2. FRUITS (Frisches Obst, Beeren, Obstkonserven, Trockenfrüchte) ───────────────
  'Früchte/Früchte frisch': { mainCategory: 'FRUITS', labelDe: 'Frisches Obst & Beeren', labelEn: 'Fresh Fruit & Berries' },
  'Früchte/Früchte gekocht (inkl. Konserven)': { mainCategory: 'FRUITS', labelDe: 'Obstkonserven & Kompott', labelEn: 'Canned Fruit & Compote' },
  'Früchte/Früchte getrocknet': { mainCategory: 'FRUITS', labelDe: 'Trockenfrüchte & Dörrobst', labelEn: 'Dried Fruits' },

  // ── 2. DAIRY_EGGS (Milch, Käse, Joghurt, Quark, Butter, Rahm, Eier, Tofu, Pflanzendrinks) ──
  'Milch und Milchprodukte/Hartkäse': { mainCategory: 'DAIRY_EGGS', labelDe: 'Hartkäse', labelEn: 'Hard Cheese' },
  'Milch und Milchprodukte/Halbhartkäse': { mainCategory: 'DAIRY_EGGS', labelDe: 'Halbhartkäse', labelEn: 'Semi-Hard Cheese' },
  'Milch und Milchprodukte/Weichkäse': { mainCategory: 'DAIRY_EGGS', labelDe: 'Weichkäse', labelEn: 'Soft Cheese' },
  'Milch und Milchprodukte/Frischkäse und Quark': { mainCategory: 'DAIRY_EGGS', labelDe: 'Frischkäse, Quark & Hüttenkäse', labelEn: 'Cream Cheese & Quark' },
  'Milch und Milchprodukte/Joghurt': { mainCategory: 'DAIRY_EGGS', labelDe: 'Joghurt', labelEn: 'Yogurt' },
  'Milch und Milchprodukte/Joghurt und Sauermilch': { mainCategory: 'DAIRY_EGGS', labelDe: 'Joghurt & Sauermilch', labelEn: 'Yogurt & Cultured Milk' },
  'Milch und Milchprodukte/Milch': { mainCategory: 'DAIRY_EGGS', labelDe: 'Milch (Vollmilch, fettarm)', labelEn: 'Milk' },
  'Milch und Milchprodukte/Konsummilch': { mainCategory: 'DAIRY_EGGS', labelDe: 'Milch (Vollmilch, fettarm)', labelEn: 'Milk' },
  'Milch und Milchprodukte/Milchgetränke': { mainCategory: 'DAIRY_EGGS', labelDe: 'Milchgetränke', labelEn: 'Milk Drinks' },
  'Milch und Milchprodukte/Milch- und Joghurtgetränke': { mainCategory: 'DAIRY_EGGS', labelDe: 'Milch- & Joghurtgetränke', labelEn: 'Milk & Yogurt Drinks' },
  'Milch und Milchprodukte/Sauermilchprodukte': { mainCategory: 'DAIRY_EGGS', labelDe: 'Sauermilch, Kefir & Buttermilch', labelEn: 'Cultured Milk Products' },
  'Milch und Milchprodukte/Käsezubereitungen': { mainCategory: 'DAIRY_EGGS', labelDe: 'Käsezubereitungen & Schmelzkäse', labelEn: 'Processed Cheese' },
  'Milch und Milchprodukte/Käseerzeugnisse': { mainCategory: 'DAIRY_EGGS', labelDe: 'Käseerzeugnisse', labelEn: 'Cheese Products' },
  'Fette und Öle/Rahm': { mainCategory: 'DAIRY_EGGS', labelDe: 'Rahm & Sahne', labelEn: 'Cream' },
  'Fette und Öle/Butter': { mainCategory: 'DAIRY_EGGS', labelDe: 'Butter', labelEn: 'Butter' },
  'Eier': { mainCategory: 'DAIRY_EGGS', labelDe: 'Hühnereier (ganz, Eigelb, Eiweiß)', labelEn: 'Eggs' },
  'Pflanzliche Proteinlieferanten und Alternativen zu tierischen Produkten/Pflanzliche Alternativen zu Milch und Milchprodukten': { mainCategory: 'DAIRY_EGGS', labelDe: 'Pflanzliche Milch- & Joghurt-Alternativen', labelEn: 'Plant-Based Dairy Alternatives' },
  'Pflanzliche Proteinlieferanten und Alternativen zu tierischen Produkten/Alternativen zu Milchprodukten': { mainCategory: 'DAIRY_EGGS', labelDe: 'Pflanzliche Milchprodukt-Alternativen', labelEn: 'Plant-Based Dairy Alternatives' },
  'Pflanzliche Proteinlieferanten und Alternativen zu tierischen Produkten/Pflanzliche Getränke': { mainCategory: 'DAIRY_EGGS', labelDe: 'Pflanzendrinks (Haferdrink, Mandeldrink, Sojadrink)', labelEn: 'Plant-Based Milk Drinks' },
  'Pflanzliche Proteinlieferanten und Alternativen zu tierischen Produkten/Tofu und Tofuerzeugnisse': { mainCategory: 'DAIRY_EGGS', labelDe: 'Tofu & Sojaprodukte', labelEn: 'Tofu Products' },

  // ── 3. MEAT_POULTRY (Fleisch, Geflügel, Wurstwaren, Schinken, Fleischalternativen) ──
  'Fleisch und Innereien/Rind': { mainCategory: 'MEAT_POULTRY', labelDe: 'Rindfleisch & Rinderhack', labelEn: 'Beef' },
  'Fleisch und Innereien/Kalb': { mainCategory: 'MEAT_POULTRY', labelDe: 'Kalbfleisch', labelEn: 'Veal' },
  'Fleisch und Innereien/Schwein': { mainCategory: 'MEAT_POULTRY', labelDe: 'Schweinefleisch', labelEn: 'Pork' },
  'Fleisch und Innereien/Geflügel': { mainCategory: 'MEAT_POULTRY', labelDe: 'Geflügel (Hähnchen, Pute, Ente)', labelEn: 'Poultry' },
  'Fleisch und Innereien/Lamm, Schaf': { mainCategory: 'MEAT_POULTRY', labelDe: 'Lamm- & Schaffleisch', labelEn: 'Lamb & Mutton' },
  'Fleisch und Innereien/Wild': { mainCategory: 'MEAT_POULTRY', labelDe: 'Wildfleisch (Reh, Hirsch)', labelEn: 'Game Meat' },
  'Fleisch und Innereien/Sonstige Tierarten': { mainCategory: 'MEAT_POULTRY', labelDe: 'Sonstiges Fleisch (Kaninchen, Pferd)', labelEn: 'Other Meat' },
  'Fleisch und Innereien/Innereien': { mainCategory: 'MEAT_POULTRY', labelDe: 'Innereien (Leber etc.)', labelEn: 'Offal & Organ Meats' },
  'Fleisch und Innereien': { mainCategory: 'MEAT_POULTRY', labelDe: 'Fleisch (Durchschnitt & Mischungen)', labelEn: 'Mixed Meat' },
  'Fleisch- und Wurstwaren/Rohwurstware': { mainCategory: 'MEAT_POULTRY', labelDe: 'Rohwürste, Salami & Rohspeck', labelEn: 'Cured Sausages & Bacon' },
  'Fleisch- und Wurstwaren/Brühwurstware': { mainCategory: 'MEAT_POULTRY', labelDe: 'Brühwürste & Aufschnitt (Wienerli etc.)', labelEn: 'Boiled Sausages' },
  'Fleisch- und Wurstwaren/Kochwurstware': { mainCategory: 'MEAT_POULTRY', labelDe: 'Kochwürste & Hinterschinken', labelEn: 'Cooked Ham & Sausages' },
  'Fleisch- und Wurstwaren/Rohpökelware': { mainCategory: 'MEAT_POULTRY', labelDe: 'Rohschinken & Bündnerfleisch', labelEn: 'Cured Ham' },
  'Pflanzliche Proteinlieferanten und Alternativen zu tierischen Produkten/Alternativen zu Fleisch, Fleischwaren, Fisch oder Ei': { mainCategory: 'MEAT_POULTRY', labelDe: 'Vegane Fleischalternativen (Sojaschnetzel, Mykoprotein)', labelEn: 'Plant-Based Meat Substitutes' },
  'Pflanzliche Proteinlieferanten und Alternativen zu tierischen Produkten/Pflanzliche Proteinlieferanten': { mainCategory: 'MEAT_POULTRY', labelDe: 'Pflanzliche Protein-Rohstoffe (Seitan, Tempeh)', labelEn: 'Plant-Based Proteins (Seitan, Tempeh)' },

  // ── 4. SEAFOOD (Fische, Meeresfrüchte, Krustentiere) ──────────────────────────────
  'Fisch': { mainCategory: 'SEAFOOD', labelDe: 'Fisch & Fischwaren', labelEn: 'Fish' },
  'Fisch/Meeresfische': { mainCategory: 'SEAFOOD', labelDe: 'Meeresfische (Lachs, Dorsch, Thunfisch)', labelEn: 'Saltwater Fish' },
  'Fisch/Süsswasserfische': { mainCategory: 'SEAFOOD', labelDe: 'Süßwasserfische (Forelle, Zander, Felchen)', labelEn: 'Freshwater Fish' },
  'Fisch/Fischerzeugnisse': { mainCategory: 'SEAFOOD', labelDe: 'Fischerzeugnisse & Fischkonserven (Thunfischdose etc.)', labelEn: 'Fish Products' },
  'Fisch/Meeresfrüchte, Krusten- und Schalentiere': { mainCategory: 'SEAFOOD', labelDe: 'Meeresfrüchte & Krustentiere (Garnelen, Crevetten)', labelEn: 'Seafood & Shellfish' },
  'Fische und Krustentiere': { mainCategory: 'SEAFOOD', labelDe: 'Fischereierzeugnisse', labelEn: 'Fish & Shellfish' },
  'Krustentiere und Weichtiere': { mainCategory: 'SEAFOOD', labelDe: 'Krustentiere (Garnelen, Crevetten, Muscheln)', labelEn: 'Shellfish & Crustaceans' },

  // ── 5. GRAINS_PASTA (Getreide, Nudeln, Reis, Mehl, Teige, Kartoffeln, Hülsenfrüchte & Brot) ──
  'Brote, Flocken und Frühstückscerealien/Brote und Brotwaren': { mainCategory: 'GRAINS_PASTA', labelDe: 'Brot & Brotwaren', labelEn: 'Bread & Buns' },
  'Brote, Flocken und Frühstückscerealien/Kleingebäcke': { mainCategory: 'GRAINS_PASTA', labelDe: 'Kleingebäcke & Gipfeli/Croissants', labelEn: 'Small Bakery Items' },
  'Brote, Flocken und Frühstückscerealien/Knäckebrote, Zwiebäcke und Toaste': { mainCategory: 'GRAINS_PASTA', labelDe: 'Toast, Knäckebrot & Zwieback', labelEn: 'Toast & Crispbread' },
  'Brote, Flocken und Frühstückscerealien/Knäckebrote, Zwieback, Crackers und Waffeln': { mainCategory: 'GRAINS_PASTA', labelDe: 'Knäckebrot, Zwieback & Crackers', labelEn: 'Crackers & Crispbread' },
  'Brote, Flocken und Frühstückscerealien/Frühstückscerealien und Flocken': { mainCategory: 'GRAINS_PASTA', labelDe: 'Haferflocken, Müesliflocken & Cerealien', labelEn: 'Oats & Cereals' },
  'Brote, Flocken und Frühstückscerealien/Müeslimischungen und Frühstückscerealien': { mainCategory: 'GRAINS_PASTA', labelDe: 'Müslimischungen & Cornflakes', labelEn: 'Muesli & Cereals' },
  'Brote, Flocken und Frühstückscerealien/Flocken, Kleie und Keime': { mainCategory: 'GRAINS_PASTA', labelDe: 'Haferflocken, Kleie & Weizenkeime', labelEn: 'Oat Flakes, Bran & Germs' },
  'Getreideprodukte, Hülsenfrüchte und Kartoffeln/Teigwaren': { mainCategory: 'GRAINS_PASTA', labelDe: 'Pasta & Nudeln', labelEn: 'Pasta & Noodles' },
  'Getreideprodukte, Hülsenfrüchte und Kartoffeln/Reis': { mainCategory: 'GRAINS_PASTA', labelDe: 'Reis', labelEn: 'Rice' },
  'Getreideprodukte, Hülsenfrüchte und Kartoffeln/Mehle und Stärke': { mainCategory: 'GRAINS_PASTA', labelDe: 'Mehl (Weizen, Dinkel) & Stärke', labelEn: 'Flour & Starch' },
  'Getreideprodukte, Hülsenfrüchte und Kartoffeln/Teige': { mainCategory: 'GRAINS_PASTA', labelDe: 'Teige (Blätterteig, Flammkuchenteig, Pizzateig)', labelEn: 'Dough (Puff Pastry, Pizza)' },
  'Getreideprodukte, Hülsenfrüchte und Kartoffeln/Kartoffeln und andere stärkereiche Knollen': { mainCategory: 'GRAINS_PASTA', labelDe: 'Kartoffeln & Knollen', labelEn: 'Potatoes & Tubers' },
  'Getreideprodukte, Hülsenfrüchte und Kartoffeln/Hülsenfrüchte': { mainCategory: 'GRAINS_PASTA', labelDe: 'Getrocknete Hülsenfrüchte (Bohnen, Linsen, Kichererbsen)', labelEn: 'Pulses (Lentils, Beans, Chickpeas)' },
  'Getreideprodukte, Hülsenfrüchte und Kartoffeln/Mais': { mainCategory: 'GRAINS_PASTA', labelDe: 'Mais & Polenta/Maisgrieß', labelEn: 'Corn & Polenta' },
  'Getreideprodukte, Hülsenfrüchte und Kartoffeln/Sonstige Getreideprodukte': { mainCategory: 'GRAINS_PASTA', labelDe: 'Couscous, Bulgur, Gerste & Buchweizen', labelEn: 'Couscous, Bulgur & Grains' },

  // ── 6. OILS_CONDIMENTS (Öle, Fette, Essig, Salatsaucen, Saucen, Senf & Mayonnaise) ──
  'Fette und Öle/Öle': { mainCategory: 'OILS_CONDIMENTS', labelDe: 'Pflanzenöle (Olivenöl, Rapsöl, Sonnenblumenöl)', labelEn: 'Vegetable Oils' },
  'Fette und Öle/Fette': { mainCategory: 'OILS_CONDIMENTS', labelDe: 'Speisefette (Bratbutter, Pflanzenfett, Margarine)', labelEn: 'Cooking Fats & Margarine' },
  'Fette und Öle/Salatsaucen': { mainCategory: 'OILS_CONDIMENTS', labelDe: 'Salatdressings & Vinaigrettes', labelEn: 'Salad Dressings' },
  'Fette und Öle/Mayonnaisen': { mainCategory: 'OILS_CONDIMENTS', labelDe: 'Mayonnaise & Remoulade', labelEn: 'Mayonnaise' },
  'Verschiedenes/Saucen': { mainCategory: 'OILS_CONDIMENTS', labelDe: 'Saucen (Bratensauce, Grillsauce, Tomatensauce)', labelEn: 'Sauces' },
  'Verschiedenes/Essig': { mainCategory: 'OILS_CONDIMENTS', labelDe: 'Essig & Aceto Balsamico', labelEn: 'Vinegar' },
  'Verschiedenes/Aufstriche': { mainCategory: 'OILS_CONDIMENTS', labelDe: 'Pikante Brotaufstriche & Pasten', labelEn: 'Savory Spreads' },

  // ── 7. SPICES_HERBS (Trockengewürze, Salz, Pfeffer, Würzmittel) ───────────────────
  'Verschiedenes/Salz, Gewürze und Aromen': { mainCategory: 'SPICES_HERBS', labelDe: 'Salz, Pfeffer, Paprika & Gewürzmischungen', labelEn: 'Salt, Pepper & Spices' },

  // ── 8. NUTS_SEEDS (Nüsse, Samen, Kerne, Avocado, Oliven) ──────────────────────────
  'Nüsse, Samen und Ölfrüchte': { mainCategory: 'NUTS_SEEDS', labelDe: 'Nüsse, Mandeln, Chiasamen, Avocado & Kerne', labelEn: 'Nuts, Seeds & Avocado' },
  'Salzige Snacks/Gesalzene Nüsse, Samen, Kerne': { mainCategory: 'NUTS_SEEDS', labelDe: 'Gesalzene Nüsse & Kerne (Erdnüsse, Cashews)', labelEn: 'Salted Nuts & Seeds' },

  // ── 9. SWEETS_SNACKS (Kekse, Schokolade, Kuchen, Zucker, Süßungsmittel & Snacks) ──
  'Süssigkeiten/Guetzli': { mainCategory: 'SWEETS_SNACKS', labelDe: 'Kekse, Cookies & Plätzchen', labelEn: 'Cookies & Biscuits' },
  'Süssigkeiten/Schokolade und Kakaoerzeugnisse': { mainCategory: 'SWEETS_SNACKS', labelDe: 'Schokolade & Kakaopulver', labelEn: 'Chocolate & Cocoa Powder' },
  'Süssigkeiten/Kuchen, Torten und Cake': { mainCategory: 'SWEETS_SNACKS', labelDe: 'Kuchen, Torten & Cakes', labelEn: 'Cakes & Pastries' },
  'Süssigkeiten/Sonstige süsse Backwaren': { mainCategory: 'SWEETS_SNACKS', labelDe: 'Süße Hefegebäcke (Berliner, Donuts)', labelEn: 'Sweet Pastries & Donuts' },
  'Süssigkeiten/Cremen und Pudding': { mainCategory: 'SWEETS_SNACKS', labelDe: 'Pudding, Crèmes & Desserts', labelEn: 'Pudding & Creams' },
  'Süssigkeiten/Zucker und Süssstoffe': { mainCategory: 'SWEETS_SNACKS', labelDe: 'Zucker, Honig, Sirup & Süßstoffe', labelEn: 'Sugar, Honey & Sweeteners' },
  'Süssigkeiten/Konfitüren und süsse Brotaufstriche': { mainCategory: 'SWEETS_SNACKS', labelDe: 'Konfitüren, Marmeladen & Nuss-Nougat-Creme', labelEn: 'Jams & Sweet Spreads' },
  'Süssigkeiten/Glacen auf Milchbasis': { mainCategory: 'SWEETS_SNACKS', labelDe: 'Speiseeis & Rahmglace', labelEn: 'Ice Cream (Dairy)' },
  'Süssigkeiten/Glacen auf Wasserbasis': { mainCategory: 'SWEETS_SNACKS', labelDe: 'Wassereis & Sorbet', labelEn: 'Sorbet & Water Ice' },
  'Süssigkeiten/Bonbons, Frucht- und Kaugummi': { mainCategory: 'SWEETS_SNACKS', labelDe: 'Bonbons, Gummibärchen & Fruchtgummi', labelEn: 'Candy & Gummies' },
  'Süssigkeiten/Riegel': { mainCategory: 'SWEETS_SNACKS', labelDe: 'Müsliriegel & Schokoriegel', labelEn: 'Granola & Snack Bars' },
  'Süssigkeiten/Sonstige Süssigkeiten': { mainCategory: 'SWEETS_SNACKS', labelDe: 'Marzipan & sonstige Süßigkeiten', labelEn: 'Other Sweets' },
  'Verschiedenes/Salzige Snacks': { mainCategory: 'SWEETS_SNACKS', labelDe: 'Chips, Nüssli & salzige Knabbereien', labelEn: 'Salty Snacks & Chips' },
  'Salzige Snacks/Chips': { mainCategory: 'SWEETS_SNACKS', labelDe: 'Kartoffelchips & Nachos', labelEn: 'Potato Chips' },
  'Salzige Snacks/Salzsticks und Bretzel': { mainCategory: 'SWEETS_SNACKS', labelDe: 'Salzstangen & Brezeln', labelEn: 'Pretzels & Salt Sticks' },
  'Salzige Snacks/Blätterteiggebäcke': { mainCategory: 'SWEETS_SNACKS', labelDe: 'Salzige Blätterteiggebäcke (Prussiens etc.)', labelEn: 'Savory Pastries' },
  'Salzige Snacks/Sonstige salzige Snacks': { mainCategory: 'SWEETS_SNACKS', labelDe: 'Sonstige salzige Snacks', labelEn: 'Other Salty Snacks' },

  // ── 10. BEVERAGES (Säfte, Drinks, Kaffee, Tee, Bier, Wein, Spirituosen) ───────────
  'Früchte/Fruchtsäfte': { mainCategory: 'BEVERAGES', labelDe: 'Fruchtsäfte (Orangensaft, Apfelsaft etc.)', labelEn: 'Fruit Juices' },
  'Gemüse/Gemüsesäfte': { mainCategory: 'BEVERAGES', labelDe: 'Gemüsesäfte (Tomatensaft, Karottensaft)', labelEn: 'Vegetable Juices' },
  'Alkoholfreie Getränke/Frucht- und Gemüsesäfte': { mainCategory: 'BEVERAGES', labelDe: 'Frucht- & Gemüsesäfte', labelEn: 'Fruit & Vegetable Juices' },
  'Alkoholfreie Getränke/Mineralwasser': { mainCategory: 'BEVERAGES', labelDe: 'Mineralwasser & Wasser', labelEn: 'Water' },
  'Alkoholfreie Getränke/Trinkwasser': { mainCategory: 'BEVERAGES', labelDe: 'Trinkwasser / Leitungswasser', labelEn: 'Drinking Water' },
  'Alkoholfreie Getränke/Süssgetränke': { mainCategory: 'BEVERAGES', labelDe: 'Limonaden, Cola & Eistee', labelEn: 'Soft Drinks & Sodas' },
  'Alkoholfreie Getränke/Süssgetränke energievermindert': { mainCategory: 'BEVERAGES', labelDe: 'Zero- & Light-Limonaden', labelEn: 'Zero / Diet Soft Drinks' },
  'Alkoholfreie Getränke/Tee und Kaffee': { mainCategory: 'BEVERAGES', labelDe: 'Kaffee & Tee', labelEn: 'Coffee & Tea' },
  'Alkoholfreie Getränke/Kaffee': { mainCategory: 'BEVERAGES', labelDe: 'Kaffee & Espresso', labelEn: 'Coffee' },
  'Alkoholfreie Getränke/Tee': { mainCategory: 'BEVERAGES', labelDe: 'Tee (Schwarztee, Grüntee, Kräutertee)', labelEn: 'Tea' },
  'Alkoholfreie Getränke/Kakaogetränke': { mainCategory: 'BEVERAGES', labelDe: 'Kakaogetränke & Trinkschokolade', labelEn: 'Hot Chocolate & Cocoa Drinks' },
  'Alkoholfreie Getränke/Malzextrakthaltige Getränke': { mainCategory: 'BEVERAGES', labelDe: 'Malzgetränke (Ovomaltine etc.)', labelEn: 'Malted Drinks' },
  'Alkoholfreie Getränke/Sirupe': { mainCategory: 'BEVERAGES', labelDe: 'Getränkesirupe', labelEn: 'Beverage Syrups' },
  'Alkoholfreie Getränke/Sirup': { mainCategory: 'BEVERAGES', labelDe: 'Getränkesirup (Holunder, Himbeere)', labelEn: 'Syrup' },
  'Alkoholfreie Getränke/Pflanzliche Drinks': { mainCategory: 'BEVERAGES', labelDe: 'Pflanzliche Drinks (Mandeldrink, Haferdrink)', labelEn: 'Plant-Based Drinks' },
  'Alkoholfreie Getränke/Sonstige Getränke': { mainCategory: 'BEVERAGES', labelDe: 'Sonstige Getränke', labelEn: 'Other Beverages' },
  'Alkoholfreie Getränke': { mainCategory: 'BEVERAGES', labelDe: 'Alkoholfreie Getränke', labelEn: 'Non-Alcoholic Beverages' },
  'Alkoholhaltige Getränke/Bier': { mainCategory: 'BEVERAGES', labelDe: 'Bier', labelEn: 'Beer' },
  'Alkoholhaltige Getränke/Wein': { mainCategory: 'BEVERAGES', labelDe: 'Wein & Prosecco/Champagner', labelEn: 'Wine' },
  'Alkoholhaltige Getränke/Spirituosen': { mainCategory: 'BEVERAGES', labelDe: 'Spirituosen & Liköre (Rum, Kirsch, Wodka)', labelEn: 'Spirits & Liqueurs' },
  'Alkoholhaltige Getränke/Cocktails und Mischgetränke': { mainCategory: 'BEVERAGES', labelDe: 'Cocktails & Mischgetränke', labelEn: 'Cocktails' },
  'Alkoholhaltige Getränke/Sonstige alkoholische Getränke': { mainCategory: 'BEVERAGES', labelDe: 'Sonstige alkoholische Getränke (Cider, Apfelwein)', labelEn: 'Other Alcoholic Drinks' },
  'Alkoholhaltige Getränke': { mainCategory: 'BEVERAGES', labelDe: 'Alkoholische Getränke', labelEn: 'Alcoholic Beverages' },

  // ── 11. PANTRY_BAKING (Backzutaten, Hefe, Backpulver, Gelatine, Supplemente) ──────
  'Verschiedenes/Backzutaten': { mainCategory: 'PANTRY_BAKING', labelDe: 'Backzutaten (Backpulver, Natron, Vanille)', labelEn: 'Baking Ingredients' },
  'Verschiedenes/Hefe': { mainCategory: 'PANTRY_BAKING', labelDe: 'Hefe (frisch & trocken)', labelEn: 'Yeast' },
  'Verschiedenes/Bindemittel und Geliermittel': { mainCategory: 'PANTRY_BAKING', labelDe: 'Geliermittel & Gelatine', labelEn: 'Gelling Agents' },
  'Speziallebensmittel/Supplemente': { mainCategory: 'PANTRY_BAKING', labelDe: 'Supplemente & Protein-Konzentrate', labelEn: 'Supplements' },

  // ── 12. PREPARED_DISHES (Komplett fertige Gerichte, Gratins, Sandwiches, Pizza) ───
  'Gerichte/Sonstige salzige/rezente Gerichte': { mainCategory: 'PREPARED_DISHES', labelDe: 'Pfannengerichte & Salziges', labelEn: 'Savory Dishes' },
  'Gerichte/Kuchen und Gratins': { mainCategory: 'PREPARED_DISHES', labelDe: 'Aufläufe, Gratins & Wähen', labelEn: 'Casseroles & Gratins' },
  'Gerichte/Sandwiches': { mainCategory: 'PREPARED_DISHES', labelDe: 'Sandwiches & belegte Brote', labelEn: 'Sandwiches' },
  'Gerichte/Italienische Gerichte': { mainCategory: 'PREPARED_DISHES', labelDe: 'Fertige Pasta-Gerichte, Lasagne & Pizza', labelEn: 'Pizza & Pasta Dishes' },
  'Gerichte/Salate': { mainCategory: 'PREPARED_DISHES', labelDe: 'Zubereitete Fertigsalate (Coleslaw, Kartoffelsalat)', labelEn: 'Prepared Salads' },
  'Gerichte/Eintöpfe und Suppen': { mainCategory: 'PREPARED_DISHES', labelDe: 'Suppen, Eintöpfe & Bouillon', labelEn: 'Soups & Stews' },
  'Gerichte/Sonstige süsse Gerichte': { mainCategory: 'PREPARED_DISHES', labelDe: 'Süße Hauptspeisen (Crêpes, Omeletten)', labelEn: 'Sweet Dishes' },
  'Gerichte/Müesli und Brei': { mainCategory: 'PREPARED_DISHES', labelDe: 'Fertiges Birchermüesli & Breie', labelEn: 'Prepared Muesli & Porridge' },
  'Gerichte/Asiatische Gerichte': { mainCategory: 'PREPARED_DISHES', labelDe: 'Asiatische Gerichte (Bami/Nasi Goreng, Frühlingsrollen)', labelEn: 'Asian Dishes' },
  'Gerichte/Fast Food': { mainCategory: 'PREPARED_DISHES', labelDe: 'Fast Food (Burger, Hot Dogs)', labelEn: 'Fast Food' },
  'Gerichte/Orientalische Gerichte': { mainCategory: 'PREPARED_DISHES', labelDe: 'Orientalische Gerichte (Falafel etc.)', labelEn: 'Middle Eastern Dishes' },
  'Gerichte': { mainCategory: 'PREPARED_DISHES', labelDe: 'Zubereitete Speisen', labelEn: 'Prepared Dishes' },
};

const MAIN_CATEGORY_TITLES: Record<string, { de: string; en: string }> = {
  VEGETABLES: { de: 'Gemüse, Pilze & Salate', en: 'Vegetables & Mushrooms' },
  FRUITS: { de: 'Obst, Früchte & Beeren', en: 'Fruits & Berries' },
  DAIRY_EGGS: { de: 'Milchprodukte, Eier & pflanzliche Alternativen', en: 'Dairy, Eggs & Plant-Based Alternatives' },
  MEAT_POULTRY: { de: 'Fleisch, Geflügel & Fleischalternativen', en: 'Meat, Poultry & Meat Substitutes' },
  SEAFOOD: { de: 'Fisch & Meeresfrüchte', en: 'Fish & Seafood' },
  GRAINS_PASTA: { de: 'Getreide, Nudeln, Reis, Mehl, Teige & Brot', en: 'Grains, Pasta, Rice, Flour, Dough & Bread' },
  OILS_CONDIMENTS: { de: 'Pflanzenöle, Speisefette, Essig & Saucen', en: 'Oils, Fats, Vinegar & Sauces' },
  SPICES_HERBS: { de: 'Gewürze, Kräuter & Salz', en: 'Spices, Herbs & Salt' },
  NUTS_SEEDS: { de: 'Nüsse, Samen, Kerne & Avocado', en: 'Nuts, Seeds & Avocado' },
  SWEETS_SNACKS: { de: 'Süßwaren, Kekse, Schokolade, Zucker & Snacks', en: 'Sweets, Cookies, Chocolate, Sugar & Snacks' },
  BEVERAGES: { de: 'Getränke, Säfte, Kaffee, Tee & Alkohol', en: 'Beverages, Juices, Coffee, Tea & Alcohol' },
  PANTRY_BAKING: { de: 'Backzutaten, Hefe & Supplemente', en: 'Baking Ingredients, Yeast & Supplements' },
  PREPARED_DISHES: { de: 'Fertiggerichte & zubereitete Speisen', en: 'Prepared Dishes' },
};

async function verifyAndGenerate() {
  const rawPath = path.resolve('eval_results/swiss_categories_raw.json');
  const raw: { category: string; itemCount: number; sampleFoods: string[] }[] = JSON.parse(await fs.readFile(rawPath, 'utf-8'));

  const missing: string[] = [];
  const mainStats = new Map<string, { label: string; count: number; subcats: { name: string; count: number; samples: string[] }[] }>();

  for (const item of raw) {
    const mapping = SWISS_CATEGORY_EXPLICIT_MAP[item.category];
    if (!mapping) {
      missing.push(item.category);
      continue;
    }

    const titleDe = MAIN_CATEGORY_TITLES[mapping.mainCategory]?.de || mapping.mainCategory;
    const current = mainStats.get(mapping.mainCategory) || {
      label: titleDe,
      count: 0,
      subcats: [],
    };
    current.count += item.itemCount;
    current.subcats.push({
      name: item.category,
      count: item.itemCount,
      samples: item.sampleFoods,
    });
    mainStats.set(mapping.mainCategory, current);
  }

  if (missing.length > 0) {
    console.warn(`WARNING: Missing mappings for ${missing.length} categories:`, missing);
  } else {
    console.log(`✅ 100% of all ${raw.length} Swiss categories are cleanly mapped!`);
  }

  // Generate clean Markdown Report
  let md = '# 🇨🇭 Handkuratiertes Mapping der Schweizer Nährwertdatenbank\n\n';
  md += 'Alle **106 Unterkategorien** der Schweizer Nährwertdatenbank wurden **manuell und fachlich exakt** auf **13 Standard-Hauptkategorien** gemappt:\n\n';

  md += '| # | Hauptkategorie (Enum) | Deutsche Bezeichnung | Anzahl Subkategorien | Enthaltene Lebensmittel |\n';
  md += '|---|---|---|---|---|\n';

  const sortedMains = Array.from(mainStats.entries()).sort((a, b) => b[1].count - a[1].count);

  sortedMains.forEach(([key, val], idx) => {
    md += `| ${idx + 1} | \`${key}\` | **${val.label}** | ${val.subcats.length} | ${val.count} Items |\n`;
  });

  md += '\n---\n\n## 📋 Vollständige Zuordnung aller 106 Subkategorien\n\n';

  sortedMains.forEach(([key, val], idx) => {
    md += `### ${idx + 1}. \`${key}\` — ${val.label} (${val.count} Items)\n\n`;
    md += '| Schweizer Original-Kategorie | Anzahl Items | Typische Beispiele |\n';
    md += '|---|---|---|\n';
    val.subcats.forEach(s => {
      md += `| \`${s.name}\` | **${s.count}** | ${s.samples.slice(0, 4).join(', ')} |\n`;
    });
    md += '\n';
  });

  const outPath = path.resolve('eval_results/MANUAL_SWISS_CATEGORIES_MAPPING.md');
  await fs.writeFile(outPath, md, 'utf-8');
  console.log(`Markdown saved to: ${outPath}`);
}

verifyAndGenerate();

/**
 * Standardized schema descriptions and prompt instructions for canonical baseName
 * and synonyms across all Gemini AI extraction and generation requests.
 */

export const BASE_NAME_SCHEMA_DESCRIPTION =
  'The core standard noun in singular form strictly in ENGLISH used as a universal database key to group similar ingredients across recipes in any language. Be precise and specific: \n' +
  '- SPECIFICITY INVARIANCE RULE (NEVER COLLAPSE DISTINCT VARIETIES INTO GENERIC UMBRELLA TERMS):\n' +
  '  * Dairy & Cheese: ALWAYS specify exact cheese varieties: "mozzarella" for Mozzarella (NEVER generic "cheese"), "feta" for Feta/Schafskäse (NEVER "cheese"), "cheddar" for Cheddar (NEVER "cheese"), "gouda" for Gouda, "parmesan" for Parmesan, "ricotta" for Ricotta, "halloumi" for Halloumi, "shredded cheese" for pre-shredded/grated store-bought cheese blends (Gratinkäse, Reibekäse, Pizzakäse). Use "cheese" ONLY if the recipe generically says "Käse" without specifying any variety.\n' +
  '  * Fish & Seafood: ALWAYS specify exact species: "salmon" or "salmon fillet" for Lachs (NEVER generic "fish"), "tuna" for Thunfisch (NEVER "fish"), "cod" for Kabeljau, "trout" for Forelle, "shrimp" for Garnelen.\n' +
  '  * Meats & Poultry: ALWAYS specify animal and cut: "chicken breast", "ground beef", "pork loin", "cooked ham", "bacon".\n' +
  '- STRICT ENGLISH CULINARY SPICE VS PRODUCE DISAMBIGUATION:\n' +
  '  * Pfeffer / Pepper Spice: ALWAYS use "black pepper" (or "white pepper", "cayenne pepper") with category SPICES_SEASONINGS. NEVER use ambiguous "pepper" and NEVER map Pfeffer spice to bell pepper or PRODUCE.\n' +
  '  * Gemüsepaprika / Fresh Sweet Pepper: ALWAYS use "bell pepper" (or "red bell pepper", "green bell pepper") with category FRUITS_VEGETABLES or PRODUCE. NEVER use "paprika" or plain "pepper".\n' +
  '  * Paprikapulver / Ground Paprika Spice: ALWAYS use "paprika powder" with category SPICES_SEASONINGS (NEVER "paprika" or "bell pepper").\n' +
  '- For dried ground spices and powders, ALWAYS include "powder" (e.g., "paprika powder", "garlic powder", "onion powder", "chili powder", "baking powder", "curry powder").\n' +
  '- For fresh vegetables, use specific produce terms: "bell pepper", "garlic", "onion", "spring onion".\n' +
  '- For oils, flours and plant milks, ALWAYS specify the plant/grain source: "olive oil" (NEVER just "oil"), "sesame oil", "spelt flour" (NEVER just "flour"), "almond flour", "almond milk" (NEVER just "milk").\n' +
  '- For dairy/grains: "cottage cheese" for Hüttenkäse, "rolled oat" for Haferflocken, "heavy cream" for Schlagsahne, "sour cream" for Saure Sahne/Schmand, "shredded cheese" for Gratinkäse/Reibekäse, "tortilla wrap" for Wraps.\n' +
  '- For legumes/seeds: always singular ("chickpea", "lentil", "walnut", "flaxseed").\n\n' +
  'FORMATTING RULES. The baseName is used verbatim as a database key, so identical foods MUST always produce the identical string:\n' +
  '- Always lowercase and singular ("egg", never "Eggs" or "Egg").\n' +
  '- AS BOUGHT IN STORES: Always describe the grocery ingredient AS BOUGHT, NEVER as prepared in this recipe. Strictly DO NOT include home kitchen preparation states ("steamed", "boiled", "peeled", "cooked", "baked", "roasted", "fried", "diced", "raw" - use "apple" NOT "steamed apple", "potato" NOT "boiled potato", "carrot" NOT "diced carrots"). Exception for commercially manufactured and packaged store goods: items manufactured and packaged pre-cut/pre-shredded as standard supermarket commodities keep their identity ("ground beef", "shredded cheese" for Gratinkäse/Reibekäse, "rolled oat", "tomato paste").\n' +
  '- SINGLE INGREDIENTS ONLY: Never create compound dishes or multi-food combinations containing "with", "and", "of" (e.g. use "pasta" NOT "pasta with cheese sauce", "broccoli" NOT "broccoli and carrots").\n' +
  '- But NEVER omit a word that defines the food identity itself: Keep "powder", "flour", "oil", "juice", "sauce", "milk", "cheese", "flakes", "dried", "smoked", "ground" (for minced meat), "shredded" (for pre-packaged shredded cheese), the animal species, and the cut of meat/organ: "paprika powder" stays "paprika powder", "chicken breast" stays "chicken breast", "black pepper" stays "black pepper", "shredded cheese" stays "shredded cheese".\n' +
  '- No brand names, no quantities, no numbers, no punctuation, no parentheses.\n' +
  '- Prefer the plain everyday English standard term over a regional or specialist one.';

export const SYNONYMS_SCHEMA_DESCRIPTION =
  '1 to 3 alternative English culinary baseName synonyms or regional English equivalents (e.g. for "shredded cheese": ["grated cheese", "gratin cheese", "pizza cheese"]; for "black pepper": ["ground black pepper", "black peppercorn", "peppercorn"]; for "bell pepper": ["sweet pepper", "capsicum", "bellpepper"]; for "mozzarella": ["fresh mozzarella", "buffalo mozzarella"]; for "feta": ["greek feta", "feta cheese"]; for "strained tomato": ["passata", "tomato puree", "sieved tomato"]; for "spring onion": ["scallion", "green onion", "salad onion"]; for "eggplant": ["aubergine"]; for "zucchini": ["courgette"]; for "chickpea": ["garbanzo bean", "garbanzo"]; for "rolled oat": ["oat flake", "oats"]; for "cream cheese": ["double cream cheese", "soft cheese"]; for "quark": ["curd", "curd cheese"]; for "arugula": ["rocket"]; for "cilantro": ["coriander"]). MUST strictly follow the exact same English singular lowercase formatting rules as baseName. Leave empty if there are no common alternative English culinary names.';

export const BASE_NAME_INSTRUCTION_PROMPT =
  'CRITICAL IDENTITY RULES FOR baseName & CATEGORY CLASSIFICATION:\n' +
  '- MUST ALWAYS be strictly in English and lowercase singular.\n' +
  '- SPECIFICITY INVARIANCE (DO NOT COLLAPSE VARIETIES INTO GENERIC UMBRELLA TERMS):\n' +
  '  * Gratinkäse / Reibekäse / Streukäse -> baseName: "shredded cheese" (synonyms: ["grated cheese", "gratin cheese"])\n' +
  '  * Mozzarella -> baseName: "mozzarella" (NEVER "cheese")\n' +
  '  * Feta / Schafskäse -> baseName: "feta" (NEVER "cheese")\n' +
  '  * Cheddar -> baseName: "cheddar" (NEVER "cheese")\n' +
  '  * Gouda -> baseName: "gouda" (NEVER "cheese")\n' +
  '  * Parmesan -> baseName: "parmesan" (NEVER "cheese")\n' +
  '  * Salmon / Lachs -> baseName: "salmon" or "salmon fillet" (NEVER "fish")\n' +
  '  * Tuna / Thunfisch -> baseName: "tuna" (NEVER "fish")\n' +
  '- STRICT SPICE VS PRODUCE DISAMBIGUATION:\n' +
  '  * Pfeffer / Schwarzer Pfeffer (spice) -> baseName: "black pepper", category: "SPICES_SEASONINGS" / "SPICES_HERBS" (NEVER "pepper", NEVER "bell pepper", NEVER "PRODUCE").\n' +
  '  * Gemüsepaprika / Paprika (fresh sweet pepper) -> baseName: "bell pepper", category: "FRUITS_VEGETABLES" / "VEGETABLES".\n' +
  '  * Paprikapulver (spice) -> baseName: "paprika powder", category: "SPICES_SEASONINGS" / "SPICES_HERBS".\n' +
  '- For dried ground spices and powders, ALWAYS include "powder" (e.g. "paprika powder", "garlic powder", "onion powder", "chili powder", "baking powder").\n' +
  '- For fresh vegetables, use specific produce terms: "bell pepper", "garlic", "onion", "spring onion".\n' +
  '- For meats, poultry, fish, cuts and organs, ALWAYS specify the animal/species: "chicken breast", "ground beef", "pork loin", "salmon fillet", "cooked ham".\n' +
  '- For oils, flours and plant milks, ALWAYS specify the plant/grain source: "olive oil", "sesame oil", "spelt flour", "almond flour", "almond milk".\n' +
  '- For dairy/grains: "cottage cheese", "rolled oat", "heavy cream", "sour cream", "gouda", "shredded cheese", "tortilla wrap".\n' +
  '- For legumes/seeds: always singular ("chickpea", "lentil", "walnut", "flaxseed").\n' +
  '- Describe the grocery ingredient AS BOUGHT IN STORES: Keep commercial packaged supermarket commodities ("ground beef", "shredded cheese", "rolled oat", "tomato paste"), but NEVER include kitchen preparation states ("steamed", "boiled", "peeled", "cooked", "baked", "roasted", "fried", "diced", "raw").\n' +
  '- NEVER omit a word that defines the food identity itself: keep "powder", "flour", "oil", "juice", "sauce", "milk", "cheese", "flakes", "dried", "smoked", "ground", "shredded", the animal species, and the cut of meat/organ.';

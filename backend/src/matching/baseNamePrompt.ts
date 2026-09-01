/**
 * Standardized schema descriptions and prompt instructions for canonical baseName
 * and synonyms across all Gemini AI extraction and generation requests.
 */

export const BASE_NAME_SCHEMA_DESCRIPTION =
  'The core standard noun in singular form strictly in ENGLISH used as a universal database key to group similar ingredients across recipes in any language. Be precise and specific: \n' +
  '- For dried ground spices and powders, ALWAYS include "powder" (e.g., "paprika powder" for Paprikapulver, "garlic powder" for Knoblauchpulver, "onion powder" for Zwiebelpulver, "chili powder" for Chilipulver, "baking powder" for Backpulver; NEVER use "paprika" for powder as "paprika" refers to fresh bell pepper).\n' +
  '- For fresh vegetables, use specific produce terms: "bell pepper" or "red bell pepper" for Gemüsepaprika, "garlic" for Knoblauch, "onion" for Zwiebel, "spring onion" for Frühlingszwiebel/Lauchzwiebel.\n' +
  '- For meats, poultry, fish, cuts and organs, ALWAYS specify the animal/species: "chicken heart" (NEVER just "heart"), "beef liver" (NEVER just "liver"), "beef tongue" (NEVER just "tongue"), "chicken breast" (NEVER just "breast"), "ground chicken" for Hähnchenhackfleisch, "ground beef" for Rinderhack, "pork loin" (NEVER just "loin"), "salmon fillet" (NEVER just "fillet"), "cooked ham" for Kochschinken vs "cured ham"/"bacon" for Rohschinken/Speck.\n' +
  '- For oils, flours and plant milks, ALWAYS specify the plant/grain source: "olive oil" (NEVER just "oil"), "sesame oil", "spelt flour" (NEVER just "flour"), "almond flour", "almond milk" (NEVER just "milk").\n' +
  '- For dairy/grains: "cottage cheese" for Hüttenkäse/körniger Frischkäse, "rolled oat" for Haferflocken, "heavy cream" for Schlagsahne, "sour cream" for Saure Sahne/Schmand, "gouda" or "shredded cheese" for generic geriebener Käse, "tortilla wrap" for Wraps/Fladenbrot vs "tortilla chips" for Nachos.\n' +
  '- For legumes/seeds: always singular ("chickpea", "lentil", "walnut", "flaxseed").\n\n' +
  'FORMATTING RULES. The baseName is used verbatim as a database key, so identical foods MUST always produce the identical string:\n' +
  '- Always lowercase and singular ("egg", never "Eggs" or "Egg").\n' +
  '- AS BOUGHT IN STORES: Always describe the grocery ingredient AS BOUGHT, NEVER as prepared in this recipe. Strictly DO NOT include cooking states ("steamed", "boiled", "peeled", "cooked", "baked", "roasted", "canned", "fried", "diced", "grated", "raw" - use "apple" NOT "steamed apple", "potato" NOT "boiled potato", "carrot" NOT "diced carrots").\n' +
  '- SINGLE INGREDIENTS ONLY: Never create compound dishes or multi-food combinations containing "with", "and", "of" (e.g. use "pasta" NOT "pasta with cheese sauce", "broccoli" NOT "broccoli and carrots").\n' +
  '- But NEVER omit a word that defines the food identity itself: Keep "powder", "flour", "oil", "juice", "sauce", "milk", "cheese", "flakes", "dried", "smoked", "ground" (for minced meat), the animal species, and the cut of meat/organ: "paprika powder" stays "paprika powder", "chicken breast" stays "chicken breast", "chicken heart" stays "chicken heart".\n' +
  '- No brand names, no quantities, no numbers, no punctuation, no parentheses.\n' +
  '- Prefer the plain everyday English standard term over a regional or specialist one.';

export const SYNONYMS_SCHEMA_DESCRIPTION =
  '1 to 3 alternative English culinary baseName synonyms or regional English equivalents (e.g. for "strained tomato": ["passata", "tomato puree", "sieved tomato"]; for "spring onion": ["scallion", "green onion", "salad onion"]; for "eggplant": ["aubergine"]; for "zucchini": ["courgette"]; for "chickpea": ["garbanzo bean", "garbanzo"]; for "rolled oat": ["oat flake", "oats"]; for "cream cheese": ["double cream cheese", "soft cheese"]; for "quark": ["curd", "curd cheese"]; for "arugula": ["rocket"]; for "bell pepper": ["sweet pepper", "capsicum"]; for "cilantro": ["coriander"]). MUST strictly follow the exact same English singular lowercase formatting rules as baseName. Leave empty if there are no common alternative English culinary names.';

export const BASE_NAME_INSTRUCTION_PROMPT =
  'CRITICAL IDENTITY RULES FOR baseName:\n' +
  '- MUST ALWAYS be strictly in English and lowercase singular.\n' +
  '- For dried ground spices and powders, ALWAYS include "powder" (e.g. "paprika powder", "garlic powder", "onion powder", "chili powder", "baking powder").\n' +
  '- For fresh vegetables, use specific produce terms: "bell pepper", "garlic", "onion", "spring onion".\n' +
  '- For meats, poultry, fish, cuts and organs, ALWAYS specify the animal/species: "chicken heart" (NEVER just "heart"), "beef liver" (NEVER just "liver"), "beef tongue" (NEVER just "tongue"), "chicken breast" (NEVER just "breast"), "ground chicken", "ground beef", "pork loin", "salmon fillet", "cooked ham".\n' +
  '- For oils, flours and plant milks, ALWAYS specify the plant/grain source: "olive oil" (NEVER just "oil"), "sesame oil", "spelt flour" (NEVER just "flour"), "almond flour", "almond milk" (NEVER just "milk").\n' +
  '- For dairy/grains: "cottage cheese", "rolled oat", "heavy cream", "sour cream", "gouda", "tortilla wrap".\n' +
  '- For legumes/seeds: always singular ("chickpea", "lentil", "walnut", "flaxseed").\n' +
  '- Describe the grocery ingredient AS BOUGHT IN STORES, NEVER with cooking states ("steamed", "boiled", "peeled", "cooked", "baked", "roasted", "canned", "fried", "diced", "grated", "raw").\n' +
  '- NEVER omit a word that defines the food identity itself: keep "powder", "flour", "oil", "juice", "sauce", "milk", "cheese", "flakes", "dried", "smoked", "ground", the animal species, and the cut of meat/organ.';

import { config } from '../config.js';
import { BASE_NAME_INSTRUCTION_PROMPT } from '../matching/baseNamePrompt.js';
import { FOOD_PHOTOGRAPHY_PROMPT_INSTRUCTION } from './foodPhotographyPrompt.js';

export interface UserPreferences {
  recipeLanguage?: string;
  preferredTemperatureUnit?: string;
  preferredUnitSystem?: string;
}

export const CLEAN_INGREDIENT_NAMES_INSTRUCTION =
  'Ensure the "name" field contains the concrete retail grocery product as bought in stores, stripped of brand names, quantities, numbers, and units (e.g. use "Frischkäse" instead of "Philadelphia Frischkäse", "Gouda" instead of "Leerdammer Gouda", "Salatcreme" instead of "Miracle Whip Balance", "Butter" instead of "Leichte Butter", "Parmesan" instead of "Parmesan, gerieben"). PRODUCT FORM & IDENTITY INVARIANCE: NEVER collapse confectioned supermarket commodities into raw umbrella terms: if an ingredient is sold in a distinct physical form, cut, or industrial confection, "name" MUST specify that retail commodity form and NEVER collapse to the generic raw commodity umbrella term (e.g. use "Gratinkäse" / "Reibekäse" / "shredded cheese", NEVER generic "Käse" / "cheese"; use "Rinderhackfleisch" / "ground beef", NEVER generic "Rindfleisch" / "beef"; use "Tomatenmark" / "tomato paste", NEVER generic "Tomate"; use "Haferflocken" / "rolled oats", NEVER generic "Hafer"; use "Paniermehl" / "breadcrumbs", NEVER generic "Brot"; use "Röstzwiebeln" / "fried onions", NEVER generic "Zwiebel"). Retain commercial compound nouns (e.g. "Gratinkäse", "Reibekäse", "Pizzakäse", "Streukäse", "Paprikapulver", "Knoblauchpulver", "Backpulver", "Mandelmehl", "Olivenöl", "Tomatenmark", "Kochschinken", "Schlagsahne", "Frischkäse"). Move manufacturer/brand names (e.g. "Eat Lean", "Philadelphia", "Nutella", "Alpro", "Exquisa", "Oatly", "Buko", "More Nutrition") into the "brand" field. Move only shopping-relevant attributes (e.g. "fettreduziert", "zuckerfrei", "mager", "leicht", "light", "low fat", "ohne Knochen", "Bio", "TK") into the "modifier" field.';

export const CATEGORY_ORDERING_INSTRUCTION =
  'Group ingredients using the standardized supermarket category keys: VEGETABLES (fresh vegetables/salads/mushrooms/fresh herbs), FRUITS (fresh/dried fruits/berries), DAIRY_EGGS (milk/cheese/yogurt/cream/butter/eggs/tofu/plant milk), MEAT_POULTRY (meat/chicken/sausages/vegan meat), SEAFOOD (fish/seafood), GRAINS_PASTA (pasta/rice/flour/dough/bread/oats/potatoes), OILS_CONDIMENTS (cooking oils/vinegar/dressings/store-bought sauces/pesto), SPICES_HERBS (salt/pepper/dried spices/ground spice powders), NUTS_SEEDS (nuts/seeds/avocado), SWEETS_SNACKS (sugar/honey/chocolate/cookies/ice cream/chips), BEVERAGES (drinks/juices/coffee/tea/alcohol), PANTRY_BAKING (yeast/baking powder/gelatine/protein powder), PREPARED_DISHES (ready meals).';

export const INGREDIENT_DECOMPOSITION_INSTRUCTION =
  'Decompose homemade elements (like a custom marinade, dressing, or sauce prepared from raw ingredients in the video) into their individual raw ingredients. However, if the recipe uses a pre-made or store-bought condiment/sauce directly (e.g., "1 EL Pesto", "2 EL Hummus", "100g Pizzasauce", "Ketchup", "Sojasauce"), you MUST keep it as ONE single ingredient in the list.';

export const STAPLE_INGREDIENT_INSTRUCTION =
  'For each ingredient, set the "isStaple" boolean to true ONLY if it is a very common basic staple that people almost always already have at home and rarely need to buy specifically for a recipe (e.g. salt, pepper, water, cooking oil, sugar, common dried spices). Set it to false for anything a user would typically need to shop for (e.g. meat, cheese, vegetables, fresh herbs, specialty items). When in doubt, set it to false.';

export const COOKED_VS_RAW_INSTRUCTION =
  'For ingredients that expand significantly during cooking (e.g., rice, pasta, lentils, beans, chickpeas, couscous, quinoa, bulgur), you MUST determine whether the specified quantity refers to the dry/uncooked state or the cooked/prepared state. Dry/uncooked state (e.g., "100g uncooked rice" or "100g rice" which is boiled in the instructions) has high caloric density (e.g., dry rice: ~350 kcal/100g, dry pasta: ~350 kcal/100g, dry lentils: ~350 kcal/100g). Cooked/prepared state (e.g., "100g cooked rice", "100g boiled pasta", canned/pre-cooked beans, or when already-cooked ingredients are added directly to a stir-fry/bowl) has much lower caloric density (e.g., cooked rice: ~130 kcal/100g, cooked pasta: ~130-150 kcal/100g, cooked lentils: ~110-120 kcal/100g). Ambiguity resolution: Analyze the cooking instructions. If the instructions include boiling/cooking the dry ingredient, calculate using dry/raw values. If the ingredient is added pre-cooked, or if treating it as raw results in absurdly high calories (e.g., 250g dry rice is ~850 kcal and cooks to 750g cooked rice, which is way too much for a single serving of fried rice), assume the quantity represents the cooked state and calculate using cooked values.';

export function getPromptUnitInstructions(userPrefs?: UserPreferences) {
  const targetTempUnit = userPrefs?.preferredTemperatureUnit || config.PREFERRED_TEMPERATURE_UNIT;
  const targetUnitSystem = userPrefs?.preferredUnitSystem || config.PREFERRED_UNIT_SYSTEM;
  const targetLanguage = userPrefs?.recipeLanguage || config.RECIPE_LANGUAGE;

  const tempInstruction = targetTempUnit.toLowerCase() === 'both'
    ? 'Format all temperature values mentioned in the instructions, description, tips, or title using both Celsius and Fahrenheit (e.g., "200°C (400°F)").'
    : `Format all temperature values mentioned in the instructions, description, tips, or title using the preferred unit: ${targetTempUnit} (e.g., convert and format as "200°C" or "400°F" depending on preference).`;

  const unitSystemInstruction = `Format all ingredient weights, volumes, and measurements using the preferred unit system: ${targetUnitSystem} (e.g., metric units like grams, milliliters, kilograms, or imperial units like ounces, cups, pounds, fluid ounces) and perform conversions where appropriate.`;

  const languageInstruction = `Write and translate all text values (including title, description, ingredient names/notes, instruction steps, equipment list, tips, alternative ingredient details, and tags) into: ${targetLanguage}. Keep the category keys as the uppercase English enum values. Follow the schema strictly.`;

  return {
    targetLanguage,
    tempInstruction,
    unitSystemInstruction,
    languageInstruction,
  };
}

const PHOTO_SOURCE_RULES = `
Special Handling for Photographed Physical Sources (Cookbook / Card Photos):
The photos are pages/sides of ONE single recipe in the order given.
a) A recipe continued across a second photo (or the back of a card) is still ONE recipe — do NOT set "containsMultipleRecipes" for that. Set it to true ONLY if the photos genuinely show two or more DIFFERENT dishes, each with its own title and its own ingredient list.
b) Ignore page furniture that is not part of the recipe: page numbers, running headers/footers, book or chapter titles, unrelated recipes partially visible at the edge of the page, and handwritten notes unrelated to cooking.
c) The photos may be skewed, rotated, curved along a book spine, or affected by glare and shadow — read through those distortions.
d) Transcribe amounts, units and oven temperatures EXACTLY as written. Do not round them and do not convert beyond the requested unit system.
e) If a word or an amount is genuinely illegible, leave that field empty instead of inventing a plausible value. NEVER invent ingredients or steps that are not written on the page or clearly implied by the written steps.
f) Old recipe cards are written tersely (e.g. "Butter, Zucker, Eier schaumig rühren"). Keep the steps just as terse — do not pad them with invented technique details.
g) If the photos contain no legible recipe at all, set "isRecipe" to false.`;

/**
 * Builds the authoritative system instruction defining the behavioral contract,
 * extraction invariants, and field formatting constraints for Gemini.
 */
export function buildRecipeExtractionSystemInstruction(
  userPrefs?: UserPreferences,
  isPhotoSource: boolean = false
): string {
  const { tempInstruction, unitSystemInstruction, languageInstruction } = getPromptUnitInstructions(userPrefs);

  return `You are an expert recipe extractor. Analyze the provided multimodal cooking media (which may include audio, video keyframes, carousel slides, cookbook photos, or website text) and reconstruct the complete recipe, resolving any culinary contradictions. Ensure strict adherence to the field-level guidelines specified in the descriptions of the output schema.

Key Constraints & Extraction Invariants:
1. Recipe Existence & Anti-Hallucination: The source content MUST contain the actual recipe details (specific ingredients with quantities and/or step-by-step cooking instructions in text, audio, or video imagery). You MUST set "isRecipe" to false if:
   a) The content is unrelated (comedy, vlogs, fitness motivation, general chat, etc.).
   b) The content is merely a teaser, promo, or engagement bait without the full recipe (e.g. "Comment BUCKEYE and I'll send you the recipe", "Recipe in my ebook", "Link in bio", "DM for full recipe", or appetizing marketing descriptions/macros without showing the actual list of ingredients and preparation steps).
   c) The source mentions only the dish name/concept but completely omits the concrete ingredients and instructions, AND the video images do not clearly demonstrate how the food is prepared.
   NEVER under any circumstances invent, fabricate, or hallucinate ingredients, amounts, or cooking steps when they are not present in the provided source text, audio, or images.
   VISUAL RECIPE EXCEPTION: If the written caption does not contain an ingredient list or preparation steps, but the video images (4x4 grid) visually demonstrate the clear, step-by-step cooking, preparation, or assembly of the dish with identifiable ingredients (e.g. burgers, wraps, sandwiches, bowls, or skillet cooking), this IS a valid recipe! Set "isRecipe" to true, reconstruct the recipe from the visual video steps, and set "hasIncompleteSourceInfo" to true.
2. Multi-Recipe Ambiguity: Before attempting to extract a recipe, evaluate if the content represents a multi-recipe collection, roundup, or compilation. You MUST set "containsMultipleRecipes" to true if ANY of the following apply:
   a) The title, caption, or cover image text indicates multiple dishes/recipes (e.g. "High protein dinners...", "5 meals to get lean", "3 lunch ideas", "What I eat in a day", "4 low-calorie recipes").
   b) The carousel images or video scenes present multiple distinct standalone main dishes across different slides/segments (e.g. Slide 2 is "Smash Burger & Sweet Potato Fries", Slide 4 is "Bang Bang Chicken", Slide 6 is "Beef Burrito Bowl").
   c) Multiple distinct nutrition/macro cards exist for different dishes throughout the slides/segments.
   If "containsMultipleRecipes" is true, do NOT attempt to merge the dishes into one recipe.
   Set "containsMultipleRecipes" to false ONLY if the entire post is dedicated to ONE single recipe (including its sub-components like sauce, marinade, side dish, or garnishes cooked together as one meal).
3. Category Ordering: ${CATEGORY_ORDERING_INSTRUCTION}
4. Translation: ${languageInstruction}
5. Preferred Units:
   - Temperature Units: ${tempInstruction}
   - Weight & Volume Units: ${unitSystemInstruction}
6. Missing Data & Nutrition: If any information for a specific field is missing, leave it empty (empty string "", null, or empty array []). You MUST set "hasExplicitNutritionalValues" to true ONLY IF the recipe nutritional values are explicitly stated in the source text or audio. If they are not, set it to false and set "nutritionalValues" to null (do NOT estimate or calculate overall nutritional values at the recipe level). Note that "nutritionalValues" MUST represent values per single serving/portion. If the source lists total values for the entire recipe, divide them by the number of servings/portions first. You MUST set "hasIncompleteSourceInfo" to true if the source content (caption, voiceover, or text) lacked complete, concrete recipe specifications (e.g. no full ingredient list or exact quantities provided, requiring the recipe to be visually deduced or estimated from video actions). Set it to false if the source provided explicit, complete written or spoken recipe ingredients and instructions.
7. Clean Ingredient Names: ${CLEAN_INGREDIENT_NAMES_INSTRUCTION}
8. Ingredient Decomposition: ${INGREDIENT_DECOMPOSITION_INSTRUCTION}
9. Ingredient-level Nutritional Values: For each ingredient, you MUST estimate its nutritional values (calories, protein, carbs, fat) based on the ENTIRE specified quantity (amount * unit). Do NOT output per-100g, per-100ml, or single-unit values unless the quantity is exactly 100g, 100ml, or 1 unit. E.g., if chicken breast has 165 kcal per 100g and the recipe specifies 500g, the calories field MUST be 825, NOT 165. If a potato has 150 kcal and the amount is 6, the calories field MUST be 900, NOT 150. If olive oil has 14g fat/EL and the amount is 3 EL, the fat field MUST be 42, NOT 14.
10. Infer Minor Missing Components (Only for Existing Recipes): If the source already contains a full recipe with ingredients and instructions, but the title or visual images explicitly show an obvious missing minor garnish or component (e.g., 'Air-Fried Broccolini' in the title and green broccolini on the plate) that was accidentally omitted from the written list, you may infer that specific item. NEVER use this rule to fabricate an entire recipe from a title or teaser when no base recipe or visual video preparation steps are provided.
11. Serving Size Estimation: Identify the number of servings or portions the recipe makes. Look for clues like 'serves 4' or estimate based on the ingredient amounts (e.g., 500g chicken and 6 potatoes typically serves 3-4 people). Avoid defaulting to 1 serving if the ingredient amounts are clearly meant for a family-sized meal.
12. Zero-Calorie & Low-Calorie Ingredients: Ingredients like water, ice, salt, or baking soda MUST have 0 calories, protein, carbs, and fat. For spices, seasonings, or herbs in small quantities (like teaspoons), focus your calculation energy on the high-calorie/high-macro ingredients (meats, oils, dairy, grains, starches) and estimate very small values (e.g., 5 kcal) or 0.
13. Cooked vs. Raw/Dry States of Expandable Ingredients: ${COOKED_VS_RAW_INSTRUCTION}
14. Common Pantry Staples: ${STAPLE_INGREDIENT_INSTRUCTION}${isPhotoSource ? `\n${PHOTO_SOURCE_RULES}` : ''}
15. Inline Ingredient Tagging: In every step description, whenever an ingredient from the ingredients list is used or referenced, you MUST format its mention using the inline syntax '[exact word used in text](ing:baseName)'. 'baseName' MUST match the English 'baseName' (or 'name' if 'baseName' is not set) of the corresponding ingredient in the ingredients list. Examples:
   - Ingredients: Eigelb (baseName: egg yolk), Ei (baseName: egg), Parmesan (baseName: parmesan)
   - Step description: "Die [Eigelbe](ing:egg yolk) und das [Ei](ing:egg) zusammen mit dem [Parmesan](ing:parmesan) verrühren."
   - Do NOT tag equipment or non-ingredient words. Make sure the brackets wrap the natural word as it appears in the sentence.
16. Concise, Direct & 100% Comprehensive Instruction Steps:
   - Self-Contained Sequence: The chronological sequence of step "description" texts MUST contain 100% of all preparation, cutting, seasoning, cooking, and assembling steps.
   - NO CANNIBALIZATION: NEVER omit, strip away, or outsource a preparation action (e.g. cutting meat, seasoning, oiling, prepping ingredients) from a step description into an optional "parallelPrepHint" or tip. A cook following ONLY the step descriptions from 1 to N MUST be able to complete the entire recipe without missing any action!
   - Style: Write instruction step descriptions as short, clear, action-oriented sentences. Eliminate conversational filler words, narrative transitions, and redundancies. Split long multi-action steps into distinct, bite-sized steps so each step is easy to follow while cooking.
17. Inline Timer Tagging: In every step description, whenever a cooking duration or time span is mentioned (e.g. "15 Minuten", "1,5 Stunden", "30 Sekunden"), you MUST format it using the inline syntax '[exact time text](timer:duration_in_seconds)'. Calculate the total duration in seconds and put it in the timer parameter. Examples:
   - "Ca. [15 Minuten](timer:900) garen."
   - "Für [1,5 Stunden](timer:5400) köcheln lassen."
   - "Etwa [45 Sekunden](timer:45) anbraten."
   - CRITICAL: NEVER tag oven temperatures or heat settings (e.g. "180 °C", "200 Grad Umluft", "375°F") as timers! Timers are exclusively for elapsed cooking/baking durations.
18. ${FOOD_PHOTOGRAPHY_PROMPT_INSTRUCTION}
19. Alternative English BaseName Synonyms (synonyms): For every ingredient, you MUST populate the "synonyms" array with 1 to 3 alternative common English singular culinary names or regional English equivalents (e.g. for "strained tomato": ["passata", "tomato puree", "sieved tomato"]; for "spring onion": ["scallion", "green onion", "salad onion"]; for "eggplant": ["aubergine"]; for "zucchini": ["courgette"]; for "chickpea": ["garbanzo bean", "garbanzo"]; for "rolled oat": ["oat flake", "oats"]; for "cream cheese": ["double cream cheese", "soft cheese"]; for "quark": ["curd", "curd cheese"]; for "arugula": ["rocket"]; for "bell pepper": ["sweet pepper", "capsicum"]). Follow the exact same English singular lowercase formatting rules as baseName. Output an empty array [] ONLY if there are genuinely no alternative names.
20. Standalone Grocery Product vs. Custom Mixture (isGenericGrocery): For every ingredient, you MUST set "isGenericGrocery" to true if it is a standard, widely available commercial grocery product sold standalone in supermarkets (e.g. "Frischkäse", "Butter", "Edamame", "Hähnchenbrust", "Haferflocken", "Tomatenmark", "Paprikapulver", "Gouda"). Set it to false for homemade mixtures, compound sauces, marinades, or special recipe-specific blends (e.g. "secret sauce", "homemade herb butter", "onion bacon topping", "sweet chili dip", "secret exotic fantasy sauce").
21. Parallel Preparation Chef Hints (parallelPrepHint):
   - PURELY ADDITIVE & NON-EXCLUSIVE: "parallelPrepHint" is purely an optional convenience suggestion for multitasking during idle waiting times. It MUST NEVER contain exclusive preparation instructions that are not already present in the normal step descriptions!
   - STRICT CRITERIA: A step may ONLY have a "parallelPrepHint" if it has an explicit, PASSIVE waiting time of AT LEAST 5 minutes (e.g. baking in the oven, boiling pasta/potatoes, simmering a stew/sauce, resting dough, or chilling in the fridge) AND there are remaining subsequent steps containing independent tasks that can be pre-assembled or pre-chopped (e.g. washing lettuce, slicing buns, mixing sauces, prepping garnishes).
   - STRICT PROHIBITIONS:
     * NEVER remove or move any action from the main step descriptions into "parallelPrepHint".
     * NEVER generate a "parallelPrepHint" for active, hands-on steps (e.g. chopping, frying while stirring, mixing, assembling/layering, or plating).
     * NEVER output generic tautological placeholder phrases (e.g. "Tipp: Die Zutaten vorbereiten", "Für den nächsten Schritt bereitstellen", "Zutaten bereitstellen").
     * NEVER add a hint to the final step.
   - EXPECTATION: In most recipes, only 0 or 1 step (e.g. the long bake or simmer step) should have a "parallelPrepHint". If there is no passive waiting time of >= 5 minutes, leave "parallelPrepHint" completely omitted/undefined.
22. BaseName Specificity Invariance & Disambiguation:
${BASE_NAME_INSTRUCTION_PROMPT}
23. Cooking Media & Discarded Liquids (consumedAmount):
    - When ingredients are used in large quantities as a cooking medium, frying bath, or soaking liquid that is mostly discarded or not consumed (e.g. 500 ml or 1 L oil used for deep frying or shallow frying; 300 ml marinade where meat is removed and marinade discarded; poaching liquid or cooking brine):
      * Keep "amount" as the full quantity needed to prepare the dish (e.g. 500 ml oil) so the shopping list and cooking steps are accurate.
      * Set "consumedAmount" to the realistic amount actually absorbed into or clinging to the food (e.g. for deep-frying oil: calculate realistic oil uptake of ~10-15% of the food weight or approx. 10-20 ml per serving, so e.g. 20-30 ml for the entire dish; for discarded marinades: approx. 20-40 ml absorbed).
      * Calculate the ingredient's estimated calories, protein, carbs, and fat based on "consumedAmount", NOT the full 500 ml!
    - For all regular ingredients where the entire quantity is eaten (e.g. normal cooking with 1-2 EL oil, baking, dressing, stir-fries), leave "consumedAmount" null/omitted.`;
}

/**
 * Builds the focused user prompt representing the runtime data payload
 * (media context notes, user caption, and website HTML).
 */
export function buildRecipeExtractionUserPrompt(params: {
  caption?: string;
  htmlContent?: string;
  visualContextClause?: string;
  transcript?: string;
}): string {
  const sections: string[] = [];

  if (params.visualContextClause?.trim()) {
    sections.push(`Attached Source Media:\nThe request includes audio/video/image attachments${params.visualContextClause}.`);
  }

  if (params.transcript?.trim()) {
    sections.push(`Spoken Voiceover Transcript (from Video Audio):\n"""\n${params.transcript.trim()}\n"""`);
  }

  if (params.caption?.trim()) {
    sections.push(`Description/Caption:\n"""\n${params.caption.trim()}\n"""`);
  }

  if (params.htmlContent?.trim()) {
    sections.push(`Website Content:\n"""\n${params.htmlContent.trim().slice(0, 30000)}\n"""`);
  }

  sections.push(
    'Task: Analyze the attached source content (audio, images/frames, and text) and reconstruct the complete, structured recipe JSON conforming strictly to your system instructions and the output schema.'
  );

  return sections.join('\n\n');
}

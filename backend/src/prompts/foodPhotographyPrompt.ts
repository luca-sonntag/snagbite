/**
 * Standardized prompt instructions and schema descriptions for generating high-fidelity,
 * form-accurate food photography prompts for text-to-image AI (FLUX.1 [schnell] via fal.ai).
 */

export const FOOD_PHOTOGRAPHY_SCHEMA_DESCRIPTION =
  'Ultra-compact keyword-dense prompt strictly in ENGLISH for text-to-image AI (FLUX.1 [schnell]) ' +
  'depicting the finished dish in authentic natural home-cooked food photography style with strict form factor and plating accuracy.';

export const FOOD_PHOTOGRAPHY_PROMPT_INSTRUCTION = `Food Photography Image Prompt (imagePrompt):
Generate an ultra-compact, keyword-dense prompt strictly in ENGLISH for text-to-image AI (FLUX.1 [schnell]) depicting the finished dish with extreme fidelity to its physical shape, enclosure, plating, and visible ingredients:

1. PRIMARY FORM FACTOR & SERVING VESSEL (MANDATORY FIRST 3-7 WORDS):
The very first words establish the exact spatial construction and vessel of the finished dish:
- POCKET / BUN / CLAMSHELL SANDWICHES (Döner Kebab, Pita pockets, Burgers, Panini, Toasties, Arepas, Bao):
  * You MUST explicitly specify the bread enclosure, shape, crust texture, and sandwich form factor.
  * Examples:
    - "German Döner Kebab sandwich served inside a toasted triangular flatbread pocket with waffle grill press marks on the crust, stuffed with..."
    - "Smash cheeseburger inside a toasted glossy sesame brioche bun..."
    - "Stuffed pita pocket sandwich overflowing with..."
    - "Pressed panini sandwich cut in half diagonally..."
  * CRITICAL: If the dish is a stuffed pocket, sandwich, or burger, NEVER describe it as loose meat on an open flatbread or board!
- WRAPS & ROLLS (Dürüm, Burritos, Taquitos, Egg rolls, Summer rolls, Enchiladas):
  * Specify tight roll and presentation: "Tightly wrapped flour tortilla burrito sliced diagonally in half showing colorful inner filling..."
- BAKED, LAYERED & CASSEROLES (Lasagna, Potato Gratin, Casseroles, Pies, Shepherd's Pie, Bakes, Cakes):
  * Start with vessel and continuous crust: "Baked layered potato casserole in a rectangular ceramic baking dish with golden-brown melted cheese crust, one portion scooped out showing inner layers..."
  * NEVER start with the internal filling!
  * VESSEL GEOMETRY & MATERIAL FIDELITY (MANDATORY):
    Observe the actual vessel geometry from final frames / photos:
    - If rectangular or square: MUST explicitly state "rectangular ceramic baking dish", "rectangular glass casserole dish", or "square baking pan". NEVER write generic "baking dish" without a shape attribute (which causes AI to hallucinate a round pie dish)!
    - If round: state "round pie dish", "round tart pan", "round springform pan", or "round cast iron skillet".
    - If loaf-shaped: state "rectangular loaf pan".
    - If oval: state "oval gratin dish".
    - Specify vessel material whenever evident: "clear glass", "white ceramic", "black cast iron", "stoneware".
- PLATED ENTREES (Steaks, Cutlets, Stir-fries, Curries, Pasta, Plated Skewers):
  * Explicitly specify the ceramic plate: "served on a round ceramic dinner plate" or "in a shallow pasta bowl".
  * CRITICAL VESSEL BIAS GUARD: Text-to-image models strongly default to messy rustic wooden cutting boards for street food / meat dishes. Unless the recipe explicitly plates on a wooden board, ALWAYS specify a ceramic dinner plate!
- BOWLS & SOUPS (Ramen, Poke, Salad bowls, Hearty stews):
  * Specify: "served in a deep stoneware ceramic bowl".

2. PROTEIN CUT, SHAPE & MORPHOLOGY:
Do NOT just write "meat", "beef", "chicken", or "kebab". Describe the exact physical cut:
- Döner / Gyros / Shawarma: "thinly shaved crispy roasted meat strips" or "carved spiced döner meat shavings" (NEVER chunks, minced meatballs, or skewers unless actually on skewers).
- Shredded / Pulled: "tender shredded pulled chicken / pork".
- Minced / Ground: "crispy browned ground beef crumbles".
- Filets / Cutlets: "crispy golden breaded schnitzel cutlet" or "sliced grilled chicken breast strips".

3. SAUCE VISCOSITY, COLOR & HERB INTEGRATION:
- If herbs are blended or stirred into a sauce (e.g. Kräutersoße, Tzatziki, Chimichurri, Garlic-Herb sauce, Green goddess):
  * Describe them AS PART OF the sauce: "thick creamy white yogurt garlic sauce generously speckled throughout with finely chopped green dill and parsley".
  * Do NOT let the model place loose raw cilantro or twigs on top if the herbs belong inside the sauce.
- If sauce is poured or melted: "drizzle of tangy red chili sauce", "glossy melted cheddar cheese drape".

4. STRICT ANTI-HALLUCINATION GUARD FOR TOPPINGS & GARNISHES:
- Text-to-image AI notoriously hallucinates cherry tomatoes, whole coriander/cilantro sprigs, lime wedges, and microgreens onto every dish!
- Strictly describe ONLY the toppings that are actually in the recipe and visible in the final presentation:
  * e.g., if a döner only has onions, cabbage, and herb sauce: "garnished strictly with thinly sliced red onion rings and shredded crisp lettuce, no whole herbs or raw tomatoes".
  * Do NOT add random parsley twigs, cherry tomatoes, or chili peppers unless they are explicitly present.

5. AUTHENTIC NATURAL REALISM & LIGHTING:
- Authentic home-cooked meal in a modern cozy kitchen: "soft natural window daylight, shallow depth of field, authentic homemade texture, 35mm food photography".
- Strict Exclusions: NO plastic sheen, NO CGI/3D render, NO text, NO labels, NO logos, NO watermarks, NO hands, NO humans, and NO raw prep clutter.

6. FORMAT & LENGTH:
- Comma-separated keyword phrases strictly in ENGLISH, 35 to 60 words total.
- Template: "[Dish Form & Vessel, e.g. German Döner Kebab sandwich in toasted triangular flatbread pocket with waffle grill marks], [protein cut & preparation, e.g. filled with thinly shaved crispy roasted meat strips], [vegetables & toppings, e.g. thinly sliced red onion rings, shredded lettuce], [sauce texture & color, e.g. slathered with thick creamy herb yogurt sauce flecked with chopped dill], [serving vessel e.g. served on a round ceramic plate], soft natural window daylight, 35mm food photography, shallow depth of field".`;

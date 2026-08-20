# 🤖 KI-Layer (Google Gemini Integration)

## 1. Multimodale Verarbeitung & Structured Outputs

* **Technologie:** `@google/generative-ai` SDK (Gemini 1.5/2.5/3.1/3.5 Flash).
* **Funktion:** Audiodatei wird über die Google AI File API hochgeladen. Gemini verarbeitet Audio, Video-Frames/Grid und Text (`caption`) in einem einzigen multimodalen Aufruf.
* **Structured Outputs & Clean Parsing:** Gemini wird durch ein strenges JSON-Schema gezwungen, das Rezept exakt nach einem detaillierten Schema (Titel, Beschreibung, Zutaten mit Mengen/Einheiten/Modifizierern, Schritte, Ausrüstung, Nährwertschätzungen, Kochtipps, Alternativzutaten und ein passendes Rezept-Emoji) zu strukturieren.
  * **Kategorisierung & Standardisierung:** Das Schema erzwingt die Zuordnung von Zutaten in feste englische Enum-Supermarktkategorien (z.B. `PRODUCE`, `DAIRY_EGGS`) und generiert pro Zutat einen englischen `baseName` (z.B. "onion" statt "rote Zwiebeln") sowie optional ein `parentIngredient` (z. B. `{ name: "Ei", baseName: "egg", unit: "Stück" }` für `Eigelb` oder `Eiweiß`), welches auf das einzukaufende Rohstoff-Produkt verweist.
  * **Rezept-Emoji-Generierung:** Wählt basierend auf dem Rezepttitel und der Hauptzutat ein passendes Emoji (z. B. 🥔 bei Kartoffelrezepten, 🍕 bei Pizza), welches als visueller Platzhalter bei fehlenden Bildern dient.
  * **Bereinigung der Zutatennamen:** Zutatennamen (`name`) werden im Prompt explizit von Mengen, Zahlen, Maßeinheiten und Modifizierern/Eigenschaften (wie "leicht", "mager", "gerieben") gesäubert; diese Daten fließen sauber in die dedizierten Felder `amount`, `unit` und `modifier`.
  * **Nährwerte pro Zutat:** Das Schema erzwingt für jede Zutat Nährwertangaben (`calories`, `protein`, `carbs`, `fat`) bezogen auf die konkrete Zutat und die gesamte angegebene Menge (nicht pro 100g oder pro Einzelstück).
  * **Dekomposition von Verbundzutaten:** Im Prompt ist geregelt, dass während des Rezept-Videos zubereitete Verbundkomponenten (wie "Smash Burger Patties" oder "selbstgemachtes Pesto") in ihre atomaren Rohbestandteile zersetzt werden müssen (z. B. Rinderhack, Chesterkäse, Basilikum, Olivenöl).
  * **Erzwingung von Portions-bezogenen Nährwerten:** Das Schema und der Prompt instruieren Gemini, die Rezept-Nährwerte (`nutritionalValues`) stets auf eine einzelne Portion/Servierung normiert zu extrahieren.
  * **Vermeidung von Gesamtnährwert-Halluzinationen:** Ein explizites `hasExplicitNutritionalValues` Boolean-Flag im Schema zwingt Gemini zur Angabe, ob die Gesamtnährwerte im Quellmaterial explizit genannt wurden. Wenn nicht (`false`), löscht das Backend eventuell generierte Werte proaktiv.

---

## 2. Mehrfachrezept-Erkennung (Ambiguitäts-Check)

Videos und Bilderkarussells können mehrere eigenständige Rezepte enthalten (z. B. „5 High-Protein Meals"-Roundups, bei denen jede Slide ein anderes Gericht zeigt).
* Ein im `recipeSchema` als `required` festgelegtes `containsMultipleRecipes` Boolean-Flag plus die prioritäre Prompt-Regel #1 („Multi-Recipe Ambiguity“) zwingen Gemini zur expliziten Angabe, ob mehrere unterschiedliche Gerichte ohne klar dominierendes Einzelrezept vorliegen.
* **Komponenten EINES Gerichts** (Soße, Beilage, Topping) zählen explizit nicht als Mehrfachrezept.
* Ist das Flag `true`, schlägt die Extraktion mit dem dedizierten, nicht-retrybaren Fehlercode `MULTIPLE_RECIPES` (422) fehl, statt mehrere Gerichte zu einem unbrauchbaren Misch-Rezept zu verschmelzen; das Frontend zeigt eine lokalisierte Meldung (`error.codes.MULTIPLE_RECIPES`).
* Bei Remixes wird das Flag verworfen (Ausgangsbasis ist immer genau ein Rezept), und in beiden Pfaden wird es vor dem Persistieren vom Rezept-Objekt entfernt.

---

## 3. Rekonstruktion, Anti-Halluzination & Präferenzen

* **Anti-Halluzination & Teaser-Post-Erkennung:** Wenn ein Social-Media-Post nur Teaser-Text oder DM-Bait enthält (z. B. *"Kommentiere X für das Rezept"* oder Beschreibungen ohne konkrete Zutaten/Mengen/Schritte), zwingt das Schema (`isRecipe: false`) und Prompt-Constraint #1 Gemini dazu, den Post abzulehnen (`NOT_A_RECIPE`), anstatt frei erfundene Rezepte zu halluzinieren.
* **Rekonstruktion nur bei vorhandenem Grundrezept:** Falls ein vollständiges Grundrezept existiert, aber eine offensichtliche Kleinkomponente (z. B. Brokkolini als Beilage im Titel/Bild) in der Auflistung vergessen wurde, darf diese ergänzt werden. Das Erfinden eines Rezepts aus dem Nichts ist strikt untersagt.
* **Portions- und Nährwertoptimierung:** Verbessertes Schätzen der Portionen anhand der Gesamtmengen (statt pauschalem Servings-Default von 1). Gewürze werden mit Kleinstwerten (z. B. 5 kcal) versehen, während Wasser, Eis oder Salz zwingend auf 0 Kalorien/Makronährstoffe gesetzt werden.
* **Gekochte vs. Ungekochte Zustände:** Erkennt, ob die Mengenangaben von quellenden Zutaten (z. B. Reis, Nudeln, Linsen) sich auf den rohen oder gekochten Zustand beziehen (z. B. 250g gekochter Reis vs. 250g ungekochter Reis).
* **Sprach- & Unit-System-Steuerung:** Bevorzugte Rezeptsprache, Temperatureinheit (Celsius, Fahrenheit oder beides) und Maßsystem (metrisch oder imperial) werden primär per-Benutzer im Profil/Settings-Tab konfiguriert und in Supabase Auth `user_metadata` gespeichert. Der Worker ruft diese Präferenzen via Admin Auth API ab und weist Gemini an, das Rezept entsprechend zu übersetzen und umzurechnen. Values in `.env` dienen als serverweiter Fallback.

---

## 4. Recipe Copilot (Function Calling / Tool Use)

Ein rezept-spezifischer Chatbot (`POST /api/jobs/:id/chat`), der dem Nutzer Fragen zur Zubereitung oder Zutaten beantwortet. Gemini ist mit Tools (`modify_current_recipe`, `add_missing_ingredients_to_shopping_list`, `set_cooking_timer`) ausgestattet.

* **Two-Phase Remix Confirmation:** Wenn Gemini `modify_current_recipe` aufruft, wird der Remix **nicht** sofort ausgeführt. Stattdessen erhält der Client `pendingRemix: true` + `modificationRequest` und zeigt im Chat eine amber-farbene Bestätigungskarte mit zwei Optionen:
  * **"Aktuelles ersetzen"**: Überschreibt das bestehende Rezept via `updateJob` in-place (Bilder bleiben erhalten).
  * **"Als neues Rezept"**: Erstellt neuen Job via `saveCompletedRemix`.
  * Erst beim Klick wird `POST /api/jobs/:id/chat/confirm` mit `replaceCurrent: true/false` aufgerufen.
* **LLM-generierte Quick-Chips:** Beim Öffnen des Chats werden rezept-spezifische Vorschlags-Chips via `GET /api/jobs/:id/chat/chips?lang=de|en` geladen. Gemini generiert 5-6 Chips mit `category` (remix/help/substitute/shopping/timer).
* **Client-seitiges Session-Caching:** Der Chat wird pro Rezept lokal gecacht (`recipe_copilot_chat_{recipeId}`). Die Chips werden ebenfalls pro Rezept und Sprache gecacht (`recipe_copilot_chips_{recipeId}_{lang}`). Ein **Reset-Button** (Papierkorb im Header) löscht nach Bestätigung den Cache und generiert frische Chips.

---

## 5. Frame-Extraktion & Logging

* **Dynamische Frame-Extraktion:** Berechnet die Anzahl der zu extrahierenden Frames dynamisch anhand der Videolänge (Ziel: 1 Frame alle 2 Sekunden, limitiert zwischen 12 und 36 Frames). Diese werden zu einem `grid.jpg` zusammengefügt, um Gemini den visuellen Kontext zu liefern. Einzelne Frames werden nach der Bildauswahl gelöscht.
* **Auto-Cleanup:** Temporäre Audiodateien, Videodateien und Google-API-Dateien werden nach der Verarbeitung sofort gelöscht. Debug-Logs verbleiben unter `logs/{userId}/run-...` und werden nach 30 Tagen gelöscht.
* **Persistentes Gemini-Logging (`gemini_logs`-Tabelle):** Da Container ephemer sind, schreibt `writeGeminiLog()` (`backend/src/logger.ts`) **jeden** Gemini-Aufruf primär als eine Row in die Supabase-Tabelle `gemini_logs` (Request-Typ, Modell, Dauer, Erfolg, Fehlermeldung, Input-JSON, Token-Counts und USD-Kostenaufschlüsselung).
  * Die Tabelle ist **admin-only** (nur Service-Role-Key).
  * Der Aufruf erfolgt **fire-and-forget** (`void writeGeminiLog(...)`), ohne die Latenz des API-Calls zu belasten.
  * Admin-Metriken (`getLlmMetrics`) aggregieren direkt über `gemini_logs` per SQL.
  * Der 12-Stunden-Cleanup löscht Rows älter als 90 Tage (`pruneOldGeminiLogs(90)`).

---

## 6. Fotorealistische Cover-Generierung mit FLUX.1 [schnell]

* **Problem & Motivation:** Social-Media-Thumbnails sind oft unruhig, mit Text/Emojis überladen oder zeigen Zwischenschritte. Foto-Imports (abfotografierte Kochbücher/Rezeptkarten) hatten bislang überhaupt kein Coverbild (nur ein Emoji).
* **Gemini Food-Photography Prompt-Engineering (`imagePrompt`):**
  * Im `recipeSchema` erzwingt das Pflichtfeld `imagePrompt` einen präzisen, fotorealistischen Food-Fotografie-Prompt strictly in englischer Sprache.
  * Gemini analysiert Titel, Beschreibung, Zutatenliste und Zubereitungsschritte und formuliert einen maßgeschneiderten Bild-Prompt für das fertige Gericht:
    * **Fokus auf das fertige Gericht:** z. B. schmelzender Käse mit zarter Bräunung, glänzende Sauce, frische Kräuter-Garnitur, dezenter Dampf.
    * **Passendes Koch-/Serviergeschirr:** z. B. weiße Keramik-Auflaufform, rustikale gusseiserne Pfanne, Schieferplatte oder Schale.
    * **Kamera & Beleuchtung:** 45-Grad-Winkel oder Nahaufnahme (Makro), warmes natürliches Ambient-Licht, geringe Tiefenschärfe (*shallow depth of field* mit weichem Bokeh).
    * **Negative Constraints:** Kein Text, keine Logos, keine Wasserzeichen, keine Hände, kein Rohzutaten-Müll.
* **FLUX.1 [schnell] 4-Step Ausführung via fal.ai (`backend/src/imageGenerator.ts`):**
  * Direct Inference über `https://fal.run/fal-ai/flux-1/schnell` mit `image_size: "landscape_4_3"`, 4 Steps und `output_format: "jpeg"`.
  * Speicherung im permanenten öffentlichen Supabase Storage Bucket `recipe-covers` (`${userId}/${jobId}.jpg`).
  * `recipe.imageUrl` wird auf die Public-URL gesetzt; `recipe.isAiCover` wird auf `true` gesetzt.
  * Gescrapte Original-Frames/Slides bleiben in `recipe.imageUrls` für die Galerie erhalten.
  * Auch **Foto-Imports** und **Remixes** erhalten automatisch ein neues, passendes HD-Coverbild.
  * **Kosten- & Laufzeit-Tracking (`jobs.llm_usage.flux`):** Dauer und Inferenzkosten ($0.0035 / Bild) werden strukturiert in der neuen Spalte `llm_usage` auf Job-Ebene festgehalten, während `recipe` frei von technischen Kosten-Metadaten bleibt.


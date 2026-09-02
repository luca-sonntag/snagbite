# 🤖 KI-Layer (Google Gemini Integration & Kostenarchitektur)

## 1. Übersicht & Modell-Konfiguration

* **SDK:** `@google/generative-ai` SDK (`backend/src/gemini.ts`).
* **Standard-Modelle:**
  * `config.GEMINI_MODEL`: Standardmäßig `gemini-3.1-flash-lite` (Fallback/Alternative: `gemini-2.5-flash-lite`).
  * `config.GEMINI_RERANKER_MODEL`: Standardmäßig `gemini-3.1-flash-lite` (genutzt für Open Food Facts Reranking & Resolver).
* **Bildgenerierung (Cover):** FLUX.1 [schnell] via fal.ai API (Direct-Inference, 4 Steps, $0.0035 / Bild).
* **Kontext & Multimodalität:** Native Verarbeitung von Audio (File API Upload), Video-Frames / 4x4-Grid (`inlineData`) und Text in einem einzigen API-Aufruf mit bis zu 1.000.000 Tokens Kontextfenster.

---

## 2. Vollständige Gemini-Touchpoint- & Request-Übersicht

Im gesamten Backend gibt es **7 aktive Gemini-Funktionen** (sowie Offline-/Admin-Tools). Jeder Aufruf wird strikt geloggt und kategorisiert (`GeminiRequestType` in `backend/src/logger.ts`):

| Request-Typ | Funktion / Datei | Trigger / Endpunkt | Tokens In (Ø) | Tokens Out (Ø) | Kosten / Call (3.1 Lite) | Kosten / Call (2.5 Lite) | Frequenz / Aufkommen |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`extract_recipe`** | `extractRecipeFromMedia` (`gemini.ts`) | Job-Queue (URL- oder Foto-Import) | ~8.000 | ~1.500 | **0,00425 $** | **0,00140 $** | 1x pro importiertem Rezept |
| **`resolve_ingredient`** | `resolveIngredient` (`ingredientResolver.ts`) | Während Extraktion (`enrichRecipe...`) | ~1.000 | ~120 | **0,00043 $** | **0,00015 $** | Nur bei unbekannten Zutaten (~0–2x/Rezept, danach 100% DB-gecacht) |
| **`chat_recipe`** | `chatAboutRecipe` (`gemini.ts`) | `POST /api/recipes/:id/chat` | ~2.200 | ~250 | **0,00092 $** | **0,00032 $** | Nur bei Nutzerinteraktion (Ø 1–3 Nachrichten/Chat) |
| **`chat_chips`** | `generateChatChips` (`gemini.ts`) | `GET /api/recipes/:id/chat/chips` | ~900 | ~180 | **0,00050 $** | **0,00016 $** | 1x pro Chat-Session (clientseitig gecacht) |
| **`verify_cook_photo`** | `verifyCookedDishPhoto` (`gemini.ts`) | `POST /api/recipes/:id/cooked` | ~1.200 | ~150 | **0,00053 $** | **0,00018 $** | 1x beim Hochladen eines Koch-Beweisfotos (XP/Streaks) |
| **`remix_recipe`** | `remixRecipe` (`gemini.ts`) | Fallback bei unstrukturiertem Remix | ~3.500 | ~1.500 | **0,00312 $** | **0,00095 $** | Sehr selten (<5% der Rezepte; primär greift `recipeOperations.ts`) |
| **`notification_copy`** | `generateNotificationCopy` (`gemini.ts`) | Push-Worker (`notifications/worker.ts`) | ~600 | ~80 | **0,00027 $** | **0,00009 $** | Max. 3x pro Nutzer / Woche (gedrosselt via Config) |
| *`select_best_frame`* | *Ausgemustert* | *Historisch* | *–* | *–* | *0,00 $* | *0,00 $* | Ersetzt durch FLUX.1 [schnell] Cover-Generierung |

---

## 3. Die End-to-End Rezept-Pipeline im Detail

```
1. EINGABE
   [Share Target / URL] oder [Foto-Upload (Buchseite/Karte)]
                 │
                 ▼
2. JOB-CREATION & QUEUE
   `POST /api/jobs` ➔ Supabase `jobs` (Status: pending)
   Worker claimt Job atomar (`claim_next_job`)
                 │
                 ▼
3. SCRAPING & MEDIEN-VORBEREITUNG
   ├── Audio-Stream via Google AI File API hochladen (`files.uploadFile`)
   ├── Keyframes: 4x4 Grid aus Client-Frames oder Video generieren
   └── Caption & Metadaten (Dauer, Quelle, Creator) extrahieren
                 │
                 ▼
4. MULTIMODALER GEMINI CALL (`extractRecipeFromMedia`)
   Gemini 3.1 Flash-Lite verarbeitet Audio + Grid + Text in EINEM Call.
   Strikte Schematisierung (`responseSchema: recipeSchema`):
   • 21 Prompt-Constraints (Anti-Halluzination, Mengennormalisierung,
     Makros pro Zutat, Inline-Ingredient- & Timer-Tags `[Tag](ing:...)`)
   • Mehrfachrezept-Erkennung (`containsMultipleRecipes` ➔ 422 Abbruch)
                 │
                 ▼
5. PIPELINE-PARALLELISIERUNG (`Promise.all`)
   ┌───────────────────────────────────┴───────────────────────────────────┐
   ▼                                                                       ▼
Cover-Generierung (FLUX.1 [schnell])              Kanonische Zutaten-Auflösung (OpenFoodFacts)
• Prompt: `recipe.imagePrompt`                    • `enrichRecipeWithCanonicalIngredients`
• Inferenz: fal.ai Direct API ($0.0035)           • DB-Lookup `ingredient_mappings` (0$ / Cache-Hit)
• Upload nach Supabase `recipe-covers` Bucket     • Bei Miss: Gemini Tool-Resolver (`submit_match`)
   └───────────────────────────────────┬───────────────────────────────────┘
                                       ▼
6. PERSISTIERUNG & VOLLENDUNG
   `completeJob(jobId, recipe, llmUsage)`
   • Datensatz landet in `recipes` & `user_recipes`
   • `llmUsage` erfasst Gemini- & FLUX-Kosten transparent auf Job-Ebene
   • Ephemere Dateien & Google-API-Files werden gelöscht
```

---

## 4. Recipe Copilot & Deterministische Operations-Engine

* **Chat-Endpunkt:** `POST /api/recipes/:id/chat`
* **Deterministischer Remix (`recipeOperations.ts`):**
  * Statt das Rezept bei Modifikationen (z. B. "mach es vegetarisch", "Portionen verdoppeln") unkontrolliert als Freitext komplett neu zu generieren, liefert Gemini über Function Calling strukturierte Atomic Operations (`REPLACE_INGREDIENT`, `ADD_INGREDIENTS`, `REMOVE_INGREDIENT`, `SCALE_SERVINGS`, `ADD_INSTRUCTION_STEP`).
  * Die Ausführung erfolgt deterministisch im Backend (< 1ms), wodurch Halluzinationen verhindert und 80% der Tokens gespart werden.
  * Modifizierte Rezepte werden als **private Remixe** (`parent_recipe_id = id`) gespeichert. Das Originalrezept bleibt unverändert.
* **LLM Quick-Action Chips:** `GET /api/recipes/:id/chat/chips` liefert 5–6 rezeptspezifische Vorschlags-Pills, gecacht pro Rezept und Sprache.

---

## 5. Gamification Cook-Verification & Push-Notifications

* **Foto-Beweis beim Kochen (`verifyCookedDishPhoto`):**
  * Wenn ein Nutzer ein Gericht nachkocht und ein Beweisfoto hochlädt (`POST /api/recipes/:id/cooked`), prüft Gemini Vision:
    1. **Authentizitäts-Check:** Erkennt Screenshots von Instagram/TikTok, Bildschirmfotos oder Fake-Bilder und lehnt sie ab.
    2. **Rezept-Match:** Vergleicht das fertige Gericht mit Titel und Hauptzutaten des Rezepts.
    3. Bei Erfolg werden Gamification-Punkte, Streaks und Badges autoritativ vergeben.
* **Smart Push-Notifications (`generateNotificationCopy`):**
  * Generiert ansprechende, saisonale Benachrichtigungstexte für Rezept-Vorschläge oder Erinnerungen.
  * Capping: Maximal 3 Notifications pro Nutzer pro 7 Tage (`NOTIFICATION_MAX_PER_WEEK: 3`).

---

## 6. Gesamtkosten pro extrahiertem Rezept

Bei einem regulären Video- oder Foto-Import fallen folgende KI-Kosten an:

| Komponente | Anbieter / Modell | Tokens / Einheiten | Kosten (Gemini 3.1 Lite) | Kosten (Gemini 2.5 Lite) |
| :--- | :--- | :--- | :--- | :--- |
| **Rezept-Extraktion** | Gemini Flash-Lite | ~8.000 In / ~1.500 Out | 0,00425 $ | 0,00140 $ |
| **OFF Ingredient Matching** | Gemini Reranker (Ø 0.2 Calls) | ~200 In / ~25 Out | 0,00009 $ | 0,00003 $ |
| **HD-Coverbild** | FLUX.1 [schnell] (fal.ai) | 1 Bild (4 Steps) | 0,00350 $ | 0,00350 $ |
| **Gesamtkosten / Rezept** | – | – | **~ 0,0078 $** *(0,78 Cent)* | **~ 0,0049 $** *(0,49 Cent)* |

---

## 7. Skalierungs- & Kostenmodell bei X Nutzern

### A. Kontingente & Nutzerverhalten (Defaults in `config.ts`)
* **Free-Nutzer:**
  * Rate-Limit: **3 Extraktionen pro Tag** (Rolling 24h-Window).
  * Realer Durchschnitt: **~5 Rezepte / Monat** + 2 Chat-Fragen + 1 Foto-Check.
* **Premium-Nutzer:**
  * Rate-Limit: **30 Extraktionen pro Tag**.
  * Realer Durchschnitt: **~25 Rezepte / Monat** + 10 Chat-Fragen + 4 Foto-Checks.
* **Angenommener Mix:** 90 % Free-Nutzer, 10 % zahlende Premium-Abonnenten.

### B. Monatliche Gesamtkosten nach Nutzerzahlen (Gemini 3.1 Flash-Lite + FLUX.1)

| Aktive Nutzer (MAU) | Rezepte / Monat gesamt | Gemini API-Kosten | FLUX.1 Cover-Kosten | Gesamte KI-Kosten / Monat | Ø Kosten pro aktivem User |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **100 Nutzer** | ~ 700 Rezepte | ~ 3,60 $ | ~ 2,45 $ | **~ 6,05 $** | 0,061 $ *(6,1 Cent)* |
| **500 Nutzer** | ~ 3.500 Rezepte | ~ 18,00 $ | ~ 12,25 $ | **~ 30,25 $** | 0,061 $ |
| **1.000 Nutzer** | ~ 7.000 Rezepte | ~ 36,00 $ | ~ 24,50 $ | **~ 60,50 $** | 0,061 $ |
| **5.000 Nutzer** | ~ 35.000 Rezepte | ~ 180,00 $ | ~ 122,50 $ | **~ 302,50 $** | 0,061 $ |
| **10.000 Nutzer** | ~ 70.000 Rezepte | ~ 360,00 $ | ~ 245,00 $ | **~ 605,00 $** | 0,061 $ |
| **50.000 Nutzer** | ~ 350.000 Rezepte | ~ 1.800,00 $ | ~ 1.225,00 $ | **~ 3.025,00 $** | 0,061 $ |

### C. Wirtschaftlichkeit (Unit Economics)
* Bei 1.000 aktiven Nutzern (100 Premium @ z.B. 2,99 $/Monat = **299 $ Umsatz** + AdMob-Einnahmen der 900 Free-User):
  * Gesamte KI-Kosten: **~60 $ / Monat**.
  * **Bruttomarge der KI-Kosten:** **> 80 %**.

---

## 8. Persistentes Monitoring (`gemini_logs` DB-Tabelle)

* **Logging-Funktion:** `writeGeminiLog()` in `backend/src/logger.ts` schreibt jeden Aufruf asynchron (`fire-and-forget`) in die Supabase-Tabelle `gemini_logs`.
* **Felder:** `request_type`, `model`, `duration_ms`, `success`, `error_message`, `token_prompt`, `token_candidate`, `token_total`, `cost_usd`, `cost_formatted`.
* **Admin-Metriken:** `GET /api/admin/metrics?range=30d` aggregiert die Inferenzkosten in Echtzeit.
* **Auto-Pruning:** Ein täglicher Cron-Job löscht Log-Einträge älter als 90 Tage (`pruneOldGeminiLogs(90)`).

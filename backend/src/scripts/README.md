# 🛠️ Backend Scripts Dokumentation

Umfassende Referenz für alle CLI- und Wartungsskripte im Verzeichnis `backend/src/scripts/`.  
Alle Befehle werden aus dem Ordner `backend` (oder aus dem Repository-Root mit `cd backend`) ausgeführt.

---

## 📑 Schnellübersicht (Quick Reference)

| Skript | npm-Befehl | Zweck |
| :--- | :--- | :--- |
| [`auditIngredientPipeline.ts`](#1-auditingredientpipelinets) | **`npm run icons`** *(oder `npm run audit:ingredients`)* | **All-in-One Pipeline:** Generiert fehlende Icons, auditiert Geometrie/Vision & packt Zip |
| [`consolidateMappingsToCanonical.ts`](#2-consolidatemappingstocanonicalts) | `npm run mappings:consolidate` | Mergt Mapping-Duplikate in das 1-Row-Schema (`mapping_key_de`, `aliases`) |
| [`straightenAllMappings.ts`](#3-straightenallmappingsts) | *npx tsx* | Disambiguiert vage Organ-Keys (`heart` -> `chicken heart`) & übersetzt DE-Keys |
| [`cleanAllGermanIcons.ts`](#4-cleanallgermaniconsts) | *npx tsx* | Benennt deutsche `.webp`-Icon-Dateien ins Englische um und packt das Zip |
| [`generateMissingIngredientIcons.ts`](#5-generatemissingingredienticonsts) | *(ersetzt durch `npm run icons`)* | *(Historisch)* Generiert fehlende Icons via FLUX |
| [`generateIngredientImage.ts`](#6-generateingredientimagets) | *(ersetzt durch `npm run icons`)* | *(Historisch)* Manuelles Generierungsskript für Entwickler |
| [`generateCategoryIcons.ts`](#7-generatecategoryiconsts) | *npx tsx* | Generiert Fallback-Icons für alle 15 Rezept-Kategorien (Trio-Cluster) |
| [`zipIngredientIcons.ts`](#8-zipingredienticonsts) | `npm run icons:zip` / `icons:unpack` | Packt oder entpackt das `ingredient-icons.zip`-Archiv |
| [`sliceCategoryIcons.mjs`](#9-slicecategoryiconsmjs) | *node* | Zerschneidet ein 4x4 Grid-Sheet in 16 einzelne Kategorie-Icons |
| [`buildOpenFoodFactsIndex.ts`](#10-buildopenfoodfactsindexts) | `npm run build:off` | Baut den lokalen SQLite FTS5-Index (`off_de.sqlite`) aus dem OFF-Dump |
| [`backfillIngredientMappings.ts`](#11-backfillingredientmappingsts) | `npm run mappings:backfill` | Befüllt Mappings aus Rezepten (DEV/PROD) oder via Gemini KI-Synthese |
| [`testRecipesAgainstOFF.ts`](#12-testrecipesagainstoffts) | *npx tsx* | Prüft Rezepte aus der DB gegen den lokalen OFF-Index (Trefferquote) |
| [`analyzeOFFCategories.ts`](#13-analyzeoffcategoriests) | *npx tsx* | Analysiert Kategorie-Häufigkeiten im DACH-Stream von Open Food Facts |
| [`recomputeRecipeNutrition.ts`](#14-recomputerecipenutritionts) | `npm run recompute-nutrition` | Berechnet Nährwerte aller Rezepte aus OFF-Zutaten neu |
| [`purgeHostedFrames.ts`](#15-purgehostedframests) | `npm run purge-hosted-frames` | Bereinigt gehostete Video-Frames aus Supabase Storage |
| [`seedDev.ts`](#16-seeddevts) | `npm run seed:dev` | Erstellt/Aktualisiert Test-User in der DEV-Datenbank für Auto-Login |
| [`runDryRunEvaluation.ts`](#17-rundryrunevaluationts) | `npm run eval:dry-run` | End-to-End Evaluation: Scraping + Gemini Extraktion + OFF Matching |
| [`backfillRecipeSource.ts`](#18-backfillrecipesourcets) | *(Modul)* | Hilfsmodul für Rezept-Abfragen aus DEV und PROD |

---

## 🔍 1. All-in-One Icon- & Audit-Pipeline

### 1. `auditIngredientPipeline.ts`
Die **zentrale All-in-One Pipeline** für den gesamten Lebenszyklus aller Ingredient-Icons:
1. **Fehlende Icons generieren:** Erkennt fehlende Bilder automatisch und generiert sie mit FLUX.1 [schnell].
2. **Geometrie & Auto-Zoom:** Prüft Zentrierung und Mindest-Randabstand (~20 %) verlustfrei per Sharp.
3. **Gemini Vision Review:** Bewertet Studio-Qualität, freigestellten weißen Hintergrund und dezente Kontaktschatten.
4. **Adaptive Retries:** Bei Fehlern passt Gemini Vision den Prompt selbst an und generiert bis zu 3x nach.
5. **Backup & Zip:** Sichert Altversionen in `old/`, schreibt `AUDIT_REPORT.md` und aktualisiert `ingredient-icons.zip`.

* **npm-Shortcut:** **`npm run icons [-- <FLAGS>]`** *(oder `npm run audit:ingredients`)*
* **Direkt:** `npx tsx src/scripts/auditIngredientPipeline.ts [FLAGS]`
* **Flags & Optionen:**
  * `--missing-only`, `-m`: **Nur fehlende Icons generieren:** Überspringt bestehende Bilder komplett (ideal für schnelle Massen-Generierung).
  * `--icons-only`: **Nur Icons prüfen/generieren:** Überspringt den Stufe-1 Datenbank-Abgleich mit Open Food Facts.
  * `--dry-run`: Führt den gesamten Ablauf ohne Schreibzugriffe auf DB oder Dateisystem aus.
  * `--force`: Prüft auch bereits im Manifest als `ai_confirmed` markierte Einträge erneut.
  * `--interactive`, `-i`, `--debug`, `-d`: Öffnet bei Neugenerierung einen interaktiven Terminal-Vergleich (Alt vs. Neu mit Tastatur-Auswahl: Accept / Reject / Abort).
  * `--limit <N>`, `-l <N>`: Begrenzt die Anzahl der zu verarbeitenden Mappings (z. B. `--limit 10`).
  * `--budget <USD>`, `-b <USD>`: Setzt das maximale Tagesbudget für Gemini/FLUX (Default: `$2.00`).
  * `--key <NAME>`, `-k <NAME>`: Auditiert oder generiert gezielt ein einzelnes Mapping (z. B. `--key "chicken heart"`).
  * `--no-zip`: Verhindert das automatische Aktualisieren von `ingredient-icons.zip` am Ende des Laufs.
* **Beispiele:**
  ```bash
  # Standard: Fehlende Icons generieren + unbestätigte Icons auditieren
  npm run icons

  # Nur fehlende Icons generieren (schnell)
  npm run icons -- --missing-only

  # Gezielt ein einzelnes Icon prüfen / nachgenerieren
  npm run icons -- --key "chicken breast"

  # Einzelnes Icon im interaktiven Debug-Modus mit Terminal-Freigabe prüfen
  npm run icons -- --key "apple" -i

  # Testlauf für 5 Zutaten ohne Schreibzugriffe (Simulation)
  npm run icons -- --dry-run --limit 5
  # Vollständiger Batch mit erhöhtem Tagesbudget
  npm run icons -- --budget 5.00
  ```

---

### 2. `consolidateMappingsToCanonical.ts`
Konsolidiert alle Zeilen in `ingredient_mappings` auf das kanonische 1-Row-Schema. Mergt doppelte Einträge, übersetzt verbliebene deutsche `mapping_key`s ins Englische und befüllt `mapping_key_de` sowie `aliases`.

* **npm-Shortcut:** `npm run mappings:consolidate [-- <FLAGS>]`
* **Direkt:** `npx tsx src/scripts/consolidateMappingsToCanonical.ts [FLAGS]`
* **Flags & Optionen:**
  * `--dry-run`: Zeigt alle gefundenen Duplikate und geplanten Merges an, ohne die Datenbank zu verändern.
* **Beispiele:**
  ```bash
  # Vorschau der Konsolidierung
  npm run mappings:consolidate -- --dry-run

  # Ausführung in der Datenbank
  npm run mappings:consolidate
  ```

---

### 3. `straightenAllMappings.ts`
Disambiguierungsskript für anatomische Körperteile und vage Zutaten (z. B. Umbenennung von `heart` zu `chicken heart`, `tongue` zu `beef tongue`, `flour` zu `spelt flour`). Führt definierte Übersetzungsregeln aus und löscht verwaiste Duplikate.

* **Direkt:** `npx tsx src/scripts/straightenAllMappings.ts [FLAGS]`
* **Flags & Optionen:**
  * `--dry-run`: Zeigt geplante Umbenennungen und Merges an, ohne in Supabase zu schreiben.
* **Beispiele:**
  ```bash
  npx tsx src/scripts/straightenAllMappings.ts --dry-run
  npx tsx src/scripts/straightenAllMappings.ts
  ```

---

### 4. `cleanAllGermanIcons.ts`
Einmaliges Migrationsskript zur Bereinigung veralteter deutscher Icon-Dateinamen. Benennt Bilddateien im Ordner `backend/public/ingredient-icons/` nach einer Übersetzungstabelle in ihr englisches Äquivalent um und aktualisiert das Zip-Archiv.

* **Direkt:** `npx tsx src/scripts/cleanAllGermanIcons.ts`
* **Flags & Optionen:** Keine (führt vordefiniertes Mapping aus).

---

## 🎨 2. Icon-Generierung & Asset-Management

### 5. `generateMissingIngredientIcons.ts`
Bedarfsgesteuerte Generierung fehlender Icons für alle in der Datenbank existierenden Zutaten (`ingredient_mappings`). Erkennt bereits vorhandene Bilder und erzeugt nur fehlende Icons via FLUX.1 [schnell].

* **npm-Shortcut:** `npm run icons:generate-missing [-- <FLAGS>]`
* **Direkt:** `npx tsx src/scripts/generateMissingIngredientIcons.ts [FLAGS]`
* **Flags & Optionen:**
  * `--concurrency <N>`, `-c <N>`: Anzahl paralleler Worker für FLUX (1–10, Default: `4`).
  * `--limit <N>`, `-l <N>`: Maximal zu generierende Icons in diesem Lauf.
  * `--dry-run`: Zeigt fehlende Icons an, ohne API-Aufrufe an fal.ai zu tätigen.
  * `--no-zip`: Überspringt das anschließende Packen des Zip-Archivs.
  * `--zip`: Erzwingt das Packen des Zip-Archivs (Standard aktiv).
  * `--out-dir <PATH>`, `-o <PATH>`: Alternatives Ausgabe-Verzeichnis.
* **Beispiele:**
  ```bash
  # Prüfen, wie viele Icons fehlen
  npm run icons:generate-missing -- --dry-run

  # Die ersten 20 fehlenden Icons mit 4 Workern generieren
  npm run icons:generate-missing -- --limit 20 -c 4
  ```

---

### 6. `generateIngredientImage.ts`
Flexibles Entwickler-Werkzeug zur gezielten Generierung von Zutaten-Icons anhand von Open Food Facts Barcodes, IDs oder Freitext-Suchbegriffen.

* **npm-Shortcut:** `npm run generate:ingredient-image [-- <ARGUMENTE/FLAGS>]`
* **Direkt:** `npx tsx src/scripts/generateIngredientImage.ts [ID/SUCHE] [FLAGS]`
* **Argumente & Flags:**
  * `[id | search]`: Erster unbenannter Parameter; entweder ein OFF-Code (`off_4008400404127`), Barcode (`4008400404127`) oder ein Suchbegriff (`"Rote Paprika"`).
  * `--missing`: Generiert das Icon nur, wenn es noch nicht auf der Festplatte existiert.
  * `--dry-run`: Gibt den generierten FLUX-Prompt auf der Konsole aus, ohne das Bild zu erzeugen.
  * `--batch <N>`: Generiert die ersten N Zutaten aus dem lokalen Katalog.
  * `--category <CAT>`: Filtert Batch-Generierungen nach Kategorie (z. B. `DAIRY`, `FRUITS_VEGETABLES`).
  * `--concurrency <N>`: Anzahl gleichzeitiger Anfragen (Default: `3`).
  * `--steps <N>`: Anzahl der Inferenzschritte für FLUX (Default: `4`).
  * `--prompt <TEXT>`: Vollständiger manueller Prompt-Override für FLUX.
  * `--out-dir <PATH>`: Zielverzeichnis für die generierten `.webp`-Dateien.
* **Beispiele:**
  ```bash
  # Einzelnes Icon per Suchbegriff als Vorschau anzeigen (Dry-Run)
  npm run generate:ingredient-image -- "Heidelbeeren" --dry-run

  # Icon für Barcode generieren
  npm run generate:ingredient-image -- 4008400404127

  # Benutzerdefinierten Prompt verwenden
  npm run generate:ingredient-image -- "Kaviar" --prompt "Single portion of black sturgeon caviar in small glass bowl on white background"
  ```

---

### 7. `generateCategoryIcons.ts`
Erstellt die 15 Standard-Fallback-Icons für alle Rezept-Kategorien (`VEGETABLES`, `FRUITS`, `DAIRY_EGGS`, `MEAT_POULTRY`, `SEAFOOD`, etc.). Jedes Icon wird als harmonisches 3er-Trio auf reinweißem Hintergrund mit dezentem Kontaktschatten gerendert und synchron in Backend und Frontend abgelegt.

* **Direkt:** `npx tsx src/scripts/generateCategoryIcons.ts [KATEGORIE_ID]`
* **Parameter:**
  * `[KATEGORIE_ID]` *(optional)*: Name einer einzelnen Kategorie (z. B. `VEGETABLES`, `MEAT_POULTRY`). Ohne Angabe werden alle 15 Kategorien generiert.
* **Beispiele:**
  ```bash
  # Alle 15 Kategorie-Icons generieren
  npx tsx src/scripts/generateCategoryIcons.ts

  # Nur das Icon für Gemüse neu erstellen
  npx tsx src/scripts/generateCategoryIcons.ts VEGETABLES
  ```

---

### 8. `zipIngredientIcons.ts`
Verpackt alle im Verzeichnis `backend/public/ingredient-icons/` liegenden `.webp`-Dateien und `generation_costs.jsonl` in das komprimierte Archiv `public/ingredient-icons.zip` (oder entpackt dieses).

* **npm-Shortcut (Packen):** `npm run icons:zip`
* **npm-Shortcut (Entpacken):** `npm run icons:unpack`
* **Direkt:** `npx tsx src/scripts/zipIngredientIcons.ts [FLAGS]`
* **Flags & Optionen:**
  * *(ohne Flag)*: Packt alle Icons in das Zip-Archiv.
  * `--unpack`, `--extract`: Entpackt das Archiv in das Zielverzeichnis (nutzt Smart-Stamp-Prüfung).
  * `--force`: Erzwingt das Entpacken auch dann, wenn der Zeitstempel unverändert ist.
* **Beispiele:**
  ```bash
  npm run icons:zip
  npm run icons:unpack
  npx tsx src/scripts/zipIngredientIcons.ts --unpack --force
  ```

---

### 9. `sliceCategoryIcons.mjs`
Spezialisiertes Utility zum Zerschneiden eines kombinierten 4×4-Bilder-Sheets (1024×1024px) in 16 einzelne Kategorie-Icon-Dateien (`512×512px` WebP) für Frontend und Backend.

* **Direkt:** `node src/scripts/sliceCategoryIcons.mjs`
* **Flags & Optionen:** Pfad zum Quell-Sheet ist im Skript definiert (`SHEET_PATH`).

---

## 🥗 3. Zutaten-Matching & Open Food Facts

### 10. `buildOpenFoodFactsIndex.ts`
Lädt den offiziellen Open Food Facts CSV-Dump (`products.csv.gz`, ~50 GB unkomprimiert) gestreamt herunter, filtert DACH-relevante Produkte (Deutschland, Österreich, Schweiz) mit validen Nährwerten und erstellt eine schlanke, performante SQLite-Datenbank (`backend/src/data/off_de.sqlite`) mit FTS5-Volltextsuche und Purity-Ranking.

* **npm-Shortcut:** `npm run build:off`
* **Direkt:** `npx tsx src/scripts/buildOpenFoodFactsIndex.ts`
* **Flags & Optionen:** Keine (vollautomatischer Streaming-Build).

---

### 11. `backfillIngredientMappings.ts`
Befüllt die Tabelle `ingredient_mappings` mit kanonischen Zutaten. Kann Zutaten entweder aus existierenden Rezepten (DEV oder PROD) extrahieren oder per Gemini-KI synthetisch generieren.

* **npm-Shortcut:** `npm run mappings:backfill [-- <FLAGS>]`
* **Direkt:** `npx tsx src/scripts/backfillIngredientMappings.ts [FLAGS]`
* **Flags & Optionen:**
  * `--source <dev|prod|ai>`: Datenquelle (`--prod` oder `--ai` als Kurzform). Default: `dev`.
  * `--limit <N>`: Maximale Anzahl zu lesender Rezepte.
  * `--offset <N>`: Startoffset für die Rezeptabfrage.
  * `--all`: Verarbeitet alle Rezepte bis zum Ende.
  * `--concurrency <N>`: Parallele Resolver-Aufrufe (Default: `5`).
  * `--verbose`: Ausführliche Konsolenausgabe pro Zutat.
  * `--clear`: *(Achtung)* Leert die Mapping-Tabelle vor dem Start.
  * `--ai`: Aktiviert den KI-Synthese-Modus mit Gemini.
  * `--ai-category <CAT>`: Schränkt die KI-Generierung auf eine Kategorie ein (z. B. `DAIRY`, `SPICES`).
  * `--count <N>`: Anzahl der von der KI zu generierenden Zutaten (Default: `30`).
  * `--ai-prompt "<THEMA>"`: Benutzerdefinierter Themen-Prompt für die KI (z. B. `"Top 50 asiatische Saucen"`).
  * `--ingredients "<LISTE>"`: Manuelle Liste kommagetrennter Zutaten zur direkten Einspeisung.
* **Beispiele:**
  ```bash
  # Mappings aus 50 Rezepten der Produktionsdatenbank auflösen
  npm run mappings:backfill -- --prod --limit 50

  # 30 neue Milchprodukte mit Gemini generieren
  npm run mappings:backfill -- --ai --category DAIRY --count 30

  # Bestimmte Zutaten direkt einspeisen
  npm run mappings:backfill -- --ingredients "Hüttenkäse, Mandelmilch, Backpulver"
  ```

---

### 12. `testRecipesAgainstOFF.ts`
Evaluationsskript, das N Rezepte aus der DEV-Datenbank lädt und alle darin enthaltenen Zutaten gegen die lokale SQLite-Datenbank (`off_de.sqlite`) testet. Liefert eine Trefferstatistik und zeigt ungelöste Zutaten auf.

* **Direkt:** `npx tsx src/scripts/testRecipesAgainstOFF.ts [FLAGS]`
* **Flags & Optionen:**
  * `--limit=<N>`: Anzahl der zu testenden Rezepte (Default: `10`).
* **Beispiele:**
  ```bash
  npx tsx src/scripts/testRecipesAgainstOFF.ts --limit=25
  ```

---

### 13. `analyzeOFFCategories.ts`
Diagnoseskript, das den Open Food Facts Dump streamt und alle Kategorie-Tags für DACH-Produkte aggregiert, um die optimale Zuordnung für das Taxonomie-Mapping zu ermitteln.

* **Direkt:** `npx tsx src/scripts/analyzeOFFCategories.ts`

---

## 🍳 4. Rezepte & Wartung

### 14. `recomputeRecipeNutrition.ts`
Berechnet für alle Rezepte in der Datenbank die Nährwerte (Kalorien, Protein, Kohlenhydrate, Fett) anhand ihrer Zutaten und der aktuellen Open Food Facts Datenbasis neu. Korrigiert historische Rundungsfehler oder Portionsskalierungen.

* **npm-Shortcut:** `npm run recompute-nutrition`
* **Direkt:** `npx tsx src/scripts/recomputeRecipeNutrition.ts`
* **Umgebungsvariablen:**
  * `DRY_RUN=1`: Führt die Neuberechnung als Simulation aus, ohne die `recipes`-Tabelle zu aktualisieren.
* **Beispiele:**
  ```bash
  # Vorschau der Nährwert-Aktualisierungen
  DRY_RUN=1 npm run recompute-nutrition

  # Nährwerte aller Rezepte in der Datenbank aktualisieren
  npm run recompute-nutrition
  ```

---

### 15. `purgeHostedFrames.ts`
Bereinigt veraltete Video-Frames aus dem Supabase Storage Bucket `recipe-frames`. Schreibt Bild-URLs in Rezepten auf lokale Geräte-Referenzen (`local:{recipeId}:{index}`) um und löscht die gehosteten Frame-Dateien.

* **npm-Shortcut:** `npm run purge-hosted-frames`
* **Direkt:** `npx tsx src/scripts/purgeHostedFrames.ts`
* **Umgebungsvariablen:**
  * `DRY_RUN=1`: Zeigt an, welche Rezepte und Storage-Dateien bereinigt würden, ohne zu löschen.
* **Beispiele:**
  ```bash
  DRY_RUN=1 npm run purge-hosted-frames
  npm run purge-hosted-frames
  ```

---

### 16. `seedDev.ts`
Legt einen Testbenutzer in der lokalen/DEV Supabase-Instanz an oder aktualisiert dessen Passwort, damit sich das Frontend im Entwicklungsmodus ohne manuelle Registrierung einloggen kann.

* **npm-Shortcut:** `npm run seed:dev`
* **Direkt:** `npx tsx src/scripts/seedDev.ts`
* **Umgebungsvariablen:**
  * `SEED_TEST_USER_PASSWORD`: *(Erforderlich)* Das Passwort für den Testbenutzer.
  * `SEED_TEST_USER_EMAIL`: E-Mail-Adresse (Default: `test@dev.snagbite.local`).
* **Sicherheitsmechanismus:** Verweigert die Ausführung, wenn `SUPABASE_URL` auf eine Produktions-URL hinweist.
* **Beispiel:**
  ```bash
  SEED_TEST_USER_PASSWORD="MeinSicheresPasswort123!" npm run seed:dev
  ```

---

### 17. `runDryRunEvaluation.ts`
End-to-End Evaluation des Extraktions- und Matching-Stacks: Liest Social-Media-Links ein, ruft den Scraper auf, extrahiert das Rezept via Gemini Multimodal API, gleicht Zutaten mit Open Food Facts ab und generiert einen detaillierten Match- und Kosten-Report.

* **npm-Shortcut:** `npm run eval:dry-run [-- <FLAGS>]`
* **Direkt:** `npx tsx src/scripts/runDryRunEvaluation.ts [FLAGS]`
* **Flags & Optionen:**
  * `--limit <N>`, `-l <N>`: Anzahl der zu evaluierenden Rezepte.
  * `--skip <N>`, `-s <N>`: Überspringt die ersten N Einträge.
  * `--concurrency <N>`, `-c <N>`: Parallele Verarbeitungs-Worker.
  * `--file <PATH>`, `-f <PATH>`: Pfad zu einer Textdatei mit URLs (eine URL pro Zeile).
* **Beispiele:**
  ```bash
  npm run eval:dry-run -- --limit 5
  npm run eval:dry-run -- --file urls.txt --concurrency 2
  ```

---

### 18. `backfillRecipeSource.ts`
Internes Hilfsmodul für `backfillIngredientMappings.ts`. Stellt Datenbankverbindungen zu DEV und PROD bereit und extrahiert strukturierte Zutatenlisten (`ResolverInput[]`) aus Rezepten. Wird nicht direkt als CLI aufgerufen.

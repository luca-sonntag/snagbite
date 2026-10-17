---
trigger: always_on
description: Verbindliche Pflicht zur Erhöhung von CURRENT_RECIPE_PIPELINE_VERSION bei allen Änderungen an der Extraktions-, Audit- oder Normalisierungs-Pipeline, die das Rezept-Ergebnis verändern können.
---

# 🏷️ Rezept-Pipeline-Versionierung (CURRENT_RECIPE_PIPELINE_VERSION)

> **Verbindliche Pflicht für alle Entwicklungen und Agenten-Sessions:**
> Da an der Rezept-Erstellungs-Pipeline laufend gearbeitet wird, speichert jedes Rezept in der Datenbank eine `pipeline_version: integer`. Dadurch ist jederzeit nachvollziehbar, mit welchem Stand der Prompt-, KI- und Normalisierungs-Pipeline ein Rezept erzeugt wurde. Dies ermöglicht spätere gezielte Neu-Generierungen älterer Rezepte (`WHERE pipeline_version < X`).

---

## 1. 🎯 Wann MUSS `CURRENT_RECIPE_PIPELINE_VERSION` erhöht werden?

Eine Inkrementierung von `CURRENT_RECIPE_PIPELINE_VERSION` um `+1` ist **zwingend erforderlich**, sobald Änderungen an Komponenten vorgenommen werden, die das resultierende Rezept-JSON (Titel, Zutaten, Einheiten, Mengen, Zubereitungsschritte, Nährwerte, Health Scores, Kategorien, Tags etc.) potenziell verändern oder verbessern:

1. **Extraktions- und OCR-Prompts:**
   - Änderungen an Prompts in `backend/src/prompts/` (z. B. `recipeExtractionPrompt.ts`, `foodPhotographyPrompt.ts`).
   - Modifikationen an System-Prompts für Audio-Transkription, Frame-Sampling oder Remixes.

2. **Gemini Structured Schemas & Output-Parsing:**
   - Hinzufügen, Entfernen oder Ändern von Feldern oder Beschreibungen im Gemini Structured JSON Schema (`gemini.ts`).

3. **2nd-Stage Recipe Audit & Disambiguation:**
   - Änderungen an Heuristiken, LLM-Audit-Prompts oder Patch-Logik in `backend/src/matching/recipeAuditor.ts` (`auditRecipe`).

4. **Kanonische Zutaten-Auflösung & Open Food Facts Resolver:**
   - Änderungen am Matching-Algorithmus, Ranking-Heuristiken, Synonym-Auflösung oder OFF-Anreicherung (`enrichRecipeWithCanonicalIngredients`, `ingredientMatcher.ts`).

5. **Ernährungsphysiologische Berechnungen & Normalisierung:**
   - Änderungen an Makro-/Kalorien-Berechnungen, Health-Score-Gewichtungen (`healthScoreCalculator.ts`) oder Mengennormalisierungen (`shelfLife.ts`, `units.ts`).

---

## 2. 🛠️ Wie MUSS die Erhöhung durchgeführt werden?

Sobald eine der oben genannten Änderungen vorgenommen wird, müssen folgende Schritte **im selben Commit oder als direkter Folge-Commit** erfolgen:

1. **Konstante inkrementieren:**
   - Datei [`shared/src/types/recipes.ts`](file:///c:/Users/lucas/source/repos/cookbook/shared/src/types/recipes.ts):
     Erhöhe `CURRENT_RECIPE_PIPELINE_VERSION` um `+1`:
     ```ts
     export const CURRENT_RECIPE_PIPELINE_VERSION = <NEUE_VERSION>;
     ```

2. **Shared-Package kompilieren:**
   - Führe sofort im Ordner `shared` einen Build aus:
     ```powershell
     cd shared; npm run build
     ```

3. **Conventional Commit:**
   - Erstelle einen sauberen Commit:
     ```bash
     git commit -m "feat(pipeline): bump CURRENT_RECIPE_PIPELINE_VERSION to <NEUE_VERSION> (<Grund der Änderung>)"
     ```

4. **Dokumentation & Release-Checkliste:**
   - Falls durch die Änderung Altdaten migriert oder neu generiert werden sollen, trage die Information in [`docs/RELEASE_CHECKLIST.md`](file:///c:/Users/lucas/source/repos/cookbook/docs/RELEASE_CHECKLIST.md) unter offene Aufgaben ein.

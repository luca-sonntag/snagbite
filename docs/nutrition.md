# 🥗 Ernährungsphysiologische Grundlagen & Nährwert-Architektur

Dieses Dokument beschreibt die ernährungsphysiologischen Standards, Berechnungsformeln und UX-Designentscheidungen für Nährwerte, Kalorien und Makronährstoff-Verteilungen in der Snagbite-App.

---

## 1. Physiologische Brennwerte (Atwater-Faktoren)

Die Nährwertberechnung und Energieverteilung in Snagbite basiert auf den international standardisierten **spezifischen physiologischen Brennwerten (Atwater-Faktoren)**:

| Nährstoff | Brennwert pro Gramm | Einheit | Farb-Codierung im UI |
| :--- | :--- | :--- | :--- |
| **Protein / Eiweiß** | **4,0 kcal** (17 kJ) | Gramm (g) | **Blau** (`#3b82f6` / `bg-blue-500`) |
| **Kohlenhydrate** | **4,0 kcal** (17 kJ) | Gramm (g) | **Amber / Orange** (`#f59e0b` / `bg-amber-500`) |
| **Fett** | **9,0 kcal** (37 kJ) | Gramm (g) | **Rose / Rot** (`#f43f5e` / `bg-rose-500`) |
| **Ballaststoffe** | *~2,0 kcal* (8 kJ) | Gramm (g) | *(in Kohlenhydraten/Details enthalten)* |
| **Alkohol** | *7,0 kcal* (29 kJ) | Gramm (g) | *(falls in Rezeptzutaten vorhanden)* |

> [!NOTE]
> **Warum Fett mehr als doppelt so kalorienreich ist:**
> Fett besitzt mit $9\text{ kcal/g}$ eine deutlich höhere Energiedichte als Proteine ($4\text{ kcal/g}$) oder Kohlenhydrate ($4\text{ kcal/g}$). Das bedeutet: $10\text{g}$ Fett liefern $90\text{ kcal}$, während $10\text{g}$ Protein nur $40\text{ kcal}$ liefern.

---

## 2. Makronährstoff-Balken & Energieverteilung

### 🔬 Warum der Balken die Kalorienverteilung (% kcal) darstellt
In der Ernährungswissenschaft (DGE, WHO, Diätetik) und im Makro-Tracking (z. B. Keto, High-Protein, Low-Carb) werden Ernährungsformen und Zielwerte immer als **Prozentsatz der Gesamtkalorien (Energie-%)** definiert:
* **DGE-Richtwerte:** $50\text{–}55\,\%$ Kohlenhydrate, $30\,\%$ Fett, $15\text{–}20\,\%$ Protein
* **Ketogene Diät:** $70\text{–}75\,\%$ Fett, $20\text{–}25\,\%$ Protein, $5\,\%$ Kohlenhydrate
* **High Protein / Fitness:** $30\text{–}40\,\%$ Protein, $40\,\%$ Kohlenhydrate, $20\text{–}30\,\%$ Fett

Aus diesem Grund visualisiert das Progress-Balkendiagramm in Snagbite nicht das Rohgewicht in Gramm, sondern den **tatsächlichen energetischen Anteil der Makronährstoffe an der Gesamtenergie**:

```text
┌─────────────────────────┬─────────────────────────┬───────────────────────────────┐
│     Eiweiß (31 %)       │    Kohlenhydrate (31 %) │          Fett (38 %)          │
│        (Blau)           │        (Amber)          │            (Rose)             │
└─────────────────────────┴─────────────────────────┴───────────────────────────────┘
  ● Eiweiß 33g (31%)        ● Kohlenh. 33g (31%)      ● Fett 18g (38%)
```

### 🧮 Mathematische Berechnungsformel
Gegeben seien die Nährwerte pro Portion in Gramm: $P$ (Protein in g), $K$ (Kohlenhydrate in g), $F$ (Fett in g).

1. **Kalorien aus Einzelmakros berechnen:**
   $$\text{kcal}_P = P \times 4$$
   $$\text{kcal}_K = K \times 4$$
   $$\text{kcal}_F = F \times 9$$

2. **Gesamte Makro-Kalorien ermitteln:**
   $$\text{kcal}_{\text{total}} = \text{kcal}_P + \text{kcal}_K + \text{kcal}_F$$

3. **Prozentuale Anteile berechnen (mit Rundung & Restwertausgleich):**
   $$\text{pct}_P = \text{round}\left(\frac{\text{kcal}_P}{\text{kcal}_{\text{total}}} \times 100\right)$$
   $$\text{pct}_K = \text{round}\left(\frac{\text{kcal}_K}{\text{kcal}_{\text{total}}} \times 100\right)$$
   $$\text{pct}_F = \max(0, 100 - \text{pct}_P - \text{pct}_K)$$

> [!TIP]
> **UX-Klarheit durch Prozentangaben in der Legende:**  
> Da der Fettbalken bei z. B. $18\text{g}$ Fett breiter sein kann als der Proteinbalken bei $33\text{g}$ Protein, wird in der Legende direkt neben den Gramm-Werten immer auch die Prozentzahl angezeigt (`33g (31%)` vs. `18g (38%)`). So versteht der Nutzer sofort, dass die Balkenbreite den physiologischen Energiebeitrag repräsentiert.

---

## 3. Portionsrechner & Skalierung

Die Nährwertanzeige in Snagbite unterscheidet zwei Aggregationsebenen:
1. **Pro Portion (`perServing`):** Standardansicht auf Rezeptdetailseiten. Ermöglicht den direkten Vergleich verschiedener Gerichte und die Einordnung in den persönlichen Tagesbedarf (z. B. $2000\text{ kcal}$).
2. **Gesamtes Rezept (`totalNutrition`):** Summe aller im Rezept enthaltenen Zutaten.

### Dynamische Portionsanpassung
Wenn der Nutzer die Personen-/Portionsanzahl im Rezept verändert:
$$\text{Faktor} = \frac{\text{ausgewählte Portionen}}{\text{Basis-Portionen (Originalrezept)}}$$

* Die **pro Portion** angezeigten Nährwerte bleiben konstant.
* Die **Gesamtmengen der Zutaten** in der Zutatenliste und der Einkaufslisten-Übernahme werden linear mit dem Faktor skaliert.

---

## 4. Datenquellen: KI-Schätzung vs. Creator-Angaben

Rezepte können Nährwerte aus zwei unterschiedlichen Quellen beziehen:

### A. Creator-Angaben im Quell-Post (`sourceNutritionalValues`)
Manche Content Creator geben in der Caption oder im Video explizite Nährwerte an (z. B. *"450 kcal, 42g Protein"*). Diese beziehen sich oft auf das fertig gekochte Gericht inkl. Bratverlusten oder spezifischen Markenprodukten.

### B. Gemini Vision / Zutatensummierung (`nutritionalValues`)
Gemini analysiert alle extrahierten Zutaten und schätzt die Nährwerte basierend auf Standard-Lebensmitteldatenbanken.

### ⚖️ Plausibilitätsprüfung & Divergenz-Hinweis
Weichen die berechneten Nährwerte um mehr als $10\,\%$ von den Angaben des Creators ab:
$$\left| \frac{\text{kcal}_{\text{source}} - \text{kcal}_{\text{computed}}}{\text{kcal}_{\text{computed}}} \right| \ge 0,10$$
wird dem Nutzer unter der Nährwerttabelle ein transparenter Hinweis angezeigt:
> *"Quelle gibt ca. X kcal an"*

So behält der Nutzer volle Transparenz über eventuelle Unterschiede zwischen Rohzutatensumme und Creator-Angabe.

---

## 5. Wochenplaner & Nährwert-Aggregation

Im Wochenplaner (`frontend/src/components/MealPlanner/`) werden die Nährwerte aller für einen Tag oder eine Woche geplanten Mahlzeiten aggregiert:
* **Tages-Kalorien:** Summe der Kalorien aller für Frühstück, Mittagessen, Abendessen und Snacks eingeplanten Rezepte.
* **Geplante Portionen:** Berücksichtigung der für den jeweiligen Slot eingestellten Portionsanzahl.
* **Makro-Balance:** Ermöglicht dem Nutzer die Planung einer ausgewogenen Wochenernährung.

---

## 6. Technische Komponenten & Dateistruktur

| Komponente | Pfad | Beschreibung |
| :--- | :--- | :--- |
| `RecipeNutrition` | [`frontend/src/components/RecipeDetails/RecipeNutrition.tsx`](file:///c:/Users/lucas/source/repos/cookbook/frontend/src/components/RecipeDetails/RecipeNutrition.tsx) | Hauptkomponente für Nährwerte (Summary- und Detail-Grid, Calories Headline, Free/Premium Guard). |
| `MacroDistribution` | [`frontend/src/components/RecipeDetails/MacroDistribution.tsx`](file:///c:/Users/lucas/source/repos/cookbook/frontend/src/components/RecipeDetails/MacroDistribution.tsx) | Progress-Balken, Energieverteilung, Prozentberechnung und Legende. |
| `Gemini Service` | [`backend/src/services/gemini.ts`](file:///c:/Users/lucas/source/repos/cookbook/backend/src/services/gemini.ts) | Structured Output Schema für Nährwert-Extraktion (`calories`, `protein`, `carbs`, `fat`). |
| `Types` | [`frontend/src/types/index.ts`](file:///c:/Users/lucas/source/repos/cookbook/frontend/src/types/index.ts) | Typdefinitionen für `NutritionalValues` (`calories`, `protein`, `carbs`, `fat`, etc.). |

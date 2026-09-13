# Feature Ideas

## Features

- Rezepte manuell ändern und speichern

- rezepte wiederverwenden wenn es in der sprache bereits existiert, bzw. wenn andere  sprache verlangt bestehendes rezept nur von ki übersetzen und dann persistieren

- Für das vorschlagen von rezepten im Vorrat - eventuell hat user keine passenden rezepte, man könnte doch eventuell auf öffentliche rezepte zurückgreifen (aktuell sind alle rezepte in der recipes tabelle auf private visability, wie könnten wir das ausbauen?)

- rezept tinder mit öffentlichen rezepten

- Response bei Rezept kochen ohne Foto fehlt

- update von premium features und update von paywall

- einführung von animation illustrationen über iconscout (extraktion, empty states, ...)

- **Rezept-Schwierigkeitsgrade (Difficulty Levels):**
  - Schwierigkeitsgrad zu Rezepten hinzufügen (`Einfach`, `Mittel`, `Schwierig` / Beginner, Intermediate, Advanced).
  - Anzeige: Im Rezept-Header/Detailansicht und als kompaktes Badge/Icon auf den Rezeptkarten im Katalog.
  - Filter: Facetten- bzw. Schnellfilter im Kochbuchkatalog nach Schwierigkeitsgrad.
  - Gamification-Integration: Mehr XP / Belohnungspunkte für anspruchsvollere Rezepte vergeben (z. B. gestaffelte XP-Boni: Einfach = Basis-XP, Mittel = +50%, Schwierig = +100% XP).
  - Bestimmung der Schwierigkeit:
    - *Deterministisch messbar?* Anhand von Heuristiken/Metriken wie Zubereitungszeit, Anzahl Zutaten, Anzahl Schritte, parallele Kochschritte oder Kochtechniken/Equipment?
    - *Oder per KI abfragen?* Direkt von Gemini bei der Extraktion im strukturierten JSON-Schema bewerten lassen (`difficulty: 'EASY' | 'MEDIUM' | 'HARD'`) – ggf. kombiniert mit einem deterministischen Plausibilitätscheck/Fallback.

- **Öffentliche Rezepte entdecken / Browsen:**
  - Eigenständiges, interaktives Browse-Erlebnis für alle öffentlichen Rezepte (in Verbindung mit dem Teaser der 6 öffentlichen Rezepte im Kochbuch).
  - Soll mehr Spaß machen und inspirieren als eine einfache Liste (z. B. Swipe-Karten, thematische Karussells oder visuelles Magazin-Layout).
  - Nahtlose 1-Klick-Übernahme ins eigene Kochbuch oder direktes Kochen.

- **Dynamisches Nachladen von Rezepten (Pagination / Lazy Loading):**
  - Die API (`GET /api/recipes`) soll nicht mehr blind alle Rezepte auf einmal liefern, um Payload, Bandbreite und initiale Latenz bei großen Sammlungen gering zu halten.
  - Paginierung (Cursor-basiert oder Page/Limit) mit effizientem Nachladen im Hintergrund (Infinite Scroll / Background Prefetching).
  - Nahtlose Synchronisation mit dem lokalen IndexedDB-Cache (`recipe-image-cache`) und flüssiges Rendering ohne UI-Ruckler.

- **Ingredient Mappings & Icons vollständig berichtigen:**
  - Alle Zutat-Mappings, Normalisierungen (`baseName`) und zugeordneten Icons im Backend und Frontend überprüfen und berichtigen.
  - Inkonsistente oder fehlerhafte Zuordnungen bereinigen, damit jede Zutat verlässlich ihr passendes SVG/Icon und die richtige Supermarktkategorie erhält.

- **New User Experience (NUX) überarbeiten & aktualisieren:**
  - Onboarding- und Einführungserlebnis für neue Nutzer überarbeiten, modernisieren und aktualisieren.
  - Empty States (z. B. leeres Kochbuch, Wochenplaner, Einkaufsliste, Vorrat) auffrischen und Nutzer intuitiv zur ersten Aktion führen.

- **Empty-State-Mockups vereinfachen:**
  - Mockups und visuelle Darstellungen in den verschiedenen Empty States vereinfachen und entrümpeln.
  - Fokus auf eine klare, reduzierte Bildsprache ohne überladene UI-Elemente.

- **Vorrat-Feature: Workflow, UI & UX komplett überdenken:**
  - Den gesamten Ablauf rund um den Vorrat (Pantry) grundlegend hinterfragen und neu konzipieren: Nutzerführung, Pflegeaufwand und echter Alltagsmehrwert.
  - Workflow & Interaktionsdesign überarbeiten: Extrem schnelles Hinzufügen/Verwalten von Zutaten, nahtlose Synchronisation mit Einkaufsliste und automatisches Abbuchen beim Kochen.
  - UI & UX modernisieren: Aufgeräumte Bestandsübersicht, klare Kategorisierung und visuell ansprechendes Layout im Einklang mit dem Clean-Flat-Designsystem.
  - Smarteres Rezept-Matching: Präzise Vorschläge („Was kann ich kochen?“), Hervorhebung fast vollständiger Rezepte („Nur noch 1 Zutat fehlt“) und Rückgriff auf öffentliche Rezepte bei geringem Vorrat.

- **Transparente & sympathische Overlay-Message vor erster Werbung (Free-Tier):**
  - Einmaliges, warmherziges Info-Overlay/Bottom-Sheet für Free-Nutzer vor der allerersten Werbeeinblendung (z. B. vor dem ersten Interstitial oder Extraktions-Ad).
  - Tonalität: Ehrlich, nahbar und transparent auf Augenhöhe – erklären, dass KI-Videoanalysen, Cloud-Server und Datenhaltung laufende Kosten verursachen und die App dank dezenter Werbung für alle kostenlos angeboten werden kann.
  - Nutzerführung: Schafft Verständnis und Wohlwollen, nimmt Frustration und bietet eine sympathische Wahlmöglichkeit (z. B. „Alles klar, verstanden!“ als primärer Button und ein dezenter Hinweis „Lieber werbefrei? Zu Premium“).

## Findings (Behoben ✅)

- [x] Healthy Score für Rezepte berechnen & visualisieren (4-Säulen-Modell, konsolidierte `nutritional_values` JSONB-Spalte, `HealthScoreBadge` & `HealthScoreSheet`)
- [x] Mozzarella bekommt korrekten baseName `mozzarella` und mappt auf Mozzarella-Icon (behoben durch 2nd-Stage Recipe Auditor & Specificity Invariance)
- [x] Pfeffer mappt korrekt auf Speisepfeffer / `black pepper` mit Kategorie `SPICES_SEASONINGS` und Pfeffer-Icon (behoben durch Disambiguation & Category Isolation)
- [x] Autonome KI-Audit-Pipeline für Mappings & Zutat-Icons (`backend/src/audit/`, `npm run audit:ingredients`)
- [x] zutat text geht über Rezepte badge
- [x] überarbeitung von extraction page, style, struktur, aufbau, weniger technisch
- [x] extraction animation soll keine technischen schritte des erstellungsprozesses preisgeben, zb. cover image generieren oder video herunterladen, nichts davon soll der user sehen
- [x] text in cooking mode soll mehr abstand innerhalb haben (behoben: Zeilenabstand auf leading-[1.8] erhöht, Innenabstand py-3.5 und Chip-Padding optimiert)

![picture 0](../images/471caba0ddc884b4bc8bf0c61118e1f21d88a4f110980a04fd70820afead89df.png)


## Findings
- Öffentliche Rezepte ausbauen:
    - view zum browsen von allen öffentlichen rezepten, aber anders als wenn man zb bei Zuletzt gespeichert auf "Alle 15" klickt und alle 15 aufgelistet werden. Es soll ein erlebnis sein, spaß machen
    - "Rezept ansehen" button nicht bei allen öffentlichen rezepten anzeigen, wiederholung
    - Rezept preview overlay etwas schmäler machen

![picture 11](../images/8ac24aaa909f03719f5b4e1755b1bf468f420e5d3f6f3220cca1cb2a02fb33d5.png)

- Wochenplaner
    - ich möchte keinen leeren screen wenn ich auf einen tag bin wo kein rezept geplant ist, grundsätzlich möchte ich immer alle zukünftig geplanten rezepte auf einen blick immer sichtbar haben.
    - Woche einkaufen button soll für jedes rezept den zutaten auswahl bottom sheet zeigen

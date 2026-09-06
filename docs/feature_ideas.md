# Feature Ideas

## Features

- Rezepte manuell ändern und speichern

- rezepte wiederverwenden wenn es in der sprache bereits existiert, bzw. wenn andere  sprache verlangt bestehendes rezept nur von ki übersetzen und dann persistieren

- Für das vorschlagen von rezepten im Vorrat - eventuell hat user keine passenden rezepte, man könnte doch eventuell auf öffentliche rezepte zurückgreifen (aktuell sind alle rezepte in der recipes tabelle auf private visability, wie könnten wir das ausbauen?)

- healthy score für ein rezept berechnen

- rezept tinder mit öffentlichen rezepten

- Response bei Rezept kochen ohne Foto fehlt

- neue bilder für demo rezepte generieren (flux)

- update von premium features und update von paywall

- einführung von animation illustrationen über iconscout (extraktion, empty states, ...)

## Bugs / Improvements (Behoben ✅)

- [x] Mozzarella bekommt korrekten baseName `mozzarella` und mappt auf Mozzarella-Icon (behoben durch 2nd-Stage Recipe Auditor & Specificity Invariance)
- [x] Pfeffer mappt korrekt auf Speisepfeffer / `black pepper` mit Kategorie `SPICES_SEASONINGS` und Pfeffer-Icon (behoben durch Disambiguation & Category Isolation)
- [x] Autonome KI-Audit-Pipeline für Mappings & Zutat-Icons (`backend/src/audit/`, `npm run audit:ingredients`)
- [x] zutat text geht über Rezepte badge
- [x] überarbeitung von extraction page, style, struktur, aufbau, weniger technisch
- [x] extraction animation soll keine technischen schritte des erstellungsprozesses preisgeben, zb. cover image generieren oder video herunterladen, nichts davon soll der user sehen
- [x] text in cooking mode soll mehr abstand innerhalb haben (behoben: Zeilenabstand auf leading-[1.8] erhöht, Innenabstand py-3.5 und Chip-Padding optimiert)

![picture 0](../images/471caba0ddc884b4bc8bf0c61118e1f21d88a4f110980a04fd70820afead89df.png)


## Bugs / Findings
*(Aktuell keine offenen Punkte)*

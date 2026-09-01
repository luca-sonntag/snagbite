# Feature Ideas

## Features

- Rezepte manuell ändern und speichern

- rezepte wiederverwenden wenn es in der sprache bereits existiert, bzw. wenn andere  sprache verlangt bestehendes rezept nur von ki übersetzen und dann persistieren

- Für das vorschlagen von rezepten im Vorrat - eventuell hat user keine passenden rezepte, man könnte doch eventuell auf öffentliche rezepte zurückgreifen (aktuell sind alle rezepte in der recipes tabelle auf private visability, wie könnten wir das ausbauen?)

- healthy score für ein rezept berechnen

- rezept tinder mit öffentlichen rezepten

- Response bei Rezept kochen ohne Foto fehlt

- überarbeitung von extraction page, style, struktur, aufbau, weniger technisch

- extraction animation soll keine technischen schritte des erstellungsprozesses preisgeben, zb. cover image generieren oder video herunterladen, nichts davon soll der user sehen

- neue bilder für demo rezepte generieren (flux)

- update von premium features und update von paywall

- einführung von animation illustrationen über iconscout (extraktion, empty states, ...)

## Bugs / Improvements (Behoben ✅)

- [x] Autonome KI-Audit-Pipeline für Mappings & Zutat-Icons (`backend/src/audit/`, `npm run audit:ingredients`)
- [x] zutat text geht über Rezepte badge

![picture 0](../images/471caba0ddc884b4bc8bf0c61118e1f21d88a4f110980a04fd70820afead89df.png)


## Bugs / Findings
- text in cooking mode soll mehr abstand innerhalb haben

![picture 8](../images/7796089d34ce80e1fa6fb62780b3f944136aaf3a5d7bf1b8980cde93dd38d21c.png)

- Mozarella bekommt base name cheese und wird nicht mit mozarella gemapped und deshalb wird falsches icon angezeigt

![picture 9](../images/5acd2bfc806303952c21687ee74d40d527dbd80e9386e3399e035b7858a18f49.png)  

- pfeffer wird falsch gemapped mit paprika obwohl base name pepper eigentlich stimmt

![picture 10](../images/f45d94d3f25e834c6c0ef2edc96714a078ae8206cfaec7b4dad78559aeab4c29.png)  





# 🍳 Snagbite — Die ultimative Marketing-Zusammenfassung

> **Stand:** `develop`-Branch · **Plattform:** Android (Google Play) · **Paket:** `at.snagbite.app`
> **Positionierung in einem Satz:** *Rezept-Videos. Einfach extrahiert.*

Dieses Dokument ist die zentrale, vollständige Feature- und Nutzen-Referenz für Marketing,
Store-Listing, Pitches, Landingpage-Copy und Social-Ads. Es beschreibt **was die App tut**,
**für wen**, **warum sie besser ist** und listet **jedes Feature** aus dem aktuellen
`develop`-Stand auf.

---

## 1. 🎯 Der Elevator Pitch

**Snagbite verwandelt Koch-Videos aus Social Media in Sekunden in ein sauberes, kochbares Rezept.**

Du scrollst durch Instagram, TikTok oder YouTube Shorts, siehst ein leckeres Gericht — und
teilst das Video einfach mit Snagbite. Statt das Video zehnmal zu pausieren, mitzuschreiben und
Mengen zu raten, bekommst du sofort ein strukturiertes Rezept: **Zutatenliste mit exakten
Mengen, Schritt-für-Schritt-Anleitung, Nährwerte pro Portion, Kochtimer, Einkaufsliste und
einen KI-Koch-Assistenten** — alles in einer eleganten App, die sich dein persönliches
digitales Kochbuch aufbaut.

**Und mehr als nur Reels:** Snagbite liest auch **abfotografierte Kochbuchseiten,
Rezeptkarten und handgeschriebene Zettel** per KI ein. *„Rette Omas Rezepte in dein Kochbuch.“*

---

## 2. 💡 Das Problem & unsere Lösung

| Das Problem | Snagbites Lösung |
|---|---|
| Rezept-Reels sind unterhaltsam, aber unpraktisch zum Nachkochen | Ein Tap → strukturiertes, kochbares Rezept |
| Ständiges Pausieren, Zurückspulen, Mitschreiben | KI extrahiert Zutaten, Mengen & Schritte automatisch |
| Mengen im Video fehlen oder sind ungenau | KI schätzt & rekonstruiert fehlende Mengen plausibel |
| Nährwerte unbekannt | Automatische Kalorien & Makros **pro Portion** |
| Gespeicherte Reels verschwinden im Feed-Chaos | Persönliches, durchsuchbares Kochbuch mit Sammlungen |
| Einkaufen ist umständlich | Auto-generierte, nach Supermarkt-Abteilungen sortierte Einkaufsliste |
| Physische Kochbücher sind nicht durchsuchbar | Foto-Import per OCR (inkl. Handschrift) |

---

## 3. ⚡ Wie es funktioniert — in 3 Schritten

1. **Video finden** — Ein Rezept-Video auf Instagram, TikTok oder YouTube Shorts entdecken.
2. **Teilen & Senden** — Über den nativen „Teilen“-Button direkt an Snagbite schicken (oder Link einfügen — oder eine Kochbuchseite abfotografieren).
3. **Loskochen** — Das fertige, strukturierte Rezept ist sofort da: Zutaten, portionierbare Mengen, Nährwerte, Timer & Einkaufsliste.

*Kein Abtippen. Kein mühsames Pausieren. Einfacher geht es nicht.*

---

## 4. 🌟 Die Kern-USPs (Unique Selling Points)

1. **Direkt im Teilen-Menü** — Snagbite ist als Share-Target integriert. Kein Copy-Paste, kein App-Wechsel.
2. **Multimodale KI-Extraktion (Google Gemini)** — analysiert Video-Bilder, Ton **und** Bildunterschrift gemeinsam für maximale Präzision.
3. **Nicht nur Text — echte Struktur** — bereinigte Zutatennamen, getrennte Mengen/Einheiten/Modifizierer, Supermarkt-Kategorien, Nährwerte pro Portion.
4. **Vom Reel bis zum fertigen Teller** — Extraktion, Kochbuch, Einkaufsliste, Timer, Kochmodus & KI-Chat in einer App.
5. **Auch für die analoge Küche** — Foto-Import liest Kochbücher & handschriftliche Rezepte.
6. **Motivation zum Kochen** — Gamification mit XP, Streaks, Abzeichen & KI-verifizierten Koch-Fotos, plus Freundes-Ranglisten.
7. **Datenschutz by Design** — Rezepte in einer persönlichen, per Row-Level-Security geschützten Datenbank; Bilder werden **nur lokal** auf dem Gerät gecacht.

---

## 5. 🧩 Der vollständige Feature-Katalog

### 5.1 📥 Import-Kanäle — jede Rezeptquelle

- **Social-Media-Reels:** Instagram Reels, TikTok, YouTube Shorts (und Facebook via Fallback).
- **Bilderkarussell-Posts:** Instagram/TikTok-Posts, bei denen Zutaten & Schritte als Text auf mehreren Slides stehen, werden vollständig gelesen (bis zu 15 Slides in voller Auflösung).
- **Website-Links:** Rezept-Webseiten werden ebenfalls unterstützt.
- **Foto-Import (OCR):** Physische Kochbuchseiten, Zeitschriften-Ausschnitte und **handgeschriebene** Rezeptkarten abfotografieren (bis zu 5 Seiten) — die KI liest sie ins gleiche saubere Rezept-Format. Emotionaler Aufhänger: *„Rette Omas Rezepte.“*
- **Share-Target-Integration:** Nativ ins Android-Teilen-Menü eingehängt — teilen aus jeder App heraus.
- **Robuste Scraper-Kette:** Mehrstufige Provider-Kette (schneller Primär-Provider → lokaler Fallback → Residential-Proxy-Fallback) mit automatischen Retries für maximale Erfolgsquote.

### 5.2 🤖 KI-Extraktion — die intelligente Substanz

- **Multimodale Analyse:** Video-Frames, Audio-Transkript und Caption in **einem** Gemini-Aufruf.
- **Strukturierte Ausgabe:** Titel, Beschreibung, Zutaten (Name/Menge/Einheit/Modifizierer), Schritte, benötigte Ausrüstung, Kochtipps, Alternativzutaten und ein passendes Rezept-Emoji.
- **Saubere Zutatennamen:** Mengen, Zahlen und Attribute („gerieben“, „mager“) werden vom Namen getrennt in eigene Felder gepackt.
- **Nährwerte pro Portion:** Automatische Berechnung von Kalorien, Eiweiß, Kohlenhydraten & Fett — normiert auf eine Portion, mit Halluzinations-Schutz.
- **Automatische Supermarkt-Kategorisierung:** Jede Zutat wird einer Abteilung zugeordnet (Obst & Gemüse, Molkerei, Konserven …).
- **Fehlende Zutaten rekonstruieren:** Sichtbare, aber in der Beschreibung vergessene Zutaten werden mit geschätzten Mengen ergänzt.
- **Verbundzutaten zerlegen:** Selbstgemachte Komponenten (z. B. „Pesto“, „Smash-Patties“) werden in ihre Rohbestandteile aufgelöst.
- **Roh-/Gekocht-Erkennung:** Unterscheidet z. B. 250 g rohen vs. gekochten Reis.
- **Mehrfachrezept-Erkennung:** Roundup-Videos („5 Meal-Prep-Ideen“) werden erkannt und sauber gemeldet, statt zu einem unbrauchbaren Misch-Rezept zu verschmelzen.
- **Persönliche Sprache & Einheiten:** Bevorzugte Rezeptsprache (DE/EN), Temperatur (°C/°F) und Maßsystem (metrisch/imperial) pro Nutzer einstellbar — die KI übersetzt & rechnet automatisch um.

### 5.3 👨‍🍳 Das Koch-Erlebnis

- **Elegante Rezept-Detailansicht:** Flüssiges Single-Page-Scroll-Layout mit Scroll-Spy-Navigation (Details · Zutaten · Zubereitung).
- **Portionsrechner:** Mengen live auf jede Portionszahl hoch-/runterrechnen.
- **Nährwert-Anzeige:** Makros & Kalorien pro Portion, übersichtlich dargestellt.
- **Interaktive Checklisten:** Zutaten & Schritte zum Abhaken.
- **In-App Koch-Timer:** Zeitangaben in Schritten sind antippbar → Timer starten (mit Feinjustierung ±50 %). Parallele Timer, Sticky-Banner mit Fortschritt, Alarm-Ton + Vibration + Notification, Ein-Tap-Sprung zurück zum richtigen Schritt.
- **Kochmodus:** Fokussierter, ablenkungsfreier Schritt-für-Schritt-Modus fürs Kochen am Herd.
- **Recipe Copilot (KI-Chat):** Rezept-spezifischer Assistent, der Fragen beantwortet, Mengen umrechnet, Zutaten ersetzt, Timer setzt und Zutaten zur Einkaufsliste hinzufügt — mit rezeptspezifischen Vorschlags-Chips.
- **Remix / Rezept anpassen:** Der Copilot kann das Rezept umschreiben („mach es vegan“, „für 6 Personen“) — mit Bestätigung als *„Aktuelles ersetzen“* oder *„Als neues Rezept speichern“*.
- **Quelle immer verlinkt:** Creator-Handle & Original-Video bleiben verknüpft (mit sauberem Link-Fallback).

### 5.4 📚 Das persönliche Kochbuch (3-Ebenen-Katalog)

- **Kochbuch-Home:** Browsebare Startseite mit Suche, Sammlungs-Karussell und thematischen Regalen („Zuletzt geöffnet“, „Favoriten“, „Schnell gekocht“, „Zuletzt gespeichert“).
- **Listenansicht:** Voll filter- & sortierbar; wahlweise Poster-Grid oder kompakte Zeilen; Mehrfachauswahl mit Bulk-Aktionen.
- **Sammlungen:** Benannte Rezept-Gruppen mit automatischem 2×2-Mosaik-Cover.
- **Freitext-Labels/Flags:** Eigene Tags pro Rezept.
- **Kombinierbare Filter:** Nach Favoriten, max. Zeit, Sammlung und Flags — clever verknüpft.
- **Favoriten & „Zuletzt geöffnet“:** Schneller Wiedereinstieg.

### 5.5 🛒 Die smarte Einkaufsliste

- **Ein-Tap-Übernahme:** Rezept-Zutaten direkt auf die Einkaufsliste.
- **Rohstoff-Konsolidierung:** Eine Taxonomie-Engine fasst Teilzutaten zusammen (z. B. *2 Eigelb + 1 Ei = 3 Eier*, *Zitronenabrieb + Zitronensaft → Zitrone*).
- **Sortierung nach Supermarkt-Reihenfolge:** Obst & Gemüse → Brot → Konserven … für den effizienten Einkauf.
- **Transparenter Sub-Item-Breakdown:** Zeigt, aus welchen Rezept-Zutaten ein Einkaufsposten entsteht.
- **Erledigt-Accordion:** Abgehakte Artikel wandern eingeklappt weg — kein visuelles Rauschen im Laden.
- **Eigene Artikel:** Freie Posten manuell hinzufügen.

### 5.6 🎮 Gamification — Motivation zum Kochen

- **Koch-Fotos mit KI-Verifizierung:** Jeder abgeschlossene Cook braucht ein Foto des fertigen Gerichts; Gemini Vision prüft, ob es zum Rezept passt.
- **XP, Coins, Level:** Punkte fürs Nachkochen, Level-Aufstiege mit Konfetti-Animation.
- **Streaks:** Tägliche Koch-Serien mit lokalen Erinnerungen.
- **Abzeichen (Badges):** Freischaltbare Erfolge.
- **Fortschritts-Tab:** Level-/XP-Balken, Streak, Coins, Cook-Zähler und Badge-Galerie.
- **Koch-Historie pro Rezept:** Timeline mit XP-Gutschriften, Verifizierungs-Badge und Foto-Lightbox („x-mal gekocht · zuletzt vor …“).

### 5.7 🏆 Social — Freunde & Ranglisten

- **Freundesliste:** Freunde per teilbarem Freundescode oder direkt aus dem Leaderboard hinzufügen.
- **Ranglisten:** Umschaltbar zwischen **Freunde** & **Global** sowie **Diesen Monat** & **Gesamt**.
- **Profil:** Selbstgewählter Anzeigename & Avatar (E-Mail wird nie an Freunde weitergegeben).
- **Invite-Links:** Web-Landingpage `/invite/:code` öffnet die App direkt (Deep Linking / App Links).

### 5.8 🔔 Smarte KI-Push-Benachrichtigungen

- **Personalisierte Nudges:** Der Server wählt aus dem eigenen Kochbuch den passendsten Anlass (Wochentag, Uhrzeit, Saison, Feiertage, Favoriten, Sammlungen, Speicher-Alter) und lässt Gemini eine warme, kurze Nachricht formulieren.
- **~15 Benachrichtigungs-Typen** in **5 opt-in-Kategorien** (Saisonales, Erinnerungen, Timing, Dein Geschmack, Meilensteine).
- **Nie spammig:** Frequenz-Deckelung, Sende-Zeitfenster & granulare Opt-in-Toggles in den Einstellungen.
- *(Feature ist gebaut und ausliefer-bereit; wird per Ops-Schalter aktiviert.)*

### 5.9 🛠️ Komfort & Qualität

- **Zweisprachig (DE/EN):** Vollständige Lokalisierung mit Browsersprachen-Erkennung.
- **Offline-Bildercache:** Rezeptbilder werden komprimiert lokal (IndexedDB) gespeichert — schnell & datensparend, **keine** Bilddaten auf dem Server.
- **In-App-Feedback & Bug-Reports:** Direkt aus der App mit Screenshots & automatischem Kontext.
- **Live-Updates (OTA):** Verbesserungen kommen ohne Warten auf ein Store-Release aufs Gerät.
- **Sauberes, modernes Design:** React 19 + HeroUI, Emerald/Teal-Markenwelt, Light & Dark Mode.

---

## 6. 💎 Freemium & Monetarisierung

Snagbite ist **kostenlos nutzbar** und finanziert sich über Werbung & ein optionales Premium-Abo.

| | **Free** | **Premium** |
|---|---|---|
| Extraktionen pro Tag | 3 | 50 |
| Gespeicherte Rezepte | bis zu 5 | unbegrenzt |
| Einkaufsliste | 1 Rezept | unbegrenzt |
| Nährwerte | angedeutet | voll sichtbar |
| Timer · Kochmodus · Copilot · Sammlungen · Labels | — | ✓ |
| Werbung | Banner & MREC | werbefrei |

- **Rewarded Video Ads:** Free-User können durch ein kurzes Video **+1 Extraktion** freischalten.
- **Werbung, die nicht stört:** Banner werden in Detailansichten, Einstellungen und während aktiver Extraktionen automatisch ausgeblendet; DSGVO-konformer Consent-Flow.
- **Premium via In-App-Kauf** (RevenueCat) — werbefrei & alle Features freigeschaltet.

---

## 7. 📱 Plattform & Technik (für Trust-Signale)

- **Native Android-App** im Google Play Store (Capacitor).
- **Datenschutz:** Persönliche Rezepte per Row-Level-Security isoliert — nur du siehst deine Inhalte; Daten werden nie weiterverkauft.
- **KI-Engine:** Google Gemini (multimodal, strukturierte JSON-Ausgabe).
- **Zuverlässigkeit:** Asynchrone Job-Queue, mehrstufige Fallbacks, Health-Monitoring.
- **Schnelle Iteration:** Over-the-Air-Updates für laufende Verbesserungen.

---

## 8. 👥 Zielgruppen

- **Social-Media-Foodies** — sammeln ständig Rezept-Reels, kochen sie aber selten nach.
- **Alltags-Köch:innen** — wollen schnell einkaufen & kochen ohne Mitschreiben.
- **Meal-Prepper & Fitness-orientierte** — brauchen Makros & Portionskontrolle.
- **Hobby-Köch:innen mit Kochbuch-Sammlung** — wollen physische Rezepte digitalisieren.
- **Gamification-affine Nutzer:innen** — Motivation durch Streaks, XP & Freundes-Ranglisten.

---

## 9. 📣 Marketing-Botschaften & fertige Copy

### Taglines
- **Rezept-Videos. Einfach extrahiert.**
- Vom Reel zum Rezept — in Sekunden.
- Hör auf zu scrollen. Fang an zu kochen.
- Dein Feed ist voller Rezepte. Snagbite macht sie kochbar.
- Rette Omas Rezepte in dein digitales Kochbuch.

### App-Store-Kurzbeschreibung (~80 Zeichen)
> Verwandle Instagram-, TikTok- & YouTube-Rezeptvideos in kochbare Rezepte.

### App-Store-Langbeschreibung (Entwurf)
> **Snagbite verwandelt Koch-Videos in fertige Rezepte — in Sekunden.**
>
> Du siehst ein leckeres Gericht auf Instagram, TikTok oder YouTube Shorts? Teile das Video
> einfach mit Snagbite und erhalte sofort ein sauberes Rezept: exakte Zutatenliste,
> Schritt-für-Schritt-Anleitung, Nährwerte pro Portion und einen Portionsrechner.
>
> Und es kann noch mehr: Fotografiere Kochbuchseiten oder handgeschriebene Rezeptkarten ab —
> Snagbite liest sie per KI ein. Baue dir dein persönliches, durchsuchbares Kochbuch mit
> Sammlungen und Labels auf, erstelle mit einem Tap eine nach Supermarkt-Abteilungen sortierte
> Einkaufsliste, starte Koch-Timer direkt aus den Schritten und frag den KI-Koch-Assistenten,
> wenn du eine Zutat ersetzen willst.
>
> Koche nach, mach ein Foto und sammle XP, Streaks & Abzeichen — miss dich mit Freunden auf
> der Rangliste. Kostenlos starten, jederzeit Premium für unbegrenztes Kochen.
>
> **Jetzt laden und dein nächstes Lieblingsgericht kochen.**

### Feature-Bullets (für Store & Ads)
- ✅ Reels, TikToks & Shorts per Teilen-Button in Rezepte verwandeln
- ✅ Exakte Zutaten, Schritte & Nährwerte dank multimodaler KI
- ✅ Kochbuchseiten & handschriftliche Rezepte abfotografieren
- ✅ Smarte, nach Supermarkt sortierte Einkaufsliste
- ✅ Portionsrechner, Koch-Timer & fokussierter Kochmodus
- ✅ KI-Koch-Assistent: Fragen stellen, Rezepte anpassen
- ✅ XP, Streaks, Abzeichen & Freundes-Ranglisten
- ✅ Persönliches Kochbuch mit Sammlungen & Suche
- ✅ Deutsch & Englisch · Light & Dark Mode

### Social-Ad-Hook-Ideen
- „POV: Du hast 200 Rezept-Reels gespeichert und keins nachgekocht. 👀“
- „Screenshot war gestern. Teile das Reel — bekomm das Rezept.“
- „Ich hab Omas handgeschriebenes Rezept einfach abfotografiert …“

---

*Dieses Dokument fasst den Funktionsumfang des `develop`-Standes zusammen und dient als
Single Source of Truth für alle Marketing-Materialien.*

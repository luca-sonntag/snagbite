# 📊 Wirtschaftlichkeits- & Monetarisierungs-Analyse (Unit Economics & P&L)

Dieses Dokument bietet eine vollständige betriebswirtschaftliche Analyse des Projekts **Instagram Reel Rezept-Extraktor**. Es schlüsselt sämtliche variablen KI- und Infrastrukturkosten auf, stellt ihnen die Einnahmen aus Google AdMob (Werbung) und RevenueCat (Premium-Abonnements) gegenüber und simuliert die Profitabilität bei verschiedenen Nutzerzahlen und Nutzungsgraden.

---

## 1. Executive Summary & Kernaussagen

* **Extrem hohe Rohertragsmarge:** Eine vollständige Rezept-Extraktion (multimodaler Gemini-3.1-Flash-Lite-Call + FLUX.1 [schnell] HD-Coverbild + Zutatennormalisierung) kostet **ca. 0,0078 $ (0,78 Cent)**. Mit Gemini 2.5 Flash-Lite sinkt dies sogar auf **0,0049 $ (0,49 Cent)**.
* **Der „Rewarded-Ad-Arbitrage“-Effekt:** Wenn ein Free-Nutzer sein tägliches Limit (3 Extraktionen) erreicht hat und ein Rewarded Video Ad ansieht, generiert dieser View in DACH/Tier-1 durchschnittlich **0,018 $ bis 0,025 $**. Die durch den Bonus-Credit verursachte Extraktion kostet jedoch nur **0,0078 $**. **Jede werbefinanzierte Extraktion ist ab Tag 1 netto profitabel (+0,010 $ bis +0,017 $ Reingewinn pro Ad-Watch).**
* **Solide Unit Economics bei Abos:** Ein zahlender Premium-Kunde (z. B. 2,99 € / Monat, netto nach Store-Gebühr ca. **2,54 $**) verursacht bei intensiver Nutzung (25 Rezepte/Monat + Copilot) lediglich **ca. 0,21 $** KI-Kosten. Dies entspricht einer **Bruttomarge von über 91 %**.
* **Niedrige Fixkosten:** Dank Supabase, Railway und Google Cloud liegen die monatlichen Fixkosten in der Startphase bei unter 10–35 $ / Monat. Der Break-Even-Punkt wird bereits bei **unter 20 zahlenden Abonnenten** erreicht.

---

## 2. Detaillierte Kostenstruktur (Cost Drivers)

### A. Variable KI-Kosten pro Einzelaktion

| Aktion | Modell / Service | Input (Tokens) | Output (Tokens) | Kosten (`gemini-3.1-flash-lite`) | Kosten (`gemini-2.5-flash-lite`) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Rezept-Extraktion** | Gemini Flash-Lite | ~ 8.000 | ~ 1.500 | 0,00425 $ | 0,00140 $ |
| **HD-Coverbild** | FLUX.1 [schnell] (fal.ai) | – (Direct API) | 1 Bild (4 Steps) | 0,00350 $ | 0,00350 $ |
| **OFF Ingredient Matching** | Gemini Reranker Tool | ~ 1.000 | ~ 120 | 0,00043 $ *(Ø 0,2x / Rezept = 0,00009 $)* | 0,00015 $ *(Ø 0,00003 $)* |
| **Rezept-Extraktion Gesamt** | **Gemini + FLUX + Resolver** | – | – | **~ 0,00784 $** *(0,78 Cent)* | **~ 0,00493 $** *(0,49 Cent)* |
| **Copilot Chat-Nachricht** | Gemini Flash-Lite | ~ 2.200 | ~ 250 | 0,00092 $ | 0,00032 $ |
| **Copilot Quick-Chips** | Gemini Flash-Lite | ~ 900 | ~ 180 | 0,00050 $ *(clientseitig gecacht)* | 0,00016 $ |
| **Cook Photo Verification** | Gemini Vision | ~ 1.200 | ~ 150 | 0,00053 $ | 0,00018 $ |
| **Push-Notification Copy** | Gemini Flash-Lite | ~ 600 | ~ 80 | 0,00027 $ *(max. 3x / Woche)* | 0,00009 $ |
| **Deterministischer Remix** | `recipeOperations.ts` | 0 | 0 | **0,00000 $** (Reine TS-Logik) | **0,00000 $** |

---

### B. Fixe & Basisinfrastruktur-Kosten (pro Monat)

| Dienst | Zweck | Starter (bis 1.000 MAU) | Wachsend (bis 10.000 MAU) | Scale (bis 50.000 MAU) |
| :--- | :--- | :--- | :--- | :--- |
| **Railway Container** | Node.js Backend & Queue Worker | 5,00 $ | 15,00 $ | 40,00 $ |
| **Supabase Postgres** | Datenbank, Auth & Storage Buckets | 0,00 $ *(Free Tier)* | 25,00 $ *(Pro Tier)* | 50,00 $ *(Pro + Storage Add-on)* |
| **RapidAPI Social Scraper** | Instagram / TikTok Metadaten | 0,00 $ – 10,00 $ | 30,00 $ | 75,00 $ |
| **Developer Accounts** | Google Play (25 $ einmalig), Apple (99 $/Jahr) | ~ 8,25 $ | ~ 8,25 $ | ~ 8,25 $ |
| **Infrastruktur Fixkosten** | **Summe** | **~ 23,25 $ / Monat** | **~ 78,25 $ / Monat** | **~ 173,25 $ / Monat** |

---

## 3. Einnahmenstruktur (Revenue Streams)

### A. Google AdMob (Free-User-Monetarisierung)

In der DACH-Region (Deutschland, Österreich, Schweiz) sowie Tier-1-Ländern (USA, UK) erzielen mobile Food- und Lifestyle-Apps folgende reale eCPM-Werte:

| Werbeformat | Platzierung in der App | Typischer eCPM (Tier 1) | Erlös pro 1.000 Impressions | Erlös pro Einzel-Impression |
| :--- | :--- | :--- | :--- | :--- |
| **Rewarded Video** | Freiwilliger Video-Watch für +1 Extraktions-Credit | **18,00 $ – 25,00 $** | 18,00 $ – 25,00 $ | **~ 0,020 $ (2,0 Cent)** |
| **App-Open / Interstitial** | Beim App-Start (mit 4h Cooldown via `ads.ts`) | **6,00 $ – 10,00 $** | 6,00 $ – 10,00 $ | **~ 0,008 $ (0,8 Cent)** |
| **MREC Banner (300×250)** | Während der Extraktion (`ExtractionAdCard`) & Katalog | **1,00 $ – 2,00 $** | 1,00 $ – 2,00 $ | **~ 0,0015 $ (0,15 Cent)** |

---

### B. In-App-Abonnements via RevenueCat (Premium-Monetarisierung)

* **Preispunkte (Konservativ vs. Standard):**
  * **Monatsabo:** 2,99 € (entspricht ca. 3,25 $) bzw. 3,99 € (ca. 4,35 $)
  * **Jahresabo:** 24,99 € (ca. 27,20 $ / Jahr $\rightarrow$ 2,27 $ / Monat)
* **App-Store-Gebühren:** 15 % (Google Play Small Business Program / Apple App Store Small Business Program für Entwickler < 1 Mio. $ Jahresumsatz).
* **Netto-Erlös pro zahlendem Abonnenten (nach Store-Cut):**
  * Bei 2,99 € Monatsabo: **~ 2,54 $ Netto / Monat**
  * Bei 3,99 € Monatsabo: **~ 3,39 $ Netto / Monat**

---

## 4. Nutzer-Personas & Nutzungsgrade

Nicht jeder Nutzer importiert täglich Rezepte. Wir unterscheiden vier realistische Aktivitätsprofile:

```
┌───────────────────────────┬───────────────────┬───────────────────┬───────────────────┐
│ Nutzer-Typ                │ Extraktionen / M. │ Copilot-Chats / M.│ App-Starts / M.   │
├───────────────────────────┼───────────────────┼───────────────────┼───────────────────┤
│ 1. Casual (Light User)    │ 2 Rezepte         │ 1 Chat            │ 6 Starts          │
│ 2. Standard (Active Free) │ 6 Rezepte         │ 3 Chats           │ 14 Starts         │
│ 3. Power Cook (Heavy Free)│ 18 Rezepte        │ 8 Chats           │ 25 Starts         │
│ 4. Premium-Abonnent       │ 25 Rezepte        │ 12 Chats          │ 30 Starts         │
└───────────────────────────┴───────────────────┴───────────────────┴───────────────────┘
```

### Einheiten-Rechnung pro Nutzerprofil (Monatlich):

#### Profil 1: Casual Free-User (2 Rezepte / Monat)
* **Kosten:**
  * Gemini + FLUX (2 Rezepte): 0,0157 $
  * Copilot & Push: 0,0020 $
  * **Gesamtkosten:** **0,018 $**
* **AdMob-Einnahmen:**
  * 6 App-Starts (Interstitials à 0,008 $): 0,048 $
  * 2 Extraktions-Banner (MREC à 0,0015 $): 0,003 $
  * **Gesamterlös:** **0,051 $**
* **Netto-Deckungsbeitrag:** **+ 0,033 $ / Monat (Gewinn)**

#### Profil 2: Standard Active Free-User (6 Rezepte / Monat)
* **Kosten:**
  * Gemini + FLUX (6 Rezepte): 0,0470 $
  * Copilot & Push: 0,0045 $
  * **Gesamtkosten:** **0,052 $**
* **AdMob-Einnahmen:**
  * 14 App-Starts (Interstitials à 0,008 $): 0,112 $
  * 6 Extraktions-Banner (MREC): 0,009 $
  * 1 Rewarded Video Ad (Bonus-Credit): 0,020 $
  * **Gesamterlös:** **0,141 $**
* **Netto-Deckungsbeitrag:** **+ 0,089 $ / Monat (Gewinn)**

#### Profil 3: Power Cook Free-User (18 Rezepte / Monat)
* **Kosten:**
  * Gemini + FLUX (18 Rezepte): 0,1411 $
  * Copilot, Verification & Push: 0,0110 $
  * **Gesamtkosten:** **0,152 $**
* **AdMob-Einnahmen:**
  * 25 App-Starts: 0,200 $
  * 18 Extraktions-Banner: 0,027 $
  * 5 Rewarded Video Ads (Quota-Top-ups à 0,020 $): 0,100 $
  * **Gesamterlös:** **0,327 $**
* **Netto-Deckungsbeitrag:** **+ 0,175 $ / Monat (Gewinn)**

#### Profil 4: Premium-Abonnent (25 Rezepte / Monat – werbefrei)
* **Kosten:**
  * Gemini + FLUX (25 Rezepte): 0,1960 $
  * Copilot (12 Chats) & Cook-Verification (3 Fotos): 0,0140 $
  * **Gesamtkosten:** **0,210 $**
* **Abonnement-Erlös (Netto nach 15 % Store-Cut bei 2,99 €):** **2,540 $**
* **Netto-Deckungsbeitrag:** **+ 2,330 $ / Monat (91,7 % Gewinnmarge!)**

> [!IMPORTANT]
> **Ergebnis:** Jeder Nutzertyp – vom inaktiven Gelegenheitsnutzer über den intensiven Free-User bis zum zahlenden Abonnenten – erzielt einen **positiven monatlichen Deckungsbeitrag**. Es gibt kein Nutzerverhalten, bei dem die variablen KI-Kosten die Werbe- oder Aboerlöse übersteigen!

---

## 5. Wirtschaftlichkeits-Simulation nach Nutzerzahlen (P&L)

Angenommene Verteilung der aktiven Nutzer (MAU):
* **80 % Standard Active Free-User** (Ø Deckungsbeitrag: +0,089 $)
* **12 % Casual Free-User** (Ø Deckungsbeitrag: +0,033 $)
* **8 % Premium-Abonnenten** (Ø Deckungsbeitrag: +2,330 $)
* $\rightarrow$ **Gewichteter Deckungsbeitrag vor Fixkosten: ca. 0,262 $ pro MAU / Monat**.

### Vollständige P&L-Tabelle (Alle Beträge in USD / Monat)

| MAU (Aktive Nutzer) | Brutto-Einnahmen (AdMob + Abos) | Store-Gebühren (15%) | Netto-Umsatz | Variable KI-Kosten (Gemini + FLUX) | Fixkosten (DB + Server) | **Monatlicher Reingewinn (Net Operating Profit)** | **Netto-Marge** |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **100** | 33,50 $ | 3,60 $ | 29,90 $ | 6,40 $ | 23,25 $ | **+ 0,25 $** *(Break-Even)* | ~ 0,8 % |
| **500** | 167,50 $ | 18,00 $ | 149,50 $ | 32,00 $ | 23,25 $ | **+ 94,25 $** | 63,0 % |
| **1.000** | 335,00 $ | 36,00 $ | 299,00 $ | 64,00 $ | 35,00 $ | **+ 200,00 $** | 66,9 % |
| **5.000** | 1.675,00 $ | 180,00 $ | 1.495,00 $ | 320,00 $ | 78,25 $ | **+ 1.096,75 $** | 73,4 % |
| **10.000** | 3.350,00 $ | 360,00 $ | 2.990,00 $ | 640,00 $ | 110,00 $ | **+ 2.240,00 $** | 74,9 % |
| **50.000** | 16.750,00 $ | 1.800,00 $ | 14.950,00 $ | 3.200,00 $ | 173,25 $ | **+ 11.576,75 $** | 77,4 % |
| **100.000** | 33.500,00 $ | 3.600,00 $ | 29.900,00 $ | 6.400,00 $ | 320,00 $ | **+ 23.180,00 $** | 77,5 % |

---

## 6. Hebel zur weiteren Gewinnmaximierung

1. **Modell-Optimierung auf `gemini-2.5-flash-lite`:**
   * Falls `gemini-2.5-flash-lite` aktiviert wird (0,10 $ statt 0,25 $ Input / 0,40 $ statt 1,50 $ Output), sinken die Gemini-Extraktionskosten pro Rezept von 0,00425 $ auf **0,00140 $** (– 67 %).
   * Bei 50.000 Nutzern spart dies monatlich **über 850 $ zusätzliche KI-Kosten** ein.
2. **Prompt-Prefix-Optimierung (Implicit Caching):**
   * Durch Voranstellen der statischen 21 Systemregeln und des JSON-Schemas als festes Präfix vor die dynamischen Video-/Audiodaten sinken die wiederkehrenden Input-Tokens um bis zu 90 % (von 0,25 $ auf 0,025 $ pro 1M).
3. **AdMob-Mediation:**
   * Hinzunahme von Bidding-Partnern (z. B. Meta Audience Network, Unity Ads, AppLovin) steigert den eCPM für Rewarded Video Ads erfahrungsgemäß um **20 % bis 40 %** (von 20 $ auf 25–28 $).
4. **Premium Paywall Optimization:**
   * Steigerung der Conversion-Rate von 8 % auf 12 % (durch Free-Trial-Banner oder zeitlich begrenzte Rabatte) verdoppelt den Netto-Monatsgewinn bei gleicher Nutzerbasis nahezu.

---

## 7. Fazit

Das Geschäftsmodell ist **extrem robust und inhärent profitabel**:
1. Dank der hocheffizienten Gemini-Flash-Lite-Architektur fallen die Inferenzkosten selbst bei Video- und Audio-Input kaum ins Gewicht (< 1 Cent pro Rezept).
2. Das Zusammenspiel aus AdMob (MREC, App-Open & Rewarded Video) deckt bereits im Free-Bereich die laufenden Server- und KI-Kosten um mehr als das Doppelte ab.
3. Jeder gewonnene Premium-Abonnent generiert eine Netto-Marge von über 90 %.

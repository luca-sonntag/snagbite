# 📊 Wirtschaftlichkeits- & Monetarisierungs-Analyse (Unit Economics & P&L)

Dieses Dokument bietet eine vollständige betriebswirtschaftliche Analyse des Projekts **Instagram Reel Rezept-Extraktor**. Es schlüsselt sämtliche variablen KI- und Infrastrukturkosten auf, stellt ihnen die Einnahmen aus Google AdMob (Werbung) und RevenueCat (Premium-Abonnements: **4,99 € / Monat** bzw. **29,99 € / Jahr**) gegenüber und simuliert die Profitabilität bei verschiedenen Nutzerzahlen und Nutzungsgraden.

---

## 1. Executive Summary & Kernaussagen

* **Attraktives Pricing (4,99 € monatlich / 29,99 € jährlich):**
  * Das Jahresabo für **29,99 €** bricht auf rechnerisch **2,50 € / Monat** herunter (**50 % Rabatt** gegenüber dem Monatsabo) – ein extrem starker psychologischer Kaufanreiz im Consumer-Food-Bereich.
  * Das Monatsabo für **4,99 €** positioniert die App als vollwertiges Premium-Küchenwerkzeug und liefert nach Store-Cut und MwSt. **ca. 3,85 $ Netto-Erlös pro Monat** pro Abonnent.
* **Extrem hohe Rohertragsmarge:** Eine vollständige Rezept-Extraktion (multimodaler Gemini-3.1-Flash-Lite-Call + FLUX.1 [schnell] HD-Coverbild + Zutatennormalisierung) kostet **ca. 0,0078 $ (0,78 Cent)**. Mit Gemini 2.5 Flash-Lite sinkt dies sogar auf **0,0049 $ (0,49 Cent)**.
* **Der „Jahresabo-Cashflow-Booster“:** Ein Kunde, der das Jahresabo für 29,99 € abschließt, spült sofort **ca. 23,14 $ Netto-Cash** in die Kasse. Seine variablen KI-Kosten über ein ganzes Jahr intensiver Nutzung (25 Rezepte/Monat = 300 Rezepte/Jahr) betragen lediglich **ca. 2,52 $ / Jahr**. **Ein einziger Jahresabonnent finanziert seine eigenen KI-Inferenzkosten für über 9 Jahre im Voraus!**
* **Der „Rewarded-Ad-Arbitrage“-Effekt:** Wenn ein Free-Nutzer sein tägliches Limit (3 Extraktionen) erreicht hat und ein Rewarded Video Ad ansieht, generiert dieser View in DACH/Tier-1 durchschnittlich **0,018 $ bis 0,025 $**. Die durch den Bonus-Credit verursachte Extraktion kostet jedoch nur **0,0078 $**. **Jede werbefinanzierte Extraktion ist ab Tag 1 netto profitabel (+0,010 $ bis +0,017 $ Reingewinn pro Ad-Watch).**
* **Niedrige Fixkosten:** Dank Supabase, Railway und Google Cloud liegen die monatlichen Fixkosten in der Startphase bei unter 10–35 $ / Monat. Der Break-Even-Punkt wird bereits bei **unter 12 zahlenden Abonnenten** erreicht.

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

### B. In-App-Abonnements via RevenueCat (4,99 € Monat / 29,99 € Jahr)

*Umrechnungskurs: 1,00 € ≈ 1,08 $ | Abzug: 19 % MwSt. (DACH) | Store-Gebühr: 15 % (Google Play & Apple Small Business Program)*

| Abonnement | Brutto-Endpreis (User) | Netto vor Store-Cut | Netto-Auszahlung an uns (nach 15% Store-Cut) | Monatlich heruntergerechnet |
| :--- | :--- | :--- | :--- | :--- |
| **Monatsabo** | **4,99 € / Monat** *(~ 5,39 $)* | 4,19 € *(~ 4,53 $)* | **3,56 € (~ 3,85 $)** | **3,85 $ / Monat** |
| **Jahresabo** | **29,99 € / Jahr** *(~ 32,39 $)* | 25,20 € *(~ 27,22 $)* | **21,42 € (~ 23,14 $)** | **1,93 $ / Monat** *(entspricht 2,50 €/M. für User)* |

#### Typischer Abo-Mix (Split):
* **65 % der Abonnenten wählen das Jahresabo (29,99 €):** Aufgrund der attraktiven Preisersparnis von 50 % gegenüber monatlicher Zahlung.
* **35 % der Abonnenten wählen das Monatsabo (4,99 €):** Nutzer, die maximale monatliche Flexibilität bevorzugen.
* **$\rightarrow$ Gewichteter Netto-Erlös pro zahlendem Abonnenten:**  
  $$0{,}35 \times 3{,}85\,\$ + 0{,}65 \times 1{,}93\,\$ = \mathbf{2{,}60\,\$ \text{ Netto pro Monat}}$$  
  *(Zusätzlich fließen pro Jahresabonnent sofort 23,14 $ Cash-Upfront in voller Höhe zu!)*

---

## 4. Nutzer-Personas & Deckungsbeiträge

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
* **Kosten:** Gemini + FLUX: 0,0157 $ | Copilot & Push: 0,0020 $ $\rightarrow$ **0,018 $**
* **AdMob-Einnahmen:** 6 Starts (Interstitials) + 2 MREC: **0,051 $**
* **Netto-Deckungsbeitrag:** **+ 0,033 $ / Monat (Gewinn)**

#### Profil 2: Standard Active Free-User (6 Rezepte / Monat)
* **Kosten:** Gemini + FLUX: 0,0470 $ | Copilot & Push: 0,0045 $ $\rightarrow$ **0,052 $**
* **AdMob-Einnahmen:** 14 Starts + 6 MREC + 1 Rewarded Ad: **0,141 $**
* **Netto-Deckungsbeitrag:** **+ 0,089 $ / Monat (Gewinn)**

#### Profil 3: Power Cook Free-User (18 Rezepte / Monat)
* **Kosten:** Gemini + FLUX: 0,1411 $ | Copilot, Verification & Push: 0,0110 $ $\rightarrow$ **0,152 $**
* **AdMob-Einnahmen:** 25 Starts + 18 MREC + 5 Rewarded Ads (Quota-Top-ups à 0,020 $): **0,327 $**
* **Netto-Deckungsbeitrag:** **+ 0,175 $ / Monat (Gewinn)**

#### Profil 4: Premium-Abonnent (25 Rezepte / Monat – werbefrei)
* **Kosten:** Gemini + FLUX (25 Rezepte): 0,1960 $ | Copilot (12 Chats) & Cook-Verification (3 Fotos): 0,0140 $ $\rightarrow$ **0,210 $**
* **Erlöse je nach gewähltem Abo-Typ:**
  * **Bei Monatsabo (4,99 €):** Netto 3,85 $ – Kosten 0,21 $ = **+ 3,64 $ / Monat Deckungsbeitrag (94,5 % Marge!)**
  * **Bei Jahresabo (29,99 €):** Netto 1,93 $ – Kosten 0,21 $ = **+ 1,72 $ / Monat Deckungsbeitrag (89,1 % Marge!)**
  * **Blended Schnitt (35% Monat / 65% Jahr):** Netto 2,60 $ – Kosten 0,21 $ = **+ 2,39 $ / Monat Deckungsbeitrag (91,9 % Marge!)**

> [!IMPORTANT]
> **Ergebnis:** Mit den neuen Preisen von 4,99 € / 29,99 € steigt die Marge bei zahlenden Nutzern auf **über 91–94 %**. Gleichzeitig sorgt das 29,99 € Jahresangebot für einen massiven Cash-Upfront-Zufluss.

---

## 5. Wirtschaftlichkeits-Simulation nach Nutzerzahlen (P&L)

Angenommene Basis-Verteilung der aktiven Nutzer (MAU):
* **80 % Standard Active Free-User** (Ø Deckungsbeitrag: +0,089 $)
* **12 % Casual Free-User** (Ø Deckungsbeitrag: +0,033 $)
* **8 % Premium-Abonnenten** (Ø Deckungsbeitrag: +2,39 $)
* $\rightarrow$ **Gewichteter Deckungsbeitrag vor Fixkosten: ca. 0,266 $ pro MAU / Monat**.

### A. Basis-Szenario: 8 % Premium-Conversion (35% Monats- / 65% Jahresabo)

| MAU (Aktive Nutzer) | Brutto-Einnahmen (AdMob + Abos) | Store-Gebühren (15%) | Netto-Umsatz | Variable KI-Kosten (Gemini + FLUX) | Fixkosten (DB + Server) | **Monatlicher Reingewinn (Net Profit)** | **Netto-Marge** |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **100** | 35,20 $ | 3,80 $ | 31,40 $ | 6,40 $ | 23,25 $ | **+ 1,75 $** *(Break-Even)* | ~ 5,5 % |
| **500** | 176,00 $ | 19,00 $ | 157,00 $ | 32,00 $ | 23,25 $ | **+ 101,75 $** | 64,8 % |
| **1.000** | 352,00 $ | 38,00 $ | 314,00 $ | 64,00 $ | 35,00 $ | **+ 215,00 $** | 68,5 % |
| **5.000** | 1.760,00 $ | 190,00 $ | 1.570,00 $ | 320,00 $ | 78,25 $ | **+ 1.171,75 $** | 74,6 % |
| **10.000** | 3.520,00 $ | 380,00 $ | 3.140,00 $ | 640,00 $ | 110,00 $ | **+ 2.390,00 $** | 76,1 % |
| **50.000** | 17.600,00 $ | 1.900,00 $ | 15.700,00 $ | 3.200,00 $ | 173,25 $ | **+ 12.326,75 $** | 78,5 % |
| **100.000** | 35.200,00 $ | 3.800,00 $ | 31.400,00 $ | 6.400,00 $ | 320,00 $ | **+ 24.680,00 $** | 78,6 % |

---

### B. Wachstums-Szenario: 12 % Premium-Conversion

Durch das attraktive Jahresangebot (**„29,99 € statt 59,88 € – nur 2,50 € / Monat“**) und In-App Trial-Aktionen steigt die Conversion-Rate im Food-Bereich typischerweise auf **12 %**:

| MAU (Aktive Nutzer) | Netto-Umsatz / Monat | Variable KI-Kosten | Fixkosten | **Monatlicher Reingewinn (Net Profit)** | **Netto-Marge** |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1.000 Nutzer** | ~ 410,00 $ | ~ 74,00 $ | ~ 35,00 $ | **~ 301,00 $ / Monat** | 73,4 % |
| **5.000 Nutzer** | ~ 2.050,00 $ | ~ 370,00 $ | ~ 78,25 $ | **~ 1.601,75 $ / Monat** | 78,1 % |
| **10.000 Nutzer** | ~ 4.100,00 $ | ~ 740,00 $ | ~ 110,00 $ | **~ 3.250,00 $ / Monat** | 79,3 % |
| **50.000 Nutzer** | ~ 20.500,00 $ | ~ 3.700,00 $ | ~ 173,25 $ | **~ 16.626,75 $ / Monat** | 81,1 % |
| **100.000 Nutzer** | ~ 41.000,00 $ | ~ 7.400,00 $ | ~ 320,00 $ | **~ 33.280,00 $ / Monat** | 81,2 % |

---

## 6. Upfront-Cashflow-Dynamik des 29,99 € Jahresabos

Ein oft übersehener Vorteil im Software-Geschäft ist die **Liquidität**:

* Bei **1.000 aktiven Nutzern** (8 % Conversion = 80 Abonnenten, davon 65 % = 52 Jahresabonnenten):
  * **Sofortige Cash-Auszahlung:** $52 \times 23{,}14\,\$ = \mathbf{1.203{,}28\,\$}$ fließen auf einen Schlag aufs Bankkonto!
  * Dies deckt die gesamten Fixkosten (Server, Datenbank, Domains) der ersten **3 Jahre** im Voraus ab.
* Bei **10.000 aktiven Nutzern** (520 Jahresabonnenten):
  * **Sofortige Cash-Auszahlung:** **~ 12.030 $**.
  * Dieses Kapital steht sofort für bezahltes Nutzerwachstum (Performance Marketing / Social Ads) zur Verfügung, **ohne** Fremdkapital aufnehmen zu müssen.

---

## 7. Steuer- & Abgaben-Realität in Österreich (Vom App-Gewinn zum privaten Netto)

Um zu verstehen, wie viel Geld am Ende **tatsächlich auf dem privaten Bankkonto** in Österreich ankommt, müssen die österreichischen Rechts- und Abgabenvorschriften berücksichtigt werden.

### A. Das österreichische Abgabensystem für App-Betreiber

1. **Umsatzsteuer-Erleichterung durch App Stores (Merchant of Record):**
   * Google Play und Apple fungieren in der EU als **Merchant of Record (MoR)** für alle In-App-Abonnements (RevenueCat). Sie berechnen die länderspezifische Mehrwertsteuer (z. B. 20 % in Österreich, 19 % in Deutschland) und führen diese **automatisch direkt an die jeweiligen EU-Finanzämter** ab.
   * AdMob-Werbeeinnahmen und Store-Auszahlungen erfolgen als B2B-Umsätze aus Irland (Google Ireland Ltd. / Apple Distribution International Ltd.) steuerfrei über das **Reverse-Charge-Verfahren** (Art. 196 MwSt-SystRL). Es fällt in Österreich keine zusätzliche Umsatzsteuerbelastung für den Entwickler an.
2. **Sozialversicherung der Selbständigen (SVS - GSVG):**
   * Beitragssätze: **Pensionsversicherung (18,50 %)** + **Krankenversicherung (6,80 %)** + **Selbständigenvorsorge (1,53 %)** + Unfallversicherung (~12,95 € / Monat).
   * **Gesamtsatz: ca. 26,83 %** auf die Beitragsgrundlage.
   * *Steuervorteil:* SVS-Beiträge sind in Österreich **vollständig als Betriebsausgaben absetzbar** und reduzieren den steuerpflichtigen Gewinn 1:1!
   * *Deckelung:* Die SVS ist nach oben durch die Höchstbeitragsgrundlage (ab ca. 89.000 € Gewinn) auf max. ca. 22.500 € / Jahr gedeckelt.
3. **Gewinnfreibetrag (GFB - § 10 EStG):**
   * **Grundfreibetrag:** 15 % der ersten 33.000 € Gewinn sind **völlig steuerfrei** (bis zu 4.950 € steuerfreier Bonus ohne Investitionserfordernis).
4. **Einkommensteuertarif Österreich (Stand 2026 nach Abschaffung der kalten Progression):**
   * Bis 13.539 €: **0 %** (Steuerfreier Grundfreibetrag)
   * 13.539 € bis 21.992 €: **20 %**
   * 21.992 € bis 36.458 €: **30 %**
   * 36.458 € bis 70.365 €: **40 %**
   * 70.365 € bis 104.859 €: **48 %**
   * Über 104.859 €: **50 %** (bzw. 55 % über 1 Mio. €)

---

### B. Konkrete Netto-Einkommenstabelle (Einzelunternehmen / Österreich)

*Berechnung auf Jahresbasis (USD in EUR zum Kurs 1,08 umgerechnet, Basis-Szenario mit 8 % Premium):*

| MAU (Aktive Nutzer) | Vorsteuer-Betriebsgewinn / Jahr (EBIT) | SVS-Beiträge (~26,8 %) | Gewinnfreibetrag (15 % GFB) | Zu versteuerndes Einkommen | Einkommensteuer (Österreich) | **Tatsächliches Netto auf dem Privatkonto / Jahr** | **Reines Netto / Monat** |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **100** | ~ 20 € | 0 € *(Freibetrag)* | – | ~ 20 € | **0 €** *(0 %)* | **~ 20 €** | ~ 2 € |
| **1.000** | ~ 2.390 € | 0 € *(unter Geringf.)* | – | ~ 2.390 € | **0 €** *(unter 13.539 €)* | **~ 2.390 €** | **~ 199 €** |
| **5.000** | ~ 13.000 € | ~ 2.800 € | ~ 1.530 € | ~ 8.670 € | **0 €** *(unter 13.539 €)* | **~ 10.200 €** | **~ 850 €** |
| **10.000** | ~ 26.500 € | ~ 5.800 € | ~ 3.100 € | ~ 17.600 € | **~ 812 €** *(nur 20% auf >13.539 €)* | **~ 19.888 €** | **~ 1.657 €** |
| **50.000** | ~ 137.000 € | ~ 22.500 € *(gedeckelt)* | 4.950 € *(Max)* | ~ 109.550 € | **~ 36.400 €** *(effektiv ~33 %)* | **~ 78.100 €** | **~ 6.508 €** |
| **100.000** | ~ 274.000 € | ~ 22.500 € *(gedeckelt)* | 4.950 € | ~ 246.550 € | **~ 104.900 €** *(effektiv ~42 %)* | **~ 146.600 €** | **~ 12.216 €** |

---

### C. Strategische Rechtsform: Einzelunternehmen vs. GmbH / FlexCo

Ab einem Vorsteuergewinn von ca. **60.000 € bis 80.000 € / Jahr** empfiehlt sich in Österreich der Wechsel in eine **Kapitalgesellschaft (GmbH oder die neue FlexCo / Flexible Kapitalgesellschaft)**:

* **Körperschaftsteuer (KöSt):** Pauschal **nur 23 %** auf Unternehmensgewinne.
* **Thesaurierungs-Vorteil:** Solange Gewinne im Unternehmen verbleiben (z. B. für Werbeausgaben, Serverkosten, Rücklagen oder neue App-Features), zahlt man **keine persönliche Einkommensteuer**, sondern lediglich 23 % KöSt.
  * *Beispiel bei 50.000 Nutzern:* Von 137.000 € Gewinn bleiben nach 23 % KöSt **über 105.000 € Cash im Unternehmen**, um Marketing und Skalierung steuerbegünstigt voranzutreiben.
* **Ausschüttung:** Erst wenn Geld als Dividende an dich privat ausgeschüttet wird, fällt 27,5 % KESt an (Gesamtsteuerbelastung: 44,18 % – statt bis zu 50 % Spitzensteuersatz).

---

### D. Der reale Fall: Nebenberuflich selbstständig mit 56.000 € ASVG-Hauptjob

Wenn du hauptberuflich angestellt bist (56.000 € Brutto/Jahr) und die App **nebenberuflich** betreibst, ändern sich die steuerlichen und sozialversicherungsrechtlichen Regeln fundamental:

#### 1. Der Grenzsteuersatz (40 % ab dem ersten Euro)
* Bei 56.000 € Jahresbrutto als Angestellter liegt dein laufendes zu versteuerndes Einkommen nach Abzug der ASVG-Sozialversicherung (~18,12 %) und Freibeträge bereits bei ca. **38.500 € bis 39.500 €**.
* **Konsequenz:** Die österreichischen Steuerstufen 0 % (bis 13.539 €), 20 % (bis 21.992 €) und 30 % (bis 36.458 €) sind **durch deinen Hauptjob bereits vollständig ausgeschöpft**.
* **Jeder Euro Gewinn aus der App fällt sofort in den Grenzsteuersatz von 40 %** (und ab ca. 70.365 € Gesamteinkommen in **48 %**).
* *Ausnahme:* Nebeneinkünfte bis **730 € Gewinn im Jahr** sind über den Veranlagungsfreibetrag (§ 41 Abs. 1 Z 1 EStG) steuerfrei.

#### 2. SVS-Mehrfachversicherung & Differenzvorschreibung
* **Bis 6.613 € Jahresgewinn (SVS-Geringfügigkeitsgrenze):**
  * **0 € Kranken- und Pensionsversicherung bei der SVS!** Du bist über deinen Hauptjob bereits vollversichert. Es fällt nur die Unfallversicherung an (~155 € / Jahr).
* **Über 6.613 € Jahresgewinn:**
  * Die SVS-Pflichtversicherung greift mit ca. 26,83 %.
  * **Steuerlicher Vorteil:** Da die SVS voll abzugsfähige Betriebsausgabe ist und du in der 40 %-Steuerklasse bist, **„erstattet“ dir das Finanzamt 40 % deiner SVS-Beiträge** über die geringere Einkommensteuer!
* **Höchstbeitragsgrundlagen-Deckel (HBGl):**
  * Dein Hauptjob (56.000 €) wird auf die jährliche Höchstbeitragsgrundlage angerechnet. Die SVS darf dir Beiträge nur bis zur Differenz zur Höchstgrenze (ca. 83.000 € – 97.000 €) vorschreiben. Auf Gewinne darüber zahlst du **0 % SVS**.

#### 3. Der 15 % Gewinnfreibetrag (GFB)
* Steht dir **auch nebenberuflich** in voller Höhe zu: 15 % deines App-Gewinns (bis 33.000 €) bleiben steuerfrei.

#### Reale Netto-Auszahlungstabelle (Hauptjob 56.000 € + App-Nebengewerbe)

*Berechnung für das Einzelunternehmen (nach Betriebsausgaben, KI-Kosten und Servern):*

| MAU (Aktive Nutzer) | App-Betriebsgewinn (EBIT) / Jahr | SVS-Beitrag (Nebenberuf) | 15 % Gewinnfreibetrag | Einkommensteuer (40 % Grenzsteuer) | **Tatsächliches Netto auf Privatkonto / Jahr** | **Reines Netto / Monat** | Netto-Quote vom Gewinn |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **100** | ~ 20 € | 0 € | – | **0 €** *(unter 730 € Freibetrag)* | **~ 20 €** | ~ 2 € | 100 % |
| **1.000** | ~ 2.390 € | ~ 155 € *(nur UV)* | 358 € | ~ 750 € *(40 % auf Rest)* | **~ 1.485 €** | **~ 124 €** | **62,1 %** |
| **5.000** | ~ 13.000 € | ~ 2.800 € | 1.530 € | ~ 3.468 € | **~ 6.732 €** | **~ 561 €** | **51,8 %** |
| **10.000** | ~ 26.500 € | ~ 5.800 € | 3.100 € | ~ 7.040 € | **~ 10.560 €** | **~ 880 €** | **40,0 %** |
| **50.000** | ~ 137.000 € | ~ 7.500 € *(HBGl-Deckel!)* | 4.950 € *(Max)* | ~ 58.000 € *(40–48 % Stufen)* | **~ 66.500 €** | **~ 5.540 €** | **48,5 %** |
| **100.000** | ~ 274.000 € | ~ 7.500 € *(gedeckelt)* | 4.950 € | ~ 125.000 € *(48–50 %)* | **~ 136.500 €** | **~ 11.375 €** | **49,8 %** |

#### 💡 Wichtige strategische Empfehlung für dich:
Da dein Lebensunterhalt durch den 56.000 € Hauptjob bereits komplett gesichert und krankenversichert ist:
* **Bei 10.000 bis 50.000 Nutzern lohnt sich eine FlexCo oder GmbH ganz besonders:**
  * Wenn du dir den Gewinn privat auszahlst, gehen rund 50–60 % an Steuern und SVS verloren.
  * **In einer FlexCo / GmbH zahlst du nur 23 % KöSt.** Du kannst das Geld in der Firma lassen, um Werbeanzeigen zu schalten, Hardware / Apple Testgeräte steuerlich abzusetzen, Server zu bezahlen oder Rücklagen aufzubauen – und verfügst über **77 % des erwirtschafteten Geldes** statt nur 40–50 %!

---

## 8. Hebel zur weiteren Gewinnmaximierung

1. **Modell-Fallback auf `gemini-2.5-flash-lite`:**  
   Senkt die Gemini-Kosten um **67 %** (von 0,00425 $ auf 0,00140 $ pro Rezept). Bei 50.000 Nutzern spart dies monatlich **über 850 $ zusätzliche KI-Kosten** ein.
2. **Prompt-Prefix-Optimierung (Implicit Caching):**  
   Durch Voranstellen der statischen 21 Systemregeln und des JSON-Schemas als festes Präfix vor die dynamischen Video-/Audiodaten sinken die wiederkehrenden Input-Tokens um bis zu 90 % (von 0,25 $ auf 0,025 $ pro 1M).
3. **AdMob-Mediation:**  
   Hinzunahme von Bidding-Partnern (z. B. Meta Audience Network, Unity Ads, AppLovin) steigert den eCPM für Rewarded Video Ads erfahrungsgemäß um **20 % bis 40 %** (von 20 $ auf 25–28 $).
4. **Paywall-Positionierung in der App:**  
   * Platzierung des Jahresabos als Standard-Auswahl (`TrialBanner.tsx` & `PremiumModal.tsx`) mit Hervorhebung des Badges **„Spare 50 % (nur 2,50 € / Monat)“**.

---

## 9. Fazit

Unter Berücksichtigung aller österreichischen Steuern und SVS-Beiträge:
1. **Bis ca. 5.000 aktive Nutzer:** Fällt in Österreich dank Grundfreibetrag (13.539 €), Gewinnfreibetrag (15 %) und SVS-Betriebsausgabenabzug **nahezu 0 € Einkommensteuer** an. Fast 80 % des Betriebsgewinns landen direkt netto auf dem Privatkonto.
2. **Ab 10.000 Nutzern:** Erreicht die App bereits ein vollwertiges Netto-Gehalt von **~ 1.650 € netto / Monat** auf dem Privatkonto.
3. **Bei 50.000 Nutzern:** Generiert das Projekt **~ 6.500 € Netto pro Monat** (oder über 105.000 € Reinvestitionskapital in einer GmbH/FlexCo).

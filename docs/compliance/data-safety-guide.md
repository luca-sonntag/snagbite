# 📋 Google Play Data Safety (Datensicherheit) Leitfaden: Snagbite

Dieser Leitfaden enthält alle verbindlichen Antworten für das **Formular zur Datensicherheit (Data Safety Form)** in der Google Play Console (*App-Inhalte > Datensicherheit*).

---

## 1. Allgemeine Fragen zur Datenerhebung & Sicherheit

| Frage in der Google Play Console | Antwort | Begründung / Kontext |
|---|---|---|
| **Erhebt oder teilt Ihre App einen der erforderlichen Nutzertyp-Daten?** | **Ja** | E-Mail, Werbe-ID und In-App-Aktivitäten werden verarbeitet. |
| **Werden alle vom Nutzer erhobenen Daten bei der Übertragung verschlüsselt?** | **Ja** | Alle Netzwerkaufrufe (Frontend, Backend, Supabase, AdMob, RevenueCat) erfolgen ausnahmslos über HTTPS/TLS 1.3 (Art. 32 DSGVO). |
| **Bietet Ihre App Nutzern die Möglichkeit, ihr Konto und ihre Daten zu löschen?** | **Ja** | Direkt in der App unter *Einstellungen > Konto-Aktionen > Account & Daten löschen* und öffentlich unter `https://snagbite.app/delete-data`. |
| **Können Nutzer die Löschung ihrer Daten anfordern, ohne die App neu zu installieren?** | **Ja** | Über das Webformular / Support-Kontakt auf `https://snagbite.app/delete-data`. |

---

## 2. Erfasste Datentypen im Detail

### A. Personenbezogene Daten (Personal Info)

#### 1. E-Mail-Adresse
* **Erhoben?** Ja
* **Weitergegeben?** Nein
* **Verarbeitung:** Nur für Authentifizierung (Supabase Auth).
* **Zwecke:**
  * App-Funktionalität (Kontoerstellung, Login, Synchronisierung)
  * Kontoverwaltung
* **Erforderlich oder optional:** Erforderlich für personalisierte Funktionen.

#### 2. Benutzer-IDs (User IDs)
* **Erhoben?** Ja
* **Weitergegeben?** Nein
* **Verarbeitung:** Eindeutige Supabase `auth.uid()` zur Zuordnung von Rezepten, Sammlungen und Einkaufslisten.
* **Zwecke:** App-Funktionalität, Kontoverwaltung.

---

### B. Finanzdaten (Financial Info)

#### 1. Kaufverlauf (Purchase History)
* **Erhoben?** Ja
* **Weitergegeben?** Ja (an RevenueCat & Google Play Billing)
* **Verarbeitung:** Pseudonymisierte Transaktions-IDs zur Freischaltung des Snagbite Pro-Abonnements.
* **Zwecke:** App-Funktionalität (Abonnement-Status & Quotas), Betrugsprävention.
* **Erforderlich:** Erforderlich beim Kauf von Pro.

---

### C. Fotos und Videos (Photos and Videos)

#### 1. Fotos
* **Erhoben?** Ja
* **Weitergegeben?** Nein (Verarbeitung über die Google Gemini Vision API auf verschlüsselten Servern, keine dauerhafte Weitergabe an Dritte).
* **Verarbeitung:**
  * Rezeptkarten-Scan (OCR zur Textextraktion)
  * Gamification: Optionales Foto des gekochten Gerichts als Kochbeweis.
* **Zwecke:** App-Funktionalität.
* **Erforderlich oder optional:** **Optional** (Nutzer wählt aktiv Fotos aus oder überspringt dies).

---

### D. App-Aktivitäten (App Activity)

#### 1. App-Interaktionen
* **Erhoben?** Ja
* **Weitergegeben?** Nein
* **Verarbeitung:** Gespeicherte Rezepte, Sammlungen, Vorratskammer, Koch-Events und Streaks.
* **Zwecke:** App-Funktionalität, Personalisierung.

#### 2. In-App-Suchverlauf
* **Erhoben?** Ja (Lokal / Session)
* **Weitergegeben?** Nein
* **Zwecke:** App-Funktionalität (Filterung des Katalogs).

---

### E. Geräte- oder andere Kennungen (Device or other IDs)

#### 1. Werbe-ID (Google Advertising ID / GAID)
* **Erhoben?** Ja
* **Weitergegeben?** Ja (an Google AdMob)
* **Verarbeitung:** Bereitstellung von In-App-Werbung (MREC-Extraktionskarte & Rewarded Video Ads).
* **Zwecke:** Werbung oder Marketing, Analyse.
* **Hinweis zu DSGVO/UMP:** Nutzer in der EU/EWR erhalten beim ersten Start das UMP-Consent-Formular. Bei Ablehnung werden ausschließlich nicht-personalisierte Anzeigen ausgeliefert.

---

### F. Absturzprotokolle und Diagnosedaten (Crash logs & Diagnostics)

#### 1. Absturzprotokolle & Diagnosedaten
* **Erhoben?** Ja (Server- und Anwendungslogs)
* **Weitergegeben?** Nein
* **Zwecke:** Analyse, Fehlerbehebung und Systemstabilität.

---

## 3. Nachweise und Links für die Play Console

* **Datenschutzerklärung (Privacy Policy URL):**  
  `https://snagbite.app/privacy`
* **URL zur Kontolöschung (Data Deletion URL):**  
  `https://snagbite.app/delete-data`
* **Kontakt-E-Mail:**  
  `support@snagbite.app`

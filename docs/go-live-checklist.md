# 🏁 Google Play Store Go-Live Checklist: Snagbite

Diese Checkliste fasst alle zwingenden rechtlichen, technischen, monetären und store-spezifischen Schritte zusammen, die vor dem weltweiten Rollout im Google Play Store abgeschlossen und verifiziert sein müssen.

---

## 📋 1. Google Play Console & Rechtliches (Compliance)

> [!IMPORTANT]
> Unvollständige Angaben oder fehlende Pflichtlinks führen zum sofortigen Reject durch das Google Play Review-Team.

- [ ] **Entwicklerkonto & Verifizierung:**
  - [ ] Entwickler-Identität und Zahlungsdaten in der Google Play Console verifiziert.
  - [ ] **20-Tester-Regel (nur bei privaten Entwicklerkonten nach Nov. 2023):**
    - [ ] Mindestens 20 Tester im geschlossenen Test (Closed Testing) rekrutiert.
    - [ ] 14 Tage ununterbrochene Testphase erfolgreich absolviert.
    - [ ] Antrag auf Zugriff auf den Production-Track gestellt und bewilligt.
- [ ] **Datenschutzerklärung (Privacy Policy):**
  - [ ] Öffentlich unter `https://snagbite.app/privacy` erreichbar (ohne Login).
  - [ ] In der Google Play Console unter *App-Inhalte > Datenschutzerklärung* hinterlegt.
  - [ ] In der App unter *Einstellungen > Rechtliches > Datenschutzerklärung* und auf dem Auth-Screen verlinkt.
- [ ] **Web-URL zur Kontolöschung (Data Deletion Requirement):**
  - [ ] Öffentlich unter `https://snagbite.app/delete-data` erreichbar.
  - [ ] In der Google Play Console unter *App-Inhalte > Löschen von Nutzerkonten* hinterlegt (inkl. Bestätigung, dass alle Nutzerdaten, Rezepte und Sammlungen gelöscht werden).
  - [ ] In-App-Löschung in `SettingsView.tsx` (`handleDeleteAccount`) getestet und funktionsfähig.
- [ ] **Formular zur Datensicherheit (Data Safety Form):**
  - [ ] Ausfüllhilfe in [`docs/compliance/data-safety-guide.md`](file:///c:/Users/lucas/source/repos/cookbook/docs/compliance/data-safety-guide.md) zur Hand nehmen und alle Abschnitte in der Console eintragen.
  - [x] Datenübertragung per HTTPS verschlüsselt (Art. 32 DSGVO).
- [ ] **App-Zugriff für Google-Prüfer (Reviewer Credentials):**
  - [ ] In der Play Console unter *App-Inhalte > Anmeldedaten / App-Zugriff* Zugangsdaten hinterlegt:
    - Nutzername: `reviewer@snagbite.app`
    - Passwort: `[Gewähltes Passwort]`
    - Anleitung: *„Auf 'Bereits ein Konto? Mit E-Mail anmelden' tippen und diese Zugangsdaten eingeben.“*
  - [x] Reviewer-Login in der App (`EmailLoginForm.tsx`) und Seed-Script (`npm run seed:reviewer` in `backend/`) implementiert.
  - [ ] Seed-Script gegen Supabase Production ausgeführt, damit der Reviewer-Account mit 8 Rezepten, Sammlungen, Vorrat und Premium vorbefüllt ist.
- [ ] **IARC-Altersfreigabe & Zielgruppe:**
  - [ ] Fragebogen zur Inhaltseinstufung (IARC) ausgefüllt (Einstufung: PEGI 3 / USK 0).
  - [ ] Zielgruppe festgelegt (Erwachsene / ab 13 Jahre, keine gezielte Ausrichtung auf Kinder).

---

## 💰 2. Monetarisierung: AdMob & RevenueCat

- [ ] **AdMob `app-ads.txt` bereitgestellt:**
  - [x] Datei `website/public/app-ads.txt` angelegt mit Inhalt:
    ```text
    google.com, pub-4240071009231066, DIRECT, f08c47fec0942fa0
    ```
  - [ ] Website deployed und unter `https://snagbite.app/app-ads.txt` erreichbar.
  - [ ] Im AdMob-Dashboard verifiziert, dass die Domain gecrawlt wurde (Status: *Autorisiert*).
- [ ] **AdMob DSGVO / UMP Consent Message:**
  - [ ] Im AdMob-Dashboard unter *Datenschutz & Mitteilungen > DSGVO* eine aktive Einwilligungsnachricht für EU-Nutzer eingerichtet und veröffentlicht.
  - [ ] UMP-Consent-Flow (`utils/ads.ts`) auf echtem Testgerät erfolgreich getestet.
- [ ] **Google Play In-App-Abonnements eingerichtet:**
  - [ ] In Play Console unter *Monetarisierung > Abonnements* die Basis-Produkte angelegt:
    - `monthly` (z. B. 4,99 € / Monat)
    - `yearly` (z. B. 29,99 € / Jahr, inkl. 3 Tage Testphase / Free Trial)
  - [ ] Google Cloud Service Account für Google Play Android Developer API eingerichtet und mit RevenueCat verbunden.
  - [ ] RevenueCat Offerings und Packages (`default` Offering mit `MONTHLY` und `ANNUAL`) gemappt.
- [ ] **Paywall Compliance & Features (`PremiumModal.tsx`):**
  - [ ] **„Käufe wiederherstellen“ (Restore Purchases):** Sichtbarer Button vorhanden, der `Purchases.restorePurchases()` aufruft.
  - [ ] **Rechtstexte:** Direkte Links zu AGB *und* Datenschutzerklärung.
  - [ ] **Abo-Transparenz:** Klarer Hinweis auf automatische Verlängerung, Kündigungsfrist und Verwaltung über Google Play.
- [ ] **End-to-End Lizenztest:**
  - [ ] Eigene E-Mail in der Play Console als *Lizenzprüfer (License Tester)* registriert.
  - [ ] Test-Abo auf echtem Android-Gerät abgeschlossen (ohne echte Abbuchung).
  - [ ] Freischaltung der Premium-Features und Ausblenden von Werbung verifiziert.

---

## 📱 3. Android Native Shell & Hardening

- [ ] **Keystore & Signierung:**
  - [ ] `frontend/android/keystore.properties` konfiguriert (Alias, Passwörter).
  - [ ] Release-Keystore-Datei an sicherem Ort extern gebackupt.
- [ ] **App-Versionierung:**
  - [ ] `frontend/android/version.properties` auf finale Startversion gesetzt (z. B. `VERSION_NAME=1.0.0`, `VERSION_CODE=1`).
- [ ] **Netzwerksicherheit (`AndroidManifest.xml`):**
  - [x] `network_security_config.xml` angelegt und in `AndroidManifest.xml` referenziert (keine Cleartext-Warnungen mehr im Pre-Launch Report).
  - [ ] `VITE_API_BASE_URL` in `frontend/.env.production` zeigt auf die Live-HTTPS-Domain des Backends.
- [ ] **Digital Asset Links (`assetlinks.json`):**
  - [ ] Datei unter `https://snagbite.app/.well-known/assetlinks.json` deployed.
  - [ ] SHA256-Fingerprint des Play Store App-Signing-Zertifikats eingetragen.
  - [ ] Deep Linking via `https://snagbite.app/invite/*` verifiziert (`android:autoVerify="true"` öffnet direkt die App).
- [ ] **App-Icons & Splash Screen:**
  - [x] Adaptives App-Icon (`res/mipmap-anydpi-v26/ic_launcher.xml`) für Android 8–15 vorhanden.
  - [x] Monochromes App-Icon für Android 13+ Themed Icons (`<monochrome>`-Tag) vorhanden.
  - [ ] Splash Screen (`res/drawable/splash.png` und Hintergrundfarbe `#064e3b`) schließt flüssig ohne Hänger ab.
- [ ] **Hardware Back-Button:**
  - [ ] Zurück-Gesten auf Subscreens (Rezept-Details, Katalog-Filter, Modals, Drawer) schließen das Overlay statt die App.
  - [ ] Doppel-Tap auf Root-Screen zum Beenden der App funktioniert zuverlässig.

---

## ⚙️ 4. Backend, Cloud & Datenbank (Supabase / Railway)

- [ ] **Produktions-Datenbank & RLS:**
  - [ ] Alle SQL-Migrationen (`backend/db/migrations/`) in Supabase Production ausgeführt.
  - [ ] Row Level Security (RLS) auf allen Tabellen aktiviert (`recipes`, `user_recipes`, `jobs`, `cook_events`, `pantry_items`, `shopping_list_items`).
  - [ ] Supabase Storage Buckets (`recipe-photos`, `cook-photos`, `app-bundles`) mit strikten Upload-Policies versehen.
- [ ] **API-Limits & Quota-Schutz:**
  - [ ] Rolling-Timeframe Rate-Limiter im Backend aktiv (Free-Tier Limitierung).
  - [ ] Google Gemini API: Budget-Alerts und Quota-Limits in der Google Cloud Console aktiviert, um unkontrollierte Kosten bei Spitzenlast zu verhindern.
  - [ ] RapidAPI / Apify Kontingente und Zahlungsmethode für Instagram Metadata Scraper hinterlegt.
- [ ] **Healthcheck & Monitoring:**
  - [ ] Monitoring für Backend-Endpunkt `/health` eingerichtet (z. B. UptimeRobot oder Cron-Heartbeat).
  - [ ] Alarmierung via ntfy.sh oder Telegram bei Job-Queue-Staus oder Ausfällen aktiv.

---

## 🚀 5. Self-Hosted OTA Live Updates (Capgo)

- [ ] **Storage & Schema:**
  - [ ] Supabase Bucket `app-bundles` ist public und erreichbar.
  - [ ] Tabelle `app_bundles` besitzt den partiellen Unique-Index für maximal ein aktives Bundle pro Kanal.
- [ ] **Initiales Bundle:**
  - [ ] Erstes Production-Bundle via `npm run deploy:ota` hochgeladen.
  - [ ] 10-Sekunden Anti-Brick-Fallback (`notifyAppReady()`) getestet.
  - [ ] `Cap-StaleAppBundles` stellt sicher, dass neuere Native Releases nicht auf veraltete OTA-Zips zurückspringen.

---

## 🎨 6. Store Listing & Marketing Assets

- [ ] **App-Icon:**
  - [x] 512 × 512 px PNG, 32-Bit Farbformat in `frontend/android/fastlane/metadata/android/*/images/icon.png`.
- [ ] **Feature Graphic (Banner):**
  - [x] 1024 × 500 px PNG im Snagbite Emerald Theme in `frontend/android/fastlane/metadata/android/*/images/featureGraphic.png`.
- [ ] **Screenshots (Smartphone):**
  - [ ] Mindestens 4–8 hochauflösende Screenshots (9:16, z. B. 1080 × 2400 px) manuell erstellen und in der Play Console / Fastlane hinterlegen:
    1. *Rezept-Extraktion:* „Aus Reels & TikToks in Sekunden ein strukturiertes Rezept.“
    2. *Rezeptansicht & Nährwerte:* „Zutaten, Portionsrechner & automatischer Healthy Score.“
    3. *Interaktiver Kochmodus:* „Fokus-Schritte mit integrierten Timern.“
    4. *Intelligente Einkaufsliste:* „Nach Supermarktregalen sortiert.“
    5. *Wochenplaner:* „Mahlzeiten stressfrei im Voraus planen.“
    6. *Gamification & Fortschritt:* „Rezepte kochen, XP sammeln und Streaks halten.“
- [ ] **Store-Texte (DE & EN hinterlegt in `fastlane/metadata/android/`):**
  - [x] **App-Titel:** `Snagbite: Rezepte & Kochbuch` (DE, 29 Zeichen) / `Snagbite: Recipe & Cookbook` (EN, 28 Zeichen).
  - [x] **Kurzbeschreibung (unter 80 Zeichen):** `Dein smartes KI-Kochbuch: Importieren, organisieren, einkaufen & kochen.` (DE, 72 Zeichen) / `Your smart AI cookbook: Import recipes, organize, plan meals & cook.` (EN, 68 Zeichen).
  - [x] **Vollständige Beschreibung:** Vollständige, gegliederte All-in-One Feature-Übersicht (DE & EN, < 4.000 Zeichen).
- [ ] **Kategorie & Tags:**
  - [ ] Primäre Kategorie: *Essen und Trinken* (Food & Drink).
  - [ ] Tags: *Rezepte*, *Kochbuch*, *Einkaufsliste*, *Mahlzeitenplaner*, *Kochen*.

---

## 🧪 7. Smoke Testing vor dem Freigabeklick

Vor dem Release der AAB auf den **Production-Track**:

- [ ] **Installation:** Release `.aab` auf mindestens zwei verschiedenen physischen Android-Smartphones installiert.
- [ ] **Cold Start:** App startet in unter 2 Sekunden ohne Kaltstart-Hänger auf dem Splash Screen.
- [ ] **Extraktion (Instagram / TikTok):** Share-Sheet-Übergabe aus Instagram Reel an Snagbite analysiert das Rezept fehlerfrei.
- [ ] **Extraktion (Foto):** Rezeptkarte per Kamera abfotografiert und erfolgreich extrahiert.
- [ ] **Kochen & Timer:** Rezept im Kochmodus geöffnet, Timer gestartet, Hintergrund-Benachrichtigung erhalten.
- [ ] **Einkaufsliste & Vorrat:** Zutaten in Einkaufsliste gelegt, abgehakt und in den Vorrat übernommen.
- [ ] **AdMob Ads:** Test-Banner/MREC und Rewarded Video Ad für Extraktions-Credits funktionieren ohne Freeze.
- [ ] **Offline-Verhalten:** Flugmodus aktiviert – gespeicherte Rezepte lassen sich öffnen und lesen.

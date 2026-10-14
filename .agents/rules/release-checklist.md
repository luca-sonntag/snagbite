---
trigger: always_on
description: Verbindliche Pflicht zur kontinuierlichen Pflege der Release-Checkliste (RELEASE_CHECKLIST.md) bei Schema-, Migrations-, Env- oder Store-Änderungen.
---

# 📋 Release-Checklisten-Pflege (RELEASE_CHECKLIST.md)

> **Verbindliche Pflicht für alle Entwicklungen und Agenten-Sessions:**
> Wann immer während der Entwicklung Änderungen vorgenommen werden, die vor, während oder unmittelbar nach dem nächsten Release auf Production ausgeführt oder beachtet werden müssen, **MUSS** der Agent diese sofort und verlässlich in [`docs/RELEASE_CHECKLIST.md`](file:///c:/Users/lucas/source/repos/cookbook/docs/RELEASE_CHECKLIST.md) eintragen.

---

## 1. 🎯 Wann MUSS ein Eintrag in `docs/RELEASE_CHECKLIST.md` erfolgen?

Ein Eintrag in [`docs/RELEASE_CHECKLIST.md`](file:///c:/Users/lucas/source/repos/cookbook/docs/RELEASE_CHECKLIST.md) unter *„Nächstes Release (Pending Tasks)“* ist zwingend erforderlich bei:

1. **Drizzle-Schema-Änderungen (`backend/src/db/schema/`):**
   - Jede neue oder geänderte Spalte, Tabelle, Index oder Enum erfordert `npm run db:push:prod` vor bzw. zeitgleich mit dem Release.
   - **Eintrag:** Exakte Tabelle, Spalte, Grund, Commit-Hash und der Befehl `npm run db:push:prod`.

2. **Daten-Migrationen & Backfill-Skripte:**
   - Wenn ein Skript in `backend/src/scripts/` (z. B. `backfill/`, `migrate/`, `db/`) geschrieben wurde, das Altdaten auf Production anhebt oder auffüllt.
   - **Eintrag:** Genaues Skript mit Parametern (z. B. `npm run backfill:nutrition:prod`).

3. **Neue Umgebungsvariablen & Secrets:**
   - Wenn neue Keys in `.env.example`, `backend/.env` oder `frontend/.env` eingeführt werden.
   - **Eintrag:** Variablennamen, Zweck, wo sie eingetragen werden müssen (Railway Production Dashboard / `npm run railway:env:prod`) und ob das Fehlen die Production bricht.

4. **Capacitor, Native Plugins & Android Shell:**
   - Änderungen an `AndroidManifest.xml`, `capacitor.config.ts`, `build.gradle` oder Hinzufügen nativer Plugins (Capacitor/Cordova).
   - **Eintrag:** Kennzeichnung, dass ein **nativer Google Play Build** (`deploy.ps1 -All -Bump patch`) zwingend erforderlich ist und ein reines OTA-Update (`deploy:ota`) nicht ausreicht.

5. **Externe Dienste & Store-Konfiguration:**
   - Neue AdMob Ad-Units, RevenueCat Produkte/Entitlements, Tigris S3 Bucket-Policies oder Better-Auth OAuth-Provider-Settings.
   - **Eintrag:** Welches Dashboard / welcher Dienst vor dem Release konfiguriert werden muss.

---

## 2. 📝 Format & Struktur von Einträgen

Einträge müssen immer als Markdown-Checkbox `- [ ]` formuliert sein und folgende Kerninformationen enthalten:
- **Was muss getan werden?** (z. B. `npm run db:push:prod` ausführen)
- **Warum? / Welcher Commit/Branch?** (z. B. Spalte `metadata` in Tabelle `user` hinzugefügt in Commit `4c5eb9d4`)
- **Dringlichkeit & Zeitpunkt:** (z. B. *Zwingend vor Backend-Deploy*)
- **Exakter Befehl:** Code-Snippet zum Kopieren und Ausführen.

---

## 3. 🏁 Nach dem Release (Archivierung)

Nach erfolgreichem Deployment auf Production werden abgearbeitete Punkte als `- [x]` markiert, in den Abschnitt `## 📜 Archivierte Releases` mit Datum und Versionsnummer verschoben und der Bereich für das nächste Release wird für künftige Features zurückgesetzt.

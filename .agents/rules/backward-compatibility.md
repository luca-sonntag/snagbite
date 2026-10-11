---
trigger: always_on
description: Verbindliche Regeln für Abwärtskompatibilität, Non-Breaking Schema Evolution und Supabase DB Migrationen.
---

# 🛡️ Abwärtskompatibilität & Datenbank-Migrations-Regeln

> **Post-Launch Direktive:** Die Snagbite-App ist auf Google Play und im Web live. In der Produktionsdatenbank existieren echte Nutzer, Sammlungen, Rezeptdaten und Wochenpläne. Ältere native App-Versionen sind auf Nutzergeräten im Umlauf. Breaking Changes, destruktive Schema-Eingriffe oder inkompatible API-Updates sind strengstens untersagt.

---

## 1. 🗄️ Drizzle ORM Schema-Evolution & Datenbank-Migrationen (Absolute Pflicht)

1. **Jede Schema-Änderung erfolgt über Drizzle:**
   - Jede Modifikation an Tabellen, Spalten, Indizes oder Enums **MUSS** über das typsichere Schema in `backend/src/db/schema/` erfolgen.
   - Synchronisation mit `npm run db:push` (Dev) und `npm run db:push:prod` (Railway Production).
   - Niemals manuelle DDL-Befehle direkt in Produktionsdatenbanken ohne Drizzle Schema-Sync ausführen.

2. **Idempotenz & Ausfallsicherheit:**
   - Neue Spalten müssen immer `NULL`-able sein oder einen sicheren `.default()`-Wert besitzen.
   - Schema-Updates müssen sowohl lokal als auch in Production (`npm run db:push:prod`) fehlerfrei wiederholbar sein.

---

## 2. 🔄 Expand-and-Contract Muster (Additive Schemas)

1. **Nur additive Schema-Änderungen:**
   - Neue Tabellenspalten müssen immer **`NULL`-able** sein oder einen **sicheren `DEFAULT`-Wert** besitzen.
   - Füge **NIEMALS** eine `NOT NULL`-Spalte ohne Standardwert zu einer bestehenden Tabelle hinzu.

2. **Niemals aktive Spalten direkt umbenennen oder löschen:**
   - `ALTER TABLE ... DROP COLUMN` oder `RENAME COLUMN` auf Spalten, die vom Backend oder älteren mobilen Apps genutzt werden, ist **verboten**.
   - **Vorgehen bei Umbenennung/Restrukturierung (3-Phasen-Modell):**
     1. *Expand:* Neue Spalte hinzufügen. Backend schreibt in beide Spalten (oder repliziert per Trigger/Default) und liest primär die neue mit Fallback auf die alte.
     2. *Migrate/Backfill:* Bestehende Zeilen per idempotentem Update-Skript/SQL migrieren.
     3. *Contract (erst nach Update aller mobilen Clients):* Altes Feld im Code als deprecated markieren und frühestens nach mehreren Release-Zyklen entfernen.

---

## 3. 📱 API- & Contract-Kompatibilität (Mobile App Schutz)

1. **In-the-Wild Clients schützen:**
   - Nutzer aktualisieren ihre Android-App oft erst nach Wochen. Die Backend-API muss vollkommen kompatibel mit älteren App-Builds bleiben.
2. **Response DTOs dürfen nicht brechen:**
   - Entferne oder ändere niemals bestehende JSON-Properties in API-Antworten, die von bestehenden App-Versionen konsumiert werden.
   - Neue Response-Felder dürfen ergänzt werden (additive Evolution).
3. **Neue Request-Parameter sind immer optional:**
   - Alle neu eingeführten Felder in `req.body` oder `req.query` müssen optional sein und sinnvolle serverseitige Fallbacks besitzen.

---

## 4. 🧱 Defensives Handling von Legacy- & JSONB-Daten

1. **Altdaten-Toleranz in Code & UI:**
   - Bereits existierende Rezepte in der Datenbank enthalten möglicherweise neu eingeführte Felder in `ingredients`, `instructions` oder Metadaten nicht.
   - Greife **NIEMALS** ungeschützt auf verschachtelte JSONB-Daten zu.
   - Verwende immer Optional Chaining (`?.`) und Nullish Coalescing (`??`):
     ```ts
     // ❌ GEFÄHRLICH: Crasht bei Altrezepten
     const unit = item.normalized.unit;

     // ✅ SICHER: Defensiver Fallback
     const unit = item.normalized?.unit ?? item.unit ?? '';
     ```
2. **Backfills bei strukturellen Neuerungen:**
   - Wenn neue aggregierte oder normalisierte Felder eingeführt werden, muss parallel ein idempotentes Backfill-Skript (`backend/src/scripts/backfill...`) bereitgestellt werden, das Altdaten in Batches anhebt.

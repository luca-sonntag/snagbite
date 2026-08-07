# 🎮 Gamification (Koch-Belohnungen, XP, Streaks)

Erster Wurf: Nutzer verdienen **XP** und **Coins** fürs Nachkochen von Rezepten,
steigen im **Level** auf, halten **Streaks** und schalten **Abzeichen** frei. Ziel
ist mehr Kochen — bewusst als Single-Player-Loop, mit freigehaltenen Andockpunkten
für Social/Shop/AI-Verifizierung.

## 1. Leitprinzipien

* **Foto-Pflicht & KI-Verifizierung via Gemini Vision.** Jeder Cook erfordert ein **Foto des fertigen Gerichts** (`photoBase64`). Das Backend prüft das Foto via Gemini Vision (`verifyCookedDishPhoto`), ob es visuell zum Rezept passt. Nur bei positiver KI-Verifizierung wird der Cook gezählt und belohnt.
* **Anti-Grind über Diminishing Returns**, nicht über Misstrauen: Wiederholungen
  desselben Rezepts fallen schnell ab, plus ein Tages-Softcap.
* **Server-autoritativ.** Punkte werden ausschließlich im Backend (service-role)
  vergeben; das Frontend rechnet nichts an.
* **Config statt Redeploy.** Die Formel liegt als JSON-Zeile in `global_settings`.

## 2. Datenmodell (`backend/supabase_schema.sql`)

Alles additiv, RLS aktiv (`SELECT`-own als Defense-in-Depth; Writes nur service-role):

* **`cook_events`** — append-only Ereignis (User, Rezept, XP/Coins, `has_photo`,
  `verified`, `leaderboard_eligible`, `trust_score`, `via_cooking_mode`,
  `timer_elapsed`).
* **`point_ledger`** — append-only, eine Zeile pro Gutschrift (ermöglicht spätere
  zeitfenster-basierte Leaderboards, Undo, Audit).
* **`user_stats`** — Aggregat pro User (xp, level, coins, current/longest streak,
  last_cook_date, total_cooks) für schnelle Reads im Fortschritt-Tab.
* **`user_badges`** — freigeschaltete Abzeichen (additiv).
* **Storage-Bucket `cook-photos`** (privat), Muster wie `feedback-screenshots`.
* **`global_settings.gamification_config`** — die tunebare Formel als JSON.

## 3. Punkte-Engine (`backend/src/gamification*.ts`)

* **`gamificationFormula.ts`** — reine, hermetisch getestete Formel
  (`computeAward`, `softcapFactor`, `streakMultiplier`, `levelForXp`). Tests:
  `gamificationFormula.test.ts` (`node --import tsx --test`).
* **`gamification.ts`** — `recordCook()` orchestriert: lädt Config/Aggregate,
  Duplikat-/Velocity-Guard, Streak-Fortschreibung (UTC-Tage), Level, Badges,
  schreibt `cook_events` + `point_ledger` + `user_stats`.

Formel: `XP = 100 × Schwierigkeit × Wiederholung + Neuheit`, dann `× Streak`;
`Coins = ⌊XP × 0.1⌋`. Schwierigkeit ist zum Start flach ×1 (kein `difficulty`-Feld
im Recipe/Gemini-Schema); Cuisine-Neuheit ist als Config-Wert vorhanden, aber
inaktiv (kein Cuisine-Signal).

## 4. Endpoints (`backend/src/routes.ts`)

* `POST /api/jobs/:id/cooked` — verbucht einen Cook (erfordert `photoBase64`; verifiziert per Gemini Vision, lädt Foto in Supabase `cook-photos` hoch). Antwort enthält `stats`, `earned`, `newBadges`, `previousXp/previousLevel/leveledUp` für die Overlay-Animation.
* `GET /api/jobs/:id/cook-history` — liefert `count`, `firstCookedAt`, `lastCookedAt` sowie `items` (`xpAwarded`, `coinsAwarded`, `hasPhoto`, `photoUrl`, `verified`, `viaCookingMode`, `timerElapsed`) für das Rezept-Detail-Badge & die Koch-Historie.
* `GET /api/me/gamification` — `stats` + `badges` + `levelThresholds` für den Tab.

## 5. Frontend

* **`context/GamificationContext.tsx`** — `markCooked()` + gecachte Stats/Badges;
  rendert am App-Root das **`RewardOverlay`** (geblurrtes Vollbild, animiert
  füllender XP-Balken, Level-Up-Sequenz + CSS-Konfetti, `prefers-reduced-motion`).
* **`components/CookedModal.tsx`** — Modal für Kamera-/Galerie-Fotoaufnahme, KI-Prüfzustand („KI prüft dein Gericht...“) und Fehler-Feedback bei Nicht-Übereinstimmung.
* **`components/CookedButton.tsx`** — Trigger-Button in `RecipeActionDock` (Floating Bar) und als Abschluss-Karte (`variant="card"`) unter den Schritten in `RecipeDetails`.
* **`components/CookHistoryTimeline.tsx` & Recipe Header Badge** — Interaktiver Header-Pill-Badge („x-mal gekocht · zuletzt vor...“) mit Smooth-Scroll zur Historie. Das Timeline-Modul zeigt Ereigniskarten inklusive XP-Gutschriften (`+50 XP`), KI-Verifizierungsbadge, Foto-Lightbox (Großansicht), Koch-Modus / Timer-Nutzung und exaktem Zeitstempel.
* **`components/ProgressView/`** — der Tab **„Fortschritt"** (`progress`-Route in
  `useHashRouter`, Nav-Button in `App.tsx`): Level/XP-Balken, Streak/Coins/Cooks,
  Badge-Gitter. Coins werden angezeigt, **kein Shop** (erster Wurf).
* **`utils/streakReminder.ts`** — best-effort lokale Notification (Streak-Erinnerung)
  über `@capacitor/local-notifications`; no-op auf Web / ohne Permission.

## 6. Für später freigehalten

Coin-Shop (`coins` akkumulieren bereits), Foto-KI-/Peer-Verifizierung (hebt
`trust_score`), Challenges/Seasonal, Schwierigkeits-/Cuisine-Tuning
(Config-Werte vorhanden) — alles ohne Schema-Änderung andockbar.
(Freundesliste & Leaderboard sind inzwischen gebaut — siehe §7.)

## 7. Social — Freundesliste & Leaderboard

Aufbau auf dem Gamification-Fundament (`point_ledger` trägt die wöchentliche,
`user_stats.xp` die Allzeit-Wertung). Additiv, server-autoritativ.

**Datenmodell** (`backend/supabase_schema.sql`):
* **`profiles`** — `user_id`, selbstgewählter `display_name`, `avatar_url`
  (optional, aus Google-`user_metadata`), eindeutiger `friend_code`. Anzeigename/
  Avatar sind `SELECT`-bar für alle Authenticated (Freundssicht); die E-Mail wird
  **nie** an Freunde ausgeliefert.
* **`friendships`** — mutual (`pending`/`accepted`), eine Zeile pro (requester,
  addressee)-Paar; „meine Freunde" prüft beide Richtungen.
* **RPC `weekly_xp_for_users(uids, since)`** — `SUM(delta_xp)` aus `point_ledger`
  für das Wochenfenster (Muster wie `claim_next_job`).

**Backend:** `ensureProfile` legt bei Erstzugriff ein Profil an (Anzeigename aus
`full_name` ?? E-Mail-Localpart, Avatar aus Metadaten, kollisionsgeprüfter
`friend_code`). Wochenfenster via reinem, getestetem `socialTime.ts` (`weekStartUtc`,
Montag 00:00 UTC). Endpoints (`routes.ts`): `GET/PATCH /api/me/profile`,
`GET /api/friends`, `GET /api/friends/requests`, `POST /api/friends/request`
(per Code, Auto-Accept bei Reverse-Pending), `POST /api/friends/:id/respond`,
`DELETE /api/friends/:id`, `GET /api/leaderboard?window=weekly|all` (Scope:
Freunde + ich). Neue Error-Codes in `errors.ts` ↔ `frontend/src/errorCodes.ts` synchron.

**Frontend:** `SocialContext` (profile/friends/requests + Methoden) neben dem
Gamification-Provider. Der „Fortschritt"-Tab ist ein Container mit Segmented-Nav
**Übersicht | Rangliste | Freunde** (kein neuer Bottom-Tab): `ProgressOverview`,
`Social/LeaderboardView` (Woche/Gesamt), `Social/FriendsView` (Profilkarte +
teilbarer Freundescode, per-Code hinzufügen, Anfragen, Liste), `Social/Avatar`.
Einladung: teilbarer Code + Web-Hash-Route `#/invite/<code>` (in `useHashRouter`;
`App.tsx` leitet auf den Freunde-Tab um und füllt vor). **Native https-Deeplinks**
bleiben späterer Ausbau.

**Freigehalten:** globale/Liga-Ranglisten (verified-only via `leaderboard_eligible`),
native Deeplinks, Blockieren/Melden.

# 🎮 Gamification (Koch-Belohnungen, XP, Streaks)

Erster Wurf: Nutzer verdienen **XP** und **Coins** fürs Nachkochen von Rezepten,
steigen im **Level** auf, halten **Streaks** und schalten **Abzeichen** frei. Ziel
ist mehr Kochen — bewusst als Single-Player-Loop, mit freigehaltenen Andockpunkten
für Social/Shop/AI-Verifizierung.

## 1. Leitprinzipien

* **2-Wege-Erfassung & Foto-Verifizierung:**
  * **Mit Foto (+XP & Belohnungen):** Ein Foto des fertigen Gerichts (`photoBase64`) wird via Gemini Vision (`verifyCookedDishPhoto`) validiert und in S3 `cook-photos` abgelegt. Bei Erfolg winken volle XP, Coins, Badges, Levelaufstiege und Leaderboard-Berechtigung (`verified: true`).
  * **Ohne Foto (0 XP, rein organisatorisch):** Nutzer können Mahlzeiten auch ohne Foto als gekocht erfassen (z. B. im Wochenplaner oder Rezept). Dabei werden 0 XP und 0 Coins gutgeschrieben (`verified: false`), aber der Kochvorgang wird in `cook_events` und im Wochenplaner als erledigt vermerkt.
* **Anti-Grind über Diminishing Returns**, nicht über Misstrauen: Wiederholungen
  desselben Rezepts fallen schnell ab, plus ein Tages-Softcap.
* **Server-autoritativ.** Punkte werden ausschließlich im Backend (service-role)
  vergeben; das Frontend rechnet nichts an.
* **Config statt Redeploy.** Die Formel liegt als JSON-Zeile in `global_settings`.

## 2. Datenmodell (Drizzle Schema / PostgreSQL)

Alles additiv, RLS aktiv (`SELECT`-own als Defense-in-Depth; Writes nur service-role):

* **`cook_events`** — append-only Ereignis (User, `recipe_id`, XP/Coins, `has_photo`,
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
  Duplikat-/Velocity-Guard, Streak-Fortschreibung (UTC-Kalenderwochen), Level, Badges,
  schreibt `cook_events` + `point_ledger` + `user_stats`.

Formel: `XP = 100 × Schwierigkeit × Wiederholung + Neuheit`, dann `× Streak`;
`Coins = ⌊XP × 0.1⌋`. Schwierigkeit ist zum Start flach ×1 (kein `difficulty`-Feld
im Recipe/Gemini-Schema); Cuisine-Neuheit ist als Config-Wert vorhanden, aber
inaktiv (kein Cuisine-Signal). Ohne Foto (`hasPhoto: false`) liefert `computeAward` strikt `xp: 0` und `coins: 0`.

## 4. Endpoints (`backend/src/routes.ts`)

* `POST /api/recipes/:id/cooked` — verbucht einen Cook (optional mit `photoBase64`; bei Foto verifiziert per Gemini Vision und hochgeladen in `cook-photos`; ohne Foto als 0-XP-Eintrag verbucht). Synchronisiert automatisch offene `meal_plans`-Einträge für den aktuellen Tag. Antwort enthält `stats`, `earned`, `newBadges`, `previousXp/previousLevel/leveledUp` für die Overlay-Animation.
* `GET /api/recipes/:id/cook-history` — liefert `count`, `firstCookedAt`, `lastCookedAt` sowie `items` (`xpAwarded`, `coinsAwarded`, `hasPhoto`, `photoUrl`, `verified`, `viaCookingMode`, `timerElapsed`) für das Rezept-Detail-Badge & die Koch-Historie.
* `GET /api/me/gamification` — `stats` + `badges` + `levelThresholds` für den Tab.

## 5. Frontend

* **`context/GamificationContext.tsx`** — `markCooked()` + gecachte Stats/Badges;
  rendert am App-Root das **`RewardOverlay`** (geblurrtes Vollbild, animiert
  füllender XP-Balken, Level-Up-Sequenz + CSS-Konfetti, `prefers-reduced-motion`).
* **`components/CookedModal.tsx`** — Modal für Kamera-/Galerie-Fotoaufnahme, KI-Prüfzustand („KI prüft dein Gericht...“) und Fehler-Feedback bei Nicht-Übereinstimmung.
* **`components/CookedButton.tsx`** — Trigger-Button in `RecipeActionDock` (Floating Bar) und als Abschluss-Karte (`variant="card"`) unter den Schritten in `RecipeDetails`.
* **`components/CookHistoryTimeline.tsx` & Recipe Header Badge** — Interaktiver Header-Pill-Badge („x-mal gekocht · zuletzt vor...“) mit Smooth-Scroll zur Historie. Das Timeline-Modul zeigt Ereigniskarten inklusive XP-Gutschriften (`+50 XP`), KI-Verifizierungsbadge, Foto-Lightbox (Großansicht), Koch-Modus / Timer-Nutzung und exaktem Zeitstempel.
* **`components/ProfileView/`** — der Tab **„Profil & Fortschritt"** (`settings`-Route in
  `useHashRouter`, Nav-Button in `App.tsx`): Level/XP-Balken, Streak/Coins/Cooks,
  Badge-Gitter sowie App-Einstellungen. Coins werden angezeigt, **kein Shop** (erster Wurf).
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

**Datenmodell** (Drizzle Schema / PostgreSQL):
* **`profiles`** — `user_id`, selbstgewählter `display_name`, `avatar_url`
  (optional, aus Google-`user_metadata`), eindeutiger `friend_code`. Anzeigename/
  Avatar sind `SELECT`-bar für alle Authenticated (Freundssicht); die E-Mail wird
  **nie** an Freunde ausgeliefert.
* **`friendships`** — mutual (`pending`/`accepted`), eine Zeile pro (requester,
  addressee)-Paar; „meine Freunde" prüft beide Richtungen.
* **`recipe_shares`** — In-App Rezept-Sharing zwischen Freunden (`sender_id`, `recipient_id`, `recipe_id`, `note`, `seen_at`, `dismissed_at`).
* **`cook_event_reactions`** — Emoji-Reaktionen (`🔥`, `❤️`, `😋`) auf verifizierte Koch-Events von Freunden im Feed (`user_id`, `cook_event_id`, `emoji`).
* **RPC `weekly_xp_for_users(uids, since)`** — `SUM(delta_xp)` aus `point_ledger` für das Zeitfenster (z.B. Monatsanfang) im Freundeskreis.
* **RPC `global_weekly_xp(since, limit_count)`** — `SUM(delta_xp)` aus `point_ledger` über alle Nutzer sortiert nach XP für das globale Monats-Leaderboard.

**Backend:** `ensureProfile` legt bei Erstzugriff ein Profil an (Anzeigename aus
`full_name` ?? E-Mail-Localpart, Avatar aus Metadaten, kollisionsgeprüfter
`friend_code`). Monatsfenster via reinem, getestetem `socialTime.ts` (`monthStartUtc`,
1. des Monats 00:00 UTC). Endpoints (`routes.ts`):
* `GET/PATCH /api/me/profile` — Profil laden & Namen anpassen.
* `GET /api/friends`, `GET /api/friends/requests` — Freundesliste & Anfragen.
* `POST /api/friends/request` — Freundschaftsanfrage per Code (`code`) oder per User-ID (`targetUserId`, z.B. direkt aus dem globalen Leaderboard; Auto-Accept bei beidseitigen Anfragen).
* `POST /api/friends/:id/respond` — Anfragen annehmen/ablehnen.
* `DELETE /api/friends/:id` — Freund entfernen oder offene Anfrage abbrechen.
* `GET /api/leaderboard?window=monthly|all&scope=friends|global` — Rangliste mit Scope (Freunde oder alle Nutzer) und Zeitfenster (diesen Monat oder Gesamt). Liefert Einträge inklusive berechnetem Beziehungsstatus (`friendshipStatus: 'none' | 'pending_sent' | 'pending_received' | 'friends' | 'self'`).
* `GET /api/friends/feed?limit=30` — Social-Feed der letzten 30 Tage mit verifizierten Gerichten von Freunden (inkl. aggregierter Emoji-Reaktionen und eigenem Reaktionsstatus).
* `POST /api/friends/feed/:cookEventId/reactions` — Toggle von Reaktionen (`🔥`, `❤️`, `😋`).
* `POST /api/recipes/:id/share` — Teilt ein Rezept aus dem eigenen Kochbuch mit Freunden inkl. optionaler persönlicher Notiz.
* `GET /api/friends/shares` — Liste der mit dem Nutzer geteilten Rezepte inkl. Badge-Status (`unreadSharesCount`).
* `POST /api/friends/shares/:id/seen` & `POST /api/friends/shares/:id/dismiss` — Geteilte Rezepte als gesehen bzw. verworfen markieren.
* `POST /api/friends/recipes/:recipeId/save` — Übernimmt ein geteiltes Freundesrezept mit 1 Klick ins eigene Kochbuch (`source: 'share'`).

**Echtzeit Push-Benachrichtigungen (`backend/src/push/socialNotifications.ts`):**
* **Freundschaftsanfrage:** Sendet FCM-Push (`type: 'friend_request'`), springt beim Antippen direkt in den Tab *Freunde*.
* **Anfrage angenommen:** Benachrichtigt den Anfragenden (`type: 'friend_accepted'`).
* **Rezept geteilt:** Informiert ausgewählte Freunde über das geteilte Rezept mit Vorschaubild und Notiz (`type: 'recipe_shared'`).
* **Freund hat gekocht:** Sobald ein Freund ein Gericht mit Foto kocht und verifizieren lässt, erhalten Freunde eine Push-Meldung mit Bild (`type: 'friend_cooked'`), die direkt in den *Feed* führt.

**Frontend:** `SocialContext` (profile/friends/requests, sharedRecipes, unreadSharesCount + Methoden `shareRecipeWithFriends`, `saveFriendRecipe`, `dismissSharedRecipe`, `markSharesSeen`) neben dem Gamification-Provider.
* **Segmented-Nav:** **Übersicht | Feed | Rangliste | Freunde** im Fortschritt-Tab.
* **FriendsFeedView & FeedEventCard:** Moderner, taktiler Feed im Culinary-Magazin-Stil ohne überladene Boxen. Großes Foto mit dunklem Glas-Verlauf am unteren Rand, Avatar des Kochs, relatives Alter („vor 2 Std.“), Auszeichnungs-Badge, taktile Reaktions-Pills (`🔥`, `❤️`, `😋`) mit Animation und 1-Klick Vorschau/Speichern.
* **ShareWithFriendsModal:** Mehrfachauswahl von Freunden mit Checkboxen, optionaler Notiz („Schau mal, das müssen wir kochen!“) und Einladungs-Teilen.
* **SharedRecipesSection:** Sektion oberhalb der Freundesliste für eingegangene Rezept-Empfehlungen mit Direkt-Speichern ins eigene Kochbuch.
* **LeaderboardView:** Bietet Umschalter zwischen **Freunde** und **Global** sowie **Diesen Monat** und **Gesamt**.
* **FriendsView:** Modularisiert in Subkomponenten (`FriendsProfileCard`, `SharedRecipesSection`, `FriendsListSection`) mit Clean-Code Zeilenlimits.
* **Deep Linking & App Links:** Android App Links via `/.well-known/assetlinks.json` und Custom Schemes (`snagbite://`, `at.snagbite.app://`).
* **Web Landingpage:** `website` unter `/invite/:code` öffnet die native App per Intent / Custom Scheme.

**Freigehalten:** Liga-Ranglisten (verified-only via `leaderboard_eligible`), Blockieren/Melden.



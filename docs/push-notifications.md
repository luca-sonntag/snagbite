# Smart AI Push Notifications

Server-generated, personalized push notifications that nudge a user back to
recipes they already saved. The backend worker picks the most fitting idea from
the user's cookbook (weekday, time, season, save-age, favorites, tags, …), lets
Gemini phrase it warmly, and delivers it via **FCM**. Frequency capping and
opt-in categories keep it from ever feeling spammy.

## Data sources (v1)

Only **server-visible** data is used: saved recipes (`jobs`), `is_favorite`,
collections, `recipe.tags`, `recipe.ingredients[].baseName`, `nutritionalValues`,
`instagramHandle`, `created_at` (save-age), plus derived weekday/time (user
timezone), season and calendar events. Shopping list and "recently cooked" live
only in device localStorage and are intentionally **not** used in v1.

## Notification types

~15 candidate generators, grouped into **5 opt-in categories** (the toggles in
Settings). Internal `type` names in parentheses:

- **Seasonal & occasions** (`seasonal`): `seasonal`, `holiday_event`
- **Reminders** (`reminders`): `saved_reminder`, `dormant_rediscovery`, `collection_nudge`, `anniversary`
- **Time & weekday** (`timing`): `weekday_suggestion`, `quick_win`, `occasion_servings`
- **Your taste** (`taste`): `taste_affinity`, `nutrition_goal`, `ingredient_spotlight`, `creator_affinity`, `remix_nudge`
- **Milestones & motivation** (`motivation`): `milestone`, `reactivation`

Each generator returns scored candidates from raw facts; the worker filters by
opt-in group, drops anything repeating a recently-sent type/recipe
(`notification_log`), takes the highest score, and hands the facts to Gemini for
phrasing (the "hybrid" step — Gemini never selects, only writes copy).

## Architecture

- **Cron = in-process tick** in the queue worker (`backend/src/queue.ts`), gated
  by `NOTIFICATIONS_ENABLED`. Runs every `NOTIFICATION_TICK_MINUTES`.
- `backend/src/notifications/`
  - `worker.ts` — the tick: eligible users, local-time send window, frequency
    cap, context, candidate, copy, send, log.
  - `candidates.ts` — the type generators + scoring/dedupe.
  - `season.ts` — season + calendar-event keyword matching.
  - `types.ts` — shared types + `type → category` map.
- `backend/src/push/fcm.ts` — FCM HTTP v1 sender (service-account JWT → OAuth
  token → send), disables tokens FCM reports as `UNREGISTERED`.
- `backend/src/gemini.ts` — `generateNotificationCopy()` (logged via `gemini_logs`).
- Endpoints (`backend/src/routes.ts`): `POST`/`DELETE /api/push/tokens`.
- Tables (`backend/src/db/schema/`): `push_tokens`, `notification_log`.
- Prefs live in user `metadata`: `notifications_enabled`,
  `notification_categories`, `notification_timezone`.

## Frontend / native

- `frontend/src/push.ts` — permission + `@capacitor/push-notifications`
  registration, token upload, foreground display, tap routing.
- `frontend/src/components/NotificationSettings.tsx` — single master toggle (persisted to `user_metadata`, enabling all 5 categories by default).
- `frontend/src/components/NotificationPrompt.tsx` — soft opt-in consent prompt shown after N (>= 2) saved recipes, triggering OS notification permission and master toggle on agreement.
- Android: `POST_NOTIFICATIONS` permission + FCM default icon/color/channel
  meta-data in `AndroidManifest.xml`; the `com.google.gms.google-services`
  plugin is already wired in `android/**/build.gradle` (applies only when
  `google-services.json` is present).

## Enabling it (ops)

Notifications ship **off**. To turn them on:

1. Create a **Firebase project** for `at.snagbite.app`.
2. Put `google-services.json` at `frontend/android/app/google-services.json`,
   run `npm run cap:sync -w frontend`, and ship a **new AAB** (native plugin →
   not OTA-able).
3. On the Railway **worker** service set: `NOTIFICATIONS_ENABLED=true`,
   `FCM_PROJECT_ID`, `FCM_SERVICE_ACCOUNT_JSON` (raw JSON or a file path), and
   optionally the `NOTIFICATION_*` tuning vars (see `backend/.env.example`).

## Local testing

Run the worker with `NOTIFICATIONS_ENABLED=true` and `NOTIFICATION_DRY_RUN=true`
(no `google-services.json`/FCM needed): the tick generates + logs the chosen
notification and its Gemini copy without actually sending. Widen
`NOTIFICATION_SEND_WINDOW_START/END` to cover the current local hour so the test
user is in-window, and confirm a `gemini_logs` row (`request_type =
notification_copy`) appears. The `POST`/`DELETE /api/push/tokens` endpoints can
be exercised with the seed:dev test-user JWT.

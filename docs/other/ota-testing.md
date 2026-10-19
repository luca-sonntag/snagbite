# OTA Live Updates — Manual Test Plan

Manual verification plan for the self-hosted OTA update system
(`@capgo/capacitor-updater`, backend `/api/app-updates/*`, `app_bundles`
table/bucket, `deploy-ota.ps1`). Work through the phases in order — later
phases assume the earlier ones passed.

**Scope reminder:** OTA ships web assets only. Native plugins and
`version.properties` are never touched, and a bundle is applied on the next
background/relaunch — never mid-session.

---

## Phase 0 — Test environment setup

| What | How |
|---|---|
| Database & Storage | `snagbite-dev` (bucket `app-bundles` in S3 + table `app_bundles` in PostgreSQL) |
| Backend | `cd backend && npm run dev` (port 3000), `.env` pointing at dev database |
| Device | Android emulator; app built with `VITE_API_BASE_URL=http://10.0.2.2:3000` in `frontend/.env`, installed via `npm run cap:run` (NOT `cap:live` — OTA is inert in dev/live-reload builds) |
| Logs | `chrome://inspect` → inspect the WebView → filter console on `[OTA]`. All OTA lines are prefixed and also land in the feedback consoleBuffer |
| Admin Auth | Run the web app locally (`npm run dev`), log in as a user listed in `ADMIN_EMAILS` |

> **Throttle caveat for all device tests:** update checks run ~5 s after app
> start and on resume, but are throttled to one per 15 minutes. The throttle
> state is in-memory — **fully killing and relaunching the app resets it**.
> Fastest loop while testing: kill app → relaunch → watch `[OTA]` logs ~5 s in.

Fixture SQL used below (run in the snagbite-dev SQL editor; clean up at the end):

```sql
insert into public.app_bundles (channel, version, storage_path, checksum, min_version_code, max_version_code, active) values
  ('production', '1.1.5-ota.1', 'production/1.1.5-ota.1.zip', 'deadbeef', 20, null, true),
  ('alpha',      '1.1.5-ota.2', 'alpha/1.1.5-ota.2.zip',      'cafebabe', 22, 25,  true);
```

---

## Phase 1 — Backend API (curl, no device)

Base: `http://localhost:3000`. The check endpoint is public (no JWT needed).

### 1.1 Update offered per channel

```bash
curl -s -X POST http://localhost:3000/api/app-updates/check \
  -H 'Content-Type: application/json' \
  -d '{"channel":"production","versionCode":22,"currentBundleVersion":"builtin"}'
```

- [ ] Returns `update:true` with `version:"1.1.5-ota.1"`, a public
  `…/storage/v1/object/public/app-bundles/production/1.1.5-ota.1.zip` URL,
  `checksum`, `minVersionCode`.
- [ ] Same request with `"channel":"alpha"` returns the alpha row
  (`1.1.5-ota.2`) — and **never** vice versa.

### 1.2 No update when already current

- [ ] Same production request with `"currentBundleVersion":"1.1.5-ota.1"` →
  `{"success":true,"update":false}`.

### 1.3 Version-code gating

- [ ] `versionCode: 19` (below production min 20) → `update:false`.
- [ ] `versionCode: 26` on alpha (above max 25) → `update:false`.
- [ ] `versionCode: 22` on alpha (inside 22–25) → `update:true`.

### 1.4 Validation (all must be HTTP 400, `success:false`)

- [ ] `channel` missing / `"beta"` / a number.
- [ ] `versionCode` missing / `"22"` (string) / `0` / `-1` / `1.5`.
- [ ] `currentBundleVersion` missing / `""` / >100 chars.
- [ ] Empty body `{}` and malformed JSON (`400`, not `500`).

### 1.5 No active bundle

- [ ] `update all app_bundles set active=false;` → both channels return
  `update:false` (kill-switch behavior). Re-activate the two rows afterwards.

### 1.6 Admin endpoints (JWT of an `ADMIN_EMAILS` user)

```bash
curl -s http://localhost:3000/api/admin/app-bundles -H "Authorization: Bearer $JWT"
```

- [ ] Lists both rows, newest first; `?channel=alpha` filters; `?channel=beta` → 400.
- [ ] `PATCH /api/admin/app-bundles/:id` with `{"active":false}` deactivates;
  `{"active":true}` on a second production row deactivates the first one
  automatically (never two active rows per channel — verify in the table).
- [ ] `{"active":"yes"}` → 400; unknown id → 404.
- [ ] Without JWT → 401; with a non-admin JWT → 403.

Clean up: `delete from app_bundles where checksum in ('deadbeef','cafebabe');`

---

## Phase 2 — Tooling (`deploy-ota.ps1`, Windows)

### 2.1 Guards

- [ ] With `VITE_API_BASE_URL=http://localhost:3000` in the effective env file:
  script **aborts** with the loopback error before building.
  (For emulator E2E use `http://10.0.2.2:3000` — not loopback, passes.)
- [ ] With `VITE_TEST_LOGIN=true` set: script aborts.
- [ ] Without `DATABASE_URL` in env or `backend/.env`: aborts.

### 2.2 Happy path + zip layout

Run `npm run deploy:ota:alpha` (i.e. `deploy-ota.ps1 -Channel alpha`).

- [ ] Prints derived version `1.1.5-ota.1` (first run), checksum, public URL,
  rollback one-liner.
- [ ] DB row exists: correct `channel`, `storage_path`, lowercase sha256,
  `min_version_code` = current `VERSION_CODE`, `active=true`.
- [ ] Downloading the printed URL in a browser works (public bucket).
- [ ] **Zip layout:** `tar -tf <downloaded zip> | head` shows `index.html` at
  the zip root (no `dist/` prefix, forward slashes only).
- [ ] Second run increments to `1.1.5-ota.2` and the first row is now
  `active=false` (auto-deactivated).

### 2.3 Switches

- [ ] `-NoActivate`: row inserted with `active=false`, previous active row untouched.
- [ ] `-Rollback`: active flips back to the previous row; run again → flips forward. 
- [ ] `-Rollback` with only one row: deactivates it and says the channel now
  serves nothing.
- [ ] `-MinVersionCode 99`: row stores 99 (device check in 4.1 uses this).

---

## Phase 3 — Device E2E happy path (emulator)

Setup: app from Phase 0 installed, backend running, no OTA rows active yet.

1. Make a **visible change** (e.g. temporary color/text tweak), run
   `deploy-ota.ps1 -Channel alpha`.
2. In the inspected WebView console:
   `localStorage.setItem('snagbite.otaChannel','alpha')`.
3. Kill + relaunch the app; watch `[OTA]` logs.

- [ ] ~5 s after launch: `notifyAppReady confirmed`, then
  `Update available: 1.1.5-ota.N`, `Downloading …`, `Bundle … staged`.
- [ ] **Not applied mid-session** — the visible change is NOT there yet.
- [ ] Background the app (home button) → reopen: change is visible.
  (If not on first background, kill + relaunch — both paths must work.)
- [ ] Settings footer now reads `v1.1.5 (22) · ota 1.1.5-ota.N`.
- [ ] Keep the app open ≥ 15 s: **no rollback**, change persists after
  another kill + relaunch (proves `notifyAppReady` contract works).
- [ ] Relaunch again with everything unchanged: log shows
  `Up to date (channel=alpha, bundle=1.1.5-ota.N)` — no re-download.
- [ ] Deploy a second bundle; on the device, verify `Reusing already-downloaded bundle`
  appears only if the same version was staged before, else a fresh download.

### 3.1 Channel resolution without override

- [ ] `localStorage.removeItem('snagbite.otaChannel')`, sign in as a user with
  `app_metadata.tier = 'alpha'` → log shows `channel=alpha`.
- [ ] Sign in as a free/premium user → `channel=production`.
- [ ] First check right after cold start may run before the session loads
  (production fallback) — verify the **next** check (kill+relaunch) self-heals
  to `alpha`.

---

## Phase 4 — Gating & isolation (device)

- [ ] **min gate:** bundle deployed with `-MinVersionCode 99` → device logs
  `Up to date` (no update offered).
- [ ] **max gate:** set the active row's `max_version_code = 21` (device is 22)
  via SQL → no update offered.
- [ ] **Channel isolation:** device on `production` (no override, non-alpha
  user) with only an active **alpha** row → no update offered.

---

## Phase 5 — Rollback drills

### 5.1 Broken bundle → automatic device revert

Craft a deliberately broken bundle (don't use the deploy script — it rebuilds):

```powershell
cd frontend; npm run build
# break it: edit dist/index.html and point the main <script src> at a file that doesn't exist
tar.exe -a -cf broken.zip -C dist *
Get-FileHash broken.zip -Algorithm SHA256   # note lowercase hex
```

Upload `broken.zip` to `app-bundles/alpha/1.1.5-ota.99.zip` via Tigris S3 / S3 client,
insert the row via SQL (`active=true` after deactivating the current
one, `checksum` = the hash, `min_version_code=22`).

- [ ] Device downloads and stages it; after relaunch the app is broken/blank …
- [ ] … and within ~10 s (`appReadyTimeout`) the plugin **auto-reverts**: next
  relaunch shows the previous working bundle, Settings shows the previous
  version, and the broken bundle is deleted from `CapacitorUpdater.list()`.
- [ ] App does **not** re-download the broken bundle in a tight loop
  (deactivate the row after the test).

### 5.2 Corrupt download (checksum)

- [ ] Set the active row's `checksum` to 64 zeros via SQL → device log shows
  the download failing (checksum error), app stays on its current bundle,
  no crash. Restore the correct checksum.

### 5.3 Server-side rollback

- [ ] With two bundles on alpha (N active, N-1 previous):
  `deploy-ota.ps1 -Channel alpha -Rollback` → device converges back to N-1 on
  next check + relaunch cycle; Settings label follows.
- [ ] Same via `PATCH /api/admin/app-bundles/:id {"active":true}` on an older row.

---

## Phase 6 — Native update interaction

1. With an OTA bundle active on the device (Settings shows `· ota …`), build
   and install a release with **versionCode+1** (`npm run release`, install the
   AAB/APK over the app).
- [ ] After first launch of the new build: Settings shows plain
  `v1.1.x (23)` — **no** ota suffix (`resetWhenUpdate` wiped device bundles,
  back to builtin).
- [ ] Cap the old row via SQL: `update app_bundles set max_version_code = 22
  where min_version_code < 23 and max_version_code is null;` → new shell gets
  `update:false`, never re-downloads the stale bundle.
- [ ] Without the cap (temporarily set `max_version_code = null`): the old
  bundle WOULD be offered again — confirms why the post-Play-release capping
  step matters. Re-cap afterwards.

---

## Phase 7 — Inertness

- [ ] **Web:** run the web build in a browser — zero `[OTA]` logs, no network
  calls to `/api/app-updates/check`, Settings shows no ota suffix.
- [ ] **Dev/live-reload:** `npm run cap:live` — zero `[OTA]` logs (never test
  OTA under live-reload).
- [ ] **Offline device:** enable airplane mode, relaunch → check fails softly
  (`[OTA] Update check failed`), app fully usable.

---

## Phase 8 — First real rollout (production project)

Only after Phases 1–7 pass on dev:

1. Apply the same bucket + table SQL to **snagbite-prod**; point env at prod.
2. Deploy the backend (merge → master → Railway).
3. Ship a **no-op bundle** (no code change) to `alpha`:
   `npm run deploy:ota:alpha`.
4. - [ ] Soak ≥ 1 day on alpha devices: Settings shows the ota version, no
   feedback reports, no rollbacks.
5. `npm run deploy:ota` (production) — same soak check.
6. Note the rollback one-liner from the script output somewhere handy.

---

## Cleanup after testing

- [ ] Delete test rows from `app_bundles` (dev) and test zips from the bucket.
- [ ] `localStorage.removeItem('snagbite.otaChannel')` on test devices.
- [ ] Revert any temporary visible-change commits and `-MinVersionCode` test rows.

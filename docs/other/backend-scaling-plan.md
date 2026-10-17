# Backend-Skalierung: von 1 seriellen Worker zu tausenden gleichzeitigen Nutzern

## Kontext

Frage: Ist das Backend für viele hunderte/tausende Nutzer ausgelegt? **Antwort: Nein.**
Ziel: **volle horizontale Skalierung**, Zielgröße **tausende gleichzeitig aktive Nutzer**.

Das Backend ([src/](../src/)) ist ein Express/TypeScript-Server, der API + Hintergrund-Worker in **einem** Prozess vereint. Datenlayer ist PostgreSQL (Drizzle ORM), Auth ist Better-Auth, Deployment via [Dockerfile](../Dockerfile) (Single-Instance). Fundament ist solide, aber die Job-Verarbeitung ist ein serieller Flaschenhals und mehrere Stellen verhindern den Betrieb von >1 Instanz.

### Abgleich mit AGENTS.md

[AGENTS.md](../AGENTS.md) bestätigt das Architekturbild (PostgreSQL via Drizzle ORM, Better-Auth Sessions, Worker-Queue, 2-s-Polling). Drei Dinge sind für diesen Plan wichtig:

- **Veraltete Aussage:** AGENTS.md (Abschnitt „Mehrwert & Skalierbarkeit") behauptet „Serverless Ready: Keine Abhängigkeit von FFmpeg. Geringer Memory-Footprint." Das ist **durch den Code widerlegt** — ffmpeg wird intensiv genutzt ([frameExtractor.ts](../src/frameExtractor.ts), [package.json](../package.json), [queue.ts:222-236](../src/queue.ts#L222-L236)). Genau dieser CPU/Memory-schwere Schritt ist mit-Grund für den Worker-Flaschenhals. Diese Doku-Aussage ist im Zuge der Umsetzung zu korrigieren.
- **RLS beachten:** `jobs` ist mit RLS an `auth.uid() = user_id` gebunden. Die neue Claim-RPC (Phase A) läuft über den Service-Role-Key und muss `SECURITY DEFINER` sein.
- **Bild-Trennung:** Client-seitiges Caching betrifft nur Instagram-*Quellbilder* (IndexedDB, rechtlich bewusst so). Phase C migriert ausschließlich die server-seitig gespeicherten *extrahierten Frames* (`public/recipe-images`) — kein Konflikt.

### Arbeitsregeln (aus AGENTS.md)

- **Atomic Commits** pro logischem Block, selektives `git add`, Conventional-Commits.
- **AGENTS.md aktuell halten** nach jeder relevanten Änderung — inkl. Korrektur der FFmpeg/Serverless-Aussage und Ergänzung der neuen Skalierungsarchitektur.

### Ist-Zustand: die Engpässe (nach Schweregrad)

| # | Problem | Fundstelle | Wirkung |
|---|---------|-----------|---------|
| 1 | **Ein einziger serieller Worker.** `if (isRunning) return;` — global genau ein Job zur Zeit im ganzen Server. Job = Scrape + Video-Download + ffmpeg 25 Frames + mehrere Gemini-Calls ≈ 30 s–2 min. | [queue.ts:325-353](../src/queue.ts#L325-L353) | **Kritisch.** 1000 Nutzer → 999 warten seriell. |
| 2 | **Job-Claim nicht atomar.** `getNextPendingJob()` = `select ... limit 1`, kein Lock. Mehrere Worker/Instanzen greifen denselben Job. | [db.ts:199-214](../src/db.ts#L199-L214) | **Kritisch.** Blockiert Mehr-Instanz-Betrieb. |
| 3 | **`resetStuckJobs()` beim Start setzt ALLE `scraping`/`processing`-Jobs global auf failed.** Bei mehreren Instanzen killt jeder Neustart die laufenden Jobs der anderen. | [db.ts:275-290](../src/db.ts#L275-L290), [queue.ts:348-351](../src/queue.ts#L348-L351) | **Kritisch.** Verhindert sichere Neustarts & Multi-Instanz. |
| 4 | **Artefakte auf lokaler Disk.** Frames/Bilder in `public/recipe-images` + `logs/`, statisch von lokalem FS serviert. Instanz A sieht Bilder von Instanz B nicht. | [queue.ts:249-258](../src/queue.ts#L249-L258), [index.ts:64-66](../src/index.ts#L64-L66) | **Hoch.** Blockiert Multi-Instanz. |
| 5 | **Auth macht Netzwerk-Call pro Request.** Häufige Auth-Checks bei JEDEM Request; Frontend pollt Job-Status ~alle 2 s. | [auth.ts:50](../src/auth.ts#L50) | **Hoch.** Latenz bei vielen parallelen Nutzern. |
| 6 | **Rate-Limiter im Prozess-Speicher.** Default-Store von express-rate-limit ist pro-Instanz. | [index.ts:49-56](../src/index.ts#L49-L56) | **Hoch.** Limit bricht bei >1 Instanz. |
| 7 | **Keine Retries/Backoff, keine Cost-/Quota-Kontrolle** gegen Apify & Gemini. Keine Obergrenze pro Nutzer. | [gemini.ts](../src/gemini.ts), [apify.ts](../src/apify.ts) | **Hoch.** Kostenrisiko + externe Ratelimits bei tausenden Nutzern. |
| 8 | **`findCompletedJobByUrl` lädt alle completed-Jobs des Users und filtert im Speicher.** | [db.ts:217-232](../src/db.ts#L217-L232) | **Mittel.** Langsam bei vielen Rezepten. |
| 9 | Keine Connection-Pool-Konfiguration, kein Index auf `(status, created_at)` / `(user_id, created_at)`. | [db.ts:26-31](../src/db.ts#L26-L31) | **Mittel.** DB-Verbindungen erschöpfbar. |

---

## Zielarchitektur

```
                    ┌──────────────┐
   Clients ──LB──▶  │  Web-Instanzen│  (nur HTTP/API, N-fach, stateless)
                    └──────┬───────┘
                           │ insert job
                    ┌──────▼───────┐
                    │  Postgres     │  ← Job-Queue (atomarer Claim) + Daten
                    │  (Railway)   │
                    └──────┬───────┘
                           │ claim (SKIP LOCKED) + heartbeat
                    ┌──────▼───────┐
                    │ Worker-Instanzen│ (Job-Processing, N-fach, Pool je Instanz)
                    └──────┬───────┘
                           │ upload
                    ┌──────▼───────┐
                    │ Object Storage│  (Tigris S3 Storage / CDN) für Bilder
                    └──────────────┘
```

Web und Worker werden **entkoppelt** (gleiche Codebasis, per Env-Flag `ROLE=web|worker|both`), damit beide unabhängig skaliert werden.

---

## Plan (phasenweise, jede Phase eigenständig deploybar)

### Phase A — Atomarer Job-Claim + parallele Verarbeitung (größter Effekt)

Prerequisite für alles Weitere. Ersetzt den seriellen Worker durch einen Pool und macht Job-Übernahme mehr-instanz-sicher.

1. **Postgres-RPC für atomaren Claim** (Drizzle-Migration/Function). Statt `getNextPendingJob` + separatem Update:
   ```sql
   -- claim_next_job(): setzt Status atomar auf 'processing', setzt locked_at/locked_by, gibt Zeile zurück
   update jobs set status='processing', locked_at=now(), locked_by=$1, updated_at=now()
   where id = (
     select id from jobs where status='pending'
     order by created_at limit 1
     for update skip locked
   ) returning *;
   ```
   Neue Spalten `locked_at timestamptz`, `locked_by text` an `jobs`. In [db.ts](../src/db.ts) neue Funktion `claimNextJob(workerId)`; ersetzt `getNextPendingJob` im Worker-Pfad.
2. **Worker-Pool statt Single-Flight** in [queue.ts](../src/queue.ts): `isRunning`-Boolean → Zähler `activeJobs` mit Obergrenze `WORKER_CONCURRENCY` (Env, z. B. 3–4). `workerTick` claimt Jobs, solange `activeJobs < limit` und pending vorhanden; `processJob` läuft ohne `await` im Pool, dekrementiert im `finally`.
3. **Config** in [config.ts](../src/config.ts): `WORKER_CONCURRENCY` (default 3), `ROLE` (default `both`).

### Phase B — Lease/Heartbeat statt globalem Reset

Ersetzt das destruktive `resetStuckJobs()` durch zeitbasierte Wiederaufnahme.

1. `processJob` schreibt periodisch `locked_at=now()` (Heartbeat) — vorhandene `updateJob`-Progress-Calls in [queue.ts](../src/queue.ts) aktualisieren `updated_at` bereits; zusätzlich `locked_at` mitschreiben.
2. `resetStuckJobs()` → `reclaimExpiredJobs()`: nur Jobs mit `status in ('scraping','processing') AND locked_at < now() - interval 'X min'` zurück auf `pending` (nicht global, nicht an Start gebunden). Als periodischer Tick (z. B. jede Minute) statt einmalig beim Boot. Datei: [db.ts:275-290](../src/db.ts#L275-L290).

### Phase C — Object Storage für Artefakte (Multi-Instanz-Voraussetzung)

1. Rezeptbilder in **Tigris S3 Storage** (bereits im Stack) statt `public/recipe-images`. In [queue.ts:249-258](../src/queue.ts#L249-L258) `fs.copyFile` → Upload; `recipe.imageUrls` bekommt öffentliche Storage-URL.
2. Statisches Serving von `/recipe-images` in [index.ts:64-66](../src/index.ts#L64-L66) entfernen (bzw. nur noch Legacy-Fallback). `/api/image`-Proxy bleibt für Instagram-CORP.
3. `logs/run-*`/Frames bleiben ephemer/lokal (nur Debug), werden nach Job gelöscht — kein Cross-Instanz-Bedarf.

### Phase D — Web/Worker entkoppeln + geteiltes Rate-Limit

1. In [index.ts:16-19](../src/index.ts#L16-L19) `startQueue()` nur wenn `ROLE` ∈ {`worker`,`both`}; HTTP-Server nur wenn `ROLE` ∈ {`web`,`both`}. Ein Deploy-Target Web (N Instanzen), eins Worker (N Instanzen).
2. **Geteilter Rate-Limit-Store**: express-rate-limit auf Redis-Store (oder Postgres-basiert) umstellen, [index.ts:49-56](../src/index.ts#L49-L56). Alternativ Rate-Limit an den Load-Balancer/Ingress auslagern.
3. Docker/Compose: getrennte Services `web` und `worker` aus demselben Image mit unterschiedlichem `ROLE`. [Dockerfile](../Dockerfile) unverändert; Orchestrierung via compose/Railway.

### Phase E — Externe Abhängigkeiten & Kosten härten (kritisch bei tausenden Nutzern)

1. **Better-Auth Session-Handling** in [auth.ts](../src/auth.ts): Session über Better-Auth Middleware validieren. Eliminiert unnötige Roundtrips bei Polling.
2. **Per-User-Quota**: max. gleichzeitige pending/processing-Jobs pro `user_id` in [routes.ts:18-62](../src/routes.ts#L18-L62) prüfen (Zähl-Query), sonst 429. Schützt Apify/Gemini-Budget.
3. **Retry/Backoff** für Gemini/Apify in [gemini.ts](../src/gemini.ts)/[apify.ts](../src/apify.ts) (exponentiell, begrenzt). Gemini-File-API-Polling ([gemini.ts], 30×2 s blockierend) prüfen/verkürzen.
4. **Cost-Tracking persistieren**: aktuell nur nach `logs/gemini/` ([logger.ts](../src/logger.ts)) — pro Job/User in Postgres schreiben für Kostenkontrolle.

### Phase F — DB-Feinschliff

1. Indizes: `(status, created_at)` (Claim), `(user_id, created_at)` (Historie), `(user_id, status)` (Quota) — Drizzle-Migration.
2. `findCompletedJobByUrl` ([db.ts:217-232](../src/db.ts#L217-L232)): normalisierte URL in eigener Spalte speichern und per `.eq` filtern statt alle Zeilen laden.
3. PostgreSQL Connection-Pooler verwenden.

---

## Empfohlene Reihenfolge / Aufwand

- **A + B**: sofortiger, großer Durchsatzgewinn auf einer Instanz; Voraussetzung für Multi-Instanz. Zuerst.
- **C + D**: schaltet echte horizontale Skalierung frei (mehrere Worker). Danach.
- **E**: parallel/zeitnah — ohne das laufen Auth-Ratelimits und Kosten bei tausenden Nutzern aus dem Ruder.
- **F**: begleitend.

Pro abgeschlossener Phase: atomic commit(s) mit Conventional-Commits-Nachricht und [AGENTS.md](../AGENTS.md) aktualisieren (u. a. FFmpeg/„Serverless"-Aussage korrigieren, neue Worker-/Storage-/Auth-Architektur dokumentieren).

## Verifikation

1. **Atomarer Claim**: 2 Worker-Instanzen lokal starten, viele pending Jobs einspielen → jeder Job wird genau einmal verarbeitet (kein doppeltes `completed`, kein Verlust). SQL-Check auf `locked_by`.
2. **Parallelität**: `WORKER_CONCURRENCY=4`, 20 Jobs einreihen → in Logs laufen bis zu 4 `[Job …]` gleichzeitig; Gesamtzeit ≈ 1/4 der seriellen.
3. **Reclaim**: Worker mitten im Job hart killen → Job wird nach Lease-Timeout automatisch wieder `pending` und von anderer Instanz übernommen (nicht global auf failed gesetzt).
4. **Storage**: Job auf Instanz A, Bild-URL von Instanz B abrufbar (Cross-Instanz).
5. **Auth**: `/api/jobs/:id` unter Last (Polling) → keine externen Auth-Calls mehr (effiziente Session-Verifikation), Latenz stabil.
6. **Rate-Limit**: 2 Web-Instanzen → Limit greift global (nicht 2×100).
7. **Lasttest**: `k6`/`autocannon` gegen `/api/extract-recipe` + Poll-Loop, hunderte virtuelle Nutzer; Queue-Tiefe & p95-Latenz beobachten.

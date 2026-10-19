# 🎙️ Snagbite Whisper Edge Proxy (Cloudflare Worker)

Dieser Cloudflare Edge Worker dient als sichere, serverseitige Barriere zwischen den Snagbite-Clients (Web/App) und dem **Cloudflare AI Gateway / Groq Whisper**.

## Funktionsweise

1. Der Client sendet Audio/Video direkt an diesen Worker (`POST /transcribe`).
2. Der Worker verifiziert das vom Snagbite-Backend ausgestellte kurzlebige HMAC-Ticket (`x-snagbite-ticket`), das maximal 60 Sekunden gültig ist.
3. Nur wenn das Ticket gültig ist, injiziert der Worker im flüchtigen RAM das geheime Cloudflare-Gateway-Token (`cf-aig-authorization`) und leitet den Stream an das AI Gateway (`whisper-large-v3-turbo` auf Groq) weiter.
4. **Rechtlicher & Sicherheitsvorteil:** Weder der Groq-API-Key noch das Cloudflare-Token sind im Client sichtbar. Dein Backend-Server (Railway) berührt die Audiodaten zu keinem Zeitpunkt.

## Bereitstellung & Secrets einrichten

### 1. Abhängigkeiten installieren
```bash
cd cloudflare-workers/whisper-proxy
npm install
```

### 2. Secrets im Cloudflare Dashboard oder via Wrangler setzen
```bash
npx wrangler secret put CLOUDFLARE_ACCOUNT_ID
# -> Deine Cloudflare Account ID eingeben

npx wrangler secret put CF_AIG_TOKEN
# -> Dein Cloudflare AI Gateway Run Token eingeben

npx wrangler secret put WHISPER_HMAC_SECRET
# -> Dasselbe Secret wie in deinem Railway Backend (WHISPER_HMAC_SECRET) eingeben
```

### 3. Deployen
```bash
npx wrangler deploy
```

Nach dem Deployen erhältst du deine Worker-URL (z. B. `https://snagbite-whisper-proxy.<subdomain>.workers.dev`).
Diese URL trägst du in deinem Railway-Backend als `CLOUDFLARE_WHISPER_ENDPOINT` ein!

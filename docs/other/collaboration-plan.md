# Collaborate: Rezepte teilen, gemeinsam sammeln, zusammen kochen

> Status: **Konzept / Brainstorm**. Noch nichts davon ist implementiert.
> Entscheidungsvorlage — am Ende stehen die offenen Fragen, die vor Phase 1 zu klären sind.

## 1. Kontext: Warum jetzt?

Mit den **KI-Cover-Bildern (FLUX.1 [schnell])** hat jedes Rezept zum ersten Mal ein
eigenes, teilbares Gesicht. Vorher war ein Rezept ein Textblob mit einem
Instagram-Thumbnail, das rechtlich und optisch nicht weitergegeben werden wollte.
Jetzt liegt zu jedem Job ein **eigenes, von uns generiertes Bild in einem öffentlichen
Bucket** (`recipe-covers`, siehe `backend/src/imageGenerator.ts`). Das ist die
fehlende Zutat für alles, was mit Teilen zu tun hat:

* Ein geteiltes Rezept sieht in WhatsApp/iMessage/Instagram aus wie ein Produkt, nicht wie ein Link.
* Eine geteilte Sammlung kann als Regal aus Covern gerendert werden.
* Ein Freundes-Feed hat visuellen Inhalt, ohne dass jemand ein Foto machen muss.

### Was schon da ist (und wiederverwendet wird)

| Baustein | Ort | Nutzen fürs Teilen |
|---|---|---|
| `profiles` (display_name, avatar, `friend_code`) | `backend/supabase_schema.sql` | Identität ohne E-Mail-Leak |
| `friendships` (pending → accepted, beidseitig) | dito | Der Empfängerkreis existiert bereits |
| `GET/POST /api/friends*`, `/api/leaderboard` | `backend/src/routes.ts:1355-1600` | Endpunkt-Muster & Auth stehen |
| `FriendsView.tsx`, `LeaderboardView.tsx`, `Avatar.tsx` | `frontend/src/components/Social/` | UI-Heimat für alles Soziale |
| `collections` + `recipe_collections` | `backend/supabase_schema.sql` | Basis für geteilte Sammlungen |
| KI-Cover im **public** Bucket `recipe-covers` | `imageGenerator.ts` | Direkt verlinkbar, kein Signed-URL-Tanz |
| `sharp` im Backend | `backend/src/bannerGenerator.ts` | Share-Cards serverseitig komponieren |
| Deep Links `snagbite://invite/<code>` + Website-Landing | `frontend/src/App.tsx:73`, `website/src/pages/InviteLandingPage.tsx` | Blaupause für `snagbite://r/<token>` |
| Push-Worker mit Kategorien/Frequenz-Cap | `backend/src/notifications/` | „X hat dir ein Rezept geschickt" |
| Gamification (XP, Coins, Streaks, Badges) | `docs/architecture/gamification.md` | Soziale Anreize andocken |

### Die zentrale Mechanik: Teilen = Kopieren, nicht Extrahieren

Der Punkt, an dem alles hängt, ist unspektakulär und genau deshalb gut: Ein Rezept
liegt als fertiges `recipe`-JSONB in `public.jobs`. **Ein Rezept zu teilen heißt,
diese Zeile für den Empfänger zu kopieren** — kein Scrape, kein ffmpeg, kein Gemini,
kein FLUX. Kosten pro geteiltem Rezept: ein `INSERT`.

Drei Details aus dem bestehenden Schema machen das sauber:

* **Kein Extraktions-Quota-Verbrauch.** `getExtractionsForUserInTimeframe()`
  (`db.ts:525`) filtert auf `parent_job_id IS NULL`. Eine Kopie mit gesetztem
  `parent_job_id` zählt also automatisch **nicht** gegen das Extraktionslimit —
  exakt wie Remixes heute schon.
* **Aber Kochbuch-Quota schon.** `countCompletedRecipesForUser()` (`db.ts:507`) zählt
  alle nicht-gelöschten completed Jobs. Geteilte Rezepte belegen also einen Platz im
  Kochbuch — das ist gewollt und der natürliche Premium-Hebel.
* **Kein Konflikt mit dem Duplikat-Index.** `jobs_active_user_url_idx` greift nur für
  `pending|scraping|processing`. Eine sofort auf `completed` gesetzte Kopie kollidiert nie.
* **Das Cover wird mitkopiert, nicht neu erzeugt.** `recipe.imageUrl` zeigt auf den
  public Bucket; Sender und Empfänger teilen sich dieselbe Datei. Ein geteiltes
  Rezept kostet 0 Cent FLUX.

---

## 2. Leitprinzipien

1. **Keine neue Extraktion.** Jede Collaborate-Funktion arbeitet auf bereits
   extrahierten Rezepten. Teilen darf nie eine Pipeline anwerfen.
2. **Additiv & abwärtskompatibel.** Neue Tabellen und neue, optionale Felder. Kein
   bestehendes Feld ändert Bedeutung; alte App-Builds ignorieren die neuen Felder
   einfach. Kein Breaking Change (siehe AGENTS.md-Guard).
3. **Server-autoritativ.** Wie bei Gamification: Sichtbarkeit, Rollen und Quoten
   entscheidet das Backend (service-role), nie der Client. RLS-Policies als
   Defense-in-Depth.
4. **Identität minimal.** Nach außen nur `display_name` + Avatar, wie im Leaderboard.
   Niemals E-Mail, niemals `user_id` an Dritte.
5. **Herkunft bleibt sichtbar.** Eine Kopie weiß, von wem sie kam und aus welchem
   Original — für Attribution, für „X hat das auch gekocht", und um Kopier-Ketten
   nicht zu Spam werden zu lassen.
6. **Teilen ist gratis, Behalten kostet.** Der Growth-Loop darf nicht an einer
   Paywall sterben; das Kochbuch-Limit ist die Monetarisierungsstelle.

---

## 3. Ideen-Brainstorm

Bewertet nach Wirkung (Retention/Growth) gegen Aufwand. Reihenfolge = meine Empfehlung.

### A. Rezept an Freund:in schicken (1-Tap, In-App) — **Kern**
Im `RecipeActionDock` ein „Teilen"-Button → Bottom Sheet mit der Freundesliste →
antippen → der Freund bekommt eine Push („Lisa hat dir *Miso-Butter-Nudeln* geschickt")
und findet das Rezept in einem **Posteingang**, nicht direkt im Kochbuch.

Wichtig: **Zwei-Stufen-Modell.** Geschickt ≠ gespeichert. Der Empfänger sieht eine
Vorschau (Cover, Titel, Zeit, Zutaten) und entscheidet „Ins Kochbuch". Erst dieser
Klick erzeugt die Job-Kopie und belegt Kochbuch-Quota. Das verhindert, dass jemand
dein Kochbuch vollmüllt, und macht das Annehmen zum bewussten, belohnbaren Moment.

*Wirkung: hoch · Aufwand: mittel · nutzt: friendships, Push-Worker, Job-Kopie*

### B. Öffentlicher Share-Link mit Cover-Preview — **Growth-Motor**
`snagbite.at/r/<token>` — eine Seite mit dem KI-Cover, Titel, Zutaten (und optional
gekürzten Schritten) plus „In Snagbite öffnen / App holen". Funktioniert für Leute
**ohne Account**, genau wie `InviteLandingPage` heute für Invites.

> [!IMPORTANT]
> Für die Link-Vorschau in WhatsApp/Instagram/iMessage brauchen wir echte
> `og:image`/`og:title`-Meta-Tags im initialen HTML. `website/` ist eine statische
> Vite-SPA — Crawler sehen dort nichts. Die Share-Route muss deshalb **vom
> Express-Backend** (oder einem kleinen Prerender-Handler) ausgeliefert werden, das
> die Tags aus dem Job befüllt. Das ist der einzige echte Infrastruktur-Punkt im
> ganzen Plan und gehört bewusst entschieden.

Ein Klick auf „Speichern" in der App macht daraus wieder die Job-Kopie aus A.

*Wirkung: sehr hoch (viraler Loop, Cover ist das Asset) · Aufwand: mittel-hoch*

### C. Geteilte Sammlungen — **das eigentliche „Collaborate"**
`collections` bekommt eine Mitglieder-Tabelle mit Rollen (`owner` / `editor` / `viewer`).
Use Cases: „Urlaub Italien 2026", „Meal Prep WG", „Weihnachten", „Rezepte für Mama".
Ein Editor kann eigene Rezepte in die Sammlung legen — das Rezept selbst bleibt beim
Ersteller, die Sammlung ist nur die Klammer. Wer ein Rezept daraus behalten will,
löst wieder die Kopie aus.

Das ist die Funktion, die aus einem Single-Player-Kochbuch ein Werkzeug für
Haushalte, WGs und Paare macht — und sie hat den längsten Retention-Schwanz.

*Wirkung: hoch · Aufwand: mittel · nutzt: collections, recipe_collections*

### D. Freundes-Aktivität / Kochbuch-Feed
Ein schlanker Feed im Fortschritt-Tab: „Lisa hat *Ramen* gekocht" mit dem Cook-Foto
aus `cook_events` (das gibt's schon inkl. KI-Verifizierung!), „Tom hat 3 Rezepte zu
*Grillen 2026* hinzugefügt", „Ari ist Level 7". Kein Algorithmus, keine Endlos-Timeline
— chronologisch, nur Freunde, deckelbar.

Der Clou: der Feed hat **ab Tag 1 Bilder** (Cover + verifizierte Cook-Fotos), ohne dass
Nutzer etwas Neues tun müssen.

*Wirkung: mittel-hoch · Aufwand: mittel · nutzt: cook_events, cook-photos, friendships*

### E. Share-Card fürs Story-Sharing (serverseitig via `sharp`)
Ein 9:16- bzw. 4:5-PNG aus Cover + Titel + Emoji + Kochzeit + dezentem Snagbite-Branding
und QR/Kurzlink. `bannerGenerator.ts` macht mit `sharp` bereits genau diese Art von
Komposition — das ist ein kurzer Weg zu einem sehr sichtbaren Ergebnis.
Über `@capacitor/share` (schon als Dependency da, siehe `FriendsView.tsx:71`) direkt
in Instagram Stories teilbar.

*Wirkung: hoch (Growth, geringe Reibung) · Aufwand: niedrig-mittel*

### F. Reaktionen & Notizen auf geteilte Rezepte
Emoji-Reaktionen und kurze Kommentare — aber bewusst **nur im Kontext einer geteilten
Sammlung oder eines gesendeten Rezepts**, nicht global. „Hab's mit Ahornsirup statt
Honig gemacht" ist der wertvollste Kommentar im Kochkontext; ein öffentlicher
Kommentarbereich ist Moderationsaufwand ohne Nutzen.

*Wirkung: mittel · Aufwand: mittel (inkl. Melde-/Moderationspflicht)*

### G. Gemeinsam kochen: geteilte Einkaufsliste & Koch-Session
Die Einkaufsliste (`ShoppingList/`) für eine geteilte Sammlung zusammenführen und
live abhaken — „ich hab die Zwiebeln". Später: ein synchroner Koch-Modus, in dem zwei
Leute dieselben Schritte/Timer sehen.

*Wirkung: hoch für den Kern-Use-Case, aber schmales Publikum · Aufwand: hoch (Realtime)*

### H. Remix-Duell / Koch-Challenge
Gamification sozial machen: gleiches Ausgangsrezept, beide remixen (Remix existiert
bereits, Premium-gated), beide kochen mit Foto-Verifizierung, XP-Bonus für beide.
Nutzt `parent_job_id`, `cook_events.verified` und die Badge-Mechanik ohne neue Engine.

*Wirkung: mittel (Spitze, hoher Spaßfaktor) · Aufwand: mittel-hoch*

### I. Haushalt / Familien-Space
Ein persistenter Raum statt Einzelfreundschaften: gemeinsames Kochbuch, gemeinsame
Einkaufsliste, gemeinsamer Wochenplan. Faktisch C+G unter einem Dach — und der
natürliche Rahmen für ein späteres **Family-Premium-Abo**.

*Wirkung: hoch, aber erst nach C sinnvoll · Aufwand: hoch*

### J. Rezept-Wunsch („Extrahier das mal für mich")
Ein Freund schickt dir einen Reel-Link *in* Snagbite; du extrahierst und das Ergebnis
geht automatisch an beide. Charmant, aber es verbrennt das Quota des Extrahierenden
und lädt zum Missbrauch ein. **Bewusst zurückstellen.**

*Wirkung: niedrig-mittel · Aufwand: mittel · Risiko: Quota-Missbrauch*

---

## 4. Empfohlener Schnitt

| Phase | Inhalt | Warum in dieser Reihenfolge |
|---|---|---|
| **1 — Teilen** | A (Freund) + E (Share-Card) | Kleinstmögliche Einheit mit sofortigem Nutzen. Baut die Kopier-Mechanik, auf der alles andere steht. |
| **2 — Link** | B (öffentliche Share-Seite mit OG-Preview) | Der erste echte Growth-Loop. Braucht die Kopier-Mechanik aus Phase 1 als Landepunkt. |
| **3 — Sammeln** | C (geteilte Sammlungen) | Die Retention-Funktion. Braucht ein Rollen-/Mitgliedschaftsmodell, das Phase 1+2 noch nicht brauchen. |
| **4 — Sehen** | D (Feed) + F (Reaktionen) | Erst sinnvoll, wenn genug geteilt wird. |
| **Später** | G, H, I | Realtime bzw. Abo-Modell — eigene Entscheidungen. |
| **Verworfen** | J | Quota-Missbrauch |

---

## 5. Datenmodell-Skizze

Alles additiv, RLS an, Writes ausschließlich service-role — Muster wie `cook_events`.

### Phase 1+2

```sql
-- Eine gesendete/verlinkte Weitergabe. Deckt In-App-Senden (recipient_id gesetzt)
-- und öffentlichen Link (recipient_id NULL, token vergeben) mit einer Tabelle ab.
create table if not exists public.recipe_shares (
  id            uuid primary key default gen_random_uuid(),
  job_id        text not null references public.jobs(id) on delete cascade,
  sender_id     uuid not null,
  recipient_id  uuid,                      -- NULL = öffentlicher Link
  token         text unique,               -- nur für öffentliche Links (unguessbar)
  message       text,                      -- optionale kurze Notiz des Senders
  status        text not null default 'pending'
                check (status in ('pending','accepted','declined','revoked')),
  created_at    timestamptz not null default now(),
  responded_at  timestamptz,
  view_count    int not null default 0
);

create index if not exists recipe_shares_recipient_idx on public.recipe_shares (recipient_id, created_at desc);
create index if not exists recipe_shares_sender_idx    on public.recipe_shares (sender_id, created_at desc);
```

Und auf `jobs` zwei additive Spalten für die Herkunft der Kopie:

```sql
alter table public.jobs add column if not exists shared_from_job_id text;   -- Original
alter table public.jobs add column if not exists shared_from_user_id uuid;  -- ursprünglicher Ersteller
```

> `parent_job_id` bleibt dem Remix vorbehalten — wird für die Kopie aber ebenfalls
> gesetzt, damit die bestehende Quota-Logik (`parent_job_id IS NULL`) die Kopie
> automatisch vom Extraktionslimit ausnimmt. Das ist eine bewusste Doppelnutzung und
> gehört kommentiert; alternativ ein sauberes `origin`-Feld (`'extraction' | 'remix' | 'share'`)
> und die Quota-Query darauf umstellen — **das wäre die ehrlichere Variante**, kostet
> aber eine Migration bestehender Zeilen.

### Phase 3

```sql
create table if not exists public.collection_members (
  collection_id uuid not null references public.collections(id) on delete cascade,
  user_id       uuid not null,
  role          text not null default 'viewer' check (role in ('owner','editor','viewer')),
  invited_by    uuid,
  joined_at     timestamptz not null default now(),
  primary key (collection_id, user_id)
);

alter table public.collections add column if not exists is_shared boolean not null default false;
alter table public.collections add column if not exists share_token text unique;
```

`recipe_collections.user_id` (heute „Eigentümer der Zuordnung") wird damit zu „wer hat
es reingelegt" — semantisch passend, kein Schema-Change nötig. **Aber:** die
`recipe_collections`-RLS-Policies erlauben aktuell nur `auth.uid() = user_id`. Für
geteilte Sammlungen müssen sie um eine Mitgliedschaftsprüfung erweitert werden (das
Backend läuft über service-role und ist davon nicht betroffen — es geht um
Defense-in-Depth-Konsistenz).

---

## 6. API-Skizze

Alles unter dem bestehenden `apiRouter` mit dem etablierten Auth-Muster:

| Endpunkt | Zweck |
|---|---|
| `POST /api/jobs/:id/share` | An Freund senden (`{ recipientId, message? }`) oder Link erzeugen (`{ public: true }`) → `{ shareId, token?, url? }` |
| `GET /api/shares/inbox` | Eingehende, noch offene Shares (mit Vorschau: Cover, Titel, Zeit) |
| `POST /api/shares/:id/accept` | **Erzeugt die Job-Kopie.** Prüft Kochbuch-Quota, Duplikate (`url_normalized`), setzt Herkunft |
| `POST /api/shares/:id/decline` | Ablehnen |
| `DELETE /api/shares/:id` | Sender widerruft (auch für Links) |
| `GET /api/public/shares/:token` | Ungeauthete Vorschau für die Landing-Page (gedrosselt, `view_count++`) |
| `GET /api/jobs/:id/share-card.png` | `sharp`-komponiertes Story-Bild |
| `POST /api/collections/:id/members` · `PATCH`/`DELETE .../members/:userId` | Phase 3: Rollen verwalten |

**Vorbedingungen beim Sharen:** Job muss `status='completed'`, `recipe` gesetzt,
nicht soft-deleted und Eigentum des Senders sein — dieselben Checks wie beim Remix
(`routes.ts:461-470`).

---

## 7. Frontend-Andockpunkte

| Was | Wo |
|---|---|
| Teilen-Button + Share-Sheet | `components/RecipeDetails/RecipeActionDock.tsx` |
| Freundes-Picker (Wiederverwendung der Liste) | `components/Social/FriendsView.tsx`, `Avatar.tsx` |
| Posteingang „Für dich geteilt" | Neues Regal in `SavedCatalog/CookbookHome.tsx` (das `RecipeShelf`-Muster passt exakt) oder Badge im Fortschritt-Tab |
| Geteilte Sammlungen | `SavedCatalog/CollectionSheet.tsx`, `CollectionTile.tsx` (Avatar-Stack als Marker) |
| Deep Link `snagbite://r/<token>` | `App.tsx:73` (Invite-Handler als Vorlage), `native.ts:327` |
| Öffentliche Landing-Page | `website/src/pages/` — analog `InviteLandingPage.tsx`, aber mit backend-gerendertem `<head>` |
| Push „X hat dir ein Rezept geschickt" | Neue Kategorie `social` in `backend/src/notifications/types.ts` (transaktional, **außerhalb** des Frequenz-Caps der Marketing-Kategorien) |
| i18n DE/EN | `frontend/src/i18n.ts` |

---

## 8. Risiken & offene Punkte

* **Quota-Umgehung.** Wenn Annehmen gratis ist und nicht gegen das Kochbuch-Limit
  zählt, bauen sich zwei Free-Accounts gegenseitig unbegrenzte Kochbücher. Der
  Accept-Pfad **muss** `countCompletedRecipesForUser()` prüfen — genau wie der
  Extraktionspfad heute.
* **Spam.** Rate-Limit auf `POST /api/jobs/:id/share` (pro Sender/Tag), nur an
  akzeptierte Freundschaften senden, Posteingang deckeln, „blockieren" mitdenken.
* **Öffentliche Links & Urheberrecht.** Eine öffentliche Seite mit vollständiger
  Schritt-für-Schritt-Anleitung aus einem fremden Reel ist etwas anderes als ein
  privates Kochbuch. Vorschlag: öffentlich nur **Cover + Titel + Zutaten + Quelle
  (Handle/Link)**, die Schritte erst in der App. Das ist zugleich der bessere
  Install-Hook. **Rechtlich vor Phase 2 abzusegnen.**
* **Cover-Bilder sind öffentlich adressierbar.** Der Bucket ist `public` — jeder mit
  der URL sieht das Bild. Für Share-Links ist das genau richtig, sollte aber bewusst
  festgehalten sein.
* **Widerruf ist unvollständig.** Nach dem Annehmen hat der Empfänger eine eigene
  Kopie; ein späteres „Share zurückziehen" entfernt sie nicht. Das ist vertretbar
  (wie eine weitergeleitete Nachricht), muss in der UI aber ehrlich benannt werden.
* **DSGVO/Datenschutzerklärung.** Neue Verarbeitung („wer hat wem was geschickt") und
  neue Sichtbarkeit von Aktivität gegenüber Freunden → `PrivacyPolicyPage.tsx` und
  die Store-Angaben brauchen ein Update, spätestens mit Phase 4 (Feed).
* **Abwärtskompatibilität:** Alle Änderungen sind additiv; alte App-Builds sehen die
  neuen Felder schlicht nicht. Kein `[!CAUTION]`-Fall — **außer** man entscheidet sich
  für das saubere `origin`-Feld statt der `parent_job_id`-Doppelnutzung; dann ist eine
  Backfill-Migration nötig, die die Quota-Berechnung bestehender Nutzer berührt.

---

## 9. Zu entscheiden, bevor Phase 1 startet

1. **Posteingang oder direkt ins Kochbuch?** (Empfehlung: Posteingang — schützt Quota und Aufmerksamkeit.)
2. **`origin`-Feld sauber einführen oder `parent_job_id` mitbenutzen?** (Empfehlung: `origin`, solange die Nutzerbasis klein ist.)
3. **Öffentliche Links: voller Inhalt oder Teaser?** (Empfehlung: Teaser — rechtlich sicherer, besserer Install-Hook.)
4. **Wo lebt die OG-taugliche Share-Seite — Express-Backend oder Prerender im Website-Container?**
5. **Ist Teilen ein Premium-Feature?** (Empfehlung: nein — Senden und Annehmen gratis, das Kochbuch-Limit monetarisiert von selbst.)
6. **Reichen Phase 1+2 für den nächsten Release, oder soll C (geteilte Sammlungen) mit rein?**

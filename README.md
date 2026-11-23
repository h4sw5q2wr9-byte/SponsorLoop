# Sponsorloop Tracker

📄 **Handleiding (PDF):** [docs/Sponsorloop-Tracker-Handleiding.pdf](docs/Sponsorloop-Tracker-Handleiding.pdf)
🌐 **Site:** https://h4sw5q2wr9-byte.github.io/SponsorLoop/
📜 **Project history:** [docs/PROJECT-HISTORY.md](docs/PROJECT-HISTORY.md)

Rondjes tellen tijdens de sponsorloop, met een live stand en een onthulling voor op het grote scherm.
Gemaakt door Tijn van Kemenade.

- **Tracker** (`index.html`): klas kiezen en op de grote knop tikken. Beheer: klassen, schooldoel, statistieken, import/export.
- **Stream-pagina** (`stream.html`): **Live stand** (werkt vanzelf bij) of **Onthulling** (intro → top 3 → ranglijst → eindstand).
- Werkt op telefoon, tablet, laptop, digibord en oude tv-browsers; na het eerste bezoek ook **offline**; te installeren als app.

## Gegevens
Klassen en rondes staan **alleen op het apparaat** waarop geteld wordt (localStorage). Exporteer na afloop altijd een
backup (Beheer → Data & Beheer → Exporteren). Een klassenlijst staat in [`test-data/`](test-data/).

## Live Sync
1. Tracker: **Beheer → Data & Beheer → Live Sync → Start Sync** (staat bij openen altijd uit).
2. Ander scherm: open `stream.html` en vul de code in.
3. Kies **Live stand** of **Onthulling**. Stoppen: Esc of het kruisje (verschijnt bij muisbeweging).

Hoe het werkt (`src/hooks/useLiveSync.js`, `src/lib/liveFeed.js`):
- Firebase Realtime Database is alleen een **doorgeefluik**; de echte gegevens blijven op het tracker-apparaat.
- Wijzigingen worden **2 seconden gebundeld** en daarna samen verstuurd; alleen wat veranderd is (bijv. één aantal rondes).
- Uploads gaan **één voor één, op volgorde**; er worden altijd echte aantallen gestuurd (nooit "+1").
- **Zelfherstellend:** na een fout of als de code in Firebase is opgeruimd wordt alles opnieuw gestuurd, en elke 5 minuten
  gaat de volledige stand mee. Hartslag elke 30 s; de stream toont "Tracker niet actief" na 75 s stilte.
- De stream-pagina krijgt wijzigingen **gepusht** (Firebase streaming) en valt terug op elke 2 s ophalen.
- Offline doortellen kan; bij herstel van de verbinding wordt alles bijgewerkt.

### Embed (scorebord op een andere website)
Op de stream-pagina geeft **🔗 Embed** een kant-en-klare `<iframe>` met de huidige code
(`stream.html?code=ABCDE&view=embed`). Het scorebord opent direct, zonder menu of code invullen, en past zich aan de
breedte aan (telefoon en desktop). Zie ook pagina 9 van de handleiding.

```html
<iframe src="https://h4sw5q2wr9-byte.github.io/SponsorLoop/stream.html?code=ABCDE&view=embed"
  title="Sponsorloop live stand" loading="lazy"
  style="display:block;width:100%;max-width:900px;height:640px;margin:0 auto;border:0;border-radius:16px"></iframe>
```
Opties: `&theme=dark` (donker) of `&bg=transparent` (doorzichtige achtergrond).
**Start je een nieuwe Live Sync-code, dan moet de embed opnieuw gekopieerd en op de website bijgewerkt worden.**

Voor bezoekers:
- Eerst een **startscherm**; pas na een klik op *Bekijk de live stand* wordt verbonden (langs scrollen kost niets).
- Na **10 minuten** zonder interactie pauzeert het scorebord (*Opnieuw verbinden*); klikken of scrollen in het
  scorebord stelt dit uit.
- **Meldingen met de reden:** Live Sync uit of code verlopen, er wordt niet geteld, geen internet, of te druk
  (dan rustig opnieuw proberen na 15, 30 en 60 s, met een knop *Nu opnieuw*).

Zuinig met Firebase (`src/stream/embed.js`), gemeten:

| Moment | Firebase per kijker |
|---|---|
| Voor de klik | 0 bytes, 0 verbindingen |
| Bij verbinden | ~1,1 KB (hele stand, één keer) |
| Per tik | ~22 bytes (alleen klasnummer + aantal, ongeacht de lengte van de naam; tikken per 2 s gebundeld) |
| Stil (hartslag) | ~160 bytes per minuut |
| Veiligheids-verversing (elke 5 min) | alleen aantallen, geen namen |

De verbinding sluit als het tabblad verborgen is (na 10 s) of het scorebord uit beeld is gescrold (na 30 s) en
opent weer zodra iemand kijkt. Websitebestanden komen van GitHub Pages (~130 KB eerste bezoek, daarna uit de cache).
Let op: het gratis Spark-abonnement staat **maximaal 100 gelijktijdige verbindingen** toe. Verwacht je meer
gelijktijdige kijkers, zet het Firebase-project dan op Blaze (zelfde code; het dataverbruik blijft ruim binnen de
gratis 10 GB/maand).

### Beveiliging
- De tracker logt **anoniem** in (Firebase Authentication → Anonymous). Alleen de tracker die een code start, kan die
  wijzigen of verwijderen; kijkers kunnen alleen lezen. De lijst met codes is niet op te vragen.
- Regels: [`docs/firebase-rules.json`](docs/firebase-rules.json) (plakken bij Realtime Database → Rules).
- De Web API key in `src/lib/firebase.js` is niet geheim; de beveiliging zit in de regels.

## Feedback en onderhoud
- In de app (Beheer → ? → *Idee of probleem melden*, op de stream-pagina in het info-venster, en in foutmeldingen)
  kan iedereen een idee of probleem sturen. Dat komt in Firebase (`/feedback`, voor niemand leesbaar).
- [`.github/workflows/maintenance.yml`](.github/workflows/maintenance.yml) draait **elk half uur**:
  meldingen worden **GitHub-issues** (label `idee` of `bug`) en Live Sync-codes die langer dan een dag niet actief
  zijn worden opgeruimd. Een melding wordt pas uit Firebase verwijderd als het issue gemaakt is.
- Nodig: GitHub-secret `FIREBASE_SERVICE_ACCOUNT` (service-account JSON uit Firebase, **geheim**).
- Issues in een openbare repo zijn openbaar; het formulier waarschuwt hiervoor.
- GitHub pauzeert geplande taken na 60 dagen zonder wijzigingen: dan onder *Actions* weer aanzetten (meldingen blijven bewaard).

## Instellingen
| Wat | Waar |
|---|---|
| Naam contactpersoon in foutmeldingen | `src/lib/config.js` (`CONTACT`) |
| Naam op het intro-scherm van de onthulling | `src/stream/main.js` (`CREDIT`) |
| Aantal klassen in de eerste onthulling (top 3) | `src/stream/main.js` (`PODIUM`) |
| Firebase-adres en Web API key | `src/lib/firebase.js` |
| Bundel-tijd en hartslag Live Sync | `src/hooks/useLiveSync.js` (`BATCH_MS`, `HEARTBEAT_MS`) |

## Ontwikkelen
```bash
npm install
npm run dev      # lokaal starten
npm test         # unit-tests (logica in src/lib en scripts)
npm run build    # bouwt naar dist/
node tests/e2e/event-check.cjs   # generale repetitie tegen de live site (Playwright)
```
Elke push naar `main` wordt automatisch getest, gebouwd en gepubliceerd (GitHub Actions → Pages).

**Voor elke sponsorloop:** draai de generale repetitie (`tests/e2e/event-check.cjs`): 100 rondjes + herladen,
twee schermen live, wifi weg, export/import en de onthulling met 30 klassen.

Oude browsers (bijv. Samsung-tv) krijgen een omgezette versie (`@vitejs/plugin-legacy`), CSS zonder moderne notatie
(`postcss.config.js`), een `gap`-terugval (`public/compat.js`) en een melding *Oudere browser*.

## Mappen
```
src/
  App.jsx              hoofdcomponent: data, tabs en pop-ups
  pages/               Tracker en Beheer
  modals/              alle pop-ups (o.a. Live Sync, Feedback)
  components/          knoppen, pop-up basis, grafiek, ranglijst, navigatie
  hooks/useLiveSync    Live Sync naar Firebase
  lib/                 opslag, ranglijst, backup, kleuren, firebase, inloggen, feedback
  stream/              de stream-pagina (live stand + onthulling)
scripts/maintenance.mjs  feedback → issues + oude codes opruimen
tests/                 unit-tests + tests/e2e (generale repetitie)
test-data/             voorbeeldbestand om te importeren
docs/                  handleiding (PDF + bron), Firebase-regels, Netlify-doorverwijzing
```

De oude Netlify-site stuurt door naar deze site (`docs/netlify-redirect/`, zip in `docs/Netlify-doorsturen.zip`).

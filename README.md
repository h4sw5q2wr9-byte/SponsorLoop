# Sponsorloop Tracker

📄 **Handleiding (PDF):** [docs/Sponsorloop-Tracker-Handleiding.pdf](docs/Sponsorloop-Tracker-Handleiding.pdf)

Rondjes tellen tijdens de sponsorloop, met een live stand en een onthulling voor op het grote scherm.

- **Tracker** (`index.html`): klas kiezen en op de grote knop tikken.
- **Stream-pagina** (`stream.html`): live stand of onthulling van de uitslag.

## Live Sync
1. Tracker: **Beheer → Data & Beheer → Live Sync → Start Sync**.
2. Andere computer: open `stream.html` en vul de code in.
3. Kies **Live stand** of **Onthulling** (start met Spatie, daarna gaat het vanzelf). Stoppen: Esc of het kruisje.

Live Sync gebruikt Firebase Realtime Database (`src/lib/firebase.js`).
De tracker logt **anoniem** in (Firebase Authentication → Anonymous moet aan staan). Alleen de tracker die een code
start, kan die code wijzigen of verwijderen; kijkers (stream-pagina) kunnen alleen lezen.
De regels staan in [`docs/firebase-rules.json`](docs/firebase-rules.json) (plakken bij Realtime Database → Rules).

Firebase is alleen een doorgeefluik: de echte gegevens staan op het tracker-apparaat. De tracker ruimt zijn eigen
oude codes op (bij een nieuwe code of na een dag). Alles opruimen kan veilig met de hand: Realtime Database → Data → `sessions` verwijderen.

## Feedback en problemen
In de app (Beheer → ? → *Idee of probleem melden*, en op de stream-pagina in het info-venster) kunnen gebruikers
een idee of probleem sturen. Dat komt in Firebase (`/feedback`, niet leesbaar voor anderen) en wordt elk half uur
door `.github/workflows/feedback.yml` omgezet in een **GitHub-issue** (label `idee` of `bug`). Nodig: het secret
`FIREBASE_SERVICE_ACCOUNT` (service-account JSON uit Firebase). Let op: issues in een openbare repo zijn openbaar.

## Ontwikkelen
```bash
npm install
npm run dev      # lokaal starten
npm test         # tests
npm run build    # bouwt naar dist/
node tests/e2e/event-check.cjs   # generale repetitie tegen de live site (Playwright)
```
Elke push naar `main` wordt automatisch gebouwd en gepubliceerd (GitHub Actions → Pages).

De site werkt na het eerste bezoek ook offline (service worker via `vite-plugin-pwa`) en is te installeren als app. Firebase wordt nooit gecachet.

## Mappen
```
src/
  App.jsx            hoofdcomponent: data, tabs en pop-ups
  pages/             Tracker en Beheer
  modals/            alle pop-ups
  components/        knoppen, pop-up basis, grafiek, navigatie
  hooks/useLiveSync  Live Sync naar Firebase
  lib/               opslag, ranglijst, backup, kleuren, firebase
  stream/            de stream-pagina (live stand + onthulling)
tests/               tests voor de logica in lib/
test-data/           voorbeeldbestand om te importeren
docs/                handleiding (PDF + bron in docs/handleiding)
```

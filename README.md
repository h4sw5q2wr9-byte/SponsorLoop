# Sponsorloop Tracker

Rondjes tellen tijdens de sponsorloop, met een live stand en een onthulling voor op het grote scherm.

- **Tracker** (`index.html`): klas kiezen en op de grote knop tikken.
- **Stream-pagina** (`stream.html`): live stand of onthulling van de uitslag.

## Live Sync
1. Tracker: **Beheer → Data & Beheer → Live Sync → Start Sync**.
2. Andere computer: open `stream.html` en vul de code in.
3. Kies **Live stand** of **Onthulling** (start met Spatie, daarna gaat het vanzelf). Stoppen: Esc of het kruisje.

Live Sync gebruikt Firebase Realtime Database (`src/lib/firebase.js`), met deze regels:
```json
{ "rules": { "sessions": { "$code": { ".read": true, ".write": true } } } }
```

## Ontwikkelen
```bash
npm install
npm run dev      # lokaal starten
npm test         # tests
npm run build    # bouwt naar dist/
```
Elke push naar `main` wordt automatisch gebouwd en gepubliceerd (GitHub Actions → Pages).

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
```

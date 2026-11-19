# Sponsorloop Tracker

📄 **Handleiding (PDF):** [docs/Sponsorloop-Tracker-Handleiding.pdf](docs/Sponsorloop-Tracker-Handleiding.pdf)

Rondjes tellen tijdens de sponsorloop, met een live stand en een onthulling voor op het grote scherm.

- **Tracker** (`index.html`): klas kiezen en op de grote knop tikken.
- **Stream-pagina** (`stream.html`): live stand of onthulling van de uitslag.

## Live Sync
1. Tracker: **Beheer → Data & Beheer → Live Sync → Start Sync**.
2. Andere computer: open `stream.html` en vul de code in.
3. Kies **Live stand** of **Onthulling** (start met Spatie, daarna gaat het vanzelf). Stoppen: Esc of het kruisje.

Live Sync gebruikt Firebase Realtime Database (`src/lib/firebase.js`). Huidige regels: alleen geldige codes,
alleen data in de vorm die de tracker stuurt, en de lijst met alle codes is niet op te vragen:
```json
{
  "rules": {
    "sessions": {
      "$code": {
        ".read": "$code.matches(/^[A-Z2-9]{5}$/)",
        ".write": "$code.matches(/^[A-Z2-9]{5}$/)",
        ".validate": "newData.hasChild('updatedAt')",
        "classes": {
          "$i": {
            ".validate": "$i.matches(/^[0-9]{1,2}$/) && newData.hasChildren(['name', 'laps'])",
            "name": { ".validate": "newData.isString() && newData.val().length <= 60" },
            "laps": { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() < 100000" },
            "color": { ".validate": "newData.isString() && newData.val().length <= 9" },
            "$other": { ".validate": false }
          }
        },
        "schoolGoal": { ".validate": "newData.isNumber()" },
        "updatedAt": { ".validate": "newData.isNumber()" },
        "seenAt": { ".validate": "newData.isNumber()" },
        "$other": { ".validate": false }
      }
    }
  }
}
```

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

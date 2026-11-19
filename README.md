# Sponsorloop Tracker (live sync via Firebase)

## Eenmalig instellen
1. https://console.firebase.google.com → **Project toevoegen** (Analytics uit).
2. **Build → Realtime Database → Database maken** (kies een regio, start in *test mode*).
3. Tab **Rules** → vervang door en **Publish**:
   ```json
   { "rules": { "sessions": { "$code": { ".read": true, ".write": true } } } }
   ```
4. Kopieer de database-URL (bovenaan het tabblad Data, begint met `https://`) naar `firebase-config.js`.

## Publiceren (GitHub Pages)
Deze repo is al klaar: Settings → Pages → Deploy from branch → `main` / root.

## Gebruik
- Tracker: **Beheer → Data & Beheer (icoon) → Live Sync → Start Sync** geeft een code.
- Andere PC: open `stream.html`, voer de code in en kies **Live stand** (actuele stand, werkt vanzelf bij) of **Onthulling** (intro → top 3 → rest → eindstand, met Spatie). Esc = stoppen.
- OBS: **Kopieer OBS-link** geeft de live stand met transparante achtergrond (Browser-bron).
- Live Sync staat bij het openen van de tracker altijd uit; je kunt hervatten met dezelfde code.

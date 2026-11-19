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
- Tracker: knop rechtsonder **Live sync → Start sync** geeft een code.
- Andere PC: open `stream.html` (of de knop *Naar stream-pagina*), voer de code in.
- OBS: Browser-bron met `stream.html?code=ABCDE` (transparante achtergrond; `&solid` = donkere achtergrond).

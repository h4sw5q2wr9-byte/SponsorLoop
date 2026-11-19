// Anoniem inloggen bij Firebase (via REST), zodat alleen de tracker die een code
// heeft gestart die code kan wijzigen. Kijkers (stream-pagina) hoeven niet in te loggen.
import { FIREBASE_API_KEY, FirebaseUnavailable } from './firebase.js';
import { read, write } from './storage.js';

const STORE = 'sponsorloop_auth';
let session = null; // { idToken, refreshToken, uid, expiresAt }
let pending = null;

export const authEnabled = () => !!FIREBASE_API_KEY;

async function post(url, body, form = false) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': form ? 'application/x-www-form-urlencoded' : 'application/json' },
    body: form ? new URLSearchParams(body).toString() : JSON.stringify(body),
  });
  if (!res.ok) throw new FirebaseUnavailable(res.status); // inloggen geweigerd (bijv. limiet of uitgezet)
  return res.json();
}

function save(s) {
  session = s;
  write(STORE, JSON.stringify({ refreshToken: s.refreshToken, uid: s.uid }));
  return s;
}

async function signIn() {
  const stored = (() => { try { return JSON.parse(read(STORE) || 'null'); } catch { return null; } })();
  if (stored && stored.refreshToken) {
    try {
      // Zelfde anonieme gebruiker blijven, zodat "Verder met <code>" blijft werken
      const r = await post(`https://securetoken.googleapis.com/v1/token?key=${FIREBASE_API_KEY}`,
        { grant_type: 'refresh_token', refresh_token: stored.refreshToken }, true);
      return save({ idToken: r.id_token, refreshToken: r.refresh_token, uid: r.user_id, expiresAt: Date.now() + Number(r.expires_in) * 1000 });
    } catch { /* verlopen: nieuwe anonieme gebruiker */ }
  }
  const r = await post(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`, { returnSecureToken: true });
  return save({ idToken: r.idToken, refreshToken: r.refreshToken, uid: r.localId, expiresAt: Date.now() + Number(r.expiresIn) * 1000 });
}

/** Geeft { token, uid } of null als inloggen uit staat. Ververst het token automatisch. */
export async function getAuth() {
  if (!authEnabled()) return null;
  if (session && session.expiresAt - 60000 > Date.now()) return { token: session.idToken, uid: session.uid };
  if (!pending) pending = signIn().finally(() => { pending = null; });
  const s = await pending;
  return { token: s.idToken, uid: s.uid };
}

/** Alleen voor tests */
export function _reset() { session = null; pending = null; }

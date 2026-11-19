// Ruimt Live Sync-codes in Firebase op die langer dan een dag niet actief zijn.
// Draait elke nacht via GitHub Actions (.github/workflows/cleanup.yml).
// Veilig: de echte gegevens staan op het tracker-apparaat; Firebase is alleen doorgeefluik.
//
// Nodig: GitHub-secret FIREBASE_SERVICE_ACCOUNT (inhoud van het service-account JSON-bestand).
import { createSign } from 'node:crypto';

export const DB_URL = 'https://sponsorloop-1eb58-default-rtdb.europe-west1.firebasedatabase.app';
export const MAX_AGE_MS = 24 * 60 * 60 * 1000;

/** Welke codes zijn verouderd? (puur, getest in tests/cleanup.test.js) */
export function staleCodes(sessions, now = Date.now(), maxAge = MAX_AGE_MS) {
  return Object.entries(sessions || {})
    .filter(([, s]) => !s || typeof s !== 'object' || !(Number(s.seenAt || s.updatedAt) > now - maxAge))
    .map(([code]) => code);
}

const b64url = (v) => Buffer.from(typeof v === 'string' ? v : JSON.stringify(v)).toString('base64url');

async function accessToken(account) {
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    iss: account.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };
  const unsigned = `${b64url({ alg: 'RS256', typ: 'JWT' })}.${b64url(claims)}`;
  const signature = createSign('RSA-SHA256').update(unsigned).sign(account.private_key).toString('base64url');
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${signature}` }),
  });
  if (!res.ok) throw new Error(`Inloggen bij Google mislukt: HTTP ${res.status} ${await res.text()}`);
  return (await res.json()).access_token;
}

async function main() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) { console.log('Geen FIREBASE_SERVICE_ACCOUNT ingesteld: niets te doen.'); return; }
  const token = await accessToken(JSON.parse(raw));
  const headers = { Authorization: `Bearer ${token}` };

  const res = await fetch(`${DB_URL}/sessions.json`, { headers });
  if (!res.ok) throw new Error(`Ophalen mislukt: HTTP ${res.status}`);
  const sessions = (await res.json()) || {};
  const stale = staleCodes(sessions);
  console.log(`${Object.keys(sessions).length} code(s) gevonden, ${stale.length} verouderd.`);
  if (!stale.length) return;

  const del = await fetch(`${DB_URL}/sessions.json`, {
    method: 'PATCH',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(Object.fromEntries(stale.map((c) => [c, null]))),
  });
  if (!del.ok) throw new Error(`Verwijderen mislukt: HTTP ${del.status}`);
  console.log(`Opgeruimd: ${stale.join(', ')}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => { console.error(e.message); process.exit(1); });
}

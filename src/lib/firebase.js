// Firebase Realtime Database (via REST, geen SDK nodig)
export const DB_URL = 'https://sponsorloop-1eb58-default-rtdb.europe-west1.firebasedatabase.app';

/**
 * Web API key van het Firebase-project (Projectinstellingen → Algemeen).
 * Leeg = geen inloggen (iedereen met de code kan schrijven).
 * Ingevuld = de tracker logt anoniem in en alleen díe tracker kan zijn code wijzigen.
 * Deze sleutel is niet geheim; de beveiliging zit in de Firebase-regels.
 */
export const FIREBASE_API_KEY = '';

export const sessionUrl = (code, token) =>
  `${DB_URL}/sessions/${encodeURIComponent(code)}.json${token ? `?auth=${encodeURIComponent(token)}` : ''}`;

const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // zonder 0/O en 1/I/L
export function newCode(length = 5) {
  let s = '';
  for (let i = 0; i < length; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return s;
}

// Firebase Realtime Database (via REST, geen SDK nodig)
export const DB_URL = 'https://sponsorloop-1eb58-default-rtdb.europe-west1.firebasedatabase.app';

export const sessionUrl = (code) => `${DB_URL}/sessions/${encodeURIComponent(code)}.json`;

const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // zonder 0/O en 1/I/L
export function newCode(length = 5) {
  let s = '';
  for (let i = 0; i < length; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return s;
}

// Firebase Realtime Database (via REST, geen SDK nodig)
export const DB_URL = 'https://sponsorloop-1eb58-default-rtdb.europe-west1.firebasedatabase.app';

/**
 * Web API key van het Firebase-project (Projectinstellingen → Algemeen).
 * Leeg = geen inloggen (iedereen met de code kan schrijven).
 * Ingevuld = de tracker logt anoniem in en alleen díe tracker kan zijn code wijzigen.
 * Deze sleutel is niet geheim; de beveiliging zit in de Firebase-regels.
 */
export const FIREBASE_API_KEY = 'AIzaSyAUq-908lMPzZnfE2f57k6Ae3A9Y3wnxHA';

/**
 * Adres van één code. `token` = inlogtoken (schrijven), `silent` = Firebase stuurt geen
 * kopie van de data terug (scheelt dataverbruik bij elke upload).
 */
export function sessionUrl(code, token, silent = false) {
  const q = [];
  if (token) q.push(`auth=${encodeURIComponent(token)}`);
  if (silent) q.push('print=silent');
  return `${DB_URL}/sessions/${encodeURIComponent(code)}.json${q.length ? `?${q.join('&')}` : ''}`;
}

/** Fout van Firebase zelf (geweigerd, limiet bereikt), i.t.t. geen internet. */
export class FirebaseUnavailable extends Error {
  constructor(status) { super(`Firebase HTTP ${status}`); this.status = status; this.unavailable = true; }
}

/**
 * Veiligheids-verversing: alle aantallen opnieuw sturen, maar zonder namen en kleuren (die zijn
 * niet veranderd). Klopt de lijst niet meer met de vorige keer, dan alles (buildUpdate).
 */
export function buildRefresh(prev, classes, goal, now) {
  const full = buildUpdate(null, classes, goal, now);
  const sameShape = prev && prev.classes.length === full.snapshot.classes.length &&
    full.snapshot.classes.every((c, i) => c.name === prev.classes[i].name && c.color === prev.classes[i].color);
  if (!sameShape) return full;
  const patch = {};
  full.snapshot.classes.forEach((c, i) => { patch[`classes/${i}/laps`] = c.laps; });
  patch.schoolGoal = goal || null;
  patch.updatedAt = now;
  patch.seenAt = now;
  return { full: false, body: patch, snapshot: full.snapshot };
}

/** Bepaal wat er verstuurd moet worden: alleen wijzigingen (klein) of alles (na een andere wijziging). */
export function buildUpdate(prev, classes, goal, now) {
  const list = classes.map(({ name, laps, color }) => ({ name, laps, color }));
  const sameShape = prev && prev.classes.length === list.length &&
    list.every((c, i) => c.name === prev.classes[i].name && c.color === prev.classes[i].color);
  if (!sameShape) {
    return { full: true, body: { classes: list, schoolGoal: goal || null, updatedAt: now, seenAt: now }, snapshot: { classes: list, goal: goal || null } };
  }
  const patch = {};
  list.forEach((c, i) => { if (c.laps !== prev.classes[i].laps) patch[`classes/${i}/laps`] = c.laps; });
  if ((goal || null) !== prev.goal) patch.schoolGoal = goal || null;
  if (!Object.keys(patch).length) return null; // niets veranderd
  patch.updatedAt = now;
  patch.seenAt = now;
  return { full: false, body: patch, snapshot: { classes: list, goal: goal || null } };
}

const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // zonder 0/O en 1/I/L
export function newCode(length = 5) {
  let s = '';
  for (let i = 0; i < length; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return s;
}

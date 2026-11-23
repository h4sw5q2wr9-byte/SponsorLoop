// Vaste code met pincode (optioneel).
// Een vaste code (bijv. voor de embed op een website) blijft hetzelfde, ook als het tel-apparaat wordt vervangen:
// met de pincode kan een ander apparaat de code overnemen. Firebase bewaart de pincode onleesbaar;
// alleen apparaten die de juiste pincode hebben opgegeven ("leden") mogen de code wijzigen.
// Na 2 dagen zonder gebruik ruimt de onderhoudstaak de vaste code op.
import { DB_URL } from './firebase.js';
import { getAuth } from './firebaseAuth.js';

export const FIXED_CODE = /^[A-Z0-9]{5,12}$/;
export const MIN_PIN = 6;

/** Controle van de invoer, met een Nederlandse foutmelding (of null als alles klopt). */
export function checkFixedInput(code, pin) {
  if (!FIXED_CODE.test(code)) return 'De code moet 5 tot 12 letters of cijfers zijn.';
  if (String(pin || '').length < MIN_PIN) return `De pincode moet minstens ${MIN_PIN} tekens zijn.`;
  if (String(pin).length > 64) return 'De pincode is te lang.';
  return null;
}

const url = (path, token) => `${DB_URL}/${path}.json?auth=${encodeURIComponent(token)}&print=silent`;

/**
 * Vaste code reserveren of overnemen.
 * Geeft 'joined' (bestaande code overgenomen) of 'created' (nieuw gereserveerd); gooit een fout met uitleg.
 */
export async function claimFixedCode(rawCode, pin) {
  const code = String(rawCode || '').trim().toUpperCase();
  const problem = checkFixedInput(code, pin);
  if (problem) throw new Error(problem);
  if (!navigator.onLine) throw new Error('Geen internet. Probeer het opnieuw zodra je verbinding hebt.');
  const auth = await getAuth().catch(() => null);
  if (!auth) throw new Error('Verbinden met de server lukt nu niet. Probeer het later opnieuw.');

  const join = () => fetch(url(`members/${code}/${auth.uid}`, auth.token), { method: 'PUT', body: JSON.stringify(pin) });
  // 1. Bestaat de code al (met pincode)? Dan meedoen met de juiste pincode.
  let res = await join();
  if (res.ok) { await touchFixedCode(code); return { code, result: 'joined' }; }
  // 2. Nog niet gereserveerd: nu reserveren, daarna dit apparaat als lid toevoegen.
  res = await fetch(url(`pins/${code}`, auth.token), { method: 'PUT', body: JSON.stringify({ pin, lastUsed: Date.now() }) });
  if (!res.ok) throw new Error('Onjuiste pincode, of deze code is al in gebruik.');
  res = await join();
  if (!res.ok) throw new Error('Reserveren is niet gelukt. Probeer het opnieuw.');
  return { code, result: 'created' };
}

/** Markeer de vaste code als "in gebruik" (anders wordt hij na 2 dagen opgeruimd). */
export async function touchFixedCode(code) {
  const auth = await getAuth().catch(() => null);
  if (!auth) return;
  await fetch(url(`pins/${code}/lastUsed`, auth.token), { method: 'PUT', body: JSON.stringify(Date.now()) }).catch(() => {});
}

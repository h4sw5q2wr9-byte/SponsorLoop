// Feedback en probleemmeldingen versturen. Komt in Firebase (niet leesbaar voor anderen)
// en wordt door een GitHub-taak omgezet in een issue in de repository.
import { DB_URL } from './firebase.js';
import { getAuth } from './firebaseAuth.js';

/* global __APP_VERSION__ */
export const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';

/** Technische info die helpt bij een probleem (geen persoonsgegevens). */
export function collectInfo(extra = {}) {
  const lines = {
    Versie: APP_VERSION,
    Pagina: location.pathname.split('/').pop() || 'index.html',
    Browser: navigator.userAgent,
    Scherm: `${window.innerWidth}×${window.innerHeight} (${window.devicePixelRatio || 1}x)`,
    Online: navigator.onLine ? 'ja' : 'nee',
    ...extra,
  };
  return Object.entries(lines).map(([k, v]) => `${k}: ${v}`).join('\n').slice(0, 1500);
}

/**
 * Verstuur een melding. type: 'idee' | 'probleem'.
 * Gooit een fout met een Nederlandse uitleg als het niet lukt.
 */
export async function submitFeedback({ type, message, name = '', info = '' }) {
  const text = String(message || '').trim();
  if (text.length < 3) throw new Error('Schrijf iets meer.');
  if (!navigator.onLine) throw new Error('Geen internet. Probeer het later opnieuw.');
  const auth = await getAuth().catch(() => null);
  if (!auth) throw new Error('Versturen lukt nu niet. Probeer het later opnieuw.');
  const body = { type, message: text.slice(0, 1500), createdAt: Date.now() };
  if (name.trim()) body.name = name.trim().slice(0, 60);
  if (info) body.info = info.slice(0, 1500);
  const id = `${auth.uid}_${Date.now()}`;
  const res = await fetch(`${DB_URL}/feedback/${id}.json?auth=${encodeURIComponent(auth.token)}&print=silent`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Versturen lukt nu niet. Probeer het later opnieuw.');
}

// Live gegevens van één Live Sync-code ophalen.
// Gebruikt Firebase "streaming" (EventSource): Firebase stuurt wijzigingen zelf door,
// dus direct bijgewerkt en weinig dataverbruik. Werkt dat niet (bijv. streng netwerk),
// dan wordt automatisch teruggevallen op elke 2 seconden ophalen.
import { sessionUrl } from './firebase.js';

const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));

const splitPath = (p) => String(p || '/').split('/').filter(Boolean);

/** Zet `value` op pad `parts` (null = verwijderen). Werkt op een kopie. */
function setAt(root, parts, value) {
  if (!parts.length) return clone(value);
  const out = clone(root) || {};
  let node = out;
  for (let i = 0; i < parts.length - 1; i++) {
    if (node[parts[i]] === null || typeof node[parts[i]] !== 'object') node[parts[i]] = {};
    node = node[parts[i]];
  }
  const key = parts[parts.length - 1];
  if (value === null || value === undefined) {
    if (Array.isArray(node)) node[key] = undefined; else delete node[key];
  } else node[key] = clone(value);
  return out;
}

/**
 * Verwerkt één Firebase-streamgebeurtenis op de huidige data. Puur te testen.
 * 'put' = vervang op pad; 'patch' = elke sleutel (mag een pad met / zijn) apart toepassen.
 */
export function applyEvent(current, type, { path, data }) {
  const base = splitPath(path);
  let out;
  if (type === 'put') out = setAt(current, base, data);
  else {
    out = current;
    Object.keys(data || {}).forEach((k) => { out = setAt(out, base.concat(splitPath(k)), data[k]); });
  }
  if (out && Array.isArray(out.classes)) out.classes = out.classes.filter(Boolean);
  return out;
}

/**
 * Abonneer op een code. onData(data) bij elke wijziging, onStatus('ok' | 'error').
 * Geeft een functie terug om te stoppen.
 */
export function subscribe(code, onData, onStatus, { pollMs = 2000 } = {}) {
  let stopped = false;
  let data = null;
  let es = null;
  let pollTimer = null;
  let failures = 0;

  const emit = (d) => { data = d; if (!stopped) { onStatus('ok'); onData(d); } };

  function startPolling() {
    const tick = () => {
      if (stopped) return;
      fetch(sessionUrl(code), { cache: 'no-store' })
        .then((r) => { if (!r.ok) { const e = new Error(`HTTP ${r.status}`); e.unavailable = true; throw e; } return r.json(); })
        .then(emit)
        .catch((e) => !stopped && onStatus(e && e.unavailable ? 'unavailable' : 'error'))
        .then(() => { if (!stopped) pollTimer = setTimeout(tick, pollMs); }, () => { if (!stopped) pollTimer = setTimeout(tick, pollMs); });
    };
    tick();
  }

  if (typeof window.EventSource !== 'function') startPolling();
  else {
    es = new window.EventSource(sessionUrl(code));
    const handle = (type) => (e) => {
      failures = 0;
      try { emit(applyEvent(data, type, JSON.parse(e.data))); } catch { /* onbekend bericht */ }
    };
    es.addEventListener('put', handle('put'));
    es.addEventListener('patch', handle('patch'));
    es.addEventListener('keep-alive', () => { failures = 0; onStatus('ok'); });
    es.addEventListener('cancel', () => onStatus('unavailable')); // Firebase weigert (regels of limiet)
    es.onerror = () => {
      if (stopped) return;
      // Door de server geweigerd (bijv. te druk): de browser probeert dan niet meer zelf opnieuw.
      // Meteen terugvallen op ophalen, dat herkent "niet beschikbaar" en probeert het opnieuw.
      if (es.readyState === 2) { es.close(); es = null; startPolling(); return; }
      onStatus('error');
      failures += 1;
      // Lukt de live verbinding steeds niet? Dan terugvallen op ophalen.
      if (failures >= 3) { es.close(); es = null; startPolling(); }
    };
  }

  return () => {
    stopped = true;
    if (es) es.close();
    clearTimeout(pollTimer);
  };
}

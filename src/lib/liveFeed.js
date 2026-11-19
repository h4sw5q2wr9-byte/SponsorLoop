// Live gegevens van één Live Sync-code ophalen.
// Gebruikt Firebase "streaming" (EventSource): Firebase stuurt wijzigingen zelf door,
// dus direct bijgewerkt en weinig dataverbruik. Werkt dat niet (bijv. streng netwerk),
// dan wordt automatisch teruggevallen op elke 2 seconden ophalen.
import { sessionUrl } from './firebase.js';

const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));

/** Verwerkt één Firebase-streamgebeurtenis ('put' of 'patch') op de huidige data. Puur te testen. */
export function applyEvent(current, type, { path, data }) {
  const parts = String(path || '/').split('/').filter(Boolean);
  if (!parts.length) {
    if (type === 'put') return clone(data);
    return { ...(current || {}), ...clone(data) };
  }
  const root = clone(current) || {};
  let node = root;
  for (let i = 0; i < parts.length - 1; i++) {
    if (node[parts[i]] === null || typeof node[parts[i]] !== 'object') node[parts[i]] = {};
    node = node[parts[i]];
  }
  const key = parts[parts.length - 1];
  if (type === 'put') {
    if (data === null) {
      if (Array.isArray(node)) node[key] = undefined; else delete node[key];
    } else node[key] = clone(data);
  } else {
    node[key] = { ...(node[key] || {}), ...clone(data) };
  }
  if (Array.isArray(root.classes)) root.classes = root.classes.filter(Boolean);
  return root;
}

/**
 * Abonneer op een code. onData(data) bij elke wijziging, onStatus('ok' | 'error').
 * Geeft een functie terug om te stoppen.
 */
export function subscribe(code, onData, onStatus) {
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
        .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
        .then(emit)
        .catch(() => !stopped && onStatus('error'))
        .then(() => { if (!stopped) pollTimer = setTimeout(tick, 2000); });
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
    es.addEventListener('cancel', () => onStatus('error')); // geen toegang (regels)
    es.onerror = () => {
      if (stopped) return;
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

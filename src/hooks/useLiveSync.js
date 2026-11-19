import { useCallback, useEffect, useRef, useState } from 'react';
import { newCode, sessionUrl } from '../lib/firebase.js';
import { getAuth } from '../lib/firebaseAuth.js';
import { KEYS, read, write } from '../lib/storage.js';

const HEARTBEAT_MS = 15000; // stream-pagina ziet zo dat de tracker nog actief is
const RETRY_MS = 3000;

/**
 * Live Sync: stuurt klassen + doel naar Firebase zolang sync aan staat.
 * Staat bij het openen altijd uit; de vorige code wordt onthouden om te hervatten.
 */
export function useLiveSync(classes, goal) {
  const [code, setCode] = useState(null);
  const [prevCode, setPrevCode] = useState(() => read(KEYS.liveCode));
  const [status, setStatus] = useState('idle'); // idle | sending | ok | error | denied
  const [lastOkAt, setLastOkAt] = useState(0);
  const latest = useRef({ classes, goal });
  const retry = useRef(null);

  latest.current = { classes, goal };

  const send = useCallback(async (target) => {
    clearTimeout(retry.current);
    if (!target) return;
    const { classes: cl, goal: g } = latest.current;
    const body = {
      classes: cl.map(({ name, laps, color }) => ({ name, laps, color })),
      schoolGoal: g || null,
      updatedAt: Date.now(),
      seenAt: Date.now(),
    };
    try {
      const auth = await getAuth(); // null als inloggen uit staat
      if (auth) body.owner = auth.uid;
      const res = await fetch(sessionUrl(target, auth && auth.token), { method: 'PUT', body: JSON.stringify(body) });
      if (res.status === 401 && auth) { setStatus('denied'); return; } // code is van een ander apparaat
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setStatus('ok');
      setLastOkAt(Date.now());
    } catch {
      setStatus('error');
      retry.current = setTimeout(() => send(target), RETRY_MS);
    }
  }, []);

  // Bij elke wijziging (kort gebundeld) versturen
  useEffect(() => {
    if (!code) return undefined;
    const t = setTimeout(() => send(code), 200);
    return () => clearTimeout(t);
  }, [classes, goal, code, send]);

  // Hartslag: alleen een tijdstip (klein), zodat de stream weet dat de tracker actief is.
  // Mislukt het, dan wordt de hele stand opnieuw verstuurd.
  useEffect(() => {
    if (!code) return undefined;
    const beat = () => getAuth()
      .then((auth) => fetch(sessionUrl(code, auth && auth.token), { method: 'PATCH', body: JSON.stringify({ seenAt: Date.now() }) }))
      .then((res) => { if (!res.ok) throw new Error(`HTTP ${res.status}`); setStatus('ok'); setLastOkAt(Date.now()); })
      .catch(() => send(code));
    const t = setInterval(beat, HEARTBEAT_MS);
    return () => clearInterval(t);
  }, [code, send]);

  const start = useCallback((reuse = false) => {
    const c = reuse && prevCode ? prevCode : newCode();
    write(KEYS.liveCode, c);
    setPrevCode(c);
    setStatus('sending');
    setCode(c);
  }, [prevCode]);

  const stop = useCallback(() => {
    clearTimeout(retry.current);
    if (code) getAuth().then((auth) => fetch(sessionUrl(code, auth && auth.token), { method: 'DELETE' })).catch(() => {});
    write(KEYS.liveCode, null);
    setPrevCode(null);
    setCode(null);
    setStatus('idle');
  }, [code]);

  return { code, prevCode, status, lastOkAt, start, stop };
}

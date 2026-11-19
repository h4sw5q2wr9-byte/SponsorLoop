import { useCallback, useEffect, useRef, useState } from 'react';
import { buildUpdate, FirebaseUnavailable, newCode, sessionUrl } from '../lib/firebase.js';
import { getAuth } from '../lib/firebaseAuth.js';
import { KEYS, read, write } from '../lib/storage.js';

const HEARTBEAT_MS = 30000; // stream-pagina ziet zo dat de tracker nog actief is
const RETRY_MS = 3000;
const BATCH_MS = 2000; // wijzigingen 2 seconden verzamelen en dan samen versturen
const FULL_EVERY = 10; // elke 10e hartslag (5 min) de volledige stand sturen: eventuele verschillen herstellen zich
const RETRY_UNAVAILABLE_MS = 30000; // Firebase weigert: rustig opnieuw proberen
const FORGOTTEN_AFTER_MS = 24 * 60 * 60 * 1000; // vergeten code na een dag opruimen

/** Verwijdert een code uit Firebase (alleen mogelijk voor de eigen tracker). */
function removeCode(c) {
  return getAuth()
    .then((auth) => fetch(sessionUrl(c, auth && auth.token, true), { method: 'DELETE' }))
    .catch(() => {});
}

/**
 * Live Sync: stuurt klassen + doel naar Firebase zolang sync aan staat.
 * Staat bij het openen altijd uit; de vorige code wordt onthouden om te hervatten.
 */
export function useLiveSync(classes, goal) {
  const [code, setCode] = useState(null);
  const [prevCode, setPrevCode] = useState(() => {
    // Code van meer dan een dag geleden die nooit gestopt is? Stil opruimen.
    const old = read(KEYS.liveCode);
    const seen = Number(read(KEYS.liveSeen)) || 0;
    if (old && Date.now() - seen > FORGOTTEN_AFTER_MS) {
      removeCode(old);
      write(KEYS.liveCode, null);
      write(KEYS.liveSeen, null);
      return null;
    }
    return old;
  });
  const [status, setStatus] = useState('idle'); // idle | sending | ok | error | denied | unavailable
  const [lastOkAt, setLastOkAt] = useState(0);
  const latest = useRef({ classes, goal });
  const retry = useRef(null);
  const lastSent = useRef(null); // wat Firebase nu heeft, om alleen wijzigingen te sturen

  latest.current = { classes, goal };

  // Altijd maar één upload tegelijk, op volgorde: zo kan een trage oudere upload nooit een
  // nieuwere stand overschrijven. Komt er tijdens een upload iets bij, dan volgt direct een nieuwe.
  const busy = useRef(false);
  const again = useRef(null); // { target, force } die nog moet

  const send = useCallback(async (target, force = false) => {
    clearTimeout(retry.current);
    if (!target) return;
    if (busy.current) {
      again.current = { target, force: force || (again.current && again.current.force) };
      return;
    }
    busy.current = true;
    try { await upload(target, force); } finally {
      busy.current = false;
      const next = again.current;
      again.current = null;
      if (next) send(next.target, next.force);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const upload = async (target, force) => {
    const { classes: cl, goal: g } = latest.current;
    const prev = !force && lastSent.current && lastSent.current.code === target ? lastSent.current : null;
    const update = buildUpdate(prev, cl, g, Date.now());
    if (!update) return; // niets nieuws
    try {
      const auth = await getAuth(); // null als inloggen uit staat
      if (auth && update.full) update.body.owner = auth.uid;
      const res = await fetch(sessionUrl(target, auth && auth.token, true), {
        method: update.full ? 'PUT' : 'PATCH',
        body: JSON.stringify(update.body),
      });
      if (res.status === 401 && auth) {
        lastSent.current = null;
        // Kleine update geweigerd? Dan is de code in Firebase waarschijnlijk opgeruimd: alles opnieuw sturen.
        if (!update.full) { again.current = { target, force: true }; return; }
        setStatus('denied'); return; // volledige upload geweigerd: code is van een ander apparaat
      }
      if (!res.ok) throw new FirebaseUnavailable(res.status);
      lastSent.current = { code: target, ...update.snapshot };
      setStatus('ok');
      setLastOkAt(Date.now());
      write(KEYS.liveSeen, String(Date.now()));
    } catch (e) {
      lastSent.current = null; // volgende keer alles opnieuw sturen
      const unavailable = !!(e && e.unavailable);
      setStatus(unavailable ? 'unavailable' : 'error');
      retry.current = setTimeout(() => send(target, true), unavailable ? RETRY_UNAVAILABLE_MS : RETRY_MS);
    }
  };

  // Bundelen: bij de eerste wijziging start een timer van BATCH_MS. Alles wat in die tijd
  // gebeurt (meerdere tikken, meerdere klassen) gaat samen in één bericht. De timer wordt
  // niet verlengd, dus ook bij heel snel doortikken gaat er minstens elke 2 s een update uit.
  const batch = useRef(null);
  useEffect(() => {
    if (!code || batch.current) return;
    const first = !(lastSent.current && lastSent.current.code === code); // net gestart: meteen sturen
    batch.current = setTimeout(() => { batch.current = null; send(code); }, first ? 0 : BATCH_MS);
  }, [classes, goal, code, send]);
  useEffect(() => () => { clearTimeout(batch.current); batch.current = null; }, [code]);

  // Hartslag: alleen een tijdstip (klein), zodat de stream weet dat de tracker actief is.
  // Mislukt het, dan wordt de hele stand opnieuw verstuurd.
  useEffect(() => {
    if (!code) return undefined;
    let beats = 0;
    const beat = () => ((beats += 1) % FULL_EVERY === 0 ? send(code, true) : getAuth()
      .then((auth) => fetch(sessionUrl(code, auth && auth.token, true), { method: 'PATCH', body: JSON.stringify({ seenAt: Date.now() }) }))
      .then((res) => { if (!res.ok) throw new Error(`HTTP ${res.status}`); setStatus('ok'); setLastOkAt(Date.now()); write(KEYS.liveSeen, String(Date.now())); })
      .catch(() => send(code, true)));
    const t = setInterval(beat, HEARTBEAT_MS);
    return () => clearInterval(t);
  }, [code, send]);

  const start = useCallback((reuse = false) => {
    const c = reuse && prevCode ? prevCode : newCode();
    if (!reuse && prevCode) removeCode(prevCode); // oude code van dit apparaat opruimen
    write(KEYS.liveCode, c);
    write(KEYS.liveSeen, String(Date.now()));
    setPrevCode(c);
    setStatus('sending');
    setCode(c);
  }, [prevCode]);

  const stop = useCallback(() => {
    clearTimeout(retry.current);
    if (code) removeCode(code);
    write(KEYS.liveCode, null);
    write(KEYS.liveSeen, null);
    setPrevCode(null);
    setCode(null);
    setStatus('idle');
  }, [code]);

  return { code, prevCode, status, lastOkAt, start, stop };
}

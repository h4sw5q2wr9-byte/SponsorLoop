// Herladen na een update. Na een nieuwe versie kan een oud bestand (bijv. het Beheer-scherm) weg zijn;
// de pagina herladen haalt dan de nieuwe versie op. Stond Live Sync aan, dan gaat die daarna vanzelf verder.
const LIVE = 'sl_live_on';
const RESUME = 'sl_resume_live';
const AT = 'sl_reload_at';
const get = (k) => { try { return sessionStorage.getItem(k); } catch { return null; } };
const set = (k, v) => { try { if (v == null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch { /* niet erg */ } };

/** Onthoudt (alleen in dit tabblad) of Live Sync aan staat. */
export const markLive = (on) => set(LIVE, on ? '1' : null);

/** Pagina herladen; Live Sync gaat daarna verder als die aan stond. */
export function reloadApp() {
  if (get(LIVE)) set(RESUME, '1');
  location.reload();
}

/** Na een automatisch herladen: moet Live Sync verder? (één keer waar) */
export function takeResume() {
  const r = get(RESUME);
  set(RESUME, null);
  return !!r;
}

/** Een los bestand laden; lukt dat niet (oude versie), dan één keer herladen. */
export function loadFresh(load) {
  return load().catch((err) => {
    const last = Number(get(AT)) || 0;
    if (Date.now() - last < 60000) throw err; // net al herladen: echte fout, dan de foutmelding tonen
    set(AT, String(Date.now()));
    reloadApp();
    return new Promise(() => {}); // wachten op het herladen
  });
}

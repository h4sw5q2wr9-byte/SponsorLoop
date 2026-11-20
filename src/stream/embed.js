// Embed-weergave: compact, responsief scorebord voor op een andere website (iframe).
// Openen met: stream.html?code=ABCDE&view=embed   (optioneel: &theme=dark, &bg=transparent)
//
// Zuinig met Firebase (het gratis plan staat 100 gelijktijdige kijkers toe):
//  - Er wordt pas verbonden als de bezoeker op "Bekijk de live stand" klikt.
//  - Na 10 minuten zonder interactie pauzeert het scorebord ("Opnieuw verbinden").
//  - Tabblad verborgen (10 s) of scorebord uit beeld (30 s): verbinding dicht, terug in beeld: weer open.
//  - Eén live verbinding per kijker; Firebase stuurt alleen wijzigingen (~22 bytes per tik).
//  - Lukt het niet (druk, geen internet), dan rustig opnieuw proberen: 15 s, 30 s, 60 s.
import { subscribe } from '../lib/liveFeed.js';
import { standings } from '../lib/standings.js';

const TIMEOUT_MS = 10 * 60 * 1000;      // na 10 min zonder interactie pauzeren
const PAUSE_AFTER_HIDDEN_MS = 10000;    // ander tabblad: na 10 s verbinding sluiten
const PAUSE_AFTER_OFFSCREEN_MS = 30000; // uit beeld gescrold: na 30 s sluiten
const RETRY_STEPS_MS = [15000, 30000, 60000];
const TRACKER_IDLE_MS = 75000;          // geen hartslag van de tracker: "niet actief"
const MEDAL = ['#f59e0b', '#94a3b8', '#d97706'];

const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const col = (c) => (/^#[0-9a-f]{3,8}$/i.test(c || '') ? c : '#3b82f6');
const svg = (d, s = 20) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const ICON = {
  play: svg('<polygon points="6 3 20 12 6 21 6 3"/>', 18),
  radio: svg('<path d="M4.9 19.1a10 10 0 0 1 0-14.2M7.8 16.2a6 6 0 0 1 0-8.4M16.2 7.8a6 6 0 0 1 0 8.4M19.1 4.9a10 10 0 0 1 0 14.2"/><circle cx="12" cy="12" r="2"/>', 28),
  pause: svg('<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>', 28),
  refresh: svg('<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>', 16),
};

export function startEmbed(app, code, params) {
  const dark = params.get('theme') === 'dark';
  document.documentElement.classList.toggle('dark', dark);
  const transparent = params.get('bg') === 'transparent';
  if (transparent) document.body.classList.add('transparent');
  document.body.classList.add('embed');

  // ---- toestand ----
  let data = null;          // laatste stand
  let mode = 'start';       // start | live | paused | timeout
  let conn = 'idle';        // idle | connecting | ok | error | unavailable | waiting
  let stop = null;          // sluit de verbinding
  let lastChange = 0;
  let retryStep = 0;
  let retryAt = 0;
  let retryTimer = null;
  let errorStreak = 0;

  app.innerHTML = `
    <main class="embed-root relative h-screen supports-[height:100dvh]:h-[100dvh] flex flex-col p-4 sm:p-6 ${transparent ? '' : 'bg-slate-50 dark:bg-slate-900'}">
      <header class="flex items-end justify-between gap-4 mb-3">
        <div class="min-w-0">
          <p class="flex items-center gap-2 uppercase tracking-[.25em] font-extrabold text-[11px] text-blue-600 dark:text-blue-400">
            <span id="emDot" class="w-2 h-2 rounded-full bg-slate-400"></span>Live stand
          </p>
          <h1 class="font-black text-slate-900 dark:text-white leading-tight" style="font-size:clamp(20px,5vw,34px)">Sponsorloop</h1>
        </div>
        <div class="text-right shrink-0">
          <p class="uppercase tracking-widest font-extrabold text-[10px] text-slate-400">Totaal rondes</p>
          <p id="emTotal" class="font-black tabular-nums text-blue-600 dark:text-blue-400 leading-none" style="font-size:clamp(28px,8vw,52px)">–</p>
        </div>
      </header>
      <div id="emGoal" class="mb-3 hidden">
        <div class="flex justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-1"><span id="emGoalLabel"></span><span id="emPct" class="tabular-nums"></span></div>
        <div class="w-full bg-slate-200/70 dark:bg-slate-700/70 h-2.5 rounded-full overflow-hidden"><div id="emGoalBar" class="bar h-full bg-blue-500 rounded-full" style="width:0"></div></div>
      </div>
      <div id="emNotice" class="hidden mb-3 rounded-2xl px-4 py-3 text-sm font-semibold flex items-center gap-3"></div>
      <ol id="emList" class="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-2 pb-6" style="-webkit-mask-image:linear-gradient(to bottom,#000 calc(100% - 28px),transparent);mask-image:linear-gradient(to bottom,#000 calc(100% - 28px),transparent)"></ol>
      <p class="pt-2 text-[11px] font-medium text-slate-400 dark:text-slate-500 flex justify-between gap-2">
        <span id="emStatus"></span><span id="emTime"></span>
      </p>
      <div id="emOverlay" class="absolute inset-0 z-10 flex items-center justify-center p-6 bg-slate-50/70 dark:bg-slate-900/70 backdrop-blur-sm"></div>
    </main>`;

  const $ = (id) => document.getElementById(id);
  const list = $('emList');

  // ---------- weergave ----------
  function rowHtml(c, max) {
    const mc = c.rank <= 3 ? MEDAL[c.rank - 1] : null;
    return `<li data-name="${esc(c.name)}" class="flex items-center gap-3 bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 rounded-2xl px-3 py-2 shadow-sm">
      <span data-r="rank" class="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-black tabular-nums ${mc ? 'text-white' : 'text-slate-400 bg-slate-100 dark:bg-slate-700'}" style="${mc ? `background:${mc}` : ''}">${c.rank}</span>
      <span class="shrink-0 w-1.5 self-stretch rounded-full" style="background:${col(c.color)}"></span>
      <div class="flex-1 min-w-0">
        <div class="font-bold text-slate-800 dark:text-slate-100 truncate" style="font-size:clamp(14px,3.4vw,18px)">${esc(c.name)}</div>
        <div class="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mt-1"><div data-r="bar" class="bar h-full rounded-full" style="width:${(c.laps / max) * 100}%;background:${col(c.color)}"></div></div>
      </div>
      <span data-r="laps" class="shrink-0 font-black tabular-nums text-slate-900 dark:text-white" style="font-size:clamp(18px,4.6vw,28px)">${c.laps}</span>
    </li>`;
  }
  function bump(el) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }

  function renderBoard() {
    const st = standings((data && data.classes) || [], data && data.schoolGoal);
    const total = $('emTotal');
    const shown = data ? String(st.total) : '–';
    if (total.textContent !== shown) { if (total.textContent !== '–' && data) bump(total); total.textContent = shown; }
    $('emGoal').classList.toggle('hidden', !st.goal);
    if (st.goal) {
      $('emGoalLabel').textContent = `School doel ${st.goal}`;
      $('emPct').textContent = `${st.pct}%`;
      $('emGoalBar').style.width = `${st.pct}%`;
    }
    const rows = {};
    Array.prototype.forEach.call(list.children, (el) => { const n = el.getAttribute('data-name'); if (n) rows[n] = el; });
    const sameSet = st.list.length && Object.keys(rows).length === st.list.length && st.list.every((c) => rows[c.name]);
    if (!sameSet) {
      list.innerHTML = st.list.map((c) => rowHtml(c, st.max)).join('');
      return;
    }
    const first = {};
    st.list.forEach((c) => { first[c.name] = rows[c.name].getBoundingClientRect(); });
    st.list.forEach((c) => {
      const el = rows[c.name];
      const laps = el.querySelector('[data-r="laps"]');
      if (laps.textContent !== String(c.laps)) { const up = c.laps > Number(laps.textContent); laps.textContent = c.laps; if (up) bump(laps); }
      el.querySelector('[data-r="bar"]').style.width = `${(c.laps / st.max) * 100}%`;
      const rk = el.querySelector('[data-r="rank"]');
      if (rk.textContent !== String(c.rank)) {
        const mc = c.rank <= 3 ? MEDAL[c.rank - 1] : null;
        rk.textContent = c.rank;
        rk.className = `shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-black tabular-nums ${mc ? 'text-white' : 'text-slate-400 bg-slate-100 dark:bg-slate-700'}`;
        rk.style.background = mc || '';
      }
      list.appendChild(el);
    });
    st.list.forEach((c) => {
      const el = rows[c.name]; const dy = first[c.name].top - el.getBoundingClientRect().top;
      if (!dy) return;
      el.style.transition = 'none'; el.style.transform = `translateY(${dy}px)`;
      void el.offsetWidth;
      el.style.transition = 'transform .8s cubic-bezier(.16,1,.3,1)'; el.style.transform = '';
    });
  }

  // Melding: wat er aan de hand is en waarom
  function notice() {
    if (mode !== 'live') return null;
    const secs = Math.max(0, Math.ceil((retryAt - Date.now()) / 1000));
    if (navigator.onLine === false) {
      return { tone: 'red', text: 'Geen internet. Zodra je weer verbinding hebt, gaat het vanzelf verder.' };
    }
    if (conn === 'waiting' || conn === 'unavailable') {
      return { tone: 'orange', text: `Het is erg druk: het maximum aantal kijkers is bereikt. Nieuwe poging over ${secs} s.`, retry: true };
    }
    if (conn === 'error') {
      return navigator.onLine === false
        ? { tone: 'red', text: 'Geen internet. Zodra je weer verbinding hebt, gaat het vanzelf verder.' }
        : { tone: 'red', text: 'Verbinding met de live stand is weggevallen. Opnieuw verbinden…', retry: true };
    }
    if (conn === 'ok' && !data) {
      return { tone: 'slate', text: 'Live Sync staat uit of deze code is verlopen. De stand verschijnt zodra Live Sync weer aan staat.' };
    }
    if (conn === 'ok' && data && !(data.seenAt && Date.now() - data.seenAt < TRACKER_IDLE_MS)) {
      return { tone: 'slate', text: 'Er wordt nu niet geteld. De stand wordt bijgewerkt zodra er weer rondjes bij komen.' };
    }
    return null;
  }

  function renderStatus() {
    const n = notice();
    const box = $('emNotice');
    if (!n) box.className = 'hidden';
    else {
      const tones = {
        orange: 'bg-orange-50 dark:bg-orange-900/20 text-orange-800 dark:text-orange-200 border border-orange-100 dark:border-orange-900/30',
        red: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-100 dark:border-red-900/30',
        slate: 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
      };
      box.className = `mb-3 rounded-2xl px-4 py-3 text-sm font-semibold flex items-center gap-3 ${tones[n.tone]}`;
      box.innerHTML = `<span class="flex-1">${esc(n.text)}</span>` +
        (n.retry ? `<button data-em="retry" class="shrink-0 inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 bg-white/70 dark:bg-slate-700 font-bold">${ICON.refresh} Nu opnieuw</button>` : '');
    }
    const live = mode === 'live' && conn === 'ok' && data && data.seenAt && Date.now() - data.seenAt < TRACKER_IDLE_MS;
    $('emDot').className = `w-2 h-2 rounded-full ${live ? 'bg-red-500 animate-pulse' : 'bg-slate-400'}`;
    const label = { start: '', paused: 'Gepauzeerd', timeout: 'Gepauzeerd' }[mode];
    $('emStatus').textContent = label !== undefined ? label : live ? 'Live' : conn === 'connecting' ? 'Verbinden…' : '';
    $('emTime').textContent = lastChange ? `Bijgewerkt ${new Date(lastChange).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}` : '';
  }

  function renderOverlay() {
    const ov = $('emOverlay');
    const card = (icon, title, text, button) => `
      <div class="text-center max-w-sm bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl border border-slate-200/70 dark:border-slate-700 p-6">
        <div class="inline-flex p-4 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mb-4">${icon}</div>
        <h2 class="text-xl font-black text-slate-900 dark:text-white mb-1">${title}</h2>
        <p class="text-sm font-medium text-slate-500 dark:text-slate-400 mb-5">${text}</p>
        <button data-em="go" class="inline-flex items-center justify-center gap-2 w-full rounded-2xl py-3 font-bold bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-blue-900/20 active:scale-95 transition-transform">${button}</button>
      </div>`;
    if (mode === 'start') {
      ov.className = 'absolute inset-0 z-10 flex items-center justify-center p-6 bg-slate-50/70 dark:bg-slate-900/70 backdrop-blur-sm';
      ov.innerHTML = card(ICON.radio, 'Live stand', 'Volg live hoeveel rondjes elke klas loopt.', `${ICON.play} Bekijk de live stand`);
    } else if (mode === 'timeout') {
      ov.className = 'absolute inset-0 z-10 flex items-center justify-center p-6 bg-slate-50/70 dark:bg-slate-900/70 backdrop-blur-sm';
      ov.innerHTML = card(ICON.pause, 'Gepauzeerd', 'Na 10 minuten pauzeert de live stand, zodat er plek blijft voor andere kijkers.', `${ICON.refresh} Opnieuw verbinden`);
    } else {
      ov.className = 'hidden';
      ov.innerHTML = '';
    }
  }

  function renderAll() { renderBoard(); renderStatus(); renderOverlay(); }

  // ---------- verbinding ----------
  function closeConn() {
    clearTimeout(retryTimer);
    if (stop) { stop(); stop = null; }
  }
  function openConn() {
    if (stop || mode !== 'live') return;
    clearTimeout(retryTimer);
    conn = 'connecting'; renderStatus();
    stop = subscribe(code, (d) => {
      const changed = JSON.stringify(d) !== JSON.stringify(data);
      data = d; conn = 'ok'; errorStreak = 0; retryStep = 0;
      if (changed) { lastChange = Date.now(); renderBoard(); }
      renderStatus();
    }, (s) => {
      if (s === 'ok') { conn = 'ok'; errorStreak = 0; renderStatus(); return; }
      errorStreak += 1;
      // Firebase weigert (bijv. te veel kijkers) of blijvende fout: niet blijven aandringen
      if (s === 'unavailable' || errorStreak >= 4) { backOff(); return; }
      conn = 'error'; renderStatus();
    }, { pollMs: 5000 });
  }
  function backOff() {
    closeConn();
    const wait = RETRY_STEPS_MS[Math.min(retryStep, RETRY_STEPS_MS.length - 1)] + Math.random() * 3000;
    retryStep += 1;
    conn = navigator.onLine === false ? 'error' : 'waiting';
    retryAt = Date.now() + wait;
    retryTimer = setTimeout(() => { errorStreak = 0; openConn(); }, wait);
    renderStatus();
  }

  // ---------- kijken / pauzeren ----------
  let visible = !document.hidden;
  let onScreen = true;
  let pauseTimer = null;
  let timeoutTimer = null;

  function armTimeout() {
    clearTimeout(timeoutTimer);
    timeoutTimer = setTimeout(() => {
      if (mode !== 'live') return;
      mode = 'timeout'; closeConn(); conn = 'idle'; renderAll();
    }, TIMEOUT_MS);
  }
  function startWatching() {
    mode = 'live'; retryStep = 0; errorStreak = 0;
    armTimeout(); renderAll(); openConn();
  }
  function evaluate() {
    clearTimeout(pauseTimer);
    if (mode === 'paused' && visible && onScreen) { mode = 'live'; renderAll(); openConn(); return; }
    if (mode !== 'live') return;
    if (visible && onScreen) { openConn(); return; }
    pauseTimer = setTimeout(() => {
      if (mode !== 'live') return;
      mode = 'paused'; closeConn(); conn = 'idle'; renderAll();
    }, visible ? PAUSE_AFTER_OFFSCREEN_MS : PAUSE_AFTER_HIDDEN_MS);
  }

  app.addEventListener('click', (e) => {
    const b = e.target.closest('[data-em]');
    if (!b) return;
    if (b.getAttribute('data-em') === 'go') startWatching();
    if (b.getAttribute('data-em') === 'retry') { retryStep = 0; closeConn(); openConn(); }
  });
  // Actieve kijkers (klikken, scrollen, aanraken in het scorebord) krijgen geen time-out
  ['pointerdown', 'wheel', 'touchstart', 'keydown'].forEach((ev) => app.addEventListener(ev, () => { if (mode === 'live') armTimeout(); }, { passive: true }));
  document.addEventListener('visibilitychange', () => { visible = !document.hidden; evaluate(); });
  window.addEventListener('online', () => { if (mode === 'live') { retryStep = 0; closeConn(); openConn(); } });
  window.addEventListener('offline', () => { if (mode === 'live') { conn = 'error'; renderStatus(); } });
  if (typeof window.IntersectionObserver === 'function') {
    // In een iframe meet dit of het scorebord in beeld is op de pagina van de website zelf
    new window.IntersectionObserver((entries) => {
      onScreen = entries[entries.length - 1].isIntersecting;
      evaluate();
    }).observe(app.firstElementChild);
  }
  setInterval(() => { if (mode === 'live') renderStatus(); }, 1000); // aftellen en "Live" actueel houden

  renderAll();

  // Voor tests
  window.__embed = {
    isConnected: () => !!stop,
    mode: () => mode,
    _timeoutNow: () => { clearTimeout(timeoutTimer); mode = 'timeout'; closeConn(); conn = 'idle'; renderAll(); },
  };
}

// Embed-weergave: compact, responsief scorebord voor op een andere website (iframe).
// Openen met: stream.html?code=ABCDE&view=embed   (optioneel: &theme=dark, &bg=transparent)
//
// Zuinig met Firebase:
//  - één live verbinding per kijker (Firebase stuurt alleen wijzigingen, ~22 bytes per tik);
//  - de verbinding wordt gesloten als het tabblad verborgen is of het scorebord niet in beeld is,
//    en automatisch weer geopend zodra iemand kijkt;
//  - lukt de live verbinding niet, dan elke 5 s ophalen; na een storing herstelt alles vanzelf.
import { subscribe } from '../lib/liveFeed.js';
import { standings } from '../lib/standings.js';

const PAUSE_AFTER_HIDDEN_MS = 10000;   // tabblad verborgen: na 10 s verbinding sluiten
const PAUSE_AFTER_OFFSCREEN_MS = 30000; // scorebord uit beeld gescrold: na 30 s sluiten
const MEDAL = ['#f59e0b', '#94a3b8', '#d97706'];

const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const col = (c) => (/^#[0-9a-f]{3,8}$/i.test(c || '') ? c : '#3b82f6');

export function startEmbed(app, code, params) {
  const dark = params.get('theme') === 'dark';
  document.documentElement.classList.toggle('dark', dark);
  if (params.get('bg') === 'transparent') document.body.classList.add('transparent');
  document.body.classList.add('embed');

  let data = null;
  let status = 'connecting'; // connecting | ok | error | unavailable | paused
  let stop = null;
  let updatedAt = 0;

  app.innerHTML = `
    <main class="embed-root h-screen supports-[height:100dvh]:h-[100dvh] flex flex-col p-4 sm:p-6 ${params.get('bg') === 'transparent' ? '' : 'bg-slate-50 dark:bg-slate-900'}">
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
      <ol id="emList" class="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-2 pb-6" style="-webkit-mask-image:linear-gradient(to bottom,#000 calc(100% - 28px),transparent);mask-image:linear-gradient(to bottom,#000 calc(100% - 28px),transparent)"></ol>
      <p id="emFoot" class="pt-2 text-[11px] font-medium text-slate-400 dark:text-slate-500 flex justify-between gap-2">
        <span id="emStatus">Verbinden…</span><span id="emTime"></span>
      </p>
    </main>`;

  const $ = (id) => document.getElementById(id);
  const list = $('emList');

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

  function render() {
    const st = standings((data && data.classes) || [], data && data.schoolGoal);
    const total = $('emTotal');
    if (total.textContent !== String(st.total)) { if (total.textContent !== '–') bump(total); total.textContent = st.total; }
    $('emGoal').classList.toggle('hidden', !st.goal);
    if (st.goal) {
      $('emGoalLabel').textContent = `School doel ${st.goal}`;
      $('emPct').textContent = `${st.pct}%`;
      $('emGoalBar').style.width = `${st.pct}%`;
    }

    const rows = {};
    Array.prototype.forEach.call(list.children, (el) => { rows[el.getAttribute('data-name')] = el; });
    const sameSet = list.children.length === st.list.length && st.list.every((c) => rows[c.name]);
    if (!sameSet) {
      list.innerHTML = st.list.length
        ? st.list.map((c) => rowHtml(c, st.max)).join('')
        : '<li class="text-center text-sm text-slate-400 py-8">Nog geen gegevens</li>';
      return;
    }
    // Bijwerken zonder opnieuw opbouwen; verschoven klassen schuiven soepel naar hun plek
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
      const el = rows[c.name]; const r = el.getBoundingClientRect(); const f = first[c.name];
      const dy = f.top - r.top;
      if (!dy) return;
      el.style.transition = 'none'; el.style.transform = `translateY(${dy}px)`;
      void el.offsetWidth;
      el.style.transition = 'transform .8s cubic-bezier(.16,1,.3,1)'; el.style.transform = '';
    });
  }

  function showStatus() {
    const online = data && data.seenAt && Date.now() - data.seenAt < 75000;
    const map = {
      connecting: ['bg-slate-400', 'Verbinden…'],
      paused: ['bg-slate-400', 'Gepauzeerd (niet in beeld)'],
      error: ['bg-red-500', 'Verbinding herstellen…'],
      unavailable: ['bg-orange-500', 'Even niet beschikbaar, probeert opnieuw…'],
      ok: online ? ['bg-red-500 animate-pulse', 'Live'] : ['bg-slate-400', data ? 'Wacht op nieuwe rondes' : 'Live Sync staat uit'],
    };
    const [dot, text] = map[status];
    $('emDot').className = `w-2 h-2 rounded-full ${dot}`;
    $('emStatus').textContent = text;
    $('emTime').textContent = updatedAt ? `Bijgewerkt ${new Date(updatedAt).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}` : '';
  }

  // ---- verbinding: alleen open als iemand kijkt ----
  let visible = !document.hidden;
  let onScreen = true;
  let pauseTimer = null;

  function connect() {
    if (stop) return;
    status = 'connecting'; showStatus();
    stop = subscribe(code, (d) => {
      data = d; updatedAt = (d && d.updatedAt) || Date.now();
      render(); showStatus();
    }, (s) => { status = s; showStatus(); }, { pollMs: 5000 });
  }
  function disconnect() {
    if (!stop) return;
    stop(); stop = null;
    status = 'paused'; showStatus();
  }
  function evaluate() {
    clearTimeout(pauseTimer);
    if (visible && onScreen) { connect(); return; }
    pauseTimer = setTimeout(disconnect, visible ? PAUSE_AFTER_OFFSCREEN_MS : PAUSE_AFTER_HIDDEN_MS);
  }

  document.addEventListener('visibilitychange', () => { visible = !document.hidden; evaluate(); });
  if (typeof window.IntersectionObserver === 'function') {
    // In een iframe meet dit of het scorebord in beeld is op de pagina van de website zelf
    new window.IntersectionObserver((entries) => {
      onScreen = entries[entries.length - 1].isIntersecting;
      evaluate();
    }).observe(app.firstElementChild);
  }
  setInterval(showStatus, 15000); // "Live" / "Wacht op nieuwe rondes" actueel houden
  render();
  evaluate();

  // Voor tests: huidige verbindingsstatus
  window.__embed = { isConnected: () => !!stop };
}

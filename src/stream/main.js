import './stream.css';
import { subscribe } from '../lib/liveFeed.js';
import { startEmbed } from './embed.js';
import { collectInfo, submitFeedback } from '../lib/feedback.js';
import { standings } from '../lib/standings.js';


// Volledig scherm, ook voor oudere browsers (webkit-varianten, bijv. Samsung-tv)
function fsElement() { return document.fullscreenElement || document.webkitFullscreenElement || null; }
function enterFullscreen() {
  var el = document.documentElement;
  if (fsElement()) return;
  try {
    var r = el.requestFullscreen ? el.requestFullscreen() : el.webkitRequestFullscreen ? el.webkitRequestFullscreen() : null;
    if (r && r.catch) r.catch(function () {});
  } catch (e) { /* niet ondersteund: gewoon in het venster tonen */ }
}
function leaveFullscreen() {
  if (!fsElement()) return;
  try {
    var r = document.exitFullscreen ? document.exitFullscreen() : document.webkitExitFullscreen ? document.webkitExitFullscreen() : null;
    if (r && r.catch) r.catch(function () {});
  } catch (e) { /* negeren */ }
}

// ===== Instellingen =====
var CREDIT = 'Tijn van Kemenade';       // naam op het intro-scherm
var PODIUM = 3;                         // aantal klassen in de eerste onthulling

var params = new URLSearchParams(location.search);
var app = document.getElementById('app');

var S = {
  view: 'connect',              // connect | preview | show
  stage: 'intro',               // intro | podium | scroll | overview   (alleen bij view=show)
  code: (params.get('code') || '').toUpperCase(),
  data: null, net: 'idle',
  info: false, copied: false, error: '',
  snap: null,                   // vaste stand tijdens de onthulling
  anim: true,                   // speel de in-animatie alleen bij de eerste weergave
  obs: params.get('view') === 'overview' || params.get('view') === 'live'
};
if (params.get('bg') === 'transparent') document.body.classList.add('transparent');

// ---------- helpers ----------
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function col(c) { return /^#[0-9a-f]{3,8}$/i.test(c || '') ? c : '#3b82f6'; }
function svg(d, s) { return '<svg width="' + (s || 20) + '" height="' + (s || 20) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>'; }
var I = {
  sun: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4"/>'),
  moon: svg('<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"/>'),
  info: svg('<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>'),
  x: svg('<path d="M18 6 6 18M6 6l12 12"/>'),
  radio: function (s) { return svg('<path d="M4.9 19.1a10 10 0 0 1 0-14.2M7.8 16.2a6 6 0 0 1 0-8.4M16.2 7.8a6 6 0 0 1 0 8.4M19.1 4.9a10 10 0 0 1 0 14.2"/><circle cx="12" cy="12" r="2"/>', s); },
  play: svg('<polygon points="6 3 20 12 6 21 6 3"/>', 18),
  copy: svg('<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>', 18),
  link: svg('<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>', 18),
  back: svg('<path d="m15 18-6-6 6-6"/>', 18),
  trophy: function (s) { return svg('<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0 0 12 0V2z"/>', s); }
};
var btn = 'font-bold transition-all active:scale-95 flex items-center justify-center gap-2 rounded-2xl ';
var C = {
  primary: btn + 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200 dark:shadow-blue-900/20 px-5 py-3',
  secondary: btn + 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 px-5 py-3',
  icon: 'p-3 bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 rounded-2xl hover:bg-blue-50 dark:hover:bg-slate-700 active:scale-95 transition-all border border-slate-200 dark:border-slate-700 shadow-sm',
  card: 'bg-white dark:bg-slate-800 rounded-[2rem] shadow-sm border border-slate-200/70 dark:border-slate-700',
  label: 'text-[10px] uppercase text-slate-400 dark:text-slate-500 font-extrabold tracking-widest'
};
var MEDAL = ['#f59e0b', '#94a3b8', '#d97706'];   // goud, zilver, brons
// Lichte kleuren (geel) donkerder maken als tekst op een lichte achtergrond
function textCol(c) {
  if (isDark()) return c;
  var h = c.replace('#', ''); if (h.length === 3) h = h.replace(/./g, '$&$&');
  var r = parseInt(h.substr(0, 2), 16), g = parseInt(h.substr(2, 2), 16), b = parseInt(h.substr(4, 2), 16);
  var lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  if (lum < 0.6) return c;
  var f = 0.6; return 'rgb(' + Math.round(r * f) + ',' + Math.round(g * f) + ',' + Math.round(b * f) + ')';
}
function isDark() { return document.documentElement.classList.contains('dark'); }

// Stand berekenen; gelijke rondes = gelijke plaats (1, 1, 3 …)
function stats(d) {
  d = d || S.data || {};
  var classes = (d.classes || []).map(function (c) { return { name: c.name, laps: c.laps, color: col(c.color) }; });
  var st = standings(classes, d.schoolGoal);
  return { cl: st.list, total: st.total, max: st.max, goal: st.goal, pct: st.pct, online: !!(d.seenAt && Date.now() - d.seenAt < 75000) };
}

function chip() {
  var st = stats(), m;
  if (S.net === 'unavailable') m = ['bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300', 'bg-orange-500', 'Live Sync niet beschikbaar'];
  else if (S.net === 'error') m = ['bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400', 'bg-red-500', 'Geen verbinding'];
  else if (!S.data) m = ['bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400', 'bg-amber-500 animate-pulse', 'Wachten op gegevens'];
  else if (st.online) m = ['bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400', 'bg-green-500 animate-pulse', 'Live'];
  else m = ['bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400', 'bg-slate-400', 'Tracker niet actief'];
  return '<span class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ' + m[0] + '"><span class="w-2 h-2 rounded-full ' + m[1] + '"></span>' + m[2] + '</span>';
}

function header(extra) {
  return '<header class="flex items-center justify-between gap-3 mb-6">' +
    '<div class="flex items-center gap-3 min-w-0">' + (extra || '') +
    '<div class="min-w-0"><h1 class="text-2xl font-black text-slate-900 dark:text-white leading-tight truncate">Sponsorloop Live</h1>' +
    '<p class="text-sm font-medium text-slate-400 dark:text-slate-500">Voor het grote scherm</p></div></div>' +
    '<div class="flex gap-2 shrink-0">' +
    '<button data-a="info" aria-label="Uitleg" class="' + C.icon + '">' + I.info + '</button>' +
    '<button data-a="theme" aria-label="Thema wisselen" class="' + C.icon + '">' + (isDark() ? I.sun : I.moon) + '</button>' +
    '</div></header>';
}

function kbd(t) { return '<kbd class="font-sans px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-xs font-bold">' + t + '</kbd>'; }

function infoModal() {
  if (!S.info) return '';
  return '<div data-a="info-bg" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-md">' +
    '<div class="bg-white/90 dark:bg-slate-800/90 backdrop-blur w-full max-w-sm rounded-[2rem] shadow-2xl p-6 border border-white dark:border-slate-700 max-h-[90vh] overflow-y-auto no-scrollbar">' +
    '<div class="flex justify-between items-center mb-5"><h3 class="text-xl font-black text-slate-900 dark:text-white">Zo werkt het</h3>' +
    '<button data-a="info" class="text-slate-400 p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">' + I.x + '</button></div>' +
    '<div class="space-y-3 text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed">' +
    '<p><strong class="text-slate-900 dark:text-white">1.</strong> Start <em>Live Sync</em> in de tracker.</p>' +
    '<p><strong class="text-slate-900 dark:text-white">2.</strong> Vul hier de code in.</p>' +
    '<p><strong class="text-slate-900 dark:text-white">3.</strong> Kies <em>Live stand</em> of <em>Onthulling</em>.</p>' +
    '<p class="pt-2 text-slate-400">Onthulling start met ' + kbd('Spatie') + ' of een klik, daarna gaat alles vanzelf. Stoppen met ' + kbd('Esc') + ' of het kruisje (beweeg de muis).</p>' +
    '<p class="text-slate-400">De OBS-link werkt als browserbron met doorzichtige achtergrond.</p>' +
    '</div>' + feedbackForm() + '</div></div>';
}

// Embed: kant-en-klare iframe-code voor een andere website
function embedCode() {
  var url = location.origin + location.pathname + '?code=' + encodeURIComponent(S.code) + '&view=embed';
  return '<iframe src="' + url + '" title="Sponsorloop live stand" loading="lazy" ' +
    'style="display:block;width:100%;max-width:900px;height:640px;margin:0 auto;border:0;border-radius:16px"></iframe>';
}
function embedModal() {
  if (!S.embed) return '';
  return '<div data-a="embed-bg" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-md">' +
    '<div class="bg-white dark:bg-slate-800 w-full max-w-lg rounded-[2rem] shadow-2xl p-6 border border-white dark:border-slate-700 max-h-[90vh] overflow-y-auto no-scrollbar">' +
    '<div class="flex justify-between items-center mb-4"><h3 class="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">' + I.link + ' Embed</h3>' +
    '<button data-a="embed" aria-label="Sluiten" class="text-slate-400 p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">' + I.x + '</button></div>' +
    '<p class="text-sm text-slate-600 dark:text-slate-300 font-medium mb-3">Plak deze code op een website (bijv. als HTML-blok). Het scorebord opent direct, zonder menu of code invullen.</p>' +
    '<textarea id="embedCode" readonly rows="5" class="w-full font-mono text-xs bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-2xl p-3 outline-none resize-none select-all">' + esc(embedCode()) + '</textarea>' +
    '<div class="bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-900/30 rounded-2xl p-3 my-3 text-sm font-bold text-orange-800 dark:text-orange-200">' +
    'Als je een nieuwe Live Sync-code start, moet je de embed opnieuw kopiëren en bijwerken op de website.</div>' +
    '<button data-a="embed-copy" class="' + C.primary + ' w-full">' + I.copy + (S.embedCopied ? ' Gekopieerd!' : ' Code kopiëren') + '</button>' +
    '<a href="' + esc(embedCode().match(/src="([^"]+)"/)[1]) + '" target="_blank" rel="noopener" class="block text-center text-sm font-bold text-blue-600 dark:text-blue-400 mt-3">Voorbeeld openen</a>' +
    '</div></div>';
}

// Feedback / probleem melden (komt als issue in de GitHub-repository)
function feedbackForm() {
  var f = S.fb || (S.fb = { type: 'probleem', state: 'idle', error: '' });
  var head = '<div class="mt-6 pt-5 border-t border-slate-200 dark:border-slate-700"><p class="font-black text-slate-900 dark:text-white mb-3">Idee of probleem melden</p>';
  if (f.state === 'sent') return head + '<p class="text-sm font-bold text-green-600">Verstuurd, bedankt!</p></div>';
  var t = function (id, label) {
    return '<button data-a="fbtype" data-type="' + id + '" class="flex-1 py-2 rounded-xl text-sm font-bold border-2 ' +
      (f.type === id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'border-transparent bg-slate-100 dark:bg-slate-700') + '">' + label + '</button>';
  };
  return head + '<div class="flex gap-2 mb-2">' + t('idee', 'Idee') + t('probleem', 'Probleem') + '</div>' +
    '<textarea id="fbMsg" rows="3" maxlength="1500" placeholder="Schrijf je bericht…" class="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"></textarea>' +
    '<p class="text-xs text-slate-400 my-2">Bericht wordt openbaar op GitHub gezet: geen persoonlijke gegevens.</p>' +
    (f.error ? '<p class="text-sm font-bold text-red-500 mb-2">' + esc(f.error) + '</p>' : '') +
    '<button data-a="fbsend" class="' + C.primary + ' w-full py-2.5 text-sm"' + (f.state === 'sending' ? ' disabled' : '') + '>' + (f.state === 'sending' ? 'Versturen…' : 'Versturen') + '</button></div>';
}

// ---------- connect / preview ----------
function modeBtn(action, icon, title, sub, primary) {
  var dis = (stats().cl.length ? '' : ' disabled style="opacity:.5;pointer-events:none"');
  return '<button data-a="' + action + '"' + dis + ' class="group text-left p-5 rounded-[2rem] transition-all active:scale-[.98] ' +
    (primary ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200 dark:shadow-blue-900/20'
             : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm') + '">' +
    '<div class="w-12 h-12 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform ' +
    (primary ? 'bg-white/15' : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400') + '">' + icon + '</div>' +
    '<div class="text-lg font-black">' + title + '</div>' +
    '<div class="text-sm font-medium mt-1 ' + (primary ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400') + '">' + sub + '</div></button>';
}
function viewConnect() {
  return '<main class="max-w-md mx-auto px-4 py-8' + (S.anim ? ' animate-slide-up' : '') + '">' + header() +
    '<div class="' + C.card + ' p-8">' +
    '<div class="flex justify-center mb-6"><div class="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-full text-blue-600 dark:text-blue-400 animate-pulse-scale">' + I.radio(32) + '</div></div>' +
    '<h2 class="text-xl font-black text-center text-slate-900 dark:text-white mb-2">Vul de code in</h2>' +
    '<p class="text-slate-500 dark:text-slate-400 text-center mb-6 font-medium text-sm">Te vinden bij <strong>Live Sync</strong> in de tracker.</p>' +
    '<form data-f="connect" class="flex flex-col gap-3">' +
    '<input id="codeIn" value="' + esc(S.code) + '" maxlength="5" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="ABCDE" ' +
    'class="code-input w-full text-center text-3xl font-black uppercase py-4 rounded-2xl bg-slate-50 dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400 outline-none text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-500 transition-colors">' +
    (S.error ? '<p class="text-sm text-center font-bold text-red-500">' + esc(S.error) + '</p>' : '') +
    '<button type="submit" class="' + C.primary + ' w-full py-4 text-lg">Verbinden</button>' +
    '</form></div></main>';
}

function viewPreview() {
  var st = stats(), d = S.data;
  var upd = d && d.updatedAt ? new Date(d.updatedAt).toLocaleTimeString('nl-NL') : '—';
  var list = st.cl.length ? st.cl.map(function (c) {
    return '<li class="flex items-center gap-3 py-2.5">' +
      '<span class="w-6 text-sm font-black text-slate-400 tabular-nums">' + c.rank + '</span>' +
      '<span class="w-3 h-3 rounded-full shrink-0" style="background:' + c.color + '"></span>' +
      '<span class="font-bold truncate flex-1">' + esc(c.name) + '</span>' +
      '<span class="font-black tabular-nums">' + c.laps + '</span></li>';
  }).join('') : '<li class="py-6 text-center text-sm text-slate-400 font-medium">Nog geen gegevens ontvangen</li>';

  return '<main class="max-w-2xl mx-auto px-4 py-8' + (S.anim ? ' animate-slide-up' : '') + '">' +
    header('<button data-a="back" aria-label="Andere code" class="' + C.icon + ' text-slate-500 dark:text-slate-400">' + I.back + '</button>') +
    '<div class="' + C.card + ' p-5 mb-4 flex flex-wrap items-center justify-between gap-3">' +
    '<div class="flex items-center gap-3"><span class="' + C.label + '">Code</span><span class="text-xl font-black tracking-[.3em] text-slate-900 dark:text-white">' + esc(S.code) + '</span></div>' +
    '<div class="flex items-center gap-3"><span class="text-xs font-medium text-slate-400">Update ' + upd + '</span>' + chip() + '</div></div>' +
    '<div class="grid grid-cols-2 gap-4 mb-4">' +
    '<div class="' + C.card + ' p-5"><p class="' + C.label + ' mb-1">Totaal rondes</p><p class="text-4xl font-black tabular-nums text-slate-900 dark:text-white">' + st.total + '</p></div>' +
    '<div class="' + C.card + ' p-5"><p class="' + C.label + ' mb-1">School doel</p>' +
    (st.goal ? '<p class="text-4xl font-black tabular-nums text-slate-900 dark:text-white">' + st.pct + '<span class="text-xl text-slate-400">%</span></p>' +
      '<div class="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden mt-2"><div class="bar h-full bg-blue-500 rounded-full" style="width:' + st.pct + '%"></div></div>' +
      '<p class="text-xs text-slate-400 font-medium mt-1 tabular-nums">' + st.total + ' / ' + st.goal + '</p>'
      : '<p class="text-sm font-medium text-slate-400 dark:text-slate-600 italic mt-3">Geen ingesteld</p>') +
    '</div></div>' +
    '<div class="' + C.card + ' p-5 mb-6"><p class="' + C.label + ' mb-2">Klassen (' + st.cl.length + ')</p>' +
    '<ul class="divide-y divide-slate-100 dark:divide-slate-700 max-h-80 overflow-y-auto no-scrollbar" style="-webkit-mask-image:linear-gradient(to bottom,#000 85%,transparent);mask-image:linear-gradient(to bottom,#000 85%,transparent);padding-bottom:1.5rem">' + list + '</ul></div>' +
    '<p class="' + C.label + ' mb-2 px-1">Weergave</p>' +
    '<div class="grid sm:grid-cols-2 gap-3 mb-3">' +
    modeBtn('show', I.trophy(26), 'Onthulling', 'Wie heeft er gewonnen? Eerst de top ' + PODIUM + ', dan de rest.', true) +
    modeBtn('live', I.radio(26), 'Live stand', 'Kijk live mee tijdens het lopen.', false) +
    '</div>' +
    '<div class="grid grid-cols-2 gap-3">' +
    '<button data-a="copy" class="' + C.secondary + '">' + I.copy + (S.copied ? ' Gekopieerd!' : ' OBS-link') + '</button>' +
    '<button data-a="embed" class="' + C.secondary + '">' + I.link + ' Embed</button>' +
    '</div>' +
    '<p class="text-center text-xs text-slate-400 font-medium mt-4 leading-relaxed">Stoppen met ' + kbd('Esc') + ' of het kruisje.</p>' +
    '</main>';
}

// ================= DE ONTHULLING =================
var timers = [], rafs = [];
function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
function clearTimers() { timers.forEach(clearTimeout); timers = []; rafs.forEach(cancelAnimationFrame); rafs = []; }

function countUp(el, to, dur) {
  var t0 = null;
  function step(t) {
    if (!t0) t0 = t;
    var p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(to * e);
    if (p < 1) rafs.push(requestAnimationFrame(step));
  }
  rafs.push(requestAnimationFrame(step));
}

function hintBar(text) {
  return '<div class="absolute bottom-[3vh] left-0 right-0 flex justify-center pointer-events-none">' +
    '<span class="hint inline-flex items-center gap-2 text-[1.6vh] font-bold text-slate-500 dark:text-slate-400 bg-white/85 dark:bg-slate-800/85 backdrop-blur px-4 py-2 rounded-full shadow-sm border border-slate-200/70 dark:border-slate-700">' + text + '</span></div>';
}
function key(t) { return '<kbd class="font-sans px-2.5 py-1 rounded-lg bg-white/80 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">' + t + '</kbd>'; }

// 1) Intro
function stageIntro() {
  var st = stats(S.snap);
  var today = new Date().toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  today = today.charAt(0).toUpperCase() + today.slice(1);
  return '<section class="relative h-[100dvh] overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white flex items-center justify-center">' +
    '<div class="blob absolute -top-[15vh] -left-[10vw] w-[45vw] h-[45vw] rounded-full bg-white/10 blur-3xl"></div>' +
    '<div class="blob absolute -bottom-[20vh] -right-[10vw] w-[50vw] h-[50vw] rounded-full bg-indigo-400/20 blur-3xl" style="animation-delay:-4s"></div>' +
    '<div class="relative text-center px-[5vw]">' +
    '<div class="zoom-in inline-flex items-center justify-center w-[12vh] h-[12vh] rounded-[3vh] bg-white/15 border border-white/20 backdrop-blur mb-[4vh]" style="animation-delay:.1s">' + I.trophy('6vh') + '</div>' +
    '<p class="animate-slide-up uppercase tracking-[.4em] font-extrabold text-blue-100 text-[1.8vh] mb-[1.5vh]" style="animation-delay:.3s">Uitslag</p>' +
    '<h1 class="animate-slide-up font-black leading-none text-[13vh] tracking-tight drop-shadow-lg" style="animation-delay:.45s">Sponsorloop</h1>' +
    '<p class="animate-slide-up text-[2.4vh] font-semibold text-blue-100 mt-[3vh]" style="animation-delay:.65s">' + esc(today) + ' · ' + st.cl.length + ' klassen</p>' +
    '<p class="animate-slide-up text-[1.8vh] font-medium text-blue-200/80 mt-[6vh]" style="animation-delay:.85s">Gemaakt door <span class="font-bold text-white">' + esc(CREDIT) + '</span></p>' +
    '</div>' +
    '<div class="absolute bottom-[3vh] left-0 right-0 flex justify-center"><span class="hint inline-flex items-center gap-2 text-[1.6vh] font-bold text-blue-100">Druk op <kbd class="font-sans px-2.5 py-1 rounded-lg bg-white/15 border border-white/25">Spatie</kbd> om te beginnen</span></div>' +
    '</section>';
}

// 2) Podium: top 3 komt op (3e, 2e, dan 1e)
function stagePodium() {
  var st = stats(S.snap), top = st.cl.slice(0, PODIUM);
  // volgorde op het podium: 2e, 1e, 3e (1e in het midden)
  var order = top.length >= 3 ? [1, 0, 2] : top.length === 2 ? [1, 0] : [0];
  var heights = { 0: 46, 1: 34, 2: 25 };                 // in vh
  var delays = top.length >= 3 ? { 2: 0.8, 1: 3.4, 0: 6.6 } : top.length === 2 ? { 1: 0.8, 0: 3.8 } : { 0: 1 };
  var cols = order.map(function (i) {
    var c = top[i], d = delays[i], mc = MEDAL[Math.min(c.rank - 1, 2)];
    return '<div class="flex flex-col items-center justify-end w-[24vw] max-w-[420px]">' +
      '<div class="pop-in text-center mb-[2vh]" style="animation-delay:' + (d + .9) + 's">' +
      '<div class="text-[3.6vh] font-black leading-tight max-w-[24vw] px-2">' + esc(c.name) + '</div>' +
      '<div class="text-[8vh] font-black tabular-nums leading-none mt-[1vh]" style="color:' + textCol(c.color) + '"><span data-count="' + c.laps + '" data-delay="' + (d + .9) + '">0</span></div>' +
      '<div class="text-[1.6vh] uppercase tracking-widest font-extrabold text-slate-400 mt-[.5vh]">rondes</div>' +
      '</div>' +
      '<div class="pillar relative w-full rounded-t-[2.5vh] shadow-xl overflow-hidden" style="height:' + heights[Math.min(i, 2)] + 'vh;animation-delay:' + d + 's;background:linear-gradient(to bottom,' + c.color + ',' + c.color + 'cc)">' +
      '<div class="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent"></div>' +
      '<div class="absolute top-[2.5vh] left-0 right-0 flex justify-center">' +
      '<div class="w-[9vh] h-[9vh] rounded-full bg-white flex items-center justify-center shadow-lg text-[4.5vh] font-black" style="color:' + mc + ';box-shadow:0 0 0 .6vh ' + mc + '55">' + c.rank + '</div></div>' +
      '</div></div>';
  }).join('');
  return '<section class="relative h-[100dvh] overflow-hidden flex flex-col">' +
    '<div class="text-center pt-[5vh] animate-slide-up"><p class="uppercase tracking-[.35em] font-extrabold text-[1.8vh] text-blue-600 dark:text-blue-400">Uitslag</p>' +
    '<h2 class="text-[6vh] font-black text-slate-900 dark:text-white">Top ' + top.length + '</h2></div>' +
    '<div class="flex-1 flex items-end justify-center gap-[2vw] px-[4vw]">' + cols + '</div>' +
    '<div class="h-[1.2vh] bg-slate-200 dark:bg-slate-800"></div>' +
    (st.cl.length > PODIUM ? hintBar(key('Spatie') + ' de rest van de stand') : hintBar(key('Spatie') + ' naar het overzicht')) +
    '</section>';
}

// 3) De rest rolt één voor één in beeld
function stageScroll() {
  var st = stats(S.snap), rest = st.cl.slice(PODIUM);
  var rows = rest.map(function (c, i) {
    return '<div class="srow row-hidden flex items-center gap-[2vw] py-[1.6vh] px-[2.5vw] mb-[1.6vh] rounded-[2.5vh] bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 shadow-sm" data-i="' + i + '">' +
      '<span class="w-[7vh] text-center text-[4.2vh] font-black tabular-nums text-slate-400 dark:text-slate-500">' + c.rank + '</span>' +
      '<span class="w-[1vh] h-[6vh] rounded-full shrink-0" style="background:' + c.color + '"></span>' +
      '<div class="flex-1 min-w-0">' +
      '<div class="text-[3.4vh] font-bold truncate">' + esc(c.name) + '</div>' +
      '<div class="w-full bg-slate-100 dark:bg-slate-700 h-[1.2vh] rounded-full overflow-hidden mt-[1vh]"><div class="bar h-full rounded-full" data-w="' + (c.laps / st.max * 100) + '" style="width:0;background:' + c.color + '"></div></div>' +
      '</div>' +
      '<span class="text-[5vh] font-black tabular-nums min-w-[12vh] text-right">' + c.laps + '</span>' +
      '</div>';
  }).join('');
  return '<section class="relative h-[100dvh] overflow-hidden flex flex-col">' +
    '<div class="text-center pt-[4vh] pb-[2vh] animate-slide-up"><p class="uppercase tracking-[.35em] font-extrabold text-[1.8vh] text-blue-600 dark:text-blue-400">Plaats ' + (PODIUM + 1) + ' t/m ' + st.cl.length + '</p>' +
    '<h2 class="text-[5vh] font-black text-slate-900 dark:text-white">Ranglijst</h2></div>' +
    '<div id="scroller" class="relative fade-mask flex-1 overflow-hidden px-[4vw]"><div class="max-w-6xl mx-auto pt-[3vh] pb-[40vh]">' + rows + '</div></div>' +
    hintBar(key('Spatie') + ' overslaan') +
    '</section>';
}

// 4) Eindoverzicht en Live stand gebruiken hetzelfde bord
function layout(n) {
  var cols = n <= 4 ? 2 : n <= 9 ? 3 : n <= 16 ? 4 : n <= 25 ? 5 : 6;
  return { cols: cols, cardH: Math.min(18, 66 / (Math.ceil(n / cols) || 1)) };
}
function badgeHtml(c, cardH) {
  var mc = c.rank <= 3 ? MEDAL[c.rank - 1] : null, size = cardH * .3;
  return '<span data-r="rank" class="shrink-0 rounded-full flex items-center justify-center font-black tabular-nums transition-colors ' + (mc ? 'text-white' : 'text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-700') + '" style="width:' + size + 'vh;height:' + size + 'vh;font-size:' + (size * .48) + 'vh;' + (mc ? 'background:' + mc : '') + '">' + c.rank + '</span>';
}
function cardHtml(c, st, cardH, animate, i) {
  return '<div data-name="' + esc(c.name) + '" class="' + (animate ? 'pop-in ' : '') + 'relative overflow-hidden rounded-[2vh] bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 shadow-sm flex flex-col justify-between pl-[1.6vw] pr-[1.2vw] py-[1.4vh]" style="height:' + cardH + 'vh;' + (animate ? 'animation-delay:' + (0.15 + i * 0.05) + 's' : '') + '">' +
    '<div class="absolute left-0 top-0 bottom-0 w-[.7vh]" style="background:' + c.color + '"></div>' +
    '<div class="flex items-center justify-between gap-2">' + badgeHtml(c, cardH) +
    '<span data-r="laps" class="font-black tabular-nums leading-none" style="font-size:' + (cardH * .3) + 'vh">' + c.laps + '</span></div>' +
    '<div class="font-bold leading-tight line-clamp-2 break-words" style="font-size:' + Math.max(1.5, cardH * .15) + 'vh">' + esc(c.name) + '</div>' +
    '<div class="w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden shrink-0" style="height:' + Math.max(.5, cardH * .05) + 'vh"><div data-r="bar" class="bar h-full rounded-full" style="width:' + (c.laps / st.max * 100) + '%;background:' + c.color + '"></div></div>' +
    '</div>';
}
function boardHtml(st, live, animate) {
  var L = layout(st.cl.length);
  var cards = st.cl.map(function (c, i) { return cardHtml(c, st, L.cardH, animate, i); }).join('');
  return '<section class="relative h-[100dvh] overflow-hidden flex flex-col px-[4vw] py-[4vh]">' +
    '<div class="flex items-end justify-between gap-[3vw] mb-[3vh] ' + (animate ? 'animate-slide-up' : '') + '">' +
    '<div><p class="uppercase tracking-[.35em] font-extrabold text-[1.8vh] text-blue-600 dark:text-blue-400 flex items-center gap-2">' +
    (live ? '<span class="w-[1vh] h-[1vh] rounded-full bg-red-500 animate-pulse"></span>Live stand' : 'Eindstand') + '</p>' +
    '<h2 class="text-[6vh] font-black text-slate-900 dark:text-white leading-tight">Sponsorloop</h2></div>' +
    '<div class="flex items-end gap-[3vw]">' +
    (st.goal ? '<div class="w-[22vw]"><div class="flex justify-between text-[1.8vh] font-bold text-slate-500 dark:text-slate-400 mb-[.8vh]"><span>School doel ' + st.goal + '</span><span id="bdPct" class="tabular-nums">' + st.pct + '%</span></div>' +
      '<div class="w-full bg-slate-200/70 dark:bg-slate-700/70 h-[1.6vh] rounded-full overflow-hidden"><div id="bdGoal" class="bar h-full bg-blue-500 rounded-full" style="width:' + st.pct + '%"></div></div></div>' : '') +
    '<div class="text-right"><p class="uppercase tracking-widest font-extrabold text-[1.5vh] text-slate-400">Totaal rondes</p><p id="bdTotal" class="text-[8vh] font-black tabular-nums text-blue-600 dark:text-blue-400 leading-none">' + st.total + '</p></div>' +
    '</div></div>' +
    '<div id="bdGrid" data-cols="' + L.cols + '" data-goal="' + (st.goal || '') + '" class="flex-1 grid content-center gap-[1.6vh] gap-x-[1.4vw]" style="grid-template-columns:repeat(' + L.cols + ',minmax(0,1fr))">' + cards + '</div>' +
    (S.obs ? '' : '<div class="flex items-center justify-between mt-[2vh] text-[1.6vh] font-medium text-slate-400 dark:text-slate-500">' +
      '<span>Sponsorloop Tracker · <span class="font-bold text-slate-500 dark:text-slate-400">' + esc(CREDIT) + '</span></span>' +
      '<span class="hint inline-flex items-center gap-2 font-bold">' + key(live ? 'Esc' : 'Spatie') + ' afsluiten</span></div>') +
    '</section>';
}
function stageOverview(animate) { return boardHtml(stats(S.snap), false, animate); }

// ---------- Live stand ----------
function renderLive(animate) {
  clearTimers();
  app.innerHTML = boardHtml(stats(S.data), true, animate) + (S.obs ? '' : exitBtn());
}
function bumpEl(el) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
// Werk het bord bij zonder opnieuw te animeren; klassen die van plek wisselen schuiven soepel
function updateLive() {
  var st = stats(S.data), grid = document.getElementById('bdGrid');
  if (!grid) return renderLive(false);
  var cards = {}; Array.prototype.forEach.call(grid.children, function (el) { cards[el.getAttribute('data-name')] = el; });
  var L = layout(st.cl.length);
  var same = grid.children.length === st.cl.length && st.cl.every(function (c) { return cards[esc(c.name)] || cards[c.name]; }) &&
    +grid.getAttribute('data-cols') === L.cols && grid.getAttribute('data-goal') === String(st.goal || '');
  if (!same) return renderLive(false);

  Array.prototype.forEach.call(grid.querySelectorAll('.pop-in'), function (el) { el.classList.remove('pop-in'); el.style.animationDelay = ''; });
  var hdr = app.querySelector('.animate-slide-up'); if (hdr) hdr.classList.remove('animate-slide-up');
  var first = {}; st.cl.forEach(function (c) { first[c.name] = cards[c.name].getBoundingClientRect(); });
  st.cl.forEach(function (c) {
    var el = cards[c.name], lapsEl = el.querySelector('[data-r="laps"]');
    if (lapsEl.textContent !== String(c.laps)) {
      var up = c.laps > +lapsEl.textContent;
      lapsEl.textContent = c.laps; if (up) bumpEl(lapsEl);
    }
    el.querySelector('[data-r="bar"]').style.width = (c.laps / st.max * 100) + '%';
    var rk = el.querySelector('[data-r="rank"]');
    if (rk.textContent !== String(c.rank)) rk.outerHTML = badgeHtml(c, L.cardH);
    grid.appendChild(el);                                  // juiste volgorde
  });
  st.cl.forEach(function (c) {                             // FLIP-animatie voor verschoven kaarten
    var el = cards[c.name], r = el.getBoundingClientRect(), f = first[c.name];
    var dx = f.left - r.left, dy = f.top - r.top;
    if (!dx && !dy) return;
    el.style.transition = 'none'; el.style.transform = 'translate(' + dx + 'px,' + dy + 'px)'; el.style.zIndex = 2;
    void el.offsetWidth;
    el.style.transition = 'transform .9s cubic-bezier(.16,1,.3,1)'; el.style.transform = '';
    setTimeout(function () { el.style.zIndex = ''; }, 900);
  });
  var tot = document.getElementById('bdTotal');
  if (tot && tot.textContent !== String(st.total)) { tot.textContent = st.total; bumpEl(tot); }
  var g = document.getElementById('bdGoal'); if (g) g.style.width = st.pct + '%';
  var pc = document.getElementById('bdPct'); if (pc) pc.textContent = st.pct + '%';
}
function startLive() {
  S.view = 'live';
  document.body.classList.add('show');
  var el = document.documentElement;
  if (!S.obs) enterFullscreen();
  renderLive(true);
}

function exitBtn() {
  return '<button id="exitFs" data-a="exit" aria-label="Weergave sluiten" title="Sluiten (Esc)" class="fixed bottom-5 right-5 z-40 ' + C.icon + ' text-slate-500 dark:text-slate-300 shadow-lg">' + I.x + '</button>';
}
// Kruisje en muiscursor tonen bij beweging of tik, daarna weer verbergen
var uiT;
function showUI() {
  if (S.view !== 'show' && S.view !== 'live') return;
  document.body.classList.add('ui');
  clearTimeout(uiT); uiT = setTimeout(function () { document.body.classList.remove('ui'); }, 2500);
}
function renderShow(animate) {
  clearTimers();
  var html = S.stage === 'intro' ? stageIntro() : S.stage === 'podium' ? stagePodium() : S.stage === 'scroll' ? stageScroll() : stageOverview(animate !== false);
  app.innerHTML = html + exitBtn();
  if (S.stage === 'podium') startPodium();
  if (S.stage === 'scroll') startScroll();
}

function startPodium() {
  var COUNT = 2600, last = 0;
  app.querySelectorAll('[data-count]').forEach(function (el) {
    var d = parseFloat(el.getAttribute('data-delay')) * 1000;
    last = Math.max(last, d);
    later(function () { countUp(el, +el.getAttribute('data-count'), COUNT); }, d);
  });
  later(function () { confetti(); }, last + COUNT);        // confetti zodra de winnaar is uitgeteld
  // daarna automatisch door naar de rest van de ranglijst (of het eindoverzicht)
  later(function () { go(stats(S.snap).cl.length > PODIUM ? 'scroll' : 'overview'); }, last + COUNT + 5000);
}

function startScroll() {
  var rows = Array.prototype.slice.call(app.querySelectorAll('.srow'));
  var sc = document.getElementById('scroller');
  if (!rows.length) { go('overview'); return; }
  var gap = Math.max(900, Math.min(1600, 30000 / rows.length));     // ms tussen klassen
  rows.forEach(function (r, i) {
    later(function () {
      r.classList.remove('row-hidden'); r.classList.add('row-shown');
      var b = r.querySelector('.bar'); later(function () { b.style.width = b.getAttribute('data-w') + '%'; }, 150);
      var target = r.offsetTop + r.offsetHeight - sc.clientHeight * 0.7;
      if (target > sc.scrollTop) smoothScroll(sc, target, gap * 0.9);
      if (i === rows.length - 1) later(function () { go('overview'); }, 3500);
    }, 500 + i * gap);
  });
}
function smoothScroll(el, to, dur) {
  var from = el.scrollTop, t0 = null;
  function step(t) {
    if (!t0) t0 = t;
    var p = Math.min(1, (t - t0) / dur), e = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
    el.scrollTop = from + (to - from) * e;
    if (p < 1) rafs.push(requestAnimationFrame(step));
  }
  rafs.push(requestAnimationFrame(step));
}

var STAGES = ['intro', 'podium', 'scroll', 'overview'];
function stageList() { return stats(S.snap).cl.length > PODIUM ? STAGES : ['intro', 'podium', 'overview']; }
var busy = false;
function go(stage) {
  if (busy) return; busy = true;
  var sec = app.querySelector('section');
  if (sec) { sec.classList.add('stage-out'); }
  clearTimers();
  setTimeout(function () { busy = false; S.stage = stage; renderShow(); }, sec ? 300 : 0);
}
function next() {
  var list = stageList(), i = list.indexOf(S.stage);
  if (i === list.length - 1) exitShow(); else go(list[i + 1]);
}
function prev() {
  var list = stageList(), i = list.indexOf(S.stage);
  if (i > 0) go(list[i - 1]);
}
function startShow() {
  S.snap = JSON.parse(JSON.stringify(S.data || {}));
  S.view = 'show'; S.stage = 'intro';
  document.body.classList.add('show');
  var el = document.documentElement;
  enterFullscreen();
  renderShow();
}
function exitShow() {
  clearTimers(); busy = false;
  document.body.classList.remove('show', 'ui'); document.body.style.cursor = '';
  leaveFullscreen();
  S.view = 'preview'; S.anim = true; render();
}

// Confetti voor de winnaar
function confetti() {
  var cv = document.getElementById('confetti'), ctx = cv.getContext('2d');
  var W = cv.width = innerWidth, H = cv.height = innerHeight;
  var colors = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#facc15', '#06b6d4'];
  var parts = [];
  for (var i = 0; i < 180; i++) parts.push({
    x: W / 2 + (Math.random() - .5) * W * .2, y: H * .45,
    vx: (Math.random() - .5) * 18, vy: -Math.random() * 18 - 6,
    s: 6 + Math.random() * 8, r: Math.random() * 6, vr: (Math.random() - .5) * .3,
    c: colors[i % colors.length]
  });
  var t0 = performance.now();
  function step(t) {
    ctx.clearRect(0, 0, W, H);
    var alive = false;
    parts.forEach(function (p) {
      p.vy += .45; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      if (p.y < H + 20) alive = true;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c;
      ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore();
    });
    if (alive && t - t0 < 5000 && S.view === 'show') requestAnimationFrame(step); else ctx.clearRect(0, 0, W, H);
  }
  requestAnimationFrame(step);
}

// ---------- render ----------
function render() {
  if (S.view === 'show' || S.view === 'live') return;
  var focusCode = document.activeElement && document.activeElement.id === 'codeIn';
  app.innerHTML = (S.view === 'connect' ? viewConnect() : viewPreview()) + infoModal() + embedModal();
  S.anim = false;
  if (S.view === 'connect') { var inp = document.getElementById('codeIn'); if (inp && (focusCode || !S.info)) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); } }
  var mc = document.querySelector('meta[name="theme-color"]'); if (mc) mc.setAttribute('content', isDark() ? '#0f172a' : '#f8fafc');
}

// ---------- data ----------
// Live gegevens (Firebase streaming, met automatische terugval)
var stopFeed = null;
function startFeed() {
  if (stopFeed) stopFeed();
  stopFeed = subscribe(S.code, function (d) {
    var changed = JSON.stringify(d) !== JSON.stringify(S.data) || S.net !== 'ok';
    S.data = d; S.net = 'ok';
    if (!changed) return;
    if (S.view === 'live') updateLive();
    else if (S.view === 'preview') render();
  }, function (status) {
    if ((status === 'error' || status === 'unavailable') && S.net !== status) { S.net = status; if (S.view === 'preview') render(); }
    else if (status === 'ok' && S.net !== 'ok') { S.net = 'ok'; if (S.view === 'preview') render(); }
  });
}
function stopFeedNow() { if (stopFeed) { stopFeed(); stopFeed = null; } }
function connect(code) {
  code = (code || '').trim().toUpperCase();
  if (!/^[A-Z0-9]{4,8}$/.test(code)) { S.error = 'Vul de code van 5 tekens in.'; render(); return; }
  S.code = code; S.error = ''; S.data = null; S.net = 'idle'; S.view = 'preview'; S.anim = true;
  setUrl(); render(); startFeed();
}
function setUrl() {
  var p = new URLSearchParams();
  if (S.code && S.view !== 'connect') p.set('code', S.code);
  if (S.obs) p.set('view', 'live');
  if (params.get('bg')) p.set('bg', params.get('bg'));
  history.replaceState(null, '', location.pathname + (p.toString() ? '?' + p : ''));
}

// ---------- invoer ----------
['mousemove', 'touchstart', 'pointerdown'].forEach(function (ev) { document.addEventListener(ev, showUI, { passive: true }); });
function onFsChange() { if (!fsElement() && (S.view === 'show' || S.view === 'live') && !S.obs) exitShow(); }
document.addEventListener('fullscreenchange', onFsChange);
document.addEventListener('webkitfullscreenchange', onFsChange);
document.addEventListener('keydown', function (e) {
  if (S.view === 'live' && !S.obs) { if (e.key === 'Escape') exitShow(); return; }
  if (S.view === 'show') {
    if ([' ', 'Enter', 'ArrowRight', 'ArrowDown', 'PageDown'].indexOf(e.key) >= 0) { e.preventDefault(); next(); }
    else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].indexOf(e.key) >= 0) { e.preventDefault(); prev(); }
    else if (e.key === 'Escape') exitShow();
    return;
  }
  if (e.key === 'Escape' && (S.info || S.embed)) { S.info = false; S.embed = false; render(); }
});

app.addEventListener('submit', function (e) { e.preventDefault(); connect(document.getElementById('codeIn').value); });
app.addEventListener('input', function (e) { if (e.target.id === 'codeIn') { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); S.code = e.target.value; } });
app.addEventListener('click', function (e) {
  var t = e.target.closest('[data-a]');
  if (S.view === 'show' || S.view === 'live') {
    if (t && t.getAttribute('data-a') === 'exit') exitShow();
    else if (S.view === 'show' && S.stage === 'intro') next();   // alleen het eerste scherm start met een klik
    return;
  }
  if (!t) return;
  var a = t.getAttribute('data-a');
  if (a === 'info-bg' && t !== e.target) return;
  if (a === 'info' || a === 'info-bg') { S.info = !S.info; if (!S.info && S.fb && S.fb.state === 'sent') S.fb = null; render(); }
  else if (a === 'fbtype') { var keep = (document.getElementById('fbMsg') || {}).value || ''; S.fb.type = t.getAttribute('data-type'); render(); document.getElementById('fbMsg').value = keep; }
  else if (a === 'fbsend') {
    var msg = (document.getElementById('fbMsg') || {}).value || '';
    S.fb.state = 'sending'; S.fb.error = ''; render(); document.getElementById('fbMsg').value = msg;
    submitFeedback({ type: S.fb.type, message: msg, info: S.fb.type === 'probleem' ? collectInfo({ Weergave: S.view }) : '' })
      .then(function () { S.fb.state = 'sent'; render(); },
        function (e) { S.fb.state = 'idle'; S.fb.error = e.message; render(); var el = document.getElementById('fbMsg'); if (el) el.value = msg; });
  }
  else if (a === 'theme') {
    var dark = !isDark(); document.documentElement.classList.toggle('dark', dark);
    try { localStorage.setItem('sponsorloop_theme', dark ? 'dark' : 'light'); } catch (er) {}
    render();
  }
  else if (a === 'back') { stopFeedNow(); S.view = 'connect'; S.data = null; S.anim = true; setUrl(); render(); }
  else if (a === 'show') startShow();
  else if (a === 'live') startLive();
  else if (a === 'embed' || a === 'embed-bg') { if (a === 'embed-bg' && t !== e.target) return; S.embed = !S.embed; S.embedCopied = false; render(); }
  else if (a === 'embed-copy') {
    var code = embedCode();
    (navigator.clipboard ? navigator.clipboard.writeText(code) : Promise.reject()).catch(function () {
      var ta = document.getElementById('embedCode'); if (ta) { ta.select(); try { document.execCommand('copy'); } catch (er) { /* handmatig kopiëren */ } }
    });
    S.embedCopied = true; render();
    setTimeout(function () { S.embedCopied = false; if (S.embed) render(); }, 1800);
  }
  else if (a === 'copy') {
    var url = location.origin + location.pathname + '?code=' + S.code + '&view=live&bg=transparent';
    (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).catch(function () { prompt('Kopieer deze link:', url); });
    S.copied = true; render(); setTimeout(function () { S.copied = false; if (S.view === 'preview') render(); }, 1500);
  }
});
setInterval(function () { if (S.view === 'preview' && S.data) render(); }, 15000);

// ---------- start ----------
if (S.code && params.get('view') === 'embed') { startEmbed(app, S.code, params); }
else if (S.code && S.obs) { startLive(); startFeed(); }
else if (S.code) { S.view = 'preview'; render(); startFeed(); }
else render();
